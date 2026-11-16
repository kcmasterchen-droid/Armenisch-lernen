'use strict';
/* global ALPHABET, ALPHA_GROUPS, PRONUNCIATION, LEVELS */

/* ================================================================== */
/* Hilfsfunktionen                                                     */
/* ================================================================== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const pad = (n) => String(n).padStart(2, '0');
const dayStr = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (str, n) => { const [y, m, d] = str.split('-').map(Number); return dayStr(new Date(y, m - 1, d + n)); };

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), ms);
}

/* ================================================================== */
/* Umschrift (Ostarmenisch)                                            */
/* ================================================================== */
const TR = {
  'ա': 'a', 'բ': 'b', 'գ': 'g', 'դ': 'd', 'ե': 'e', 'զ': 'z', 'է': 'e', 'ը': 'ə', 'թ': "t'", 'ժ': 'zh',
  'ի': 'i', 'լ': 'l', 'խ': 'kh', 'ծ': 'ts', 'կ': 'k', 'հ': 'h', 'ձ': 'dz', 'ղ': 'gh', 'ճ': 'ch', 'մ': 'm',
  'յ': 'y', 'ն': 'n', 'շ': 'sh', 'ո': 'o', 'չ': "ch'", 'պ': 'p', 'ջ': 'j', 'ռ': 'rr', 'ս': 's', 'վ': 'v',
  'տ': 't', 'ր': 'r', 'ց': "ts'", 'ւ': 'v', 'փ': "p'", 'ք': "k'", 'օ': 'o', 'ֆ': 'f', 'և': 'ev',
};
// Hilfsverb „sein“ wird ohne j gesprochen
const AUX = { 'եմ': 'em', 'ես': 'es', 'է': 'e', 'ենք': "enk'", 'եք': "ek'", 'են': 'en', 'էի': 'ei' };
const VO_EXC = { 'ով': 'ov', 'ովքեր': "ovk'er" };
const MARKS = /[՛՜՞]/g; // ՛ ՜ ՞
const WORD_RE = /([Ա-Ֆա-և՛՜՞]+)/;

function graphemes(word) {
  const out = [];
  const w = word.replace(MARKS, '');
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1];
    if ((c === 'ո' || c === 'Ո') && (n === 'ւ' || n === 'Ւ')) { out.push(c + n); i++; } else out.push(c);
  }
  return out;
}

function graphemeTr(g, i, lw, isFirst) {
  const l = g.toLowerCase();
  if (l === 'ու') return 'u';
  if (i === 0) {
    if (l === 'ե') return (AUX[lw] && !(lw === 'ես' && isFirst)) ? 'e' : 'ye';
    if (l === 'ո') return 'vo';
    if (l === 'և') return 'yev';
  }
  return TR[l] ?? g;
}

function translitWord(word, isFirst) {
  const clean = word.replace(MARKS, '');
  const lw = clean.toLowerCase();
  let out;
  if (AUX[lw] && !(lw === 'ես' && isFirst)) out = AUX[lw];
  else if (VO_EXC[lw]) out = VO_EXC[lw];
  else out = graphemes(clean).map((g, i) => graphemeTr(g, i, lw, isFirst)).join('');
  if (clean[0] && clean[0] !== clean[0].toLowerCase()) out = out[0].toUpperCase() + out.slice(1);
  return out;
}

function translit(text) {
  let first = true;
  const out = text.split(WORD_RE).map((part) => {
    if (WORD_RE.test(part) && /[Ա-և]/.test(part)) { const r = translitWord(part, first); first = false; return r; }
    return part.replace(/։/g, '.').replace(/՝/g, ',');
  }).join('');
  return text.includes('՞') && !out.trim().endsWith('?') ? out.trim() + '?' : out;
}

// Laut-für-Laut-Zerlegung für die Aussprache
function breakdown(text) {
  let first = true;
  return text.split(/\s+/).filter(Boolean).map((word) => {
    const clean = word.replace(/[,.։՝!?]/g, '');
    if (!/[Ա-և]/.test(clean)) return null;
    const lw = clean.replace(MARKS, '').toLowerCase();
    const isF = first; first = false;
    if (AUX[lw] && !(lw === 'ես' && isF)) return [[clean.replace(MARKS, ''), AUX[lw]]];
    return graphemes(clean).map((g, i) => [g, graphemeTr(g, i, lw, isF)]);
  }).filter(Boolean);
}

/* ================================================================== */
/* Speicher                                                            */
/* ================================================================== */
const STORE_KEY = 'armenisch-lernen-v1';
const DEFAULTS = { settings: { goal: 15, rate: 0.85, voiceURI: '', refMode: false }, srs: {}, days: {} };
function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    if (raw && typeof raw === 'object') return { ...DEFAULTS, ...raw, settings: { ...DEFAULTS.settings, ...raw.settings } };
  } catch (e) { /* ignorieren */ }
  return structuredClone(DEFAULTS);
}
let S = load();
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { /* voll/blockiert */ } }

/* ================================================================== */
/* Inhalte -> Lektionen & Lernobjekte                                  */
/* ================================================================== */
const ITEMS = new Map();
const LESSONS = [];
const LETTER = Object.fromEntries(ALPHABET.map((l) => [l.up, l]));

(function buildRegistry() {
  ALPHA_GROUPS.forEach((grp, gi) => {
    const id = `alpha-${gi + 1}`;
    const keys = [];
    grp.forEach((up) => {
      const L = LETTER[up];
      const k = `L|${up}`;
      ITEMS.set(k, { key: k, kind: 'letter', am: up === L.low ? up : `${up} ${L.low}`, tr: L.tr, de: L.hint, audio: L.name, lesson: id, letter: L });
      keys.push(k);
    });
    grp.forEach((up) => {
      const ex = LETTER[up].ex;
      const k = `R|${ex.am}`;
      if (!ITEMS.has(k)) { ITEMS.set(k, { key: k, kind: 'read', am: ex.am, tr: translit(ex.am), de: ex.de, audio: ex.am, lesson: id }); keys.push(k); }
    });
    LESSONS.push({ id, level: 'alpha', title: `Buchstaben ${gi + 1}: ${grp.join(' ')}`, keys, letters: grp });
  });
  LEVELS.forEach((lv) => lv.lessons.forEach((ls) => {
    const keys = [];
    const add = (it, kind) => {
      const k = `${ls.id}|${it.am}`;
      ITEMS.set(k, { key: k, kind, am: it.am, de: it.de, tr: it.tr || translit(it.am), note: it.note, audio: it.am, lesson: ls.id });
      keys.push(k);
    };
    (ls.items || []).forEach((it) => add(it, 'word'));
    (ls.sentences || []).forEach((it) => add(it, it.am.trim().split(/\s+/).length >= 3 ? 'sentence' : 'word'));
    LESSONS.push({ ...ls, level: lv.id, keys });
  }));
})();
const lessonById = (id) => LESSONS.find((l) => l.id === id);

/* ================================================================== */
/* Spaced Repetition (Leitner)                                         */
/* ================================================================== */
const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];
const srs = (k) => S.srs[k];
const isNew = (k) => !S.srs[k];
const isDue = (k, today = dayStr()) => !!S.srs[k] && S.srs[k].due <= today;
function grade(k, ok) {
  const today = dayStr();
  const r = S.srs[k] || { box: 0, due: today, ok: 0, bad: 0 };
  if (ok) { r.box = Math.min(r.box + 1, INTERVALS.length - 1); r.ok++; } else { r.box = 1; r.bad++; }
  r.due = addDays(today, INTERVALS[r.box]);
  S.srs[k] = r;
}
function lessonProgress(ls) {
  const seen = ls.keys.filter((k) => !isNew(k)).length;
  return { seen, total: ls.keys.length, pct: Math.round((seen / ls.keys.length) * 100) };
}
const nextLesson = () => LESSONS.find((l) => l.keys.some(isNew));

/* ================================================================== */
/* Audio: eigene Aufnahmen > Audiodateien > Geräte-Stimme              */
/* ================================================================== */
const DB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('armenisch-lernen', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('refs');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async tx(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('refs', mode);
      const req = fn(t.objectStore('refs'));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    });
  },
  get(k) { return this.tx('readonly', (s) => s.get(k)); },
  put(k, v) { return this.tx('readwrite', (s) => s.put(v, k)); },
  del(k) { return this.tx('readwrite', (s) => s.delete(k)); },
  keys() { return this.tx('readonly', (s) => s.getAllKeys()); },
};
let refKeys = new Set();
let manifest = {};
let voices = [];
let voice = null;
let currentAudio = null;

function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  voices = speechSynthesis.getVoices();
  const hy = (v) => /^hy([-_]|$)/i.test(v.lang);
  voice = voices.find((v) => v.voiceURI === S.settings.voiceURI) || voices.find(hy) || null;
}
const hasArmenianVoice = () => !!voice && /^hy([-_]|$)/i.test(voice.lang);
const audioAvailable = (text) => refKeys.has(text) || !!manifest[text] || !!voice;

function stopAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function playUrl(url, slow) {
  return new Promise((res) => {
    const a = new Audio(url);
    a.playbackRate = slow ? 0.7 : 1;
    currentAudio = a;
    a.onended = a.onerror = () => res(true);
    a.play().catch(() => res(false));
  });
}
async function play(text, slow = false) {
  stopAudio();
  if (refKeys.has(text)) {
    const blob = await DB.get(text);
    if (blob) return playUrl(URL.createObjectURL(blob), slow);
  }
  if (manifest[text]) return playUrl(`audio/${manifest[text]}`, slow);
  if (voice) {
    return new Promise((res) => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang;
      u.rate = S.settings.rate * (slow ? 0.65 : 1);
      u.onend = u.onerror = () => res(true);
      speechSynthesis.speak(u);
    });
  }
  toast('Kein Audio: keine armenische Stimme & keine Aufnahme. Siehe „Mehr“.', 3500);
  return false;
}

const Rec = {
  mr: null, stream: null, chunks: [], timer: null,
  supported: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder),
  async start(maxMs = 8000, onAuto) {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const type = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
    this.mr = new MediaRecorder(this.stream, type ? { mimeType: type } : undefined);
    this.chunks = [];
    this.mr.ondataavailable = (e) => e.data.size && this.chunks.push(e.data);
    this.mr.start();
    this.timer = setTimeout(() => onAuto && onAuto(), maxMs);
  },
  stop() {
    clearTimeout(this.timer);
    return new Promise((res) => {
      if (!this.mr) return res(null);
      const mr = this.mr;
      mr.onstop = () => {
        const blob = new Blob(this.chunks, { type: mr.mimeType || 'audio/webm' });
        this.stream.getTracks().forEach((t) => t.stop());
        res(blob);
      };
      this.mr = null;
      mr.stop();
    });
  },
};

// Experimentelle Spracherkennung (nur wo der Browser hy-AM anbietet, z. B. Chrome)
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function recognize() {
  return new Promise((res, rej) => {
    const r = new SR();
    r.lang = 'hy-AM'; r.interimResults = false; r.maxAlternatives = 3;
    let done = false;
    r.onresult = (e) => { done = true; res([...e.results[0]].map((a) => a.transcript)); };
    r.onerror = (e) => { if (!done) { done = true; rej(e.error); } };
    r.onend = () => { if (!done) { done = true; res([]); } };
    r.start();
  });
}
const normArm = (s) => s.toLowerCase().replace(/[^ա-և]/g, '');
function similarity(a, b) {
  a = normArm(a); b = normArm(b);
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
}

/* ================================================================== */
/* Lernzeit                                                            */
/* ================================================================== */
let activeView = 'home';
const STUDY_VIEWS = new Set(['session', 'lesson', 'pron', 'alphabet']);
setInterval(() => {
  if (document.visibilityState !== 'visible' || !STUDY_VIEWS.has(activeView)) return;
  const d = dayStr();
  S.days[d] = (S.days[d] || 0) + 1;
  if (S.days[d] % 10 === 0) save();
  const el = $('#timer');
  if (el) el.textContent = fmtMin(S.days[d]);
}, 1000);
const fmtMin = (sec) => `${Math.floor(sec / 60)}:${pad(sec % 60)}`;
const goalSec = () => S.settings.goal * 60;
function streak() {
  let d = dayStr(), n = 0;
  if ((S.days[d] || 0) < goalSec()) d = addDays(d, -1);
  while ((S.days[d] || 0) >= goalSec()) { n++; d = addDays(d, -1); }
  return n;
}

/* ================================================================== */
/* Übungs-Generator                                                    */
/* ================================================================== */
function distractors(item, field, n = 3) {
  const same = (it) => it.kind === item.kind || (item.kind !== 'letter' && it.kind !== 'letter');
  const pools = [
    lessonById(item.lesson).keys.map((k) => ITEMS.get(k)),
    LESSONS.filter((l) => l.level === lessonById(item.lesson).level).flatMap((l) => l.keys.map((k) => ITEMS.get(k))),
    [...ITEMS.values()],
  ];
  const seen = new Set([item[field]]);
  const out = [];
  for (const pool of pools) {
    for (const it of shuffle(pool)) {
      if (out.length >= n) break;
      if (it.key === item.key || !same(it) || seen.has(it[field])) continue;
      if (item.kind === 'sentence' && it.kind !== 'sentence' && pool !== pools[2]) continue;
      seen.add(it[field]); out.push(it[field]);
    }
    if (out.length >= n) break;
  }
  return out;
}

function exerciseTypes(item) {
  switch (item.kind) {
    case 'letter': return ['letter-sound', 'sound-letter'];
    case 'read': return ['read', 'am-de'];
    case 'sentence': return ['build', 'am-de', ...(audioAvailable(item.audio) ? ['listen'] : [])];
    default: return ['am-de', 'de-am', ...(audioAvailable(item.audio) ? ['listen'] : [])];
  }
}
const ex = (type, key) => ({ type, key });

// Neue Lernobjekte: Vorstellung + 2 Übungen (+ Aussprache)
function newItemExercises(keys) {
  const q = [];
  for (let i = 0; i < keys.length; i += 2) {
    const chunk = keys.slice(i, i + 2);
    chunk.forEach((k) => q.push(ex('intro', k)));
    chunk.forEach((k) => q.push(ex(exerciseTypes(ITEMS.get(k))[0], k)));
  }
  keys.forEach((k, i) => {
    const it = ITEMS.get(k);
    const t = exerciseTypes(it);
    q.push(ex(t[1] || t[0], k));
    if (it.kind !== 'letter' && i % 3 === 0) q.push(ex('speak', k));
  });
  return q;
}
const reviewExercise = (k) => { const it = ITEMS.get(k); return ex(Math.random() < 0.15 && it.kind !== 'letter' ? 'speak' : pick(exerciseTypes(it)), k); };

function dueKeys() {
  const today = dayStr();
  return Object.keys(S.srs).filter((k) => ITEMS.has(k) && S.srs[k].due <= today).sort((a, b) => S.srs[a].due.localeCompare(S.srs[b].due));
}

function buildDaily() {
  const goal = S.settings.goal;
  const target = Math.round(goal * 2.4);
  const reviews = dueKeys().slice(0, Math.round(target * 0.6)).map(reviewExercise);
  // ~3,3 Übungen pro neuem Lernobjekt; Rest der Zielzeit mit Neuem füllen
  const newCount = Math.max(3, Math.min(10, Math.round((target - reviews.length) / 3.3)));
  const fresh = LESSONS.flatMap((ls) => ls.keys.filter(isNew)).slice(0, newCount);
  const q = fresh.length ? newItemExercises(fresh) : [];
  if (!q.length && !reviews.length) {
    const learned = Object.keys(S.srs).filter((k) => ITEMS.has(k));
    return shuffle(learned).slice(0, target).map(reviewExercise);
  }
  // Wiederholungen zuerst (aufwärmen), dann Neues, Rest gemischt
  const warm = reviews.slice(0, 4);
  return [...warm, ...q, ...shuffle(reviews.slice(4))];
}
function buildLesson(id) {
  const ls = lessonById(id);
  const fresh = ls.keys.filter(isNew).slice(0, 7);
  if (fresh.length) return newItemExercises(fresh);
  return shuffle(ls.keys).slice(0, 20).map(reviewExercise);
}
function buildPron(id) {
  const topic = PRONUNCIATION.find((p) => p.id === id);
  return topic.words.map((w) => ({ type: 'speak', key: null, free: w }));
}

/* ================================================================== */
/* Session                                                             */
/* ================================================================== */
let SES = null;
function startSession(queue, title, back = '#/home') {
  if (!queue.length) { toast('Gerade nichts zu üben – super!'); return; }
  SES = { queue, i: 0, title, back, results: {}, correct: 0, answered: 0, startSec: S.days[dayStr()] || 0, requeued: new Set() };
  location.hash = '#/session';
}
function finishSession() {
  Object.entries(SES.results).forEach(([k, ok]) => grade(k, ok));
  save();
  SES.done = true;
}
const itemFor = (e) => e.free ? { key: null, kind: 'word', am: e.free.am, de: e.free.de, tr: translit(e.free.am), audio: e.free.am } : ITEMS.get(e.key);

function answer(ok) {
  const e = SES.queue[SES.i];
  if (e.key) {
    if (e.type !== 'intro') {
      SES.answered++; if (ok) SES.correct++;
      SES.results[e.key] = (SES.results[e.key] ?? true) && ok;
    } else if (!(e.key in SES.results)) SES.results[e.key] = true;
    if (!ok && !SES.requeued.has(e.key)) { SES.requeued.add(e.key); SES.queue.push(reviewExercise(e.key)); }
  } else if (e.type !== 'intro') { SES.answered++; if (ok) SES.correct++; if (!ok && !e.again) SES.queue.push({ ...e, again: true }); }
}
function nextEx() {
  stopAudio();
  SES.i++;
  if (SES.i >= SES.queue.length) finishSession();
  renderSession();
}

/* ================================================================== */
/* UI-Bausteine                                                        */
/* ================================================================== */
const playBtns = (text, big = false) => `
  <button class="btn-icon ${big ? 'big' : ''}" data-act="play" data-text="${esc(text)}" aria-label="Anhören">🔊</button>
  <button class="btn-icon ${big ? 'big' : ''}" data-act="play" data-slow="1" data-text="${esc(text)}" aria-label="Langsam anhören">🐢</button>`;

function breakdownHtml(text) {
  return `<div class="breakdown" aria-label="Laut für Laut">${breakdown(text).map((w) =>
    `<span class="bw">${w.map(([g, t]) => `<span class="bg"><span class="ba">${esc(g)}</span><span class="bt">${esc(t)}</span></span>`).join('')}</span>`).join('')}</div>`;
}

function recorderHtml(text) {
  if (!Rec.supported()) return '<p class="muted small">Aufnahme wird von diesem Browser nicht unterstützt.</p>';
  return `<div class="recorder" data-text="${esc(text)}">
    <button class="btn rec" data-act="rec">🎙️ Aufnehmen</button>
    <button class="btn ghost" data-act="mine" disabled>▶️ Ich</button>
    <button class="btn ghost" data-act="compare" disabled>⇄ Vergleich</button>
    ${SR ? '<button class="btn ghost" data-act="asr">🧪 Erkennung</button>' : ''}
    <div class="asr-out small muted"></div>
  </div>
  ${S.settings.refMode ? refRecorderHtml(text) : ''}`;
}
function refRecorderHtml(text) {
  const has = refKeys.has(text);
  return `<div class="refrec" data-text="${esc(text)}">
    <span class="small">Referenz${has ? ' ✅' : ''}:</span>
    <button class="btn small ${has ? 'ghost' : 'accent'}" data-act="refrec">● ${has ? 'Neu aufnehmen' : 'Referenz aufnehmen'}</button>
    ${has ? '<button class="btn small ghost" data-act="refdel">🗑</button>' : ''}
  </div>`;
}

const myRecs = new Map(); // text -> objectURL (nur diese Sitzung)
document.addEventListener('click', async (ev) => {
  const b = ev.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const box = b.closest('[data-text]');
  const text = b.dataset.text || (box && box.dataset.text);
  if (act === 'play') { ev.preventDefault(); play(text, b.dataset.slow === '1'); return; }
  if (act === 'rec' || act === 'refrec') {
    if (b.classList.contains('recording')) { Rec.stop().then((blob) => onRecorded(b, blob, act, text)); return; }
    try {
      stopAudio();
      await Rec.start(text.length > 25 ? 12000 : 7000, () => b.click());
      b.classList.add('recording'); b.dataset.label = b.textContent; b.textContent = '⏹ Stopp';
    } catch (e) { toast('Kein Mikrofonzugriff. Bitte in den Browser-Einstellungen erlauben.'); }
    return;
  }
  if (act === 'mine') { const u = myRecs.get(text); if (u) { stopAudio(); playUrl(u); } return; }
  if (act === 'compare') {
    const u = myRecs.get(text); if (!u) return;
    await play(text); await new Promise((r) => setTimeout(r, 350)); await playUrl(u);
    return;
  }
  if (act === 'asr') {
    const out = box.querySelector('.asr-out');
    out.textContent = '🎧 Sprich jetzt …';
    try {
      const alts = await recognize();
      if (!alts.length) { out.textContent = 'Nichts erkannt. Nochmal versuchen?'; return; }
      const best = alts.map((a) => [a, similarity(a, text)]).sort((x, y) => y[1] - x[1])[0];
      const p = Math.round(best[1] * 100);
      out.innerHTML = `Erkannt: <b lang="hy">${esc(best[0])}</b> – Übereinstimmung ${p}% ${p >= 85 ? '🎉' : p >= 60 ? '👍' : '🔁'}<br><span class="muted">Experimentell: Die Erkennung kann auch bei guter Aussprache danebenliegen.</span>`;
    } catch (e) {
      out.textContent = e === 'language-not-supported' || e === 'not-allowed' || e === 'service-not-allowed'
        ? 'Spracherkennung für Armenisch ist auf diesem Gerät nicht verfügbar.'
        : `Erkennung fehlgeschlagen (${e}).`;
    }
    return;
  }
  if (act === 'refdel') {
    await DB.del(text); refKeys.delete(text);
    box.outerHTML = refRecorderHtml(text);
    toast('Referenz gelöscht');
  }
});
async function onRecorded(b, blob, act, text) {
  b.classList.remove('recording'); b.textContent = b.dataset.label;
  if (!blob || !blob.size) return;
  if (act === 'refrec') {
    await DB.put(text, blob); refKeys.add(text);
    const box = b.closest('.refrec'); if (box) box.outerHTML = refRecorderHtml(text);
    toast('Referenz gespeichert ✅');
    return;
  }
  const old = myRecs.get(text); if (old) URL.revokeObjectURL(old);
  const url = URL.createObjectURL(blob);
  myRecs.set(text, url);
  const box = b.closest('.recorder');
  $$('[data-act="mine"],[data-act="compare"]', box).forEach((x) => { x.disabled = false; });
  playUrl(url);
}

/* ================================================================== */
/* Ansichten                                                           */
/* ================================================================== */
const app = () => $('#app');
const levelTitle = (id) => id === 'alpha' ? 'Alphabet' : LEVELS.find((l) => l.id === id).title;

function voiceBanner() {
  if (hasArmenianVoice() || refKeys.size || Object.keys(manifest).length) return '';
  return `<a class="card warn" href="#/settings">⚠️ <b>Keine armenische Stimme gefunden.</b> Audio fehlt noch – tippe hier für Lösungen (Stimme installieren oder Muttersprachler-Aufnahmen).</a>`;
}

function viewHome() {
  const today = S.days[dayStr()] || 0;
  const pct = Math.min(100, Math.round((today / goalSec()) * 100));
  const nl = nextLesson();
  const due = dueKeys().length;
  const learned = Object.values(S.srs).filter((r) => r.box >= 2).length;
  const C = 2 * Math.PI * 52;
  return `
  <header class="hero">
    <div>
      <h1 lang="hy">Բարև!</h1>
      <p class="muted">Ostarmenisch · ${S.settings.goal} Min. pro Tag</p>
    </div>
    <div class="streak" title="Tage in Folge mit erreichtem Ziel">🔥 ${streak()}</div>
  </header>
  ${voiceBanner()}
  <section class="card center">
    <svg class="ring" viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" class="ring-bg"/>
      <circle cx="60" cy="60" r="52" class="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct / 100)}"/>
      <text x="60" y="58" text-anchor="middle" class="ring-t">${Math.floor(today / 60)}</text>
      <text x="60" y="78" text-anchor="middle" class="ring-s">von ${S.settings.goal} Min.</text>
    </svg>
    <p>${pct >= 100 ? '🎉 Tagesziel erreicht! Weitermachen geht natürlich auch.' : 'Dein heutiges Training'}</p>
    <button class="btn primary wide" data-go="daily">▶ Tagestraining starten</button>
    <p class="small muted">${due} Wiederholungen fällig${nl ? ` · Neu: ${esc(nl.title)}` : ''}</p>
  </section>
  <section class="stats">
    <div class="card stat"><b>${learned}</b><span>gefestigt</span></div>
    <div class="card stat"><b>${Object.keys(S.srs).length}</b><span>gesehen</span></div>
    <div class="card stat"><b>${ITEMS.size}</b><span>gesamt</span></div>
  </section>
  ${nl ? `<a class="card link" href="#/lesson/${nl.id}"><span class="muted small">${esc(levelTitle(nl.level))}</span><br><b>${esc(nl.title)}</b> <span class="muted">→</span></a>` : ''}
  <a class="card link" href="#/pron"><b>🗣️ Aussprache-Training</b><br><span class="small muted">Die schwierigen Laute gezielt üben</span></a>`;
}

function viewCourse() {
  const groups = [{ id: 'alpha', title: 'Alphabet', desc: '38 Buchstaben lesen und aussprechen' }, ...LEVELS];
  const nl = nextLesson();
  return `<h1>Kurs</h1>${groups.map((g) => `
    <h2>${esc(g.title)}</h2><p class="muted small">${esc(g.desc)}</p>
    ${LESSONS.filter((l) => l.level === g.id).map((l) => {
      const p = lessonProgress(l);
      return `<a class="card lesson ${nl && nl.id === l.id ? 'next' : ''}" href="#/lesson/${l.id}">
        <div><b>${esc(l.title)}</b><div class="bar"><i style="width:${p.pct}%"></i></div></div>
        <span class="small muted">${p.seen}/${p.total}</span></a>`;
    }).join('')}`).join('')}`;
}

function itemRow(it) {
  const st = srs(it.key);
  const dot = !st ? 'new' : st.box >= 3 ? 'strong' : 'learning';
  return `<div class="row" data-text="${esc(it.audio)}">
    <span class="dot ${dot}"></span>
    <div class="grow"><div class="am" lang="hy">${esc(it.am)}</div><div class="small muted">${esc(it.tr)} · ${esc(it.de)}</div></div>
    ${playBtns(it.audio)}
    ${S.settings.refMode ? refRecorderHtml(it.audio) : ''}
  </div>`;
}

function viewLesson(id) {
  const ls = lessonById(id);
  if (!ls) return '<p>Lektion nicht gefunden.</p>';
  const p = lessonProgress(ls);
  const fresh = ls.keys.filter(isNew).length;
  const items = ls.keys.map((k) => ITEMS.get(k));
  return `<a class="back" href="#/course">← Kurs</a>
  <h1>${esc(ls.title)}</h1>
  <p class="muted small">${esc(levelTitle(ls.level))} · ${p.seen}/${p.total} gelernt</p>
  ${ls.intro ? `<div class="card">${ls.intro}</div>` : ''}
  ${ls.tip ? `<div class="card tip">🗣️ <b>Aussprache:</b> ${ls.tip}</div>` : ''}
  ${ls.letters ? `<div class="card">Achte besonders auf die drei Reihen p/t/k (siehe <a href="#/pron/stops">Aussprache</a>).</div>` : ''}
  <button class="btn primary wide" data-go="lesson" data-id="${ls.id}">${fresh ? `▶ Lernen (${Math.min(7, fresh)} neue)` : '🔁 Lektion wiederholen'}</button>
  <h2>Inhalte</h2>
  <div class="list">${items.map(itemRow).join('')}</div>
  ${fresh ? `<button class="btn ghost wide" data-go="known" data-id="${ls.id}">Kenne ich schon – als gelernt markieren</button>` : ''}`;
}

function viewAlphabet() {
  return `<h1>Alphabet</h1>
  <p class="muted small">Tippe auf einen Buchstaben. 38 Buchstaben + Ligatur և, erfunden 405 n. Chr. von Mesrop Maschtoz.</p>
  <div class="grid">${ALPHABET.map((L) => {
    const st = srs(`L|${L.up}`);
    return `<button class="letter ${st ? (st.box >= 3 ? 'strong' : 'learning') : ''}" data-letter="${esc(L.up)}">
      <span lang="hy">${esc(L.up)}${L.up !== L.low ? ' ' + esc(L.low) : ''}</span><small>${esc(L.tr)}</small></button>`;
  }).join('')}</div>
  <div id="sheet"></div>`;
}
function letterSheet(up) {
  const L = LETTER[up];
  return `<div class="sheet-bg" data-close="1"></div><div class="sheet">
    <button class="close" data-close="1" aria-label="Schließen">✕</button>
    <div class="giant" lang="hy">${esc(L.up)}${L.up !== L.low ? ' ' + esc(L.low) : ''}</div>
    <p><b>Laut:</b> ${esc(L.tr)} &nbsp; <span class="muted">[${esc(L.ipa)}]</span></p>
    <p>${esc(L.hint)}</p>
    <p class="row-inline"><span class="muted">Name:</span> <b lang="hy">${esc(L.name)}</b> (${esc(translit(L.name))}) ${playBtns(L.name)}</p>
    <div class="card"><div class="am big" lang="hy">${esc(L.ex.am)}</div><div class="muted">${esc(translit(L.ex.am))} · ${esc(L.ex.de)}</div>
      <div class="row-inline">${playBtns(L.ex.am, true)}</div>
      ${breakdownHtml(L.ex.am)}
      ${recorderHtml(L.ex.am)}
    </div>
    ${S.settings.refMode ? refRecorderHtml(L.name) : ''}
  </div>`;
}

function viewPron(id) {
  if (!id) {
    return `<h1>Aussprache</h1>
    <p class="muted small">So gehst du vor: anhören → nachsprechen und aufnehmen → mit „⇄ Vergleich“ Original und eigene Aufnahme direkt nacheinander hören.</p>
    ${PRONUNCIATION.map((p) => `<a class="card link" href="#/pron/${p.id}"><b>${esc(p.title)}</b> <span class="muted">→</span></a>`).join('')}`;
  }
  const p = PRONUNCIATION.find((x) => x.id === id);
  return `<a class="back" href="#/pron">← Aussprache</a><h1>${esc(p.title)}</h1>
  <div class="card">${p.text}</div>
  <button class="btn primary wide" data-go="pron" data-id="${p.id}">▶ Nachsprechen üben</button>
  <div class="list">${p.words.map((w) => `<div class="row" data-text="${esc(w.am)}">
    <div class="grow"><div class="am" lang="hy">${esc(w.am)}</div><div class="small muted">${esc(translit(w.am))} · ${esc(w.de)}</div></div>
    ${playBtns(w.am)}${S.settings.refMode ? refRecorderHtml(w.am) : ''}</div>`).join('')}</div>`;
}

function viewSettings() {
  const hyVoices = voices.filter((v) => /^hy([-_]|$)/i.test(v.lang));
  return `<h1>Mehr</h1>
  <section class="card">
    <h3>Tagesziel</h3>
    <div class="seg">${[10, 15, 20].map((g) => `<button class="${S.settings.goal === g ? 'on' : ''}" data-goal="${g}">${g} Min.</button>`).join('')}</div>
  </section>
  <section class="card">
    <h3>Stimme & Audio</h3>
    <p class="small">${hasArmenianVoice() ? `✅ Armenische Stimme aktiv: <b>${esc(voice.name)}</b>` : '⚠️ Auf diesem Gerät wurde <b>keine armenische Stimme</b> gefunden.'}</p>
    <label class="small">Stimme
      <select id="voiceSel"><option value="">Automatisch (Armenisch bevorzugt)</option>
      ${hyVoices.concat(voices.filter((v) => !hyVoices.includes(v))).map((v) => `<option value="${esc(v.voiceURI)}" ${S.settings.voiceURI === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
      </select></label>
    <label class="small">Sprechtempo: <b id="rateV">${S.settings.rate.toFixed(2)}</b>
      <input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${S.settings.rate}"></label>
    <button class="btn ghost" data-act="play" data-text="Բարև, ինչպե՞ս եք">🔊 Test: „Բարև, ինչպե՞ս եք“</button>
    <details><summary class="small">Armenische Stimme bekommen – so geht’s</summary>
      <ul class="small">
        <li><b>Android:</b> Einstellungen → System → Sprache → Sprachausgabe → bevorzugte Engine → Sprachdaten installieren. Ob Armenisch angeboten wird, hängt von Engine und Gerät ab.</li>
        <li><b>iPhone/iPad:</b> iOS bietet derzeit meist keine armenische Stimme an. Prüfen unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen.</li>
        <li><b>PC:</b> Microsoft Edge stellt oft armenische Online-Stimmen bereit.</li>
        <li><b>Beste Lösung:</b> Lass eine Muttersprachlerin / einen Muttersprachler die Wörter unten im <b>Referenz-Modus</b> einsprechen. Diese Aufnahmen haben immer Vorrang.</li>
      </ul></details>
  </section>
  <section class="card">
    <h3>Muttersprachler-Aufnahmen</h3>
    <label class="switch"><input type="checkbox" id="refMode" ${S.settings.refMode ? 'checked' : ''}> Referenz-Modus (zeigt „● Referenz aufnehmen“ bei allen Wörtern)</label>
    <p class="small muted">${refKeys.size} Referenz-Aufnahmen gespeichert. Aufnahmen bleiben auf diesem Gerät, können aber exportiert und auf einem anderen Gerät importiert werden.</p>
    <div class="row-inline wrap">
      <button class="btn ghost small" data-go="exportRefs">⬇ Aufnahmen exportieren</button>
      <label class="btn ghost small">⬆ Aufnahmen importieren<input type="file" id="importRefs" accept=".json,application/json" hidden></label>
    </div>
  </section>
  <section class="card">
    <h3>Fortschritt</h3>
    <div class="row-inline wrap">
      <button class="btn ghost small" data-go="exportProg">⬇ Sichern</button>
      <label class="btn ghost small">⬆ Wiederherstellen<input type="file" id="importProg" accept=".json,application/json" hidden></label>
      <button class="btn ghost small danger" data-go="reset">Zurücksetzen</button>
    </div>
  </section>
  <section class="card small">
    <h3>Über die Inhalte</h3>
    <p>Die Kursinhalte (Ostarmenisch, Alphabet bis B1) wurden mit KI erstellt und sollten <b>muttersprachlich geprüft</b> werden. Korrekturen erfolgen zentral in <code>js/content.js</code>.</p>
    <p class="muted">Die Umschrift ist eine Lesehilfe: ' = behaucht (t' = deutsches t), ohne ' = unbehaucht, kh = ch wie in „Bach“, gh = Reibe-r, zh = j wie in „Journal“, j = dsch, ə = Murmel-e.</p>
  </section>`;
}

/* ---------------- Session-Ansicht ---------------- */
function renderSession() {
  const root = app();
  if (!SES) { location.hash = '#/home'; return; }
  if (SES.done) {
    const spent = (S.days[dayStr()] || 0) - SES.startSec;
    const reached = (S.days[dayStr()] || 0) >= goalSec();
    root.innerHTML = `<section class="card center done">
      <div class="giant">${reached ? '🎉' : '👏'}</div>
      <h1>Geschafft!</h1>
      <p>${SES.correct} von ${SES.answered} richtig · ${Math.max(1, Math.round(spent / 60))} Min.</p>
      <p>${reached ? 'Tagesziel erreicht – <span lang="hy">Ապրե՛ս</span>!' : `Noch ${Math.ceil((goalSec() - (S.days[dayStr()] || 0)) / 60)} Min. bis zum Tagesziel.`}</p>
      <button class="btn primary wide" data-go="home">Fertig</button>
      ${reached ? '' : '<button class="btn ghost wide" data-go="daily">Weiter üben</button>'}
    </section>`;
    return;
  }
  const e = SES.queue[SES.i];
  const it = itemFor(e);
  const pct = Math.round((SES.i / SES.queue.length) * 100);
  root.innerHTML = `<div class="ses-top">
      <button class="btn-icon" data-go="quit" aria-label="Beenden">✕</button>
      <div class="bar grow"><i style="width:${pct}%"></i></div>
      <span class="small muted" id="timer">${fmtMin(S.days[dayStr()] || 0)}</span>
    </div>
    <div id="ex" class="ex"></div>
    <div id="fb" class="fb"></div>`;
  const box = $('#ex');
  const R = EX[e.type] || EX['am-de'];
  R(box, it, e);
}

function feedback(ok, it, extra = '') {
  answer(ok);
  const fb = $('#fb');
  fb.className = `fb show ${ok ? 'ok' : 'bad'}`;
  fb.innerHTML = `<div class="fb-in">
    <div><b>${ok ? 'Richtig!' : 'Nicht ganz.'}</b> ${extra}</div>
    <div class="row-inline"><span class="am" lang="hy">${esc(it.am)}</span> ${playBtns(it.audio)}</div>
    <div class="small">${esc(it.tr)} · ${esc(it.de)}</div>
    <button class="btn primary wide" id="next">Weiter</button></div>`;
  $('#next').onclick = nextEx;
  if (it.kind !== 'letter' && audioAvailable(it.audio)) play(it.audio);
}

function mcQuestion(box, prompt, options, correct, it, optLang) {
  box.innerHTML = `${prompt}<div class="opts">${shuffle([correct, ...options]).map((o) =>
    `<button class="opt" ${optLang ? `lang="${optLang}"` : ''} data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  $$('.opt', box).forEach((b) => b.onclick = () => {
    if (box.dataset.answered) return;
    box.dataset.answered = '1';
    const ok = b.dataset.v === correct;
    b.classList.add(ok ? 'right' : 'wrong');
    if (!ok) $$('.opt', box).find((x) => x.dataset.v === correct).classList.add('right');
    feedback(ok, it);
  });
}

const EX = {
  intro(box, it) {
    const isL = it.kind === 'letter';
    box.innerHTML = `<p class="label">Neu ${isL ? '· Buchstabe' : ''}</p>
      <div class="card center">
        <div class="${isL ? 'giant' : 'am huge'}" lang="hy">${esc(it.am)}</div>
        <div class="tr">${esc(it.tr)}${isL ? ` <span class="muted">[${esc(it.letter.ipa)}]</span>` : ''}</div>
        <div class="de">${esc(it.de)}</div>
        <div class="row-inline center">${playBtns(it.audio, true)}</div>
        ${isL ? `<div class="small muted">Beispiel: <span lang="hy">${esc(it.letter.ex.am)}</span> (${esc(translit(it.letter.ex.am))}) – ${esc(it.letter.ex.de)} ${playBtns(it.letter.ex.am)}</div>` : breakdownHtml(it.am)}
        ${it.note ? `<p class="small">${esc(it.note)}</p>` : ''}
      </div>
      ${isL ? '' : recorderHtml(it.audio)}
      <button class="btn primary wide" id="next">Verstanden</button>`;
    $('#next').onclick = () => { answer(true); nextEx(); };
    if (audioAvailable(it.audio)) setTimeout(() => play(it.audio), 250);
  },
  'am-de'(box, it) {
    mcQuestion(box, `<p class="label">Was bedeutet das?</p><div class="prompt"><span class="am huge" lang="hy">${esc(it.am)}</span><div class="row-inline center">${playBtns(it.audio)}</div></div>`,
      distractors(it, 'de'), it.de, it);
  },
  'de-am'(box, it) {
    mcQuestion(box, `<p class="label">Wie sagt man auf Armenisch?</p><div class="prompt"><span class="de big">${esc(it.de)}</span></div>`,
      distractors(it, 'am'), it.am, it, 'hy');
  },
  listen(box, it) {
    mcQuestion(box, `<p class="label">Was hörst du?</p><div class="prompt"><div class="row-inline center">${playBtns(it.audio, true)}</div></div>`,
      distractors(it, 'am'), it.am, it, 'hy');
    setTimeout(() => play(it.audio), 250);
  },
  read(box, it) {
    mcQuestion(box, `<p class="label">Lies das Wort – wie spricht man es?</p><div class="prompt"><span class="am huge" lang="hy">${esc(it.am)}</span></div>`,
      distractors(it, 'tr'), it.tr, it);
  },
  'letter-sound'(box, it) {
    mcQuestion(box, `<p class="label">Welcher Laut ist das?</p><div class="prompt"><span class="giant" lang="hy">${esc(it.am)}</span></div>`,
      distractors(it, 'tr'), it.tr, it);
  },
  'sound-letter'(box, it) {
    mcQuestion(box, `<p class="label">Welcher Buchstabe?</p><div class="prompt"><span class="tr big">${esc(it.tr)}</span><div class="small muted">${esc(it.de)}</div></div>`,
      distractors(it, 'am'), it.am, it, 'hy');
  },
  build(box, it) {
    const words = it.am.split(/\s+/);
    let chosen = [];
    const draw = () => {
      box.innerHTML = `<p class="label">Bilde den Satz</p>
        <div class="prompt"><span class="de big">${esc(it.de)}</span></div>
        <div class="answer-line" lang="hy">${chosen.map((i, n) => `<button class="tile in" data-n="${n}">${esc(words[i])}</button>`).join('') || '<span class="muted small">Tippe die Wörter in der richtigen Reihenfolge</span>'}</div>
        <div class="tiles" lang="hy">${order.map((i) => `<button class="tile" data-i="${i}" ${chosen.includes(i) ? 'disabled' : ''}>${esc(words[i])}</button>`).join('')}</div>
        <button class="btn primary wide" id="check" ${chosen.length === words.length ? '' : 'disabled'}>Prüfen</button>`;
      $$('.tile[data-i]', box).forEach((b) => b.onclick = () => { chosen.push(+b.dataset.i); draw(); });
      $$('.tile[data-n]', box).forEach((b) => b.onclick = () => { if (!box.dataset.answered) { chosen.splice(+b.dataset.n, 1); draw(); } });
      const c = $('#check');
      if (c) c.onclick = () => {
        box.dataset.answered = '1'; c.remove();
        const ok = chosen.map((i) => words[i]).join(' ') === words.join(' ');
        $$('.tile', box).forEach((b) => { b.disabled = true; });
        feedback(ok, it);
      };
    };
    let order = shuffle(words.map((_, i) => i));
    if (words.length > 1 && order.every((v, i) => v === i)) order = order.reverse();
    draw();
  },
  speak(box, it) {
    const avail = audioAvailable(it.audio);
    box.innerHTML = `<p class="label">Aussprache: hören & nachsprechen</p>
      <div class="card center">
        <div class="am huge" lang="hy">${esc(it.am)}</div>
        <div class="tr">${esc(it.tr)}</div>
        <div class="de">${esc(it.de)}</div>
        <div class="row-inline center">${playBtns(it.audio, true)}</div>
        ${avail ? '' : '<p class="small warn-t">Keine Referenz-Audio verfügbar – orientiere dich an der Laut-für-Laut-Hilfe.</p>'}
        ${breakdownHtml(it.am)}
      </div>
      ${recorderHtml(it.audio)}
      <p class="small muted center">Wie klang es im Vergleich?</p>
      <div class="row-inline two">
        <button class="btn ghost" id="again">🔁 Nochmal üben</button>
        <button class="btn primary" id="good">👍 Klang gut</button>
      </div>`;
    $('#good').onclick = () => { answer(true); nextEx(); };
    $('#again').onclick = () => { answer(false); nextEx(); };
    if (avail) setTimeout(() => play(it.audio), 250);
  },
};

/* ================================================================== */
/* Router & globale Aktionen                                           */
/* ================================================================== */
function route() {
  stopAudio();
  const [, view = 'home', arg] = location.hash.split('/');
  activeView = view;
  $$('nav a').forEach((a) => a.classList.toggle('on', a.dataset.v === view || (view === 'lesson' && a.dataset.v === 'course')));
  document.body.classList.toggle('in-session', view === 'session');
  const r = app();
  switch (view) {
    case 'session': renderSession(); break;
    case 'course': r.innerHTML = viewCourse(); break;
    case 'lesson': r.innerHTML = viewLesson(arg); break;
    case 'alphabet': r.innerHTML = viewAlphabet(); break;
    case 'pron': r.innerHTML = viewPron(arg); break;
    case 'settings': r.innerHTML = viewSettings(); bindSettings(); break;
    default: activeView = 'home'; r.innerHTML = viewHome();
  }
  window.scrollTo(0, 0);
}

function download(name, data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
const blobToDataUrl = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const readFileText = (f) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(f); });

function bindSettings() {
  $$('[data-goal]').forEach((b) => b.onclick = () => { S.settings.goal = +b.dataset.goal; save(); route(); });
  $('#voiceSel').onchange = (e) => { S.settings.voiceURI = e.target.value; save(); pickVoice(); route(); };
  $('#rate').oninput = (e) => { S.settings.rate = +e.target.value; $('#rateV').textContent = S.settings.rate.toFixed(2); save(); };
  $('#refMode').onchange = (e) => { S.settings.refMode = e.target.checked; save(); toast(e.target.checked ? 'Referenz-Modus an: In Lektionen kann jetzt aufgenommen werden.' : 'Referenz-Modus aus'); };
  $('#importRefs').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await readFileText(f));
      let n = 0;
      for (const [k, url] of Object.entries(data.refs || {})) { const blob = await (await fetch(url)).blob(); await DB.put(k, blob); refKeys.add(k); n++; }
      toast(`${n} Aufnahmen importiert`); route();
    } catch (err) { toast('Datei konnte nicht gelesen werden.'); }
  };
  $('#importProg').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await readFileText(f));
      if (!data.srs) throw new Error();
      S = { ...DEFAULTS, ...data, settings: { ...DEFAULTS.settings, ...data.settings } }; save(); toast('Fortschritt wiederhergestellt'); route();
    } catch (err) { toast('Ungültige Datei.'); }
  };
}

document.addEventListener('click', async (ev) => {
  const g = ev.target.closest('[data-go]');
  if (g) {
    const a = g.dataset.go, id = g.dataset.id;
    if (a === 'daily') startSession(buildDaily(), 'Tagestraining');
    else if (a === 'lesson') startSession(buildLesson(id), lessonById(id).title, `#/lesson/${id}`);
    else if (a === 'pron') startSession(buildPron(id), 'Aussprache', `#/pron/${id}`);
    else if (a === 'home') { const back = SES ? SES.back : '#/home'; SES = null; location.hash = back; }
    else if (a === 'quit') {
      if (confirm('Training beenden? Bisherige Antworten werden gespeichert.')) { finishSession(); const back = SES.back; SES = null; location.hash = back; }
    } else if (a === 'known') {
      lessonById(id).keys.forEach((k) => { if (isNew(k)) S.srs[k] = { box: 3, due: addDays(dayStr(), 4), ok: 1, bad: 0 }; });
      save(); route();
    } else if (a === 'exportProg') download(`armenisch-fortschritt-${dayStr()}.json`, S);
    else if (a === 'exportRefs') {
      const keys = await DB.keys(); const refs = {};
      for (const k of keys) refs[k] = await blobToDataUrl(await DB.get(k));
      download(`armenisch-aufnahmen-${dayStr()}.json`, { refs });
    } else if (a === 'reset') {
      if (confirm('Wirklich den gesamten Lernfortschritt löschen? (Aufnahmen bleiben erhalten)')) { S = structuredClone(DEFAULTS); save(); route(); }
    }
    return;
  }
  const l = ev.target.closest('[data-letter]');
  if (l) { $('#sheet').innerHTML = letterSheet(l.dataset.letter); return; }
  if (ev.target.closest('[data-close]')) { stopAudio(); $('#sheet').innerHTML = ''; }
});

window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

/* ================================================================== */
/* Start                                                               */
/* ================================================================== */
(async function init() {
  pickVoice();
  if ('speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { pickVoice(); if (['home', 'settings'].includes(activeView)) route(); };
  try { refKeys = new Set(await DB.keys()); } catch (e) { /* IndexedDB nicht verfügbar */ }
  try { const r = await fetch('audio/manifest.json', { cache: 'no-cache' }); if (r.ok) manifest = await r.json(); } catch (e) { /* keine Dateien */ }
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();

// Für Tests
window.__AL = { translit, breakdown, ITEMS, LESSONS, buildDaily };
