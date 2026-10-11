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
  const DEF = { script: 'lat', both: true, autoplay: true, sfx: true, rate: 0.9, theme: 'system', goal: 20, cards: {}, cardsTopic: 'all', cardsShuffle: true, xp: 0, xpd: {}, days: [], lessons: {}, tests: {}, words: {} };
  let S;
  try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = Object.assign({}, DEF); }
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
  let view = 'course';
  try { view = localStorage.getItem('srpski.view') || 'course'; } catch (e) { /* по умолчанию курс */ }
  let dictTab = 'words', dictQ = '';
  const main = $('#main');

  function render() {
    applyTheme();
    document.querySelectorAll('#tabs button').forEach((b) => b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false'));
    try { localStorage.setItem('srpski.view', view); } catch (e) { /* не важно */ }
    main.innerHTML = { course: vCourse, review: vReview, cards: vCards, dict: vDict, more: vMore }[view]();
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
  const wordOfDay = () => DAILY[Math.floor(Date.now() / 864e5 + 3) % DAILY.length];
  function ring(val, max, inner) {
    const r = 26, c = 2 * Math.PI * r, f = Math.min(1, val / max);
    return '<div class="ring" role="img" aria-label="Цель дня: ' + val + ' из ' + max + ' XP"><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="' + r + '" class="ring-bg"/><circle cx="32" cy="32" r="' + r + '" class="ring-fg' + (f >= 1 ? ' full' : '') + '" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - f)).toFixed(1) + '"/></svg><span>' + inner + '</span></div>';
  }

  function vCourse() {
    const st = streak(), nx = nextStep();
    const doneL = LESSONS.filter((l) => S.lessons[l.id]).length;
    const [g, gru] = greet(), xt = xpToday(), goal = S.goal || 20;
    const wd = wordOfDay();
    let h = '<header class="hello"><div class="hello-t"><p class="eyebrow">' + new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }) + '</p>' +
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
    let h = '<header class="top"><div><p class="eyebrow">Справочник</p><h1>Разговорник</h1></div></header>' +
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
    let h = '<header class="top"><div><p class="eyebrow">Тренажёр</p><h1>Карточки</h1></div></header>' +
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
      '<h3 class="sub">Прогресс</h3><div class="card"><div class="row"><span><b>Сохранить копию</b><small>Код прогресса — сохраните в Заметки, чтобы перенести на другое устройство</small></span><button class="btn sm" data-export>Копировать</button></div>' +
      '<div class="row col"><label for="imp"><b>Восстановить из кода</b></label><textarea id="imp" rows="2" placeholder="Вставьте код прогресса"></textarea><button class="btn sm" data-import>Восстановить</button></div>' +
      '<div class="row"><span><b>Сбросить прогресс</b><small>Удалит уроки, тесты и повторение</small></span><button class="btn sm danger" data-reset>' + (resetArm ? 'Точно сбросить' : 'Сбросить') + '</button></div></div>' +
      '<p class="hint" id="msg" role="status"></p>' +
      '<p class="hint">Чтобы открыть как приложение: в Safari нажмите «Поделиться» → «На экран „Домой“». Прогресс хранится только на этом телефоне.</p>';
  }
  const flash = (t) => { const m = $('#msg'); if (m) m.textContent = t; };

  // ---------- сессии ----------
  let P = null;
  const play = $('#play'), stage = $('#stage'), foot = $('#foot'), bar = $('#bar'), cnt = $('#count');

  function taskFor(it, pool) {
    const c = ['pickSr'];
    if (tts.voice) c.push('listen');
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
      kind: P.kind, ref: P.l ? P.l.id : P.u ? P.u.id : null, title: P.title,
      q: P.q.map((x) => (x.t === 'match' ? { t: 'match', ids: x.items.map((y) => y.id) } : { t: x.t, id: x.it.id })),
      i: P.i, ok: P.ok, n: P.n, wrong: [...P.wrong], retried: [...P.retried], answered: !!P.answered, intro: !!P.intro, open,
    };
    try { localStorage.setItem(RUN, JSON.stringify(run)); } catch (e) { /* хранилище недоступно */ }
  }
  function loadRun() {
    try {
      const r = JSON.parse(localStorage.getItem(RUN) || 'null');
      if (!r || !r.q || !r.q.length) return null;
      // курс могли обновить: задания с исчезнувшими словами выбрасываем
      r.q = r.q.map((x) => (x.t === 'match' ? { t: 'match', items: x.ids.map((id) => BY_ID[id]).filter(Boolean) } : { t: x.t, it: BY_ID[x.id] }))
        .filter((x) => (x.t === 'match' ? x.items.length >= 2 : x.it));
      if (r.kind === 'lesson' && !LESSONS.find((l) => l.id === r.ref)) return null;
      if (r.kind === 'test' && !COURSE.find((u) => u.id === r.ref)) return null;
      return r.q.length ? r : null;
    } catch (e) { return null; }
  }
  const dropRun = () => { try { localStorage.removeItem(RUN); } catch (e) { /* не важно */ } };
  function resume(r) {
    P = { kind: r.kind, title: r.title, q: r.q, i: Math.min(r.i, r.q.length), ok: r.ok, n: r.n, wrong: new Set(r.wrong), retried: new Set(r.retried), t0: Date.now() };
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
    } else {
      let ids = shuffle(dueIds()).sort((a, b) => S.words[a].box - S.words[b].box);
      if (!ids.length || ref === 'any') ids = seenIds().sort((a, b) => (S.words[b].wrong || 0) - (S.words[a].wrong || 0) || S.words[a].box - S.words[b].box);
      ids = ids.slice(0, 12);
      q = shuffle(ids).map((id) => taskFor(BY_ID[id], ['pickRu', 'pickRu']));
      title = 'Повтор'; P = { kind };
    }
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
    ({ intro: tIntro, pickRu: tPickRu, pickSr: tPickSr, listen: tListen, type: tType, build: tBuild, match: tMatch })[x.t](x);
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
    feedback(ok, x.it, exactNote);
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
    if (x.t === 'type') {
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
    } else { head = 'Повтор окончен'; bonus = 3; }
    addXP(bonus);
    if (!S.days.includes(today())) S.days.push(today());
    S.days = S.days.slice(-400);
    save();
    const wrong = [...P.wrong].map((id) => BY_ID[id]).filter(Boolean);
    stage.innerHTML = '<div class="res"><p class="eyebrow">' + esc(P.title) + '</p><h2 class="t-h">' + head + '</h2>' + sub +
      '<div class="res-row"><div><b>' + pct + '%</b><span>верно</span></div><div><b>+' + (P.ok + bonus) + '</b><span>XP</span></div><div><b>' + streak() + '</b><span>' + plural(streak(), 'день', 'дня', 'дней') + ' подряд</span></div></div>' +
      (wrong.length ? '<h3 class="sub">Над этим стоит поработать</h3><ul class="list compact">' + wrong.map((it) => '<li><button data-say="' + esc(it.say) + '"><span lang="sr">' + esc(sr(it.sr)) + '</span><small>' + esc(it.ru) + '</small></button></li>').join('') + '</ul>' : '<p class="res-sub">Без единой ошибки. Svaka čast!</p>') + '</div>';
    const again = P.kind === 'lesson' ? 'data-lesson="' + P.l.id + '"' : P.kind === 'test' ? 'data-test="' + P.u.id + '"' : 'data-review="any"';
    foot.innerHTML = '<div class="duo"><button class="btn" ' + again + '>Ещё раз</button><button class="btn primary" data-act="done">Готово</button></div>';
    if (pct >= 70 && !(P.kind === 'test' && pct < 80)) confetti();
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
    if (d.view) { view = d.view; resetArm = false; render(); window.scrollTo(0, 0); return; }
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
      try {
        const o = JSON.parse(decodeURIComponent(escape(atob($('#imp').value.trim()))));
        if (!o || typeof o !== 'object' || !o.lessons) throw new Error();
        S = Object.assign({}, DEF, o); save(); render(); flash('Прогресс восстановлен.');
      } catch (er) { flash('Код не подошёл. Скопируйте его целиком, без пробелов по краям.'); }
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
    }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.tog) { S[t.dataset.tog] = t.checked; save(); if (t.dataset.tog === 'cardsShuffle') buildDeck(); if (t.dataset.tog === 'both' || t.dataset.tog === 'cardsShuffle') render(); }
    if (t.id === 'ctopic') { S.cardsTopic = t.value; save(); buildDeck(); render(); }
    if (t.dataset.rate !== undefined) { S.rate = +t.value; save(); render(); speak('Dobar dan'); }
  });
  $('#quit').addEventListener('click', askQuit);
  document.querySelectorAll('#tabs button').forEach((b) => { b.innerHTML = I[b.dataset.icon] + '<span>' + b.textContent + '</span>'; });
  $('#quit').innerHTML = I.close;

  render();
  { const r = loadRun(); if (r && r.open) resume(r); }
  if (!S.welcomed && !Object.keys(S.lessons).length && !loadRun()) showWelcome();
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
    navigator.serviceWorker.register('sw.js').catch(() => { /* офлайн недоступен — не страшно */ });
  }
})();
