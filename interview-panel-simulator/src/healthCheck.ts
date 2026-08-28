import { loadConfig, validateConfig } from "./config.js";
import { extractJson, classifyOpenRouterError } from "./lib/openrouter.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

async function checkModel(apiKey: string, model: string, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/your-org/interview-panel-simulator",
        "X-Title": "Interview Panel Simulator Health Check",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: 'Return ONLY valid JSON matching {"ok": true}' },
          { role: "user", content: "Ping" },
        ],
        temperature: 0.1,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const latency = Date.now() - startTime;

    if (!res.ok) {
      const body = await res.text();
      const classified = classifyOpenRouterError(res.status, body);
      return { ok: false, status: `FAILED (HTTP ${res.status} / ${classified.category})`, latency };
    }

    const data: any = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed: any = extractJson(content);

    if (parsed && (parsed.ok === true || parsed.ok === "true")) {
      return { ok: true, status: "OK", latency };
    }
    return { ok: false, status: "FAILED (Invalid JSON response)", latency };
  } catch (err: any) {
    clearTimeout(timer);
    const latency = Date.now() - startTime;
    return { ok: false, status: `FAILED (${err.message || String(err)})`, latency };
  }
}

async function main() {
  console.log("=== OpenRouter Models Health Check ===");
  const config = loadConfig();
  validateConfig(config);

  const modelRoles: Array<{ role: string; model: string }> = [
    { role: "Profile Builder", model: config.models.profileBuilder },
    { role: "Technical Agent", model: config.models.technical },
    { role: "HR / Culture Agent", model: config.models.hrCulture },
    { role: "Hiring Manager", model: config.models.hiringManager },
    { role: "Skeptic Agent", model: config.models.skeptic },
    { role: "Panel Chair", model: config.models.chair },
    { role: "Comparator", model: config.models.comparator },
  ];

  for (const fbModel of config.fallbackModels) {
    if (!modelRoles.some((m) => m.model === fbModel)) {
      modelRoles.push({ role: "Fallback Model", model: fbModel });
    }
  }

  console.log("\nMODEL                                          ROLE                   STATUS");
  console.log("----------------------------------------------------------------------------------------------");

  let allPassed = true;

  for (const entry of modelRoles) {
    const result = await checkModel(config.openRouterApiKey, entry.model, 15000);
    const modelPadded = entry.model.padEnd(46, " ");
    const rolePadded = entry.role.padEnd(22, " ");
    const statusStr = result.ok
      ? `OK (${result.latency}ms)`
      : `${result.status} (${result.latency}ms)`;

    console.log(`${modelPadded} ${rolePadded} ${statusStr}`);
    if (!result.ok && entry.role !== "Fallback Model") {
      allPassed = false;
    }
  }

  console.log("----------------------------------------------------------------------------------------------");
  if (allPassed) {
    console.log("[HEALTH CHECK PASSED] All primary configured models are responsive.\n");
    process.exit(0);
  } else {
    console.warn("[HEALTH CHECK WARN] Some configured models failed. Model fallbacks will be used during pipeline execution.\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("[HEALTH CHECK ERROR]", err.message || err);
  process.exit(1);
});
