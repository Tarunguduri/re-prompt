/**
 * engine.js — Bridge to the Re-Prompt v2 Reasoning Backend.
 * Replaces static client-side logic with real API calls.
 */

const API_ENDPOINT = '/analyze.php';

let _session = {
  text: '',
  answers: {},
  mode: 'clarify'
};

/**
 * Initiates the analysis of a user vision.
 */
export async function engineAnalyze(userInput) {
  _session = {
    text: userInput,
    answers: {},
    mode: 'clarify'
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'clarify', text: userInput })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Backend communication failed.');
  }

  const data = await response.json();
  return data;
}

/**
 * Submits clarification answers and requests the next step.
 */
export async function engineClarify(answers) {
  _session.answers = { ..._session.answers, ...answers };

  // Check if we have enough info to generate or if we should continue clarifying
  // For v2, we try to generate once answers are provided.
  return await engineGenerate();
}

/**
 * Generates the full v2 Specification.
 */
export async function engineGenerate() {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'generate',
      text: _session.text,
      answers: _session.answers
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Generation failed.');
  }

  const data = await response.json();
  return data;
}

/**
 * Resets the session state.
 */
export function engineReset() {
  _session = { text: '', answers: {}, mode: 'clarify' };
}
