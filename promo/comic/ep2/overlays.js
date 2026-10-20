// node overlays.js jobs.json → PNG-оверлеи 1080×1920 с прозрачным фоном
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const jobs = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + __dirname + '/overlays.html'); await p.evaluate(() => document.fonts.ready);
  for (const [kind, data, out] of jobs) { await p.evaluate(([k, d]) => render(k, d), [kind, data]); await p.evaluate(() => document.fonts.ready); await p.screenshot({ path: out, omitBackground: true }); }
  await b.close();
})();
