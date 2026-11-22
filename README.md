# Bolo: a voice co-pilot for parents who aren't digital natives

Built at Product (Un)Conference '26 Builders' Day, Bengaluru.

**Live demo:** https://bolo-copilot.replit.app (no login; use Chrome, allow the microphone)

A parent taps one big **Ask** tab and says what they want in their own language (Kannada, Hindi, Tamil, Telugu or English; code-mixed speech is fine). Bolo reads the current screen, draws a glowing box and a pointing finger on **the one thing to tap next**, and says one short instruction out loud. After the parent taps, Bolo looks again and gives the next step. **Bolo never taps for them.**

## Try it

- **No mic?** Pick a language and click one of the **Try asking** examples in the panel next to the phone: sending a cake photo, checking a scam SMS, clearing storage, or the bank PIN screen.
- **With your voice:** tap the yellow **Ask** tab on the phone and speak. While it listens, the tab turns red and the phone shows a timer and a **Stop** button. Tap either one when you're done (it also stops after 20 seconds). Holding the tab and letting go works too.
- Tap the highlighted element on the phone, and Bolo gives the next step.

## What's real and what's mocked

| Part | Status |
|---|---|
| Android phone (WhatsApp, Messages, Settings, UPI app) | **Mocked**: a web simulation |
| Screen understanding | Real. The accessibility tree is extracted from the simulated screen in the same shape as Android `AccessibilityNodeInfo` (text, content description, class, clickable, bounds) |
| Speech to text | Real: ElevenLabs Scribe |
| Reasoning (picks one next step, checks for scams) | Real: Nebius Token Factory, `nvidia/Nemotron-3.5-Super-VL` (the deployed demo). Claude through the Anthropic API also works |
| Vision fallback | Real. When the tree has unlabeled elements (for example a photo grid), a screenshot is sent with node ids drawn on it |
| Voice out | Real. ElevenLabs Flash v2.5 for Hindi, Tamil and English (fastest); Eleven v3 for Kannada and Telugu |
| Privacy redaction | Real. OTPs, phone numbers, card numbers and UPI IDs are replaced before anything leaves the device, and blacked out in screenshots |
| `FLAG_SECURE` banking screens | Real behaviour. The UPI PIN screen is marked secure, so nothing is captured or sent, and Bolo speaks a local safety line |

## Guardrails from the problem statement

- **Push to ask, not always on.** The mic records only between a tap to start and a tap to stop (or while the tab is held), and never for more than 20 seconds.
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
| `LLM_API_KEY` | yes (used by the live demo) | Any OpenAI-compatible endpoint. Defaults: `LLM_BASE_URL` = Nebius Token Factory (`us-north1`), `LLM_MODEL` = `nvidia/Nemotron-3.5-Super-VL`. Use a vision-capable model so the photo-grid fallback works |
| `ANTHROPIC_API_KEY` | no | Optional alternative to Nebius: uses Claude through tool calling (`CLAUDE_MODEL`, default `claude-haiku-5-5`). Not set in the live demo |

If `ANTHROPIC_API_KEY` is set, it takes priority over `LLM_API_KEY`, so leave it unset to use Nebius.

## Deploy on Replit

1. Import this GitHub repo into Replit (Node.js).
2. Add the variables above under **Secrets**. Never commit keys.
3. Run command: `npm start`. Deploy → Autoscale or Reserved VM.
4. Open the public URL on another device and check that the mic works (it needs HTTPS, which Replit provides).

## Tools used

Nebius Token Factory (nvidia/Nemotron-3.5-Super-VL) for reasoning and vision, with Claude (Anthropic API) supported as an alternative; ElevenLabs (Scribe STT + TTS), Node.js + Express, html2canvas, Replit. Claude Code helped write the code.
