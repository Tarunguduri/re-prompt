/**
 * Results.jsx — Neo-Brutalism + Glass
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { RotateCcw, Copy, Check, Loader2 } from 'lucide-react';
import NbTicker from '../components/NbTicker';

const TABS = [
    { key: 'universal_prompt', label: 'Universal', color: 'rgba(237,232,222,0.9)', border: 'rgba(255,255,255,0.5)' },
    { key: 'chatgpt', label: 'ChatGPT', color: '#FFE135', border: 'rgba(255,225,53,0.7)' },
    { key: 'midjourney', label: 'Midjourney', color: '#39FF14', border: 'rgba(57,255,20,0.6)' },
    { key: 'copilot', label: 'Copilot', color: '#5B8CFF', border: 'rgba(91,140,255,0.5)' },
    { key: 'webflow', label: 'Webflow', color: '#FF6B35', border: 'rgba(255,107,53,0.5)' },
];

const TICKER = ['Prompt Ready', 'Copy & Use', 'ChatGPT', 'Midjourney', 'Copilot', 'Webflow'];

function useMagnetic() {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 260, damping: 18 });
    const sy = useSpring(y, { stiffness: 260, damping: 18 });
    const handlers = {
        onMouseMove: (e) => {
            const r = ref.current.getBoundingClientRect();
            x.set((e.clientX - r.left - r.width / 2) * 0.28);
            y.set((e.clientY - r.top - r.height / 2) * 0.28);
        },
        onMouseLeave: () => { x.set(0); y.set(0); },
    };
    return { ref, sx, sy, handlers };
}

function CopyBtn({ text, color }) {
    const [copied, setCopied] = useState(false);
    const { ref, sx, sy, handlers } = useMagnetic();
    return (
        <motion.button
            ref={ref}
            style={{ x: sx, y: sy, color, borderColor: color, boxShadow: `3px 3px 0 ${color}` }}
            {...handlers}
            onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2e3); }}
            className="nb-btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
            data-hover
        >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
        </motion.button>
    );
}

export default function Results({ result, onStartOver, isLoading, error }) {
    const [active, setActive] = useState('universal_prompt');
    const tab = TABS.find(t => t.key === active);
    const content = result?.[active] || '';
    const { ref: soRef, sx: soX, sy: soY, handlers: soH } = useMagnetic();

    return (
        <div className="nb-scanline min-h-screen flex flex-col overflow-x-hidden">
            <div className="sticky top-0 z-50"><NbTicker items={TICKER} /></div>

            <motion.header
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="glass border-b border-[rgba(255,255,255,0.07)] px-6 py-4 flex items-center justify-between"
            >
                <span className="text-xl font-black uppercase tracking-tight">Re:Promt</span>
                <motion.button
                    ref={soRef} id="start-over-btn" onClick={onStartOver}
                    style={{ x: soX, y: soY }} {...soH}
                    className="nb-btn-ghost flex items-center gap-2 px-4 py-2 text-xs"
                    data-hover
                >
                    <RotateCcw size={12} /> Start Over
                </motion.button>
            </motion.header>

            <main className="flex-1 flex flex-col items-center justify-start px-4 py-10">
                <div className="w-full max-w-2xl space-y-5">

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center gap-5 py-20">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
                                className="w-14 h-14 border-[3px] border-[#FFE135] border-t-transparent"
                            />
                            <p className="mono text-xs uppercase tracking-[0.2em] text-[rgba(237,232,222,0.35)]">Generating prompts…</p>
                        </div>
                    )}

                    {error && !isLoading && (
                        <div className="border border-[#FF4040] bg-[rgba(255,64,64,0.07)] p-5" style={{ boxShadow: '4px 4px 0 #FF4040' }}>
                            <p className="font-black uppercase text-xs text-[#FF4040] mb-1">Generation Failed</p>
                            <p className="mono text-xs text-[rgba(255,64,64,0.7)]">{error}</p>
                        </div>
                    )}

                    {result && !isLoading && (
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                            {/* Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {TABS.map(t => (
                                    <motion.button
                                        key={t.key} id={`tab-${t.key}`} onClick={() => setActive(t.key)}
                                        whileTap={{ scale: 0.95 }} data-hover
                                        className="px-3.5 py-1.5 font-black uppercase text-[10px] tracking-[0.12em] border glass transition-all duration-150"
                                        style={active === t.key
                                            ? { background: t.color, color: '#080808', borderColor: '#080808', boxShadow: '3px 3px 0 #080808', transform: 'translate(-1px,-1px)' }
                                            : { color: t.color, borderColor: t.border, boxShadow: `2px 2px 0 ${t.border}` }}
                                    >
                                        {t.label}
                                    </motion.button>
                                ))}
                            </div>

                            {/* Panel */}
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={active}
                                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                    transition={{ duration: 0.18 }}
                                    className="glass border p-5"
                                    style={{ borderColor: tab.border, boxShadow: `5px 5px 0 ${tab.border}` }}
                                    data-hover
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="mono text-[10px] uppercase tracking-[0.2em]" style={{ color: tab.color }}>/{tab.label}</span>
                                        <CopyBtn text={content} color={tab.color} />
                                    </div>
                                    <pre className="mono text-xs text-[rgba(237,232,222,0.75)] whitespace-pre-wrap leading-relaxed max-h-[55vh] overflow-y-auto pr-1">
                                        {content || <span className="text-[rgba(237,232,222,0.2)] italic">No output for this platform.</span>}
                                    </pre>
                                </motion.div>
                            </AnimatePresence>

                            {/* Mini grid */}
                            <div className="border-t border-[rgba(255,255,255,0.06)] pt-5">
                                <p className="mono text-[9px] uppercase tracking-[0.2em] text-[rgba(237,232,222,0.2)] mb-3">All Platforms</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    {TABS.filter(t => t.key !== 'universal_prompt').map(t => (
                                        <motion.button
                                            key={t.key} onClick={() => setActive(t.key)}
                                            whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} data-hover
                                            className="glass border p-3 text-left"
                                            style={{ borderColor: t.border, boxShadow: `3px 3px 0 ${t.border}` }}
                                        >
                                            <p className="font-black text-[10px] uppercase tracking-wider" style={{ color: t.color }}>{t.label}</p>
                                            <p className="mono text-[9px] text-[rgba(237,232,222,0.25)] mt-1 truncate">
                                                {result[t.key]?.slice(0, 50) || '—'}
                                            </p>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                </div>
            </main>
        </div>
    );
}
