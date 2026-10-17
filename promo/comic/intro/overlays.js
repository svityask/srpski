const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
await p.goto('file://'+__dirname+'/overlays.html');await p.evaluate(()=>document.fonts.ready);
const jobs=JSON.parse(process.argv[2]);
for(const [id,vars,out] of jobs){await p.evaluate(([i,v])=>show(i,v),[id,vars]);await p.screenshot({path:out,omitBackground:true});}
await b.close()})();
