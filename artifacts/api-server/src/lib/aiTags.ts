import { openai, CHAT_MODEL } from "./openai";

const PROMPT = `You suggest 1-5 short, lowercase tags for a CRM contact. Tags should be reusable categories (e.g. "founder", "investor", "designer", "ai", "fintech", "ex-google", "nyc"), not full sentences. Respond with strict JSON: { "tags": ["tag1", "tag2"] }. Skip the JSON keys if you can't infer anything: { "tags": [] }.`;

export async function suggestTags(input: {
  name: string;
  project?: string | null;
  company?: string | null;
  context?: string | null;
}): Promise<string[]> {
  const summary = [
    `Name: ${input.name}`,
    input.project ? `Project: ${input.project}` : null,
    input.company ? `Company: ${input.company}` : null,
    input.context ? `Context: ${input.context}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  if (!summary.trim()) return [];
  try {
    const completion = await openai.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: summary },
      ],
      response_format: { type: "json_object" },
    });
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    if (!Array.isArray(parsed.tags)) return [];
    return parsed.tags
      .map((t: unknown) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
      .filter((t: string) => t && t.length <= 32)
      .slice(0, 5);
  } catch {
    return [];
  }
}
