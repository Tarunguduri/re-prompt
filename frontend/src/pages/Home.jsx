/**
 * Home.jsx — Neo-Brutalism + Glassmorphism + Full cursor interaction
 */
import { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowRight, Loader2, Target, Zap, Layers } from 'lucide-react';
import Scene from '../components/canvas/Scene';
import NbTicker from '../components/NbTicker';
import ImageAnalyzer from '../components/ImageAnalyzer';

/* Magnetic button — follows cursor on hover */
function MagneticBtn({ children, className, ...props }) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 280, damping: 18 });
    const sy = useSpring(y, { stiffness: 280, damping: 18 });

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.28);
        y.set((e.clientY - r.top - r.height / 2) * 0.28);
    };
    const onLeave = () => { x.set(0); y.set(0); };

    return (
        <motion.button
            ref={ref}
            style={{ x: sx, y: sy }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={className}
            {...props}
        >
            {children}
        </motion.button>
    );
}

/* Card with tilt on hover */
function TiltCard({ children, className, style }) {
    const ref = useRef(null);
    const rx = useMotionValue(0);
    const ry = useMotionValue(0);
    const srx = useSpring(rx, { stiffness: 200, damping: 20 });
    const sry = useSpring(ry, { stiffness: 200, damping: 20 });

    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        rx.set(-py * 10);
        ry.set(px * 10);
    };
    const onLeave = () => { rx.set(0); ry.set(0); };

    return (
        <motion.div
            ref={ref}
            style={{ rotateX: srx, rotateY: sry, transformStyle: 'preserve-3d', ...style }}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={className}
        >
            {children}
        </motion.div>
    );
}

const FEATURES = [
    { icon: Target, title: 'Intent Detection', desc: 'Keyword engine instantly classifies your idea into the right creative domain.', card: 'nb-card-y', accent: '#FFE135' },
    { icon: Zap, title: 'Smart Questions', desc: "Targeted clarification — only asks what's genuinely missing from your idea.", card: 'nb-card-n', accent: '#39FF14' },
    { icon: Layers, title: 'Multi Platform', desc: 'Outputs precision-crafted for ChatGPT, Midjourney, Webflow & Copilot.', card: 'nb-card', accent: 'rgba(237,232,222,0.9)' },
];

const TICKER = ['Prompt Engineering', 'ChatGPT', 'Midjourney', 'Webflow', 'Copilot', '100% Private', 'No Login', 'Instant'];

export default function Home({ onSubmit, isLoading, error }) {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) onSubmit(input.trim());
    };

    return (
        <div className="nb-scanline min-h-screen overflow-x-hidden relative flex flex-col">

            {/* 3D BG */}
            <Scene className="fixed inset-0 z-0 w-full h-full" />

            {/* Ticker */}
            <div className="fixed top-0 inset-x-0 z-50">
                <NbTicker items={TICKER} />
            </div>

            {/* ── Hero ────────────────────────────────────────────────────────── */}
            <section className="relative z-10 flex-1 flex flex-col items-center justify-center pt-12 pb-8 px-4">

                {/* Glass pill */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 flex items-center gap-2 glass px-4 py-2 rounded-none"
                    data-hover
                >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#39FF14] animate-nb-blink" />
                    <span className="mono text-[10px] tracking-[0.2em] uppercase text-[rgba(237,232,222,0.55)]">
                        Prompt Engineering Engine
                    </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                    className="nb-glitch text-[clamp(3.5rem,10vw,7rem)] font-black uppercase text-center leading-none tracking-tighter mb-3"
                    data-text="RE:PROMT"
                >
                    RE:PROMT
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mono text-[11px] text-center uppercase tracking-[0.18em] text-[rgba(237,232,222,0.38)] mb-2"
                >
                    Vague idea → Expert AI prompt
                </motion.p>

                <motion.div
                    initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="w-16 h-[2px] bg-[#FFE135] mb-10 origin-center"
                />

                {/* Glass input form */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    onSubmit={handleSubmit}
                    className="w-full max-w-lg space-y-3"
                >
                    <textarea
                        id="main-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
                        placeholder="Describe what you want to build, create, or generate..."
                        rows={4}
                        className="nb-input w-full px-4 py-3 text-sm resize-none leading-relaxed"
                    />

                    {/* Image upload divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
                        <span className="mono text-[10px] uppercase tracking-[0.2em] text-[rgba(237,232,222,0.2)]">or analyze image</span>
                        <div className="flex-1 h-px bg-[rgba(255,255,255,0.07)]" />
                    </div>

                    <ImageAnalyzer onCaption={(cap) => setInput(cap)} />

                    <MagneticBtn
                        id="submit-btn"
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="nb-btn w-full py-3.5 flex items-center justify-center gap-2"
                    >
                        {isLoading
                            ? <><Loader2 size={15} className="animate-spin" /> Processing...</>
                            : <><ArrowRight size={15} /> Craft My Prompt</>
                        }
                    </MagneticBtn>
                </motion.form>

                {/* Error */}
                {error && (
                    <motion.p
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="mt-4 w-full max-w-lg border border-[#FF4040] bg-[rgba(255,64,64,0.07)] px-4 py-3 mono text-xs text-[#FF4040]"
                    >
                        ⚠ {error}
                    </motion.p>
                )}
            </section>

            {/* ── Features ────────────────────────────────────────────────────── */}
            <section className="relative z-10 px-4 pb-16">
                <div className="max-w-2xl mx-auto">
                    <div className="border-t border-[rgba(255,255,255,0.07)] pt-10 mb-6">
                        <span className="mono text-[9px] uppercase tracking-[0.25em] text-[rgba(237,232,222,0.22)]">
                            Core capabilities
                        </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <motion.div
                                    key={f.title}
                                    initial={{ opacity: 0, y: 24 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-30px' }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <TiltCard
                                        className={`${f.card} p-5 h-full`}
                                        data-hover
                                    >
                                        <div
                                            className="w-8 h-8 border flex items-center justify-center mb-4 transition-transform duration-200 group-hover:rotate-6"
                                            style={{ borderColor: f.accent }}
                                        >
                                            <Icon size={15} style={{ color: f.accent }} />
                                        </div>
                                        <h3 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: f.accent }}>
                                            {f.title}
                                        </h3>
                                        <p className="mono text-[11px] text-[rgba(237,232,222,0.38)] leading-relaxed">{f.desc}</p>
                                    </TiltCard>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

        </div>
    );
}
