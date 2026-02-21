/**
 * App.jsx — Root component using 100% client-side engine.
 * No backend, no API keys, no network calls.
 */
import { useState, useCallback } from 'react';
import Home from './pages/Home';
import Clarify from './pages/Clarify';
import Results from './pages/Results';
import { engineAnalyze, engineClarify, engineGenerate } from './services/engine';

const STEP = { HOME: 'home', CLARIFYING: 'clarifying', RESULTS: 'results' };

export default function App() {
  const [step, setStep] = useState(STEP.HOME);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [progress, setProgress] = useState(0);
  const [round, setRound] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState(null);

  // ── Step 1: Analyze input ─────────────────────────────────────────────────
  const handleSubmit = useCallback((userInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = engineAnalyze(userInput);
      setSessionData(data);
      setQuestions(data.questions || []);
      setProgress(data.progress || 0);
      setRound(1);
      setIsCompleted(data.questions?.length === 0);
      setStep(STEP.CLARIFYING);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Step 2: Submit clarification answers ──────────────────────────────────
  const handleSubmitAnswers = useCallback((answers) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = engineClarify(answers);
      setProgress(data.progress || 0);
      setRound(r => r + 1);
      if (data.completed) {
        setIsCompleted(true);
        setQuestions([]);
      } else {
        setQuestions(data.questions || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Step 3: Generate prompts ───────────────────────────────────────────────
  const handleGenerate = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setStep(STEP.RESULTS);
    try {
      const data = engineGenerate();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleStartOver = useCallback(() => {
    setStep(STEP.HOME);
    setSessionData(null);
    setQuestions([]);
    setProgress(0);
    setRound(1);
    setIsCompleted(false);
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      {step === STEP.HOME && (
        <Home onSubmit={handleSubmit} isLoading={isLoading} error={error} />
      )}
      {step === STEP.CLARIFYING && (
        <Clarify
          sessionData={sessionData}
          questions={questions}
          progress={progress}
          round={round}
          onSubmitAnswers={handleSubmitAnswers}
          onGenerate={handleGenerate}
          isLoading={isLoading}
          isCompleted={isCompleted}
          error={error}
        />
      )}
      {step === STEP.RESULTS && (
        <Results result={result} onStartOver={handleStartOver} isLoading={isLoading} error={error} />
      )}
    </div>
  );
}
