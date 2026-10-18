// Карусель-сценарий «что скажут — что ответить» (рубрика «Сценарий», 13:00).
//   node promo/tools/scenario.js promo/scenarios/mup.json [--dry]
// Слайды: обложка → шаги-диалоги → советы → «сохрани». Картинки — promo/daily/<дата>/13-scenario-<id>-N.jpg, пост — в plan.json.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const PLAN = path.join(ROOT, 'promo/daily/plan.json');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const s = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DRY = process.argv.includes('--dry');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const TAGS = '#сербскийязык #сербия #белград #русскиевсербии #релокация #изучениеязыков';
const N = s.steps.length + 3;
// крупнее, чем общий стиль: в сценарии на слайде 2–3 реплики, их должно быть видно из ленты
const EXTRA = `.sc .dlg{margin:auto 0;gap:30px}.sc .dlg>div{max-width:90%;padding:30px 36px;border-radius:34px}.sc .dlg b{font-size:56px;line-height:1.12}
.sc .dlg span{font-size:34px;line-height:1.25;margin-top:12px}.sc .dlg small{font-size:26px;margin-bottom:14px}.sc h1{font-size:108px}
.sc .ph{margin-top:40px;gap:22px}.sc .ph span{font-size:34px;line-height:1.28}.sc .ph>div{padding:24px 30px}
.cv-plate{margin-top:70px;align-self:flex-start;background:#fff;color:var(--enamel);border-radius:26px;padding:30px 44px;font:800 64px/1.1 var(--d);box-shadow:inset 0 0 0 8px #fff,inset 0 0 0 12px var(--enamel)}`;
const foot = (i) => `<div class="foot"><span>@srpski_coach</span><span>${i} / ${N}</span></div>`;
const slides = [
  `<div class="s blue sc"><p class="eyebrow">Сценарий · ${esc(s.sub)}</p><h1 style="margin-top:40px">${esc(s.title)}</h1><p class="lead" style="margin-top:36px">${esc(s.hook)}</p>
   <div class="cv-plate" lang="sr">${esc(s.plate || 'MUP')}</div><div style="margin-top:auto;margin-bottom:40px"><span class="badge">Листайте →</span></div>${foot(1)}</div>`,
  ...s.steps.map((st, k) => `<div class="s sc"><p class="eyebrow">Шаг ${k + 1} · ${esc(st.h)}</p><div class="dlg">${st.lines.map((l) =>
    `<div class="${l.me ? 'me' : 'them'}"><small>${l.me ? 'Вы' : 'Вам скажут'}</small><b lang="sr">${esc(l.sr)}</b><span>[${esc(l.tr)}] — ${esc(l.ru)}</span></div>`).join('')}</div>${foot(k + 2)}</div>`),
  `<div class="s sc"><p class="eyebrow">Важно знать</p><h2 style="margin-top:28px">${esc(s.tipsTitle || "Перед походом")}</h2><div class="ph">${s.tips.map((t, k) =>
    `<div><span class="n">${String(k + 1).padStart(2, '0')}</span><span>${esc(t)}</span></div>`).join('')}</div>${foot(N - 1)}</div>`,
  `<div class="s blue sc"><p class="eyebrow">Сохраните 📌</p><h1 style="margin-top:40px">Перешлите тому, кто только переехал</h1>
   <p class="lead" style="margin-top:36px">Все фразы с озвучкой — в бесплатном приложении Srpski</p>
   <div style="margin-top:auto;margin-bottom:40px"><span class="badge">zdravo.srpski.workers.dev</span></div>${foot(N)}</div>`,
];
(async () => {
  const css = fs.readFileSync(path.join(__dirname, 'slides.css'), 'utf8');
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;700;800&display=swap"><style>${css}${EXTRA}</style></head><body>${slides.map((h, i) => h.replace('<div class="s', `<div id="sl${i}" class="s`).replace('<div class="foot"', '<div class="foot" style="margin-top:0"')).join('')}</body></html>`;
  const tmp = path.join(ROOT, 'promo/daily/_scenario.html'); fs.writeFileSync(tmp, html);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1200, height: 1500 } });
  await page.goto('file://' + tmp); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
  const dir = path.join(ROOT, 'promo/daily', s.date); fs.mkdirSync(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < slides.length; i++) {
    const el = await page.$('#sl' + i);
    if (await el.evaluate((e) => e.scrollHeight > e.clientHeight + 2)) console.log('⚠️ Слайд', i + 1, 'не влезает — сократите текст');
    const f = `promo/daily/${s.date}/${s.time.slice(0, 2)}-scenario-${s.id}-${i + 1}.jpg`;
    await el.screenshot({ path: path.join(ROOT, f), type: 'jpeg', quality: 90 }); files.push(f);
  }
  await b.close(); fs.unlinkSync(tmp);
  console.log('Слайды:', files.length);
  if (DRY) return;
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  if (plan.items.some((p) => p.type === 'scenario' && p.ref === s.id)) return console.log('Уже в очереди');
  plan.items.push({ date: s.date, time: s.time, type: 'scenario', ref: s.id, caption: `${s.caption}\n\n${TAGS}`, images: files, telegram_image: files[0], status: 'pending' });
  plan.items.sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time));
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log('Пост добавлен:', s.date, s.time);
})();
