import "dotenv/config";
import fs from "node:fs/promises";
import { loadConfig, validateConfig } from "./config.js";
import { compareCandidates } from "./bonus/comparator.js";
import { FinalDecisionSchema } from "./types/schemas.js";

async function main() {
  const config = loadConfig();
  validateConfig(config);

  const pathA = "outputs/candidate_A/final_decision.json";
  const pathB = "outputs/candidate_B/final_decision.json";

  try {
    await fs.access(pathA);
    await fs.access(pathB);
  } catch {
    throw new Error(
      "Missing final decision output(s). Please run `npm run start -- --candidate both` first before running `npm run compare`."
    );
  }

  const rawA = JSON.parse(await fs.readFile(pathA, "utf-8"));
  const rawB = JSON.parse(await fs.readFile(pathB, "utf-8"));
  const decisionA = FinalDecisionSchema.parse(rawA);
  const decisionB = FinalDecisionSchema.parse(rawB);

  const result = await compareCandidates({
    model: config.models.comparator,
    decisionA,
    decisionB,
  });

  console.log(JSON.stringify(result, null, 2));
  await fs.writeFile("outputs/comparison.json", JSON.stringify(result, null, 2));
  console.log("\nSaved to outputs/comparison.json");
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`\n[ERROR] ${msg}`);
  process.exit(1);
});
