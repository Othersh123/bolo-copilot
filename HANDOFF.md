# Handoff: Bolo co-pilot (Builders' Day, submissions lock 5:00 PM IST)

## Context
- Problem statement: `../problem_statement_regional_voice_screen_co_pilot.md`. Event rules: `../builder-kit-2026.pdf`.
- This folder is the **source of truth** and has the latest code.
- Web simulation of an Android phone. Push-to-ask voice → ElevenLabs Scribe STT → Nebius LLM (`nvidia/Nemotron-3.5-Super-VL`, OpenAI-compatible, region `us-north1`) picks ONE next step → yellow highlight overlay + ElevenLabs TTS. The model never taps. Redaction, FLAG_SECURE screen, vision fallback (html2canvas) on the unlabeled photo grid.
- Tested end to end with a stand-in LLM only. **Not yet run against the real Nebius or ElevenLabs APIs.**

## Done
- [x] ElevenLabs API key (TTS + STT access)
- [x] Nebius API key; model chosen: `nvidia/Nemotron-3.5-Super-VL` (about 1 s in the playground)
- [x] GitHub repo: https://github.com/Othersh123/bolo-copilot

## Remaining (in order)
1. **Fix the GitHub repo.** It's missing the `public/` folder, and `server.js` there is an OLD copy (Qwen default, max_tokens 500). Push this folder's contents as they are. `.env` must never be committed (`.gitignore` covers it).
   - Git route: `git init` in this folder (or clone the repo), copy all files, commit, push to `main`. Then check the repo has `public/app.js`, `public/index.html`, `public/styles.css`, and `server.js` contains `us-north1` and `Nemotron`.
2. **Local smoke test** (optional, fast): `npm install`, then create `.env` with `ELEVENLABS_API_KEY` and `LLM_API_KEY` (Nebius), run `node --env-file=.env server.js`, and open http://localhost:3000 in Chrome.
   - Tap the Kannada "scam SMS" chip first (no mic, no vision). Check the console panel: highlight appears, voice plays, timings shown.
   - Then the "cake photo" chip (exercises the vision fallback on the gallery).
   - If `/api/think` returns 502, read the `detail` field. Likely issues: model rejects `response_format` (the code already retries without it), or reasoning text before the JSON (stripped already).
   - If Kannada TTS fails on `eleven_v3`, the server falls back to multilingual; set `ELEVEN_VOICE_ID` to an Indian voice from the Voice Library.
3. **Deploy on Replit** ($20 credit): import the GitHub repo (Node.js). Secrets: `ELEVENLABS_API_KEY`, `LLM_API_KEY`, and optionally `ELEVEN_VOICE_ID`. Do NOT set `ANTHROPIC_API_KEY` (it would take priority). Run command: `npm start`. Deploy (Autoscale), get the public URL.
4. **Test the public URL on another device/phone.** The mic needs HTTPS and permission. The page must not need a login (event rule).
5. **Mentor check-in 3:00–4:00 PM** in your zone: have the deployed URL open.
6. **Submit before 5:00 PM** at unconference.theproductfolks.com/speedrun/submit: project name "Bolo", GitHub link, demo link.
7. Record a short screen recording as a backup for the 3-minute demo (script in README).

## Secrets: never paste into code or chat
`ELEVENLABS_API_KEY`, `LLM_API_KEY` go only in `.env` (local) or Replit Secrets.
