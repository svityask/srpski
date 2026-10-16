# 2.5D animation of the comic panels: depth-parallax camera, living details, transitions, grade.
# usage: python3 anim.py MEDIA_DIR VOICE.wav OUT_DIR [t1,t2,...]
import cv2, numpy as np, sys, os, math, wave
M, VO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
ONLY = [float(v) for v in sys.argv[4].split(',')] if len(sys.argv) > 4 else None
W, H, FPS, T0, T1 = 1080, 1920, 30, 5.7, 16.0
rng = np.random.default_rng(7)
def load(n, crop_h=None):
    im = cv2.imread(f'{M}/{n}_x4.png').astype(np.float32) / 255
    d = cv2.imread(f'{M}/{n}_depth.png', cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
    if crop_h: im, d = im[:crop_h * 4], d[:crop_h * 4]
    d = cv2.GaussianBlur(d, (0, 0), 6)  # soft depth = no tearing at edges
    return im, d
P = {'p1': load('p1'), 'p2': load('p2'), 'p3': load('p3', 846)}
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
def cam(name, zoom, cx, cy, par, lat=(0, 0), extra=None):
    """zoom: base zoom; (cx,cy) source focus in 472-px coords; par: depth-zoom amount; lat: depth lateral shift px."""
    im, d = P[name]; h, w = d.shape
    k = max(W / w, H / h) * zoom  # source px -> output px
    sx = cx * 4 + (gx - W / 2) / k; sy = cy * 4 + (gy - H / 2) / k
    dd = cv2.remap(d, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE) - 0.5
    z = 1 + par * (dd + 0.5)  # near grows, far stays: never shows outside the frame
    sx = cx * 4 + (gx - W / 2) / (k * z) - lat[0] * dd * 4; sy = cy * 4 + (gy - H / 2) / (k * z) - lat[1] * dd * 4
    if extra is not None: sx, sy = extra(sx, sy)
    return cv2.remap(im, sx, sy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE), (sx, sy, k)
def to_out(px, py, geo):  # 472-coord point -> approx output coords (ignores parallax)
    sx, sy, k = geo; j = np.argmin(np.abs(sx[H // 2] - px * 4)); i = np.argmin(np.abs(sy[:, j] - py * 4)); return j, i
ease = lambda t: t * t * (3 - 2 * t)
cl = lambda v, a=0, b=1: max(a, min(b, v))
def soft_blob(img, x, y, r, col, a):
    if a <= 0: return
    x0, x1, y0, y1 = int(max(0, x - 3 * r)), int(min(W, x + 3 * r)), int(max(0, y - 3 * r)), int(min(H, y + 3 * r))
    if x1 <= x0 or y1 <= y0: return
    yy, xx = np.mgrid[y0:y1, x0:x1]; g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r))[..., None] * a
    img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - g) + np.array(col, np.float32) * g
def glow(img, x, y, r, col, a):
    x0, x1, y0, y1 = int(max(0, x - 3 * r)), int(min(W, x + 3 * r)), int(max(0, y - 3 * r)), int(min(H, y + 3 * r))
    if x1 <= x0 or y1 <= y0: return
    yy, xx = np.mgrid[y0:y1, x0:x1]; g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * r * r))[..., None] * a
    img[y0:y1, x0:x1] += np.array(col, np.float32) * g
# voice envelope for mouth (voice starts at 12.5 s)
wf = wave.open(VO); sr = wf.getframerate(); va = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32)
if wf.getnchannels() == 2: va = va.reshape(-1, 2).mean(1)
env = np.array([np.sqrt(np.mean(va[int(i * sr / FPS):int((i + 1) * sr / FPS)] ** 2) + 1e-9) for i in range(int(len(va) / sr * FPS))]); env = np.clip(env / np.percentile(env, 95), 0, 1)
def mouth_open(t):
    i = int((t - 12.5) * FPS); return float(env[i]) if 0 <= i < len(env) else 0.0
smoke = [dict(x=rng.uniform(-1, 1), v=rng.uniform(.4, 1.2), s=rng.uniform(.6, 1.4), w=rng.integers(0, 2)) for _ in range(26)]
steam = [dict(ph=rng.uniform(0, 6.28), sp=rng.uniform(.5, .9), off=rng.uniform(-1, 1)) for _ in range(9)]
wisps = [dict(x=rng.uniform(-.3, 1.3), y=rng.uniform(.0, 1), s=rng.uniform(.5, 1.6), sp=rng.uniform(.6, 1.4)) for _ in range(14)]
def p1(t):  # plane above clouds: dolly-in with parallax, plane bob, foreground wisps rushing past
    p = (t - 5.7) / 4.7
    f, geo = cam('p1', 1.1 + .12 * ease(p), 236 + 6 * math.sin(t * .9), 400 + 4 * math.sin(t * 1.7), .28 * ease(p), (-6 * p, 2 * math.sin(t * 1.3)))
    for w_ in wisps:  # near cloud wisps flying towards/past camera
        u = (w_['x'] - (t - 5.7) * .22 * w_['sp']) % 1.6 - .3; a = .35 * (1 - abs(u - .5) * 1.4)
        soft_blob(f, u * W, H * (.62 + .35 * w_['y']), 120 * w_['s'], (1, 1, 1), cl(a, 0, .5))
    glow(f, W * .86, H * .1, 260, (.08, .18, .28), .8)  # sun glow
    return f
def p2(t):  # landing: push in, touchdown shake, tyre smoke, runway lights
    p = (t - 10.4) / 2.1; td = 11.75
    sh = 9 * math.sin(t * 95) * cl((12.15 - t) / .4) if t > td else 0
    f, geo = cam('p2', 1.04 + .1 * ease(p), 236, 430 + 10 * p, .22 * ease(p), (3 * p, -2 * p))
    f = np.roll(f, int(sh), axis=0)
    for (lx, ly) in [(52, 632), (418, 632), (122, 587), (352, 587), (165, 568), (310, 568)]:
        x, y = to_out(lx, ly, geo); glow(f, x, y, 18, (.3, .75, 1), .25 + .25 * (math.sin(t * 9 + lx) > .2))
    if t > td - .05:
        for s in smoke:
            a = t - td + .05; wx, wy = to_out(168 if s['w'] else 312, 517, geo)
            x = wx + s['x'] * 40 + a * 380 * s['v']; y = wy - a * 60 * s['v'] - a * a * 40
            soft_blob(f, x, y, (18 + a * 120) * s['s'], (.86, .88, .9), cl(.28 - a * .25))
    return f
def p3(t):  # Miloš in the kafana: parallax push, steam, blink, mouth sync
    p = (t - 12.2) / 3.8; mo = mouth_open(t)
    def warp(sx, sy):
        # mouth: open the jaw by pulling pixels below mouth line downward (472-coords 270,462)
        mx, my = 270 * 4, 466 * 4
        dx = (sx - mx) / 120; dy = (sy - my) / 70
        m = np.exp(-(dx ** 2) - np.clip(dy, 0, None) ** 2 * .6) * (sy > my - 10)
        sy = sy - m * mo * 30
        for ex in (240, 298):  # blink: squash eyes towards lid line
            bl = max([cl(1 - abs(t - b) / .1) for b in (13.55, 15.25)])
            if bl > 0:  # eyelid slides down: eye area samples skin from above
                e = np.exp(-((sx - ex * 4) / 64) ** 2 - ((sy - 400 * 4) / 34) ** 2); sy = sy - e * 50 * min(1, bl * 1.6)
        return sx, sy
    f, geo = cam('p3', 1.01 + .05 * ease(p), 236, 420 - 6 * p, .16 * ease(p), (-4 * p, 0), warp)
    cx, cy = to_out(300, 698, geo)
    for s in steam:  # rising steam from the cup
        for j in range(7):
            a = ((t * s['sp'] + j / 7 + s['ph']) % 1)
            x = cx + s['off'] * 20 + 26 * math.sin(a * 6 + s['ph'] + t) ; y = cy - a * 260
            soft_blob(f, x, y, 10 + a * 30, (1, .97, .92), .10 * (1 - a) * cl(a * 5))
    wx, wy = to_out(420, 380, geo); glow(f, wx, wy, 300, (.04, .12, .2), .6 + .1 * math.sin(t * 2))
    return f
def scene(t):
    if t < 10.4: f = p1(t)
    elif t < 12.25: f = p2(t)
    else: f = p3(t)
    # transitions
    if t < 6.1: f = f * cl((t - 5.7) / .4) + (1 - cl((t - 5.7) / .4))  # out of white clouds
    if 9.95 < t < 10.85:  # cloud wipe P1->P2
        a = 1 - abs(t - 10.4) / .45
        for i in range(12): soft_blob(f, W * (i % 4) / 3, H * (i // 4) / 2, 420, (1, 1, 1), cl(a * 1.4))
    if 12.05 < t < 12.45:  # whip pan P2->P3 with motion blur
        a = 1 - abs(t - 12.25) / .2; k = int(5 + 120 * a)
        f = cv2.blur(f, (k, 1)); f = np.roll(f, int((t - 12.25) * -2600), axis=1)
    return f
def finish(f, t):
    hl = np.clip(f - .75, 0, 1); f = f + cv2.GaussianBlur(hl, (0, 0), 18) * .6  # bloom
    f = np.clip((f - .5) * 1.06 + .5, 0, 1); f = f * np.array([.97, 1.0, 1.04], np.float32)  # contrast + warm (BGR)
    v = ((gx - W / 2) / W) ** 2 + ((gy - H / 2) / H) ** 2; f = f * (1 - np.clip(v * 1.1, 0, .45))[..., None]
    g = rng.normal(0, .028, (H // 2, W // 2)).astype(np.float32); f = f + cv2.resize(g, (W, H))[..., None]
    return (np.clip(f, 0, 1) * 255).astype(np.uint8)
os.makedirs(OUT, exist_ok=True)
times = ONLY or [T0 + i / FPS for i in range(int((T1 - T0) * FPS))]
for i, t in enumerate(times):
    cv2.imwrite(f'{OUT}/' + (f't{t}.jpg' if ONLY else f'a{i:04d}.jpg'), finish(scene(t), t), [cv2.IMWRITE_JPEG_QUALITY, 93])
print('done', len(times))
