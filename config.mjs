// ── Re-Prompt v3.2 Configuration ─────────────────────────────────────────────

export const VERSION = {
    ENGINE: '3.2.0',
    SIMILARITY: 'hybrid-tfidf-llm-v2',
    CONFIDENCE: '2.0',
    BUILD: process.env.BUILD_HASH || 'dev'
};

export const LIMITS = {
    MAX_BODY_BYTES: 512 * 1024,       // 512 KB request body cap
    MAX_JUDGE_CALLS_PER_REQ: 8,       // LLM judge calls per synthesis
    ABORT_TIMEOUT_MS: 4000,           // Fetch abort timeout for judge calls
    AUDIT_LOG_MAX: 500,               // Rolling window for in-memory log
};

export const THRESHOLDS = {
    TFIDF_TRACEABLE: 0.70,
    TFIDF_SPECULATIVE: 0.25,
    LLM_TRACEABLE: 0.60,
    LLM_ASSUMPTION: 0.40,
    CONFIDENCE_MIN: 10,               // Reject responses below this score
};

export const FEATURES = {
    USE_LLM_JUDGE: true,              // Enable Groq-backed LLM judge
    PERSIST_AUDIT: true,              // Write audit logs to SQLite
};

export const RATE_LIMITS = {
    ANALYZE_MIN: 30,                  // /analyze.php per IP per minute
    VALIDATE_MIN: 30,                 // /api/validate per IP per minute
    EXECUTE_MIN: 10,                  // /api/execute-tool per IP per minute
};

/**
 * Validate required environment configuration and warn on startup.
 */
export function validateConfig() {
    const key = process.env.GROQ_API_KEY;
    if (!key || key.includes('YOUR_GROQ')) {
        console.warn('\x1b[31m[CRITICAL]\x1b[0m GROQ_API_KEY is missing or placeholder. Set via environment variable.');
    } else {
        // Never log the key itself
        console.log('\x1b[32m[CONFIG]\x1b[0m GROQ_API_KEY loaded from environment.');
    }
}
