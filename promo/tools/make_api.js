// Make.com API: посмотреть сценарий публикации и добавить ветку для Reels (запускается в GitHub Actions, workflow make.yml).
//   node promo/tools/make_api.js inspect            — сценарии, модули, фильтры (без секретов)
//   node promo/tools/make_api.js reels <scenarioId>  — добавить в Router ветку kind=reel → Instagram «Create a Reel Post», остальным веткам фильтр kind=post
// Секреты: MAKE_API_TOKEN (Make → профиль → API access), переменная MAKE_ZONE (eu1/eu2/us1/us2, из адреса Make).
'use strict';
const TOKEN = process.env.MAKE_API_TOKEN, ZONE = process.env.MAKE_ZONE || 'eu2';
if (!TOKEN) { console.log('::error::Нет секрета MAKE_API_TOKEN'); process.exit(1); }
const API = `https://${ZONE}.make.com/api/v2`;
const api = async (u, opt = {}) => {
  const r = await fetch(API + u, { ...opt, headers: { authorization: 'Token ' + TOKEN, 'content-type': 'application/json', ...(opt.headers || {}) } });
  const t = await r.text(); if (!r.ok) throw new Error(`${r.status} ${u}: ${t.slice(0, 400)}`); return JSON.parse(t || '{}');
};
const walk = (flow, depth, out) => { for (const m of flow || []) {
  out.push(`${'  '.repeat(depth)}#${m.id} ${m.module}${m.filter ? ' · фильтр: ' + JSON.stringify(m.filter.conditions) : ''}${m.mapper ? ' · поля: ' + Object.keys(m.mapper).join(',') : ''}${m.parameters && m.parameters.__IMTCONN__ ? ' · conn ' + m.parameters.__IMTCONN__ : ''}`);
  (m.routes || []).forEach((r, i) => { out.push(`${'  '.repeat(depth + 1)}— ветка ${i + 1}`); walk(r.flow, depth + 2, out); });
} return out; };
(async () => {
  const cmd = process.argv[2];
  const me = await api('/users/me'); console.log('Пользователь:', me.authUser && me.authUser.name, '· зона', ZONE);
  const orgs = (await api('/organizations')).organizations || [];
  const scen = [];
  for (const o of orgs) for (const t of ((await api('/teams?organizationId=' + o.id)).teams || [])) scen.push(...((await api('/scenarios?teamId=' + t.id)).scenarios || []));
  if (cmd === 'inspect') {
    for (const s of scen) {
      console.log(`\n=== #${s.id} «${s.name}» ${s.isActive ? 'ВКЛ' : 'выкл'} · hook ${s.hookId || '—'}`);
      const bp = (await api(`/scenarios/${s.id}/blueprint`)).response.blueprint;
      console.log(walk(bp.flow, 0, []).join('\n'));
    }
    return;
  }
  if (cmd === 'reels') {
    const id = +process.argv[3]; const s = scen.find((x) => x.id === id); if (!s) throw new Error('Нет сценария ' + id);
    const bpr = (await api(`/scenarios/${id}/blueprint`)).response; const bp = bpr.blueprint;
    const router = bp.flow.find((m) => m.module === 'builtin:BasicRouter');
    if (!router) throw new Error('В сценарии нет Router — пришлите вывод inspect');
    const hook = bp.flow[0].id;
    const cond = (v) => ({ name: v === 'reel' ? 'Reels' : 'Посты', conditions: [[{ a: `{{${hook}.kind}}`, b: v, o: 'text:equal' }]] });
    if (router.routes.some((r) => r.flow[0] && r.flow[0].filter && JSON.stringify(r.flow[0].filter).includes('"reel"'))) { console.log('Ветка Reels уже есть'); return; }
    // фильтр kind=post к существующим веткам (добавляем условие ко всем OR-группам)
    for (const r of router.routes) { const f = r.flow[0]; if (!f) continue;
      if (f.filter && f.filter.conditions) f.filter.conditions = f.filter.conditions.map((g) => g.concat([{ a: `{{${hook}.kind}}`, b: 'post', o: 'text:equal' }]));
      else f.filter = cond('post'); }
    // соединение Instagram берём из существующего модуля Instagram
    const all = []; const collect = (fl) => (fl || []).forEach((m) => { all.push(m); (m.routes || []).forEach((r) => collect(r.flow)); }); collect(bp.flow);
    const ig = all.find((m) => /instagram/i.test(m.module)); if (!ig) throw new Error('Не нашёл модуль Instagram в сценарии');
    const maxId = Math.max(...all.map((m) => m.id));
    const app = ig.module.split(':')[0];
    router.routes.push({ flow: [{ id: maxId + 1, module: `${app}:CreateReelPost`, version: ig.version || 1, parameters: { ...ig.parameters },
      filter: cond('reel'), mapper: { accountId: ig.mapper && ig.mapper.accountId, video_url: `{{${hook}.video}}`, caption: `{{${hook}.caption}}`, cover_url: `{{${hook}.cover}}`, share_to_feed: true },
      metadata: { designer: { x: 600, y: 600 } } }] });
    await api(`/scenarios/${id}?confirmed=true`, { method: 'PATCH', body: JSON.stringify({ blueprint: JSON.stringify(bp), scheduling: JSON.stringify(bpr.scheduling || { type: 'immediately' }) }) });
    console.log('Готово: ветка Reels добавлена в сценарий #' + id);
  }
})().catch((e) => { console.log('::error::' + e.message); process.exit(1); });
