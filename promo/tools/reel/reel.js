// Авто-Reels «Угадай слово за 3 секунды» с Тошей: слово из курса → 3 варианта → отсчёт → ответ с озвучкой.
//   node promo/tools/reel/reel.js plan [N]   — выбрать N новых слов, записать очередь и текст для озвучки (promo/reels/voice/auto.json)
//   node promo/tools/reel/reel.js render     — (после tts.js) отрисовать ролики, смешать звук и поставить в plan.json (пн/ср/пт 15:00)
// В GitHub Actions всё делает .github/workflows/reels.yml раз в неделю.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../../..');
const PLAN = path.join(ROOT, 'promo/daily/plan.json');
const QUEUE = path.join(ROOT, 'promo/reels/auto-queue.json');
const VOICE = path.join(ROOT, 'promo/reels/voice/auto.json');
const OUT = 'promo/reels/video';  // на сайте: Instagram скачивает видео по ссылке с типом video/mp4
global.window = {};
require(path.join(ROOT, 'js/data.js'));
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const pron = new Function(appSrc.slice(appSrc.indexOf('  const VOW ='), appSrc.indexOf('  // ---------- курс')) + ';return pron;')();
const toCyr = new Function(appSrc.slice(appSrc.indexOf('  const L2C_DI'), appSrc.indexOf('  // ввод:')) + ';return toCyr;')();
const ITEMS = [];
window.COURSE.forEach((u) => u.lessons.forEach((l) => l.items.forEach((a) => ITEMS.push({ id: l.id + '|' + a[0], sr: a[0], ru: a[1], unit: u.id }))));
const clean = (ru) => ru.replace(/\s*\(.*?\)/g, '').split(' / ')[0].trim();
const senses = (ru) => ru.toLowerCase().replace(/\(.*?\)/g, '').split('/').map((x) => x.trim()).filter(Boolean);
const slug = (id) => id.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'dj').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rnd = (seed) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const cmd = process.argv[2];

if (cmd === 'plan') {
  const n = +(process.argv[3] || 3);
  const used = new Set(plan.items.filter((p) => p.type === 'reel').map((p) => p.ref));
  // слова, которые хорошо угадываются: 1–2 слова, короткий перевод, без чисел; по кругу через юниты
  const pool = ITEMS.filter((it) => it.sr.split(' ').length <= 2 && clean(it.ru).length <= 22 && !/\d/.test(it.ru) && it.sr.length <= 16);
  const byUnit = [...new Set(pool.map((x) => x.unit))].map((u) => pool.filter((x) => x.unit === u));
  const order = []; for (let i = 0; i < 60; i++) byUnit.forEach((a) => a[i] && order.push(a[i]));
  const pick = order.filter((x) => !used.has('q:' + x.id)).slice(0, n);
  const queue = pick.map((it, k) => {
    const r = rnd(it.id.length * 97 + k * 13 + 7), mine = new Set(senses(it.ru));
    const wrong = pool.filter((x) => x.unit === it.unit && x.id !== it.id && !senses(x.ru).some((v) => mine.has(v))).sort(() => r() - .5).slice(0, 2);
    const opts = [it, ...wrong].sort(() => r() - .5);
    return { id: it.id, slug: slug(it.id), sr: it.sr, cyr: toCyr(it.sr), tr: pron(it.sr), ru: clean(it.ru), opts: opts.map((x) => clean(x.ru)), correct: opts.indexOf(it) };
  });
  fs.mkdirSync(path.dirname(QUEUE), { recursive: true });
  fs.writeFileSync(QUEUE, JSON.stringify(queue, null, 1));
  fs.writeFileSync(VOICE, JSON.stringify({ model: 'eleven_multilingual_v2', settings: { stability: .5, similarity_boost: .8, style: .3, use_speaker_boost: true }, lines: queue.flatMap((q) => [
    { id: q.slug + '_q', text: q.sr + '.', voice: 'Brian', seed: 5, previous_text: 'Сербское слово:' },
    { id: q.slug + '_a', text: `Правильно — «${q.ru}»!`, voice: 'Brian', seed: 5 },
  ]) }, null, 1));
  console.log('Очередь:', queue.map((q) => q.sr + ' — ' + q.ru).join('; '));
}

if (cmd === 'render') {
  const queue = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
  const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
  const T = { opts: 1.6, count: 2.6, reveal: 5.6, outro: 8.4 }, DUR = 10.6, FPS = 30, SR = 44100;
  const img = (e) => 'file://' + path.join(ROOT, 'promo/media/tosa/cut', e + '.png');
  // слоты: ближайшие пн/ср/пт 15:00, где ещё нет ролика
  const taken = new Set(plan.items.filter((p) => p.type === 'reel').map((p) => p.date));
  const slots = []; const d = new Date(); d.setUTCDate(d.getUTCDate() + 1);
  while (slots.length < queue.length) { const s = d.toISOString().slice(0, 10); if ([1, 3, 5].includes(d.getUTCDay()) && !taken.has(s)) slots.push(s); d.setUTCDate(d.getUTCDate() + 1); }
  (async () => {
    const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await page.goto('file://' + path.join(__dirname, 'reel.html')); await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(path.join(ROOT, OUT), { recursive: true });
    for (const [k, q] of queue.entries()) {
      const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'reel-'));
      const D = { ...q, T, fs: q.sr.length > 11 ? 80 : q.sr.length > 8 ? 96 : 112, imgSly: img('e5_sly'), imgSurp: img('e2_surprised'), imgHappy: img('e3_happy'), bravo: ['Točno! Bravo!', 'Svaka čast!', 'Odlično!'][k % 3] };
      for (let i = 0; i < DUR * FPS; i++) {
        await page.evaluate(([t, D]) => draw(t, D), [i / FPS, D]);
        if (i === 0) await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
      }
      // звук: музыка-подложка, тики отсчёта, «дзынь» на ответе (синтез), + голос
      const N = Math.round(DUR * SR), m = new Float32Array(N);
      const put = (t0, len, fn) => { const i0 = Math.round(t0 * SR); for (let i = 0; i < len * SR && i0 + i < N; i++) m[i0 + i] += fn(i / SR); };
      const nf = (n) => 440 * Math.pow(2, (n - 69) / 12);
      const prog = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]];
      for (let bar = 0; bar < 6; bar++) for (let s = 0; s < 4; s++) {
        const t0 = bar * 1.8 + s * .45, ch = prog[bar % 4];
        if (t0 > T.count - .1 && t0 < T.reveal) continue;  // во время отсчёта — только тики
        put(t0, .4, (t) => Math.sin(2 * Math.PI * nf(ch[s % 3] + 12) * t) * Math.exp(-t * 9) * .09);
        if (s % 2 === 0) put(t0, .45, (t) => Math.sin(2 * Math.PI * nf(ch[0] - 12) * t) * Math.exp(-t * 5) * .14);
      }
      for (let s = 0; s < 3; s++) put(T.count + s, .06, (t) => (Math.sin(2 * Math.PI * 2000 * t) * .6 + (Math.random() - .5)) * Math.exp(-t * 80) * .3);
      [0, .09, .18].forEach((dt, j) => put(T.reveal + dt, 1.2, (t) => Math.sin(2 * Math.PI * nf([76, 81, 86][j]) * t) * Math.exp(-t * 3.5) * .16));
      put(T.opts - .15, .35, (t) => (Math.random() - .5) * Math.sin(Math.PI * t / .35) * .12);
      const wav = Buffer.alloc(44 + N * 4); wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
      wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
      for (let i = 0; i < N; i++) { const v = Math.max(-1, Math.min(1, m[i])) * 32767; wav.writeInt16LE(v | 0, 44 + i * 4); wav.writeInt16LE(v | 0, 46 + i * 4); }
      fs.writeFileSync(path.join(tmp, 'bed.wav'), wav);
      const vq = path.join(ROOT, 'promo/media/voice/auto/Brian', q.slug + '_q.mp3'), va = path.join(ROOT, 'promo/media/voice/auto/Brian', q.slug + '_a.mp3');
      const hasV = fs.existsSync(vq) && fs.existsSync(va);
      const out = `${OUT}/${q.slug}.mp4`, cover = `${OUT}/${q.slug}.jpg`;
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.jpg'), '-i', path.join(tmp, 'bed.wav'), ...(hasV ? ['-i', vq, '-i', va] : []),
        '-filter_complex', hasV ? '[2]adelay=700|700,volume=1.6[q];[3]adelay=5900|5900,volume=1.6[a];[1][q][a]amix=inputs=3:normalize=0[m]' : '[1]anull[m]',
        '-map', '0:v', '-map', '[m]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-t', String(DUR), '-movflags', '+faststart', path.join(ROOT, out)]);
      fs.copyFileSync(path.join(tmp, `f${String(Math.round(T.count * FPS)).padStart(4, '0')}.jpg`), path.join(ROOT, cover));
      fs.rmSync(tmp, { recursive: true, force: true });
      const caption = `Угадаешь за 3 секунды, что значит «${q.sr}»? 🤔\n\nПиши свой вариант в комментариях — A, B или C 👇 Ответ в конце ролика.\n\nСохрани 📌 и отправь другу — проверьте, кто быстрее.\n\nВсе слова с озвучкой — в бесплатном приложении Srpski, ссылка в профиле · Telegram: t.me/srpski_coach\n\n#сербскийязык #сербия #белград #русскиевсербии #изучениеязыков #угадайслово`;
      plan.items.push({ date: slots[k], time: '15:00', type: 'reel', ref: 'q:' + q.id, video: out, cover, telegram_image: cover, caption, status: 'pending' });
      console.log('Ролик:', out, slots[k], hasV ? 'с голосом' : 'без голоса');
    }
    await b.close();
    plan.items.sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time));
    fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
    fs.unlinkSync(QUEUE);
  })();
}
