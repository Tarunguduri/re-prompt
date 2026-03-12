// ── Re-Prompt v3.2 Similarity Engine ─────────────────────────────────────────
// TF-IDF cosine similarity with explainability.

import { THRESHOLDS } from './config.mjs';

const STOP_WORDS = new Set([
    'the', 'a', 'an', 'is', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or',
    'with', 'that', 'this', 'it', 'be', 'are', 'was', 'were', 'by', 'as',
    'from', 'have', 'has', 'not', 'but', 'so', 'its', 'will', 'can', 'should'
]);

function normalizeText(text) {
    return String(text)
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(text) {
    return normalizeText(text)
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Build a TF-IDF vector for a single document relative to a small corpus.
 * Returns Map<token, weight>.
 */
function buildVector(docText, corpusTexts) {
    const docs = [docText, ...corpusTexts];
    const N = docs.length;
    const tokenized = docs.map(tokenize);

    const df = new Map();
    for (const tokens of tokenized) {
        for (const t of new Set(tokens)) df.set(t, (df.get(t) || 0) + 1);
    }

    const targetTokens = tokenized[0];
    const tf = new Map();
    for (const t of targetTokens) tf.set(t, (tf.get(t) || 0) + 1);

    const vec = new Map();
    for (const [t, count] of tf) {
        const tfw = count / (targetTokens.length || 1);
        const idf = Math.log((N + 1) / ((df.get(t) || 0) + 1)) + 1;
        vec.set(t, tfw * idf);
    }
    return vec;
}

function cosineSim(vecA, vecB) {
    let dot = 0, normA = 0, normB = 0;
    for (const [t, w] of vecA) {
        dot += w * (vecB.get(t) || 0);
        normA += w * w;
    }
    for (const [, w] of vecB) normB += w * w;
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Returns a TF-IDF vector for |text| (as a simple Map for caching/reuse).
 * Corpus is treated as single-document for fast path.
 */
export function getVector(text) {
    return buildVector(text, []);
}

/**
 * Analyze semantic similarity between a feature description and corpus vectors.
 * corpus: Array of {vector: Map} objects (pre-built via getVector).
 *
 * Returns { score, status, snippet }
 */
export function analyzeSimilarity(featureText, corpus) {
    const featVec = buildVector(featureText, corpus.map((_, i) => `context_${i}`));

    let maxScore = 0;
    for (const { vector } of corpus) {
        const sim = cosineSim(featVec, vector);
        if (sim > maxScore) maxScore = sim;
    }

    const score = Number(maxScore.toFixed(4));

    let status;
    if (score >= THRESHOLDS.TFIDF_TRACEABLE) {
        status = 'traceable';
    } else if (score <= THRESHOLDS.TFIDF_SPECULATIVE) {
        status = 'speculative';
    } else {
        status = 'assumption'; // gray zone → LLM judge
    }

    // Explainability: find the most overlapping window in corpus[0] text
    const snippet = extractSnippet(featureText, corpus);

    return { score, status, snippet };
}

function extractSnippet(featureText, corpus) {
    if (!corpus.length) return featureText.slice(0, 60);
    const featureTokens = new Set(tokenize(featureText));
    // We don't have the raw text in corpus vectors — return top tokens instead
    const topTokens = [...featureTokens].slice(0, 5).join(', ');
    return topTokens || featureText.slice(0, 60);
}
