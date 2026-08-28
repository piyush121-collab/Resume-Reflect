import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import { DebateTurn, AgentKeyT } from "../types/schemas.js";

const execFileAsync = promisify(execFile);

const VOICE_MAP: Record<AgentKeyT, string> = {
  technical: "en-US-GuyNeural",
  hr_culture: "en-US-JennyNeural",
  hiring_manager: "en-US-DavisNeural",
  skeptic: "en-US-AriaNeural",
};

// Bonus feature ("integrating a voice debate session"). Requires the free
// `edge-tts` CLI on PATH: `pip install edge-tts`. If it isn't installed, this
// logs a warning and returns without throwing — it must never break the core
// pipeline, since this is explicitly a bonus.
export async function synthesizeDebateAudio(opts: {
  turns: DebateTurn[];
  outDir: string;
}): Promise<void> {
  const audioDir = path.join(opts.outDir, "audio");
  await fs.mkdir(audioDir, { recursive: true });

  for (let i = 0; i < opts.turns.length; i++) {
    const turn = opts.turns[i];
    const voice = VOICE_MAP[turn.agent] ?? "en-US-GuyNeural";
    const outFile = path.join(
      audioDir,
      `turn_${String(i).padStart(2, "0")}_${turn.agent}.mp3`
    );
    try {
      await execFileAsync("edge-tts", [
        "--voice",
        voice,
        "--text",
        turn.message,
        "--write-media",
        outFile,
      ]);
    } catch {
      console.warn(
        "[voice-debate] Skipped audio generation — 'edge-tts' not found on PATH. " +
          "Install it with: pip install edge-tts"
      );
      return;
    }
  }
  console.log(`[voice-debate] Audio saved to ${audioDir}`);
}
