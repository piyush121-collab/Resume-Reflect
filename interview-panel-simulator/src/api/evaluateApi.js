/**
 * API Utility for Interview Panel Simulator backend communications
 * Handles timeout management, non-blocking agent progress tracking, and error handling.
 */

export const AGENT_STEPS = [
  { id: 'ingest', name: 'PDF Ingestion', role: 'System Ingestion', duration: 3, description: 'Parsing PDF text and normalizing documents...' },
  { id: 'profile', name: 'Profile Builder', role: 'Fact Extraction', duration: 8, description: 'Extracting skills, claims, and resume vs JD gaps...' },
  { id: 'technical', name: 'Technical Agent', role: 'Domain Evaluator', duration: 10, description: 'Evaluating system architecture, code claims, and technical depth...' },
  { id: 'hr_culture', name: 'HR / Culture Agent', role: 'Culture Fit', duration: 10, description: 'Analyzing communication, team dynamics, and tenure history...' },
  { id: 'skeptic', name: 'Skeptic Agent', role: 'Red Flag Detector', duration: 12, description: 'Hunting for contradictions, exaggerations, and unverified claims...' },
  { id: 'hiring_manager', name: 'Hiring Manager Agent', role: 'Business Impact', duration: 10, description: 'Assessing role fit, execution trajectory, and ROI...' },
  { id: 'debate_chair', name: 'Panel Chair & Debate', role: 'Consensus Arbiter', duration: 15, description: 'Orchestrating multi-agent debate & reaching non-averaged verdict...' },
  { id: 'comparator', name: 'Comparator Agent', role: 'Head-to-Head Benchmarking', duration: 7, description: 'Synthesizing final comparison and differentiators...' }
];

/**
 * Sends PDF to POST /api/evaluate with progress simulation & error boundary guards
 * @param {File|null} file 
 * @param {Function} onProgress 
 * @param {string} candidateChoice 
 * @returns {Promise<Object>}
 */
export async function evaluateResume(file, onProgress = () => {}, candidateChoice = 'A') {
  const formData = new FormData();
  if (file) {
    formData.append('file', file);
  }
  formData.append('candidate', candidateChoice);

  // Setup non-blocking progress simulation timer (runs while backend 7-agent pipeline executes)
  let currentProgressIndex = 0;
  let progressPercent = 5;

  onProgress({
    stepIndex: 0,
    step: AGENT_STEPS[0],
    percentage: progressPercent,
    statusText: AGENT_STEPS[0].description
  });

  const progressInterval = setInterval(() => {
    if (currentProgressIndex < AGENT_STEPS.length - 1) {
      progressPercent += Math.floor(Math.random() * 6) + 3;
      if (progressPercent > (currentProgressIndex + 1) * (100 / AGENT_STEPS.length)) {
        currentProgressIndex++;
      }
      if (progressPercent > 95) progressPercent = 95;

      onProgress({
        stepIndex: currentProgressIndex,
        step: AGENT_STEPS[currentProgressIndex],
        percentage: progressPercent,
        statusText: AGENT_STEPS[currentProgressIndex].description
      });
    }
  }, 1200);

  // Client-side Controller with 120-second timeout to prevent premature timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch('/api/evaluate', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    clearInterval(progressInterval);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusCode = response.status;

      let errorMessage = 'An error occurred during evaluation.';
      if (statusCode === 500) {
        errorMessage = 'Backend Server Error (500): Multi-agent pipeline failed to finish LLM responses. Please try again.';
      } else if (statusCode === 502) {
        errorMessage = 'Bad Gateway (502): OpenRouter upstream API endpoint unreachable. Rate limit or quota exhausted.';
      } else if (statusCode === 504) {
        errorMessage = 'Gateway Timeout (504): The 7-agent LLM pipeline took too long to complete. Please retry.';
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }

      const errorObj = new Error(errorMessage);
      errorObj.statusCode = statusCode;
      throw errorObj;
    }

    // Complete progress
    onProgress({
      stepIndex: AGENT_STEPS.length - 1,
      step: AGENT_STEPS[AGENT_STEPS.length - 1],
      percentage: 100,
      statusText: 'Evaluation Complete!'
    });

    const data = await response.json();
    return data;

  } catch (err) {
    clearTimeout(timeoutId);
    clearInterval(progressInterval);

    if (err.name === 'AbortError') {
      const timeoutError = new Error('Client Request Timeout: Evaluation took longer than 120 seconds. Please retry.');
      timeoutError.statusCode = 504;
      throw timeoutError;
    }
    throw err;
  }
}
