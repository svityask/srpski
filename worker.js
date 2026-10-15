// Cloudflare Worker перед статикой приложения: файлы сайта отдаёт ASSETS, здесь — только два адреса API.
//   POST /api/feedback — сообщение из приложения → Telegram (секреты TELEGRAM_BOT_TOKEN и FEEDBACK_CHAT_ID в настройках воркера)
//   POST /api/e        — анонимное событие (открыл приложение, прошёл урок) → журнал воркера (Workers Logs, раздел Observability)
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const hits = new Map(); // простая защита от спама: не больше 5 сообщений в час с одного адреса (в пределах экземпляра)

async function feedback(req, env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.FEEDBACK_CHAT_ID) return json({ ok: false, error: 'not configured' }, 503);
  const ip = req.headers.get('cf-connecting-ip') || '';
  const now = Date.now(), recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 5) return json({ ok: false, error: 'too many' }, 429);
  hits.set(ip, recent.concat(now));
  let b; try { b = await req.json(); } catch (e) { return json({ ok: false }, 400); }
  const text = String(b.text || '').trim().slice(0, 2000);
  if (!text) return json({ ok: false }, 400);
  const contact = String(b.contact || '').trim().slice(0, 200);
  const where = [b.view, b.ver, b.sa ? 'с экрана «Домой»' : 'в браузере', req.cf && req.cf.country].filter(Boolean).join(' · ');
  const msg = `💬 Отзыв из приложения Srpski\n\n${text}${contact ? '\n\n✉️ ' + contact : ''}\n\n— ${where}`;
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: env.FEEDBACK_CHAT_ID, text: msg, disable_web_page_preview: true }),
  });
  return json({ ok: r.ok }, r.ok ? 200 : 502);
}

async function event(req, env, ctx) {
  let b; try { b = JSON.parse(await req.text()); } catch (e) { return new Response(null, { status: 204 }); }
  const name = String(b.e || '').slice(0, 32);
  if (/^[a-z_]+$/.test(name)) {
    console.log(JSON.stringify({ ev: name, d: String(b.d || '').slice(0, 64), n: +b.n || 0, where: b.sa ? 'home' : 'web', country: (req.cf && req.cf.country) || '' }));
  }
  return new Response(null, { status: 204 });
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/api/feedback') return feedback(req, env);
    if (req.method === 'POST' && url.pathname === '/api/e') return event(req, env, ctx);
    if (url.pathname.startsWith('/api/')) return json({ ok: false }, 404);
    return env.ASSETS.fetch(req);
  },
};
