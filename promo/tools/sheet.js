// Одностраничная шпаргалка по сценарию для чатов релокантов (1080×1920, читается с телефона без листания).
//   node promo/tools/sheet.js promo/scenarios/mup.json [...]  →  promo/scenarios/sheets/<id>.jpg
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node22/lib/node_modules/playwright');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const CSS = `.sh{width:1080px;height:1920px;padding:64px 64px 52px;display:flex;flex-direction:column;background:var(--paper)}
.sh .top{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}.sh h1{font-size:62px;margin-top:16px}
.sh .pl{flex:none;background:var(--enamel);color:#fff;border-radius:22px;padding:18px 24px;font:800 26px/1.1 var(--d);box-shadow:inset 0 0 0 6px var(--enamel),inset 0 0 0 9px rgba(255,255,255,.95)}
.sh .st{margin-top:24px;font:800 26px/1 var(--b);letter-spacing:.1em;text-transform:uppercase;color:var(--enamel)}
.sh .r{display:grid;grid-template-columns:46px 1fr;gap:2px 16px;padding:9px 0;border-bottom:2px solid var(--line)}
.sh .r i{grid-row:span 2;font:normal 700 19px/1 var(--b);color:var(--muted);padding-top:10px}
.sh .r b{font:700 33px/1.15 var(--b)}.sh .r.me b{color:var(--enamel)}.sh .r span{font:500 23px/1.25 var(--b);color:var(--muted)}
.sh .tips{background:var(--ok-soft);border-radius:24px;margin-top:24px;padding:20px 26px;font:500 23px/1.35 var(--b)}
.sh .tips p+p{margin-top:8px}.sh .cta{margin-top:auto;padding-top:18px;display:flex;justify-content:space-between;font:700 28px/1.2 var(--b);color:var(--enamel)}`;
const sheet = (s) => `<div class="sh"><div class="top"><div><p class="eyebrow">Шпаргалка · ${esc(s.sub)}</p><h1>${esc(s.title)}</h1></div><div class="pl" lang="sr">${esc(s.plate)}</div></div>
  ${s.steps.map((st) => `<p class="st">${esc(st.h)}</p>${st.lines.map((l) => `<div class="r${l.me ? ' me' : ''}"><i>${l.me ? 'ВЫ' : 'ВАМ'}</i><b lang="sr">${esc(l.sr)}</b><span>${esc(l.ru)} · [${esc(l.tr)}]</span></div>`).join('')}`).join('')}
  <div class="tips">${s.tips.slice(0, 2).map((t) => `<p>✓ ${esc(t)}</p>`).join('')}</div>
  <div class="cta"><span>Озвучка — в приложении Srpski</span><span>zdravo.srpski.workers.dev</span></div></div>`;
(async () => {
  const list = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
  const css = fs.readFileSync(path.join(__dirname, 'slides.css'), 'utf8');
  const tmp = path.join(ROOT, 'promo/scenarios/_sheet.html');
  fs.writeFileSync(tmp, `<!doctype html><html lang="ru"><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700&family=Unbounded:wght@500;700;800&display=swap"><style>${css}${CSS}</style></head><body>${list.map((s) => sheet(s).replace('<div class="sh"', `<div id="${s.id}" class="sh"`)).join('')}</body></html>`);
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1200, height: 2000 } });
  await page.goto('file://' + tmp); await page.waitForLoadState('networkidle'); await page.evaluate(() => document.fonts.ready);
  for (const s of list) {
    const el = await page.$('#' + s.id);
    if (await el.evaluate((e) => e.scrollHeight > e.clientHeight + 2)) console.log('⚠️', s.id, 'не влезает');
    await el.screenshot({ path: path.join(ROOT, 'promo/scenarios/sheets', s.id + '.jpg'), type: 'jpeg', quality: 88 });
    console.log('ok', s.id);
  }
  await b.close(); fs.unlinkSync(tmp);
})();
