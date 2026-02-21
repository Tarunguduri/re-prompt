import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 4444;
const GROQ_API_KEY = process.env.GROQ_API_KEY || 'YOUR_GROQ_API_KEY_HERE';

const server = http.createServer((req, res) => {
    // 1. Handle API Proxy for /analyze.php
    if (req.url === '/analyze.php' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const groqResponse = await callGroq(payload);

                // STABILIZATION: Flatten objects to strings for the frontend
                if (groqResponse.clarification_questions) {
                    groqResponse.clarification_questions = groqResponse.clarification_questions.map(q =>
                        typeof q === 'object' ? (q.question || q.text || JSON.stringify(q)) : q
                    );
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(groqResponse));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // 2. Route Handling
    let url = req.url;
    let filePath = '';

    if (url === '/' || url === '/index.html') {
        // Serve the expert mode at the root if requested, or keep React?
        // Let's serve nlp-analyze.html as requested (the promising one)
        filePath = 'nlp-analyze.html';
    } else {
        filePath = url.slice(1);
    }

    const fullPath = path.join(__dirname, filePath);

    fs.readFile(fullPath, (err, data) => {
        if (err) {
            // Fallback to index if it's a subroute (for React SPA routing)
            if (url !== '/' && !filePath.includes('.')) {
                fs.readFile(path.join(__dirname, 'nlp-analyze.html'), (err2, data2) => {
                    if (err2) {
                        res.writeHead(404);
                        res.end('Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(data2);
                    }
                });
                return;
            }
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath);
        const mime = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        }[ext] || 'text/plain';

        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
});

async function callGroq(payload) {
    const { mode, text, answers } = payload;

    let sysPrompt = "";
    let userPrompt = "";

    if (mode === 'clarify') {
        sysPrompt = "You are an expert prompt engineer. Analyze the intent and provide 3-5 clarification questions to improve the prompt. Respond ONLY in JSON: { \"summary\": \"string\", \"clarification_questions\": [\"string\"] }";
        userPrompt = text;
    } else {
        sysPrompt = "Synthesize an expert AI prompt based on the vision and answers. Respond ONLY in JSON: { \"master_prompt\": \"...\", \"platform_prompts\": { \"chatgpt\": \"...\", \"midjourney\": \"...\", \"webflow\": \"...\", \"copilot\": \"...\" }, \"suggested_action\": \"string\" }";
        let answerText = "";
        for (const [q, a] of Object.entries(answers || {})) {
            answerText += `Q: ${q}\nA: ${a}\n\n`;
        }
        userPrompt = `Vision: ${text}\nAnswers:\n${answerText}`;
    }

    const groqPayload = JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
    });

    return new Promise((resolve, reject) => {
        const groqReq = https.request({
            hostname: 'api.groq.com',
            path: '/openai/v1/chat/completions',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const content = json.choices[0].message.content;
                    resolve(JSON.parse(content));
                } catch (e) {
                    reject(new Error("Groq API parsing failed or limit reached."));
                }
            });
        });

        groqReq.on('error', reject);
        groqReq.write(groqPayload);
        groqReq.end();
    });
}

server.listen(PORT, () => {
    console.log(`\x1b[32m[KINETIC ENGINE]\x1b[0m Standalone Server Running: \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
    console.log(`\x1b[33m[RE-STABILIZED]\x1b[0m UI Bug Fixed | JSON Mapping Corrected.`);
});
