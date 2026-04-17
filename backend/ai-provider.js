/**
 * ai-provider.js
 * Abstracts Gemini and Ollama behind a single interface.
 * Routes to Ollama if AI_PROVIDER=ollama, else defaults to Gemini.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

const PROVIDER = process.env.AI_PROVIDER || "gemini";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";

// ─── Gemini Helpers ──────────────────────────────────────────────────────────

async function geminiComplete(prompt, apiKey, systemInstruction) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    ...(systemInstruction ? { systemInstruction } : {}),
  });
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

async function geminiChat(messages, systemInstruction, apiKey) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  // Convert OpenAI-style messages to Gemini history format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const lastMsg = messages[messages.length - 1].content;

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMsg);
  return result.response.text().trim();
}

// ─── Ollama Helpers ──────────────────────────────────────────────────────────

async function ollamaComplete(prompt, system) {
  const body = {
    model: OLLAMA_MODEL,
    prompt: system ? `${system}\n\n${prompt}` : prompt,
    stream: false,
  };
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.response.trim();
}

async function ollamaChat(messages, system) {
  const ollamaMessages = [
    ...(system ? [{ role: "system", content: system }] : []),
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages: ollamaMessages, stream: false }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json();
  return data.message.content.trim();
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Score the emotional mood of a journal entry.
 * @param {string} text - The journal entry text
 * @param {string} apiKey - Gemini API key (ignored for Ollama)
 * @returns {{ score: number, label: string }}
 */
async function scoreMood(text, apiKey) {
  const prompt = `Score the emotional mood of this journal entry on a scale of 1-10 (1=very negative/distressed, 5=neutral, 10=very positive/joyful). Also give a one-word label. Respond ONLY in JSON like: {"score":7,"label":"hopeful"}\n\nEntry: "${text}"`;
  const system = "You analyze the emotional tone of journal entries. Respond only with valid JSON, nothing else.";

  try {
    let raw;
    if (PROVIDER === "ollama") {
      raw = await ollamaComplete(prompt, system);
    } else {
      raw = await geminiComplete(prompt, apiKey, system);
    }
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("scoreMood failed:", e.message);
    return null;
  }
}

/**
 * Generate an AI chat reply grounded in the user's journal entries.
 * @param {Array<{role:string, content:string}>} messages - Chat history
 * @param {string} journalContext - Stringified journal entries
 * @param {string} apiKey - Gemini API key (ignored for Ollama)
 * @returns {string} AI reply
 */
async function chat(messages, journalContext, apiKey) {
  const system = `You are a deeply personal AI companion for "My Inner Archive."
Your only knowledge comes from the user's journal entries below. Never reference outside quotes or generic advice.

JOURNAL ENTRIES (newest first):
${journalContext}

Guidelines:
- When the user shares a feeling, find matching entries from the past — cite the exact date and their own words.
- Notice patterns in context/activity. Surface them gently (e.g. "You seem to think most clearly when walking").
- Use **bold** for key phrases and dates. Keep responses concise and personal.
- Be warm, grounded entirely in their words. Never make things up.`;

  if (PROVIDER === "ollama") {
    return ollamaChat(messages, system);
  } else {
    return geminiChat(messages, system, apiKey);
  }
}

module.exports = { scoreMood, chat };
