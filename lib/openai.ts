// Thin OpenAI wrapper. Uses the Chat Completions API with JSON output.
// If OPENAI_API_KEY is absent, callers fall back to the local heuristic.

const KEY = process.env.OPENAI_API_KEY || "";
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-sol";
export const openaiMode: "live" | "mock" = KEY ? "live" : "mock";

export async function chatJSON(
  system: string,
  user: string
): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!res.ok) {
    throw new Error(`OpenAI request failed (${res.status}).`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  if (data.usage) {
    console.info("OpenAI usage", {
      model: OPENAI_MODEL,
      inputTokens: data.usage.prompt_tokens,
      outputTokens: data.usage.completion_tokens,
      cachedTokens: data.usage.prompt_tokens_details?.cached_tokens || 0,
    });
  }
  return JSON.parse(content);
}
