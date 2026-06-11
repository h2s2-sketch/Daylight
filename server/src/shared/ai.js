/**
 * Shared AI client. Controlled by AI_MODE env var:
 *   mock      — realistic fake responses, no credentials needed (default)
 *   api_key   — Anthropic API via ANTHROPIC_API_KEY
 *   agent_sdk — Claude Agent SDK via user's subscription
 */

const MODELS = {
  autofill: "claude-haiku-4-5",
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const POS_OPTIONS = ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "idiom"];

function mockAutofill(word) {
  const pos = POS_OPTIONS[Math.floor(Math.random() * 4)]; // mostly noun/verb/adj/adv
  const cefr = CEFR_LEVELS[Math.floor(Math.random() * CEFR_LEVELS.length)];
  return {
    definition: `(mock) The quality or state of being ${word}; used to describe ${word}-related concepts in standard usage.`,
    translation_zh_tw: `${word}（模擬翻譯）`,
    ipa: `/${word.slice(0, 3)}ˈ${word.slice(-3) || word}/`,
    part_of_speech: pos,
    cefr,
    tags: [cefr.toLowerCase(), pos, "mock"],
    example_general: `The ${word} was clearly demonstrated during the presentation yesterday.`,
    example_civil_eng: `In structural analysis, ${word} plays a critical role when calculating load distribution.`,
  };
}

// ─── API key mode ─────────────────────────────────────────────────────────────

const AUTOFILL_SCHEMA = {
  type: "object",
  properties: {
    definition:       { type: "string" },
    translation_zh_tw:{ type: "string" },
    ipa:              { type: "string" },
    part_of_speech:   { type: "string" },
    cefr:             { type: "string" },
    tags:             { type: "array", items: { type: "string" } },
    example_general:  { type: "string" },
    example_civil_eng:{ type: "string" },
  },
  required: ["definition", "translation_zh_tw", "ipa", "part_of_speech", "cefr", "tags", "example_general", "example_civil_eng"],
  additionalProperties: false,
};

async function callAnthropicApi(word) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const prompt = buildAutofillPrompt(word);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS.autofill,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        format: {
          type: "json_schema",
          json_schema: { name: "autofill", schema: AUTOFILL_SCHEMA, strict: true },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return JSON.parse(data.content[0].text);
}

async function callAgentSdk(word) {
  // Dynamically import so the server starts fine without the SDK installed
  const { Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const prompt = buildAutofillPrompt(word);

  const msg = await client.messages.create({
    model: MODELS.autofill,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: {
        type: "json_schema",
        json_schema: { name: "autofill", schema: AUTOFILL_SCHEMA, strict: true },
      },
    },
  });

  return JSON.parse(msg.content[0].text);
}

function buildAutofillPrompt(word) {
  return `You are a language learning assistant. For the English word or phrase "${word}", return a JSON object with:
- definition: clear English definition (1-2 sentences)
- translation_zh_tw: Traditional Chinese translation
- ipa: IPA pronunciation (with slashes)
- part_of_speech: one of noun/verb/adjective/adverb/preposition/conjunction/phrasal verb/idiom
- cefr: CEFR level (A1/A2/B1/B2/C1/C2)
- tags: array of 2-4 relevant tags (include cefr level, part of speech, and topic)
- example_general: a natural example sentence in everyday context
- example_civil_eng: an example sentence in a civil engineering / construction context

Return only valid JSON matching the schema.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runTask(taskName, input) {
  if (taskName !== "autofill") throw new Error(`Unknown task: ${taskName}`);

  const mode = (process.env.AI_MODE || "mock").toLowerCase();

  if (mode === "mock") {
    // Simulate ~400ms latency
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
    return mockAutofill(input.word);
  }

  if (mode === "api_key") {
    return callAnthropicApi(input.word);
  }

  if (mode === "agent_sdk") {
    return callAgentSdk(input.word);
  }

  throw new Error(`Unknown AI_MODE: ${mode}. Use mock, api_key, or agent_sdk.`);
}
