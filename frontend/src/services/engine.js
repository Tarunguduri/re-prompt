/**
 * engine.js — Client-side prompt engine. Zero API. Expert-level outputs.
 */

const SCHEMAS = {
  image_generation: [
    { field: 'subject', question: 'What is the main subject or scene you want depicted?', required: true },
    { field: 'style', question: 'What art style? (e.g. photorealistic, anime, oil painting, pixel art)', required: true },
    { field: 'mood', question: 'What mood or atmosphere? (e.g. dark, dreamy, cinematic, joyful)', required: true },
    { field: 'lighting', question: 'Describe the lighting. (e.g. golden hour, dramatic rim, neon glow)', required: false },
    { field: 'color_palette', question: 'Any preferred colors or palette? (e.g. warm earth tones, neon cyan)', required: false },
    { field: 'aspect_ratio', question: 'Format or ratio? (e.g. 16:9, 1:1, 9:16 portrait)', required: false },
    { field: 'negative_elements', question: 'Anything to specifically exclude from the image?', required: false },
  ],
  website_building: [
    { field: 'purpose', question: 'What is the primary goal of this website?', required: true },
    { field: 'target_audience', question: 'Who is the target audience?', required: true },
    { field: 'pages_needed', question: 'Which pages? (e.g. Home, About, Services, Contact, Portfolio)', required: true },
    { field: 'design_style', question: 'Visual style? (e.g. minimal, brutalist, corporate, playful)', required: false },
    { field: 'color_scheme', question: 'Brand colors or preferred palette?', required: false },
    { field: 'features', question: 'Key features? (e.g. contact form, blog, animations, dark mode)', required: false },
    { field: 'tech_stack', question: 'Tech preference? (e.g. React, Next.js, WordPress, Webflow)', required: false },
  ],
  code_generation: [
    { field: 'language', question: 'What programming language?', required: true },
    { field: 'task', question: 'Describe in detail what the code must do.', required: true },
    { field: 'io_format', question: 'Expected inputs and outputs?', required: true },
    { field: 'libraries', question: 'Any specific libraries or frameworks to use?', required: false },
    { field: 'constraints', question: 'Any constraints? (e.g. performance, pure functions, no deps)', required: false },
    { field: 'style', question: 'Code style? (e.g. OOP, functional, heavily commented)', required: false },
  ],
  text_llm_task: [
    { field: 'task_type', question: 'What kind of text task? (e.g. write, summarize, translate, rewrite)', required: true },
    { field: 'tone', question: 'What tone? (e.g. formal, casual, persuasive, empathetic)', required: true },
    { field: 'audience', question: 'Who is the target reader or audience?', required: true },
    { field: 'format', question: 'Output format? (e.g. bullet list, email, essay, report, social post)', required: false },
    { field: 'length', question: 'Target length or word count?', required: false },
    { field: 'context', question: 'Any background context or source material?', required: false },
  ],
};

const KEYWORDS = {
  image_generation: ['image', 'photo', 'picture', 'illustration', 'artwork', 'drawing', 'painting', 'render', 'midjourney', 'dalle', 'stable diffusion', 'portrait', 'landscape', 'anime', 'cartoon', 'logo', 'icon', 'wallpaper', 'scene', 'character', 'graphic', 'digital art', 'concept art', 'thumbnail', 'avatar', 'banner', 'poster'],
  website_building: ['website', 'web page', 'landing page', 'homepage', 'portfolio', 'blog', 'webflow', 'wordpress', 'shopify', 'ecommerce', 'online store', 'web app', 'frontend', 'html', 'css', 'react site', 'business site', 'personal site', 'saas', 'dashboard', 'redesign'],
  code_generation: ['code', 'function', 'script', 'program', 'algorithm', 'class', 'api', 'backend', 'implement', 'python', 'javascript', 'typescript', 'golang', 'rust', 'java', 'sql', 'query', 'endpoint', 'debug', 'refactor', 'unit test', 'component', 'module', 'cli', 'automation', 'bot', 'parser', 'hook'],
  text_llm_task: ['write', 'summarize', 'translate', 'analyze', 'review', 'explain', 'describe', 'email', 'essay', 'report', 'blog post', 'content', 'article', 'letter', 'rewrite', 'edit', 'improve', 'paraphrase', 'outline', 'story', 'caption', 'tweet', 'linkedin', 'marketing', 'copy', 'pitch', 'proposal', 'cover letter', 'speech'],
};

export function detectIntent(userInput) {
  const lower = userInput.toLowerCase();
  const scores = {};
  for (const [domain, kws] of Object.entries(KEYWORDS)) {
    scores[domain] = kws.filter(k => lower.includes(k)).length;
  }
  const [top, topScore] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = total > 0 ? Math.min(0.97, 0.55 + (topScore / (total + 1)) * 0.5) : 0.55;
  return { domain: top, confidence, detected_elements: KEYWORDS[top].filter(k => lower.includes(k)).slice(0, 5) };
}

export function extractInitialFields(userInput, domain) {
  const lower = userInput.toLowerCase();
  const ex = {};
  const langs = ['python', 'javascript', 'typescript', 'java', 'c++', 'c#', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin'];
  const lang = langs.find(l => lower.includes(l));
  if (lang) ex.language = lang;
  if (domain === 'image_generation') ex.subject = userInput;
  if (domain === 'code_generation') ex.task = userInput;
  if (domain === 'text_llm_task') ex.task_type = userInput;
  if (domain === 'website_building') ex.purpose = userInput;
  return ex;
}

const MAX_Q = 3;
export function genQuestions(domain, filled, asked) {
  return (SCHEMAS[domain] || [])
    .filter(f => !filled[f.field] && !asked.includes(f.field))
    .slice(0, MAX_Q)
    .map(f => ({ field: f.field, question: f.question }));
}

// ── Expert Prompt Builders ──────────────────────────────────────────────────

function buildUniversal(domain, filled, input) {
  const label = { image_generation: 'Image Generation', website_building: 'Website / UI Design', code_generation: 'Software Engineering', text_llm_task: 'Content Writing & Language' }[domain];
  const auto = {
    image_generation: 'High resolution, no watermarks, professional composition, rule of thirds, no text overlays unless specified.',
    website_building: 'Mobile-first. WCAG 2.1 AA accessible. SEO-optimized HTML. Core Web Vitals optimized. Cross-browser compatible.',
    code_generation: 'Clean code, SRP, descriptive naming, edge-case handling, no global mutations, testable functions.',
    text_llm_task: 'Grammatically correct, engaging, consistent voice, no filler, plagiarism-free, audience-appropriate.',
  }[domain];
  const fields = Object.entries(filled).filter(([, v]) => v).map(([k, v]) => `  • ${k.replace(/_/g, ' ').toUpperCase()}: ${v}`).join('\n');

  return `═══════════════════════════════════════════════
             UNIVERSAL STRUCTURED PROMPT
═══════════════════════════════════════════════

[TASK]
${input}

[DOMAIN]: ${label}

[CORE CONTEXT]
${filled.context || filled.purpose || filled.task || filled.subject || input}

[DETAILED REQUIREMENTS]
${fields || '  • (Use best judgment based on task description)'}

[AUTOMATIC BEST-PRACTICE CONSTRAINTS]
${auto}

[USER-DEFINED CONSTRAINTS]
${filled.constraints || filled.negative_elements || 'None specified beyond above.'}

[OUTPUT FORMAT]
${filled.format || filled.aspect_ratio || 'Standard best suited to domain.'}

[TONE & STYLE]
${filled.tone || filled.style || filled.design_style || 'Professional, polished, purpose-driven.'}

═══════════════════════════════════════════════
Paste into any AI tool for best results.
═══════════════════════════════════════════════`;
}

function buildChatGPT(domain, filled, input) {
  if (domain === 'text_llm_task') return `# Role
You are a world-class professional writer and content strategist with expertise in crafting ${filled.tone || 'professional'} content for ${filled.audience || 'a general audience'}.

# Task
${filled.task_type || 'Complete the following'}:

"${input}"

# Instructions
1. **Tone**: Maintain a consistent ${filled.tone || 'professional'} tone throughout. No deviations.
2. **Audience**: Every sentence should resonate with ${filled.audience || 'the target audience'}. Match their knowledge level.
3. **Format**: Deliver as ${filled.format || 'clear, well-structured prose'}. Use headers/bullets where appropriate.
4. **Length**: Target approximately ${filled.length || '300–500 words'}. Concise but thorough.
5. **Quality**: This must feel like expert copy — no clichés, no filler, no passive overuse.
6. **Do NOT** use "In conclusion", "In summary", or open with restating the task.

${filled.context ? `# Context\n${filled.context}` : ''}

# Output
Begin the final ${filled.format || 'content'} directly now. No prologue.`;

  if (domain === 'code_generation') return `# Role
You are a senior ${filled.language || 'software'} engineer. You write production-quality, clean, and well-documented code.

# Task
"${filled.task || input}"

# Specifications
- **Language**: ${filled.language || 'Choose the best fit'}
- **Input / Output**: ${filled.io_format || 'See task description'}
- **Libraries**: ${filled.libraries || 'Prefer standard lib; justify any external dep'}
- **Style**: ${filled.style || 'Clean, idiomatic, documented'}
- **Constraints**: ${filled.constraints || 'O(n log n) or better, no global state, pure functions where possible'}

# Deliverables
1. Complete runnable implementation (no pseudocode, no TODO stubs).
2. Inline comments on all non-obvious logic.
3. Usage example in a \`main\` / demo block.
4. Time & space complexity note.
5. List 3 edge cases and how they are handled.

Begin the implementation now.`;

  if (domain === 'website_building') return `# Role
You are a principal UX engineer and web architect with 10+ years of experience. You build conversion-optimized, accessible, beautiful web products.

# Brief
- **Goal**: ${filled.purpose || input}
- **Audience**: ${filled.target_audience || 'General users'}
- **Stack**: ${filled.tech_stack || 'React + Tailwind CSS'}
- **Style**: ${filled.design_style || 'Modern minimal'}
- **Colors**: ${filled.color_scheme || 'Derive from context; ensure AA contrast'}

# Pages
${(filled.pages_needed || 'Home, About, Contact').split(',').map(p => `- **${p.trim()}**: Full layout, components, content`).join('\n')}

# Features
${(filled.features || 'Responsive, contact form, smooth scroll, animations').split(',').map(f => `- ${f.trim()}`).join('\n')}

# Standards
- Lighthouse 90+ across all metrics.
- Keyboard accessible, all images with alt text.
- Mobile-first (320px → 1440px).
- Core Web Vitals: LCP < 2.5s, CLS < 0.1, FID < 100ms.

Provide complete file structure and all source code.`;

  return `# Role
You are an expert AI art director and image prompt engineer.

# Objective
Create an optimized generative image prompt for:
"${input}"

# Specifications
- Subject: ${filled.subject || input}
- Style: ${filled.style || 'photorealistic'}
- Mood: ${filled.mood || 'cinematic'}
- Lighting: ${filled.lighting || 'dramatic volumetric'}
- Palette: ${filled.color_palette || 'vibrant, saturated'}
- Format: ${filled.aspect_ratio || '16:9'}

# Output Required
1. A 150+ word positive prompt for DALL-E 3.
2. 10 negative keywords.
3. Recommended settings (CFG scale, steps, sampler).`;
}

function buildMidjourney(domain, filled, input) {
  if (domain !== 'image_generation') {
    const map = {
      website_building: `flat design, ${filled.design_style || 'minimal'} website UI, ${filled.color_scheme || 'clean palette'}, modern SaaS dashboard mockup, desktop view, ultra detailed, professional --ar 16:9 --v 6 --q 2`,
      code_generation: `developer workspace, ${filled.language || 'code'} on dark IDE, neon syntax highlighting, cinematic lighting, 4K professional --ar 16:9 --v 6`,
      text_llm_task: `editorial illustration, ${filled.tone || 'professional'} writing concept, clean minimalist design --ar 16:9 --v 6`,
    };
    return map[domain];
  }
  const parts = [
    filled.subject || input,
    filled.style || 'hyper detailed digital art',
    filled.mood || 'cinematic atmosphere',
    filled.lighting || 'dramatic volumetric lighting, god rays',
    filled.color_palette || 'rich vibrant saturated tones',
    'ultra detailed, 8K resolution, masterpiece quality, award-winning, sharp focus, intricate textures',
  ].filter(Boolean).join(', ');
  const neg = filled.negative_elements
    ? `--no ${filled.negative_elements}, blurry, watermark, text, deformed, ugly`
    : '--no blurry, low quality, watermark, text, artifacts, overexposed, noise';
  const ar = (filled.aspect_ratio || '16:9').replace(':', ':');
  return `${parts} --ar ${ar} --v 6.1 --style raw --stylize 750 --q 2 ${neg}`;
}

function buildWebflow(domain, filled, input) {
  if (domain !== 'website_building') {
    const map = {
      image_generation: `Landing page for AI image tool. Hero with sample outputs. Feature grid. CTA. Dark theme, ${filled.color_palette || 'vibrant accents'}.`,
      code_generation: `Developer tool landing page. Code preview panel for ${filled.language || 'multi-language'}. Features: syntax highlight, copy btn, live preview. Dark theme, monospace type.`,
      text_llm_task: `Content creation SaaS page. Writer-focused hero. Tone/audience selector. Output preview. Clean layout.`,
    };
    return map[domain] || `Professional ${domain} web presence. Clean, conversion-focused.`;
  }
  return `╔══════ WEBFLOW PROJECT BLUEPRINT ══════╗

PROJECT
  Name: ${filled.purpose || input}
  Audience: ${filled.target_audience || 'General'}
  Style: ${filled.design_style || 'Modern minimal'}
  Colors: ${filled.color_scheme || 'Derive from brand'}

PAGES
${(filled.pages_needed || 'Home, About, Contact').split(',').map((p, i) =>
    `  ${i + 1}. ${p.trim()}\n     - Full-width sections\n     - Scroll-triggered animations`).join('\n\n')}

COMPONENTS
  • Navbar: sticky, transparent-to-solid on scroll
  • Hero: full viewport, headline + CTA
  • Feature Grid: 3-col cards, hover lift
  • Testimonials: horizontal carousel
  • Footer: links + newsletter CTA

INTERACTIONS (Webflow)
  • Load: fade-in + slide-up (0.1s stagger)
  • Scroll: parallax hero bg (30% offset)
  • Hover: card lift 4px, shadow intensify
  • CTA: scale + color shift

FEATURES
${(filled.features || 'Responsive, contact form, smooth scroll').split(',').map(f => `  ✓ ${f.trim()}`).join('\n')}

TECH
  - CMS for dynamic content
  - Open Graph meta tags on every page
  - Core Web Vitals: LCP < 2.5s

╚════════════════════════════════════════╝`;
}

function buildCopilot(domain, filled, input) {
  if (domain !== 'code_generation') {
    const map = {
      image_generation: `// Generate image using AI\n// Subject: ${filled.subject || input}\n// Style: ${filled.style || 'photorealistic'}\n// Use: openai.images.generate() or replicate API\nasync function generateImage(prompt) {\n  // TODO: implement\n}`,
      website_building: `// Build ${filled.purpose || 'website'}\n// Pages: ${filled.pages_needed || 'Home, About, Contact'}\n// Stack: ${filled.tech_stack || 'React + Tailwind'}\nfunction App() {\n  return ( /* TODO: implement pages */ );\n}`,
      text_llm_task: `// Text processing pipeline\n// Task: ${filled.task_type || input}\n// Tone: ${filled.tone || 'professional'}\nasync function processText(input) {\n  // TODO: implement\n}`,
    };
    return map[domain] || `// TODO: ${input}`;
  }
  return `/**
 * @task    ${filled.task || input}
 * @lang    ${filled.language || 'JavaScript'}
 * @input   ${filled.io_format?.split('→')[0]?.trim() || 'See parameters'}
 * @output  ${filled.io_format?.split('→')[1]?.trim() || 'See return type'}
 * @libs    ${filled.libraries || 'Standard library'}
 * @style   ${filled.style || 'Clean, idiomatic, documented'}
 * @rules   ${filled.constraints || 'Pure functions, edge-case handling, SRP'}
 *
 * IMPLEMENTATION REQUIREMENTS:
 *  - Validate all params at entry point
 *  - Handle: null/undefined, empty input, boundary values (0, -1, MAX)
 *  - Descriptive names (no single-letter vars except loop indices)
 *  - JSDoc on all exported functions
 *  - Include 2+ usage examples in comments
 *  - Async error handling with try/catch and meaningful error messages
 *
 * EDGE CASES:
 *  1. Empty / null input → return sensible default or throw descriptive error
 *  2. Invalid type → throw TypeError with field name
 *  3. Boundary values → handle without off-by-one errors
 */

// TODO: Implement in ${filled.language || 'JavaScript'}
// ${filled.task || input}
//
// Example:
//   const result = myFunction(exampleInput);
//   console.log(result); // => expectedOutput`;
}

// ── Session ─────────────────────────────────────────────────────────────────
let _session = null;

export function engineAnalyze(userInput) {
  const intent = detectIntent(userInput);
  const { domain } = intent;
  const schema = SCHEMAS[domain] || [];
  const filled = extractInitialFields(userInput, domain);
  const required = schema.filter(f => f.required).map(f => f.field);
  const questions = genQuestions(domain, filled, []);
  const progress = required.length ? required.filter(f => filled[f]).length / required.length : 0;

  _session = {
    original_input: userInput, domain, filled_fields: filled,
    questions_asked: questions.map(q => q.field),
    round: 1, schema, required_fields: required,
  };

  return { session_id: 'local', domain, confidence: intent.confidence, detected_elements: intent.detected_elements, questions, progress };
}

export function engineClarify(answers) {
  if (!_session) throw new Error('No active session.');
  const { domain, filled_fields, questions_asked, round, required_fields, schema } = _session;
  const merged = { ...filled_fields, ...Object.fromEntries(Object.entries(answers).filter(([, v]) => v?.trim())) };
  const filledReq = required_fields.filter(f => merged[f]).length;
  const progress = required_fields.length ? filledReq / required_fields.length : 0;
  const done = required_fields.every(f => merged[f]) || round >= 3 || progress >= 0.85;

  _session = { ..._session, filled_fields: merged, round: round + 1 };

  if (done) return { session_id: 'local', questions: [], completed: true, progress: Math.min(progress, 1) };

  const next = genQuestions(domain, merged, questions_asked);
  _session.questions_asked = [...questions_asked, ...next.map(q => q.field)];

  return next.length
    ? { session_id: 'local', questions: next, completed: false, progress }
    : { session_id: 'local', questions: [], completed: true, progress: Math.min(progress, 1) };
}

export function engineGenerate() {
  if (!_session) throw new Error('No active session.');
  const { domain, filled_fields: f, original_input: inp } = _session;
  return {
    session_id: 'local', domain, filled_fields: f,
    universal_prompt: buildUniversal(domain, f, inp),
    chatgpt: buildChatGPT(domain, f, inp),
    midjourney: buildMidjourney(domain, f, inp),
    webflow: buildWebflow(domain, f, inp),
    copilot: buildCopilot(domain, f, inp),
  };
}
