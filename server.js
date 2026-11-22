// Bolo co-pilot server: keeps API keys off the client and proxies three calls.
//   POST /api/stt    raw audio  -> ElevenLabs Scribe -> { text, language }
//   POST /api/think  screen tree (+ optional screenshot) -> Claude -> one guided step
//   POST /api/tts    { text, lang } -> ElevenLabs TTS -> audio/mpeg
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const VOICE_ID = process.env.ELEVEN_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const STT_MODEL = process.env.ELEVEN_STT_MODEL || "scribe_v2";
// Fallback brain: any OpenAI-compatible endpoint (e.g. Nebius Token Factory).
const LLM_API_KEY = process.env.LLM_API_KEY;
const LLM_BASE_URL = (process.env.LLM_BASE_URL || "https://api.tokenfactory.nebius.com/v1").replace(/\/$/, "");
const LLM_MODEL = process.env.LLM_MODEL || "Qwen/Qwen2.5-VL-72B-Instruct";
const PROVIDER = ANTHROPIC_API_KEY ? "anthropic" : LLM_API_KEY ? "openai-compatible" : null;

// Flash v2.5 is fastest (~75ms) but only covers some Indian languages.
// Everything else goes to Eleven v3, which covers Kannada, Telugu, etc.
const FLASH_LANGS = new Set(["en", "hi", "ta"]);
const LANG_NAMES = {
  kn: "Kannada", hi: "Hindi", ta: "Tamil", te: "Telugu", en: "simple Indian English",
};

app.use(express.static(path.join(__dirname, "public")));
app.get("/vendor/html2canvas.min.js", (_req, res) =>
  res.sendFile(path.join(__dirname, "node_modules/html2canvas/dist/html2canvas.min.js")));

app.get("/api/health", (_req, res) => {
  res.json({
    llm: Boolean(PROVIDER),
    provider: PROVIDER,
    elevenlabs: Boolean(ELEVEN_API_KEY),
    model: PROVIDER === "anthropic" ? CLAUDE_MODEL : LLM_MODEL,
    stt: STT_MODEL,
  });
});

// ---------- Speech to text (ElevenLabs Scribe) ----------
app.post("/api/stt", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  if (!ELEVEN_API_KEY) return res.status(500).json({ error: "ELEVENLABS_API_KEY not set" });
  const lang = String(req.query.lang || "");
  const mime = req.headers["content-type"] || "audio/webm";
  const t0 = Date.now();

  const send = async (model) => {
    const form = new FormData();
    form.append("model_id", model);
    if (lang && lang !== "auto") form.append("language_code", lang);
    form.append("tag_audio_events", "false");
    const ext = mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
    form.append("file", new Blob([req.body], { type: mime }), `ask.${ext}`);
    return fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": ELEVEN_API_KEY },
      body: form,
    });
  };

  try {
    let r = await send(STT_MODEL);
    if (!r.ok && STT_MODEL !== "scribe_v1") r = await send("scribe_v1"); // older plans / model ids
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: "stt_failed", detail: body });
    res.json({ text: (body.text || "").trim(), language: body.language_code, ms: Date.now() - t0 });
  } catch (e) {
    res.status(502).json({ error: "stt_failed", detail: String(e) });
  }
});

// ---------- Think (Claude) ----------
const STEP_TOOL = {
  name: "guide_step",
  description: "Return exactly ONE next step for the user on the current screen.",
  input_schema: {
    type: "object",
    properties: {
      screen_summary: { type: "string", description: "One short English line: what screen this is." },
      safety: {
        type: "object",
        properties: {
          level: { type: "string", enum: ["safe", "caution", "scam"] },
          reason: { type: "string", description: "Short English reason." },
        },
        required: ["level", "reason"],
      },
      action: { type: "string", enum: ["tap", "type", "scroll", "wait", "stop", "done", "unclear"] },
      target_id: { type: ["string", "null"], description: "Node id from the tree (e.g. n12) that the user should touch, or null." },
      say: { type: "string", description: "What to speak to the user, in the requested language and script. One instruction, max 18 words." },
      say_en: { type: "string", description: "English translation of say." },
      need_screenshot: { type: "boolean", description: "True only if the tree lacks the labels needed to pick a target (unlabeled icons, photos)." },
      goal_done: { type: "boolean" },
    },
    required: ["screen_summary", "safety", "action", "target_id", "say", "say_en", "need_screenshot", "goal_done"],
  },
};

function systemPrompt(lang) {
  const name = LANG_NAMES[lang] || "simple Indian English";
  return `You are "Bolo", a patient phone helper for an older Indian parent who is not comfortable with English or smartphones.
You see the current Android screen as an accessibility tree (and sometimes a screenshot with node ids drawn on it).
The parent has told you their goal in their own words (may be code-mixed like Kanglish/Hinglish).

Rules:
1. Give exactly ONE next step. Never list several steps.
2. Speak in ${name}, written in its native script. Keep app/button words that are printed on screen in English (e.g. "WhatsApp", "Send") but describe WHERE and WHAT COLOUR the thing is, because the parent may not read English. Example style: "Tap the green round button at the bottom right."
3. Be warm and calm, like a grown child helping a parent. Max 18 words. No technical words like "menu", "icon", "toggle", "cache" without a plain explanation.
4. You never tap for the user. target_id must be a node id that exists in the tree and is clickable. If nothing suitable, target_id null.
5. SAFETY FIRST. Before guiding anything on messages, SMS, links, pop-ups, payments or prizes, judge if it is a scam (fake KYC, account blocked, lottery, OTP requests, unknown links, urgency). If scam: safety.level "scam", tell them clearly not to tap the link and not to share OTP/PIN, and point target_id to the safe exit (Back / Delete / Block) if available.
6. Never point to destructive options (Clear storage / Clear data / Delete account / Uninstall / Reset / Factory) unless the goal explicitly needs it; prefer the safe option (e.g. "Clear cache" is safe, "Clear storage" deletes chats). If a destructive confirmation is on screen, warn and choose Cancel unless it is clearly what they want.
7. If the tree is missing labels needed to choose (e.g. unlabeled photos or icons) and no screenshot was given, set need_screenshot true, action "wait", target_id null, and say a short "one moment, let me look" line.
8. If the goal is already achieved on this screen, action "done", goal_done true, and say a short happy confirmation.
9. If the goal is unclear, action "unclear" and ask ONE short question back.
10. Values like [OTP], [PHONE], [CARD] were redacted for privacy. Never ask the user to read them out.
Always answer by calling the guide_step tool.`;
}

async function thinkAnthropic({ lang, text, screenshot }) {
  const content = [];
  if (screenshot) {
    const data = String(screenshot).replace(/^data:image\/\w+;base64,/, "");
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
    content.push({ type: "text", text: "Screenshot of the same screen. Yellow tags show node ids for clickable elements." });
  }
  content.push({ type: "text", text });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      system: systemPrompt(lang),
      tools: [STEP_TOOL],
      tool_choice: { type: "tool", name: "guide_step" },
      messages: [{ role: "user", content }],
    }),
  });
  const body = await r.json();
  if (!r.ok) throw { status: 502, detail: body };
  const step = (body.content || []).find((c) => c.type === "tool_use")?.input;
  if (!step) throw { status: 502, detail: body };
  return { step, model: body.model };
}

// OpenAI-compatible (Nebius Token Factory, etc.): JSON mode + schema in the prompt.
async function thinkOpenAI({ lang, text, screenshot }) {
  const sys = systemPrompt(lang).replace(
    "Always answer by calling the guide_step tool.",
    `Answer with ONLY a JSON object (no markdown) with exactly these keys:\n${JSON.stringify(STEP_TOOL.input_schema.properties)}`
  );
  const user = screenshot
    ? [
        { type: "image_url", image_url: { url: screenshot.startsWith("data:") ? screenshot : `data:image/jpeg;base64,${screenshot}` } },
        { type: "text", text: "Screenshot of the same screen. Yellow tags show node ids for clickable elements.\n\n" + text },
      ]
    : text;
  const call = (jsonMode) =>
    fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${LLM_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 500,
        temperature: 0.2,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      }),
    });
  let r = await call(true);
  if (!r.ok) r = await call(false); // some models reject response_format
  const body = await r.json();
  if (!r.ok) throw { status: 502, detail: body };
  const raw = body.choices?.[0]?.message?.content || "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw { status: 502, detail: { raw } };
  const step = JSON.parse(m[0]);
  step.safety ||= { level: "safe", reason: "" };
  step.target_id ??= null;
  return { step, model: body.model || LLM_MODEL };
}

app.post("/api/think", express.json({ limit: "8mb" }), async (req, res) => {
  if (!PROVIDER) return res.status(500).json({ error: "Set ANTHROPIC_API_KEY or LLM_API_KEY" });
  const { goal, lang = "kn", tree, history = [], screenshot } = req.body || {};
  const t0 = Date.now();
  const text = `Parent's goal (their words): "${goal}"
Steps already guided in this session (oldest first): ${history.length ? history.map((h, i) => `${i + 1}. ${h}`).join(" | ") : "none"}
Current screen accessibility tree (JSON; bounds are [x,y,w,h] on a 360x780 screen; "clickable" means it can be tapped; "color" is the background colour):
${JSON.stringify(tree)}`;
  try {
    const out = PROVIDER === "anthropic"
      ? await thinkAnthropic({ lang, text, screenshot })
      : await thinkOpenAI({ lang, text, screenshot });
    res.json({ ...out, provider: PROVIDER, ms: Date.now() - t0 });
  } catch (e) {
    res.status(e.status || 502).json({ error: "think_failed", detail: e.detail || String(e) });
  }
});

// ---------- Text to speech (ElevenLabs) ----------
app.post("/api/tts", express.json(), async (req, res) => {
  if (!ELEVEN_API_KEY) return res.status(500).json({ error: "ELEVENLABS_API_KEY not set" });
  const { text = "", lang = "kn" } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: "empty" });

  const call = (model, withLang) =>
    fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}${model === "eleven_v3" ? "" : "/stream"}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVEN_API_KEY, "content-type": "application/json", accept: "audio/mpeg" },
        body: JSON.stringify({
          text: text.slice(0, 600),
          model_id: model,
          ...(withLang ? { language_code: lang } : {}),
          voice_settings: { stability: 0.6, similarity_boost: 0.8, speed: 0.9 },
        }),
      }
    );

  try {
    const primary = FLASH_LANGS.has(lang) ? "eleven_flash_v2_5" : "eleven_v3";
    let model = primary;
    let r = await call(primary, primary === "eleven_flash_v2_5");
    if (!r.ok) {
      // Fallbacks: drop language_code, then try v3 / multilingual.
      for (const [m, wl] of [[primary, false], ["eleven_v3", false], ["eleven_multilingual_v2", false]]) {
        r = await call(m, wl);
        model = m;
        if (r.ok) break;
      }
    }
    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "tts_failed", detail });
    }
    res.setHeader("content-type", "audio/mpeg");
    res.setHeader("x-tts-model", model);
    const reader = r.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (e) {
    if (!res.headersSent) res.status(502).json({ error: "tts_failed", detail: String(e) });
    else res.end();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`Bolo co-pilot on http://localhost:${PORT}`));
