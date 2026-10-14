// Автопубликация очереди promo/daily/plan.json без посредников — запускается GitHub Actions каждый час.
//
//   TG_TOKEN=… IG_TOKEN=… node promo/tools/publish.js        — опубликовать пост, время которого наступило
//   node promo/tools/publish.js --dry                        — только показать, что было бы опубликовано
//
// Telegram — Bot API (фото + подпись + опрос-викторина), Instagram — API Meta с входом через Instagram
// (graph.instagram.com, токен из кабинета разработчика). Без IG_TOKEN публикуется только Telegram.
// Публикуются слоты не старше 90 минут: если запуск пропущен, старые посты помечаются skipped, чтобы не было пачки сразу.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const PLAN = path.join(ROOT, 'promo/daily/plan.json');
const RAW = 'https://raw.githubusercontent.com/svityask/srpski/main/';
const APP_URL = 'https://zdravo.srpski.workers.dev/';
const CHAT = process.env.TG_CHAT || '@srpski_coach';
const IG = 'https://graph.instagram.com/v21.0';
const DRY = process.argv.includes('--dry');
const { TG_TOKEN, IG_TOKEN } = process.env;

const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
const belgrade = (ms) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function tgCaption(p, igUrl) {
  const body = p.caption.split('\n').filter((l) => !l.startsWith('#') && !/ссылка в профиле|t\.me\/srpski_coach/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const ig = igUrl ? `<a href="${igUrl}">${p.images.length > 1 ? 'Карусель целиком' : 'Пост'} в Instagram</a>` : '<a href="https://www.instagram.com/srpski_coach/">Instagram @srpski_coach</a>';
  return `${esc(body)}\n\n📸 ${ig}\n📱 <a href="${APP_URL}">Приложение Srpski</a> — уроки с озвучкой`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(url, params, method = 'POST') {
  const body = new URLSearchParams(params);
  const res = await fetch(method === 'GET' ? url + '?' + body : url, method === 'GET' ? {} : { method, body });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false || j.error) throw new Error(url.replace(/bot[^/]+/, 'bot***') + ' → ' + JSON.stringify(j.error || j.description || j).slice(0, 300));
  return j;
}

async function instagram(p) {
  const t = { access_token: IG_TOKEN };
  const urls = p.images.map((f) => RAW + f);
  let creation;
  if (urls.length === 1) creation = (await api(`${IG}/me/media`, { ...t, image_url: urls[0], caption: p.caption })).id;
  else {
    const kids = [];
    for (const u of urls) kids.push((await api(`${IG}/me/media`, { ...t, image_url: u, is_carousel_item: 'true' })).id);
    creation = (await api(`${IG}/me/media`, { ...t, media_type: 'CAROUSEL', children: kids.join(','), caption: p.caption })).id;
  }
  // контейнер готовится несколько секунд
  for (let k = 0; k < 20; k++) {
    const st = await api(`${IG}/${creation}`, { ...t, fields: 'status_code' }, 'GET');
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR') throw new Error('Instagram не принял картинки');
    await sleep(3000);
  }
  const media = (await api(`${IG}/me/media_publish`, { ...t, creation_id: creation })).id;
  return (await api(`${IG}/${media}`, { ...t, fields: 'permalink' }, 'GET')).permalink;
}

async function telegram(p, igUrl) {
  const tg = (m, params) => api(`https://api.telegram.org/bot${TG_TOKEN}/${m}`, params);
  const msg = await tg('sendPhoto', { chat_id: CHAT, photo: RAW + p.telegram_image, caption: tgCaption(p, igUrl), parse_mode: 'HTML' });
  if (p.quiz) {
    await tg('sendPoll', {
      chat_id: CHAT, question: p.quiz.question, options: JSON.stringify(p.quiz.options), type: 'quiz',
      correct_option_id: String(p.quiz.correct), is_anonymous: 'true', explanation: 'Верно: ' + p.quiz.options[p.quiz.correct],
    });
  }
  return msg.result.message_id;
}

(async () => {
  const now = belgrade(Date.now() + 5 * 6e4), oldest = belgrade(Date.now() - 90 * 6e4);
  const due = plan.items.filter((p) => p.status === 'pending' && `${p.date} ${p.time}` <= now);
  if (!due.length) { console.log('Нечего публиковать, сейчас', belgrade(Date.now())); return; }
  for (const p of due) if (`${p.date} ${p.time}` < oldest) p.status = 'skipped';
  const p = due.filter((x) => x.status === 'pending').pop();
  if (p) {
    console.log('Публикую', p.date, p.time, p.type, p.ref);
    if (DRY) return;
    let igUrl = null, tgId = null;
    const errors = [];
    if (IG_TOKEN) { try { igUrl = await instagram(p); console.log('Instagram:', igUrl); } catch (e) { errors.push('IG: ' + e.message); } }
    if (TG_TOKEN) { try { tgId = await telegram(p, igUrl); console.log('Telegram: сообщение', tgId); } catch (e) { errors.push('TG: ' + e.message); } }
    if (igUrl || tgId) Object.assign(p, { status: 'published', instagram_url: igUrl, telegram_message_id: tgId, published_at: belgrade(Date.now()) });
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  } else console.log('Пропущенные слоты помечены skipped');
  if (!DRY) fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
})();
