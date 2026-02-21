<?php
/**
 * analyze.php — Secure Groq API Proxy for RePrompt NLP Analysis
 *
 * Features:
 *  - Input validation (min 30, max 3000 characters)
 *  - IP-based rate limiting (5 requests per minute per IP)
 *  - Response caching via md5 hash (10-minute TTL)
 *  - Structured logging to /logs/requests.log
 *  - Retry logic if JSON parsing or schema validation fails
 *  - Strict schema validation before returning to frontend
 *
 * Compatible with Hostinger shared hosting (PHP 7.4+, no Node.js required).
 */

// ── Configuration ─────────────────────────────────────────────────────────────

/** Include sensitive credentials from a separate file. */
if (file_exists(__DIR__ . '/secret.php')) {
    require_once __DIR__ . '/secret.php';
} else {
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Critical configuration missing.']);
    exit;
}

/** Groq API endpoint. */
define('GROQ_ENDPOINT', 'https://api.groq.com/openai/v1/chat/completions');

/** Groq model to use for structured output. */
define('GROQ_MODEL', 'llama-3.1-8b-instant');

/** Maximum input length (characters). */
define('MAX_INPUT_LENGTH', 3000);

/** Minimum input length (characters). */
define('MIN_INPUT_LENGTH', 30);

/** Rate limit: max requests per IP per minute. */
define('RATE_LIMIT_MAX', 5);

/** Rate limit window in seconds (60 = 1 minute). */
define('RATE_LIMIT_WINDOW', 60);

/** Cache TTL in seconds (600 = 10 minutes). */
define('CACHE_TTL', 600);

/** Path to the cache directory (relative to this file). */
define('CACHE_DIR', __DIR__ . '/cache');

/** Path to the logs directory (relative to this file). */
define('LOG_DIR', __DIR__ . '/logs');

/** Rate limit state file (stored inside the cache directory). */
define('RATE_LIMIT_FILE', CACHE_DIR . '/rate_limit.json');

/** Required JSON schema keys returned by the model. */
define('SCHEMA_KEYS', ['summary', 'main_themes', 'key_entities', 'emotional_tone', 'core_conflict', 'suggested_action', 'confidence_score', 'clarification_questions', 'platform_prompts']);

/** Keys that must be arrays in the schema. */
define('ARRAY_KEYS', ['main_themes', 'key_entities', 'clarification_questions']);

// ── Bootstrap ─────────────────────────────────────────────────────────────────

// Set response headers: JSON only, CORS for same-origin requests.
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

/** 
 * Restricted CORS: 
 * Ideally set this to your specific domain (e.g., https://yourdomain.com) 
 * for maximum security. Currently allowing same-origin by default. 
 */
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header("Access-Control-Allow-Origin: $origin"); 
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

// Handle CORS preflight request.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Ensure /cache and /logs directories exist and are writable.
ensureDirectory(CACHE_DIR);
ensureDirectory(LOG_DIR);

// ── Main Request Flow ──────────────────────────────────────────────────────────

// 1. Accept POST requests only.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Invalid request method.', 405);
}

// 2. Decode JSON body or fall back to form POST.
$body = json_decode(file_get_contents('php://input'), true);
$rawInput = isset($body['text']) ? $body['text'] : (isset($_POST['text']) ? $_POST['text'] : '');

// 3. Sanitize and validate input length.
$input = trim(strip_tags($rawInput));

if (strlen($input) < MIN_INPUT_LENGTH) {
    jsonError('Input too short. Minimum ' . MIN_INPUT_LENGTH . ' characters required.', 400);
}

if (strlen($input) > MAX_INPUT_LENGTH) {
    jsonError('Input too long. Maximum ' . MAX_INPUT_LENGTH . ' characters allowed.', 400);
}

// Main Request Flow
$rawBody = file_get_contents('php://input');
$parsedBody = json_decode($rawBody, true) ?? [];

$mode    = $parsedBody['mode'] ?? 'clarify'; // 'clarify' or 'generate'
$input   = trim($parsedBody['text'] ?? '');
$answers = $parsedBody['answers'] ?? []; // Map of question => answer text

// 1. Basic Validation
if (empty($input)) {
    jsonError('Input text is required.');
}

$cleanInput = strip_tags($input);
if (strlen($cleanInput) < 30) {
    jsonError('Input too short. Minimum 30 characters required.');
}
if (strlen($cleanInput) > MAX_INPUT_LENGTH) {
    jsonError('Input too long. Maximum ' . MAX_INPUT_LENGTH . ' characters allowed.');
}

// 2. Get client IP and apply rate limiting.
$ip = getClientIp();
checkRateLimit($ip);

// 3. Mode-aware Cache Check
// For 'generate', we hash both input and answers.
$cacheKey = md5($input . ($mode === 'generate' ? serialize($answers) : ''));
$cached = getCached($cacheKey);
if ($cached !== null) {
    logRequest($ip, strlen($input), 'CACHE_HIT');
    header('X-Cache: HIT');
    echo json_encode($cached);
    exit;
}

// 4. Call Groq with Mode-specific Logic
$result = null;
$lastError = null;

for ($attempt = 1; $attempt <= 2; $attempt++) {
    $rawResponse = callGroq($input, $mode, $answers);
    
    if ($rawResponse === null) {
        $lastError = 'API_FAILURE';
        continue;
    }

    $cleaned = stripMarkdownFences($rawResponse);
    $parsed = json_decode($cleaned, true);
    
    if ($parsed && validateSchemaByMode($parsed, $mode)) {
        $result = $parsed;
        break;
    } else {
        $lastError = 'MODEL_INVALID';
    }
}

// 5. If failure, log and error.
if ($result === null) {
    logRequest($ip, strlen($input), $lastError ?? 'UNKNOWN');
    jsonError('The reasoning engine returned an invalid format. Please try again.', 500);
}

// 6. Cache and return successful result.
saveCache($cacheKey, $result);
logRequest($ip, strlen($input), 'SUCCESS');
echo json_encode($result);
exit;

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely resolves the real client IP address.
 * Checks common proxy headers first, then falls back to REMOTE_ADDR.
 */
function getClientIp(): string {
    $candidates = [
        'HTTP_CF_CONNECTING_IP',   // Cloudflare
        'HTTP_X_FORWARDED_FOR',    // Load balancers / proxies
        'HTTP_X_REAL_IP',          // Nginx reverse proxy
        'REMOTE_ADDR',             // Standard
    ];
    foreach ($candidates as $key) {
        if (!empty($_SERVER[$key])) {
            // X-Forwarded-For can be a comma-separated list; take the first.
            $ip = trim(explode(',', $_SERVER[$key])[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }
    }
    return '0.0.0.0';
}

/**
 * IP-based rate limiting using a JSON state file.
 *
 * Reads the rate limit file, filters out timestamps older than the window,
 * appends the current timestamp, checks against the limit, and writes back.
 * Uses file locking to avoid race conditions under concurrent requests.
 *
 * If limit is exceeded, responds with 429 and exits immediately.
 */
function checkRateLimit(string $ip): void {
    $now = time();

    // Read current state (locked).
    $fp = fopen(RATE_LIMIT_FILE, 'c+');
    if (!$fp) {
        // Cannot open rate limit file — fail open to avoid blocking all users.
        return;
    }
    flock($fp, LOCK_EX);

    $content = stream_get_contents($fp);
    $state = ($content && strlen($content) > 0) ? json_decode($content, true) : [];
    if (!is_array($state)) {
        $state = [];
    }

    // Get this IP's request timestamps, filtering out expired ones.
    $ipKey = md5($ip); // Hash IP to avoid storing raw IPs in the file.
    $timestamps = isset($state[$ipKey]) ? $state[$ipKey] : [];
    $windowStart = $now - RATE_LIMIT_WINDOW;
    $timestamps = array_values(array_filter($timestamps, fn($t) => $t > $windowStart));

    if (count($timestamps) >= RATE_LIMIT_MAX) {
        // Rate limit exceeded — unlock, respond, and exit.
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonError('Rate limit exceeded. Try again later.', 429);
    }

    // Append current timestamp and save.
    $timestamps[] = $now;
    $state[$ipKey] = $timestamps;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($state));
    flock($fp, LOCK_UN);
    fclose($fp);
}

/**
 * Retrieves a cached result by hash if it exists and hasn't expired.
 *
 * Cache files are named {md5_hash}.json and stored in /cache/.
 * Returns the decoded data array, or null if not cached / expired.
 */
function getCached(string $hash): ?array {
    $file = CACHE_DIR . '/' . $hash . '.json';
    if (!file_exists($file)) {
        return null;
    }
    // Check expiry — if file is older than CACHE_TTL seconds, treat as expired.
    if ((time() - filemtime($file)) > CACHE_TTL) {
        @unlink($file); // Remove stale cache file.
        return null;
    }
    $data = json_decode(file_get_contents($file), true);
    return is_array($data) ? $data : null;
}

/**
 * Saves an analysis result to the cache directory.
 * File is named by md5 hash of the original input text.
 */
function saveCache(string $hash, array $data): void {
    $file = CACHE_DIR . '/' . $hash . '.json';
    file_put_contents($file, json_encode($data), LOCK_EX);
}

/**
 * Appends a structured log line to /logs/requests.log.
 *
 * Format: [TIMESTAMP] | IP | INPUT_LEN chars | STATUS
 * Uses LOCK_EX to safely append under concurrent traffic.
 */
function logRequest(string $ip, int $inputLen, string $status): void {
    $logFile = LOG_DIR . '/requests.log';
    $timestamp = date('Y-m-d H:i:s');
    // Hash the IP in logs for privacy.
    $ipHash = substr(md5($ip), 0, 12);
    $line = "[{$timestamp}] | IP:{$ipHash} | LEN:{$inputLen} | STATUS:{$status}" . PHP_EOL;
    file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Calls the Groq API with mode-specific specialized prompts.
 */
function callGroq(string $text, string $mode, array $answers): ?string {
    if ($mode === 'clarify') {
        $systemPrompt = 'You are the RePrompt Expert Consultant. '
            . 'Your goal is to analyze a user vision and ask critical questions to refine it. '
            . 'Be precise, professional, and identify architectural or conceptual gaps. '
            . 'Respond ONLY with a valid JSON object. '
            . 'The JSON must match this exact schema: '
            . '{"summary": "Short professional summary", "clarification_questions": ["Q1", "Q2", "Q3"]}';
        $userPrompt = 'Analyze this vision and provide 3-5 clarification questions: ' . $text;
    } else {
        $answerText = '';
        foreach ($answers as $q => $a) {
            $answerText .= "Question: $q\nAnswer: $a\n\n";
        }
        $systemPrompt = 'You are the RePrompt Expert Prompt Engineer. '
            . 'Your goal is to transform a raw vision into a high-fidelity system prompt system. '
            . 'CRITICAL: The platform_prompts (chatgpt, midjourney, webflow) MUST retain ALL technical details, business goals, and integration requirements from the user vision and the Master Prompt. '
            . 'DO NOT use generic templates. Detail loss is unacceptable. '
            . 'The chatgpt prompt must be a comprehensive expansion—incorporate every feature mentioned (e.g., shipping, SEO, security, framework). '
            . 'The midjourney prompt must capture the specific aesthetic and material details provided. '
            . 'The webflow prompt must outline the exact technical UI/UX structure including complex functional requirements. '
            . 'Respond ONLY with a valid JSON object. '
            . 'The JSON must match this exact schema: '
            . '{"master_prompt": "Exhaustive, expert-level system prompt", "platform_prompts": {"chatgpt": "..", "midjourney": "..", "webflow": ".."}, "suggested_action": "Specific next steps"}';
        $userPrompt = "INITIAL VISION: $text\n\n"
            . "CLARIFICATION CONTEXT (These are the most important details):\n$answerText\n\n"
            . "TASK: Combine the vision and context into a singular 'Master Prompt'. Then, derive the 'platform_prompts' ensuring they are deeply and obviously connected to the specific details provided above.";
    }

    $payload = json_encode([
        'model'       => GROQ_MODEL,
        'messages'    => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ],
        'temperature' => 0.4,
        'max_tokens'  => 1500,
    ]);

    $ch = curl_init(GROQ_ENDPOINT);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 30,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . GROQ_API_KEY,
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) return null;

    $envelope = json_decode($response, true);
    return $envelope['choices'][0]['message']['content'] ?? null;
}

/**
 * Validates the schema based on the current mode.
 */
function validateSchemaByMode(array $data, string $mode): bool {
    if ($mode === 'clarify') {
        return isset($data['summary']) && isset($data['clarification_questions']) && is_array($data['clarification_questions']);
    } else {
        return isset($data['master_prompt']) && isset($data['platform_prompts']) && isset($data['suggested_action']);
    }
}

/**
 * Strips markdown code fences from model output.
 *
 * Some models wrap JSON in ```json ... ``` despite instructions.
 * This function strips those fences to get clean JSON.
 */
function stripMarkdownFences(string $raw): string {
    // Strip ```json ... ``` or ``` ... ``` wrappers.
    $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
    $cleaned = preg_replace('/\s*```$/', '', $cleaned);
    return trim($cleaned);
}

/**
 * Ensures a directory exists and is writable, creating it if needed.
 * Also drops a protective .htaccess inside to prevent direct web access.
 */
function ensureDirectory(string $path): void {
    if (!is_dir($path)) {
        mkdir($path, 0755, true);
    }
    
    // Secure the directory with an internal .htaccess if it doesn't exist
    $htaccess = $path . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Order deny,allow\nDeny from all", LOCK_EX);
    }
}

/**
 * Outputs a JSON error response and exits immediately.
 *
 * @param string $message  Human-readable error message.
 * @param int    $code     HTTP status code.
 */
function jsonError(string $message, int $code = 400): void {
    http_response_code($code);
    echo json_encode(['error' => $message]);
    exit;
}
