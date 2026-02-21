/**
 * Clarify.jsx — Neo-Brutalism + Glass, cursor-reactive
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import NbTicker from '../components/NbTicker';

const DOMAIN_CFG = {
    website_building: { color: '#FFE135', label: 'Web Build', card: 'nb-card-y' },
    image_generation: { color: '#39FF14', label: 'Image Gen', card: 'nb-card-n' },
    text_llm_task: { color: 'rgba(237,232,222,0.9)', label: 'Text Task', card: 'nb-card' },
    code_generation: { color: '#5B8CFF', label: 'Code Gen', card: 'nb-card' },
};

function MagneticBtn({ children, className, onClick, disabled, type = 'button' }) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const sx = useSpring(x, { stiffness: 260, damping: 18 });
    const sy = useSpring(y, { stiffness: 260, damping: 18 });
    const onMove = (e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.28);
        y.set((e.clientY - r.top - r.height / 2) * 0.28);
    };
    const onLeave = () => { x.set(0); y.set(0); };
    return (
        <motion.button
            ref={ref} type={type} disabled={disabled}
            style={{ x: sx, y: sy }}
            onMouseMove={onMove} onMouseLeave={onLeave}
            onClick={onClick}
            className={className}
            data-hover
        >{children}</motion.button>
    );
}

const TICKER = ['Clarifying Intent', 'Gathering Context', 'Building Prompt', 'Almost Ready'];

export default function Clarify({ sessionData, questions, progress, round, onSubmitAnswers, onGenerate, isLoading, isCompleted, error }) {
    const [answers, setAnswers] = useState({});
    const domain = sessionData?.domain || 'text_llm_task';
    const cfg = DOMAIN_CFG[domain] || DOMAIN_CFG.text_llm_task;
    const pct = Math.round(progress * 100);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmitAnswers(answers);
        setAnswers({});
    };

    return (
        <div className="nb-scanline min-h-screen flex flex-col overflow-x-hidden">

            <div className="sticky top-0 z-50"><NbTicker items={TICKER} /></div>

            {/* Header */}
            <motion.header
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass border-b border-[rgba(255,255,255,0.07)] px-6 py-4 flex items-center justify-between"
            >
                <span className="text-xl font-black uppercase tracking-tight">Re:Promt</span>
                <div className="flex items-center gap-3">
                    <span
                        className="nb-tag px-3 py-1"
                        style={{ color: cfg.color, borderColor: cfg.color }}
                        data-hover
                    >
                        {cfg.label}
                    </span>
                    <span className="mono text-[10px] text-[rgba(237,232,222,0.3)] uppercase tracking-widest">
                        Round {round} / 3
                    </span>
                </div>
            </motion.header>

            {/* Progress bar */}
            <div className="h-[2px] bg-[rgba(255,255,255,0.05)]">
                <motion.div
                    className="h-full"
                    style={{ background: cfg.color }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                />
            </div>

            {/* Main */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-lg space-y-5">

                    <motion.h2
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-black uppercase tracking-tight leading-none"
                    >
                        Refine<br />
                        <span style={{ color: cfg.color }}>Your Prompt</span>
                    </motion.h2>

                    <AnimatePresence mode="wait">
                        {isCompleted ? (
                            <motion.div key="done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                <div
                                    className="glass border flex items-center gap-4 px-5 py-4"
                                    style={{ borderColor: cfg.color, boxShadow: `4px 4px 0 ${cfg.color}` }}
                                    data-hover
                                >
                                    <CheckCircle2 size={20} style={{ color: cfg.color }} className="shrink-0" />
                                    <div>
                                        <p className="font-black uppercase text-xs tracking-wider" style={{ color: cfg.color }}>
                                            Information Complete
                                        </p>
                                        <p className="mono text-[11px] text-[rgba(237,232,222,0.38)] mt-0.5">
                                            Ready to generate your expert prompts.
                                        </p>
                                    </div>
                                </div>
                                <MagneticBtn
                                    id="generate-btn"
                                    onClick={onGenerate}
                                    disabled={isLoading}
                                    className="nb-btn w-full py-4 flex items-center justify-center gap-2"
                                >
                                    {isLoading
                                        ? <><Loader2 size={15} className="animate-spin" /> Generating...</>
                                        : <><ArrowRight size={15} /> Generate Prompts</>
                                    }
                                </MagneticBtn>
                            </motion.div>
                        ) : (
                            <motion.form
                                key={`round-${round}`}
                                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
                                onSubmit={handleSubmit} className="space-y-4"
                            >
                                {isLoading && (!questions || questions.length === 0) ? (
                                    <div className="flex items-center justify-center gap-3 py-10">
                                        <Loader2 size={20} className="animate-spin" style={{ color: cfg.color }} />
                                        <span className="mono text-xs uppercase tracking-widest text-[rgba(237,232,222,0.4)]">Processing…</span>
                                    </div>
                                ) : (questions || []).map((q, i) => {
                                    const field = typeof q === 'object' ? q.field : `q${i}`;
                                    const questionText = typeof q === 'object' ? q.question : q;

                                    return (
                                        <motion.div
                                            key={field}
                                            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.07 }}
                                            className="glass border border-[rgba(255,255,255,0.09)] p-5 transition-all duration-200 hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.05)]"
                                            data-hover
                                        >
                                            <label className="block mono text-[10px] uppercase tracking-[0.2em] mb-3" style={{ color: cfg.color }}>
                                                /{field.replace(/_/g, '-')}
                                            </label>
                                            <p className="text-sm font-medium mb-4 leading-relaxed">{questionText}</p>
                                            <textarea
                                                id={`field-${field}`}
                                                value={answers[questionText] || ''}
                                                onChange={e => setAnswers(p => ({ ...p, [questionText]: e.target.value }))}
                                                placeholder="Your answer..."
                                                rows={3}
                                                className="nb-input w-full px-4 py-3 text-sm resize-none leading-relaxed"
                                            />
                                        </motion.div>
                                    );
                                })}

                                {questions.length > 0 && (
                                    <MagneticBtn
                                        type="submit"
                                        disabled={isLoading}
                                        className="nb-btn w-full py-3.5 flex items-center justify-center gap-2"
                                    >
                                        {isLoading
                                            ? <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                                            : <><ArrowRight size={15} /> Submit Answers</>
                                        }
                                    </MagneticBtn>
                                )}
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="border border-[#FF4040] bg-[rgba(255,64,64,0.07)] px-4 py-3 mono text-xs text-[#FF4040]"
                        >
                            ⚠ {error}
                        </motion.p>
                    )}

                    {sessionData?.detected_elements?.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span className="mono text-[9px] uppercase tracking-widest text-[rgba(237,232,222,0.2)] self-center">Detected:</span>
                            {sessionData.detected_elements.map((el, i) => (
                                <span
                                    key={i}
                                    className="nb-tag px-2.5 py-1 text-[rgba(237,232,222,0.3)]"
                                    style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                                    data-hover
                                >
                                    {el}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
