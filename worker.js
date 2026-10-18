// Cloudflare Worker перед статикой приложения: файлы сайта отдаёт ASSETS, здесь — только два адреса API.
//   POST /api/feedback — сообщение из приложения → Telegram (секреты TELEGRAM_BOT_TOKEN и FEEDBACK_CHAT_ID в настройках воркера)
//   cron каждые 10 минут — будильник автопостинга: если в promo/daily/plan.json есть пост, чьё время наступило,
//                          запускает GitHub Actions publish.yml (секрет GH_TOKEN). Расписание GitHub часто пропускает запуски.
//   POST /api/tg       — Telegram-бот: пишут «МУП», «банк», «врач», «аренда» → шлём шпаргалку-карусель (лидмагнит)
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

// --- Telegram-бот: шпаргалки по ключевым словам ---
const RAW = 'https://raw.githubusercontent.com/svityask/srpski/main/';
const APP = 'https://zdravo.srpski.workers.dev/';
async function hex(t) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
async function tg(env, m, body) {
  return fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function bot(req, env) {
  if (!env.TELEGRAM_BOT_TOKEN) return new Response(null, { status: 204 });
  // секрет вебхука = первые 32 символа sha256(токена): его же ставит workflow tg-bot.yml
  if (req.headers.get('x-telegram-bot-api-secret-token') !== (await hex(env.TELEGRAM_BOT_TOKEN)).slice(0, 32)) return new Response(null, { status: 403 });
  const u = await req.json().catch(() => ({}));
  const msg = u.message || (u.callback_query && u.callback_query.message);
  if (!msg || !msg.chat || msg.chat.type !== 'private') return new Response(null, { status: 204 });
  const chat = msg.chat.id;
  const text = ((u.callback_query && u.callback_query.data) || (u.message && u.message.text) || '').toLowerCase();
  const idx = await (await fetch(RAW + 'promo/scenarios/index.json', { cf: { cacheTtl: 300 } })).json().catch(() => []);
  const hit = idx.find((s) => text.includes(s.id) || s.kw.some((k) => text.includes(k)));
  const menu = { inline_keyboard: [...idx.map((s) => [{ text: '📌 ' + s.title, callback_data: s.id }]), [{ text: '📱 Приложение Srpski', url: APP }]] };
  if (u.callback_query) await tg(env, 'answerCallbackQuery', { callback_query_id: u.callback_query.id });
  if (!hit) {
    await tg(env, 'sendMessage', { chat_id: chat, text: 'Zdravo! 👋 Я пришлю шпаргалку с фразами для жизни в Сербии.\n\nНапишите слово: МУП, банк, врач или аренда — или выберите ниже 👇', reply_markup: menu });
  } else {
    console.log(JSON.stringify({ ev: 'lead', d: hit.id }));
    await tg(env, 'sendMediaGroup', { chat_id: chat, media: hit.images.slice(0, 10).map((f, i) => ({ type: 'photo', media: RAW + f, ...(i === 0 ? { caption: `Шпаргалка: ${hit.title} 🇷🇸` } : {}) })) });
    await tg(env, 'sendMessage', { chat_id: chat, text: `Все эти фразы с озвучкой — в бесплатном приложении Srpski: ${APP}\n\nЕщё шпаргалки 👇`, reply_markup: menu, disable_web_page_preview: true });
  }
  return new Response(null, { status: 204 });
}

const bg = (ms) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
};
async function alarm(env) {
  if (!env.GH_TOKEN) return 'no GH_TOKEN';
  const plan = await (await fetch('https://raw.githubusercontent.com/svityask/srpski/main/promo/daily/plan.json?t=' + Date.now(), { cf: { cacheTtl: 0 } })).json();
  const now = bg(Date.now() + 5 * 6e4), oldest = bg(Date.now() - 180 * 6e4);
  const due = plan.items.find((p) => p.status === 'pending' && `${p.date} ${p.time}` <= now && `${p.date} ${p.time}` >= oldest);
  if (!due) return 'nothing due';
  const r = await fetch('https://api.github.com/repos/svityask/srpski/actions/workflows/publish.yml/dispatches', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.GH_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'srpski-worker', 'content-type': 'application/json' },
    body: JSON.stringify({ ref: 'main', inputs: { mode: 'auto' } }),
  });
  const res = `dispatch ${due.date} ${due.time} ${due.type}: ${r.status}`;
  console.log(res);
  return res;
}

export default {
  async scheduled(event, env, ctx) { ctx.waitUntil(alarm(env).catch((e) => console.log('alarm skipped: ' + e.message))); },
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === 'POST' && url.pathname === '/api/feedback') return feedback(req, env);
    if (req.method === 'POST' && url.pathname === '/api/e') return event(req, env, ctx);
    if (req.method === 'POST' && url.pathname === '/api/tg') return bot(req, env);
    if (url.pathname.startsWith('/api/')) return json({ ok: false }, 404);
    return env.ASSETS.fetch(req);
  },
};
