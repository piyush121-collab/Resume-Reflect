import "dotenv/config";
import { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";

import { loadConfig, validateConfig } from "./config.js";
import { extractPdfText } from "./lib/pdf.js";
import { resetCallLog, getCallLog } from "./lib/openrouter.js";
import { buildCandidateProfile } from "./profile/profileBuilder.js";
import { getIndependentOpinion } from "./agents/baseAgent.js";
import { getAgentDefinitions } from "./agents/definitions.js";
import { runDebate } from "./debate/debateOrchestrator.js";
import { runPanelChair } from "./decision/panelChair.js";
import { renderReport } from "./report/reportRenderer.js";
import { synthesizeDebateAudio } from "./bonus/voiceDebate.js";
import { AgentOpinion } from "./types/schemas.js";

const program = new Command();
program
  .option("--candidate <letter>", "Candidate to process: A, B, or both", "both")
  .option("--data-dir <dir>", "Directory containing the source PDFs", "data")
  .option("--out-dir <dir>", "Directory to write outputs to", "outputs")
  .option("--rounds <n>", "Number of debate rounds", "2")
  .option("--voice", "Generate bonus TTS audio for the debate (requires edge-tts)", false)
  .option("--dry-run", "Validate PDFs and API key without making OpenRouter calls", false)
  .parse(process.argv);

const options = program.opts();
const config = loadConfig();

const PDF_FILENAMES: Record<"A" | "B", { resume: string; transcript: string }> = {
  A: { resume: "03_Resume_A.pdf", transcript: "05_Transcript_A.pdf" },
  B: { resume: "04_Resume_B.pdf", transcript: "06_Transcript_B.pdf" },
};

async function validatePdfExists(filePath: string, label: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runDryRun(dataDir: string, letters: Array<"A" | "B">) {
  console.log("=== Running Dry-Run Pre-Flight Check ===");
  validateConfig(config);
  console.log(`[+] OPENROUTER_API_KEY: SET`);

  const jdPath = path.join(dataDir, "02_Job_Description.pdf");
  const jdExists = await validatePdfExists(jdPath, "Job Description");
  console.log(`[+] Job Description PDF (${jdPath}): ${jdExists ? "FOUND & READABLE" : "MISSING"}`);

  let missingPdfs = 0;
  if (!jdExists) missingPdfs++;

  for (const letter of letters) {
    const resumePath = path.join(dataDir, PDF_FILENAMES[letter].resume);
    const transcriptPath = path.join(dataDir, PDF_FILENAMES[letter].transcript);
    const resumeExists = await validatePdfExists(resumePath, `Resume ${letter}`);
    const transcriptExists = await validatePdfExists(transcriptPath, `Transcript ${letter}`);

    console.log(`[+] Candidate ${letter} Resume PDF (${resumePath}): ${resumeExists ? "FOUND & READABLE" : "MISSING"}`);
    console.log(`[+] Candidate ${letter} Transcript PDF (${transcriptPath}): ${transcriptExists ? "FOUND & READABLE" : "MISSING"}`);

    if (!resumeExists) missingPdfs++;
    if (!transcriptExists) missingPdfs++;
  }

  console.log("\n--- Model Assignments ---");
  const agentDefs = getAgentDefinitions();
  for (const def of agentDefs) {
    console.log(`  - ${def.displayName}: ${def.model}`);
  }
  console.log(`  - Profile Builder: ${config.models.profileBuilder}`);
  console.log(`  - Panel Chair: ${config.models.chair}`);
  console.log(`  - Fallback Chain: ${config.fallbackModels.join(", ")}`);

  if (missingPdfs > 0) {
    console.error("\n[DRY-RUN RESULT: FAILED]");
    console.error(`  -> ${missingPdfs} required PDF file(s) missing in ${dataDir}/.`);
    process.exit(1);
  }

  console.log("\n[DRY-RUN RESULT: PASSED] All PDFs present and OPENROUTER_API_KEY set. Pipeline ready to execute.");
}

async function processCandidate(
  letter: "A" | "B",
  dataDir: string,
  outDir: string,
  rounds: number,
  voice: boolean
) {
  console.log(`\n=== Processing Candidate ${letter} ===`);
  resetCallLog();

  const candidateOutDir = path.join(outDir, `candidate_${letter}`);
  await fs.mkdir(candidateOutDir, { recursive: true });

  const jdPath = path.join(dataDir, "02_Job_Description.pdf");
  const resumePath = path.join(dataDir, PDF_FILENAMES[letter].resume);
  const transcriptPath = path.join(dataDir, PDF_FILENAMES[letter].transcript);

  if (!(await validatePdfExists(jdPath, "Job Description"))) {
    throw new Error(`Missing required PDF file: ${jdPath}. Drop it into ${dataDir}/.`);
  }
  if (!(await validatePdfExists(resumePath, `Resume ${letter}`))) {
    throw new Error(`Missing required PDF file: ${resumePath}. Drop it into ${dataDir}/.`);
  }
  if (!(await validatePdfExists(transcriptPath, `Transcript ${letter}`))) {
    throw new Error(`Missing required PDF file: ${transcriptPath}. Drop it into ${dataDir}/.`);
  }

  console.log("[1/5] Extracting PDF text...");
  const jobDescription = await extractPdfText(jdPath);
  const resume = await extractPdfText(resumePath);
  const transcript = await extractPdfText(transcriptPath);

  console.log("[2/5] Building candidate profile (shared fact base)...");
  const profile = await buildCandidateProfile({
    candidateId: letter,
    jobDescription,
    resume,
    transcript,
    model: config.models.profileBuilder,
  });
  await fs.writeFile(
    path.join(candidateOutDir, "profile.json"),
    JSON.stringify(profile, null, 2)
  );

  console.log("[3/5] Gathering 4 INDEPENDENT agent opinions (isolated LLM calls)...");
  const agentDefs = getAgentDefinitions();
  const independentOpinions: AgentOpinion[] = [];

  for (const def of agentDefs) {
    try {
      console.log(`  - ${def.displayName}  [model: ${def.model}]`);
      const opinion = await getIndependentOpinion({
        def,
        candidateId: letter,
        jobDescription,
        transcript,
        profile,
      });
      independentOpinions.push(opinion);
    } catch (err: any) {
      console.warn(`[WARN] Agent ${def.displayName} failed after all fallbacks: ${err.message}`);
    }
  }

  if (independentOpinions.length < 2) {
    throw new Error(`Insufficient agent opinions gathered (${independentOpinions.length}/4). Cannot proceed with debate.`);
  }

  await fs.writeFile(
    path.join(candidateOutDir, "independent_opinions.json"),
    JSON.stringify(independentOpinions, null, 2)
  );

  console.log(`[4/5] Running ${rounds}-round debate (agents now see each other's opinions)...`);
  const { turns, postDebateOpinions } = await runDebate({
    candidateId: letter,
    independentOpinions,
    rounds,
  });
  await fs.writeFile(
    path.join(candidateOutDir, "debate_transcript.json"),
    JSON.stringify(turns, null, 2)
  );

  if (voice) {
    console.log("[bonus] Synthesizing voice debate audio...");
    await synthesizeDebateAudio({ turns, outDir: candidateOutDir });
  }

  console.log("[5/5] Panel Chair reaching final decision (weighted reasoning, not averaging)...");
  const finalDecision = await runPanelChair({
    candidateId: letter,
    model: config.models.chair,
    independentOpinions,
    debateTurns: turns,
    postDebateOpinions,
  });
  await fs.writeFile(
    path.join(candidateOutDir, "final_decision.json"),
    JSON.stringify(finalDecision, null, 2)
  );

  const report = renderReport({
    candidateId: letter,
    profile,
    independentOpinions,
    debateTurns: turns,
    postDebateOpinions,
    finalDecision,
  });
  await fs.writeFile(path.join(candidateOutDir, "report.md"), report);

  await fs.writeFile(
    path.join(candidateOutDir, "run_manifest.json"),
    JSON.stringify(getCallLog(), null, 2)
  );

  console.log(`Done. Report: ${path.join(candidateOutDir, "report.md")}`);
}

async function main() {
  const rounds = parseInt(options.rounds, 10) || 2;
  const letters: Array<"A" | "B"> =
    options.candidate === "both" ? ["A", "B"] : [options.candidate as "A" | "B"];

  if (options.dryRun) {
    await runDryRun(options.dataDir, letters);
    return;
  }

  validateConfig(config);

  for (const letter of letters) {
    await processCandidate(letter, options.dataDir, options.outDir, rounds, options.voice);
  }

  console.log("\nAll candidates processed. See the outputs/ directory for full reports.");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n[ERROR] ${msg}`);
  process.exit(1);
});
