# Видео-скиллы (Claude Video Skills)

Взяты из https://github.com/Neelshah1810/Claude-Video-Skills (MIT, © Neel Shah — см. LICENSE-claude-video-skills).
Сохранены без изменений, только SKILL.md + scripts/ + templates/ (примеры-видео не копировались).

| Скилл | Для чего у нас |
|---|---|
| social-ad | Reels 9:16: хук в 1-й секунде, караоке-субтитры, зацикленный финал |
| explainer-video | объяснялки грамматики (падежи, вид глагола) |
| feature-update | ролик к посту «Обновление приложения» |
| tutorial-video | «как поставить приложение на экран Домой» |

Важно для кириллицы: `fonts.py google "Unbounded" 500,700,800 --subsets latin,cyrillic` (по умолчанию только latin).
Зависимости verify.py: `pip install websocket-client pillow numpy`, Chromium, ffmpeg.
Голос — наш (RHVoice + клон), синхронизация через `vo_timing.py`.
