// Пост о глобальном обновлении приложения — вне ежедневной сетки (по умолчанию в 13:00 по Белграду).
//
//   node promo/tools/announce.js promo/updates/2026-10-20.json
//
// JSON: { "date": "2026-10-20", "time": "13:00", "title": "Новое в Srpski",
//         "points": [["Падежи", "40 фраз из жизни"], ["Диалоги", "играйте свою роль"]],
//         "caption": "Текст подписи без хэштегов" }
// Картинка — promo/daily/<дата>/13-update-<дата>-1.jpg, пост добавляется в plan.json со статусом pending.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const PLAN = path.join(ROOT, 'promo/daily/plan.json');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');

const u = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const time = u.time || '13:00';
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
if (plan.items.some((p) => p.type === 'update' && p.ref === u.date)) { console.log('Пост об этом обновлении уже в очереди'); process.exit(0); }
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TAGS = '#сербскийязык #сербия #белград #русскиевсербии #изучениеязыков';

const slide = `<div class="s blue" id="u">
  <p class="eyebrow">Обновление приложения</p>
  <h1 style="margin-top:36px; font-size:${u.title.length > 18 ? 76 : 92}px">${esc(u.title)}</h1>
  <div class="ph" style="margin-top:56px">${u.points.slice(0, 5).map((x, i) => `<div style="background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.25)">
    <span class="n" style="color:#fff">${String(i + 1).padStart(2, '0')}</span><b style="color:#fff">${esc(x[0])}</b><span style="color:rgba(255,255,255,.85)">${esc(x[1] || '')}</span></div>`).join('')}</div>
  <div class="foot" style="margin-top:auto"><span>@srpski_coach</span><span>zdravo.srpski.workers.dev</span></div></div>`;

(async () => {
  const css = fs.readFileSync(path.join(__dirname, 'slides.css'), 'utf8');
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;700;800&display=swap"><style>${css}</style></head><body>${slide}</body></html>`;
  const tmp = path.join(ROOT, 'promo/daily/_announce.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 1500 } });
  await page.goto('file://' + tmp); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
  if (await page.$eval('#u', (e) => e.scrollHeight > e.clientHeight + 2)) console.log('⚠️ Текст не влезает — сократите пункты');
  const dir = path.join(ROOT, 'promo/daily', u.date);
  fs.mkdirSync(dir, { recursive: true });
  const file = `promo/daily/${u.date}/${time.slice(0, 2)}-update-${u.date}-1.jpg`;
  await (await page.$('#u')).screenshot({ path: path.join(ROOT, file), type: 'jpeg', quality: 90 });
  await b.close(); fs.unlinkSync(tmp);
  plan.items.push({ date: u.date, time, type: 'update', ref: u.date, caption: `${u.caption}\n\nОбновите приложение: закройте его и откройте снова — прогресс сохранится.\nСсылка в профиле · Telegram: t.me/srpski_coach\n\n${TAGS}`, images: [file], telegram_image: file, status: 'pending' });
  plan.items.sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time));
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log('Пост об обновлении добавлен:', u.date, time, file);
})();
