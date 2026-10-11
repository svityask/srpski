// node frames.js <dir> <outdir> [fps] [только эти секунды через запятую — для превью]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [dir, out, fpsArg, only] = process.argv.slice(2);
  const fps = +(fpsArg || 30);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + dir + '/' + (process.env.REEL || 'reel.html')); await p.waitForLoadState('networkidle');
  await p.evaluate(async () => { await document.fonts.ready; const img = new Image(); img.src = 'app-course.png'; await img.decode(); });
  const dur = await p.evaluate(() => window.DURATION);
  const times = only ? only.split(',').map(Number) : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  let i = 0;
  for (const t of times) {
    await p.evaluate((t) => window.render(t), t);
    if (t >= (process.env.CTA ? +process.env.CTA : 13.7) - 0.01) await p.waitForFunction(() => [...document.images].every((im) => im.complete));
    await p.screenshot({ path: `${out}/${only ? 't' + t : String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 95 });
    i++;
  }
  console.log('duration', dur, 'frames', i);
  await b.close();
})();
