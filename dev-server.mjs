import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// --- v3.2 PRODUCTION MODULES ---
import { VERSION, LIMITS, THRESHOLDS, FEATURES, RATE_LIMITS, validateConfig } from './config.mjs';
import { sendError, structuredLog } from './utils.mjs';
import { initDb, insertAuditLog, getRecentLogs, getAuditLog } from './db.mjs';
import { analyzeSimilarity, getVector } from './similarity-engine.mjs';
import { recordLatency, incCounter, recordConfidence, getMetricsReport } from './metrics.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize persistence
initDb();

// Validate configuration
validateConfig();

const PORT = 4444;

// ── Rate Limiting State ───────────────────────────────────────────────────────
const rateLimitMap = new Map(); // ip → {count, resetAt}

/**
 * Enhanced Rate Limiter with metrics integration.
 */
function checkRateLimit(ip, limit) {
    const now = Date.now();
    const windowMs = 60000;
    const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };

    if (now > record.resetAt) {
        record.count = 0;
        record.resetAt = now + windowMs;
    }

    if (record.count >= limit) {
        incCounter('requests', 'rate_limit_hits');
        return false;
    }

    record.count++;
    rateLimitMap.set(ip, record);
    return true;
}

// ── Global Judge Circuit Breaker ──────────────────────────────────────────────
const circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    tripped: false,
    resetTime: 60000 // 60s
};

function checkCircuitBreaker() {
    if (circuitBreaker.tripped) {
        if (Date.now() - circuitBreaker.lastFailure > circuitBreaker.resetTime) {
            circuitBreaker.tripped = false;
            circuitBreaker.failures = 0;
            structuredLog('INFO', 'Circuit breaker reset');
            return true;
        }
        return false;
    }
    return true;
}

function tripBreaker() {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = Date.now();
    if (circuitBreaker.failures >= 5) {
        circuitBreaker.tripped = true;
        structuredLog('ERROR', 'Circuit breaker TRIPPED! Global fallback active.');
    }
}

// ── Deterministic LLM-as-Judge ────────────────────────────────────────────────
const judgeCache = new Map(); // prompt_hash → score

async function llmJudgeSimilarity(featureText, userInput, correlation_id) {
    if (!checkCircuitBreaker()) {
        structuredLog('WARN', 'Circuit breaker active: skipping judge call', { correlation_id });
        return { score: null, source: 'circuit-breaker' };
    }

    const cacheKey = crypto.createHash('md5')
        .update(featureText + '|||' + userInput)
        .digest('hex');

    if (judgeCache.has(cacheKey)) {
        return { score: judgeCache.get(cacheKey), source: 'cache' };
    }

    const payload = JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
            { role: 'system', content: 'You are a semantic similarity evaluator. Return ONLY valid JSON: {"score": <number 0.0-1.0>}' },
            { role: 'user', content: `A: "${featureText.slice(0, 400)}"\nB: "${userInput.slice(0, 400)}"\nScore similarity (1.0=same, 0.0=none).` }
        ],
        temperature: 0,
        max_tokens: 10,
        response_format: { type: 'json_object' }
    });

    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), LIMITS.ABORT_TIMEOUT_MS);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            signal: ac.signal,
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: payload
        });

        clearTimeout(timeout);
        const json = await response.json();

        if (json.error) throw new Error(json.error.message);

        const content = JSON.parse(json.choices[0].message.content);
        const score = Number(content.score);

        if (isNaN(score)) throw new Error('Invalid score from judge');

        judgeCache.set(cacheKey, score);
        structuredLog('DEBUG', 'Judge successful', { correlation_id, score, feature: featureText.slice(0, 30) });
        return { score, source: 'groq' };
    } catch (err) {
        clearTimeout(timeout);
        tripBreaker();
        structuredLog('ERROR', 'Judge failure', { correlation_id, error: err.message });
        return { score: null, source: 'error' };
    }
}

// ── Hybrid Semantic Domain Drift Detection ─────────────────────────────────────

async function detectDomainDrift(data, userInputText, correlation_id) {
    const features = data.core_functional_components || [];
    const corpusVectors = [{ vector: getVector(userInputText) }];

    let traceableCount = 0;
    let llmJudgeCalls = 0;
    const driftInstances = [];
    const speculativeFlagged = [];
    const assumptionAdditions = [];

    for (const feat of features) {
        if (llmJudgeCalls >= LIMITS.MAX_JUDGE_CALLS_PER_REQ) break;

        const description = feat.description || feat.name || '';
        const analysis = analyzeSimilarity(description, corpusVectors);

        let finalScore = analysis.score;
        let simSource = 'tfidf';
        let traceStatus = analysis.status;

        if (traceStatus === 'assumption' && FEATURES.USE_LLM_JUDGE) {
            llmJudgeCalls++;
            const judge = await llmJudgeSimilarity(description, userInputText, correlation_id);
            if (judge.score !== null) {
                finalScore = judge.score;
                simSource = `llm-judge-${judge.source}`;
                traceStatus = finalScore >= 0.7 ? 'traceable' : (finalScore >= 0.4 ? 'assumption' : 'speculative');
            }
        }

        feat.trace_score = finalScore;
        feat.trace_status = traceStatus;
        feat.similarity_source = simSource;

        if (traceStatus === 'traceable') {
            traceableCount++;
        } else if (traceStatus === 'assumption') {
            assumptionAdditions.push({
                assumption: feat.name,
                reason: `Semi-traceable (similarity=${finalScore.toFixed(3)} via ${simSource})`,
                confidence_impact: -2
            });
        } else {
            speculativeFlagged.push(feat.name);
            driftInstances.push(`[SPECULATIVE:${simSource}] ${feat.name} (score=${finalScore.toFixed(3)})`);
        }
    }

    const domainConsistency = features.length > 0
        ? Math.round((traceableCount / features.length) * 100 * 100) / 100
        : 100;

    return {
        domain_drift_instances: driftInstances,
        speculative_features_flagged: speculativeFlagged,
        assumption_count: (data.assumptions_made || []).length,
        internal_consistency_check: driftInstances.length === 0 ? 'PASS' : 'PARTIAL',
        domain_consistency_computed: domainConsistency,
        similarity_engine: VERSION.SIMILARITY,
        engine_version: VERSION.ENGINE,
        llm_judge_calls: llmJudgeCalls
    };
}

// ── Hardened Confidence Recomputation ─────────────────────────────────────────

function recomputeConfidence(data, validationLogic) {
    const cb = data.confidence_breakdown || {};
    const assumptions = Array.isArray(data.assumptions_made) ? data.assumptions_made : [];
    const nfrs = Array.isArray(data.non_functional_requirements) ? data.non_functional_requirements : [];

    const IC = Math.min(100, Math.max(0, cb.input_clarity?.score ?? 60));
    const DC = Math.min(100, Math.max(0, validationLogic.domain_consistency_computed ?? 50));
    const expected = ['security', 'performance', 'scalability', 'reliability', 'usability'];
    const covered = expected.filter(cat => nfrs.some(n => (n.category || '').toLowerCase().includes(cat)));
    const RC = Math.min(100, Math.max(0, (covered.length / expected.length) * 100));

    let LC = Math.min(100, Math.max(0, cb.logical_coherence?.score ?? 100));
    if (validationLogic.internal_consistency_check !== 'PASS') LC = Math.max(0, LC - 15);
    if (DC < 75) LC = Math.max(0, LC - 10);

    const penalty = Math.min(25, assumptions.length * 2.5);
    const raw = (0.3 * IC) + (0.3 * DC) + (0.2 * RC) + (0.2 * LC) - penalty;
    const final = Math.max(0, Math.min(100, Math.round(raw * 100) / 100));

    recordConfidence(final);

    return {
        input_clarity: { score: Math.round(IC), justification: cb.input_clarity?.justification || 'Analyzed requirements' },
        domain_consistency: { score: Math.round(DC), justification: `Semantic trace (${validationLogic.llm_judge_calls} calls)` },
        requirement_completeness: { score: Math.round(RC), justification: `${covered.length}/${expected.length} NFRs` },
        logical_coherence: { score: Math.round(LC), justification: validationLogic.internal_consistency_check === 'PASS' ? 'Consistent' : 'Penalty applied' },
        assumption_penalty: -Math.round(penalty * 10) / 10,
        final_score: final,
        server_computed: true,
        version: VERSION.CONFIDENCE
    };
}

// ── Consistency Enforcement ───────────────────────────────────────────────────

function enforceConsistency(data, validationLogic) {
    const diagnostics = [];
    const driftCount = validationLogic.domain_drift_instances.length;
    const specCount = validationLogic.speculative_features_flagged.length;
    if (driftCount !== specCount) diagnostics.push({ check: 'parity', detail: 'drift vs spec mismatch' });
    return diagnostics.length > 0 ? { inconsistencies: diagnostics, count: diagnostics.length } : null;
}

// ── Normalization Helper ───────────────────────────────────────────────────────

function harvestArray(input, itemMapper) {
    if (!input) return [];
    const arr = Array.isArray(input) ? input : (typeof input === 'object' ? Object.values(input) : [input]);
    return arr.map(itemMapper);
}

// ── Persistence & Logging ─────────────────────────────────────────────────────

async function logAudit(result, validationLogic, correlation_id, duration) {
    const entry = {
        id: crypto.randomUUID(),
        correlation_id,
        tool: result.tool_execution?.tool || 'synthesis',
        prompt_hash: crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex'),
        duration_ms: duration,
        status: 200,
        engine_version: VERSION.ENGINE,
        engine_build_hash: VERSION.BUILD,
        trace_data: {
            final_score: result.confidence_breakdown?.final_score,
            drift_count: validationLogic.domain_drift_instances.length,
            feature_count: (result.core_functional_components || []).length
        }
    };

    insertAuditLog(entry);
    structuredLog('INFO', 'Audit log persisted', { correlation_id, score: entry.trace_data.final_score });
}

// ── Tool Execution Security ───────────────────────────────────────────────────

const TOOL_ALLOWLIST = new Set(['chatgpt', 'copilot', 'plan', 'test-scaffold']);
const PROMPT_DENYLIST = ['exec(', 'eval(', 'child_process', 'rm -rf', 'drop table', 'delete from', '__proto__', 'constructor['];
const TOOL_SYSTEM_PROMPTS = {
    chatgpt: 'You are an expert software architect. Analyze the spec and provide architectural guidance.',
    copilot: 'You are a senior engineer. Generate production-ready code scaffolding.',
    plan: 'You are a tech lead. Generate a detailed implementation plan. Return ONLY valid JSON: { "tasks": [{ "id": "string", "title": "string", "hours": number, "depends_on": "string[]", "ci_check": "string" }], "total_hours": number, "phases": ["string"] }',
    'test-scaffold': 'You are a QA engineer. Generate comprehensive unit test scaffolding.'
};

function sanitizePrompt(prompt) {
    if (typeof prompt !== 'string' || prompt.length > 50000) return null;
    const cleaned = prompt.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const lower = cleaned.toLowerCase();
    for (const denied of PROMPT_DENYLIST) { if (lower.includes(denied.toLowerCase())) return null; }
    return cleaned;
}

// ── Groq API Helper ────────────────────────────────────────────────────────────

function groqRequest(messages, opts = {}) {
    const payload = JSON.stringify({
        model: opts.model || 'llama-3.3-70b-versatile',
        messages,
        temperature: opts.temperature ?? 0,
        max_tokens: opts.max_tokens,
        response_format: opts.jsonMode ? { type: 'json_object' } : undefined
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        }, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) { reject(new Error(`Groq: ${json.error.message}`)); return; }
                    resolve(json.choices[0].message.content);
                } catch (e) { reject(new Error(`Groq parse error: ${data.slice(0, 300)}`)); }
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// ── V3 Generation Prompt ───────────────────────────────────────────────────────

async function callGroq(payload) {
    const { mode, text, answers } = payload;
    let sysPrompt, userPrompt;

    if (mode === 'clarify' || !answers || Object.keys(answers).length === 0) {
        sysPrompt = `You are Re-Prompt v3.2 Clarification Engine. Ask 3-5 questions. Return JSON only: { "clarification_required": true, "questions": [] }`;
        userPrompt = text;
    } else {
        let answerContext = '';
        for (const [q, a] of Object.entries(answers)) answerContext += `Q: ${q}\nA: ${a}\n\n`;
        sysPrompt = `You are Re-Prompt v3.2 Architect. Output valid JSON spec using strict engineering discipline.`;
        userPrompt = `VISION: ${text}\n\nANSWERS:\n${answerContext}`;
    }

    const content = await groqRequest(
        [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
        { jsonMode: true }
    );
    return JSON.parse(content);
}

// ── Main Validation Pipeline ───────────────────────────────────────────────────

async function runValidationPipeline(payload, correlation_id) {
    const start = Date.now();
    incCounter('requests', 'total');

    const rawResponse = await callGroq(payload);
    if (payload.mode === 'clarify' || !payload.answers || Object.keys(payload.answers).length === 0) {
        return { response: rawResponse, isClarify: true };
    }

    rawResponse.core_functional_components = harvestArray(
        rawResponse.core_functional_components || rawResponse.core_features, f => ({
            name: String(f.name || 'Feature'),
            description: String(f.description || ''),
            trace_to_input: Array.isArray(f.trace_to_input) ? f.trace_to_input : [String(f.trace_to_input || '')].filter(Boolean),
            is_speculative: f.is_speculative === true
        })
    );
    rawResponse.assumptions_made = harvestArray(rawResponse.assumptions_made, a => ({
        assumption: String(a.assumption || a.text || 'Inferred Requirement'),
        reason: String(a.reason || 'Derived'),
        confidence_impact: a.confidence_impact ?? -2
    }));

    const validationLogic = await detectDomainDrift(rawResponse, String(payload.text || ''), correlation_id);
    const confidence = recomputeConfidence(rawResponse, validationLogic);
    const inconsistencies = enforceConsistency(rawResponse, validationLogic);

    const finalResponse = {
        ...rawResponse,
        validation_logic: validationLogic,
        confidence_breakdown: confidence,
        inconsistencies_found: inconsistencies
    };

    const duration = Date.now() - start;
    recordLatency(duration);
    await logAudit(finalResponse, validationLogic, correlation_id, duration);

    return {
        response: finalResponse,
        duration,
        isBlocking: confidence.final_score < THRESHOLDS.CONFIDENCE_MIN
    };
}

// ── HTTP Server ────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set(['http://localhost:4444', 'http://127.0.0.1:4444', 'http://localhost:3000']);

const server = http.createServer((req, res) => {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    const correlation_id = req.headers['x-correlation-id'] || crypto.randomUUID();
    const origin = req.headers.origin || '';

    const setBaseHeaders = (status = 200, contentType = 'application/json') => {
        if (ALLOWED_ORIGINS.has(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Correlation-ID');
        res.setHeader('X-Correlation-ID', correlation_id);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none';");
        if (req.method !== 'OPTIONS' && !res.writableEnded) res.writeHead(status, { 'Content-Type': contentType });
    };

    const readBody = () => new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            if ((body.length + chunk.length) > LIMITS.MAX_BODY_BYTES) { req.destroy(); reject(new Error('Payload Too Large')); return; }
            body += chunk;
        });
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });

    if (req.method === 'OPTIONS') { setBaseHeaders(204); return res.end(); }

    if (req.url === '/api/metrics' && req.method === 'GET') { setBaseHeaders(200); return res.end(JSON.stringify(getMetricsReport())); }

    if ((req.url === '/analyze.php' || req.url === '/api/validate') && req.method === 'POST') {
        const limitType = req.url === '/analyze.php' ? RATE_LIMITS.ANALYZE_MIN : RATE_LIMITS.VALIDATE_MIN;
        if (!checkRateLimit(clientIp, limitType)) return sendError(res, { status: 429, title: 'Rate Limit Exceeded', correlation_id });

        readBody().then(async (body) => {
            try {
                const payload = JSON.parse(body);
                const result = await runValidationPipeline(payload, correlation_id);
                if (result.isBlocking) {
                    incCounter('requests', 'errors_422');
                    return sendError(res, { status: 422, title: 'Confidence Floor Violation', detail: `Rejected score ${result.response.confidence_breakdown.final_score}`, correlation_id });
                }
                setBaseHeaders(200); res.end(JSON.stringify(result.response));
            } catch (err) { sendError(res, { status: 500, title: 'Error', detail: err.message, correlation_id }); }
        }).catch(err => sendError(res, { status: 413, title: 'Payload Error', detail: err.message, correlation_id }));
        return;
    }

    if (req.url === '/api/execute-tool' && req.method === 'POST') {
        if (!checkRateLimit(clientIp, RATE_LIMITS.EXECUTE_MIN)) return sendError(res, { status: 429, title: 'Rate Limit Exceeded', correlation_id });
        readBody().then(async (body) => {
            try {
                const { tool, prompt } = JSON.parse(body);
                if (!TOOL_ALLOWLIST.has(tool)) return sendError(res, { status: 400, title: 'Unsupported Tool', correlation_id });
                const toolResponse = await groqRequest([{ role: 'system', content: TOOL_SYSTEM_PROMPTS[tool] }, { role: 'user', content: prompt }]);
                setBaseHeaders(200); res.end(JSON.stringify({ ok: true, tool, toolResponse }));
            } catch (err) { sendError(res, { status: 500, title: 'Tool Error', detail: err.message, correlation_id }); }
        }).catch(err => sendError(res, { status: 413, title: 'Payload Error', detail: err.message, correlation_id }));
        return;
    }

    if (req.url === '/api/simulate' && req.method === 'POST') {
        if (!checkRateLimit(clientIp, RATE_LIMITS.VALIDATE_MIN)) return sendError(res, { status: 429, title: 'Rate Limit Exceeded', correlation_id });
        readBody().then(async (body) => {
            try {
                const { data } = JSON.parse(body);
                const results = [];
                const thresholds = [0.70, 0.55, 0.45];

                const originalDc = data.validation_logic?.domain_consistency_computed ?? 100;
                const originalScore = data.confidence_breakdown?.final_score ?? 100;

                for (const t of thresholds) {
                    // Mock recalculation based on different thresholds
                    // In a full implementation, we'd re-run detectDomainDrift with the new threshold
                    // For now, we simulate the effect on DC and final score
                    const simulatedDc = Math.round(originalDc * (t / 0.6) * 10) / 10; // 0.6 is roughly the original balance
                    const simulatedScore = Math.min(100, Math.max(0, originalScore + (simulatedDc - originalDc) * 0.3));
                    results.push({
                        threshold: t,
                        domain_consistency: simulatedDc,
                        confidence_delta: simulatedScore - originalScore,
                        final_score: simulatedScore
                    });
                }
                setBaseHeaders(200); res.end(JSON.stringify(results));
            } catch (err) { sendError(res, { status: 500, title: 'Simulation Error', detail: err.message, correlation_id }); }
        }).catch(err => sendError(res, { status: 413, title: 'Payload Error', detail: err.message, correlation_id }));
        return;
    }

    if (req.url.startsWith('/api/logs') && req.method === 'GET') {
        const idMatch = req.url.match(/\/api\/logs\/([a-z0-9-]+)$/);
        if (idMatch) {
            const entry = getAuditLog(idMatch[1]);
            if (!entry) return sendError(res, { status: 404, title: 'Log Not Found', correlation_id });
            setBaseHeaders(200); return res.end(JSON.stringify(entry));
        }
        setBaseHeaders(200); return res.end(JSON.stringify({ recent: getRecentLogs(20) }));
    }

    let filePath = (req.url === '/' || req.url === '/index.html') ? 'nlp-analyze.html' : req.url.slice(1);
    filePath = filePath.split('?')[0];
    const BLOCKED = /^(secret\.php|\.env.*|.*\.db|.*\.mjs|node_modules|package.*)/i;
    if (BLOCKED.test(filePath) || filePath.includes('..')) return sendError(res, { status: 403, title: 'Forbidden', correlation_id });

    const fullPath = path.join(__dirname, filePath);
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            if (!filePath.includes('.')) {
                fs.readFile(path.join(__dirname, 'nlp-analyze.html'), (e, d) => {
                    if (e) return sendError(res, { status: 404, title: 'Not Found', correlation_id });
                    setBaseHeaders(200, 'text/html'); res.end(d);
                });
                return;
            }
            return sendError(res, { status: 404, title: 'Not Found', correlation_id });
        }
        const ext = path.extname(filePath);
        const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
        setBaseHeaders(200, mime); res.end(data);
    });
});

server.listen(PORT, () => {
    structuredLog('INFO', `Re-Prompt v${VERSION.ENGINE} Bootstrapped`, {
        port: PORT,
        mode: process.env.NODE_ENV || 'production',
        persistence: 'SQLite WAL',
        metrics: 'O(1) In-Memory'
    });
});
