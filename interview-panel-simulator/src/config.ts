import "dotenv/config";

export interface AppConfig {
  openRouterApiKey: string;
  models: {
    profileBuilder: string;
    technical: string;
    hrCulture: string;
    hiringManager: string;
    skeptic: string;
    chair: string;
    comparator: string;
  };
  fallbackModels: string[];
  maxRetries: number;
  timeoutMs: number;
  debugLlm: boolean;
}

const DEFAULT_FREE_MODEL = "inclusionai/ling-3.0-flash-fin:free";

export function loadConfig(): AppConfig {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const maxRetries = parseInt(process.env.LLM_MAX_RETRIES || "2", 10);
  const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || "60000", 10);

  const fallbackStr = process.env.LLM_FALLBACK_MODELS || "";
  const fallbackModels = fallbackStr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Default fallback models if none specified
  if (fallbackModels.length === 0) {
    fallbackModels.push("inclusionai/ling-3.0-flash-fin:free");
  }

  return {
    openRouterApiKey: apiKey,
    models: {
      profileBuilder: process.env.MODEL_PROFILE_BUILDER || DEFAULT_FREE_MODEL,
      technical: process.env.MODEL_TECHNICAL || DEFAULT_FREE_MODEL,
      hrCulture: process.env.MODEL_HR_CULTURE || DEFAULT_FREE_MODEL,
      hiringManager: process.env.MODEL_HIRING_MANAGER || DEFAULT_FREE_MODEL,
      skeptic: process.env.MODEL_SKEPTIC || DEFAULT_FREE_MODEL,
      chair: process.env.MODEL_CHAIR || DEFAULT_FREE_MODEL,
      comparator: process.env.MODEL_COMPARATOR || DEFAULT_FREE_MODEL,
    },
    fallbackModels,
    maxRetries: isNaN(maxRetries) || maxRetries < 0 ? 2 : maxRetries,
    timeoutMs: isNaN(timeoutMs) || timeoutMs < 1000 ? 60000 : timeoutMs,
    debugLlm: process.env.DEBUG_LLM === "true",
  };
}

export function validateConfig(config: AppConfig): void {
  if (!config.openRouterApiKey) {
    console.error("[CONFIG ERROR] OPENROUTER_API_KEY is missing. Copy .env.example to .env and fill in your key.");
    process.exit(1);
  }

  // Ensure no openrouter/free router slug is used
  const allModels = [
    ...Object.values(config.models),
    ...config.fallbackModels,
  ];

  for (const model of allModels) {
    if (model.trim() === "openrouter/free") {
      console.error("[CONFIG ERROR] 'openrouter/free' auto-router is prohibited. Pin specific free model slugs (e.g. provider/model:free) in .env.");
      process.exit(1);
    }
  }
}
