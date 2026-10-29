// SEO-страницы из сценариев: /frazy/<id>/ (диалоги с транскрипцией, советы, шпаргалка), /frazy/, sitemap.xml, robots.txt
//   node promo/tools/seo.js          — пересобрать всё (запускать после добавления сценария)
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const SITE = 'https://zdravo.srpski.workers.dev';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'promo/scenarios/index.json'), 'utf8'));
const list = idx.map((x) => JSON.parse(fs.readFileSync(path.join(ROOT, 'promo/scenarios', x.id + '.json'), 'utf8')));
const CSS = `:root{--paper:#faf4ea;--surface:#fffdf8;--ink:#2a1f17;--muted:#7a6a5a;--line:#eadfce;--accent:#a3262f;--blue:#1c3f8c}
@media (prefers-color-scheme:dark){:root{--paper:#18130f;--surface:#221b16;--ink:#f2e9dd;--muted:#b4a490;--line:#3a2f26;--accent:#d9575e;--blue:#7fa2ff}}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.55 'Golos Text',system-ui,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 16px 64px}a{color:var(--accent)}
.eyebrow{font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
h1{font:700 clamp(28px,6vw,40px)/1.15 Unbounded,sans-serif;margin:10px 0 14px}h2{font:700 22px/1.25 Unbounded,sans-serif;margin:36px 0 12px}
.lead{font-size:19px;color:var(--muted)}.step{background:var(--surface);border:1.5px solid var(--line);border-radius:16px;padding:16px 18px;margin:12px 0}
.step h3{margin:0 0 10px;font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
.ln{display:grid;grid-template-columns:40px 1fr;gap:2px 12px;padding:8px 0;border-top:1px solid var(--line)}.ln:first-of-type{border-top:0}
.ln i{font-style:normal;font-size:12px;font-weight:700;color:var(--muted);padding-top:5px;grid-row:span 3}
.ln b{font-size:19px}.ln.me b{color:var(--blue)}.ln .tr{color:var(--muted);font-size:15px}.ln .ru{font-size:16px}
ul.tips li{margin:6px 0}.cta{margin:36px 0;padding:20px;border-radius:18px;background:var(--blue);color:#fff}
.cta a{display:inline-block;margin:10px 10px 0 0;padding:12px 18px;border-radius:12px;background:#fff;color:#1c3f8c;font-weight:700;text-decoration:none}
.sheet{width:100%;max-width:420px;border-radius:14px;border:1.5px solid var(--line);display:block;margin:14px 0}
.more a{display:block;padding:12px 0;border-top:1px solid var(--line);font-weight:600;text-decoration:none}`;
const head = (title, desc, url, img) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">${img ? `<meta property="og:image" content="${img}">` : ''}
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/icons/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;600;700&family=Unbounded:wght@700&display=swap">
<style>${CSS}</style></head><body><main>`;
const cta = `<div class="cta"><b>Все эти фразы с озвучкой — в бесплатном приложении Srpski.</b><br>Уроки, карточки и диалоги для жизни в Сербии, без регистрации.
<br><a href="/?src=seo">Открыть приложение</a><a href="https://t.me/srpski_coach_bot">Шпаргалки в Telegram</a></div>`;
const foot = `<p class="eyebrow" style="margin-top:40px">Srpski · сербский для русскоговорящих · <a href="https://t.me/srpski_coach">Telegram</a> · <a href="https://www.instagram.com/srpski_coach/">Instagram</a></p></main></body></html>`;
const pages = [];
for (const s of list) {
  const url = `${SITE}/frazy/${s.id}/`, img = `${SITE}/promo/scenarios/sheets/${s.id}.jpg`;
  const title = `${s.title} в Сербии: фразы на сербском с переводом и транскрипцией`;
  const desc = `${s.hook}. Готовые фразы для ситуации «${s.title}»: что скажут по-сербски и что ответить — с переводом и произношением.`;
  let h = head(title, desc, url, img) + `<p class="eyebrow"><a href="/frazy/">Фразы для жизни в Сербии</a> · ${esc(s.sub)}</p><h1>${esc(s.title)}: что скажут и что ответить</h1><p class="lead">${esc(s.hook)}.</p>`;
  for (const st of s.steps) h += `<div class="step"><h3>${esc(st.h)}</h3>${st.lines.map((l) => `<div class="ln${l.me ? ' me' : ''}"><i>${l.me ? 'ВЫ' : 'ВАМ'}</i><b lang="sr">${esc(l.sr)}</b><span class="tr">[${esc(l.tr)}]</span><span class="ru">${esc(l.ru)}</span></div>`).join('')}</div>`;
  h += `<h2>${esc(s.tipsTitle || 'Что важно знать')}</h2><ul class="tips">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  h += `<h2>Шпаргалка одной картинкой</h2><p>Сохраните на телефон — пригодится прямо у окошка.</p><img class="sheet" src="/promo/scenarios/sheets/${s.id}.jpg" alt="Шпаргалка: ${esc(s.title)}" loading="lazy" width="1080" height="1920">`;
  h += cta + `<h2>Другие ситуации</h2><div class="more">${list.filter((x) => x.id !== s.id).map((x) => `<a href="/frazy/${x.id}/">${esc(x.title)} →</a>`).join('')}</div>` + foot;
  fs.mkdirSync(path.join(ROOT, 'frazy', s.id), { recursive: true }); fs.writeFileSync(path.join(ROOT, 'frazy', s.id, 'index.html'), h); pages.push(url);
}
let h = head('Сербский для жизни в Сербии: готовые фразы для МУП, банка, врача и аренды', 'Фразы на сербском для релокантов: регистрация в МУПе, счёт в банке, врач, аренда квартиры — с переводом и транскрипцией.', `${SITE}/frazy/`, `${SITE}/promo/scenarios/sheets/${list[0].id}.jpg`) +
  `<p class="eyebrow">Srpski · фразы для жизни</p><h1>Сербский для жизни в Сербии</h1><p class="lead">Что вам скажут по-сербски в МУПе, банке, у врача и при аренде квартиры — и что ответить. С переводом и произношением.</p><div class="more">${list.map((x) => `<a href="/frazy/${x.id}/">${esc(x.title)} →</a>`).join('')}</div>` + cta + foot;
fs.writeFileSync(path.join(ROOT, 'frazy', 'index.html'), h); pages.unshift(`${SITE}/frazy/`);
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[SITE + '/', ...pages].map((u) => `<url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /promo/\nAllow: /promo/scenarios/sheets/\nSitemap: ${SITE}/sitemap.xml\n`);
console.log('pages:', pages.length);
