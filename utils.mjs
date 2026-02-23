// ── Re-Prompt v3.2 Utility Helpers ───────────────────────────────────────────

/**
 * Sends a structured JSON error response (RFC 7807 problem+json style).
 * Never leaks internal stack traces.
 */
export function sendError(res, { status = 500, title = 'Error', detail = '', correlation_id = '' } = {}) {
    if (res.writableEnded) return;
    try {
        res.writeHead(status, { 'Content-Type': 'application/problem+json' });
        res.end(JSON.stringify({
            type: `https://re-prompt.dev/errors/${status}`,
            title,
            status,
            detail: detail || title,
            correlation_id
        }));
    } catch (_) { /* socket already destroyed */ }
}

/**
 * Structured JSON logger. Replaces console.log for production-grade tracing.
 */
export function structuredLog(level, message, meta = {}) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        message,
        ...meta
    };
    const color = {
        'INFO': '\x1b[32m',
        'WARN': '\x1b[33m',
        'ERROR': '\x1b[31m',
        'DEBUG': '\x1b[36m'
    }[level] || '\x1b[0m';
    console.log(`${color}[${level}]\x1b[0m ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
    return entry;
}
