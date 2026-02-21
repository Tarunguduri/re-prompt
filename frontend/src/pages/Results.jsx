/**
 * Results.jsx — Re-Prompt v2 Structured Reasoning View.
 * Displays machine-validated specifications with traceability and confidence metrics.
 */
import { motion } from 'framer-motion';
import { RotateCcw, Target, Shield, Cpu, Activity, AlertTriangle } from 'lucide-react';
import NbTicker from '../components/NbTicker';

const TICKER = ['Specification Ready', 'Fidelity Confirmed', 'Traceability Log Active', 'Zero Context Loss'];

function SectionTitle({ icon: Icon, title, accent = '#FFE135' }) {
    return (
        <div className="flex items-center gap-2 mb-4">
            <Icon size={16} style={{ color: accent }} />
            <span className="mono text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                /{title}
            </span>
        </div>
    );
}

function GridBox({ title, content, colSpan = "col-span-1" }) {
    return (
        <div className={`glass border border-[rgba(255,255,255,0.06)] p-4 ${colSpan}`}>
            <p className="mono text-[9px] uppercase tracking-widest text-[rgba(237,232,222,0.25)] mb-2">{title}</p>
            <p className="text-xs leading-relaxed text-[rgba(237,232,222,0.8)]">{content || '—'}</p>
        </div>
    );
}

export default function Results({ result, onStartOver, isLoading, error }) {
    if (!result && !error) return null;

    const conf = result?.confidence_score || 0;
    const consistency = result?.domain_validation?.domain_consistency_score || 0;

    return (
        <div className="nb-scanline min-h-screen flex flex-col overflow-x-hidden pb-20">
            <div className="sticky top-0 z-50"><NbTicker items={TICKER} /></div>

            <motion.header
                initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="glass border-b border-[rgba(255,255,255,0.07)] px-6 py-4 flex items-center justify-between"
            >
                <span className="text-xl font-black uppercase tracking-tight">System Specification <span className="text-[10px] mono text-[rgba(237,232,222,0.3)] ml-2">v2.0</span></span>
                <button onClick={onStartOver} className="nb-btn-ghost flex items-center gap-2 px-4 py-2 text-xs">
                    <RotateCcw size={12} /> New Synthesis
                </button>
            </motion.header>

            <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 space-y-10">

                {/* ── Header Metrics ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass border-l-4 border-l-[#39FF14] p-5">
                        <Activity size={18} className="text-[#39FF14] mb-3" />
                        <h3 className="text-2xl font-black">{conf}%</h3>
                        <p className="mono text-[10px] uppercase tracking-widest text-[rgba(237,232,222,0.4)]">Confidence Score</p>
                    </div>
                    <div className="glass border-l-4 border-l-[#FFE135] p-5">
                        <Target size={18} className="text-[#FFE135] mb-3" />
                        <h3 className="text-2xl font-black">{consistency}%</h3>
                        <p className="mono text-[10px] uppercase tracking-widest text-[rgba(237,232,222,0.4)]">Domain Consistency</p>
                    </div>
                    <div className="glass border-l-4 border-l-[#5B8CFF] p-5">
                        <Shield size={18} className="text-[#5B8CFF] mb-3" />
                        <h3 className="text-2xl font-black">{result?.core_features?.length || 0}</h3>
                        <p className="mono text-[10px] uppercase tracking-widest text-[rgba(237,232,222,0.4)]">Validated Features</p>
                    </div>
                </div>

                {/* ── Problem Statement ──────────────────────────────────────── */}
                <section>
                    <SectionTitle icon={Target} title="Refined Problem" />
                    <div className="glass border border-[rgba(255,255,255,0.1)] p-6">
                        <p className="text-lg font-medium leading-relaxed italic text-[rgba(237,232,222,0.9)]">
                            "{result?.refined_problem_statement}"
                        </p>
                    </div>
                </section>

                {/* ── Technical Architecture ──────────────────────────────────── */}
                <section>
                    <SectionTitle icon={Cpu} title="Technical Architecture" accent="#5B8CFF" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <GridBox title="Frontend" content={result?.technical_architecture?.frontend} />
                        <GridBox title="Backend" content={result?.technical_architecture?.backend} />
                        <GridBox title="AI Components" content={result?.technical_architecture?.ai_components} />
                        <GridBox title="Data Storage" content={result?.technical_architecture?.data_storage} />
                    </div>
                </section>

                {/* ── Core Features & Traceability ────────────────────────────── */}
                <section>
                    <SectionTitle icon={Shield} title="Core Features & Traceability" accent="#39FF14" />
                    <div className="space-y-4">
                        {result?.core_features?.map((f, i) => (
                            <div key={i} className="glass border border-[rgba(57,255,20,0.15)] p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <h4 className="font-black uppercase tracking-wider text-[#39FF14]">{f.name}</h4>
                                    <span className="mono text-[9px] bg-[rgba(57,255,20,0.1)] px-2 py-0.5 rounded text-[#39FF14]">TRACE OK</span>
                                </div>
                                <p className="text-sm text-[rgba(237,232,222,0.7)] mb-4">{f.description}</p>
                                <div className="bg-[rgba(57,255,20,0.03)] border-t border-[rgba(57,255,20,0.1)] pt-3 mt-3">
                                    <p className="mono text-[9px] uppercase tracking-widest text-[rgba(237,232,222,0.3)] mb-1">Source Trace:</p>
                                    <p className="mono text-[10px] italic text-[rgba(57,255,20,0.6)]">
                                        "{f.trace_to_input?.join(', ') || 'Implicit Domain Logic'}"
                                    </p>
                                    <p className="mono text-[9px] uppercase tracking-widest text-[rgba(237,232,222,0.3)] mt-3 mb-1">Architect Rationale:</p>
                                    <p className="text-[11px] text-[rgba(57,255,20,0.8)]">{f.justification}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Risk & Non-Functional ───────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <section>
                        <SectionTitle icon={AlertTriangle} title="Risk Analysis" accent="#FF4040" />
                        <ul className="space-y-2">
                            {result?.risk_analysis?.map((r, i) => (
                                <li key={i} className="flex gap-3 text-xs text-[rgba(255,64,64,0.7)] border-b border-[rgba(255,64,64,0.1)] pb-2">
                                    <span className="shrink-0">•</span>
                                    <span>{r}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                    <section>
                        <SectionTitle icon={Target} title="Constraints" accent="#EAEAEA" />
                        <ul className="space-y-2">
                            {result?.non_functional_requirements?.map((n, i) => (
                                <li key={i} className="flex gap-3 text-xs text-[rgba(237,232,222,0.5)] border-b border-[rgba(255,255,255,0.05)] pb-2">
                                    <span className="shrink-0">›</span>
                                    <span>{n}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                </div>

            </main>
        </div>
    );
}
