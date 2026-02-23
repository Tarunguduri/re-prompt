// ── Re-Prompt v3.2 SQLite Persistence Layer ───────────────────────────────────
// Uses better-sqlite3 if available, otherwise degrades gracefully to in-memory.

import { LIMITS } from './config.mjs';

let db = null;
const fallbackLog = []; // in-memory fallback if SQLite unavailable

// ── Try to import better-sqlite3 ─────────────────────────────────────────────
let Database = null;
try {
    const mod = await import('better-sqlite3');
    Database = mod.default || mod;
} catch (_) {
    // better-sqlite3 not installed — run in memory-only mode
}

export function initDb() {
    if (!Database) {
        console.warn('\x1b[33m[DB]\x1b[0m better-sqlite3 not found. Running in-memory audit log mode.');
        return;
    }
    try {
        db = new Database('./re-prompt.db');
        // WAL mode for concurrent reads
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.exec(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id TEXT PRIMARY KEY,
                correlation_id TEXT,
                tool TEXT,
                prompt_hash TEXT,
                duration_ms INTEGER,
                status INTEGER,
                engine_version TEXT,
                engine_build_hash TEXT,
                trace_data TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            );
            CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
        `);
        console.log('\x1b[32m[DB]\x1b[0m SQLite initialized (WAL mode).');
    } catch (e) {
        console.warn('\x1b[33m[DB]\x1b[0m SQLite init failed, falling back to in-memory:', e.message);
        db = null;
    }
}

export function insertAuditLog(entry) {
    if (db) {
        try {
            const stmt = db.prepare(`
                INSERT OR REPLACE INTO audit_logs
                (id, correlation_id, tool, prompt_hash, duration_ms, status, engine_version, engine_build_hash, trace_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            stmt.run(
                entry.id,
                entry.correlation_id || '',
                entry.tool || 'synthesis',
                entry.prompt_hash || '',
                entry.duration_ms || 0,
                entry.status || 200,
                entry.engine_version || '',
                entry.engine_build_hash || '',
                JSON.stringify(entry.trace_data || {})
            );
            return;
        } catch (e) {
            console.warn('[DB] Insert failed, using fallback:', e.message);
        }
    }
    // Fallback: in-memory rolling window
    fallbackLog.push(entry);
    if (fallbackLog.length > LIMITS.AUDIT_LOG_MAX) fallbackLog.shift();
}

export function getAuditLog(id) {
    if (db) {
        try {
            const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id);
            if (row) {
                try { row.trace_data = JSON.parse(row.trace_data); } catch (_) { }
                return row;
            }
        } catch (_) { }
    }
    return fallbackLog.find(e => e.id === id) || null;
}

export function getRecentLogs(limit = 20) {
    if (db) {
        try {
            return db.prepare('SELECT id, tool, status, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
        } catch (_) { }
    }
    return fallbackLog.slice(-limit).reverse().map(e => ({
        id: e.id,
        tool: e.tool || 'synthesis',
        status: e.status || 200,
        created_at: e.timestamp || new Date().toISOString()
    }));
}
