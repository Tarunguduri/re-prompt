// ── Re-Prompt v3.2 In-Memory Metrics ─────────────────────────────────────────

const metrics = {
    counters: {},
    latencies: [],
    confidences: [],
    startTime: Date.now()
};

/**
 * Increment a named counter in a group.
 * e.g. incCounter('requests', 'total')
 */
export function incCounter(group, name) {
    const key = `${group}.${name}`;
    metrics.counters[key] = (metrics.counters[key] || 0) + 1;
}

/**
 * Record a request latency in milliseconds.
 */
export function recordLatency(ms) {
    metrics.latencies.push(ms);
    // Keep rolling window of last 1000
    if (metrics.latencies.length > 1000) metrics.latencies.shift();
}

/**
 * Record a confidence score for distribution tracking.
 */
export function recordConfidence(score) {
    metrics.confidences.push(score);
    if (metrics.confidences.length > 1000) metrics.confidences.shift();
}

/**
 * Returns a snapshot of all metrics — safe for public /api/metrics endpoint.
 */
export function getMetricsReport() {
    const lats = metrics.latencies;
    const confs = metrics.confidences;

    const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const p95 = arr => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length * 0.95)];
    };

    return {
        uptime_ms: Date.now() - metrics.startTime,
        counters: metrics.counters,
        latency: {
            samples: lats.length,
            avg_ms: avg(lats),
            p95_ms: p95(lats),
        },
        confidence: {
            samples: confs.length,
            avg: avg(confs),
            p95: p95(confs),
        }
    };
}
