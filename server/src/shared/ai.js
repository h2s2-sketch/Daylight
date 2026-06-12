/** Shared AI boundary. Every provider mode and task model is configured here. */
const MODELS = {
  autofill_en: "claude-haiku-4-5",
  autofill_kr: "claude-haiku-4-5",
};

const AUTOFILL_SCHEMA = {
  type: "object",
  properties: {
    definition: { type: "string" },
    translation_zh_tw: { type: "string" },
    pronunciation: { type: "string" },
    part_of_speech: { type: "string" },
    level: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    example_general: { type: "string" },
    example_specialized: { type: "string" },
  },
  required: [
    "definition", "translation_zh_tw", "pronunciation", "part_of_speech",
    "level", "tags", "example_general", "example_specialized",
  ],
  additionalProperties: false,
};

function mockAutofill(taskName, word) {
  if (taskName === "autofill_kr") {
    return {
      definition: `(mock) Beginner Korean entry for ${word}.`,
      translation_zh_tw: `${word}\uff08\u6a21\u64ec\u7e41\u9ad4\u4e2d\u6587\u7ffb\u8b6f\uff09`,
      pronunciation: "romanization",
      part_of_speech: "word",
      level: "beginner",
      tags: ["beginner", "korean", "mock"],
      example_general: `${word}\uc694.`,
      example_specialized: `\uc624\ub298 ${word}\ub97c \ubc30\uc6cc\uc694.`,
    };
  }
  return {
    definition: `(mock) A clear English definition for ${word}.`,
    translation_zh_tw: `${word}\uff08\u6a21\u64ec\u7e41\u9ad4\u4e2d\u6587\u7ffb\u8b6f\uff09`,
    pronunciation: `/${word.slice(0, 3)}-${word.slice(-3) || word}/`,
    part_of_speech: "word",
    level: "B1",
    tags: ["b1", "general", "mock"],
    example_general: `The word ${word} appeared in today's discussion.`,
    example_specialized: `The engineer used ${word} in the site report.`,
  };
}

function buildPrompt(taskName, word) {
  if (taskName === "autofill_kr") {
    return `For the Korean word or short phrase "${word}", return JSON with a concise English definition, Traditional Chinese translation, Revised Romanization, part of speech, beginner level, 2-4 tags, a natural beginner Korean example, and a second simple Korean example. Keep Korean content appropriate for a beginner core deck.`;
  }
  return `For the English word or phrase "${word}", return JSON with a concise English definition, Traditional Chinese translation, IPA pronunciation, part of speech, CEFR level, 2-4 tags, a natural general example, and a civil-engineering or construction example.`;
}

async function callAnthropicApi(taskName, word) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODELS[taskName],
      max_tokens: 1024,
      messages: [{ role: "user", content: buildPrompt(taskName, word) }],
      output_config: {
        format: {
          type: "json_schema",
          json_schema: { name: taskName, schema: AUTOFILL_SCHEMA, strict: true },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.content[0].text);
}

async function callAgentSdk(taskName, word) {
  const { Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const msg = await client.messages.create({
    model: MODELS[taskName],
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(taskName, word) }],
    output_config: {
      format: {
        type: "json_schema",
        json_schema: { name: taskName, schema: AUTOFILL_SCHEMA, strict: true },
      },
    },
  });
  return JSON.parse(msg.content[0].text);
}

export async function runTask(taskName, input) {
  if (!MODELS[taskName]) throw new Error(`Unknown task: ${taskName}`);
  const mode = (process.env.AI_MODE || "mock").toLowerCase();
  if (mode === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 600));
    return mockAutofill(taskName, input.word);
  }
  if (mode === "api_key") return callAnthropicApi(taskName, input.word);
  if (mode === "agent_sdk") return callAgentSdk(taskName, input.word);
  throw new Error(`Unknown AI_MODE: ${mode}. Use mock, api_key, or agent_sdk.`);
}
