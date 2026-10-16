const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs=require('fs'),W=__dirname,out=process.argv[2],mode=process.argv[3];
(async()=>{fs.mkdirSync(out,{recursive:true});const b=await chromium.launch({args:['--allow-file-access-from-files']});
const p=await b.newPage({viewport:{width:1080,height:1920}});p.on('pageerror',e=>console.log('ERR',e.message));
await p.goto('file://'+W+'/scene.html');await p.evaluate(()=>window.ready);
const ts=mode==='all'?[...Array(480)].map((_,i)=>i/30):mode.split(',').map(Number);
for(const [i,t] of ts.entries()){await p.evaluate(t=>seek(t),t);await p.screenshot({path:`${out}/${mode==='all'?'f'+String(i).padStart(4,'0'):'t'+t}.jpg`,type:'jpeg',quality:92})}
await b.close()})();
