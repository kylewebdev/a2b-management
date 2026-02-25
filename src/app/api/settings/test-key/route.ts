import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";

const VALID_PROVIDERS = ["anthropic", "openai", "google"] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

async function testAnthropic(apiKey: string, model?: string): Promise<void> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });
  await client.messages.create({
    model: model ?? "claude-sonnet-4-20250514",
    max_tokens: 1,
    messages: [{ role: "user", content: "Hi" }],
  });
}

async function testOpenAI(apiKey: string, model?: string): Promise<void> {
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey });
  await client.chat.completions.create({
    model: model ?? "gpt-4o",
    max_tokens: 1,
    messages: [{ role: "user", content: "Hi" }],
  });
}

async function testGoogle(apiKey: string, model?: string): Promise<void> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const generativeModel = genAI.getGenerativeModel({ model: model ?? "gemini-2.0-flash" });
  await generativeModel.generateContent("Hi");
}

const TEST_FNS: Record<Provider, (apiKey: string, model?: string) => Promise<void>> = {
  anthropic: testAnthropic,
  openai: testOpenAI,
  google: testGoogle,
};

export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  let body: { provider?: string; apiKey?: string; model?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const { provider, apiKey, model } = body;

  if (!provider || !VALID_PROVIDERS.includes(provider as Provider)) {
    return jsonError("Invalid or missing provider", 400);
  }

  if (!apiKey) {
    return jsonError("Missing apiKey", 400);
  }

  try {
    await TEST_FNS[provider as Provider](apiKey, model);
    return jsonSuccess({ valid: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Key validation failed";
    return jsonSuccess({ valid: false, error: message });
  }
}
