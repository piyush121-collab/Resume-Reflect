import { z } from "zod";
import { loadConfig } from "../config.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface CallLogEntry {
  agent: string;
  model: string;
  timestamp: string;
  sawOtherAgents: boolean;
  promptCharsApprox: number;
  attempt: number;
}

export let callLog: CallLogEntry[] = [];

export function resetCallLog() {
  callLog = [];
}

export function getCallLog(): CallLogEntry[] {
  return callLog;
}

export type ErrorCategory = "retryable" | "provider_failure" | "non_retryable";

export interface ClassifiedError {
  category: ErrorCategory;
  statusCode?: number;
  message: string;
  rawBody?: string;
}

export function classifyOpenRouterError(status: number, bodyText: string): ClassifiedError {
  const lowerBody = bodyText.toLowerCase();

  // 401 / 403: Invalid authentication / forbidden -> Non-retryable
  if (status === 401 || status === 403) {
    return {
      category: "non_retryable",
      statusCode: status,
      message: `Authentication / permission error (HTTP ${status}). Check OPENROUTER_API_KEY.`,
      rawBody: bodyText,
    };
  }

  // 404: Model or provider endpoint not found -> Provider Failure (triggers model fallback)
  if (status === 404) {
    return {
      category: "provider_failure",
      statusCode: status,
      message: `Model or provider unavailable (HTTP 404): ${bodyText}`,
      rawBody: bodyText,
    };
  }

  // Check body text for provider-level errors (even if returned as 400 or 500)
  if (
    lowerBody.includes("is not a valid model id") ||
    lowerBody.includes("unavailable for free") ||
    lowerBody.includes("temporarily rate-limited upstream") ||
    lowerBody.includes("provider returned error") ||
    lowerBody.includes("upstream_provider_shared_pool")
  ) {
    return {
      category: "provider_failure",
      statusCode: status,
      message: `Provider model error (HTTP ${status}): ${bodyText}`,
      rawBody: bodyText,
    };
  }

  // 429 / 500 / 502 / 503 / 504: Temporary rate limit or server error -> Retryable
  if (status === 429 || (status >= 500 && status <= 599)) {
    return {
      category: "retryable",
      statusCode: status,
      message: `Temporary server/rate-limit error (HTTP ${status}): ${bodyText}`,
      rawBody: bodyText,
    };
  }

  // 400 Bad Request: Usually invalid JSON payload or model error -> classify based on context
  if (status === 400) {
    return {
      category: "provider_failure",
      statusCode: status,
      message: `HTTP 400 Invalid Request or Model Error: ${bodyText}`,
      rawBody: bodyText,
    };
  }

  return {
    category: "retryable",
    statusCode: status,
    message: `HTTP ${status}: ${bodyText}`,
    rawBody: bodyText,
  };
}

async function rawCall(
  systemPrompt: string,
  userPrompt: string,
  model: string,
  timeoutMs: number
): Promise<string> {
  const config = loadConfig();
  const apiKey = config.openRouterApiKey;
  if (!apiKey) {
    throw new ClassifiedErrorImpl({
      category: "non_retryable",
      message: "OPENROUTER_API_KEY is missing. Copy .env.example to .env and fill in your key.",
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/your-org/interview-panel-simulator",
        "X-Title": "Interview Panel Simulator",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text();
      const classified = classifyOpenRouterError(res.status, body);
      throw new ClassifiedErrorImpl(classified);
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new ClassifiedErrorImpl({
        category: "retryable",
        message: `OpenRouter returned response with no content message: ${JSON.stringify(data)}`,
      });
    }

    return content as string;
  } catch (err: any) {
    clearTimeout(timer);
    if (err instanceof ClassifiedErrorImpl) {
      throw err;
    }
    if (err.name === "AbortError") {
      throw new ClassifiedErrorImpl({
        category: "retryable",
        message: `Request timed out after ${timeoutMs}ms`,
      });
    }
    throw new ClassifiedErrorImpl({
      category: "retryable",
      message: `Network error: ${err.message || String(err)}`,
    });
  }
}

class ClassifiedErrorImpl extends Error implements ClassifiedError {
  category: ErrorCategory;
  statusCode?: number;
  rawBody?: string;

  constructor(info: ClassifiedError) {
    super(info.message);
    this.name = "ClassifiedError";
    this.category = info.category;
    this.statusCode = info.statusCode;
    this.rawBody = info.rawBody;
  }
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const objStart = candidate.indexOf("{");
  const objEnd = candidate.lastIndexOf("}");
  const arrStart = candidate.indexOf("[");
  const arrEnd = candidate.lastIndexOf("]");

  let jsonStr: string;
  const objectComesFirst =
    objStart !== -1 && (arrStart === -1 || objStart < arrStart);

  if (objectComesFirst && objEnd !== -1) {
    jsonStr = candidate.slice(objStart, objEnd + 1);
  } else if (arrStart !== -1 && arrEnd !== -1) {
    jsonStr = candidate.slice(arrStart, arrEnd + 1);
  } else {
    jsonStr = candidate;
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    const sanitized = jsonStr.replace(/[\u0000-\u001F]+/g, (match) =>
      match === "\n" || match === "\r" || match === "\t" ? " " : ""
    );
    return JSON.parse(sanitized);
  }
}

function checkClaimQuality(claim: any): string | null {
  if (!claim || typeof claim !== "object") return null;
  if (
    typeof claim.claim === "string" &&
    typeof claim.evidence === "string" &&
    typeof claim.evidence_type === "string"
  ) {
    if (claim.evidence_type !== "absence_of_evidence") {
      const words = claim.evidence.trim().split(/\s+/).filter(Boolean);
      const hasQuotes = /["'“”`]/.test(claim.evidence);
      if (words.length < 8 && !hasQuotes) {
        return `Claim '${claim.claim}' has generic/non-specific evidence "${claim.evidence}" (${words.length} words, no quote marks). Non-absence evidence must carry explicit quote marks or be at least 8 words long with specific details.`;
      }
    }
  }
  return null;
}

function checkAllClaimsInObject(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const err = checkAllClaimsInObject(item);
      if (err) return err;
    }
  } else {
    const claimErr = checkClaimQuality(obj);
    if (claimErr) return claimErr;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "object" && obj[key] !== null) {
        const err = checkAllClaimsInObject(obj[key]);
        if (err) return err;
      }
    }
  }
  return null;
}

export async function callModelForJson<T>(opts: {
  agentName: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodType<T, z.ZodTypeDef, any>;
  sawOtherAgents: boolean;
  maxRetries?: number;
}): Promise<T> {
  const config = loadConfig();
  const { agentName, systemPrompt, schema, sawOtherAgents } = opts;
  const maxRetries = opts.maxRetries ?? config.maxRetries;
  const timeoutMs = config.timeoutMs;

  // Deduplicated fallback chain: primary model first, followed by config fallback models
  const modelChain = Array.from(
    new Set([opts.model, ...config.fallbackModels])
  ).filter(Boolean);

  let globalAttempt = 0;

  for (let mIdx = 0; mIdx < modelChain.length; mIdx++) {
    const currentModel = modelChain[mIdx];
    let currentPrompt = opts.userPrompt;
    let lastError = "";

    if (mIdx > 0) {
      console.log(
        `[LLM] fallback agent=${agentName} from=${modelChain[mIdx - 1]} to=${currentModel}`
      );
    }

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      globalAttempt++;
      callLog.push({
        agent: agentName,
        model: currentModel,
        timestamp: new Date().toISOString(),
        sawOtherAgents,
        promptCharsApprox: systemPrompt.length + currentPrompt.length,
        attempt,
      });

      console.log(
        `[LLM] agent=${agentName} model=${currentModel} attempt=${attempt + 1}/${maxRetries + 1}`
      );
      const startTime = Date.now();

      try {
        const raw = await rawCall(systemPrompt, currentPrompt, currentModel, timeoutMs);
        const latency = Date.now() - startTime;

        const parsed = extractJson(raw);
        const validated = schema.parse(parsed);

        const claimErr = checkAllClaimsInObject(validated);
        if (claimErr) {
          throw new Error(claimErr);
        }

        console.log(
          `[LLM] success agent=${agentName} model=${currentModel} latency=${latency}ms`
        );
        return validated;
      } catch (err: any) {
        const latency = Date.now() - startTime;

        if (err instanceof ClassifiedErrorImpl) {
          if (err.category === "non_retryable") {
            console.error(
              `[LLM] non_retryable_error agent=${agentName} model=${currentModel} error="${err.message}"`
            );
            throw err;
          }

          if (err.category === "provider_failure") {
            console.warn(
              `[LLM] provider_failure agent=${agentName} model=${currentModel} status=${err.statusCode || "N/A"}`
            );
            // Break loop for current model to advance to fallback model immediately
            break;
          }

          // Retryable error: backoff with jitter before next attempt on same model
          console.warn(
            `[LLM] retryable_error agent=${agentName} model=${currentModel} status=${err.statusCode || "N/A"} error="${err.message}"`
          );
          if (attempt < maxRetries) {
            const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            await new Promise((r) => setTimeout(r, backoffMs));
          }
          continue;
        }

        // Schema validation or evidence guardrail failure
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(
          `[LLM] schema_failure agent=${agentName} model=${currentModel} attempt=${attempt + 1}/${maxRetries + 1} error="${lastError}"`
        );

        if (attempt < maxRetries) {
          currentPrompt = `${opts.userPrompt}

Your previous response failed schema validation with this exact error:
${lastError}

Return ONLY valid JSON matching the required schema exactly.
Do NOT return markdown prose, commentary, or text outside the JSON object.
If a field requires an array of objects (like "claims"), EVERY item in the array MUST be a full JSON object with all required fields — NEVER return strings instead of objects!`;
        }
      }
    }
  }

  throw new Error(
    `[LLM] agent=${agentName} failed after trying all fallback models (${modelChain.join(", ")})`
  );
}
