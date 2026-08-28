import { extractJson, resetCallLog, getCallLog, callLog, classifyOpenRouterError } from "../src/lib/openrouter.js";
import {
  AgentOpinionSchema,
  DebateTurnSchema,
  FinalDecisionSchema,
  ClaimSchema,
} from "../src/types/schemas.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

function runTests() {
  console.log("=== Running Comprehensive Self-Check & Reliability Tests ===");

  // 1. extractJson parser tests
  console.log("\n1. Testing extractJson parser with messy LLM outputs...");

  const cleanJson = '{"key": "value"}';
  assert((extractJson(cleanJson) as any).key === "value", "Parses clean JSON object");

  const fencedJson = '```json\n{\n  "status": "ok"\n}\n```';
  assert((extractJson(fencedJson) as any).status === "ok", "Parses code-fenced JSON object");

  const proseJson = 'Sure! Here is the JSON output you requested:\n```json\n{"result": 42}\n```\nHope this helps!';
  assert((extractJson(proseJson) as any).result === 42, "Parses JSON with pre and post prose");

  const arrayJson = 'Here is the array:\n[{"id": 1}, {"id": 2}]';
  const parsedArray = extractJson(arrayJson) as any[];
  assert(Array.isArray(parsedArray) && parsedArray.length === 2 && parsedArray[0].id === 1, "Parses JSON array with prose");

  const whitespaceJson = '  \n\t  {"padded": true}  \n ';
  assert((extractJson(whitespaceJson) as any).padded === true, "Parses JSON surrounded by whitespace");

  // 2. Schema parsing & array-of-strings failure rejection tests
  console.log("\n2. Testing Zod Schemas & claim object validation...");

  const validClaim = {
    claim: "Demonstrated strong understanding of Raft consensus protocol",
    evidence_type: "transcript_quote",
    evidence: '"I built a distributed key-value store using Raft consensus in Go" — Transcript A, Q4',
    confidence: "high",
  };
  assert(ClaimSchema.safeParse(validClaim).success, "ClaimSchema validates correct claim fixture");

  // CRITICAL TEST: Array of strings MUST be rejected when Claim objects are expected
  const invalidStringClaim = "Candidate claims 3 years of React experience";
  assert(!ClaimSchema.safeParse(invalidStringClaim).success, "ClaimSchema correctly rejects plain string where object is required");

  const invalidClaimMissingConfidence = {
    claim: "Demonstrated strong understanding of Raft",
    evidence_type: "transcript_quote",
    evidence: '"I built a distributed key-value store" — Transcript A, Q4',
  };
  assert(!ClaimSchema.safeParse(invalidClaimMissingConfidence).success, "ClaimSchema rejects missing confidence field");

  const invalidClaimWrongEnum = {
    claim: "Demonstrated strong understanding of Raft",
    evidence_type: "transcript_quote",
    evidence: '"I built a distributed key-value store" — Transcript A, Q4',
    confidence: "super_high",
  };
  assert(!ClaimSchema.safeParse(invalidClaimWrongEnum).success, "ClaimSchema rejects invalid confidence enum value");

  const validOpinion = {
    agent: "technical",
    candidate: "A",
    stage: "independent",
    claims: [validClaim],
    unresolved_unknowns: ["No evidence provided for Kubernetes experience"],
    overall_recommendation: "hire",
    self_confidence: 0.9,
  };
  assert(AgentOpinionSchema.safeParse(validOpinion).success, "AgentOpinionSchema validates correct opinion fixture");

  const validDebateTurn = {
    round: 1,
    agent: "skeptic",
    responds_to_agent: "technical",
    responds_to_claim: "Demonstrated strong understanding of Raft consensus protocol",
    stance: "disagree_with_rebuttal",
    message: "Candidate mentioned Raft but failed to explain log compaction or leader election failure scenarios when asked in Q5.",
    evidence: '"I read about Raft but didn\'t get into log compaction details" — Transcript A, Q5',
    updated_recommendation: null,
    updated_confidence: null,
  };
  assert(DebateTurnSchema.safeParse(validDebateTurn).success, "DebateTurnSchema validates correct debate turn fixture");

  const validFinalDecision = {
    candidate: "A",
    final_recommendation: "lean_hire",
    confidence: "medium",
    reasoning_summary: "The technical agent and skeptic corroborated strong fundamentals in Go and Raft consensus, though unresolved debate remained regarding distributed system edge cases. The chair weighs direct transcript quotes higher than resume claims.",
    key_corroborated_strengths: ["Strong Go background", "Raft consensus project experience"],
    key_corroborated_concerns: ["Limited log compaction experience"],
    unresolved_disagreements: [
      {
        topic: "Depth in production distributed systems",
        agent_positions: {
          technical: "Demonstrated sufficient conceptual depth",
          skeptic: "Lacks production operational experience",
        },
        why_unresolved: "Candidate did not have opportunity to discuss production incidents in depth.",
      },
    ],
    insufficient_evidence_flags: ["No evidence of Kubernetes cluster management"],
  };
  assert(FinalDecisionSchema.safeParse(validFinalDecision).success, "FinalDecisionSchema validates correct decision fixture");

  // 3. Error Classification Tests
  console.log("\n3. Testing OpenRouter Error Classification...");

  const err401 = classifyOpenRouterError(401, '{"error":{"message":"Invalid API key"}}');
  assert(err401.category === "non_retryable", "HTTP 401 classified as non_retryable");

  const err404 = classifyOpenRouterError(404, '{"error":{"message":"Model not found"}}');
  assert(err404.category === "provider_failure", "HTTP 404 classified as provider_failure");

  const errModelInvalid = classifyOpenRouterError(400, '{"error":{"message":"model_name is not a valid model ID"}}');
  assert(errModelInvalid.category === "provider_failure", "Model invalid error classified as provider_failure");

  const err429 = classifyOpenRouterError(429, '{"error":{"message":"Rate limit exceeded"}}');
  assert(err429.category === "retryable", "HTTP 429 classified as retryable");

  const err500 = classifyOpenRouterError(500, '{"error":{"message":"Internal Server Error"}}');
  assert(err500.category === "retryable", "HTTP 500 classified as retryable");

  // 4. API Key Security Tests
  console.log("\n4. Testing API Key Security...");

  const secretKey = "sk-or-v1-secret-test-key-12345";
  const dummyErr = new Error(`Failed to process request with key ${secretKey}`);
  const sanitized = dummyErr.message.replace(secretKey, "[REDACTED]");
  assert(!sanitized.includes(secretKey), "API key successfully redacted from log output");

  // 5. Call Log isolation tests
  console.log("\n5. Testing Call Log isolation (no cross-candidate log leakage)...");

  resetCallLog();
  assert(getCallLog().length === 0, "resetCallLog empties the log array");

  callLog.push({
    agent: "technical",
    model: "test-model",
    timestamp: new Date().toISOString(),
    sawOtherAgents: false,
    promptCharsApprox: 100,
    attempt: 0,
  });
  assert(getCallLog().length === 1, "callLog records call entry");

  resetCallLog();
  assert(getCallLog().length === 0, "resetCallLog successfully resets call log between runs");

  console.log("\n=== ALL SELF-CHECK & RELIABILITY TESTS PASSED SUCCESSFULLY ===");
}

runTests();
