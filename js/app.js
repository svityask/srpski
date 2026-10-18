'use strict';
(() => {
  // ---------- утилиты ----------
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const words = (s) => s.trim().split(/\s+/).length;
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const DAY = 864e5;
  const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many; };

  // ---------- алфавиты ----------
  const L2C_DI = { lj: 'љ', nj: 'њ', 'dž': 'џ' };
  const L2C = { a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', 'đ': 'ђ', e: 'е', 'ž': 'ж', z: 'з', i: 'и', j: 'ј', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', 'ć': 'ћ', u: 'у', f: 'ф', h: 'х', c: 'ц', 'č': 'ч', 'š': 'ш' };
  const isUp = (ch) => ch !== ch.toLowerCase();
  function toCyr(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const di = L2C_DI[s.substr(i, 2).toLowerCase()];
      if (di) { out += isUp(s[i]) ? di.toUpperCase() : di; i++; continue; }
      const c = L2C[s[i].toLowerCase()];
      out += c ? (isUp(s[i]) ? c.toUpperCase() : c) : s[i];
    }
    return out;
  }
  // ввод: сербская кириллица и русская раскладка → латиница
  const C2L = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't', ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š', й: 'j', ы: 'i', э: 'e', я: 'ja', ю: 'ju', ё: 'jo', ь: '', ъ: '', щ: 'š' };
  const toLat = (s) => s.replace(/[Ѐ-ӿ]/g, (ch) => { const r = C2L[ch.toLowerCase()]; return r === undefined ? ch : r; });
  const norm = (s) => toLat(s.toLowerCase()).replace(/[.,!?¿¡;:"«»()…–—-]/g, ' ').replace(/\s+/g, ' ').trim();
  const bare = (s) => norm(s).replace(/đ/g, 'dž').replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/dj/g, 'dz').replace(/lj/g, 'l').replace(/nj/g, 'n');

  // подсказка произношения русскими буквами
  const VOW = 'aeiou';
  const LETTER = /[a-zčćžšđ]/;
  const RU = { a: 'а', b: 'б', v: 'в', g: 'г', d: 'д', 'đ': 'дж', 'ž': 'ж', z: 'з', i: 'и', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р', s: 'с', t: 'т', 'ć': 'ч', u: 'у', f: 'ф', h: 'х', c: 'ц', 'č': 'ч', 'š': 'ш' };
  function pron(s) {
    let out = '';
    const lo = s.toLowerCase();
    for (let i = 0; i < s.length; i++) {
      const ch = lo[i], two = lo.substr(i, 2), prev = i ? lo[i - 1] : '', nx = lo[i + 1] || '';
      let r;
      if (two === 'lj' || two === 'nj') {
        const base = two === 'lj' ? 'л' : 'н', v = lo[i + 2] || '';
        if (v && VOW.includes(v)) { r = base + { a: 'я', e: 'е', i: 'и', o: 'ё', u: 'ю' }[v]; i += 2; } else { r = base + 'ь'; i++; }
      } else if (two === 'dž') { r = 'дж'; i++; }
      else if (ch === 'j') {
        if (nx && VOW.includes(nx)) { r = (LETTER.test(prev) && !VOW.includes(prev) ? 'ь' : '') + { a: 'я', e: 'е', u: 'ю', o: 'йо', i: 'йи' }[nx]; i++; } else r = 'й';
      } else if (ch === 'e') r = !LETTER.test(prev) || VOW.includes(prev) ? 'э' : 'е';
      else r = RU[ch] !== undefined ? RU[ch] : s[i];
      out += r;
    }
    return out;
  }

  // ---------- курс ----------
  const COURSE = window.COURSE;
  const ITEMS = [], BY_ID = {};
  COURSE.forEach((u, ui) => {
    u.n = ui + 1;
    u.lessons.forEach((l) => {
      l.unit = u;
      l.items = l.items.map((a) => {
        const it = { id: l.id + '|' + a[0], sr: a[0], ru: a[1], note: a[2] || '', lesson: l, unit: u, alts: a[0].split(' / ').map((x) => x.trim()) };
        it.say = it.alts[0];
        it.multi = words(it.say) > 1;
        ITEMS.push(it); BY_ID[it.id] = it;
        return it;
      });
    });
  });
  const LESSONS = COURSE.flatMap((u) => u.lessons);

  // слова, которые звучат как русские: сравниваем подсказку произношения с переводом
  const lev = (a, b) => {
    let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  };
  const ruNorm = (s) => s.toLowerCase().replace(/ё/g, 'е').replace(/\(.*?\)/g, '').replace(/[^а-я ]/g, '').replace(/\s+/g, ' ').trim();
  // кухня и названия — просто транслитерация, ложные друзья — ловушки, а не подсказки
  const SAME_SKIP = new Set(['4.4', '10.2']);
  const SAME = ITEMS.filter((it) => !SAME_SKIP.has(it.lesson.id) && !/Ловушка|Не «/.test(it.note) && !/\(/.test(it.ru.replace(/\(\d+\)/, '')))
    .map((it) => { const p = ruNorm(pron(it.say)); return { it, d: Math.min(...it.ru.split('/').map(ruNorm).filter(Boolean).map((r) => lev(p, r))) }; })
    .filter((x) => x.d <= 1)
    .sort((a, b) => a.d - b.d);

  // ---------- состояние ----------
  const KEY = 'srpski.v1';
  const DEF = { script: 'lat', both: true, autoplay: true, sfx: true, rate: 0.9, theme: 'system', goal: 20, cards: {}, cardsTopic: 'all', cardsShuffle: true, xp: 0, xpd: {}, days: [], lessons: {}, tests: {}, words: {}, cases: {}, gram: {}, reads: {}, dlg: {}, topics: {}, exams: {}, daily: {} };
  let S;
  try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = Object.assign({}, DEF); }
  ['cases', 'gram', 'reads', 'dlg', 'topics', 'exams', 'daily'].forEach((k) => { if (!S[k] || typeof S[k] !== 'object') S[k] = {}; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* хранилище недоступно — работаем без него */ } };

  const sr = (t) => (S.script === 'cyr' ? toCyr(t) : t);
  const sr2 = (t) => (S.script === 'cyr' ? t : toCyr(t));

  function addXP(n) {
    S.xp += n;
    S.xpd = S.xpd || {};
    S.xpd[today()] = (S.xpd[today()] || 0) + n;
    const keys = Object.keys(S.xpd).sort(); while (keys.length > 60) delete S.xpd[keys.shift()];
  }
  const xpToday = () => (S.xpd && S.xpd[today()]) || 0;
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme === 'light' || S.theme === 'dark') r.dataset.theme = S.theme; else delete r.dataset.theme;
  }
  function streak() {
    const set = new Set(S.days);
    let d = new Date(); let n = 0;
    const key = (x) => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
    if (!set.has(key(d))) d = new Date(d - DAY);
    while (set.has(key(d))) { n++; d = new Date(d - DAY); }
    return n;
  }
  function seenIds() { return Object.keys(S.words).filter((id) => BY_ID[id]); }
  function dueIds() { const now = Date.now(); return seenIds().filter((id) => (S.words[id].due || 0) <= now); }
  const GAPS = [0, 1, 2, 4, 8, 16, 32];
  function mark(it, ok) {
    const w = S.words[it.id] || (S.words[it.id] = { box: 0, due: 0, wrong: 0 });
    if (ok) { w.box = Math.min(w.box + 1, GAPS.length - 1); w.due = Date.now() + GAPS[w.box] * DAY; }
    else { w.box = 0; w.due = 0; w.wrong = (w.wrong || 0) + 1; }
  }
  function touch(it) { if (!S.words[it.id]) S.words[it.id] = { box: 0, due: Date.now() + DAY, wrong: 0 }; }
  function markDay() { if (!S.days.includes(today())) S.days.push(today()); S.days = S.days.slice(-400); }
  function nextStep() {
    for (const u of COURSE) {
      for (const l of u.lessons) if (!S.lessons[l.id]) return { kind: 'lesson', l };
      if (!(S.tests[u.id] && S.tests[u.id].passed)) return { kind: 'test', u };
    }
    return null;
  }

  // ---------- озвучка ----------
  const tts = { voice: null, has: 'speechSynthesis' in window };
  function pickVoice() {
    if (!tts.has) return;
    const vs = speechSynthesis.getVoices();
    for (const re of [/^sr/i, /^hr/i, /^bs/i]) { const v = vs.find((x) => re.test(x.lang)); if (v) { tts.voice = v; return; } }
  }
  if (tts.has) { pickVoice(); speechSynthesis.addEventListener('voiceschanged', () => { pickVoice(); if (view === 'more') render(); }); }
  function speak(text, slow) {
    if (!tts.has) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text.split(' / ')[0]);
      if (tts.voice) { u.voice = tts.voice; u.lang = tts.voice.lang; } else u.lang = 'sr-RS';
      u.rate = (slow ? 0.6 : 1) * S.rate;
      speechSynthesis.speak(u);
    } catch (e) { /* без звука */ }
  }
  let actx;
  function beep(ok) {
    if (!S.sfx) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime;
      (ok ? [660, 990] : [196, 165]).forEach((f, k) => {
        const o = actx.createOscillator(), g = actx.createGain(), s = t + k * 0.09;
        o.type = ok ? 'sine' : 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.16, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
        o.connect(g); g.connect(actx.destination); o.start(s); o.stop(s + 0.22);
      });
    } catch (e) { /* без звука */ }
  }

  // ---------- иконки ----------
  const I = {
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    learn: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2" fill="currentColor"/></svg>',
    cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="8.5" cy="14" r="1.1" fill="currentColor"/><circle cx="12" cy="14" r="1.1" fill="currentColor"/><circle cx="15.5" cy="14" r="1.1" fill="currentColor"/><circle cx="8.5" cy="17.2" r="1.1" fill="currentColor"/><circle cx="12" cy="17.2" r="1.1" fill="currentColor"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3l1.6 4.6L16 9.2l-4.4 1.6L10 15.4 8.4 10.8 4 9.2l4.4-1.6zM17.5 13.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z M9 4.5v13M15 6.5v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    cap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 9.5L12 5l9.5 4.5L12 14z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5M21.5 9.5V14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    dumb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 7.5v9M4 9.5v5M17.5 7.5v9M20 9.5v5M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M7 9.5h.01M10.5 9.5h.01M14 9.5h.01M17 9.5h.01M7 12.5h.01M10.5 12.5h.01M14 12.5h.01M17 12.5h.01M8 15.5h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h11a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 3v-3H4A1.5 1.5 0 0 1 2.5 13V7A1.5 1.5 0 0 1 4 5.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M16.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 20 17.5h-1v2.5l-3-2.5h-3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    read: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5zM12 6.5v13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    phones: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15v-3a8 8 0 0 1 16 0v3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="3" y="14" width="5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="16" y="14" width="5" height="6.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1L19 8a2.1 2.1 0 0 0-3-3L5 16z M14 7l3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    scroll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h11a2 2 0 0 1 2 2v1h-4M7 4a2 2 0 0 0-2 2v12a2 2 0 0 1-2 2h11a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2M9 9h4M9 13h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sprout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21v-8M12 13c0-4 3-6.5 7.5-6.5 0 4-3 6.5-7.5 6.5zM12 15c0-3-2.5-5-6.5-5 0 3 2.5 5 6.5 5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6z M14 3v4h4 M9 12h6M9 16h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.5v6M9.5 11l2.5 2.5 2.5-2.5M10 18.5h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    abc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18l4-11 4 11M4.5 14h5M14 7h4a2.5 2.5 0 0 1 0 5h-4zM14 12h4.5a3 3 0 0 1 0 6H14z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>',
    speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    slow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 16c0-4.4 3.6-8 8-8s8 3.6 8 8H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M19 13h2.5M7 16v3M15 16v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    route: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="5" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="18" cy="19" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 7.5v3a3 3 0 0 0 3 3h6a3 3 0 0 1 3 3v0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    cycle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 0 1-14.3 4.9M4 12A8 8 0 0 1 18.3 7.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M19 3v4.5h-4.5M5 21v-4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 8h8M8 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    cup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 21h8M9.5 18h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c4 0 7-2.8 7-6.8 0-3.3-2-5.6-3.6-7.4-.3 1.8-1.2 3-2.4 3.6.3-3.6-1.3-6.6-4-8.4.2 3.2-1.5 5.1-3 6.9C4.8 11.3 5 13 5 15.2 5 19.2 8 22 12 22z" fill="currentColor"/></svg>',
    star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/></svg>',
    cards: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3h10.5A2.5 2.5 0 0 1 21 5.5V16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  const stars = (n) => '<span class="stars" aria-label="' + n + ' из 3">' + [1, 2, 3].map((k) => '<i class="' + (k <= n ? 'on' : '') + '">' + I.star + '</i>').join('') + '</span>';

  function plate(text, cls = '') {
    const len = text.length, size = len > 24 ? 'p-l' : len > 13 ? 'p-m' : 'p-s';
    return '<div class="plate ' + size + ' ' + cls + '"><span class="p1" lang="sr">' + esc(sr(text)) + '</span>' + (S.both ? '<span class="p2" lang="sr">' + esc(sr2(text)) + '</span>' : '') + '</div>';
  }
  const sayBtns = (text) => tts.has ? '<div class="say"><button class="ic" data-say="' + esc(text) + '" aria-label="Послушать">' + I.speak + '</button><button class="ic" data-say="' + esc(text) + '" data-slow="1" aria-label="Послушать медленно">' + I.slow + '</button></div>' : '';

  // ---------- главные экраны ----------
  let view = 'course', arg = null;
  try { view = localStorage.getItem('srpski.view') || 'course'; arg = localStorage.getItem('srpski.arg') || null; } catch (e) { /* по умолчанию курс */ }
  // экраны раздела «Учиться» подсвечивают его вкладку
  const TAB_OF = { map: 'learn', level: 'learn', cases: 'learn', grammar: 'learn', gram: 'learn', dialogs: 'learn', dialog: 'learn', reading: 'learn', read: 'learn', speak: 'learn', garden: 'learn', cheat: 'learn', wod: 'learn', drill: 'learn', exams: 'learn', cards: 'learn' };
  let dictTab = 'words', dictQ = '';
  const main = $('#main');

  // анонимная статистика: какие разделы проходят — без имён, адресов и прогресса (только на сайте Cloudflare, где есть API)
  const APP_VER = 'srpski-11';
  const standalone = () => !!(navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches));
  const API_ON = location.protocol === 'https:' && /\.workers\.dev$/.test(location.hostname);
  function track(e, d, n) {
    if (!API_ON) return;
    try { navigator.sendBeacon('api/e', JSON.stringify({ e, d: d || '', n: n || 0, sa: standalone() ? 1 : 0 })); } catch (er) { /* не важно */ }
  }
  // новая версия приложения скачана — перезагружаемся, как только человек не в уроке
  let updReady = false;
  function render() {
    if (updReady && !document.body.classList.contains('playing')) { location.reload(); return; }
    applyTheme();
    const V = { course: vCourse, learn: vLearn, review: vReview, cards: vCards, dict: vDict, more: vMore, map: vMap, level: vLevel, cases: vCases, grammar: vGrammar, gram: vGram, dialogs: vDialogs, dialog: vDialog, reading: vReading, read: vRead, speak: vSpeak, garden: vGarden, cheat: vCheat, wod: vWod, drill: vDrill, exams: vExams };
    if (!V[view]) view = 'course';
    const tab = TAB_OF[view] || view;
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === tab ? 'page' : 'false'));
    try { localStorage.setItem('srpski.view', view); localStorage.setItem('srpski.arg', arg || ''); } catch (e) { /* не важно */ }
    main.innerHTML = V[view](arg);
    if (view === 'cards') bindCards();
    if (view === 'dict') bindDict();
  }

  // приветствие по времени суток — сразу по-сербски
  function greet() {
    const h = new Date().getHours();
    return h < 5 ? ['Laku noć', 'Спокойной ночи'] : h < 11 ? ['Dobro jutro', 'Доброе утро'] : h < 18 ? ['Dobar dan', 'Добрый день'] : ['Dobro veče', 'Добрый вечер'];
  }
  // слово дня — одно на всех в этот день, как в соцсетях
  const DAILY = ITEMS.filter((it) => words(it.say) <= 3 && !/\(\d+\)/.test(it.ru));
  // номер дня по местному календарю: слово меняется в полночь, а не по UTC
  const dayNo = () => { const d = new Date(); return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY); };
  // порядок слов перемешан один раз (детерминированно), чтобы соседние дни были из разных тем
  const seeded = (arr, seed) => { const a = arr.slice(); let x = seed; for (let i = a.length - 1; i > 0; i--) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const DAILY_ORDER = seeded(DAILY, 20261012);
  const wordOfDay = () => DAILY_ORDER[dayNo() % DAILY_ORDER.length];
  function ring(val, max, inner) {
    const r = 26, c = 2 * Math.PI * r, f = Math.min(1, val / max);
    return '<div class="ring" role="img" aria-label="Цель дня: ' + val + ' из ' + max + ' XP"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="' + r + '" class="ring-bg"/><circle cx="32" cy="32" r="' + r + '" class="ring-fg' + (f >= 1 ? ' full' : '') + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - f)).toFixed(1) + '"/></svg><span>' + inner + '</span></div>';
  }

  // подсказка «на экран Домой»: в браузере прогресс может пропасть, на иконке — хранится надёжно
  function installTip() {
    const standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    if (standalone) return '';
    const ua = navigator.userAgent, inApp = /Instagram|FBAN|FBAV|Telegram/i.test(ua), ios = /iPhone|iPad|iPod/.test(ua);
    if (S.installHide && !inApp) return '';
    const txt = inApp ? 'Вы во встроенном браузере — здесь прогресс может пропасть. Нажмите <b>•••</b> → <b>«Открыть в браузере»</b>, а там добавьте Srpski на экран «Домой».'
      : ios ? 'Чтобы прогресс не пропал, добавьте Srpski на экран «Домой»: <b>«Поделиться»</b> → <b>«На экран „Домой“»</b>. Потом заходите с иконки — так приложение работает и без интернета.'
        : 'Чтобы прогресс не пропал, установите приложение: меню браузера → <b>«Добавить на главный экран»</b>.';
    return '<section class="itip" role="note"><span class="itip-ic">' + I.phone + '</span><p>' + txt + '</p>' + (inApp ? '' : '<button class="btn sm" data-act="itiphide">Понятно</button>') + '</section>';
  }
  function vCourse() {
    const st = streak(), nx = nextStep();
    const doneL = LESSONS.filter((l) => S.lessons[l.id]).length;
    const [g, gru] = greet(), xt = xpToday(), goal = S.goal || 20;
    const wd = wordOfDay();
    let h = appbar() + installTip() + '<header class="hello"><div class="hello-t"><p class="eyebrow">' + new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p>' +
      '<h1 lang="sr">' + esc(sr(g)) + '!</h1><p class="hello-ru">' + gru + ' · ' + (xt >= goal ? 'цель дня выполнена 🎉' : 'сегодня ' + xt + ' из ' + goal + ' XP') + '</p></div>' +
      ring(xt, goal, I.flame + '<b>' + st + '</b>') + '</header>';
    h += '<div class="stats"><span><b>' + st + '</b> ' + plural(st, 'день', 'дня', 'дней') + ' подряд</span><span><b>' + S.xp + '</b> XP всего</span><span><b>' + seenIds().length + '</b> ' + plural(seenIds().length, 'слово', 'слова', 'слов') + ' знакомо</span></div>';
    const run = loadRun();
    if (run) {
      const total = run.q.length, at = Math.min(run.i + 1 + (run.answered ? 1 : 0), total);
      const lab = run.kind === 'lesson' ? 'Урок ' + run.ref + ' · ' + run.title : run.title;
      h += '<button class="next" data-act="resume"><span class="eyebrow">Продолжить с места остановки</span><span class="next-t">' + esc(lab) + '</span><span class="next-go">' + (run.intro ? 'Начать' : at + '/' + total) + '</span></button>';
    } else if (nx) {
      const lab = nx.kind === 'lesson' ? 'Урок ' + nx.l.id + ' · ' + nx.l.title : 'Тест юнита ' + nx.u.n + ' · ' + nx.u.title;
      h += '<button class="next" data-' + (nx.kind === 'lesson' ? 'lesson="' + nx.l.id : 'test="' + nx.u.id) + '"><span class="eyebrow">' + (doneL ? 'Дальше по курсу' : 'Первый урок') + '</span><span class="next-t">' + esc(lab) + '</span><span class="next-go">Начать</span></button>';
    } else h += '<div class="next done"><span class="eyebrow">Курс пройден</span><span class="next-t">Bravo! Повторяйте слова во вкладке «Повтор».</span></div>';
    const dd = S.daily[today()], due = dueIds().length, L = curLevel(), lst = levelStats(L);
    h += '<div class="quick"><button class="q' + (dd ? ' done' : '') + '" data-start="daily">' + I.spark + '<b>Урок дня</b><small>' + (dd ? 'выполнен ✓' : '10 заданий') + '</small></button>' +
      '<button class="q" ' + (due ? 'data-review="due"' : 'data-go="review"') + '>' + I.cycle + '<b>Повтор</b><small>' + (due ? due + ' ' + plural(due, 'слово', 'слова', 'слов') : 'всё повторено') + '</small></button>' +
      '<button class="q" data-nav="level" data-arg="' + L.id + '">' + I.map + '<b>Уровень ' + L.id + '</b><small>' + lst.total + '% пройдено</small></button></div>';
    h += '<section class="wod"><div class="wod-h"><p class="eyebrow">Слово дня</p>' + sayBtns(wd.say) + '</div>' + plate(wd.sr, 'sm') +
      '<p class="wod-ru">' + esc(wd.ru) + '</p><p class="wod-pr">[' + esc(pron(wd.say)) + '] · урок «' + esc(wd.lesson.title) + '»</p></section>';
    h += '<div class="course-h"><h2>Маршрут курса</h2><span>' + doneL + ' / ' + LESSONS.length + '</span></div>' +
      '<div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="' + LESSONS.length + '" aria-valuenow="' + doneL + '"><i style="width:' + (doneL / LESSONS.length) * 100 + '%"></i></div>';
    for (const u of COURSE) {
      const t = S.tests[u.id];
      const n = u.lessons.filter((l) => S.lessons[l.id]).length;
      h += '<section class="unit" id="' + u.id + '" style="--uc:var(--l' + u.n + ')"><div class="unit-h"><span class="line">' + u.n + '</span><div class="unit-t"><h2>' + esc(u.title) + '</h2><p lang="sr">' + esc(sr(u.sr)) + ' · ' + n + '/' + u.lessons.length + '</p></div>' + (t && t.passed ? '<span class="unit-ok">' + I.cup + '</span>' : '') + '</div><ol class="stops">';
      for (const l of u.lessons) {
        const r = S.lessons[l.id];
        h += '<li class="stop ' + (r ? 'done' : '') + '"><button data-lesson="' + l.id + '"><span class="dot">' + (r ? I.check : '') + '</span><span class="stop-t"><b>' + esc(l.title) + '</b><small>Урок ' + l.id + ' · ' + l.items.length + ' ' + plural(l.items.length, 'фраза', 'фразы', 'фраз') + '</small></span>' + (r ? stars(r.stars) : '') + '</button></li>';
      }
      h += '<li class="stop test ' + (t && t.passed ? 'done' : '') + '"><button data-test="' + u.id + '"><span class="dot">' + I.cup + '</span><span class="stop-t"><b>Тест юнита</b><small>' + (t ? (t.passed ? 'Сдан' : 'Не сдан') + ' · лучший ' + t.best + '%' : 'Нужно 80% верных ответов') + '</small></span></button></li></ol></section>';
    }
    return h;
  }

  function vReview() {
    const seen = seenIds(), due = dueIds();
    let h = '<header class="top"><div><p class="eyebrow">Повтор</p><h1>Интервальное повторение</h1></div></header>';
    if (!seen.length) return h + '<div class="empty"><p>Здесь появятся слова из пройденных уроков. Приложение напомнит каждое в нужный момент: через день, два, четыре, восемь…</p><button class="btn primary" data-go="course">К первому уроку</button></div>';
    const boxes = [0, 0, 0, 0, 0, 0, 0];
    seen.forEach((id) => boxes[S.words[id].box]++);
    h += '<div class="rv"><div class="rv-n"><b>' + due.length + '</b><span>' + plural(due.length, 'слово ждёт', 'слова ждут', 'слов ждут') + ' повтора</span></div>' +
      '<button class="btn primary" data-review="due"' + (due.length ? '' : ' disabled') + '>Повторить ' + Math.min(due.length, 12) + '</button>' +
      (due.length ? '' : '<button class="btn" data-review="any">Повторить слабые слова</button>') + '</div>';
    const labels = ['новые', '1 д', '2 д', '4 д', '8 д', '16 д', '32 д'];
    const max = Math.max(...boxes, 1);
    h += '<h3 class="sub">Как держатся слова в памяти</h3><div class="boxes">' + boxes.map((n, k) => '<div class="box"><span class="box-n">' + n + '</span><i style="height:' + Math.max(4, (n / max) * 72) + 'px"></i><span class="box-l">' + labels[k] + '</span></div>').join('') + '</div><p class="hint">Колонка — через сколько дней слово вернётся на повтор. Ошибка отправляет слово в начало.</p>';
    const hard = seen.filter((id) => S.words[id].wrong).sort((a, b) => S.words[b].wrong - S.words[a].wrong).slice(0, 12);
    if (hard.length) {
      h += '<h3 class="sub">Чаще всего ошибки</h3><ul class="list">' + hard.map((id) => { const it = BY_ID[id]; return '<li><button data-say="' + esc(it.say) + '"><span lang="sr">' + esc(sr(it.sr)) + '</span><small>' + esc(it.ru) + '</small><em>' + S.words[id].wrong + '×</em></button></li>'; }).join('') + '</ul>';
    }
    return h;
  }

  function vDict() {
    let h = '<header class="top"><div><p class="eyebrow">Справочник</p><h1>Словарь</h1></div></header>' +
      '<div class="seg" role="tablist"><button role="tab" data-dtab="same" aria-selected="' + (dictTab === 'same') + '">Как по-русски</button><button role="tab" data-dtab="words" aria-selected="' + (dictTab === 'words') + '">Фразы</button><button role="tab" data-dtab="abc" aria-selected="' + (dictTab === 'abc') + '">Азбука</button></div>';
    if (dictTab === 'same') {
      const card = (x) => '<button data-say="' + esc(x.it.say) + '"><span lang="sr">' + esc(sr(x.it.sr)) + '</span><small>' + esc(x.it.ru.replace(/ \(\d+\)/, '')) + '</small></button>';
      const exact = SAME.filter((x) => !x.d), near = SAME.filter((x) => x.d);
      return h + '<p class="hint">' + SAME.length + ' ' + plural(SAME.length, 'слово', 'слова', 'слов') + ' из курса вы уже знаете — они звучат как русские. Нажмите, чтобы послушать.</p>' +
        '<h3 class="sub">Совпадают полностью · ' + exact.length + '</h3><div class="same">' + exact.map(card).join('') + '</div>' +
        '<h3 class="sub">Отличаются одной буквой · ' + near.length + '</h3><div class="same near">' + near.map(card).join('') + '</div>';
    }
    if (dictTab === 'abc') {
      h += '<p class="hint">Сербский пишется и кириллицей, и латиницей: одна буква — один звук. Вывески и меню чаще на латинице, документы — на кириллице.</p><div class="abc">' +
        window.ALPHABET.map((a) => '<button class="abc-c" data-say="' + esc(a[1]) + '"><b lang="sr">' + a[0] + '</b><span lang="sr">' + a[1] + '</span><small>' + esc(a[2]) + '</small></button>').join('') + '</div>';
      return h;
    }
    h += '<label class="search"><span class="vh">Поиск</span><input id="dq" type="search" placeholder="Поиск по-русски или по-сербски" value="' + esc(dictQ) + '" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></label><div id="dres">' + dictList() + '</div>';
    return h;
  }
  function dictList() {
    const q = dictQ.trim().toLowerCase(), qb = q ? bare(q) : '';
    const hit = (it) => !q || it.ru.toLowerCase().includes(q) || bare(it.sr).includes(qb);
    let h = '', total = 0;
    for (const u of COURSE) {
      const its = u.lessons.flatMap((l) => l.items).filter(hit);
      if (!its.length) continue;
      total += its.length;
      h += '<h3 class="sub">' + u.n + '. ' + esc(u.title) + '</h3><ul class="list">' + its.map((it) => '<li><button data-say="' + esc(it.say) + '"><span lang="sr">' + esc(sr(it.sr)) + '</span><small>' + esc(it.ru) + '</small>' + (S.words[it.id] ? '' : '<em class="new">новое</em>') + '</button></li>').join('') + '</ul>';
    }
    return total ? h : '<p class="empty">Ничего не нашлось по запросу «' + esc(dictQ) + '».</p>';
  }
  function bindDict() {
    const inp = $('#dq');
    if (inp) inp.addEventListener('input', () => { dictQ = inp.value; $('#dres').innerHTML = dictList(); });
  }

  // ---------- карточки ----------
  const PICS = window.PICS || {};
  let deck = null, deckI = 0, flipped = false;
  const cardPool = () => ITEMS.filter((it) => S.cardsTopic === 'all' || it.unit.id === S.cardsTopic);
  function buildDeck() {
    const pool = cardPool();
    let ids = pool.filter((it) => S.cards[it.id] !== 'known').map((it) => it.id);
    if (!ids.length) ids = pool.map((it) => it.id);
    deck = S.cardsShuffle ? shuffle(ids) : ids; deckI = 0; flipped = false;
  }
  function vCards() {
    if (!S.cards) S.cards = {};
    if (!deck) buildDeck();
    const pool = cardPool();
    const known = pool.filter((it) => S.cards[it.id] === 'known').length, again = pool.filter((it) => S.cards[it.id] === 'again').length;
    let h = subTop('Карточки', 'Тренажёр') +
      '<div class="fc-ctl"><label class="fc-sel"><span class="vh">Тема</span><select id="ctopic"><option value="all">Все темы · ' + ITEMS.length + '</option>' +
      COURSE.map((u) => '<option value="' + u.id + '"' + (S.cardsTopic === u.id ? ' selected' : '') + '>' + u.n + '. ' + esc(u.title) + '</option>').join('') + '</select></label>' +
      '<label class="fc-mix"><input type="checkbox" class="sw sm" id="set-cardsShuffle" data-tog="cardsShuffle"' + (S.cardsShuffle ? ' checked' : '') + '><span>Перемешать</span></label></div>' +
      '<div class="fc-count"><span class="k"><b>' + known + '</b> знаю</span><span class="a"><b>' + again + '</b> учу</span><span><b>' + Math.max(0, deck.length - deckI) + '</b> осталось</span></div>';
    if (deckI >= deck.length) {
      return h + '<div class="fc-end">' + plate('Bravo!', 'big') + '<h2>Колода пройдена</h2><p class="hint">Знаю — ' + known + ', учу — ' + again + '. Незнакомые карточки вернутся в следующий круг, а слова попадут в «Повтор».</p>' +
        '<button class="btn primary wide" data-card="restart">' + (again ? 'Ещё круг: только «учу»' : 'Начать заново') + '</button><button class="btn wide ghost" data-card="reset">Сбросить отметки темы</button></div>';
    }
    const it = BY_ID[deck[deckI]], pic = PICS[it.sr];
    h += '<div class="fc-wrap"><div class="fc' + (flipped ? ' flip' : '') + '" data-flip role="button" tabindex="0" aria-label="Карточка. Нажмите, чтобы перевернуть"><div class="fc-in">' +
      '<div class="fc-face fc-front">' + (pic ? '<span class="fc-pic" aria-hidden="true">' + pic + '</span>' : '') + plate(it.sr) + '<small>Нажмите, чтобы перевернуть</small></div>' +
      '<div class="fc-face fc-back">' + (pic ? '<span class="fc-pic sm" aria-hidden="true">' + pic + '</span>' : '') + '<p class="fc-ru">' + esc(it.ru) + '</p><p class="pron">[' + esc(pron(it.say)) + ']</p>' +
      (it.note ? '<p class="fc-note">' + esc(it.note) + '</p>' : '') + sayBtns(it.say) + '<small>Урок ' + it.lesson.id + ' · ' + esc(it.lesson.title) + '</small></div>' +
      '</div></div></div>' +
      '<div class="fc-btns"><button class="btn" data-card="prev" aria-label="Назад"' + (deckI ? '' : ' disabled') + '>←</button><button class="btn again" data-card="again">Повторить</button><button class="btn know" data-card="know">Знаю</button></div>' +
      '<p class="hint fc-hint">Свайп вправо — «Знаю», влево — «Повторить».</p>';
    return h;
  }
  function cardAct(a) {
    if (a === 'restart') { if (!pickAgainOnly()) buildDeck(); render(); return; }
    if (a === 'reset') { cardPool().forEach((it) => delete S.cards[it.id]); save(); buildDeck(); render(); return; }
    if (a === 'prev') { if (deckI) { deckI--; flipped = false; render(); } return; }
    const it = BY_ID[deck[deckI]];
    if (!it) return;
    S.cards[it.id] = a === 'know' ? 'known' : 'again';
    if (a === 'know') touch(it); else mark(it, false);
    save(); beep(a === 'know');
    deckI++; flipped = false; render();
  }
  function pickAgainOnly() {
    const ids = cardPool().filter((it) => S.cards[it.id] === 'again').map((it) => it.id);
    if (!ids.length) return false;
    deck = S.cardsShuffle ? shuffle(ids) : ids; deckI = 0; flipped = false; return true;
  }
  function flipCard() {
    flipped = !flipped;
    const c = $('.fc'); if (c) c.classList.toggle('flip', flipped);
    if (flipped && S.autoplay) speak(BY_ID[deck[deckI]].say);
  }
  function bindCards() {
    const c = $('.fc'); if (!c) return;
    let x0 = null, y0 = null;
    c.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    c.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { c.classList.add(dx > 0 ? 'go-r' : 'go-l'); setTimeout(() => cardAct(dx > 0 ? 'know' : 'again'), 180); }
    });
    c.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipCard(); } });
  }

  let resetArm = false;
  function vMore() {
    const v = tts.voice;
    const voice = !tts.has ? 'Браузер не умеет озвучивать текст.' : v ? 'Голос: ' + esc(v.name) + ' (' + esc(v.lang) + ')' + (/^sr/i.test(v.lang) ? '' : ' — хорватский или боснийский, произношение почти такое же.') : 'Сербский или хорватский голос не найден. На iPhone: Настройки → Универсальный доступ → Устн. контент → Голоса → Хорватский.';
    const seg = (name, val, lab) => '<button data-set="' + name + '" data-val="' + val + '" aria-pressed="' + (String(S[name]) === String(val)) + '">' + lab + '</button>';
    const tog = (name, lab, sub) => '<label class="row"><span><b>' + lab + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span><input type="checkbox" class="sw" id="set-' + name + '" data-tog="' + name + '"' + (S[name] ? ' checked' : '') + '></label>';
    return '<header class="top"><div><p class="eyebrow">Ещё</p><h1>Настройки</h1></div></header>' +
      '<h3 class="sub">Оформление</h3><div class="seg">' + seg('theme', 'system', 'Как в системе') + seg('theme', 'light', 'Светлая') + seg('theme', 'dark', 'Тёмная') + '</div>' +
      '<h3 class="sub">Цель дня</h3><div class="seg">' + seg('goal', 10, '10 XP') + seg('goal', 20, '20 XP') + seg('goal', 40, '40 XP') + '</div>' +
      '<h3 class="sub">Алфавит</h3><div class="seg">' + seg('script', 'lat', 'Latinica') + seg('script', 'cyr', 'Ћирилица') + '</div>' +
      '<div class="card">' + tog('both', 'Показывать второй алфавит', 'На табличке слова мелко под основным') + '</div>' +
      '<h3 class="sub">Звук</h3><div class="card">' + tog('autoplay', 'Озвучивать слова', 'Новые слова и правильные ответы') + tog('sfx', 'Сигналы ответа') +
      '<label class="row"><span><b>Скорость речи</b><small>' + Math.round(S.rate * 100) + '%</small></span><input type="range" id="set-rate" min="0.6" max="1.2" step="0.05" value="' + S.rate + '" data-rate></label>' +
      '<div class="row"><span><small>' + voice + '</small></span><button class="btn sm" data-say="Dobar dan, kako ste?">Проверить</button></div></div>' +
      '<h3 class="sub">Прогресс</h3><div class="card"><div class="row"><span><b>Резервная копия</b><small>' + (S.lastBackup ? 'Последняя: ' + new Date(S.lastBackup).toLocaleDateString('ru-RU') : 'Файл можно сохранить в «Файлы» или iCloud и восстановить на любом телефоне') + '</small></span><button class="btn sm" data-backup>Сохранить</button></div>' +
      '<div class="row"><span><b>Восстановить из файла</b><small>Файл srpski-progress-….json</small></span><label class="btn sm" for="impf">Выбрать</label><input type="file" id="impf" accept=".json,application/json" hidden></div>' +
      '<details class="row col"><summary><b>Перенос кодом</b> <small>(через Заметки)</small></summary><div class="row"><span><small>Код прогресса — вставьте в Заметки, чтобы перенести</small></span><button class="btn sm" data-export>Копировать</button></div>' +
      '<label for="imp"><b>Восстановить из кода</b></label><textarea id="imp" rows="2" placeholder="Вставьте код прогресса"></textarea><button class="btn sm" data-import>Восстановить</button></details>' +
      '<div class="row"><span><b>Сбросить прогресс</b><small>Удалит уроки, тесты и повторение</small></span><button class="btn sm danger" data-reset>' + (resetArm ? 'Точно сбросить' : 'Сбросить') + '</button></div></div>' +
      '<p class="hint" id="msg" role="status"></p>' +
      '<h3 class="sub">Обратная связь</h3><div class="card"><div class="row col"><label for="fb"><b>Нашли ошибку или не хватает темы?</b><small>Напишите — читаем каждое сообщение</small></label>' +
      '<textarea id="fb" rows="3" maxlength="2000" placeholder="Например: в уроке 3.2 опечатка… / Добавьте тему «банк»"></textarea>' +
      '<input class="ans" id="fbc" maxlength="200" autocomplete="email" placeholder="Ваш контакт для ответа (необязательно)">' +
      '<button class="btn sm" data-fb>Отправить</button><p class="hint" id="fbmsg" role="status"></p></div></div>' +
      '<p class="hint">Чтобы открыть как приложение: в Safari нажмите «Поделиться» → «На экран „Домой“». Прогресс хранится только на этом телефоне.</p>';
  }
  const flash = (t) => { const m = $('#msg'); if (m) m.textContent = t; };
  function restore(o) {
    if (!o || typeof o !== 'object' || !o.lessons) throw new Error('bad backup');
    S = Object.assign({}, DEF, o); save(); render(); flash('Прогресс восстановлен.');
  }

  // ---------- раздел «Учиться»: дорожная карта, падежи, диалоги, чтение, говорение, сад ----------
  const CASES = window.CASES || { list: [], nouns: {}, drills: [] };
  const DIALOGS = window.DIALOGS || [], READING = window.READING || [], TOPICS = window.TOPICS || [];
  const CASE_I = { N: 0, G: 1, D: 2, A: 3, V: 4, I: 5, L: 6 };
  const CASE_BY = {}; CASES.list.forEach((c) => { CASE_BY[c.c] = c; });
  const DRILL_BY = {}; CASES.drills.forEach((d) => { DRILL_BY[d.id] = d; });
  const GRAMMAR = window.GRAMMAR || [];
  const GAP_BY = {}; GRAMMAR.forEach((g) => g.drills.forEach((d) => { d.lesson = g; GAP_BY[d.id] = d; }));
  const GAPS_ALL = GRAMMAR.flatMap((g) => g.drills);
  const gapOk = (d) => S.gram[d.id] && S.gram[d.id].ok;
  const LEVELS = [
    { id: 'A1', title: 'Первые слова', sr: 'Prve reči', units: ['u1', 'u2', 'u3', 'u4', 'u5'] },
    { id: 'A2', title: 'Простые фразы', sr: 'Jednostavne rečenice', units: ['u6', 'u7', 'u8', 'u9', 'u10'] },
    { id: 'B1', title: 'Уверенный разговор', sr: 'Samostalan razgovor', units: [], soon: true },
    { id: 'B2', title: 'Почти свободно', sr: 'Skoro tečno', units: [], soon: true },
  ];
  const LEVEL_BY = {}; LEVELS.forEach((L) => { LEVEL_BY[L.id] = L; });
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
  const caseOk = (d) => S.cases[d.id] && S.cases[d.id].ok;
  function levelStats(L) {
    const ls = COURSE.filter((u) => L.units.includes(u.id)).flatMap((u) => u.lessons), its = ls.flatMap((l) => l.items);
    const r = (a, b) => ({ a, b, p: pct(a, b) });
    const of = (arr, done) => { const x = arr.filter((t) => t.level === L.id); return r(x.filter(done).length, x.length); };
    const sec = {
      course: r(ls.filter((l) => S.lessons[l.id]).length, ls.length),
      vocab: r(its.filter((it) => S.words[it.id] && S.words[it.id].box >= 2).length, its.length),
      grammar: of(CASES.drills.map((d) => ({ level: d.lvl, ok: caseOk(d) })).concat(GAPS_ALL.map((d) => ({ level: d.lesson.lvl, ok: gapOk(d) }))), (x) => x.ok),
      reading: of(READING, (t) => S.reads[t.id]),
      dialogs: of(DIALOGS, (t) => S.dlg[t.id]),
      speak: of(TOPICS, (t) => S.topics[t.id]),
    };
    const parts = Object.values(sec).filter((x) => x.b);
    return { sec, total: parts.length ? Math.round(parts.reduce((s, x) => s + x.p, 0) / parts.length) : 0, exam: S.exams[L.id] };
  }
  const curLevel = () => (LEVELS.find((L) => !L.soon && !(S.exams[L.id] && S.exams[L.id].passed)) || LEVELS[1]);

  const subTop = (title, eyebrow, back = 'learn', backArg = '') => '<header class="top sub-top"><button class="ic back" data-nav="' + back + '" data-arg="' + backArg + '" aria-label="Назад">' + I.back + '</button><div><p class="eyebrow">' + eyebrow + '</p><h1>' + title + '</h1></div></header>';
  const chip = (t, cls = '') => '<span class="lv ' + cls + '">' + t + '</span>';
  const pbar = (p) => '<div class="meter sm"><i style="width:' + p + '%"></i></div>';
  function lvRing(p, label, size = 64) {
    const r = 26, c = 2 * Math.PI * r;
    return '<span class="lring" style="--s:' + size + 'px"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="' + r + '" class="ring-bg"/><circle cx="32" cy="32" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - p / 100)).toFixed(1) + '"/></svg><b>' + label + '</b></span>';
  }
  function appbar() {
    return '<header class="appbar"><span class="logo">' + window.mascot({ head: true, mouth: 'smile', blush: 0.3 }) + '</span><b class="brand">Srpski</b><span class="appbar-sp"></span>' +
      '<button class="ic plain" data-act="theme" aria-label="Сменить тему">' + I.moon + '</button></header>';
  }

  function vLearn() {
    const dd = S.daily[today()], L = curLevel(), st = levelStats(L);
    const t = (attrs, icon, label, cls = '', badge = '') => '<button class="tl ' + cls + '" ' + attrs + '>' + I[icon] + '<span>' + label + '</span>' + badge + '</button>';
    let h = appbar();
    h += '<section class="lv-card"><div class="lv-card-t"><p class="eyebrow">Ваш уровень</p><h2>' + L.id + ' · ' + esc(L.title) + '</h2><p class="hint">' + st.total + '% пройдено · дальше: ' + nextHint(L, st) + '</p></div>' + lvRing(st.total, L.id, 70) + '<button class="btn primary wide" data-nav="level" data-arg="' + L.id + '">Открыть уровень ' + L.id + '</button></section>';
    h += '<p class="eyebrow sec">Каждый день</p><div class="tiles">' +
      t('data-nav="wod"', 'cal', 'Слова дня') + t('data-start="daily"', 'spark', 'Урок дня', dd ? 'done' : 'feat', dd ? '<em>✓</em>' : '') + '</div>';
    h += '<p class="eyebrow sec">Учиться</p><div class="tiles">' +
      t('data-nav="map"', 'map', 'Дорожная карта', 'feat') + t('data-go="course"', 'cap', 'Курс') +
      t('data-nav="drill"', 'dumb', 'Тренажёр') + t('data-nav="cases"', 'grid', 'Победи падежи', 'feat') + t('data-nav="grammar"', 'abc', 'Грамматика') +
      t('data-nav="speak"', 'mic', 'Говори! Тема на барабане') + t('data-nav="cards"', 'cards', 'Карточки') +
      t('data-nav="dialogs"', 'chat', 'Диалоги') + t('data-nav="reading"', 'read', 'Чтение') +
      t('data-start="drill" data-ref="listen:all"', 'phones', 'Слушание') + t('data-start="drill" data-ref="dict:all"', 'pen', 'Диктант') +
      t('data-nav="exams"', 'scroll', 'Экзамены') + t('data-nav="garden"', 'sprout', 'Сад') + t('data-nav="cheat"', 'doc', 'Шпаргалки') + '</div>';
    h += '<p class="eyebrow sec">Справочник</p><div class="tiles">' + t('data-go="dict"', 'book', 'Словарь и азбука') + '</div>';
    return h;
  }
  function nextHint(L, st) {
    const order = [['course', 'уроки курса'], ['grammar', 'падежи'], ['reading', 'чтение'], ['dialogs', 'диалоги'], ['speak', 'говорение'], ['vocab', 'повтор слов']];
    const x = order.find(([k]) => st.sec[k].b && st.sec[k].p < 100);
    return x ? x[1] : (st.exam && st.exam.passed ? 'следующий уровень' : 'экзамен ' + L.id);
  }

  function vMap() {
    const cur = curLevel().id;
    let h = subTop('Дорожная карта', 'Путь к свободному сербскому');
    h += '<p class="lead">Уровни по европейской шкале. Нажмите на уровень, чтобы увидеть, что в нём: курс, падежи, чтение, диалоги и говорение.</p>';
    const n = LEVELS.length, rowH = 128;
    let path = 'M 30 ' + rowH / 2;
    for (let k = 1; k < n; k++) { const x0 = k % 2 ? 30 : 70, x1 = k % 2 ? 70 : 30, y0 = (k - 1) * rowH + rowH / 2, y1 = k * rowH + rowH / 2; path += ' C ' + x0 + ' ' + (y0 + rowH * 0.6) + ', ' + x1 + ' ' + (y1 - rowH * 0.6) + ', ' + x1 + ' ' + y1; }
    h += '<div class="road" style="height:' + n * rowH + 'px"><svg viewBox="0 0 100 ' + n * rowH + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + path + '"/></svg>' +
      LEVELS.map((L, k) => {
        const p = L.soon ? 0 : levelStats(L).total, ex = S.exams[L.id];
        return '<button class="lvl' + (k % 2 ? ' r' : '') + (L.soon ? ' soon' : '') + (L.id === cur ? ' cur' : '') + '" style="top:' + (k * rowH + 10) + 'px" data-nav="level" data-arg="' + L.id + '"' + (L.soon ? ' disabled' : '') + '>' +
          lvRing(p, L.id, 58) + '<span><b>' + esc(L.title) + '</b><small>' + (L.soon ? 'Скоро' : ex && ex.passed ? 'Экзамен сдан · ' + p + '%' : p + '%') + '</small></span></button>';
      }).join('') + '</div>';
    h += '<h2 class="h2s">Как устроена дорожная карта?</h2><p class="lead">Внутри каждого уровня — разделы освоения языка. Прогресс уровня складывается из всех разделов:</p>';
    const how = [['cap', 'Курс', 'уроки по темам: от «Zdravo» до врача и документов'], ['grid', 'Грамматика', 'падежи на живых фразах: где? куда? с кем?'], ['cards', 'Словарь', 'слова выученные — те, что продержались в повторе хотя бы 2 дня'],
      ['read', 'Чтение', 'короткие истории с переводом по предложениям и вопросами'], ['chat', 'Диалоги', 'сценки из жизни, можно играть роль'], ['mic', 'Говорение', 'тема на барабане и минута речи вслух'], ['scroll', 'Экзамен', '20 вопросов, нужно 80%']];
    h += '<div class="how">' + how.map(([ic, a, b]) => '<div class="how-i"><span class="how-ic">' + I[ic] + '</span><p><b>' + a + '</b> — ' + b + '.</p></div>').join('') + '</div>';
    return h;
  }

  function vLevel(id) {
    const L = LEVEL_BY[id] || LEVELS[0], st = levelStats(L), s = st.sec;
    let h = subTop(L.id + ', ' + esc(L.title), esc(L.sr), 'map');
    h += '<div class="lv-sum">' + lvRing(st.total, L.id, 76) + '<p>Уровень пройден на <b>' + st.total + '%</b>. ' + (L.id === 'A1' ? 'Юниты 1–5: приветствия, знакомство, числа, еда, семья.' : 'Юниты 6–10: город, покупки, путешествия, жизнь в Сербии, разговорный язык.') + '</p></div>';
    const sec = (key, ru, srt, nav, unit) => '<button class="sect" ' + nav + '><span class="sect-h"><b>' + ru + '</b><small lang="sr">' + srt + '</small></span><span class="sect-n">' + s[key].a + ' из ' + s[key].b + ' ' + unit + ', ' + s[key].p + '%</span>' + pbar(s[key].p) + '</button>';
    h += sec('course', 'Курс', 'Kurs', 'data-go="course"', 'уроков') + sec('grammar', 'Грамматика', 'Gramatika', 'data-nav="grammar"', 'фраз') +
      sec('vocab', 'Словарь', 'Vokabular', 'data-nav="cards"', 'слов') + sec('reading', 'Чтение', 'Čitanje', 'data-nav="reading"', 'текстов') +
      sec('dialogs', 'Диалоги', 'Dijalozi', 'data-nav="dialogs"', 'диалогов') + sec('speak', 'Говорение', 'Govor', 'data-nav="speak"', 'тем');
    const ex = st.exam;
    h += '<div class="sect exam"><span class="sect-h"><b>Экзамен ' + L.id + '</b><small lang="sr">Ispit</small></span><span class="sect-n">' + (ex ? (ex.passed ? 'Сдан' : 'Не сдан') + ' · лучший результат ' + ex.best + '%' : '20 вопросов: слова и падежи, нужно 80%') + '</span><button class="btn primary" data-start="exam" data-ref="' + L.id + '">' + (ex && ex.passed ? 'Пересдать' : 'Сдать экзамен') + '</button></div>';
    return h;
  }

  // ---------- падежи ----------
  function vCases() {
    const done = CASES.drills.filter(caseOk).length;
    let h = subTop('Победи падежи', 'Грамматика · Gramatika');
    h += '<div class="lv-sum">' + lvRing(pct(done, CASES.drills.length), done + '', 70) + '<p>В сербском семь падежей — почти как в русском, плюс звательный. Освоено <b>' + done + ' из ' + CASES.drills.length + '</b> фраз.</p></div>';
    h += '<div class="stack"><button class="btn primary wide" data-start="cases" data-ref="A1">Где? и Куда? — u/na · A1</button><button class="btn wide" data-start="cases" data-ref="A2">Все падежи · A2</button><button class="btn wide" data-start="cases" data-ref="all">Бой: 20 фраз вперемешку</button></div>';
    h += '<h3 class="sub">Семь падежей</h3><div class="cases">' + CASES.list.map((c) => '<div class="case"><span class="case-b">' + c.c + '</span><div><p class="case-h"><b lang="sr">' + c.sr + '</b> · ' + c.ru + '</p><p class="case-q"><span lang="sr">' + c.q + '</span> — ' + c.qru + '</p><p class="case-u">' + esc(c.use) + '</p>' +
      '<button class="case-ex" data-say="' + esc(c.ex[0]) + '"><span lang="sr">' + esc(sr(c.ex[0])) + '</span><small>' + esc(c.ex[1]) + '</small></button></div></div>').join('') + '</div>';
    h += '<h3 class="sub">Ловушки для русских</h3><ul class="list">' + [['Zovem mamu.', 'Звоню маме — в сербском винительный: zvati koga'], ['Idem kod lekara.', 'Иду к врачу — kod + родительный'], ['Vraćam se sa posla. / Pričam sa prijateljem.', 'sa + родительный — откуда, sa + творительный — с кем'], ['Idem autobusom.', 'Еду на автобусе — творительный без предлога']]
      .map(([a, b]) => '<li><button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + esc(b) + '</small></button></li>').join('') + '</ul>';
    return h;
  }

  // ---------- грамматика ----------
  function vGrammar() {
    const done = GAPS_ALL.filter(gapOk).length;
    let h = subTop('Грамматика', 'Gramatika · коротко и с примерами');
    h += '<div class="lv-sum">' + lvRing(pct(done, GAPS_ALL.length), done + '', 70) + '<p>' + GRAMMAR.length + ' коротких уроков: правило, таблица, примеры с озвучкой и тренировка. Освоено <b>' + done + ' из ' + GAPS_ALL.length + '</b> заданий.</p></div>';
    ['A1', 'A2'].forEach((lv) => {
      h += '<h3 class="sub">' + lv + '</h3><div class="cards-l">' + GRAMMAR.filter((g) => g.lvl === lv).map((g, k) => {
        const ok = g.drills.filter(gapOk).length;
        return '<button class="cl" data-nav="gram" data-arg="' + g.id + '"><span class="cl-e num-e">' + (GRAMMAR.indexOf(g) + 1) + '</span><span class="cl-t"><b>' + esc(g.title) + '</b><small lang="sr">' + esc(sr(g.sr)) + ' · ' + ok + '/' + g.drills.length + '</small></span>' + (ok === g.drills.length ? '<em class="okm">' + I.check + '</em>' : '') + '</button>';
      }).join('') + '</div>';
    });
    h += '<button class="btn wide mt" data-start="gram" data-ref="all">Повторить всё вперемешку · 15 заданий</button>';
    return h;
  }
  function vGram(id) {
    const g = GRAMMAR.find((x) => x.id === id) || GRAMMAR[0], k = GRAMMAR.indexOf(g);
    let h = subTop(esc(g.title), 'Урок ' + (k + 1) + ' · ' + esc(sr(g.sr)) + ' · ' + g.lvl, 'grammar');
    h += '<p class="lead gram-in">' + esc(g.intro) + '</p>';
    const t = g.table;
    h += '<div class="tbl" style="--cols:' + t.head.length + '">' + t.head.map((c) => '<span class="th">' + esc(c) + '</span>').join('') + t.rows.map((r) => r.map((c, j) => '<span' + (j === 0 ? ' class="th"' : '') + ' lang="sr">' + esc(j ? sr(c) : c) + '</span>').join('')).join('') + '</div>';
    h += '<h3 class="sub">Примеры</h3><ul class="list">' + g.ex.map(([a, b]) => '<li><button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + esc(b) + '</small></button></li>').join('') + '</ul>';
    if (g.tip) h += '<p class="tip mt">💡 ' + esc(g.tip) + '</p>';
    const ok = g.drills.filter(gapOk).length;
    h += '<button class="btn primary wide mt" data-start="gram" data-ref="' + g.id + '">Тренировка · ' + g.drills.length + ' заданий' + (ok ? ' · освоено ' + ok : '') + '</button>';
    const nx = GRAMMAR[k + 1];
    if (nx) h += '<button class="btn wide ghost" data-nav="gram" data-arg="' + nx.id + '">Следующий урок: ' + esc(nx.title) + ' →</button>';
    return h;
  }

  // ---------- диалоги ----------
  let dlgMode = 'read', dlgTr = true, dlgShown = new Set();
  function vDialogs() {
    let h = subTop('Диалоги', 'Dijalozi · сценки из жизни');
    ['A1', 'A2'].forEach((lv) => {
      h += '<h3 class="sub">' + lv + '</h3><div class="cards-l">' + DIALOGS.filter((d) => d.level === lv).map((d) => '<button class="cl" data-nav="dialog" data-arg="' + d.id + '"><span class="cl-e">' + d.emoji + '</span><span class="cl-t"><b>' + esc(d.title) + '</b><small lang="sr">' + esc(sr(d.sr)) + ' · ' + d.lines.length + ' реплик</small></span>' + (S.dlg[d.id] ? '<em class="okm">' + I.check + '</em>' : '') + '</button>').join('') + '</div>';
    });
    return h;
  }
  function vDialog(id) {
    const d = DIALOGS.find((x) => x.id === id) || DIALOGS[0];
    const me = dlgMode === 'read' ? -1 : +dlgMode;
    let h = subTop(esc(d.title), esc(sr(d.sr)) + ' · ' + d.level, 'dialogs');
    h += '<div class="seg"><button data-dmode="read" aria-pressed="' + (dlgMode === 'read') + '">Читать</button>' + d.roles.map((r, k) => '<button data-dmode="' + k + '" aria-pressed="' + (dlgMode === String(k)) + '">Я — ' + esc(d.rolesRu[k]) + '</button>').join('') + '</div>';
    h += '<div class="dlg-ctl"><button class="btn sm" data-act="dlgplay">' + I.play + ' Слушать диалог</button><label class="fc-mix"><input type="checkbox" class="sw sm" data-dtr' + (dlgTr ? ' checked' : '') + '><span>Перевод</span></label></div>';
    if (me >= 0) h += '<p class="hint">Ваши реплики скрыты: прочитайте перевод, скажите по-сербски вслух и нажмите, чтобы проверить.</p>';
    h += '<div class="dlg">' + d.lines.map(([who, s, ru], k) => {
      const side = who === 1 ? 'r' : 'l', hide = who === me && !dlgShown.has(k);
      if (hide) return '<button class="bub ' + side + ' hid" data-dshow="' + k + '"><small>' + esc(d.rolesRu[who]) + '</small><span class="bub-ru">' + esc(ru) + '</span><span class="bub-q">Скажите по-сербски и нажмите</span></button>';
      return '<button class="bub ' + side + '" data-say="' + esc(s) + '" data-line="' + k + '"><small>' + esc(d.roles[who]) + '</small><span lang="sr">' + esc(sr(s)) + '</span>' + (dlgTr ? '<span class="bub-ru">' + esc(ru) + '</span>' : '') + '</button>';
    }).join('') + '</div>';
    if (d.tip) h += '<p class="tip">' + esc(d.tip) + '</p>';
    h += '<button class="btn primary wide" data-dlgdone="' + d.id + '">' + (S.dlg[d.id] ? 'Пройден ✓ · ещё раз +1 XP' : 'Диалог освоен · +3 XP') + '</button>';
    return h;
  }
  // очередь фраз голосом: у собеседников разная высота голоса, текущая реплика подсвечивается
  function speakSeq(lines) {
    if (!tts.has) return;
    speechSynthesis.cancel();
    lines.forEach(([text, pitch, k]) => {
      const u = new SpeechSynthesisUtterance(text.split(' / ')[0]);
      if (tts.voice) { u.voice = tts.voice; u.lang = tts.voice.lang; } else u.lang = 'sr-RS';
      u.rate = S.rate; u.pitch = pitch;
      u.onstart = () => { document.querySelectorAll('.now').forEach((e) => e.classList.remove('now')); const e = document.querySelector('[data-line="' + k + '"]'); if (e) { e.classList.add('now'); e.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } };
      u.onend = () => { const e = document.querySelector('[data-line="' + k + '"]'); if (e) e.classList.remove('now'); };
      speechSynthesis.speak(u);
    });
  }

  // ---------- чтение ----------
  let rdOpen = new Set(), rdAll = false, rdQuiz = {};
  function vReading() {
    let h = subTop('Чтение', 'Čitanje · короткие истории');
    ['A1', 'A2'].forEach((lv) => {
      h += '<h3 class="sub">' + lv + '</h3><div class="cards-l">' + READING.filter((t) => t.level === lv).map((t) => '<button class="cl" data-nav="read" data-arg="' + t.id + '"><span class="cl-e">' + t.emoji + '</span><span class="cl-t"><b>' + esc(t.title) + '</b><small lang="sr">' + esc(sr(t.sr)) + ' · ' + t.text.length + ' предложений</small></span>' + (S.reads[t.id] ? '<em class="okm">' + I.check + '</em>' : '') + '</button>').join('') + '</div>';
    });
    return h;
  }
  function vRead(id) {
    const t = READING.find((x) => x.id === id) || READING[0];
    let h = subTop(esc(sr(t.sr)), esc(t.title) + ' · ' + t.level, 'reading');
    h += '<div class="dlg-ctl"><button class="btn sm" data-act="rdplay">' + I.play + ' Слушать текст</button><label class="fc-mix"><input type="checkbox" class="sw sm" data-rdall' + (rdAll ? ' checked' : '') + '><span>Весь перевод</span></label></div>';
    h += '<p class="hint">Нажмите на предложение — услышите его и увидите перевод.</p><div class="rd">' + t.text.map(([s, ru], k) => '<button class="rs' + (rdOpen.has(k) || rdAll ? ' open' : '') + '" data-rs="' + k + '" data-line="' + k + '"><span lang="sr">' + esc(sr(s)) + '</span>' + (rdOpen.has(k) || rdAll ? '<small>' + esc(ru) + '</small>' : '') + '</button>').join(' ') + '</div>';
    h += '<h3 class="sub">Слова из текста</h3><div class="same near">' + t.words.map(([a, b]) => '<button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + esc(b) + '</small></button>').join('') + '</div>';
    h += '<h3 class="sub">Проверьте себя</h3><div class="quiz">' + t.quiz.map((q, k) => {
      const a = rdQuiz[k];
      return '<div class="qz"><p><b>' + (k + 1) + '.</b> ' + esc(q.q) + '</p><div class="opts">' + q.opts.map((o, j) => '<button class="opt' + (a !== undefined ? (j === q.a ? ' right' : j === a ? ' wrong' : '') : '') + '" data-qz="' + k + ':' + j + '"' + (a !== undefined ? ' disabled' : '') + '>' + esc(o) + '</button>').join('') + '</div></div>';
    }).join('') + '</div>';
    const n = Object.keys(rdQuiz).length;
    if (n === t.quiz.length) { const ok = t.quiz.filter((q, k) => rdQuiz[k] === q.a).length; h += '<p class="fb-inline ' + (ok === n ? 'ok' : '') + '">' + (ok === n ? 'Все ответы верны! Svaka čast.' : 'Верно ' + ok + ' из ' + n + '. Перечитайте текст и попробуйте ещё раз.') + '</p><button class="btn wide" data-act="rdreset">Пройти вопросы заново</button>'; }
    return h;
  }

  // ---------- говорение: тема на барабане ----------
  let spin = { angle: 0, topic: null, busy: false }, talk = { t: 0, timer: null, rec: null, url: null, recOn: false };
  function vSpeak() {
    const n = TOPICS.length, seg = 360 / n;
    let h = subTop('Говори!', 'Тема на барабане · Govor');
    const grad = TOPICS.map((t, k) => (k % 2 ? 'var(--tile)' : 'var(--surface)') + ' ' + (k * seg) + 'deg ' + ((k + 1) * seg) + 'deg').join(',');
    h += '<div class="wheel-w"><span class="wheel-pin"></span><div class="wheel" id="wheel" style="background:conic-gradient(' + grad + ');transform:rotate(' + spin.angle + 'deg)">' +
      TOPICS.map((t, k) => '<span class="wh-e" style="transform:rotate(' + (k * seg + seg / 2) + 'deg) translateY(-118px) rotate(' + -(k * seg + seg / 2) + 'deg)">' + t.emoji + '</span>').join('') + '</div><span class="wheel-c">' + window.mascot({ head: true, mouth: 'grin', eyes: 'happy', blush: 0.4 }) + '</span></div>';
    h += '<button class="btn primary wide" data-act="spin"' + (spin.busy ? ' disabled' : '') + '>' + (spin.topic ? 'Крутить ещё раз' : 'Крутить барабан') + '</button>';
    const t = TOPICS.find((x) => x.id === spin.topic);
    if (!t) return h + '<p class="hint center">Барабан выберет тему. Ответьте на вопросы вслух — минуту, без остановки. Ошибки не страшны: главное — говорить.</p>';
    const left = talk.t;
    h += '<section class="topic"><div class="topic-h"><span class="cl-e">' + t.emoji + '</span><div><h2>' + esc(t.ru) + '</h2><p class="hint" lang="sr">' + esc(sr(t.sr)) + ' · ' + t.level + (S.topics[t.id] ? ' · говорили ' + S.topics[t.id] + ' ' + plural(S.topics[t.id], 'раз', 'раза', 'раз') : '') + '</p></div></div>' +
      '<h3 class="sub">Вопросы</h3><ul class="list">' + t.q.map(([a, b]) => '<li><button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + esc(b) + '</small></button></li>').join('') + '</ul>' +
      '<h3 class="sub">Фразы-помощники</h3><div class="same near two">' + t.phrases.map(([a, b]) => '<button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + esc(b) + '</small></button>').join('') + '</div>' +
      '<div class="talk"><div class="talk-t' + (left ? ' on' : '') + '" id="talkt">' + (left ? fmtT(left) : '1:00') + '</div><button class="btn' + (left ? '' : ' primary') + '" data-act="talk">' + (left ? 'Стоп' : 'Говорить минуту') + '</button>' +
      (window.MediaRecorder && navigator.mediaDevices ? '<button class="btn" data-act="rec">' + (talk.recOn ? '■ Остановить запись' : '● Записать себя') + '</button>' : '') + '</div>' +
      (talk.url ? '<audio controls src="' + talk.url + '" class="rec-a"></audio>' : '') +
      '<button class="btn wide go" data-topicdone="' + t.id + '">Я поговорил(а) · +3 XP</button></section>';
    return h;
  }
  const fmtT = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  function doSpin() {
    if (spin.busy) return;
    const n = TOPICS.length, seg = 360 / n;
    let k = (Math.random() * n) | 0; if (TOPICS[k].id === spin.topic) k = (k + 1) % n;
    const base = spin.angle - (spin.angle % 360);
    spin.angle = base + 360 * 5 + (360 - (k * seg + seg / 2));
    spin.busy = true; stopTalk();
    const w = $('#wheel'); if (w) { w.style.transform = 'rotate(' + spin.angle + 'deg)'; }
    const b = $('[data-act="spin"]'); if (b) b.disabled = true;
    beep(true);
    setTimeout(() => { spin.busy = false; spin.topic = TOPICS[k].id; if (view === 'speak') render(); const tp = $('.topic'); if (tp) tp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 3200);
  }
  function stopTalk() { if (talk.timer) clearInterval(talk.timer); talk.timer = null; talk.t = 0; }
  function toggleTalk() {
    if (talk.timer) { stopTalk(); render(); return; }
    talk.t = 60; render();
    talk.timer = setInterval(() => {
      talk.t--; const e = $('#talkt'); if (e) e.textContent = fmtT(talk.t);
      if (talk.t <= 0) { stopTalk(); beep(true); if (view === 'speak') render(); }
    }, 1000);
  }
  async function toggleRec() {
    if (talk.rec) { talk.rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [], rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); if (talk.url) URL.revokeObjectURL(talk.url); talk.url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || 'audio/mp4' })); talk.rec = null; talk.recOn = false; if (view === 'speak') render(); };
      rec.start(); talk.rec = rec; talk.recOn = true; render();
    } catch (e) { flashTop('Нет доступа к микрофону. Разрешите его в настройках Safari.'); }
  }
  const flashTop = (t) => { const m = document.createElement('div'); m.className = 'toast'; m.textContent = t; document.body.appendChild(m); setTimeout(() => m.remove(), 2600); };

  // ---------- сад ----------
  const STAGES = [[0, 'Семечко'], [15, 'Росток'], [50, 'Саженец'], [120, 'Кустик'], [250, 'Деревце'], [450, 'Цветущее дерево'], [750, 'Плодовое дерево'], [1200, 'Сад Srpski']];
  const stageOf = (xp) => { let k = 0; STAGES.forEach(([x], i) => { if (xp >= x) k = i; }); return k; };
  function gardenSVG() {
    const k = stageOf(S.xp), flowers = COURSE.filter((u) => S.tests[u.id] && S.tests[u.id].passed).length, st = Math.min(streak(), 7), sun = xpToday() >= (S.goal || 20);
    const H = [0, 18, 42, 64, 86, 104, 116, 124][k], gx = 150, gy = 186;
    let g = '<svg viewBox="0 0 300 220" class="garden" role="img" aria-label="Сад: ' + STAGES[k][1] + '">';
    g += '<circle cx="252" cy="44" r="' + (sun ? 22 : 16) + '" fill="' + (sun ? '#f2b33d' : 'var(--line)') + '"/>';
    for (let i = 0; i < st; i++) g += '<path d="M' + (40 + i * 14) + ' 30 q5 8 0 12 q-5 -4 0 -12z" fill="#5aa9e6" opacity=".85"/>';
    g += '<ellipse cx="150" cy="196" rx="132" ry="18" fill="#8a6a45" opacity=".35"/><ellipse cx="150" cy="190" rx="120" ry="12" fill="#6f9a4a"/>';
    if (k === 0) g += '<ellipse cx="' + gx + '" cy="' + (gy - 2) + '" rx="7" ry="5" fill="#8a5a2b"/>';
    else {
      g += '<path d="M' + gx + ' ' + gy + ' C ' + (gx - 4) + ' ' + (gy - H * 0.5) + ', ' + (gx + 4) + ' ' + (gy - H * 0.7) + ', ' + gx + ' ' + (gy - H) + '" stroke="' + (k > 3 ? '#7a5230' : '#4f8a3a') + '" stroke-width="' + (2 + k * 1.4) + '" fill="none" stroke-linecap="round"/>';
      const crown = k >= 4;
      if (!crown) { for (let i = 0; i < k; i++) { const y = gy - H * (0.35 + 0.6 * i / Math.max(1, k)); const dir = i % 2 ? 1 : -1; g += '<ellipse cx="' + (gx + dir * 11) + '" cy="' + y + '" rx="11" ry="6" fill="#5c9e44" transform="rotate(' + dir * -25 + ' ' + (gx + dir * 11) + ' ' + y + ')"/>'; } }
      else {
        const cy = gy - H, R = 26 + k * 6;
        g += '<circle cx="' + gx + '" cy="' + cy + '" r="' + R + '" fill="#5c9e44"/><circle cx="' + (gx - R * 0.6) + '" cy="' + (cy + 8) + '" r="' + R * 0.7 + '" fill="#4f8f3b"/><circle cx="' + (gx + R * 0.6) + '" cy="' + (cy + 6) + '" r="' + R * 0.72 + '" fill="#67a84d"/>';
        if (k >= 5) for (let i = 0; i < 9; i++) { const a = i * 0.7, rr = R * 0.75; g += '<circle cx="' + (gx + Math.cos(a) * rr * (0.4 + (i % 3) * 0.3)) + '" cy="' + (cy + Math.sin(a) * rr * 0.6) + '" r="4.5" fill="' + (k >= 6 ? '#d6453f' : '#f6c6d4') + '"/>'; }
      }
    }
    for (let i = 0; i < flowers; i++) { const x = i % 2 ? 150 + 30 + (i >> 1) * 22 : 150 - 30 - (i >> 1) * 22, c = 'var(--l' + (i + 1) + ')'; g += '<path d="M' + x + ' 190 v-16" stroke="#4f8a3a" stroke-width="2"/><circle cx="' + x + '" cy="172" r="6" fill="' + c + '"/><circle cx="' + x + '" cy="172" r="2.4" fill="#f6d36b"/>'; }
    return g + '</svg>';
  }
  function vGarden() {
    const k = stageOf(S.xp), nx = STAGES[k + 1], flowers = COURSE.filter((u) => S.tests[u.id] && S.tests[u.id].passed).length;
    let h = subTop('Сад', 'Bašta · растёт вместе с вами');
    h += '<div class="garden-w">' + gardenSVG() + '</div><h2 class="center">' + STAGES[k][1] + '</h2>';
    h += nx ? '<p class="hint center">' + S.xp + ' XP · до стадии «' + nx[1] + '» ещё ' + (nx[0] - S.xp) + ' XP</p>' + pbar(pct(S.xp - STAGES[k][0], nx[0] - STAGES[k][0])) : '<p class="hint center">Сад полностью вырос. Bravo!</p>';
    h += '<div class="how"><div class="how-i"><span class="how-ic">' + I.sprout + '</span><p><b>Дерево</b> растёт от опыта: каждый правильный ответ — XP.</p></div><div class="how-i"><span class="how-ic">' + I.cup + '</span><p><b>Цветы</b> — сданные тесты юнитов: ' + flowers + ' из ' + COURSE.length + '.</p></div><div class="how-i"><span class="how-ic">' + I.flame + '</span><p><b>Капли</b> — дни подряд (' + streak() + '). <b>Солнце</b> светит, когда выполнена цель дня.</p></div></div>';
    return h;
  }

  // ---------- шпаргалки ----------
  function vCheat() {
    let h = subTop('Шпаргалки', 'Самое нужное на одном экране');
    const tbl = (rows, cols) => '<div class="tbl" style="--cols:' + cols + '">' + rows.map((r) => r.map((c, j) => '<span' + (j === 0 ? ' class="th"' : '') + ' lang="sr">' + c + '</span>').join('')).join('') + '</div>';
    h += '<h3 class="sub">Падежи</h3>' + tbl([['N', 'ko? šta?', 'Ovo je <b>kafa</b>.'], ['G', 'iz, od, bez, kod', 'iz <b>Beograda</b>'], ['D', 'kome?', 'pišem <b>mami</b>'], ['A', 'šta? kuda?', 'idem u <b>grad</b>'], ['V', 'обращение', '<b>brate</b>!'], ['I', 's kim? čime?', 'sa <b>mlekom</b>'], ['L', 'gde? o čemu?', 'u <b>gradu</b>']], 3);
    h += '<h3 class="sub">Глагол biti — быть</h3>' + tbl([['ja', 'sam', 'nisam'], ['ti', 'si', 'nisi'], ['on, ona', 'je', 'nije'], ['mi', 'smo', 'nismo'], ['vi', 'ste', 'niste'], ['oni', 'su', 'nisu']], 3) + '<p class="hint">В отличие от русского, «есть» не пропускают: Ja sam Rus. — Я русский.</p>';
    h += '<h3 class="sub">Настоящее время: три типа</h3>' + tbl([['', 'čitati', 'pisati', 'govoriti'], ['ja', 'čitam', 'pišem', 'govorim'], ['ti', 'čitaš', 'pišeš', 'govoriš'], ['on', 'čita', 'piše', 'govori'], ['mi', 'čitamo', 'pišemo', 'govorimo'], ['vi', 'čitate', 'pišete', 'govorite'], ['oni', 'čitaju', 'pišu', 'govore']], 4);
    h += '<h3 class="sub">Вопросительные слова</h3><div class="same">' + [['ko?', 'кто?'], ['šta?', 'что?'], ['gde?', 'где?'], ['kuda?', 'куда?'], ['odakle?', 'откуда?'], ['kada?', 'когда?'], ['kako?', 'как?'], ['zašto?', 'почему?'], ['koliko?', 'сколько?'], ['koji?', 'который?'], ['čiji?', 'чей?'], ['da li…?', 'ли…?']].map(([a, b]) => '<button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + b + '</small></button>').join('') + '</div>';
    h += '<h3 class="sub">Да, нет и вежливость</h3><div class="same">' + [['da', 'да'], ['ne', 'нет'], ['molim', 'пожалуйста'], ['hvala', 'спасибо'], ['izvinite', 'извините'], ['može', 'можно / давай']].map(([a, b]) => '<button data-say="' + esc(a) + '"><span lang="sr">' + esc(sr(a)) + '</span><small>' + b + '</small></button>').join('') + '</div>';
    return h;
  }

  // ---------- слова дня, тренажёр, экзамены ----------
  function wordsOfDay() {
    const d = dayNo();
    const pool = DAILY.filter((it) => PICS[it.sr] && !it.multi);
    return [0, 1, 2].map((k) => pool[(d * 3 + k * 7 + 11) % pool.length]);
  }
  function vWod() {
    const ws = wordsOfDay();
    let h = subTop('Слова дня', new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }));
    h += ws.map((it) => '<section class="wod">' + '<div class="wod-h"><p class="eyebrow">' + esc(it.unit.title) + '</p>' + sayBtns(it.say) + '</div>' + plate(it.sr, 'sm') + '<p class="wod-ru">' + esc(it.ru) + '</p><p class="wod-pr">[' + esc(pron(it.say)) + ']' + (it.note ? ' · ' + esc(it.note) : '') + '</p></section>').join('');
    h += '<button class="btn primary wide mt" data-start="wod">Выучить эти слова</button>';
    return h;
  }
  let drillUnit = 'all', drillType = 'mix';
  const DRILLS = [['mix', 'Вперемешку', 'dumb'], ['pickRu', 'Что значит?', 'cards'], ['pickSr', 'Как сказать?', 'chat'], ['listen', 'Аудирование', 'phones'], ['dict', 'Диктант', 'pen'], ['type', 'Письмо', 'doc'], ['build', 'Собери фразу', 'grid'], ['match', 'Пары', 'cycle']];
  function vDrill() {
    let h = subTop('Тренажёр', 'Тренируйте то, что нужно');
    h += '<label class="fc-sel"><span class="vh">Тема</span><select id="dunit"><option value="all">Все темы</option>' + COURSE.map((u) => '<option value="' + u.id + '"' + (drillUnit === u.id ? ' selected' : '') + '>' + u.n + '. ' + esc(u.title) + '</option>').join('') + '</select></label>';
    h += '<div class="tiles mt">' + DRILLS.map(([k, lab, ic]) => '<button class="tl' + (drillType === k ? ' feat' : '') + '" data-dtype="' + k + '"' + ((k === 'listen' || k === 'dict') && !tts.has ? ' disabled' : '') + '>' + I[ic] + '<span>' + lab + '</span></button>').join('') + '</div>';
    h += '<button class="btn primary wide mt" data-start="drill" data-ref="' + drillType + ':' + drillUnit + '">Начать · 12 заданий</button>';
    if (!tts.voice) h += '<p class="hint">Для аудирования и диктанта нужен сербский или хорватский голос — подсказка в «Ещё».</p>';
    return h;
  }
  function vExams() {
    let h = subTop('Экзамены', 'Ispiti');
    h += '<p class="lead">20 вопросов на уровень: слова, фразы на слух и падежи. Чтобы сдать, нужно 80% верных ответов.</p>';
    h += LEVELS.map((L) => { const ex = S.exams[L.id]; return '<div class="sect exam"><span class="sect-h"><b>' + L.id + ' · ' + esc(L.title) + '</b><small lang="sr">' + esc(L.sr) + '</small></span><span class="sect-n">' + (L.soon ? 'Скоро' : ex ? (ex.passed ? 'Сдан ✓' : 'Не сдан') + ' · лучший ' + ex.best + '%' : 'Ещё не сдавали') + '</span>' + (L.soon ? '' : '<button class="btn' + (ex && ex.passed ? '' : ' primary') + '" data-start="exam" data-ref="' + L.id + '">' + (ex ? 'Сдать снова' : 'Сдать') + '</button>') + '</div>'; }).join('');
    return h;
  }

  // ---------- сессии ----------
  let P = null;
  const play = $('#play'), stage = $('#stage'), foot = $('#foot'), bar = $('#bar'), cnt = $('#count');

  function taskFor(it, pool) {
    const c = ['pickSr'];
    if (tts.voice) c.push('listen');
    if (tts.voice && words(it.say) <= 3 && it.say.length <= 22) c.push('dict');
    if (words(it.say) <= 3 && it.say.length <= 22) c.push('type', 'type');
    if (it.multi && words(it.say) <= 8) c.push('build', 'build', 'build');
    if (pool) c.push(...pool);
    return { t: pick(c), it };
  }
  function lessonQueue(l) {
    const fresh = !S.lessons[l.id];
    const q = [];
    if (fresh) l.items.forEach((it) => { if (!S.words[it.id]) q.push({ t: 'intro', it }); q.push({ t: 'pickRu', it }); });
    const p2 = [];
    const sh = shuffle(l.items);
    for (let k = 0; k + 3 <= sh.length; k += 5) p2.push({ t: 'match', items: sh.slice(k, k + 5) });
    shuffle(l.items).forEach((it) => p2.push(taskFor(it, fresh ? null : ['pickRu'])));
    // пары — не первыми, чтобы слова успели устояться
    const m = p2.filter((x) => x.t === 'match'), rest = p2.filter((x) => x.t !== 'match');
    m.forEach((x, k) => rest.splice(Math.min(rest.length, 2 + k * 5), 0, x));
    return q.concat(rest);
  }
  // ---------- незаконченный урок: сохраняется после каждого шага ----------
  const RUN = 'srpski.run';
  function persistRun(open = true) {
    if (!P) return;
    const run = {
      kind: P.kind, ref: P.l ? P.l.id : P.u ? P.u.id : P.ref || null, title: P.title,
      q: P.q.map((x) => (x.t === 'match' ? { t: 'match', ids: x.items.map((y) => y.id) } : x.t === 'case' ? { t: 'case', cid: x.d.id } : x.t === 'gap' ? { t: 'gap', gid: x.d.id } : { t: x.t, id: x.it.id })),
      i: P.i, ok: P.ok, n: P.n, wrong: [...P.wrong], retried: [...P.retried], answered: !!P.answered, intro: !!P.intro, open,
    };
    try { localStorage.setItem(RUN, JSON.stringify(run)); } catch (e) { /* хранилище недоступно */ }
  }
  function loadRun() {
    try {
      const r = JSON.parse(localStorage.getItem(RUN) || 'null');
      if (!r || !r.q || !r.q.length) return null;
      // курс могли обновить: задания с исчезнувшими словами выбрасываем
      r.q = r.q.map((x) => (x.t === 'match' ? { t: 'match', items: x.ids.map((id) => BY_ID[id]).filter(Boolean) } : x.t === 'case' ? { t: 'case', d: DRILL_BY[x.cid] } : x.t === 'gap' ? { t: 'gap', d: GAP_BY[x.gid] } : { t: x.t, it: BY_ID[x.id] }))
        .filter((x) => (x.t === 'match' ? x.items.length >= 2 : x.t === 'case' || x.t === 'gap' ? x.d : x.it));
      if (r.kind === 'lesson' && !LESSONS.find((l) => l.id === r.ref)) return null;
      if (r.kind === 'test' && !COURSE.find((u) => u.id === r.ref)) return null;
      return r.q.length ? r : null;
    } catch (e) { return null; }
  }
  const dropRun = () => { try { localStorage.removeItem(RUN); } catch (e) { /* не важно */ } };
  function resume(r) {
    P = { kind: r.kind, ref: r.ref, title: r.title, q: r.q, i: Math.min(r.i, r.q.length), ok: r.ok, n: r.n, wrong: new Set(r.wrong), retried: new Set(r.retried), t0: Date.now() };
    if (r.kind === 'lesson') P.l = LESSONS.find((l) => l.id === r.ref);
    if (r.kind === 'test') P.u = COURSE.find((u) => u.id === r.ref);
    openPlay();
    if (r.intro) return showIntro();
    if (r.answered) P.i++; // ответ уже засчитан — сразу следующее задание
    if (P.i >= P.q.length) return finish();
    renderTask();
  }

  function start(kind, ref) {
    let q, title;
    if (kind === 'lesson') { const l = LESSONS.find((x) => x.id === ref); q = lessonQueue(l); title = l.title; P = { kind, l }; }
    else if (kind === 'test') {
      const u = COURSE.find((x) => x.id === ref);
      const all = shuffle(u.lessons.flatMap((l) => l.items));
      q = all.slice(0, 14).map((it) => taskFor(it, ['pickRu', 'pickRu']));
      q.splice(5, 0, { t: 'match', items: all.slice(14, 19).length >= 3 ? all.slice(14, 19) : all.slice(0, 5) });
      title = 'Тест: ' + u.title; P = { kind, u };
    } else if (kind === 'cases') {
      const pool = CASES.drills.filter((d) => ref === 'all' || d.lvl === ref);
      q = shuffle(pool).sort((a, b) => (caseOk(a) ? 1 : 0) - (caseOk(b) ? 1 : 0)).slice(0, ref === 'all' ? 20 : 10).map((d) => ({ t: 'case', d }));
      title = ref === 'all' ? 'Падежи: бой' : 'Падежи ' + ref; P = { kind, ref };
    } else if (kind === 'gram') {
      const g = GRAMMAR.find((x) => x.id === ref);
      const pool = g ? g.drills : GAPS_ALL;
      q = (g ? shuffle(pool) : shuffle(pool).sort((a, b) => (gapOk(a) ? 1 : 0) - (gapOk(b) ? 1 : 0)).slice(0, 15)).map((d) => ({ t: 'gap', d }));
      title = g ? g.title : 'Грамматика вперемешку'; P = { kind, ref };
    } else if (kind === 'daily') {
      const nx = nextStep(), l = nx && nx.kind === 'lesson' ? nx.l : null;
      const fresh = shuffle(l ? l.items : ITEMS).slice(0, 3).flatMap((it) => (S.words[it.id] ? [taskFor(it, ['pickRu'])] : [{ t: 'intro', it }, { t: 'pickRu', it }]));
      const used = new Set(fresh.map((x) => x.it.id));
      let rev = shuffle(dueIds()).filter((id) => !used.has(id));
      if (rev.length < 4) rev = rev.concat(shuffle(seenIds()).filter((id) => !used.has(id) && !rev.includes(id)));
      rev = rev.slice(0, 4).map((id) => taskFor(BY_ID[id], ['pickRu']));
      const lv = S.lessons['5.3'] || Object.keys(S.lessons).length >= 14 ? null : 'A1';
      const cs = shuffle(CASES.drills.filter((d) => !lv || d.lvl === lv)).sort((a, b) => (caseOk(a) ? 1 : 0) - (caseOk(b) ? 1 : 0)).slice(0, 3).map((d) => ({ t: 'case', d }));
      const gp = shuffle(GAPS_ALL.filter((d) => !lv || d.lesson.lvl === lv)).sort((a, b) => (gapOk(a) ? 1 : 0) - (gapOk(b) ? 1 : 0)).slice(0, 2).map((d) => ({ t: 'gap', d }));
      q = fresh.concat(shuffle(rev.concat(cs, gp)));
      title = 'Урок дня'; P = { kind };
    } else if (kind === 'wod') {
      q = wordsOfDay().flatMap((it) => [{ t: 'intro', it }, { t: 'pickRu', it }]);
      q = q.filter((x) => x.t === 'intro').concat(shuffle(q.filter((x) => x.t !== 'intro')));
      title = 'Слова дня'; P = { kind };
    } else if (kind === 'drill') {
      const [type, unit] = String(ref).split(':');
      const base = ITEMS.filter((it) => unit === 'all' || it.unit.id === unit);
      const seen = base.filter((it) => S.words[it.id]);
      let pool = shuffle(seen.length >= 8 ? seen : base);
      const fits = { build: (it) => it.multi && words(it.say) <= 8, type: (it) => words(it.say) <= 3 && it.say.length <= 22, dict: (it) => words(it.say) <= 4 && it.say.length <= 26 };
      if (fits[type]) pool = pool.filter(fits[type]).concat(pool.filter((it) => !fits[type](it))).filter((it, k, a) => fits[type](it) || k < 12);
      if (type === 'match') q = [0, 1, 2].map((k) => ({ t: 'match', items: pool.slice(k * 5, k * 5 + 5) })).filter((x) => x.items.length >= 3);
      else q = pool.slice(0, 12).map((it) => (type === 'mix' ? taskFor(it, ['pickRu']) : { t: (type === 'listen' || type === 'dict') && !tts.has ? 'pickRu' : type, it }));
      title = 'Тренажёр · ' + (DRILLS.find((d) => d[0] === type) || ['', 'вперемешку'])[1]; P = { kind, ref };
    } else if (kind === 'exam') {
      const L = LEVEL_BY[ref] || LEVELS[0];
      const its = shuffle(ITEMS.filter((it) => L.units.includes(it.unit.id))).slice(0, 14);
      const cs = shuffle(CASES.drills.filter((d) => d.lvl === L.id)).slice(0, 6).map((d) => ({ t: 'case', d }));
      const gx = shuffle(GAPS_ALL.filter((d) => d.lesson.lvl === L.id)).slice(0, 4).map((d) => ({ t: 'gap', d }));
      q = shuffle(its.slice(0, 12).map((it) => taskFor(it, ['pickRu', 'pickSr'])).concat(cs.slice(0, 4), gx));
      title = 'Экзамен ' + L.id; P = { kind, ref };
    } else {
      let ids = shuffle(dueIds()).sort((a, b) => S.words[a].box - S.words[b].box);
      if (!ids.length || ref === 'any') ids = seenIds().sort((a, b) => (S.words[b].wrong || 0) - (S.words[a].wrong || 0) || S.words[a].box - S.words[b].box);
      ids = ids.slice(0, 12);
      q = shuffle(ids).map((id) => taskFor(BY_ID[id], ['pickRu', 'pickRu']));
      title = 'Повтор'; P = { kind };
    }
    if (!q.length) { P = null; flashTop('Пока нечего тренировать — сначала пройдите пару уроков.'); return; }
    Object.assign(P, { title, q, i: 0, ok: 0, n: 0, wrong: new Set(), retried: new Set(), t0: Date.now() });
    openPlay();
    if (kind === 'lesson') return showIntro();
    renderTask();
  }
  function openPlay() { play.hidden = false; document.body.classList.add('playing'); play.scrollTop = 0; }
  function closePlay() { if (P) persistRun(false); play.hidden = true; document.body.classList.remove('playing'); P = null; if (tts.has) speechSynthesis.cancel(); render(); }

  function showIntro() {
    const l = P.l;
    P.intro = true; persistRun();
    setBar(0);
    cnt.textContent = '';
    stage.innerHTML = '<p class="eyebrow">Урок ' + l.id + ' · ' + esc(l.unit.title) + '</p><h2 class="t-h">' + esc(l.title) + '</h2><p class="tip">' + esc(l.tip) + '</p>' +
      '<ul class="list compact">' + l.items.map((it) => '<li><button data-say="' + esc(it.say) + '"><span lang="sr">' + esc(sr(it.sr)) + '</span><small>' + esc(it.ru) + '</small></button></li>').join('') + '</ul>';
    foot.innerHTML = '<button class="btn primary wide" data-act="begin">Начать урок</button>';
  }

  function setBar(f) { bar.style.width = Math.round(f * 100) + '%'; }
  function renderTask() {
    const x = P.q[P.i];
    P.intro = false; P.answered = false; persistRun();
    setBar(P.i / P.q.length);
    cnt.textContent = (P.i + 1) + '/' + P.q.length;
    foot.innerHTML = '';
    stage.scrollTop = 0;
    ({ intro: tIntro, pickRu: tPickRu, pickSr: tPickSr, listen: tListen, type: tType, dict: tDict, build: tBuild, match: tMatch, case: tCase, gap: tGap })[x.t](x);
  }

  // смыслы «Привет / Пока» → [привет, пока]: варианты с общим смыслом не ставим рядом — иначе верны оба
  const senses = (y, field) => (field === 'ru' ? y.ru.toLowerCase().replace(/\(.*?\)/g, '').split('/') : y.alts.map(norm)).map((x) => x.trim()).filter(Boolean);
  function similar(it, field) {
    const used = new Set(senses(it, field)), out = [];
    const take = (pool) => { for (const y of shuffle(pool)) { if (out.length >= 3) return; const ss = senses(y, field); if (!ss.some((x) => used.has(x))) { ss.forEach((x) => used.add(x)); out.push(y); } } };
    const same = (y) => y.multi === it.multi;
    take(it.lesson.items.filter(same)); take(it.unit.lessons.flatMap((l) => l.items).filter(same));
    take(it.lesson.items); take(ITEMS.filter(same)); take(ITEMS);
    return shuffle([it, ...out]);
  }

  function tIntro({ it }) {
    touch(it);
    stage.innerHTML = '<p class="eyebrow">Новое слово</p>' + plate(it.sr, 'big') + '<p class="ru-big">' + esc(it.ru) + '</p><p class="pron">[' + esc(pron(it.say)) + ']</p>' + sayBtns(it.say) + (it.note ? '<p class="note">' + esc(it.note) + '</p>' : '');
    foot.innerHTML = '<button class="btn primary wide" data-act="next">Дальше</button>';
    if (S.autoplay) speak(it.say);
  }
  function options(x, opts, label) {
    return '<div class="opts">' + opts.map((o, k) => '<button class="opt" data-opt="' + k + '"' + (label === 'sr' ? ' lang="sr"' : '') + '>' + esc(label === 'sr' ? sr(o.sr) : o.ru) + '</button>').join('') + '</div>';
  }
  function tPickRu(x) {
    x.opts = similar(x.it, 'ru');
    stage.innerHTML = '<p class="eyebrow">Что это значит?</p>' + plate(x.it.sr) + sayBtns(x.it.say) + options(x, x.opts, 'ru');
    if (S.autoplay) speak(x.it.say);
  }
  function tPickSr(x) {
    x.opts = similar(x.it, 'sr');
    stage.innerHTML = '<p class="eyebrow">Как сказать по-сербски?</p><p class="ru-big q">' + esc(x.it.ru) + '</p>' + options(x, x.opts, 'sr');
  }
  function tListen(x) {
    x.opts = similar(x.it, 'sr');
    stage.innerHTML = '<p class="eyebrow">Что вы слышите?</p><div class="listen"><button class="big-say" data-say="' + esc(x.it.say) + '" aria-label="Послушать">' + I.speak + '</button><button class="ic" data-say="' + esc(x.it.say) + '" data-slow="1" aria-label="Медленно">' + I.slow + '</button></div>' + options(x, x.opts, 'sr');
    speak(x.it.say);
  }
  function tType(x) {
    stage.innerHTML = '<p class="eyebrow">Напишите по-сербски</p><p class="ru-big q">' + esc(x.it.ru) + '</p>' +
      '<label class="vh" for="ans">Ответ</label><input id="ans" class="ans" lang="sr" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Ваш ответ">' +
      '<p class="hint">Можно без č ć š ž đ и даже русскими буквами.</p>';
    foot.innerHTML = '<button class="btn primary wide" data-act="check" disabled>Проверить</button>';
    const inp = $('#ans'), b = foot.querySelector('button');
    inp.addEventListener('input', () => { b.disabled = !inp.value.trim(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); check(); } });
    inp.focus({ preventScroll: true });
  }
  function tDict(x) {
    stage.innerHTML = '<p class="eyebrow">Диктант: напишите, что слышите</p><div class="listen"><button class="big-say" data-say="' + esc(x.it.say) + '" aria-label="Послушать">' + I.speak + '</button><button class="ic" data-say="' + esc(x.it.say) + '" data-slow="1" aria-label="Медленно">' + I.slow + '</button></div>' +
      '<label class="vh" for="ans">Ответ</label><input id="ans" class="ans" lang="sr" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Что вы услышали?">' +
      '<p class="hint">Можно без č ć š ž đ и даже русскими буквами.</p>';
    foot.innerHTML = '<button class="btn primary wide" data-act="check" disabled>Проверить</button>';
    const inp = $('#ans'), b = foot.querySelector('button');
    inp.addEventListener('input', () => { b.disabled = !inp.value.trim(); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); check(); } });
    speak(x.it.say);
  }
  // падеж: фраза с пропуском и четыре формы одного слова
  function tCase(x) {
    const d = x.d, forms = CASES.nouns[d.n], right = forms[CASE_I[d.c]];
    x.right = right;
    // звательная форма у неодушевлённых слов звучит странно — в варианты её не берём
    const pool = forms.filter((f, k) => k !== CASE_I.V || d.c === 'V' || /^(brat|sestra|mama|prijatelj|lekar)$/.test(d.n));
    x.opts = shuffle([right].concat(shuffle([...new Set(pool)].filter((f) => f !== right)).slice(0, 3)));
    const [a, b] = d.s.split('___');
    stage.innerHTML = '<p class="eyebrow">Падежи · вставьте слово в нужной форме</p><div class="cz"><p class="cz-s" lang="sr">' + esc(sr(a)) + '<span class="gap">?</span>' + esc(sr(b)) + '</p><p class="cz-ru">' + esc(d.ru) + '</p><p class="cz-n">Слово: <b lang="sr">' + esc(sr(d.n)) + '</b></p></div>' +
      '<div class="opts">' + x.opts.map((o, k) => '<button class="opt" data-copt="' + k + '" lang="sr">' + esc(sr(o)) + '</button>').join('') + '</div>';
  }
  function chooseCase(k) {
    const x = P.q[P.i], d = x.d, ok = x.opts[k] === x.right;
    stage.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (x.opts[j] === x.right) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    const g = stage.querySelector('.gap'); if (g) { g.textContent = sr(x.right); g.classList.add(ok ? 'ok' : 'bad'); }
    P.n++;
    if (ok) { P.ok++; addXP(1); } else P.wrong.add('case:' + d.id);
    S.cases[d.id] = { ok, n: ((S.cases[d.id] || {}).n || 0) + 1 };
    if (!ok && !P.retried.has('case:' + d.id) && P.kind !== 'exam') { P.retried.add('case:' + d.id); P.q.push({ t: 'case', d }); }
    save(); P.answered = true; persistRun(); beep(ok);
    const full = d.s.replace('___', x.right), c = CASE_BY[d.c];
    foot.innerHTML = '<div class="fb ' + (ok ? 'ok' : 'bad') + '" role="status"><p class="fb-h">' + (ok ? 'Točno! Верно' : 'Не совсем') + '</p><p class="fb-a"><b lang="sr">' + esc(sr(full)) + '</b></p>' +
      '<p class="fb-a"><span class="case-b sm">' + c.c + '</span> ' + esc(c.sr) + ' — ' + esc(d.why) + '</p><button class="btn wide ' + (ok ? 'go' : 'stop') + '" data-act="next">Дальше</button></div>';
    if (S.autoplay) speak(full);
  }
  // грамматика: фраза с пропуском и варианты
  function tGap(x) {
    const d = x.d;
    x.opts = shuffle(d.opts.slice());
    const [a, b] = d.s.split('___');
    stage.innerHTML = '<p class="eyebrow">Грамматика · ' + esc(d.lesson.title) + '</p><div class="cz"><p class="cz-s" lang="sr">' + esc(sr(a)) + '<span class="gap">?</span>' + esc(sr(b)) + '</p><p class="cz-ru">' + esc(d.ru) + '</p>' + (d.hint ? '<p class="cz-n">Подсказка: <b>' + esc(d.hint) + '</b></p>' : '') + '</div>' +
      '<div class="opts">' + x.opts.map((o, k) => '<button class="opt" data-gopt="' + k + '" lang="sr">' + esc(sr(o)) + '</button>').join('') + '</div>';
  }
  function chooseGap(k) {
    const x = P.q[P.i], d = x.d, ok = x.opts[k] === d.a;
    stage.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (x.opts[j] === d.a) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    const g = stage.querySelector('.gap'); if (g) { g.textContent = sr(d.a); g.classList.add(ok ? 'ok' : 'bad'); }
    P.n++;
    if (ok) { P.ok++; addXP(1); } else P.wrong.add('gap:' + d.id);
    S.gram[d.id] = { ok, n: ((S.gram[d.id] || {}).n || 0) + 1 };
    if (!ok && !P.retried.has('gap:' + d.id) && P.kind !== 'exam') { P.retried.add('gap:' + d.id); P.q.push({ t: 'gap', d }); }
    save(); P.answered = true; persistRun(); beep(ok);
    const full = d.s.replace('___', d.a);
    foot.innerHTML = '<div class="fb ' + (ok ? 'ok' : 'bad') + '" role="status"><p class="fb-h">' + (ok ? 'Točno! Верно' : 'Не совсем') + '</p><p class="fb-a"><b lang="sr">' + esc(sr(full)) + '</b> — ' + esc(d.ru) + '</p>' +
      (d.why ? '<p class="fb-a">' + esc(d.why) + '</p>' : '') + '<button class="btn wide ' + (ok ? 'go' : 'stop') + '" data-act="next">Дальше</button></div>';
    if (S.autoplay) speak(full.replace(/^— /, ''));
  }
  function tBuild(x) {
    // первое слово фразы — со строчной, иначе заглавная буква подсказывает начало
    const split = (t) => t.replace(/[.,!?¿¡;:]/g, '').split(/\s+/).map((w, k) => (k ? w : w[0].toLowerCase() + w.slice(1)));
    const toks = split(x.it.say);
    const extra = shuffle(ITEMS.filter((y) => y.multi && y !== x.it).flatMap((y) => split(y.say)))
      .filter((w) => !toks.some((t) => t.toLowerCase() === w.toLowerCase()));
    const ex = [...new Set(extra.map((w) => w.toLowerCase()))].slice(0, Math.min(3, Math.max(2, 7 - toks.length)));
    x.bank = shuffle(toks.concat(ex)).map((w, k) => ({ w, k }));
    x.ansT = [];
    stage.innerHTML = '<p class="eyebrow">Соберите фразу</p><p class="ru-big q">' + esc(x.it.ru) + '</p><div class="build-a" id="ba" aria-label="Ваш ответ"></div><div class="build-b" id="bb"></div>';
    foot.innerHTML = '<button class="btn primary wide" data-act="check" disabled>Проверить</button>';
    drawBuild(x);
  }
  function drawBuild(x) {
    const used = new Set(x.ansT);
    $('#ba').innerHTML = x.ansT.map((k) => '<button class="tile" data-tile="' + k + '" lang="sr">' + esc(sr(x.bank[k].w)) + '</button>').join('');
    $('#bb').innerHTML = x.bank.map((t) => '<button class="tile' + (used.has(t.k) ? ' ghost' : '') + '" data-tile="' + t.k + '"' + (used.has(t.k) ? ' disabled' : '') + ' lang="sr">' + esc(sr(t.w)) + '</button>').join('');
    const b = foot.querySelector('[data-act="check"]'); if (b) b.disabled = !x.ansT.length;
  }
  function tMatch(x) {
    x.L = shuffle(x.items); x.R = shuffle(x.items); x.sel = null; x.done = new Set(); x.miss = 0;
    stage.innerHTML = '<p class="eyebrow">Найдите пары</p><div class="match"><div>' + x.L.map((it, k) => '<button class="opt m" data-ml="' + k + '" lang="sr">' + esc(sr(it.sr)) + '</button>').join('') + '</div><div>' + x.R.map((it, k) => '<button class="opt m" data-mr="' + k + '">' + esc(it.ru) + '</button>').join('') + '</div></div>';
  }
  function matchTap(side, k) {
    const x = P.q[P.i];
    const it = (side === 'l' ? x.L : x.R)[k];
    if (x.done.has(it.id)) return;
    if (side === 'l') speak(it.say);
    if (!x.sel || x.sel.side === side) {
      stage.querySelectorAll('.m.sel').forEach((b) => b.classList.remove('sel'));
      x.sel = { side, k, it };
      stage.querySelector('[data-m' + side + '="' + k + '"]').classList.add('sel');
      return;
    }
    const a = x.sel, el1 = stage.querySelector('[data-m' + a.side + '="' + a.k + '"]'), el2 = stage.querySelector('[data-m' + side + '="' + k + '"]');
    x.sel = null;
    el1.classList.remove('sel');
    if (a.it === it) {
      x.done.add(it.id); el1.classList.add('right'); el2.classList.add('right'); el1.disabled = el2.disabled = true;
      beep(true);
      if (x.done.size === x.items.length) {
        const ok = x.miss === 0;
        P.n++; if (ok) P.ok++;
        x.items.forEach((y) => mark(y, !x.missed || !x.missed.has(y.id)));
        addXP(ok ? 2 : 1); save(); P.answered = true; persistRun();
        feedback(ok, null, ok ? 'Все пары верно!' : 'Готово, ошибок: ' + x.miss);
      }
    } else {
      x.miss++;
      x.missed = x.missed || new Set();
      x.missed.add((a.side === 'l' ? a.it : it).id);
      beep(false);
      [el1, el2].forEach((e) => { e.classList.add('bad'); setTimeout(() => e.classList.remove('bad'), 450); });
    }
  }

  function answer(ok, exactNote) {
    const x = P.q[P.i];
    P.n++;
    if (ok) { P.ok++; addXP(1); } else P.wrong.add(x.it.id);
    mark(x.it, ok);
    if (!ok && P.kind === 'lesson' && !P.retried.has(x.it.id)) {
      P.retried.add(x.it.id);
      const alt = taskFor(x.it, ['pickRu']);
      if (alt.t === x.t) alt.t = x.t === 'pickRu' ? 'pickSr' : 'pickRu';
      P.q.push(alt);
    }
    save(); P.answered = true; persistRun();
    beep(ok);
    // в диктанте и аудировании фраза на экране не показана — после верного ответа всегда даём её с переводом
    feedback(ok, x.it, exactNote || (ok && (x.t === 'dict' || x.t === 'listen') ? 'Перевод: ' : ''));
    if (S.autoplay && x.t !== 'listen') speak(x.it.say);
  }
  function feedback(ok, it, note) {
    let h = '<div class="fb ' + (ok ? 'ok' : 'bad') + '" role="status"><p class="fb-h">' + (ok ? 'Točno! Верно' : 'Не совсем') + '</p>';
    if (it && (!ok || note)) h += '<p class="fb-a">' + (ok ? note : 'Правильно: ') + '<b lang="sr">' + esc(sr(it.sr)) + '</b> — ' + esc(it.ru) + '</p>';
    else if (note) h += '<p class="fb-a">' + esc(note) + '</p>';
    h += '<button class="btn wide ' + (ok ? 'go' : 'stop') + '" data-act="next">Дальше</button></div>';
    foot.innerHTML = h;
  }
  function check() {
    const x = P.q[P.i];
    if (x.t === 'type' || x.t === 'dict') {
      const v = $('#ans').value, it = x.it;
      $('#ans').disabled = true;
      const exact = it.alts.some((a) => norm(a) === norm(v));
      const loose = exact || it.alts.some((a) => bare(a) === bare(v));
      $('#ans').classList.add(loose ? 'right' : 'wrong');
      answer(loose, loose && !exact ? 'Засчитано. Точное написание: ' : '');
    } else if (x.t === 'build') {
      const v = x.ansT.map((k) => x.bank[k].w).join(' ');
      const ok = x.it.alts.some((a) => norm(a) === norm(v));
      $('#ba').classList.add(ok ? 'right' : 'wrong');
      stage.querySelectorAll('.tile').forEach((b) => { b.disabled = true; });
      answer(ok);
    }
  }
  function choose(k) {
    const x = P.q[P.i];
    const o = x.opts[k], ok = o === x.it;
    stage.querySelectorAll('.opt').forEach((b, j) => { b.disabled = true; if (x.opts[j] === x.it) b.classList.add('right'); else if (j === k) b.classList.add('wrong'); });
    answer(ok);
  }
  function next() {
    if (!P) return;
    P.i++;
    if (P.i >= P.q.length) return finish();
    renderTask();
  }
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
    const dpr = window.devicePixelRatio || 1, W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, cx = cv.getContext('2d');
    const css = getComputedStyle(document.documentElement);
    const cols = ['--l1', '--l3', '--l4', '--l6', '--gold'].map((v) => css.getPropertyValue(v).trim() || '#f0b73a');
    const parts = Array.from({ length: 90 }, () => ({ x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 14 * dpr, vy: (-Math.random() * 12 - 4) * dpr, r: (4 + Math.random() * 5) * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function tick(t) {
      const k = (t - t0) / 1600; cx.clearRect(0, 0, W, H);
      parts.forEach((p) => { p.vy += 0.45 * dpr; p.x += p.vx; p.y += p.vy; p.a += p.va; cx.save(); cx.globalAlpha = Math.max(0, 1 - k); cx.translate(p.x, p.y); cx.rotate(p.a); cx.fillStyle = p.c; cx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); cx.restore(); });
      if (k < 1) requestAnimationFrame(tick); else cv.remove();
    })(t0);
  }
  function finish() {
    dropRun();
    track('done', P.kind + ':' + (P.l ? P.l.id : P.u ? P.u.id : P.ref || ''), P.n ? Math.round((P.ok / P.n) * 100) : 100);
    setBar(1);
    cnt.textContent = '';
    const pct = P.n ? Math.round((P.ok / P.n) * 100) : 100;
    const st = pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
    let head = '', sub = '', bonus = 5;
    if (P.kind === 'lesson') {
      const r = S.lessons[P.l.id] || { stars: 0, best: 0, runs: 0 };
      S.lessons[P.l.id] = { stars: Math.max(r.stars, st), best: Math.max(r.best, pct), runs: r.runs + 1 };
      head = 'Урок пройден'; sub = stars(st);
    } else if (P.kind === 'test') {
      const passed = pct >= 80, r = S.tests[P.u.id] || { best: 0, passed: false };
      S.tests[P.u.id] = { best: Math.max(r.best, pct), passed: r.passed || passed };
      head = passed ? 'Тест сдан' : 'Пока не сдан'; sub = passed ? '<p class="res-sub">Юнит «' + esc(P.u.title) + '» закрыт.</p>' : '<p class="res-sub">Нужно 80%. Повторите уроки юнита и попробуйте снова.</p>';
      bonus = passed ? 15 : 0;
    } else if (P.kind === 'exam') {
      const passed = pct >= 80, r = S.exams[P.ref] || { best: 0, passed: false };
      S.exams[P.ref] = { best: Math.max(r.best, pct), passed: r.passed || passed };
      head = passed ? 'Экзамен ' + P.ref + ' сдан!' : 'Экзамен не сдан'; sub = '<p class="res-sub">' + (passed ? 'Уровень ' + P.ref + ' подтверждён. Bravo!' : 'Нужно 80%. Повторите слова и падежи уровня.') + '</p>';
      bonus = passed ? 25 : 0;
    } else if (P.kind === 'daily') { S.daily[today()] = true; Object.keys(S.daily).sort().slice(0, -60).forEach((k) => delete S.daily[k]); head = 'Урок дня выполнен'; sub = stars(st); bonus = 10; }
    else if (P.kind === 'gram') { head = 'Грамматика: ' + pct + '%'; sub = '<p class="res-sub">Освоено ' + GAPS_ALL.filter(gapOk).length + ' из ' + GAPS_ALL.length + ' заданий.</p>'; bonus = 3; }
    else if (P.kind === 'cases') { head = 'Падежи: ' + pct + '%'; sub = '<p class="res-sub">Освоено ' + CASES.drills.filter(caseOk).length + ' из ' + CASES.drills.length + ' фраз.</p>'; bonus = 3; }
    else if (P.kind === 'drill' || P.kind === 'wod') { head = 'Тренировка окончена'; sub = stars(st); bonus = 3; }
    else { head = 'Повтор окончен'; bonus = 3; }
    addXP(bonus);
    if (!S.days.includes(today())) S.days.push(today());
    S.days = S.days.slice(-400);
    save();
    const wrong = [...P.wrong].map((id) => BY_ID[id]).filter(Boolean);
    const wrongC = [...P.wrong].filter((id) => /^case:/.test(id)).map((id) => DRILL_BY[id.slice(5)]).filter(Boolean);
    const wrongG = [...P.wrong].filter((id) => /^gap:/.test(id)).map((id) => GAP_BY[id.slice(4)]).filter(Boolean);
    stage.innerHTML = '<div class="res"><p class="eyebrow">' + esc(P.title) + '</p><h2 class="t-h">' + head + '</h2>' + sub +
      '<div class="res-row"><div><b>' + pct + '%</b><span>верно</span></div><div><b>+' + (P.ok + bonus) + '</b><span>XP</span></div><div><b>' + streak() + '</b><span>' + plural(streak(), 'день', 'дня', 'дней') + ' подряд</span></div></div>' +
      (wrong.length || wrongC.length || wrongG.length ? '<h3 class="sub">Над этим стоит поработать</h3><ul class="list compact">' + wrong.map((it) => '<li><button data-say="' + esc(it.say) + '"><span lang="sr">' + esc(sr(it.sr)) + '</span><small>' + esc(it.ru) + '</small></button></li>').join('') +
        wrongC.map((d) => { const f = d.s.replace('___', CASES.nouns[d.n][CASE_I[d.c]]); return '<li><button data-say="' + esc(f) + '"><span lang="sr">' + esc(sr(f)) + '</span><small>' + esc(d.why) + '</small></button></li>'; }).join('') +
        wrongG.map((d) => { const f = d.s.replace('___', d.a); return '<li><button data-say="' + esc(f) + '"><span lang="sr">' + esc(sr(f)) + '</span><small>' + esc(d.why || d.ru) + '</small></button></li>'; }).join('') + '</ul>' : '<p class="res-sub">Без единой ошибки. Svaka čast!</p>') + '</div>';
    const again = P.kind === 'lesson' ? 'data-lesson="' + P.l.id + '"' : P.kind === 'test' ? 'data-test="' + P.u.id + '"' : P.kind === 'review' ? 'data-review="any"' : 'data-start="' + P.kind + '" data-ref="' + esc(P.ref || '') + '"';
    foot.innerHTML = '<div class="duo"><button class="btn" ' + again + '>Ещё раз</button><button class="btn primary" data-act="done">Готово</button></div>';
    if (pct >= 70 && !((P.kind === 'test' || P.kind === 'exam') && pct < 80)) confetti();
  }

  // крестик просто закрывает: урок сохранён и продолжится с того же места
  function askQuit() {
    if (P && P.i >= P.q.length) P = null; // итоги уже показаны
    closePlay();
  }

  // ---------- события ----------
  document.addEventListener('click', (e) => {
    const fc = e.target.closest('[data-flip]');
    if (fc && !e.target.closest('button')) { flipCard(); return; }
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    const d = b.dataset;
    if (d.say !== undefined) { speak(d.say, !!d.slow); if (!b.classList.contains('opt')) return; }
    if (d.view) { view = d.view; arg = null; resetArm = false; render(); window.scrollTo(0, 0); return; }
    if (d.nav) { if (d.nav !== view || d.arg !== arg) { dlgShown = new Set(); rdOpen = new Set(); rdQuiz = {}; if (d.nav !== 'speak') stopTalk(); } view = d.nav; arg = d.arg || null; if (view === 'cards') deck = null; render(); window.scrollTo(0, 0); return; }
    if (d.start) { start(d.start, d.ref || null); return; }
    if (d.copt !== undefined) { chooseCase(+d.copt); return; }
    if (d.gopt !== undefined) { chooseGap(+d.gopt); return; }
    if (d.dmode) { dlgMode = d.dmode; dlgShown = new Set(); render(); return; }
    if (d.dshow !== undefined) { dlgShown.add(+d.dshow); render(); const dl = DIALOGS.find((x) => x.id === arg); if (dl) speak(dl.lines[+d.dshow][1]); return; }
    if (d.dlgdone) { addXP(S.dlg[d.dlgdone] ? 1 : 3); S.dlg[d.dlgdone] = (S.dlg[d.dlgdone] || 0) + 1; markDay(); save(); render(); flashTop('Диалог засчитан!'); return; }
    if (d.rs !== undefined) { const k = +d.rs; if (rdOpen.has(k)) rdOpen.delete(k); else rdOpen.add(k); const t = READING.find((x) => x.id === arg); render(); if (t && rdOpen.has(k)) speak(t.text[k][0]); return; }
    if (d.qz) { const [k, j] = d.qz.split(':').map(Number); rdQuiz[k] = j; const t = READING.find((x) => x.id === arg); beep(t && t.quiz[k].a === j); if (t && Object.keys(rdQuiz).length === t.quiz.length && !S.reads[t.id]) { const ok = t.quiz.filter((q, i) => rdQuiz[i] === q.a).length; if (ok === t.quiz.length) { S.reads[t.id] = 1; addXP(4); markDay(); save(); confetti(); } } render(); return; }
    if (d.topicdone) { S.topics[d.topicdone] = (S.topics[d.topicdone] || 0) + 1; addXP(3); markDay(); save(); stopTalk(); render(); flashTop('Molodec! Тема засчитана, +3 XP'); return; }
    if (d.dtype) { drillType = d.dtype; render(); return; }
    if (d.go) { view = d.go; render(); return; }
    if (d.lesson) { start('lesson', d.lesson); return; }
    if (d.test) { start('test', d.test); return; }
    if (d.review) { start('review', d.review); return; }
    if (d.dtab) { dictTab = d.dtab; render(); return; }
    if (d.card) { cardAct(d.card); return; }
    if (d.opt !== undefined) { choose(+d.opt); return; }
    if (d.ml !== undefined) { matchTap('l', +d.ml); return; }
    if (d.mr !== undefined) { matchTap('r', +d.mr); return; }
    if (d.tile !== undefined) {
      const x = P.q[P.i], k = +d.tile;
      if (b.closest('#ba')) x.ansT = x.ansT.filter((t) => t !== k); else { x.ansT.push(k); speak(x.bank[k].w); }
      drawBuild(x); return;
    }
    if (d.set) { S[d.set] = d.set === 'goal' ? +d.val : d.val; save(); render(); return; }
    if (d.export !== undefined) {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
      const ta = $('#imp');
      Promise.resolve().then(() => navigator.clipboard.writeText(code)).then(() => flash('Код скопирован. Вставьте его в Заметки.'), () => { ta.value = code; ta.select(); flash('Код в поле выше — выделите и скопируйте вручную.'); });
      return;
    }
    if (d.import !== undefined) {
      try { restore(JSON.parse(decodeURIComponent(escape(atob($('#imp').value.trim()))))); } catch (er) { flash('Код не подошёл. Скопируйте его целиком, без пробелов по краям.'); }
      return;
    }
    if (d.fb !== undefined) {
      const text = $('#fb').value.trim(), m = $('#fbmsg');
      if (!text) { m.textContent = 'Напишите пару слов в поле выше.'; return; }
      b.disabled = true; m.textContent = 'Отправляем…';
      fetch('api/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, contact: $('#fbc').value.trim(), view: view, ver: APP_VER, sa: standalone() }) })
        .then((r) => r.json()).then((j) => { if (!j.ok) throw new Error(); $('#fb').value = ''; m.textContent = 'Спасибо! Сообщение отправлено.'; })
        .catch(() => { m.innerHTML = 'Не получилось отправить. Напишите нам в Telegram: <a href="https://t.me/srpski_coach" target="_blank" rel="noopener">@srpski_coach</a>'; })
        .finally(() => { b.disabled = false; });
      return;
    }
    if (d.backup !== undefined) {
      S.lastBackup = Date.now(); save();
      const name = 'srpski-progress-' + new Date().toISOString().slice(0, 10) + '.json';
      const blob = new Blob([JSON.stringify({ app: 'srpski', v: 1, saved: S.lastBackup, state: S })], { type: 'application/json' });
      const file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
      // на iPhone — меню «Поделиться» с пунктом «Сохранить в Файлы»; на компьютере — обычное скачивание
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Прогресс Srpski' }).then(() => { render(); flash('Копия сохранена.'); }, () => { /* передумали */ });
      } else {
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000); render(); flash('Файл ' + name + ' сохранён в «Загрузки».');
      }
      return;
    }
    if (d.reset !== undefined) {
      if (!resetArm) { resetArm = true; render(); return; }
      const keep = { script: S.script, both: S.both, autoplay: S.autoplay, sfx: S.sfx, rate: S.rate };
      S = Object.assign({}, DEF, keep, { days: [], lessons: {}, tests: {}, words: {} }); resetArm = false; save(); render(); flash('Прогресс сброшен.');
      return;
    }
    switch (d.act) {
      case 'begin': renderTask(); break;
      case 'next': next(); break;
      case 'check': check(); break;
      case 'done': P = null; closePlay(); break;
      case 'resume': { const r = loadRun(); if (r) resume(r); else render(); break; }
      case 'theme': { const dark = S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches); S.theme = dark ? 'light' : 'dark'; save(); render(); break; }
      case 'spin': doSpin(); break;
      case 'itiphide': S.installHide = true; save(); render(); break;
      case 'talk': toggleTalk(); break;
      case 'rec': toggleRec(); break;
      case 'dlgplay': { const dl = DIALOGS.find((x) => x.id === arg) || DIALOGS[0]; speakSeq(dl.lines.map(([w, t], k) => [t, w ? 1.15 : 0.85, k])); break; }
      case 'rdplay': { const t = READING.find((x) => x.id === arg) || READING[0]; speakSeq(t.text.map(([x], k) => [x, 1, k])); break; }
      case 'rdreset': rdQuiz = {}; render(); break;
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.tog) { S[t.dataset.tog] = t.checked; save(); if (t.dataset.tog === 'cardsShuffle') buildDeck(); if (t.dataset.tog === 'both' || t.dataset.tog === 'cardsShuffle') render(); }
    if (t.id === 'ctopic') { S.cardsTopic = t.value; save(); buildDeck(); render(); }
    if (t.dataset.rate !== undefined) { S.rate = +t.value; save(); render(); speak('Dobar dan'); }
    if (t.id === 'dunit') { drillUnit = t.value; render(); }
    if (t.id === 'impf' && t.files && t.files[0]) {
      t.files[0].text().then((txt) => { const o = JSON.parse(txt); restore(o && o.state ? o.state : o); }).catch(() => flash('Этот файл не похож на копию прогресса Srpski.'));
    }
    if (t.dataset.dtr !== undefined) { dlgTr = t.checked; render(); }
    if (t.dataset.rdall !== undefined) { rdAll = t.checked; render(); }
  });
  $('#quit').addEventListener('click', askQuit);
  document.querySelectorAll('#tabs button').forEach((b) => { b.innerHTML = I[b.dataset.icon] + '<span>' + b.textContent + '</span>'; });
  $('#quit').innerHTML = I.close;

  render();
  // приложение с экрана «Домой» часто не перезагружается — обновляем «сегодня» при возврате и в полночь
  let shownDay = dayNo();
  const refreshDay = () => { if (dayNo() !== shownDay && play.hidden) { shownDay = dayNo(); deck = null; render(); } };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshDay(); });
  window.addEventListener('focus', refreshDay);
  setInterval(refreshDay, 60 * 1000);
  { const r = loadRun(); if (r && r.open) resume(r); }
  if (!S.welcomed && !Object.keys(S.lessons).length && !loadRun()) { track('new'); showWelcome(); }
  // раз в день — «открыл приложение» (для счёта активных людей), один раз — «установил на экран Домой»
  const pingOpen = () => { if (S.lastOpen !== today()) { S.lastOpen = today(); save(); track('open', '', Object.keys(S.lessons).length); } };
  pingOpen(); document.addEventListener('visibilitychange', () => { if (!document.hidden) pingOpen(); });
  if (standalone() && !S.installed) { S.installed = true; save(); track('install'); }
  function showWelcome() {
    const w = document.createElement('section'); w.id = 'welcome'; w.setAttribute('aria-label', 'Добро пожаловать');
    const draw = () => {
      w.innerHTML = '<div class="wel">' + plate('Ćao!', 'big') + '<h1>Сербский для русских</h1><p class="wel-lead">Слова и фразы, чтобы освоиться в Сербии. 5 минут в день.</p>' +
        '<ul class="wel-list"><li><b>31 урок</b> — от «Zdravo» до врача и документов</li><li><b>Озвучка</b> каждого слова и упражнения</li><li><b>Повтор</b> в нужный момент, чтобы слова не забывались</li></ul>' +
        '<p class="eyebrow">Каким алфавитом показывать слова?</p><div class="seg"><button data-wscript="lat" aria-pressed="' + (S.script === 'lat') + '">Latinica</button><button data-wscript="cyr" aria-pressed="' + (S.script === 'cyr') + '">Ћирилица</button></div>' +
        '<p class="hint">Вывески и меню чаще на латинице. Поменять можно в «Ещё».</p>' +
        '<button class="btn primary wide" data-wgo="start">Начать первый урок</button><button class="btn wide ghost" data-wgo="look">Сначала осмотрюсь</button></div>';
    };
    draw(); document.body.appendChild(w); document.body.classList.add('playing');
    w.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.wscript) { S.script = b.dataset.wscript; save(); draw(); return; }
      if (b.dataset.wgo) { S.welcomed = true; save(); w.remove(); document.body.classList.remove('playing'); render(); if (b.dataset.wgo === 'start') start('lesson', LESSONS[0].id); }
    });
  }
  // просим браузер не чистить данные приложения
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* не важно */ }
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !/claude|anthropic/.test(location.hostname)) {
    const had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // приложение с экрана «Домой» на iPhone часто не перезапускается, а просыпается — проверяем обновление при каждом возвращении
      const check = () => reg.update().catch(() => { /* офлайн */ });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
    }).catch(() => { /* офлайн недоступен — не страшно */ });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!had) return; // первый запуск: служебный файл только что установился, обновлять нечего
      updReady = true;
      try { sessionStorage.setItem('srpski.updated', '1'); } catch (e) { /* не важно */ }
      if (!document.body.classList.contains('playing')) location.reload();
    });
  }
  try {
    if (sessionStorage.getItem('srpski.updated')) {
      sessionStorage.removeItem('srpski.updated');
      const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = 'Приложение обновлено ✓ Прогресс на месте.';
      document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
    }
  } catch (e) { /* не важно */ }
})();
