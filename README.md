# Bolo: a voice co-pilot for parents who aren't digital natives

Built at Product (Un)Conference '26 Builders' Day, Bengaluru.

A parent presses one big **Ask** tab and says what they want in their own language (Kannada, Hindi, Tamil, Telugu or English; code-mixed speech is fine). Bolo reads the current screen, draws a glowing box and a pointing finger on **the one thing to tap next**, and says one short instruction out loud. After the parent taps, Bolo looks again and gives the next step. **Bolo never taps for them.**

## What's real and what's mocked

| Part | Status |
|---|---|
| Android phone (WhatsApp, Messages, Settings, UPI app) | **Mocked**: a web simulation |
| Screen understanding | Real. The accessibility tree is extracted from the simulated screen in the same shape as Android `AccessibilityNodeInfo` (text, content description, class, clickable, bounds) |
| Speech to text | Real: ElevenLabs Scribe |
| Reasoning (picks one next step, checks for scams) | Real: Claude (Anthropic API), or Nebius Token Factory (`nvidia/Nemotron-3.5-Super-VL`) |
| Vision fallback | Real. When the tree has unlabeled elements (for example a photo grid), a screenshot is sent with node ids drawn on it |
| Voice out | Real. ElevenLabs Flash v2.5 for Hindi, Tamil and English (fastest); Eleven v3 for Kannada and Telugu |
| Privacy redaction | Real. OTPs, phone numbers, card numbers and UPI IDs are replaced before anything leaves the device, and blacked out in screenshots |
| `FLAG_SECURE` banking screens | Real behaviour. The UPI PIN screen is marked secure, so nothing is captured or sent, and Bolo speaks a local safety line |

## Guardrails from the problem statement

- **Push to ask, not always on.** The mic records only while the tab is held, or between two taps.
- **Co-pilot, not autopilot.** No synthetic taps. The console shows a "taps by Bolo" count of 0.
- **Accessibility tree first, vision second.** A screenshot is sent only when labels are missing.
- **Safety first.** The model must judge scams before guiding anything, and it prefers safe options (for example "Clear cache", not "Clear storage").
- **Latency budget.** The console measures trigger release → highlight and trigger release → first audio against the 2.5 s target.

## Run locally

```bash
npm install
cp .env.example .env   # fill in keys
node --env-file=.env server.js
# open http://localhost:3000 (Chrome; allow the microphone)
```

## Environment variables

| Name | Required | Notes |
|---|---|---|
| `ELEVENLABS_API_KEY` | yes | Needs Text to Speech and Speech to Text access |
| `ELEVEN_VOICE_ID` | recommended | Choose a warm Indian voice from the Voice Library. Default is a stock voice |
| `ELEVEN_STT_MODEL` | no | Default `scribe_v2`; falls back to `scribe_v1` |
| `ANTHROPIC_API_KEY` | one of these two | Uses Claude through tool calling. Model: `CLAUDE_MODEL` (default `claude-haiku-5-5`) |
| `LLM_API_KEY` + `LLM_BASE_URL` + `LLM_MODEL` | one of these two | Any OpenAI-compatible endpoint, e.g. Nebius Token Factory. Use a vision-capable model so the photo-grid fallback works |

If both LLM options are set, Anthropic is used.

## Deploy on Replit

1. Import this GitHub repo into Replit (Node.js).
2. Add the variables above under **Secrets**. Never commit keys.
3. Run command: `npm start`. Deploy → Autoscale or Reserved VM.
4. Open the public URL on another device and check that the mic works (it needs HTTPS, which Replit provides).

## 3-minute demo script

1. **(20 s) Problem.** "My mother calls me 5 times a week to ask where to tap. She can't read English menus, and scam SMSes target her."
2. **(60 s) Cake photo, in Kannada.** Hold Ask and say *"ಮಗನಿಗೆ ಕೇಕ್ ಫೋಟೋ ಕಳಿಸಬೇಕು"*. Follow the highlights: chat → attach → Gallery → *the photo grid has no labels, so the console shows "tree + vision"* → cake photo → Send. Point at the latency bars.
3. **(40 s) Scam SMS.** Open the SBI KYC message and ask *"ಇದು ನಿಜಾನಾ?"*. A red warning appears and Bolo points at **Report spam**, not the link. Show that the phone number was redacted in "What Bolo sent".
4. **(30 s) Storage full.** Bolo guides to **Clear cache** and avoids "Clear storage", which would delete chats.
5. **(20 s) UPI PIN screen.** Bolo refuses to look and says the safety line. Nothing was sent.
6. **(10 s) What's mocked.** The phone is simulated. The next step is an Android AccessibilityService plus an overlay, as a sideloaded APK.

## Tools used

Nebius Token Factory (nvidia/Nemotron-3.5-Super-VL) for reasoning and vision, with Claude (Anthropic API) supported as an alternative; ElevenLabs (Scribe STT + TTS), Node.js + Express, html2canvas, Replit. Claude Code helped write the code.
