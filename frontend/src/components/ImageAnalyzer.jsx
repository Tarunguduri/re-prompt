/**
 * ImageAnalyzer.jsx — Drag & drop image → instant Canvas-based analysis
 * No model downloads, no API keys. Pure JS color/mood extraction.
 * States: idle | analyzing | done | error
 */
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Loader2, Sparkles, XCircle, X } from 'lucide-react';
import { analyzeImage } from '../services/vision';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export default function ImageAnalyzer({ onCaption }) {
    const [state, setState] = useState('idle');
    const [preview, setPreview] = useState(null);
    const [caption, setCaption] = useState('');
    const [errMsg, setErrMsg] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const processFile = useCallback(async (file) => {
        if (!file || !ACCEPTED.includes(file.type)) {
            setErrMsg('Please upload a JPG, PNG, WebP, or GIF.');
            setState('error');
            return;
        }
        setPreview(URL.createObjectURL(file));
        setState('analyzing');
        try {
            const result = await analyzeImage(file);
            setCaption(result);
            setState('done');
            onCaption?.(result);
        } catch (err) {
            console.error(err);
            setErrMsg(err.message || 'Analysis failed.');
            setState('error');
        }
    }, [onCaption]);

    const onDrop = useCallback((e) => {
        e.preventDefault(); setDragOver(false);
        processFile(e.dataTransfer.files[0]);
    }, [processFile]);

    const reset = () => {
        setState('idle'); setPreview(null); setCaption(''); setErrMsg('');
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">

                {/* Idle */}
                {state === 'idle' && (
                    <motion.div
                        key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={onDrop}
                        onClick={() => inputRef.current?.click()}
                        data-hover
                        className="flex flex-col items-center justify-center gap-3 py-6 px-4 border-[1.5px] border-dashed transition-all duration-200 cursor-none"
                        style={{
                            borderColor: dragOver ? 'rgba(255,225,53,0.7)' : 'rgba(255,255,255,0.12)',
                            background: dragOver ? 'rgba(255,225,53,0.04)' : 'rgba(255,255,255,0.02)',
                        }}
                    >
                        <div className="w-9 h-9 border flex items-center justify-center" style={{ borderColor: dragOver ? '#FFE135' : 'rgba(255,255,255,0.2)' }}>
                            <Image size={16} style={{ color: dragOver ? '#FFE135' : 'rgba(237,232,222,0.4)' }} />
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-[rgba(237,232,222,0.55)]">
                                Drop an image or <span className="text-[#FFE135] underline underline-offset-2">click to upload</span>
                            </p>
                            <p className="mono text-[10px] text-[rgba(237,232,222,0.22)] mt-1">JPG · PNG · WebP · GIF — extracts colors, mood & composition</p>
                        </div>
                        <input ref={inputRef} type="file" accept={ACCEPTED.join(',')} onChange={e => processFile(e.target.files[0])} className="hidden" />
                    </motion.div>
                )}

                {/* Analyzing (near instant, but shown briefly) */}
                {state === 'analyzing' && (
                    <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="glass border border-[rgba(255,255,255,0.09)] p-5">
                        <div className="flex gap-4 items-center">
                            {preview && <img src={preview} alt="" className="w-14 h-14 object-cover border border-[rgba(255,255,255,0.1)] shrink-0" />}
                            <div>
                                <div className="flex items-center gap-2">
                                    <Loader2 size={13} className="animate-spin" style={{ color: '#FFE135' }} />
                                    <p className="font-black text-xs uppercase tracking-wider text-[#FFE135]">Analyzing…</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Done */}
                {state === 'done' && (
                    <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="glass border border-[rgba(57,255,20,0.3)] p-4"
                        style={{ boxShadow: '4px 4px 0 rgba(57,255,20,0.2)' }}>
                        <div className="flex gap-3 items-start">
                            {preview && <img src={preview} alt="" className="w-12 h-12 object-cover border border-[rgba(255,255,255,0.1)] shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <Sparkles size={12} style={{ color: '#39FF14' }} />
                                    <span className="mono text-[10px] uppercase tracking-widest text-[#39FF14]">Analysis Complete</span>
                                </div>
                                <p className="text-[11px] text-[rgba(237,232,222,0.7)] leading-relaxed">{caption}</p>
                            </div>
                            <button onClick={reset} className="shrink-0 text-[rgba(237,232,222,0.3)] hover:text-[rgba(237,232,222,0.7)]" data-hover>
                                <X size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Error */}
                {state === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="glass border border-[rgba(255,64,64,0.4)] p-4 flex items-center gap-3"
                        style={{ boxShadow: '4px 4px 0 rgba(255,64,64,0.2)' }}>
                        <XCircle size={16} style={{ color: '#FF4040' }} className="shrink-0" />
                        <p className="mono text-[11px] text-[#FF4040] flex-1">{errMsg}</p>
                        <button onClick={reset} className="shrink-0 text-[rgba(237,232,222,0.3)] hover:text-[rgba(237,232,222,0.7)]" data-hover>
                            <X size={14} />
                        </button>
                    </motion.div>
                )}

            </AnimatePresence>
        </div>
    );
}
