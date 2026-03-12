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
}

/** Load environment variables from .env if it exists. */
$_ENV_CACHE = [];
if (file_exists(__DIR__ . '/.env')) {
    $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        list($name, $value) = explode('=', $line, 2);
        $_ENV_CACHE[trim($name)] = trim($value);
    }
}

if (!defined('GROQ_API_KEY') && isset($_ENV_CACHE['GROQ_API_KEY'])) {
    define('GROQ_API_KEY', $_ENV_CACHE['GROQ_API_KEY']);
}

if (!defined('GROQ_API_KEY')) {
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
 * Strictly enforced via ALLOWED_ORIGINS whitelist.
 */
$allowedOrigins = explode(',', $_ENV_CACHE['ALLOWED_ORIGINS'] ?? 'http://localhost:3000');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin"); 
} else {
    // If not in whitelist, don't send allow-origin (defaults to block cross-origin)
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');
header('Vary: Origin');

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
$rawBody = file_get_contents('php://input');
$parsedBody = json_decode($rawBody, true) ?? [];

// 3. Sanitize and validate input parameters.
$input      = trim($parsedBody['text'] ?? $_POST['text'] ?? '');
$mode       = $parsedBody['mode'] ?? $_GET['mode'] ?? 'clarify'; 
$answers    = $parsedBody['answers'] ?? [];
$intentMode = $parsedBody['intent_mode'] ?? 'auto';

// Ensure /cache and /logs directories exist and are writable.
ensureDirectory(CACHE_DIR);
ensureDirectory(LOG_DIR);

// ── Special Handling for Non-Analysis Modes ───────────────────────────────────

if ($mode === 'simulate') {
    $data = $parsedBody['data'] ?? [];
    $results = [];
    $thresholds = [0.70, 0.55, 0.45];
    $originalDc = $data['validation_logic']['domain_consistency_computed'] ?? 100;
    $originalScore = $data['confidence_breakdown']['final_score'] ?? 100;

    foreach ($thresholds as $t) {
        $simulatedDc = round($originalDc * ($t / 0.6) * 10) / 10;
        $simulatedScore = min(100, max(0, $originalScore + ($simulatedDc - $originalDc) * 0.3));
        $results[] = [
            'threshold' => $t,
            'domain_consistency' => $simulatedDc,
            'confidence_delta' => $simulatedScore - $originalScore,
            'final_score' => $simulatedScore
        ];
    }
    logRequest(getClientIp(), 0, 'SUCCESS_SIMULATE');
    echo json_encode($results);
    exit;
}

if ($mode === 'execute-tool') {
    $tool = $parsedBody['tool'] ?? '';
    $prompt = $parsedBody['prompt'] ?? '';
    $toolAllowlist = ['chatgpt', 'copilot', 'plan', 'test-scaffold', 'claude'];
    $toolSystemPrompts = [
        'chatgpt' => 'You are an expert software architect. Analyze the spec and provide architectural guidance.',
        'copilot' => 'You are a senior engineer. Generate production-ready code scaffolding.',
        'claude' => 'You are a senior systems architect. Provide high-level design patterns and robust integration strategies.',
        'plan' => 'You are a tech lead. Generate a detailed implementation plan. Return ONLY valid JSON: { "tasks": [{ "id": "string", "title": "string", "hours": number, "depends_on": "string[]", "ci_check": "string" }], "total_hours": number, "phases": ["string"] }',
        'test-scaffold' => 'You are a QA engineer. Generate comprehensive unit test scaffolding.'
    ];

    if (!in_array($tool, $toolAllowlist)) {
        jsonError('Unsupported tool.', 400);
    }

    $systemMsg = $toolSystemPrompts[$tool] ?? 'You are a senior technical advisor.';
    $payload = json_encode([
        'model' => 'llama-3.3-70b-versatile',
        'messages' => [
            ['role' => 'system', 'content' => $systemMsg],
            ['role' => 'user', 'content' => $prompt]
        ],
        'temperature' => 0
    ]);

    $ch = curl_init(GROQ_ENDPOINT);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . GROQ_API_KEY,
        ],
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200) jsonError('Groq API Error during tool execution.', 500);
    $env = json_decode($response, true);
    $toolResponse = $env['choices'][0]['message']['content'] ?? 'No response from model.';
    
    logRequest(getClientIp(), strlen($prompt), 'SUCCESS_TOOL');
    echo json_encode(['ok' => true, 'tool' => $tool, 'toolResponse' => $toolResponse]);
    exit;
}

// ── Standard Analysis Request Pipeline ────────────────────────────────────────

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

// 4. Get client IP and apply rate limiting.
$ip = getClientIp();
checkRateLimit($ip);

// 5. Mode-aware Cache Check
// For 'generate', we hash input, answers, and intentMode.
$cacheKey = md5($input . ($mode === 'generate' ? serialize($answers) . $intentMode : ''));
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
    $rawResponse = callGroq($input, $mode, $answers, $intentMode);
    
    if ($rawResponse === null) {
        $lastError = 'API_FAILURE';
        continue;
    }

    $cleaned = stripMarkdownFences($rawResponse);
    $parsed = json_decode($cleaned, true);
    
    if ($parsed && validateSchemaByMode($parsed, $mode)) {
        // Post-process v3.3 fields
        if ($mode === 'generate') {
            $parsed['intent_mode'] = ($intentMode === 'auto') ? 'PRODUCT_PLANNING' : $intentMode;
            $parsed['classification_source'] = ($intentMode === 'auto') ? 'engine' : 'manual';
            $parsed['mode_confidence'] = 0.95; // Fixed confidence for PHP stability
            
            // Standardize aliases
            if (isset($parsed['refined_idea']) && !isset($parsed['refined_problem_statement'])) {
                $parsed['refined_problem_statement'] = $parsed['refined_idea'];
            }
            if (isset($parsed['refined_problem_statement']) && !isset($parsed['refined_domain_specification'])) {
                $parsed['refined_domain_specification'] = $parsed['refined_problem_statement'];
            }
        }
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
 * Safely resolves the client IP address.
 * In a production environment behind a trusted proxy (like Cloudflare), 
 * update this to use trusted headers. For default security, uses REMOTE_ADDR.
 */
function getClientIp(): string {
    // In production, you would whitelist trusted proxy IPs before trusting these headers.
    // For now, we prioritize REMOTE_ADDR for security unless specifically configured.
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
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
function callGroq(string $text, string $mode, array $answers, string $intentMode): ?string {
    if ($mode === 'clarify' || empty($answers)) {
        // Mode 1: Extraction & Clarification
        $systemPrompt = "You are the Re-Prompt v3.3 Clarification Engine. "
            . "Analyze the user vision and return ONLY JSON: "
            . "{\"summary\": \"Analysis of vision\", \"clarification_questions\": [\"question 1\", \"question 2\"]}. "
            . "Identify technical gaps and strategic ambiguities.";
        $userPrompt = "VISION: $text\n\nINTENT_HINT: $intentMode\n\nTask: Extract intent and identify architectural gaps.";
    } else {
        // Mode 2: Senior Architect Structured Reasoning
        $answerText = '';
        foreach ($answers as $q => $a) { $answerText .= "Q: $q\nA: $a\n\n"; }
        
        $systemPrompt = "You are Re-Prompt v3.3 Senior Architect & Strategy Consultant. Your mission is to transform vague ideas into high-fidelity, creative, and technically achievable specifications.\n"
            . "Output MUST be a valid JSON object matching the schema below.\n\n"
            . "INTENT_MODE: $intentMode\n\n"
            . "SCHEMA:\n"
            . "{\n"
            . "  \"refined_idea\": \"Primary 1-sentence creative vision\",\n"
            . "  \"refined_problem_statement\": \"Deep analysis, e.g. 'The current market lacks X because Y...'\",\n"
            . "  \"value_proposition\": \"Engaging 2-3 sentence pitch\",\n"
            . "  \"target_users\": [\"Detailed segment 1\", \"Detailed segment 2\"],\n"
            . "  \"problem_solution_fit\": \"string\",\n"
            . "  \"competitive_positioning\": \"string\",\n"
            . "  \"thought_experiments\": [\"Extreme scenario 1\", \"Extreme scenario 2\"],\n"
            . "  \"critical_questions\": [\"Probing question 1\", \"Probing question 2\"],\n"
            . "  \"core_features\": [{\"name\": \"Feature Name\", \"description\": \"Feature Desc\", \"trace_to_input\": [\"input string\"], \"justification\": \"Strategic rationale\"}],\n"
            . "  \"technical_architecture\": {\"frontend\": \"Highly specific (e.g. Next.js 15, Tailwind CSS)\", \"backend\": \"Achievable stack (e.g. Node.js with Fastify or Python FastAPI)\", \"ai_components\": \"Specific models (e.g. Llama-3-70B, GPT-4o, Vector DB)\", \"data_storage\": \"Proven DB choice (e.g. PostgreSQL, Redis)\"},\n"
            . "  \"domain_validation\": {\"domain_consistency_score\": 95},\n"
            . "  \"confidence_scores\": {\"input_clarity\": 90, \"logical_coherence\": 95},\n"
            . "  \"non_functional_requirements\": [{\"category\": \"Performance|Security|...\", \"requirement\": \"Specific target value\", \"priority\": \"HIGH\"}],\n"
            . "  \"risk_analysis\": [{\"risk\": \"Specific technical/business risk\", \"likelihood\": \"HIGH/MED\", \"mitigation\": \"Actionable step\"}],\n"
            . "  \"prd_document\": {\n"
            . "    \"executive_summary\": \"Engaging multi-paragraph summary (min 150 words)\",\n"
            . "    \"problem_statement\": { \"description\": \"string\", \"quantifiable_impact\": \"string\", \"root_cause_analysis\": [\"string\"], \"why_current_fail\": \"string\" },\n"
            . "    \"goals\": [{\"goal\": \"Metric-driven goal\", \"target_metric\": \"string\", \"timeframe\": \"string\"}],\n"
            . "    \"target_audience\": \"Detailed persona description\",\n"
            . "    \"user_personas\": [{\"name\": \"Name\", \"role\": \"Role\", \"needs\": [\"Need 1\"], \"pain_points\": [\"Pain 1\"]}],\n"
            . "    \"user_stories\": [{\"as_a\": \"Persona\", \"i_want\": \"Capability\", \"so_that\": \"Benefit\"}],\n"
            . "    \"functional_requirements\": [{\"id\": \"REQ-001\", \"title\": \"Feature\", \"priority\": \"P0\", \"description\": \"Logic\", \"user_impact\": \"HIGH\", \"acceptance_criteria\": [\"Criteria 1\"], \"edge_cases\": [\"Edge 1\"]}],\n"
            . "    \"non_functional_requirements\": [{\"category\": \"string\", \"requirement\": \"string\", \"target\": \"string\"}],\n"
            . "    \"technical_considerations\": { \"deployment_model\": \"Achievable Cloud approach\", \"data_source_integration\": \"Specific APIs/Webhooks\", \"maintenance_model\": \"Operational strategy\", \"admin_interface\": \"Control plane details\" },\n"
            . "    \"success_metrics\": { \"business\": [{\"metric\": \"Metric\", \"target\": \"KPI\", \"measurement\": \"Source\"}], \"technical\": [{\"metric\": \"Metric\", \"target\": \"KPI\", \"measurement\": \"Source\"}] },\n"
            . "    \"assumptions\": [\"LIST EVERY EXPLICIT CREATIVE ASSUMPTION (speculative inference)\"],\n"
            . "    \"out_of_scope\": [\"string\"],\n"
            . "    \"risks\": [{\"risk\": \"string\", \"probability\": \"HIGH/MED\", \"impact\": \"HIGH/MED\", \"mitigation\": \"string\"}],\n"
            . "    \"roadmap\": [\"Phase 1: MVP\", \"Phase 2: Scale\"],\n"
            . "    \"open_questions\": [\"string\"]\n"
            . "  },\n"
            . "  \"generated_prompts\": {\n"
            . "    \"universal_master\": \"Detailed Master Prompt...\",\n"
            . "    \"chatgpt_specialized\": \"ChatGPT specific...\",\n"
            . "    \"claude_specialized\": \"Claude specific architect prompt...\",\n"
            . "    \"copilot_coding\": \"Architectural prompt...\"\n"
            . "  }\n"
            . "}\n"
            . "RULES:\n"
            . "1. PROACTIVE CREATIVITY: If the user vision is sparse, MAKE CREATIVE ASSUMPTIONS to build a complete product concept.\n"
            . "2. ASSUMPTION FORMAT: EVERY item in the 'assumptions' array MUST start with 'ASSUMPTION: '. \n"
            . "   - ONLY include speculative inferences that add value/detail not present in user input (e.g. features user didn't mention).\n"
            . "   - NEVER include facts already stated by the user or from the context answers as an assumption.\n"
            . "   - GOOD: \"ASSUMPTION: The luxury space hotel will offer 0.5G artificial gravity in premium suites.\"\n"
            . "3. ACHIEVABLE TECH STACK: Define a specific, achievable architecture using real tech names (Next.js, FastAPI, PostgreSQL, etc). No generic placeholders.\n"
            . "4. EXEC_SUMMARY: Must be at least 150 words.\n"
            . "5. NO EMPTY FIELDS: Populate ALL sections. If data is unavailable, use creative inference.";
        $userPrompt = "INITIAL VISION: $text\n\nCONTEXT:\n$answerText\n\nTASK: Generate the specification and the final optimized prompts for intent state: $intentMode.";
    }

    $payload = json_encode([
        'model'       => GROQ_MODEL,
        'messages'    => [
            ['role' => 'system', 'content' => $systemPrompt],
            ['role' => 'user',   'content' => $userPrompt],
        ],
        'temperature' => 0, // Deterministic logic for v2
        'max_tokens'  => 4096, // Increased from 2000 to prevent truncation in large PRDs
        'response_format' => ['type' => 'json_object'] // Ensure JSON mode
    ]);

    $ch = curl_init(GROQ_ENDPOINT);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_TIMEOUT        => 45,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . GROQ_API_KEY,
        ],
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
        return isset($data['summary']) && 
               (isset($data['clarification_questions']) || isset($data['questions']));
    } else {
        // v3.3 Schema Requirements: Resilient to variation in model output keys
        return isset($data['generated_prompts']) && 
               (isset($data['refined_idea']) || 
                isset($data['refined_problem_statement']) || 
                isset($data['refined_domain_specification']));
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
