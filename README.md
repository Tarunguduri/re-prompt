# 🤖 Re-Prompt: Kinetic Neural Engine

<div align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML5/JS-E34F26?style=for-the-badge&logo=html5" alt="HTML5" />
  <img src="https://img.shields.io/badge/Backend-Node.js-339933?style=for-the-badge&logo=nodedotjs" alt="Node.js" />
  <img src="https://img.shields.io/badge/Backend--Proxy-PHP-777BB4?style=for-the-badge&logo=php" alt="PHP" />
  <img src="https://img.shields.io/badge/AI-Groq%20Llama%203.3-orange?style=for-the-badge" alt="AI" />
</div>

<br />

> [!IMPORTANT]
> **Zero Context Loss Prompting.**
> Re-Prompt v3.3 is a reasoning system that transforms raw human vision into high-fidelity AI instructions, ensuring no technical detail is lost through its hybrid validation pipeline.

---

## 🛰️ Core Features

- **Master Synthesis**: Turns vague ideas into exhaustive technical blueprints with 100% detail retention.
- **Hybrid Validation**: In-memory similarity engines and LLM-as-judge verify every requirement for domain consistency.
- **Creative Inference**: Proactively builds product concepts by making explicit assumptions (prefixed with `ASSUMPTION:`).
- **Hardened Security**: Production-ready with strict CORS enforcement, file blocking, and error sanitization.

---

## 🔒 Configuration (Required)

Re-Prompt follows a secure-by-default architecture. Configure your environment before launching.

### 1. Simple Setup (.env)
Create a `.env` file in the root directory:
```text
GROQ_API_KEY=your_key_here
ALLOWED_ORIGINS=http://localhost:3000,http://yourdomain.com
```

### 2. Launch the Engine
Choose your deployment model:

#### **Development (Node.js)**
Recommended for local testing and interactive metrics.
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

#### **Production (PHP Hybrid)**
Optimized for shared hosting (Hostinger, cPanel) where Node.js is restricted.
- Deploy the `/` files to your web root.
- Ensure `analyze.php` and `.env` are present.
- The `.htaccess` file will automatically block sensitive source access.

---

## 🧪 Security Compliance
The system has passed a multi-layer security audit:
- [x] **CORS Enforcement**: Whitelisted origins only.
- [x] **File Guard**: Direct access to `.env`, `.mjs`, and `.db` is blocked via Node and Apache filters.
- [x] **Diagnostic Sanitization**: Sensitive paths and errors are masked in production mode.

---

<div align="center">
  <b>Built for Visionaries who demand precision.</b>
</div>
