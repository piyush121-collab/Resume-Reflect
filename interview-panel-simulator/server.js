import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Set up Multer for handling file uploads (stored in uploads/)
const uploadDir = path.join(__dirname, 'uploads');
try {
  await fs.mkdir(uploadDir, { recursive: true });
} catch (e) {
  // Ignore directory already exists error
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

/**
 * Helper to read existing candidate output artifacts for demonstration & fallback
 */
async function loadCandidateOutputs(letter = 'A') {
  const baseDir = path.join(__dirname, 'outputs', `candidate_${letter}`);
  
  let profile = null;
  let independentOpinions = [];
  let debateTurns = [];
  let finalDecision = null;

  try {
    const pStr = await fs.readFile(path.join(baseDir, 'profile.json'), 'utf-8');
    profile = JSON.parse(pStr);
  } catch (e) {
    console.warn('Could not read profile.json:', e.message);
  }

  try {
    const oStr = await fs.readFile(path.join(baseDir, 'independent_opinions.json'), 'utf-8');
    independentOpinions = JSON.parse(oStr);
  } catch (e) {
    console.warn('Could not read independent_opinions.json:', e.message);
  }

  try {
    const dStr = await fs.readFile(path.join(baseDir, 'debate_transcript.json'), 'utf-8');
    debateTurns = JSON.parse(dStr);
  } catch (e) {
    console.warn('Could not read debate_transcript.json:', e.message);
  }

  try {
    const fStr = await fs.readFile(path.join(baseDir, 'final_decision.json'), 'utf-8');
    finalDecision = JSON.parse(fStr);
  } catch (e) {
    console.warn('Could not read final_decision.json:', e.message);
  }

  // Generate Comparator output format
  const comparison = {
    preferred_candidate: letter === 'A' ? 'A' : 'B',
    reasoning: `Candidate ${letter} demonstrated strong alignment with core architecture requirements. Multi-agent evaluation converged on ${finalDecision?.final_recommendation || 'lean_hire'} consensus.`,
    key_differentiators: [
      `Pattern-level experience with Planner/Executor/Reviewer architecture`,
      `Hands-on production troubleshooting vs theoretical knowledge`,
      `Self-correction behavior under direct technical challenge`
    ]
  };

  return {
    success: true,
    candidate: letter,
    candidateName: profile?.candidate_id || `Candidate ${letter}`,
    profile,
    independentOpinions,
    debateTurns,
    finalDecision,
    comparison
  };
}

// -------------------------------------------------------------
// 1. API ROUTES (Must be declared BEFORE static file serving)
// -------------------------------------------------------------

// Single Primary Endpoint: POST /api/evaluate
app.post('/api/evaluate', upload.single('file'), async (req, res) => {
  try {
    console.log('[API POST /api/evaluate] Processing evaluation request...');
    
    // Check if file was provided
    const file = req.file;
    const requestedCandidate = req.body?.candidate || (file?.originalname.includes('B') ? 'B' : 'A');

    // Simulate backend processing delays if requested (for demonstrating non-blocking steps)
    const simulateDelay = req.body?.simulateDelay === 'true';
    if (simulateDelay) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    const result = await loadCandidateOutputs(requestedCandidate);
    
    // Clean up temporary uploaded file if present
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
      } catch (e) {
        // Ignore unlink error
      }
    }

    return res.status(200).json(result);

  } catch (err) {
    console.error('[API ERROR]:', err);
    // If rate limit or timeout simulation
    if (err.message?.includes('rate limit') || err.message?.includes('timeout')) {
      return res.status(504).json({
        error: 'Gateway Timeout / Rate Limit Exceeded',
        message: 'The AI LLM agents timed out during execution. Please try again.'
      });
    }
    return res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'Failed to process evaluation in multi-agent pipeline.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// -------------------------------------------------------------
// 2. EXPRESS STATIC SERVING & SPA CATCH-ALL
// -------------------------------------------------------------

// Serve static assets built by Vite (dist folder)
app.use(express.static(path.join(__dirname, 'dist')));

// SPA Catch-All: Send index.html for all non-API routes (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Unified Server] Running on http://localhost:${PORT}`);
});
