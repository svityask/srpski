# POLAKO ep2 «24 sata»: Wan-шоты + сквозной таймер + облачка + подписи → кадры 1080×1920 @30 и marks.json для звука
# usage: python compose.py OUTDIR
import cv2, numpy as np, os, sys, json, math, subprocess
S = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{S}/../../..'); W, H, FPS = 1080, 1920, 30
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True); TMP = f'{OUT}/_ov'; os.makedirs(TMP, exist_ok=True)
AI, CLEAN = f'{ROOT}/promo/media/polako2/ai', f'{ROOT}/promo/media/polako2/clean'
# --- монтаж: (шот, начало, конец, режим)
SHOTS = [('s1', 0, 3.0, 'fwd'), ('s2', 3.0, 8.0, 'fwd'), ('s3', 8.0, 13.0, 'fwd'), ('s4', 13.0, 20.6, 'pingpong'),
         ('s5', 20.6, 25.4, 'fwd'), ('s4', 25.4, 29.3, 'zoom'), ('s6', 29.3, 33.0, 'fwd')]
DUR = 36.0; END = 33.0; SLAM = 31.2
VOICE = [('clerk1', 'Laura', 3.5), ('misha1', 'Liam', 5.7), ('vesna1', 'Matilda', 13.4), ('misha2', 'Liam', 19.1),
         ('anya1', 'Jessica', 20.9), ('anya2', 'Jessica', 23.4), ('vesna2', 'Matilda', 25.6), ('clerk2', 'Laura', 29.8)]
BUBS = [(3.4, 5.6, dict(who='Службеница', b='Gde je vlasnik stana?', i='[где е вла́сник ста́на] — Где хозяин квартиры?', tx=640)),
        (5.6, 8.0, dict(who='Миша', b='…Чего?', cls='ru', tx=300)),
        (13.3, 19.0, dict(who='Весна · по телефону', phone=1, cls='fast', b='Ma dobro, deco, sad ću, samo da nađem naočare, gde su mi ključevi, joj…', i='(очень быстро по-сербски)', tx=560)),
        (19.0, 20.6, dict(who='Миша', b='Я не понял НИ&nbsp;слова!', cls='ru', tx=260)),
        (20.8, 23.3, dict(who='Аня', b='Izvinite, govorite polako, molim vas.', i='[извините, говорите полако, молим вас] — Говорите медленнее, пожалуйста', tx=420)),
        (23.3, 25.4, dict(who='Аня', b='Treba nam prijava boravka.', i='[трэба нам прийава боравка] — Нам нужна регистрация', tx=420)),
        (25.5, 29.3, dict(who='Весна · по телефону', phone=1, b='Dolazim za pola sata!', i='[долазим за пола сата] — Приду через полчаса!', tx=560)),
        (29.7, 33.0, dict(who='Службеница', b='A ugovor o zakupu?', i='[а у́говор о за́купу] — А договор аренды?', tx=640))]
CAPS = [(0.4, 3.0, dict(t='Иностранец обязан зарегистрироваться за 24 часа', s='Не успел — штраф', b=220)),
        (8.3, 13.0, dict(t='Без хозяйки квартиры регистрацию не делают', s='…а хозяйка не берёт трубку', b=220))]
RED, GREEN = '#ff4d4d', '#5ee08a'
def timer(t):  # (строка, big, цвет, метка)
    hms = lambda s: '%02d:%02d:%02d' % (s // 3600, s // 60 % 60, s % 60)
    if t < 3: return hms(86400 - int(t)), 1, '#fff', 'НА РЕГИСТРАЦИЮ'
    if t < 8: return hms(23 * 3600 + 720 - int(t - 3)), 0, '#fff', 'ДО ШТРАФА'
    if t < 13: return hms(6 * 3600 + 2400 - int(t - 8)), 0, RED, 'ДО ШТРАФА'
    if t < 20.6: return hms(3600 + 720 - int(t - 13)), 0, RED, 'ДО ШТРАФА'
    if t < SLAM: return hms(3600 + 300 - int(t - 20.6)), 0, GREEN if t >= 25.4 else '#fff', 'ДО ШТРАФА'
    return '24:00:00', 1, RED, 'ТАЙМЕР СНОВА'
# --- оверлеи через Playwright
jobs, tkeys = [], {}
for k, (_, _, d) in enumerate(BUBS): jobs.append(['bub', d, f'{TMP}/b{k}.png'])
for k, (_, _, d) in enumerate(CAPS): jobs.append(['cap', d, f'{TMP}/c{k}.png'])
jobs.append(['end', {}, f'{TMP}/end.png'])
for i in range(int(DUR * FPS)):
    key = timer(i / FPS)
    if key not in tkeys: tkeys[key] = f'{TMP}/t{len(tkeys)}.png'; jobs.append(['tm', dict(t=key[0], big=key[1], c=key[2], label=key[3], top=150 if key[3] == 'НА РЕГИСТРАЦИЮ' else 1430), tkeys[key]])
json.dump(jobs, open(f'{TMP}/jobs.json', 'w'), ensure_ascii=False)
subprocess.run(['node', f'{S}/overlays.js', f'{TMP}/jobs.json'], check=True)
rd = lambda p: cv2.imread(p, -1)
bubs = [rd(f'{TMP}/b{k}.png') for k in range(len(BUBS))]; caps = [rd(f'{TMP}/c{k}.png') for k in range(len(CAPS))]
endc = rd(f'{TMP}/end.png'); tims = {k: rd(v) for k, v in tkeys.items()}
# --- клипы: Wan 16 fps → 60 fps (minterpolate), иначе статичный кадр из clean/
def load(name):
    src = f'{AI}/{name}.mp4'
    if not os.path.exists(src): return None
    dst = f'{TMP}/{name}_60.mp4'
    if not os.path.exists(dst):
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1', '-an', dst], check=True)
    cap = cv2.VideoCapture(dst); fr = []
    while True:
        ok, x = cap.read()
        if not ok: return fr
        fr.append(x)
clips = {n: load(n) for n in {s[0] for s in SHOTS}}
print({k: (len(v) if v else 'still') for k, v in clips.items()})
def up(fr):
    if fr.shape[1] == 480: f = cv2.resize(fr, (1108, 1920), interpolation=cv2.INTER_LANCZOS4)[:, 14:14 + W]
    else: f = cv2.resize(fr, (W, H), interpolation=cv2.INTER_LANCZOS4)
    f = f.astype(np.float32) / 255; return np.clip(f + (f - cv2.GaussianBlur(f, (0, 0), 2.2)) * .5, 0, 1)
def frame_at(name, mode, u):  # u ∈ [0,1) — доля шота
    c = clips[name]
    if c is None: return up(cv2.imread(f'{CLEAN}/{name}.png')), True
    n = len(c)
    if mode == 'pingpong': x = u * 2; i = int((x if x < 1 else 2 - x) * (n - 1))
    elif mode == 'zoom': i = int((.35 + .65 * u) * (n - 1))
    else: i = int(u * (n - 1))
    return up(c[min(n - 1, max(0, i))]), False
rng = np.random.default_rng(3); gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
vig = (1 - np.clip((((gx - W / 2) / W) ** 2 + ((gy - H / 2) / H) ** 2) * 1.1, 0, .45))[..., None]
def finish(f, tension):
    hl = np.clip(f - .75, 0, 1); f = f + cv2.GaussianBlur(hl, (0, 0), 18) * .5
    tint = np.array([.97, 1.0, 1.04], np.float32) * (1 - tension) + np.array([.9, .93, 1.1], np.float32) * tension  # BGR: тревога → холоднее/краснее
    f = np.clip((f - .5) * (1.06 + .08 * tension) + .5, 0, 1) * tint * vig
    g = rng.normal(0, .026, (H // 2, W // 2)).astype(np.float32); return np.clip(f + cv2.resize(g, (W, H))[..., None], 0, 1)
def zoom(f, z, cx=W / 2, cy=H / 2, dx=0, dy=0):
    if abs(z - 1) < 1e-3 and not dx and not dy: return f
    M = np.float32([[z, 0, cx * (1 - z) + dx], [0, z, cy * (1 - z) + dy]]); return cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
def over(f, ov, a=1.0, s=1.0, org=(540, 400)):
    if a <= 0 or ov is None: return f
    rgb = ov[..., :3].astype(np.float32) / 255; al = ov[..., 3:].astype(np.float32) / 255 * a
    if s != 1.0:
        M = np.float32([[s, 0, org[0] * (1 - s)], [0, s, org[1] * (1 - s)]]); rgb = cv2.warpAffine(rgb, M, (W, H)); al = cv2.warpAffine(al, M, (W, H))[..., None]
    return f * (1 - al) + rgb * al
pop = lambda x: 0 if x <= 0 else (1 if x >= 1 else 1 - (1 - x) ** 3 + .12 * math.sin(x * math.pi))
TENS = lambda t: .0 if t < 8 else (.6 if t < 20.6 else (.25 if t < 25.4 else 0))
last = None
for i in range(int(DUR * FPS)):
    t = i / FPS
    if t < END:
        k = max(j for j, s in enumerate(SHOTS) if s[1] <= t); name, a, b, mode = SHOTS[k]; u = (t - a) / (b - a)
        f, still = frame_at(name, mode, u)
        z = 1 + .05 * u + (.18 if mode == 'zoom' else 0) + (.06 if still else 0) * u
        z += .07 * max(0, 1 - (t - a) * FPS / 6) ** 2                                    # «удар» на склейке
        sh = 0
        if SLAM <= t < SLAM + .35: sh = 22 * (1 - (t - SLAM) / .35); 
        f = zoom(f, z, W / 2, H * .45, rng.uniform(-sh, sh), rng.uniform(-sh, sh))
        f = finish(f, TENS(t))
        if t - a < 3 / FPS and k: f = np.clip(f + (1 - (t - a) * FPS / 3) * .35, 0, 1)        # вспышка на склейке
        if SLAM <= t < SLAM + .12: f = np.clip(f * .4 + np.array([.25, .25, .9], np.float32) * .6, 0, 1)
        for (a0, b0, _), ov in zip(CAPS, caps):
            if a0 <= t < b0: f = over(f, ov, min(1, (t - a0) * 6, (b0 - t) * 6), .85 + .15 * pop((t - a0) * 3.5), (540, 1600))
        for (a0, b0, _), ov in zip(BUBS, bubs):
            if a0 <= t < b0: f = over(f, ov, min(1, (t - a0) * 8, (b0 - t) * 8), .6 + .4 * pop((t - a0) * 4), (300, 420))
        key = timer(t); tv = tims[key]; ta = 1.0
        if key[2] == RED and not key[1]: ta = .75 + .25 * (math.sin(t * 2 * math.pi) > 0)    # мигает
        if key[1] and t >= SLAM: f = over(f, tv, 1, 1 + .5 * max(0, 1 - (t - SLAM) / .25) ** 2, (540, 1530))
        elif key[1]: f = over(f, tv, min(1, t * 4) * (1 - max(0, (t - 2.75) * 4)), 1, (540, 250))
        else: f = over(f, tv, ta * min(1, (t - 3) * 5) if t < 3.3 else ta, 1, (900, 130))
        last = f
    else:
        p = (t - END) / (DUR - END); f = cv2.GaussianBlur(last, (0, 0), 1 + 14 * min(1, p * 2)) * (1 - .55 * min(1, p * 2.5))
        f = over(f, endc, min(1, p * 5), 1.08 - .08 * pop(p * 3), (540, 900))
    cv2.imwrite(f'{OUT}/f{i:04d}.jpg', (np.clip(f, 0, 1) * 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 93])
json.dump(dict(dur=DUR, end=END, slam=SLAM, shots=SHOTS, voice=VOICE), open(f'{OUT}/marks.json', 'w'))
print('frames', int(DUR * FPS))
