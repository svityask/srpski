// Озвучка через ElevenLabs (запускается в GitHub Actions, ключ — секрет ELEVENLABS_API_KEY).
//
//   node promo/tools/tts.js promo/reels/voice/kafa.json [голоса через запятую] [id строк через запятую]
//
// Голоса — по имени из библиотеки аккаунта (George, Brian…); без списка берётся "voice" из JSON.
// Результат: promo/media/voice/<имя файла>/<голос>/<id>.mp3 и promo/media/voice/voices.json (какие голоса доступны).
'use strict';
const fs = require('fs');
const path = require('path');
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error('Нет секрета ELEVENLABS_API_KEY'); process.exit(1); }
const API = 'https://api.elevenlabs.io/v1';
const ROOT = path.resolve(__dirname, '../..');
const [file, voiceArg, onlyArg] = process.argv.slice(2);
const cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
const tag = path.basename(file, '.json');
const OUT = path.join(ROOT, 'promo/media/voice');
// стандартные голоса ElevenLabs (есть в любом аккаунте); голос можно задать и прямо id
const PREMADE = { George: 'JBFqnCBsd6RMkjVDRZzb', Brian: 'nPczCjzI2devNBz1zQrb', Daniel: 'onwK4e9ZLuTAKqWW03F9', Adam: 'pNInz6obpgDQGcFmaJgB',
  Liam: 'TX3LPaxmHKxFdv7VOQHJ', Roger: 'CwhRBWXzGAHq8TQ4Fs17', Charlie: 'IKne3meq5aSn9XLyUdCD', Eric: 'cjVigY5qzO86Huf0OWal', Chris: 'iP95p4xoKVk53GoZ742B',
  Will: 'bIHbv24MWmeRgasZH58o', Callum: 'N2lVS1w4EtoT3dr4eOWO', Sarah: 'EXAVITQu4vr4xnJGR5wD', Alice: 'Xb7hH8MSUJpSbSDYk0k2', Matilda: 'XrExE9yKIg1WjnnlVkGX',
  Laura: 'FGY2WhTYpPnrIDTdsKH5', Jessica: 'cgSgspJ2msm6clMCkdW9', Lily: 'pFZP5JQG7iQjIQuC4Bku', River: 'SAz9YHcvj6GT2YYXdXww' };

const api = async (url, opt = {}) => {
  const r = await fetch(API + url, { ...opt, headers: { 'xi-api-key': KEY, 'content-type': 'application/json', ...(opt.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${url}: ${(await r.text()).slice(0, 300)}`);
  return r;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let voices = Object.entries(PREMADE).map(([name, voice_id]) => ({ name, voice_id }));
  try { // список голосов аккаунта — только если у ключа есть право voices_read; иначе стандартные голоса ниже
    const list = (await (await api('/voices')).json()).voices;
    fs.writeFileSync(path.join(OUT, 'voices.json'), JSON.stringify(list.map((v) => ({ name: v.name, id: v.voice_id, category: v.category, labels: v.labels, preview: v.preview_url })), null, 1));
    voices = list.concat(voices);
  } catch (e) { console.log('Список голосов недоступен ключу — беру стандартные:', Object.keys(PREMADE).join(', ')); }
  const want = (voiceArg || cfg.voice || '').split(',').map((s) => s.trim()).filter(Boolean);
  const only = (onlyArg || '').split(',').map((s) => s.trim()).filter(Boolean);
  const lines = cfg.lines.filter((l) => !only.length || only.includes(l.id));
  let chars = 0;
  for (const name of want) {
    const v = voices.find((x) => x.voice_id === name || x.name.toLowerCase().startsWith(name.toLowerCase()));
    if (!v) { console.log(`⚠️ Голос «${name}» не найден — пропускаю`); continue; }
    const dir = path.join(OUT, tag, name.replace(/[^\w-]/g, ''));
    fs.mkdirSync(dir, { recursive: true });
    for (const l of lines) {
      const body = { text: l.text, model_id: l.model || cfg.model || 'eleven_multilingual_v2', voice_settings: { ...cfg.settings, ...(l.settings || {}) } };
      const r = await api(`/text-to-speech/${v.voice_id}?output_format=mp3_44100_128`, { method: 'POST', body: JSON.stringify(body) });
      fs.writeFileSync(path.join(dir, `${l.id}.mp3`), Buffer.from(await r.arrayBuffer()));
      chars += l.text.length;
      console.log(`  ${name} ${l.id}: ${l.text}`);
    }
  }
  try { const s = await (await api('/user/subscription')).json(); console.log(`Символов в этом месяце: ${s.character_count} из ${s.character_limit} (сейчас потрачено ~${chars})`); } catch (e) { console.log('Остаток символов не прочитан:', e.message.slice(0, 80)); }
})().catch((e) => { console.error(e.message); process.exit(1); });
