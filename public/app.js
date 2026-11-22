{
// ================= Simulated phone =================
const $ = (s, r = document) => r.querySelector(s);
// Debug trail: everything that happens in this tab, copyable from the panel ("Copy full log").
const TRAIL = [], T0 = performance.now();
function trail(ev, data = {}) {
  TRAIL.push({ t: ((performance.now() - T0) / 1000).toFixed(2) + "s", ev, ...data });
  if (TRAIL.length > 400) TRAIL.shift();
}
window.addEventListener("error", (e) => trail("js_error", { msg: e.message, at: `${e.filename}:${e.lineno}` }));
window.addEventListener("unhandledrejection", (e) => trail("js_error", { msg: String(e.reason?.message || e.reason) }));
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const area = $("#screenArea");
const W = 360, H = 780;
let stack = ["home"];
let selectedPhoto = null;
const cur = () => stack[stack.length - 1];

const PHOTOS = {
  temple: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F7A24B"/><circle cx="78" cy="22" r="10" fill="#FFE29A"/><path d="M50 18l14 30H36z" fill="#B5531C"/><rect x="30" y="48" width="40" height="34" fill="#C8682B"/><rect x="45" y="62" width="10" height="20" fill="#5A2410"/><rect y="82" width="100" height="18" fill="#8B5A2B"/></svg>`,
  flowers: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#4E8F3A"/><g fill="#F2C12E"><circle cx="25" cy="35" r="9"/><circle cx="62" cy="28" r="11"/><circle cx="45" cy="65" r="10"/><circle cx="80" cy="70" r="8"/></g><g fill="#E8562A"><circle cx="25" cy="35" r="4"/><circle cx="62" cy="28" r="5"/><circle cx="45" cy="65" r="4"/><circle cx="80" cy="70" r="3"/></g></svg>`,
  cake: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#F8C8DC"/><rect x="22" y="50" width="56" height="32" rx="4" fill="#7B3F22"/><rect x="22" y="50" width="56" height="9" fill="#FFF3E6"/><path d="M22 59q7 6 14 0t14 0 14 0 14 0" fill="#FFF3E6"/><g fill="#5AA9E6"><rect x="34" y="34" width="4" height="16"/><rect x="48" y="32" width="4" height="18"/><rect x="62" y="34" width="4" height="16"/></g><g fill="#FFB000"><ellipse cx="36" cy="30" rx="3" ry="5"/><ellipse cx="50" cy="28" rx="3" ry="5"/><ellipse cx="64" cy="30" rx="3" ry="5"/></g><rect x="14" y="82" width="72" height="5" rx="2" fill="#ddd"/></svg>`,
  sunset: `<svg viewBox="0 0 100 100"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A2C6B"/><stop offset=".6" stop-color="#F06B4B"/></linearGradient></defs><rect width="100" height="100" fill="url(#sg)"/><circle cx="50" cy="62" r="14" fill="#FFD27A"/><rect y="64" width="100" height="36" fill="#1F4E79"/></svg>`,
  dosa: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#3D7A57"/><circle cx="50" cy="52" r="38" fill="#F4F4F4"/><path d="M18 60Q50 20 84 44L60 70z" fill="#D99A3D"/><circle cx="30" cy="74" r="7" fill="#F5F0E1"/><circle cx="46" cy="80" r="6" fill="#E98A3B"/></svg>`,
  dog: `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#9CC9E8"/><rect y="70" width="100" height="30" fill="#6FAF54"/><ellipse cx="50" cy="66" rx="22" ry="14" fill="#C08A4E"/><circle cx="66" cy="48" r="12" fill="#C08A4E"/><ellipse cx="74" cy="44" rx="4" ry="8" fill="#7A4E26"/><circle cx="70" cy="47" r="2" fill="#111"/></svg>`,
};
$("#photoGrid").innerHTML = Object.entries(PHOTOS).map(([k, svg]) => `<button data-photo="${k}">${svg}</button>`).join("");

function show(name) {
  $$(".screen").forEach((s) => s.classList.toggle("on", s.dataset.screen === name));
  $$(".modal.open").forEach((m) => m.classList.remove("open"));
  const dark = ["home", "wa_preview", "pay_pin"].includes(name);
  $(".statusbar").style.color = dark ? "#fff" : "#111";
  if (name === "pay_home") $(".statusbar").style.color = "#fff";
}
function go(target) {
  if (target === "back") { if ($(".screen.on .modal.open")) { $(".screen.on .modal.open").classList.remove("open"); return; } if (stack.length > 1) stack.pop(); }
  else if (target === "home") stack = ["home"];
  else stack.push(target);
  show(cur());
}
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("on"), 2200); }

const ACTS = {
  openAttach: () => $("#attachSheet").classList.add("open"),
  closeModal: () => $$(".modal.open").forEach((m) => m.classList.remove("open")),
  sendPhoto: () => {
    const b = document.createElement("div");
    b.className = "bub out"; b.innerHTML = `${PHOTOS[selectedPhoto] || ""}<span class="tick">2:16 pm ✓✓</span>`;
    $("#waMsgs").appendChild(b);
    stack = ["home", "wa_list", "wa_chat"]; show("wa_chat");
    $("#waMsgs").scrollTop = 1e6;
    lastEvent = { kind: "sent", what: `photo:${selectedPhoto}` };
  },
  scamLink: () => toast("Opening sbi-kyc-verify.co.in …"),
  deleteSms: () => { toast("Conversation deleted"); go("back"); },
  reportSpam: () => { toast("Reported as spam and blocked"); go("back"); },
  askClearStorage: () => $("#dataDialog").classList.add("open"),
  wipeData: () => { toast("All WhatsApp data deleted"); $$(".modal.open").forEach((m) => m.classList.remove("open")); },
  clearCache: () => { $("#cacheSize").textContent = "0 B"; $("#totSize").textContent = "12.0 GB"; toast("Cache cleared · 2.2 GB freed"); },
};

area.addEventListener("click", (e) => {
  const el = e.target.closest("button,a,[data-go],[data-act]");
  if (!el || !area.contains(el)) return;
  e.preventDefault();
  if (!el.matches("a,[data-go],[data-act],[data-photo]")) { trail("tap_dead", { screen: cur(), label: labelOf(el) }); toast("Not part of this demo phone"); return; }
  const label = labelOf(el) || "(unlabeled)";
  trail("tap", { screen: cur(), label, highlighted: !!$("#spot.on") && el.dataset.nid === lastTarget });
  clearOverlay();
  if (el.dataset.photo) { selectedPhoto = el.dataset.photo; $("#pvImg").innerHTML = PHOTOS[selectedPhoto]; go("wa_preview"); }
  else if (el.dataset.act) ACTS[el.dataset.act]?.();
  else if (el.dataset.go) go(el.dataset.go);
  userTapped(label, el);
});

const tick = () => {
  const d = new Date();
  const t = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[ap]m/i, "");
  $("#clock").textContent = t; $("#homeClock").textContent = t;
  $("#homeDate").textContent = d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
};
tick(); setInterval(tick, 30000);
show("home");

// ================= Perception: accessibility tree =================
function labelOf(el) {
  const aria = el.getAttribute("aria-label");
  if (aria) return aria;
  return (el.innerText || "").replace(/\s+/g, " ").trim();
}
function colorName(css) {
  const m = css.match(/\d+(\.\d+)?/g); if (!m) return null;
  const [r, g, b, a = 1] = m.map(Number); if (a < 0.2) return null;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx - mn < 24) return l > 225 ? "white" : l < 50 ? "black" : "grey";
  let h; const d = mx - mn;
  if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (l > 215) return "light " + (h < 50 ? "yellow" : h < 170 ? "green" : h < 260 ? "blue" : "purple");
  return h < 15 || h >= 345 ? "red" : h < 40 ? "orange" : h < 65 ? "yellow" : h < 170 ? "green" : h < 200 ? "teal" : h < 255 ? "blue" : h < 300 ? "purple" : "pink";
}
function where(x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  const v = cy < H * 0.33 ? "top" : cy > H * 0.66 ? "bottom" : "middle";
  const hz = cx < W * 0.33 ? "left" : cx > W * 0.66 ? "right" : "center";
  return `${v}-${hz}`;
}

// Redaction runs BEFORE anything leaves the device.
const RX = [
  [/\b(?:\d[ -]?){13,19}\b/g, "[CARD]"],
  [/(?:\+91[\s-]?)?\b[6-9]\d{4}\s?\d{5}\b/g, "[PHONE]"],
  [/\b[\w.-]+@(?:ok\w+|ybl|paytm|upi|axl|ibl|sbi)\b/gi, "[UPI_ID]"],
];
function redact(s) {
  let n = 0;
  if (/\b(otp|one time|verification code|code is|pin)\b/i.test(s)) s = s.replace(/\b\d{4,8}\b/g, () => (n++, "[OTP]"));
  for (const [re, tag] of RX) s = s.replace(re, () => (n++, tag));
  return { s, n };
}

let nodeMap = new Map();
function captureTree() {
  const screen = $(".screen.on");
  const modal = $(".modal.open", screen);
  const roots = modal ? [$(".sheet,.dialog", modal), $(".navbar")] : [screen, $(".navbar")];
  const ar = area.getBoundingClientRect(), k = ar.width / W;
  nodeMap = new Map();
  const nodes = []; let redacted = 0, unlabeled = 0, i = 0;
  const seen = new Set();
  for (const root of roots) {
    for (const el of [root, ...root.querySelectorAll("*")]) {
      if (seen.has(el) || el.closest("svg") && el.tagName !== "svg") continue;
      const clickable = el.matches("button,a,[data-go],[data-act]");
      // Decorative buttons in the mock do nothing, so never offer them to the model as tap targets.
      const wired = el.matches("a,[data-go],[data-act],[data-photo]") || !!el.closest(".navbar [data-go]");
      const insideClickable = !clickable && el.parentElement?.closest("button,a");
      // Leaf text, or mixed content like an SMS body with a link inside (Android gives the whole body one TextView).
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const leafText = !clickable && (el.children.length ? ownText : el.textContent.trim());
      if (!clickable && !(leafText && !insideClickable)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const x = Math.round((r.left - ar.left) / k), y = Math.round((r.top - ar.top) / k), w = Math.round(r.width / k), h = Math.round(r.height / k);
      if (y > H || y + h < 0) continue;
      seen.add(el);
      const id = "n" + ++i;
      el.dataset.nid = id;
      nodeMap.set(id, el);
      const aria = el.getAttribute("aria-label") || "";
      const raw = clickable ? (el.innerText || "").replace(/\s+/g, " ").trim() : el.textContent.replace(/\s+/g, " ").trim();
      const t = redact(raw); redacted += t.n;
      const hasSvgOnly = clickable && !raw && !aria;
      if (hasSvgOnly) unlabeled++;
      const node = {
        id,
        cls: el.tagName === "A" ? "Link" : clickable ? (raw ? "Button" : "ImageButton") : "TextView",
        ...(t.s ? { text: t.s.slice(0, 160) } : {}),
        ...(aria ? { desc: aria } : {}),
        clickable: wired,
        bounds: [x, y, w, h],
        pos: where(x, y, w, h),
      };
      const c = colorName(getComputedStyle(el).backgroundColor);
      if (c && clickable) node.color = c;
      if (t.n) node.redacted = true;
      nodes.push(node);
    }
  }
  return { screen: screen.dataset.screen, secure: screen.dataset.secure === "true", nodes, redacted, unlabeled };
}

async function screenshot(tree) {
  if (!window.html2canvas) return null;
  const ar = area.getBoundingClientRect(), k = ar.width / W;
  $("#overlay").style.visibility = "hidden";
  try {
    const c = await html2canvas(area, { scale: 1 / k, backgroundColor: "#fff", logging: false, useCORS: true });
    const g = c.getContext("2d");
    for (const n of tree.nodes) {
      const [x, y, w, h] = n.bounds;
      if (n.redacted) { g.fillStyle = "#000"; g.fillRect(x, y, w, h); }
      if (n.clickable) {
        g.font = "bold 12px sans-serif"; const tw = g.measureText(n.id).width + 6;
        g.fillStyle = "#FFB000"; g.fillRect(x, y, tw, 15); g.fillStyle = "#000"; g.fillText(n.id, x + 3, y + 12);
      }
    }
    return c.toDataURL("image/jpeg", 0.72);
  } catch (e) { console.warn("screenshot failed", e); return null; }
  finally { $("#overlay").style.visibility = ""; }
}

// ================= Language packs =================
const L = {
  kn: { tag: "kn-IN", ask: "ಕೇಳಿ", listening: "ಕೇಳುತ್ತಿದ್ದೇನೆ…", stop: "ನಿಲ್ಲಿಸಿ", thinking: "ನೋಡುತ್ತಿದ್ದೇನೆ…",
        secure: "ನಿಮ್ಮ ಸುರಕ್ಷತೆಗಾಗಿ ನಾನು ಬ್ಯಾಂಕಿಂಗ್ ಪರದೆ ನೋಡುವುದಿಲ್ಲ. ಜಾಗ್ರತೆ, PIN ಹಾಕುವ ಮುಂಚೆ ಮನೆಯವರನ್ನು ಕೇಳಿ.",
        danger: "ಎಚ್ಚರಿಕೆ: ಇದು ಮೋಸ ಇರಬಹುದು", sorry: "ಕ್ಷಮಿಸಿ, ಸರಿಯಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮತ್ತೊಮ್ಮೆ ಹೇಳಿ.",
        chips: ["ಮಗನಿಗೆ ಕೇಕ್ ಫೋಟೋ ಕಳಿಸಬೇಕು", "ಈ ಬ್ಯಾಂಕ್ ಮೆಸೇಜ್ ನಿಜಾನಾ? ಅಕೌಂಟ್ ಬ್ಲಾಕ್ ಆಗುತ್ತಂತೆ", "ಫೋನ್ ಸ್ಟೋರೇಜ್ ಫುಲ್ ಆಗಿದೆ, ಏನು ಮಾಡ್ಲಿ?", "ಬ್ಯಾಲೆನ್ಸ್ ನೋಡಬೇಕು"] },
  hi: { tag: "hi-IN", ask: "पूछें", listening: "सुन रहा हूँ…", stop: "रोकें", thinking: "देख रहा हूँ…",
        secure: "आपकी सुरक्षा के लिए मैं बैंकिंग स्क्रीन नहीं देखता। ध्यान रखें, PIN डालने से पहले घर वालों से पूछ लें।",
        danger: "सावधान: यह धोखा हो सकता है", sorry: "माफ़ कीजिए, ठीक से सुनाई नहीं दिया। फिर से बोलिए।",
        chips: ["बेटे को केक वाली फोटो भेजनी है", "ये बैंक वाला मैसेज सच है क्या? अकाउंट बंद हो जाएगा बोल रहा है", "फ़ोन की storage full हो गई है, क्या करूँ?", "बैलेंस चेक करना है"] },
  ta: { tag: "ta-IN", ask: "கேளுங்கள்", listening: "கேட்கிறேன்…", stop: "நிறுத்து", thinking: "பார்க்கிறேன்…",
        secure: "உங்கள் பாதுகாப்புக்காக நான் வங்கி திரையைப் பார்க்க மாட்டேன். கவனமாக இருங்கள், PIN போடும் முன் வீட்டில் கேளுங்கள்.",
        danger: "எச்சரிக்கை: இது மோசடியாக இருக்கலாம்", sorry: "மன்னிக்கவும், சரியாகக் கேட்கவில்லை. மீண்டும் சொல்லுங்கள்.",
        chips: ["மகனுக்கு கேக் போட்டோ அனுப்பணும்", "இந்த பேங்க் மெசேஜ் உண்மையா? அக்கவுண்ட் பிளாக் ஆகுமாம்", "போன் ஸ்டோரேஜ் ஃபுல் ஆயிடுச்சு, என்ன பண்றது?", "பேலன்ஸ் பார்க்கணும்"] },
  te: { tag: "te-IN", ask: "అడగండి", listening: "వింటున్నాను…", stop: "ఆపండి", thinking: "చూస్తున్నాను…",
        secure: "మీ భద్రత కోసం నేను బ్యాంకింగ్ స్క్రీన్ చూడను. జాగ్రత్తగా ఉండండి, PIN వేసే ముందు ఇంట్లో వాళ్ళని అడగండి.",
        danger: "జాగ్రత్త: ఇది మోసం కావచ్చు", sorry: "క్షమించండి, సరిగ్గా వినపడలేదు. మళ్ళీ చెప్పండి.",
        chips: ["అబ్బాయికి కేక్ ఫోటో పంపాలి", "ఈ బ్యాంక్ మెసేజ్ నిజమేనా? అకౌంట్ బ్లాక్ అవుతుందట", "ఫోన్ స్టోరేజ్ ఫుల్ అయింది, ఏం చేయాలి?", "బ్యాలెన్స్ చూడాలి"] },
  en: { tag: "en-IN", ask: "Ask", listening: "Listening…", stop: "Stop", thinking: "Looking…",
        secure: "To keep you safe, I don't look at banking screens. Please be careful, and ask family before you enter your PIN.",
        danger: "Careful: this looks like a fraud", sorry: "Sorry, I didn't catch that. Please say it again.",
        chips: ["Send the cake photo to my son", "Is this bank message real? It says my account will be blocked", "My phone storage is full, what do I do?", "I want to check my balance"] },
};
const CHIP_START = { 0: "wa_list", 1: "sms_scam", 2: "home", 3: "pay_home" };
const CHIP_EN = ["Send cake photo (needs vision)", "Scam SMS check", "Storage full (safe vs destructive)", "Bank PIN screen (blocked)"];
const langSel = $("#lang");
try { langSel.value = localStorage.getItem("bolo.lang") || "kn"; } catch {}
const lang = () => langSel.value;
function renderLang() {
  const p = L[lang()];
  $("#askLabel").textContent = p.ask;
  $("#chips").innerHTML = p.chips.map((c, i) => `<button class="chip" data-i="${i}">${c}<small>${CHIP_EN[i]}</small></button>`).join("");
}
langSel.addEventListener("change", () => { try { localStorage.setItem("bolo.lang", lang()); } catch {} renderLang(); });
renderLang();
$("#chips").addEventListener("click", (e) => {
  const b = e.target.closest(".chip"); if (!b) return;
  unlockAudio();
  const i = +b.dataset.i;
  // Put the phone where the parent would be when they ask.
  const start = CHIP_START[i];
  stack = start === "home" ? ["home"] : start === "wa_list" ? ["home", "wa_list"] : start === "sms_scam" ? ["home", "sms_list", "sms_scam"] : ["home", start];
  if (i === 3) stack = ["home", "pay_home", "pay_pin"];
  show(cur()); clearOverlay();
  setTimeout(() => startGoal(L[lang()].chips[i], performance.now()), 120);
});
$("#typeForm").addEventListener("submit", (e) => {
  e.preventDefault(); unlockAudio();
  const v = $("#typeInput").value.trim(); if (!v) return;
  $("#typeInput").value = ""; startGoal(v, performance.now());
});

// ================= Overlay =================
function clearOverlay() {
  ["#spot", "#finger", "#captionBar", "#danger"].forEach((s) => $(s).classList.remove("on", "scam"));
}
function caption(say, en, scam) {
  if (!$("#spot").classList.contains("on")) { $("#captionBar").style.top = "auto"; $("#captionBar").style.bottom = "58px"; }
  $("#sayText").textContent = say; $("#sayEn").textContent = en || "";
  $("#captionBar").classList.add("on"); $("#captionBar").classList.toggle("scam", !!scam);
}
function highlight(el, scam) {
  const ar = area.getBoundingClientRect(), k = ar.width / W, r = el.getBoundingClientRect();
  const pad = 6;
  let x = (r.left - ar.left) / k - pad, y = (r.top - ar.top) / k - pad, w = r.width / k + pad * 2, h = r.height / k + pad * 2;
  const spot = $("#spot");
  Object.assign(spot.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  spot.classList.add("on"); spot.classList.toggle("scam", !!scam);
  const f = $("#finger");
  const below = y + h + 60 < H - 160;
  Object.assign(f.style, { left: Math.min(W - 60, Math.max(4, x + w / 2 - 14)) + "px", top: (below ? y + h - 6 : y - 52) + "px", transform: below ? "" : "rotate(180deg)" });
  f.classList.add("on");
  // Keep caption from covering the target.
  const cb = $("#captionBar");
  if (y + h > H - 230) { cb.style.bottom = "auto"; cb.style.top = scam ? "330px" : "40px"; }
  else { cb.style.top = "auto"; cb.style.bottom = "58px"; }
}

// ================= Voice out =================
const audio = new Audio();
let unlocked = false;
function unlockAudio() {
  if (unlocked) return; unlocked = true;
  audio.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRBqpAAAAAAAAAAAAAAAAAAAA";
  audio.play().catch(() => {});
}
async function speak(text, t0) {
  const ts = performance.now();
  try {
    const r = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang: lang() }) });
    if (!r.ok) throw new Error(await r.text());
    const blob = await r.blob();
    setBar("Tts", performance.now() - ts);
    audio.src = URL.createObjectURL(blob);
    audio.playbackRate = 1;
    await new Promise((res) => { audio.onplaying = res; audio.play().catch(res); });
  } catch (e) {
    console.warn("ElevenLabs TTS failed, using browser voice", e);
    trail("tts_failed", { err: String(e.message || e).slice(0, 200), text });
    setBar("Tts", performance.now() - ts, "browser");
    const u = new SpeechSynthesisUtterance(text); u.lang = L[lang()].tag; u.rate = 0.9;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }
  if (t0) setBar("Aud", performance.now() - t0, null, true);
}

// ================= Voice in: push-to-ask =================
const tab = $("#askTab");
let rec = null, chunks = [], pressT = 0, recStart = 0, recTimer = null;
async function startRec() {
  unlockAudio(); clearOverlay(); audio.pause();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m)) || "";
    rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.start(); recStart = performance.now();
    tab.classList.add("rec"); $("#askLabel").textContent = L[lang()].stop;
    $("#listening").classList.add("on", "rec"); $("#listenText").textContent = L[lang()].listening;
    $("#stopLabel").textContent = L[lang()].stop;
    recTimer = setInterval(() => {
      const sec = Math.floor((performance.now() - recStart) / 1000);
      $("#recTime").textContent = `0:${String(sec).padStart(2, "0")}`;
      if (sec >= 20) stopRec(); // safety: never keep the mic open
    }, 250);
  } catch (e) { toast("Microphone blocked — use the typed box"); rec = null; }
}
async function stopRec() {
  if (!rec) return;
  const r = rec; rec = null;
  const t0 = performance.now();  // trigger released: latency clock starts
  clearInterval(recTimer); $("#recTime").textContent = "0:00";
  tab.classList.remove("rec"); tab.classList.add("busy"); $("#askLabel").textContent = L[lang()].ask;
  $("#listening").classList.remove("rec");
  $("#listenText").textContent = L[lang()].thinking;
  await new Promise((res) => { r.onstop = res; r.stop(); });
  r.stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: r.mimeType || "audio/webm" });
  if (performance.now() - recStart < 500 || blob.size < 2000) { $("#listening").classList.remove("on"); tab.classList.remove("busy"); return; }
  resetBars();
  try {
    const res = await fetch(`/api/stt?lang=${lang()}`, { method: "POST", headers: { "content-type": blob.type }, body: blob });
    const j = await res.json();
    setBar("Stt", performance.now() - t0);
    trail("stt", { ok: res.ok, ms: Math.round(performance.now() - t0), text: j.text, err: res.ok ? undefined : j });
    if (!res.ok || !j.text) throw new Error(JSON.stringify(j));
    await startGoal(j.text, t0, true);
  } catch (e) {
    console.warn(e); trail("voice_error", { err: String(e.message || e).slice(0, 300) });
    $("#listening").classList.remove("on"); caption(L[lang()].sorry, "");
    speak(L[lang()].sorry);
  } finally { tab.classList.remove("busy"); }
}
tab.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (rec) { stopRec(); return; }
  pressT = performance.now(); startRec();
});
$("#stopBtn").addEventListener("click", (e) => { e.preventDefault(); stopRec(); });
tab.addEventListener("pointerup", () => { if (rec && performance.now() - pressT > 450) stopRec(); });
tab.addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); rec ? stopRec() : startRec(); } });

// ================= The core loop =================
let session = null, lastTarget = null;        // { goal, history: [], steps }
let lastEvent = null;
let busy = false;
const MAX_STEPS = 10;

async function startGoal(goal, t0, fromVoice) {
  trail("goal", { goal, lang: lang(), from: fromVoice ? "voice" : "example/typed", screen: cur() });
  clearOverlay();
  $("#heard").textContent = goal;
  if (!fromVoice) resetBars();
  session = { goal, history: [], steps: 0 };
  $("#log").innerHTML = "";
  await step(t0);
}

async function step(t0, forceShot = false) {
  if (!session || busy) return;
  busy = true;
  $("#listening").classList.add("on"); $("#listenText").textContent = L[lang()].thinking;
  try {
    const tree = captureTree();
    trail("screen", { screen: tree.screen, secure: tree.secure, redacted: tree.redacted, unlabeled: tree.unlabeled,
      nodes: tree.nodes.map((n) => `${n.id}${n.clickable ? "*" : ""}:${n.text || n.desc || n.cls}`.slice(0, 50)) });
    $("#sRed").textContent = tree.redacted;
    // FLAG_SECURE: never capture or send banking/PIN screens.
    if (tree.secure) {
      $("#sPerc").textContent = "blocked"; $("#sSafety").textContent = "secure";
      $("#treeView").textContent = "(nothing sent: screen is FLAG_SECURE)";
      $("#listening").classList.remove("on");
      setBar("Hi", performance.now() - t0, null, true);
      caption(L[lang()].secure, "Secure screen: Bolo does not read it.");
      log(L[lang()].secure, "Secure screen detected, nothing captured or sent.");
      session = null;
      await speak(L[lang()].secure, t0);
      return;
    }
    const useShot = forceShot || tree.unlabeled >= 3;
    const shot = useShot ? await screenshot(tree) : null;
    $("#sPerc").textContent = shot ? "tree + vision" : "tree only";
    const payload = { goal: session.goal, lang: lang(), tree: { screen: tree.screen, nodes: tree.nodes }, history: session.history, ...(shot ? { screenshot: shot } : {}) };
    $("#treeView").textContent = JSON.stringify(payload.tree, null, 1);
    const ts = performance.now();
    const r = await fetch("/api/think", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json();
    setBar("Think", performance.now() - ts);
    trail("think", { ok: r.ok, ms: Math.round(performance.now() - ts), vision: !!shot, step: j.step, err: r.ok ? undefined : j });
    if (!r.ok) throw new Error(JSON.stringify(j.detail || j));
    const s = j.step;
    if (s.need_screenshot && !shot && !forceShot) { busy = false; return step(t0, true); }

    const scam = s.safety?.level === "scam";
    $("#sSafety").textContent = s.safety?.level || "–";
    $("#listening").classList.remove("on");
    $("#danger").textContent = L[lang()].danger; $("#danger").classList.toggle("on", scam);
    const el = s.target_id && nodeMap.get(s.target_id);
    lastTarget = el ? s.target_id : null;
    if (s.target_id && !el) trail("bad_target", { target_id: s.target_id });
    if (el) highlight(el, scam);
    caption(s.say, s.say_en, scam);
    setBar("Hi", performance.now() - t0, null, true);
    session.steps++;
    session.history.push(`Bolo said: "${s.say_en}" (target ${s.target_id || "none"}: ${el ? labelOf(el) || "unlabeled" : "-"})`);
    log(s.say, `${s.say_en || ""}${s.safety?.level && s.safety.level !== "safe" ? " · " + s.safety.level.toUpperCase() + ": " + (s.safety.reason || "") : ""}`, scam);
    if (s.goal_done || s.action === "done" || session.steps >= MAX_STEPS) session = null;
    busy = false;
    await speak(s.say, t0);
  } catch (e) {
    console.error(e); trail("step_error", { err: String(e.message || e).slice(0, 400) });
    $("#listening").classList.remove("on");
    caption(L[lang()].sorry, "Error: " + String(e.message || e).slice(0, 140));
  } finally { busy = false; }
}

// Follow-along: after the parent taps, look again and give the next single step.
function userTapped(label) {
  if (!session) return;
  session.history.push(`Parent tapped "${label}"${lastEvent ? " (" + lastEvent.what + ")" : ""}`);
  lastEvent = null;
  audio.pause(); speechSynthesis.cancel();
  resetBars();
  setTimeout(() => step(performance.now()), 450);
}

// ================= Console helpers =================
function resetBars() { ["Stt", "Think", "Tts", "Hi", "Aud"].forEach((k) => { $("#b" + k).style.width = "0"; $("#b" + k).classList.remove("slow"); $("#v" + k).textContent = "–"; }); }
function setBar(k, ms, note, total) {
  const pct = Math.min(100, (ms / 3000) * 100);
  $("#b" + k).style.width = pct + "%";
  if (total) $("#b" + k).classList.toggle("slow", ms > 2500);
  $("#v" + k).textContent = (ms / 1000).toFixed(2) + " s" + (note ? " *" : "");
}
function log(say, en, scam) {
  const li = document.createElement("li");
  li.innerHTML = `<span class="${scam ? "scam" : ""}"></span><span class="en"></span>`;
  li.firstChild.textContent = say; li.lastChild.textContent = en;
  $("#log").appendChild(li); $("#log").scrollTop = 1e6;
}

fetch("/api/health").then((r) => r.json()).then((h) => {
  const bad = [];
  if (!h.llm) bad.push("No LLM key (set ANTHROPIC_API_KEY or LLM_API_KEY)");
  if (!h.elevenlabs) bad.push("No ELEVENLABS_API_KEY (voice falls back to browser)");
  $("#health").innerHTML = bad.length ? bad.map((b) => `<div class="bad">${b}</div>`).join("") : `Brain: ${h.provider} · ${h.model} · Ears: ElevenLabs ${h.stt}`;
}).catch(() => { $("#health").innerHTML = `<div class="bad">Server not reachable</div>`; });
}

$("#copyLog").addEventListener("click", async () => {
  const text = JSON.stringify({ app: "bolo", at: new Date().toISOString(), ua: navigator.userAgent, events: TRAIL }, null, 1);
  try { await navigator.clipboard.writeText(text); toast(`Log copied (${TRAIL.length} events)`); }
  catch {
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    toast(`Log copied (${TRAIL.length} events)`);
  }
});
