// Генератор ежедневных публикаций @srpski_coach (Instagram + Telegram).
//
//   node promo/tools/daily.js --from 2026-10-12 --days 14
//
// Каждый день — три слота (время Белграда):
//   10:00 word  — «Слово дня»: одна карточка 4:5
//   15:00 lesson — карусель по уроку приложения
//   18:00 quiz  — «Проверь себя»: карусель вопрос → ответ (+ опрос-викторина в Telegram)
// Картинки — promo/daily/<дата>/, очередь с подписями — promo/daily/plan.json.
// Уже запланированные дни не перезаписываются; слова и уроки не повторяются, пока не кончатся.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'promo/daily');
const PLAN = path.join(OUT, 'plan.json');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');

// --- курс и подсказка произношения из приложения ---
global.window = {};
require(path.join(ROOT, 'js/data.js'));
const COURSE = window.COURSE;
require(path.join(ROOT, 'js/grammar.js'));
const GRAMMAR = window.GRAMMAR || [];
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const pron = new Function(appSrc.slice(appSrc.indexOf('  const VOW ='), appSrc.indexOf('  // ---------- курс')) + ';return pron;')();
const toCyr = new Function(appSrc.slice(appSrc.indexOf('  const L2C_DI'), appSrc.indexOf('  // ввод:')) + ';return toCyr;')();
const ITEMS = [];
COURSE.forEach((u, ui) => u.lessons.forEach((l) => l.items.forEach((a) => ITEMS.push({ id: l.id + '|' + a[0], sr: a[0], ru: a[1], note: a[2] || '', lesson: l, unit: u, un: ui + 1 }))));
const LESSONS = COURSE.flatMap((u, ui) => u.lessons.map((l) => Object.assign(l, { unit: u, un: ui + 1 })));

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => (x.startsWith('--') ? a.concat([[x.slice(2), arr[i + 1]]]) : a), []));
const DAYS = +(args.days || 14);
const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, 'utf8')) : { items: [] };
const lastDate = plan.items.length ? plan.items[plan.items.length - 1].date : null;
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const start = args.from || (lastDate ? addDays(lastDate, 1) : new Date().toISOString().slice(0, 10));

const used = { word: new Set(), lesson: new Set(), quiz: new Set() };
plan.items.forEach((p) => used[p.type] && used[p.type].add(p.ref));
// уроки, уже разобранные в первых постах, — в конец очереди
const LESSON_ORDER = LESSONS.filter((l) => !['1.1', '1.2', '4.1', '4.3', '4.4'].includes(l.id)).concat(LESSONS.filter((l) => ['1.1', '1.2', '4.1', '4.3', '4.4'].includes(l.id)));
// «слово дня» — короткие единицы с понятным переводом, по кругу через все юниты
const WORDS = (() => {
  const byUnit = COURSE.map((u) => ITEMS.filter((it) => it.unit === u && it.sr.split(' ').length <= 3 && !/^\d|\(\d+\)/.test(it.ru)));
  const out = []; for (let i = 0; out.length < ITEMS.length && i < 40; i++) byUnit.forEach((arr) => arr[i] && out.push(arr[i]));
  return out;
})();
const QUIZ = (() => { const a = ITEMS.filter((it) => it.sr.split(' ').length <= 4); const out = []; for (let k = 0; k < a.length; k++) out.push(a[(k * 37) % a.length]); return [...new Set(out)]; })();
// Правило: только новые посты. Что уже было в плане (опубликовано, пропущено или ждёт) — не повторяем.
// Закончился запас — слот не создаём и предупреждаем, а не крутим старое по кругу.
const take = (list, kind, key, also) => { const x = list.find((v) => !used[kind].has(key(v)) && !(also && used[also].has(key(v)))); if (x) used[kind].add(key(x)); return x || null; };
// уроки курса, потом уроки грамматики
const LESSON_POOL = LESSON_ORDER.map((l) => ({ id: l.id, l })).concat(GRAMMAR.map((g) => ({ id: 'g:' + g.id, g })));
const seenCaptions = new Set(plan.items.map((p) => p.caption));
const short = [];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TG = 'Больше слов каждый день — в Telegram: t.me/srpski_coach';
const APP = 'Все уроки с озвучкой — в бесплатном приложении Srpski, ссылка в профиле.';
const TAGS = '#сербскийязык #сербия #белград #русскиевсербии #изучениеязыков';
const foot = (r) => `<div class="foot"><span>@srpski_coach</span><span>${r}</span></div>`;
const plate = (w, extra = '') => `<div class="plate" ${extra}><span class="a">${esc(w)}</span><span class="c">${esc(toCyr(w))}</span></div>`;
const plateFit = (w) => { const n = w.length; const fs = n > 22 ? 56 : n > 14 ? 72 : 92; return `<div class="plate"><span class="a" style="font-size:${fs}px">${esc(w)}</span><span class="c">${esc(toCyr(w))}</span></div>`; };
const shuffle = (a, seed) => { a = a.slice(); let s = seed; for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function wordSlides(id, it, n) {
  return [`<div class="s blue" id="${id}-1">
    <p class="eyebrow">Слово дня · №${n}</p>
    <div style="margin:auto 0; display:flex; flex-direction:column; align-items:center; text-align:center">
      <div style="transform:scale(${it.sr.length <= 10 ? 1.25 : 1}); margin-bottom:${it.sr.length <= 10 ? 40 : 0}px">${plateFit(it.sr)}</div>
      <h1 style="margin-top:60px; font-size:80px">${esc(it.ru)}</h1>
      <p class="lead" style="margin-top:28px; font-size:46px">[${esc(pron(it.sr))}]</p>
      ${it.note ? `<p class="lead" style="margin-top:40px">${esc(it.note)}</p>` : ''}
      <p class="lead" style="margin-top:56px; font-size:30px">Из урока «${esc(it.lesson.title)}» · приложение Srpski</p>
    </div>
    ${foot('Сохраните 📌')}</div>`];
}
function lessonSlides(id, l) {
  const items = ITEMS.filter((it) => it.lesson === l).slice(0, 12);
  // не больше 5 фраз на слайд, поровну
  const nCh = Math.ceil(items.length / 5), per = Math.ceil(items.length / nCh);
  const chunks = Array.from({ length: nCh }, (_, k) => items.slice(k * per, (k + 1) * per));
  const s = [`<div class="s blue" id="${id}-1">
    <p class="eyebrow">Урок ${l.id} · ${esc(l.unit.title)}</p>
    <h1 style="margin-top:40px">${esc(l.title)}</h1>
    <p class="lead" style="margin-top:36px">${esc(l.tip)}</p>
    <div style="margin-top:auto; margin-bottom:48px">${plate(items[0].sr, 'style="transform:rotate(-3deg)"')}</div>
    ${foot('листайте →')}</div>`];
  chunks.forEach((ch, k) => s.push(`<div class="s" id="${id}-${k + 2}">
    <p class="eyebrow">${esc(l.title)}${chunks.length > 1 ? ` · ${k + 1}/${chunks.length}` : ''}</p>
    <h2 style="margin-top:24px">${k ? 'Ещё фразы' : 'Слова и фразы'}</h2>
    <div class="ph" style="gap:12px; margin-top:32px">${ch.map((it, i) => `<div><span class="n">${String(k * chunks[0].length + i + 1).padStart(2, '0')}</span><b>${esc(it.sr)}</b><span>${esc(it.ru)}<em>[${esc(pron(it.sr))}]</em></span></div>`).join('')}</div>
    ${foot('листайте →')}</div>`));
  s.push(`<div class="s blue" id="${id}-${chunks.length + 2}">
    <p class="eyebrow">Практика</p>
    <h2 style="margin-top:24px">Урок «${esc(l.title)}» — в приложении Srpski</h2>
    <p class="lead" style="margin-top:32px">Озвучка каждой фразы, упражнения и повторение. Бесплатно, без регистрации.</p>
    <div style="margin-top:72px; display:flex; flex-direction:column; gap:40px; align-items:flex-start">${plate(items[items.length - 1].sr, 'style="background:#fff; color:var(--enamel); box-shadow: inset 0 0 0 8px #fff, inset 0 0 0 12px var(--enamel), 0 18px 40px rgba(4,10,30,.3)"')}<span class="badge">Ссылка в профиле →</span></div>
    ${foot('Сохраните 📌')}</div>`);
  return s;
}
// урок грамматики: правило → таблица → примеры → приложение
function grammarSlides(id, g) {
  const t = g.table;
  const cell = (c, j, head) => `<td style="padding:16px 18px; border-top:2px solid #d8dee9; font:${head || !j ? 700 : 500} 32px/1.25 'Golos Text'; color:${head || !j ? 'var(--enamel)' : 'var(--ink)'}">${esc(c)}</td>`;
  return [`<div class="s blue" id="${id}-1">
    <p class="eyebrow">Грамматика · ${esc(g.lvl)}</p>
    <h1 style="margin-top:40px">${esc(g.title)}</h1>
    <p class="lead" style="margin-top:36px; font-size:34px">${esc(g.intro)}</p>
    ${foot('листайте →')}</div>`,
  `<div class="s" id="${id}-2">
    <p class="eyebrow">${esc(g.title)}</p>
    <h2 style="margin-top:24px">Таблица</h2>
    <table style="margin-top:36px; width:100%; border-collapse:collapse; background:#fff; border-radius:24px; overflow:hidden">
      <tr>${t.head.map((c, j) => cell(c, j, true)).join('')}</tr>${t.rows.map((r) => '<tr>' + r.map((c, j) => cell(c, j)).join('') + '</tr>').join('')}</table>
    ${foot('листайте →')}</div>`,
  `<div class="s" id="${id}-3">
    <p class="eyebrow">${esc(g.title)}</p>
    <h2 style="margin-top:24px">Примеры</h2>
    <div class="ph" style="gap:12px; margin-top:32px">${g.ex.slice(0, 5).map((e, i) => `<div><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${esc(e[0])}</b><span>${esc(e[1])}</span></div>`).join('')}</div>
    ${foot('листайте →')}</div>`,
  `<div class="s blue" id="${id}-4">
    <p class="eyebrow">Совет</p>
    <h2 style="margin-top:24px">${esc(g.tip)}</h2>
    <p class="lead" style="margin-top:40px">Тренировка с разбором ошибок — в бесплатном приложении Srpski, раздел «Грамматика».</p>
    <div style="margin-top:auto; margin-bottom:48px"><span class="badge">Ссылка в профиле →</span></div>
    ${foot('Сохраните 📌')}</div>`];
}
const senses = (ru) => ru.toLowerCase().replace(/\(.*?\)/g, '').split('/').map((x) => x.trim()).filter(Boolean);
function quizData(it, seed) {
  const mine = new Set(senses(it.ru));
  const pool = shuffle(ITEMS.filter((x) => x.unit === it.unit && x.sr !== it.sr && !senses(x.ru).some((v) => mine.has(v))), seed)
    .filter((x, i, a) => a.findIndex((y) => senses(y.ru).some((v) => senses(x.ru).includes(v))) === i);
  const dir = seed % 2 ? 'sr' : 'ru'; // sr: «что значит X?»  ru: «как по-сербски Y?»
  const wrong = pool.slice(0, 2);
  const opts = shuffle([it, ...wrong], seed + 7);
  const label = (x) => (dir === 'sr' ? x.ru.replace(/ \(\d+\)/, '') : x.sr);
  return { dir, opts: opts.map(label), correct: opts.indexOf(it), q: dir === 'sr' ? `Что значит «${it.sr}»?` : `Как сказать по-сербски «${it.ru.replace(/ \(\d+\)/, '')}»?` };
}
function quizSlides(id, it, qd) {
  const L = ['A', 'B', 'C'];
  return [`<div class="s" id="${id}-1">
    <p class="eyebrow">Проверь себя</p>
    <h1 style="margin-top:36px; font-size:76px">${esc(qd.q)}</h1>
    ${qd.dir === 'sr' ? `<div style="margin-top:40px">${plateFit(it.sr)}</div>` : ''}
    <div class="ph" style="margin-top:48px">${qd.opts.map((o, i) => `<div><span class="n">${L[i]}</span><b>${esc(o)}</b></div>`).join('')}</div>
    <p class="lead" style="margin-top:36px">Ответ — на следующем слайде. Сначала напишите свой в комментариях 👇</p>
    ${foot('листайте →')}</div>`,
  `<div class="s blue" id="${id}-2">
    <p class="eyebrow">Ответ</p>
    <h1 style="margin-top:36px">${L[qd.correct]} — верно!</h1>
    <div style="margin-top:56px">${plateFit(it.sr)}</div>
    <p class="lead" style="margin-top:44px; font-size:52px; color:#fff">${esc(it.ru)}</p>
    <p class="lead" style="margin-top:16px">[${esc(pron(it.sr))}]${it.note ? ' · ' + esc(it.note) : ''}</p>
    <span class="badge" style="margin-top:auto; margin-bottom:48px; align-self:flex-start">Ещё 300 фраз — в приложении Srpski</span>
    ${foot('@srpski_coach')}</div>`];
}

// --- собираем новые дни ---
const fresh = [];
let wordN = plan.items.filter((p) => p.type === 'word').length;
for (let d = 0; d < DAYS; d++) {
  const date = addDays(start, d);
  if (plan.items.some((p) => p.date === date)) continue;
  const w = take(WORDS, 'word', (x) => x.id, 'quiz');
  if (!w) short.push(date + ' 10:00 слово дня');
  else wordN++, fresh.push({ date, time: '10:00', type: 'word', ref: w.id, n: wordN, it: w,
    caption: `Слово дня: ${w.sr} — ${w.ru} 🇷🇸\n\nПроизношение: [${pron(w.sr)}]${w.note ? '\n' + w.note : ''}\n\nСохраните и попробуйте сказать сегодня вслух 📌\n\n${APP}\n${TG}\n\n${TAGS} #словодня` });
  const lp = take(LESSON_POOL, 'lesson', (x) => x.id);
  if (!lp) short.push(date + ' 15:00 урок');
  else if (lp.l) { const l = lp.l; fresh.push({ date, time: '15:00', type: 'lesson', ref: l.id, l,
    caption: `Урок ${l.id}: ${l.title} 🇷🇸\n\n${l.tip}\n\nВ карусели — ${Math.min(l.items.length, 12)} фраз с произношением. Сохраните, чтобы повторить 📌\nКакую фразу вы уже знали? Пишите в комментариях 👇\n\n${APP}\n${TG}\n\n${TAGS}` }); }
  else { const g = lp.g; fresh.push({ date, time: '15:00', type: 'lesson', ref: lp.id, g,
    caption: `Грамматика: ${g.title} 🇷🇸\n\n${g.tip}\n\nВ карусели — правило, таблица и примеры. Сохраните, чтобы не искать 📌\nОстались вопросы? Пишите в комментариях 👇\n\nТренировка с разбором ошибок — в бесплатном приложении Srpski, раздел «Грамматика», ссылка в профиле.\n${TG}\n\n${TAGS} #грамматика` }); }
  const q = take(QUIZ, 'quiz', (x) => x.id, 'word');
  if (!q) { short.push(date + ' 18:00 викторина'); continue; }
  const seed = plan.items.length + fresh.length + 11;
  const qd = quizData(q, seed);
  fresh.push({ date, time: '18:00', type: 'quiz', ref: q.id, it: q, qd,
    caption: `Проверь себя 🧠 ${qd.q}\n\nA) ${qd.opts[0]}\nB) ${qd.opts[1]}\nC) ${qd.opts[2]}\n\nПишите ответ в комментариях, правильный — на втором слайде 👉\n\n${APP}\n${TG}\n\n${TAGS} #викторина` });
}

// подстраховка: одинаковых подписей быть не должно
for (let i = fresh.length - 1; i >= 0; i--) { if (seenCaptions.has(fresh[i].caption)) { short.push(fresh[i].date + ' ' + fresh[i].time + ' (повтор подписи)'); fresh.splice(i, 1); } else seenCaptions.add(fresh[i].caption); }
if (short.length) console.log('⚠️ Новый контент закончился, слоты не созданы:', short.join(', '), '— добавьте уроки/слова, повторов не будет.');

(async () => {
  if (!fresh.length) return console.log('Новых дней нет: всё уже в плане.');
  const css = fs.readFileSync(path.join(__dirname, 'slides.css'), 'utf8');
  const blocks = [];
  for (const p of fresh) {
    const id = `${p.date}-${p.type}`;
    p.slides = p.type === 'word' ? wordSlides(id, p.it, p.n) : p.type === 'lesson' ? (p.g ? grammarSlides(id, p.g) : lessonSlides(id, p.l)) : quizSlides(id, p.it, p.qd);
    blocks.push(...p.slides);
  }
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;700;800&display=swap"><style>${css}</style></head><body>${blocks.join('\n')}</body></html>`;
  const tmp = path.join(OUT, '_render.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 1500 } });
  await page.goto('file://' + tmp); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
  const over = await page.$$eval('.s', (els) => els.filter((e) => e.scrollHeight > e.clientHeight + 2).map((e) => e.id));
  if (over.length) console.log('Не влезает (проверьте):', over.join(', '));
  const cleaned = new Set();
  for (const p of fresh) {
    const dir = path.join(OUT, p.date);
    if (!cleaned.has(dir)) { fs.rmSync(dir, { recursive: true, force: true }); cleaned.add(dir); }
    fs.mkdirSync(dir, { recursive: true });
    p.images = [];
    for (let k = 1; k <= p.slides.length; k++) {
      const file = `${p.time.slice(0, 2)}-${p.type}-${k}.jpg`;
      await (await page.$(`[id="${p.date}-${p.type}-${k}"]`)).screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 90 });
      p.images.push(`promo/daily/${p.date}/${file}`);
    }
    // для Telegram карусель — одной картинкой-сеткой
    if (p.images.length > 1) {
      const cols = 2, rows = Math.ceil(p.images.length / cols);
      const grid = `<!doctype html><body style="margin:0;background:#e3e9f6"><div id="g" style="display:grid;grid-template-columns:repeat(${cols},540px);gap:12px;padding:12px;width:${cols * 540 + 36}px">${p.images.map((f) => `<img src="file://${path.join(ROOT, f)}" style="width:540px;height:675px;border-radius:12px;display:block">`).join('')}</div></body>`;
      const gtmp = path.join(OUT, '_grid.html'); fs.writeFileSync(gtmp, grid);
      const gp = await b.newPage({ viewport: { width: 1200, height: 1500 } });
      await gp.goto('file://' + gtmp); await gp.waitForLoadState('load');
      const gfile = `${p.time.slice(0, 2)}-${p.type}-telegram.jpg`;
      await (await gp.$('#g')).screenshot({ path: path.join(dir, gfile), type: 'jpeg', quality: 88 });
      await gp.close(); fs.unlinkSync(gtmp);
      p.telegram_image = `promo/daily/${p.date}/${gfile}`;
      void rows;
    } else p.telegram_image = p.images[0];
    p.status = 'pending';
    delete p.slides; delete p.it; delete p.l; delete p.g;
    if (p.qd) { p.quiz = { question: p.qd.q, options: p.qd.opts, correct: p.qd.correct }; delete p.qd; }
  }
  await b.close();
  fs.unlinkSync(tmp);
  plan.items.push(...fresh);
  plan.items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log(`Добавлено ${fresh.length} публикаций: ${fresh[0].date} … ${fresh[fresh.length - 1].date}`);
})();
