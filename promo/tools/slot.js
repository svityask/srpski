// Публикация очереди promo/daily/plan.json.
//
//   node promo/tools/slot.js next            — ближайшая неопубликованная запись, срок которой наступил (время Белграда)
//   node promo/tools/slot.js done <date> <time> <instagram_url> <telegram_message_id>
//   node promo/tools/slot.js status          — сколько осталось в очереди
//
// Картинки отдаются по прямым ссылкам raw.githubusercontent.com — их забирают Instagram и Telegram.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const PLAN = path.join(ROOT, 'promo/daily/plan.json');
const RAW = 'https://raw.githubusercontent.com/svityask/srpski/main/';
const APP_URL = 'https://svityask.github.io/srpski/';
const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));

const nowBelgrade = () => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Belgrade', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// подпись для Telegram: без хештегов и «ссылки в профиле», с живыми ссылками на Instagram и приложение
function tgCaption(p, igUrl) {
  const body = p.caption.split('\n').filter((l) => !l.startsWith('#') && !/ссылка в профиле|t\.me\/srpski_coach/.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  const ig = igUrl ? `<a href="${igUrl}">${p.images.length > 1 ? 'Карусель целиком' : 'Пост'} в Instagram</a>` : '<a href="https://www.instagram.com/srpski_coach/">Instagram @srpski_coach</a>';
  return `${esc(body)}\n\n📸 ${ig}\n📱 <a href="${APP_URL}">Приложение Srpski</a> — уроки с озвучкой`;
}

const cmd = process.argv[2] || 'next';
if (cmd === 'next') {
  const now = nowBelgrade();
  const due = plan.items.filter((p) => p.status === 'pending' && `${p.date} ${p.time}` <= now);
  if (!due.length) { console.log(JSON.stringify({ now, due: null, next: plan.items.find((p) => p.status === 'pending') || null })); process.exit(0); }
  const p = due[due.length - 1]; // самая свежая из наступивших; более старые пропущенные — в skipped
  console.log(JSON.stringify({
    now,
    skipped: due.slice(0, -1).map((x) => `${x.date} ${x.time} ${x.type}`),
    date: p.date, time: p.time, type: p.type,
    instagram: { media: p.images.map((f) => RAW + f), caption: p.caption },
    telegram: { photo: RAW + p.telegram_image, caption_html_template: tgCaption(p, '{IG_URL}'), quiz: p.quiz || null },
  }, null, 1));
} else if (cmd === 'done') {
  const [, , , date, time, ig, tg] = process.argv;
  const p = plan.items.find((x) => x.date === date && x.time === time);
  if (!p) { console.error('Нет такой записи'); process.exit(1); }
  Object.assign(p, { status: 'published', instagram_url: ig || null, telegram_message_id: tg || null, published_at: nowBelgrade() });
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1));
  console.log('Отмечено:', date, time, p.type);
} else if (cmd === 'skip') {
  const [, , , date, time] = process.argv;
  const p = plan.items.find((x) => x.date === date && x.time === time);
  p.status = 'skipped'; fs.writeFileSync(PLAN, JSON.stringify(plan, null, 1)); console.log('Пропущено:', date, time);
} else if (cmd === 'status') {
  const pend = plan.items.filter((p) => p.status === 'pending');
  console.log(JSON.stringify({ now: nowBelgrade(), pending: pend.length, last_date: plan.items[plan.items.length - 1].date, days_left: new Set(pend.map((p) => p.date)).size }));
}
