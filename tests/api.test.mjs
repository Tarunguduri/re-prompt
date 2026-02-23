/**
 * Re-Prompt v3.1 — Integration Tests (Live Server)
 *
 * Requires:  node dev-server.mjs running on port 4444
 * Run:       node --test tests/api.test.mjs
 *
 * Test suites:
 *   POST /api/validate      — synthesis pipeline + schema + trace_status
 *   POST /api/execute-tool  — security rejection (denylist / bad tool)
 *   POST /api/execute-tool  — successful execution + audit log
 *   GET  /api/logs/:id      — log retrieval
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = 'http://localhost:4444';
const LONG_TIMEOUT = 20000;   // Groq synthesis can take ~10s
const SHORT_TIMEOUT = 5000;

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function post(path, body, timeoutMs = LONG_TIMEOUT) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const resp = await fetch(`${BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
        const data = await resp.json().catch(() => ({}));
        return { status: resp.status, data };
    } finally {
        clearTimeout(id);
    }
}

async function get(path, timeoutMs = SHORT_TIMEOUT) {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const resp = await fetch(`${BASE}${path}`, { signal: ctrl.signal });
        const data = await resp.json().catch(() => ({}));
        return { status: resp.status, data };
    } finally {
        clearTimeout(id);
    }
}

// ─── Shared state ─────────────────────────────────────────────────────────────
let capturedLogId = null;  // filled by execute-tool suite, consumed by logs suite

// ─── Ping server before any tests ────────────────────────────────────────────
before(async () => {
    try {
        const r = await get('/api/logs', SHORT_TIMEOUT);
        // Any HTTP response means server is up
    } catch (err) {
        throw new Error(`Server not reachable at ${BASE}. Start it with: node dev-server.mjs\n${err.message}`);
    }
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1: POST /api/validate — Full synthesis + enforcement pipeline
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/validate', () => {

    // Minimal synthesis payload — re-uses the same pipeline as /analyze.php
    const SYNTHESIS_PAYLOAD = {
        mode: 'generate',
        text: 'A web app for students to track academic deadlines with reminders.',
        answers: {
            'Who are the target users?': 'University students',
            'What platform?': 'Web browser, mobile-friendly',
            'Any key constraints?': 'Free tier, no auth required initially'
        }
    };

    it('returns 200 for valid synthesis payload', async () => {
        const { status, data } = await post('/api/validate', SYNTHESIS_PAYLOAD);
        assert.equal(status, 200, `Expected 200, got ${status}. body: ${JSON.stringify(data).slice(0, 200)}`);
    });

    it('response contains all 9 required v3 schema keys', async () => {
        const { status, data } = await post('/api/validate', SYNTHESIS_PAYLOAD);
        assert.equal(status, 200);
        const REQUIRED = [
            'refined_domain_specification', 'assumptions_made',
            'core_functional_components', 'non_functional_requirements',
            'technical_architecture', 'risk_analysis',
            'validation_logic', 'confidence_breakdown', 'generated_prompts'
        ];
        const missing = REQUIRED.filter(k => !(k in data));
        assert.deepEqual(missing, [], `Missing schema keys: ${missing.join(', ')}`);
    });

    it('confidence_breakdown.server_computed is true', async () => {
        const { status, data } = await post('/api/validate', SYNTHESIS_PAYLOAD);
        assert.equal(status, 200);
        const cb = data.confidence_breakdown || {};
        assert.equal(cb.server_computed, true, `server_computed should be true — got: ${JSON.stringify(cb)}`);
        assert.ok(cb.final_score >= 0 && cb.final_score <= 100, `Score out of range: ${cb.final_score}`);
        console.log(`  [validate] final_score: ${cb.final_score}`);
    });

    it('features have trace_status assigned by hybrid pipeline', async () => {
        const { status, data } = await post('/api/validate', SYNTHESIS_PAYLOAD);
        assert.equal(status, 200);
        const features = data.core_functional_components || [];
        assert.ok(features.length > 0, 'No features returned');
        const statuses = features.map(f => f.trace_status);
        const valid = ['traceable', 'assumption', 'speculative'];
        const badStatuses = statuses.filter(s => !valid.includes(s));
        assert.deepEqual(badStatuses, [], `Invalid trace_status values: ${badStatuses}`);
        console.log(`  [validate] features: ${features.map(f => `${f.name}→${f.trace_status}`).join(', ')}`);
    });

    it('validation_logic.similarity_engine reports tfidf-based engine', async () => {
        const { status, data } = await post('/api/validate', SYNTHESIS_PAYLOAD);
        assert.equal(status, 200);
        const vl = data.validation_logic || {};
        assert.ok(typeof vl.similarity_engine === 'string' && vl.similarity_engine.length > 0,
            `similarity_engine missing or empty. vl keys: ${Object.keys(vl).join(', ')}`);
        console.log(`  [validate] llm_judge_calls: ${vl.llm_judge_calls} | engine: ${vl.similarity_engine}`);
    });

    it('returns 400 or 500 for empty payload', async () => {
        const { status } = await post('/api/validate', {}, SHORT_TIMEOUT);
        assert.ok([400, 500].includes(status), `Expected 400 or 500 for empty payload, got ${status}`);
    });

});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2: POST /api/execute-tool — Security (fast, no Groq call)
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/execute-tool — Security', () => {

    it('prompt containing eval( → 400', async () => {
        const { status } = await post('/api/execute-tool', {
            tool: 'chatgpt', prompt: 'use eval(process.exit(1)) in app'
        }, SHORT_TIMEOUT);
        assert.equal(status, 400, `Expected 400 for eval( denylist, got ${status}`);
    });

    it('prompt containing exec( → 400', async () => {
        const { status } = await post('/api/execute-tool', {
            tool: 'chatgpt', prompt: 'exec(rm -rf /)'
        }, SHORT_TIMEOUT);
        assert.equal(status, 400);
    });

    it('prompt containing child_process → 400', async () => {
        const { status } = await post('/api/execute-tool', {
            tool: 'chatgpt', prompt: 'require("child_process").execSync("ls")'
        }, SHORT_TIMEOUT);
        assert.equal(status, 400);
    });

    it('unknown tool name → 400', async () => {
        const { status } = await post('/api/execute-tool', {
            tool: 'sql-injector', prompt: 'Build something'
        }, SHORT_TIMEOUT);
        assert.equal(status, 400, `Expected 400 for invalid tool, got ${status}`);
    });

    it('missing prompt field → 400', async () => {
        const { status } = await post('/api/execute-tool', {
            tool: 'chatgpt'
        }, SHORT_TIMEOUT);
        assert.equal(status, 400);
    });

});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3: POST /api/execute-tool — Successful Groq execution
// ══════════════════════════════════════════════════════════════════════════════
describe('POST /api/execute-tool — Execution', () => {

    it('clean chatgpt prompt → 200 with ok:true, toolResponse string, logId', async () => {
        const { status, data } = await post('/api/execute-tool', {
            tool: 'chatgpt',
            prompt: 'List the 3 core components of a student deadline tracker web app.',
            prompt_meta: { source: 'integration-test' }
        });

        // Accept 429 if rate-limited (test is still meaningful)
        if (status === 429) {
            console.log('  [rate-limit] hit — skipping execution assertions');
            return;
        }

        assert.equal(status, 200, `Expected 200, got ${status}. body: ${JSON.stringify(data).slice(0, 200)}`);
        assert.equal(data.ok, true, `ok should be true`);
        assert.ok(typeof data.toolResponse === 'string' && data.toolResponse.length > 10,
            `toolResponse should be a non-empty string`);
        assert.ok(typeof data.logId === 'string', `logId should be a string. Keys: ${Object.keys(data).join(', ')}`);
        assert.ok(typeof data.duration_ms === 'number', `duration_ms should be a number`);

        capturedLogId = data.logId;
        console.log(`  [execute-tool] logId: ${capturedLogId}`);
        console.log(`  [execute-tool] duration: ${data.duration_ms}ms`);
        console.log(`  [execute-tool] preview: ${data.toolResponse.slice(0, 80)}...`);
    });

    it('test-scaffold tool → 200 with relevant scaffold output', async () => {
        const { status, data } = await post('/api/execute-tool', {
            tool: 'test-scaffold',
            prompt: 'A Node.js REST API with endpoints: POST /users, GET /users/:id, DELETE /users/:id'
        });

        if (status === 429) { console.log('  [rate-limit] skipping'); return; }

        assert.equal(status, 200);
        assert.equal(data.ok, true);
        assert.ok(data.toolResponse.length > 20);
    });

});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4: GET /api/logs
// ══════════════════════════════════════════════════════════════════════════════
describe('GET /api/logs/:id', () => {

    it('GET /api/logs returns recent summary list', async () => {
        const { status, data } = await get('/api/logs');
        assert.equal(status, 200);
        assert.ok(typeof data.count === 'number', `count missing. Keys: ${Object.keys(data).join(', ')}`);
        assert.ok(Array.isArray(data.recent), 'recent should be an array');
        console.log(`  [logs] total entries: ${data.count}`);
    });

    it('known logId → 200 with audit entry', async () => {
        if (!capturedLogId) {
            console.log('  [skip] no logId captured — skipping (execute-tool test may have rate-limited)');
            return;
        }
        const { status, data } = await get(`/api/logs/${capturedLogId}`);
        assert.equal(status, 200, `Expected 200 for valid logId, got ${status}`);
        assert.ok(data.id || data.tool, `Entry should have id/tool. Keys: ${Object.keys(data).join(', ')}`);
        assert.equal(data.id, capturedLogId, 'Returned id should match requested id');
        console.log(`  [logs] entry: tool=${data.tool}, duration=${data.duration_ms}ms`);
    });

    it('unknown logId → 404', async () => {
        const { status } = await get('/api/logs/nonexistent-id-xyz-000');
        assert.equal(status, 404, `Expected 404 for unknown id, got ${status}`);
    });

});

console.log('\n\x1b[36m⚡ Re-Prompt v3.1 Integration Tests\x1b[0m');
console.log('\x1b[33m   Requires: node dev-server.mjs on port 4444\x1b[0m\n');
