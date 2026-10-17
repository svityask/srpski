# Final edit: space intro (HTML) + 2.5D panels + AI-animated Miloš (Wan 2.2) + crisp overlays + end card
import cv2, numpy as np, os, glob, math, sys
S = os.path.dirname(os.path.abspath(__file__)); W, H = 1080, 1920
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
vig = (1 - np.clip((((gx - W / 2) / W) ** 2 + ((gy - H / 2) / H) ** 2) * 1.1, 0, .45))[..., None]
def finish(f):  # same look as the 2.5D panels: bloom, contrast, warm, vignette, grain
    hl = np.clip(f - .75, 0, 1); f = f + cv2.GaussianBlur(hl, (0, 0), 18) * .6
    f = np.clip((f - .5) * 1.06 + .5, 0, 1) * np.array([.97, 1.0, 1.04], np.float32) * vig
    g = rng.normal(0, .028, (H // 2, W // 2)).astype(np.float32); f = f + cv2.resize(g, (W, H))[..., None]
    return np.clip(f, 0, 1)
def over(f, ov, a=1.0, scale=1.0, origin=(500, 525)):
    if a <= 0: return f
    rgb = ov[..., :3].astype(np.float32) / 255; al = ov[..., 3:].astype(np.float32) / 255 * a
    if scale != 1.0:
        M = np.float32([[scale, 0, origin[0] * (1 - scale)], [0, scale, origin[1] * (1 - scale)]])
        rgb = cv2.warpAffine(rgb, M, (W, H)); al = cv2.warpAffine(al, M, (W, H))[..., None]
    return f * (1 - al) + rgb * al
bub = cv2.imread(f'{S}/ov_bub.png', -1); cap_ov = cv2.imread(f'{S}/ov_cap.png', -1)
shade = (np.clip(1 - gy / 560, 0, 1) ** 1.3)[..., None]  # ceiling shadow over the top strip
endc = cv2.imread(f'{S}/ov_end.png', -1)
n = 0
def put(img):
    global n; cv2.imwrite(f'{OUT}/s{n:04d}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 94]); n += 1
for i in range(171): put(cv2.imread(f'{S}/frames/f{i:04d}.jpg'))            # 0–5.7 s space + title
for i in range(196): put(cv2.imread(f'{S}/animv2/a{i:04d}.jpg'))            # 5.7–12.23 s plane + landing (2.5D)
cap = cv2.VideoCapture(f'{S}/../wan/p3_30.mp4'); k = 0; last = None
while True:                                                                  # 12.23–17.2 s Miloš (Wan 2.2)
    ok, fr = cap.read()
    if not ok: break
    f = cv2.resize(fr, (1108, 1920), interpolation=cv2.INTER_LANCZOS4)[:, 14:14 + W].astype(np.float32) / 255
    e = min(1, max(0, (k - 48) / 24)); e = e * e * (3 - 2 * e); z = 1.42 - .42 * e   # start tight on Miloš, pull back as he speaks
    if z > 1.001:
        cy = 1320 - 360 * e; M = np.float32([[z, 0, W / 2 * (1 - z)], [0, z, cy * (1 - z)]])
        f = cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    f = np.clip(f + (f - cv2.GaussianBlur(f, (0, 0), 2.2)) * .55, 0, 1)    # restore line crispness after upscale
    if k < 7:                                                                # whip-in from the landing shot
        a = 1 - k / 7; kk = int(5 + 110 * a); f = cv2.blur(f, (kk, 1)); f = np.roll(f, int(a * 700), axis=1)
    f = finish(f)
    sa = 1 - min(1, max(0, (k - 70) / 12))                                   # shadow + caption until the bubble takes over
    if sa > 0:
        f = f * (1 - shade * .82 * sa) + shade * .82 * sa * np.array([.05, .07, .1], np.float32)
        ca = min(1, max(0, (k - 4) / 8)) * min(1, max(0, (72 - k) / 6)); f = over(f, cap_ov, ca, .92 + .08 * min(1, max(0, (k - 4) / 8)), (300, 210))
    bt = (k - 66) / 9                                                        # bubble pops in with a little overshoot
    if bt > 0:
        b = min(bt, 1); sc = .55 + .45 * (1 - (1 - b) ** 3) + .06 * math.sin(min(bt, 1.6) * math.pi) * (bt < 1.6)
        f = over(f, bub, min(1, bt * 2), sc)
    last = f; put((f * 255).astype(np.uint8)); k += 1
for j in range(60):                                                          # 17.2–19.2 s end card
    p = j / 59; f = cv2.GaussianBlur(last, (0, 0), 1 + 14 * min(1, p * 2)) * (1 - .55 * min(1, p * 2.5))
    f = over(f, bub, max(0, 1 - p * 4))
    a = min(1, max(0, (j - 6) / 10)); sc = 1.08 - .08 * (1 - (1 - min(1, (j - 6) / 14)) ** 3) if j > 6 else 1.08
    f = over(f, endc, a, sc, (540, 900)); put((np.clip(f, 0, 1) * 255).astype(np.uint8))
print('frames', n, 'dur', n / 30)
