# Final edit v4: space intro + AI plane (Wan) + AI landing (Wan) + AI Miloš (Wan) + crisp overlays + end card
# usage: python compose2.py OUT P1_FRAMES P2_FRAMES   (frames to use from each 30fps clip)
import cv2, numpy as np, os, math, sys, json
S = os.path.dirname(os.path.abspath(__file__)); W, H = 1080, 1920
OUT = sys.argv[1]; N1 = int(sys.argv[2]); N2 = int(sys.argv[3]); os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(11)
gy, gx = np.mgrid[0:H, 0:W].astype(np.float32)
vig = (1 - np.clip((((gx - W / 2) / W) ** 2 + ((gy - H / 2) / H) ** 2) * 1.1, 0, .45))[..., None]
def finish(f):
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
def up(fr):  # 480x832 AI frame -> 1080x1920, crisp lines
    f = cv2.resize(fr, (1108, 1920), interpolation=cv2.INTER_LANCZOS4)[:, 14:14 + W].astype(np.float32) / 255
    return np.clip(f + (f - cv2.GaussianBlur(f, (0, 0), 2.2)) * .55, 0, 1)
def clip(name):
    cap = cv2.VideoCapture(f'{S}/../wan/{name}_30.mp4'); fr = []
    while True:
        ok, x = cap.read()
        if not ok: return fr
        fr.append(x)
bub = cv2.imread(f'{S}/ov_bub.png', -1); endc = cv2.imread(f'{S}/ov_end.png', -1)
cap_ov = cv2.imread(f'{S}/ov_cap.png', -1); sign = cv2.imread(f'{S}/ov_sign.png', -1)
shade = (np.clip(1 - gy / 560, 0, 1) ** 1.3)[..., None]
puffs = [(rng.uniform(0, W), rng.uniform(0, H), rng.uniform(260, 520)) for _ in range(16)]
def cloud_wipe(f, a):  # white cloud puffs sweep across
    m = np.zeros((H, W), np.float32)
    for (x, y, r) in puffs: cv2.circle(m, (int(x), int(y)), int(r * a), 1, -1)
    m = cv2.GaussianBlur(m, (0, 0), 60)[..., None] * min(1, a * 1.3)
    return f * (1 - m) + m * np.array([1, .99, .97], np.float32)
n = 0; marks = {}
def put(img):
    global n; cv2.imwrite(f'{OUT}/s{n:04d}.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 94]); n += 1
for i in range(171): put(cv2.imread(f'{S}/frames/f{i:04d}.jpg'))      # space + POLAKO title (ends in white clouds)
marks['p1'] = n / 30
c1 = clip('p1')[:N1]
for k, fr in enumerate(c1):                                            # plane above the clouds
    f = finish(up(fr))
    if k < 12: f = f * (k / 12) + (1 - k / 12)                          # out of the white
    if k >= len(c1) - 10: f = cloud_wipe(f, (k - (len(c1) - 10)) / 10)  # into the clouds
    put((f * 255).astype(np.uint8))
marks['p2'] = n / 30
c2 = clip('p2')[:N2]
for k, fr in enumerate(c2):                                            # landing in Belgrade
    f = finish(up(fr))
    if k < 10: f = cloud_wipe(f, 1 - k / 10)
    sa = min(1, max(0, (k - 6) / 8)); f = over(f, sign, sa, .8 + .2 * (1 - (1 - sa) ** 3) + .03 * math.sin(min(1, sa) * math.pi), (540, 400))
    if k >= len(c2) - 7:                                                # whip-out
        a = (k - (len(c2) - 7)) / 7; kk = int(5 + 110 * a); f = cv2.blur(f, (kk, 1)); f = np.roll(f, int(-a * 700), axis=1)
    put((f * 255).astype(np.uint8))
marks['p3'] = n / 30
c3 = clip('p3'); last = None
for k, fr in enumerate(c3):                                            # Miloš
    f = up(fr)
    e = min(1, max(0, (k - 48) / 24)); e = e * e * (3 - 2 * e); z = 1.42 - .42 * e
    if z > 1.001:
        cy = 1320 - 360 * e; M = np.float32([[z, 0, W / 2 * (1 - z)], [0, z, cy * (1 - z)]])
        f = cv2.warpAffine(f, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
    if k < 7:
        a = 1 - k / 7; kk = int(5 + 110 * a); f = cv2.blur(f, (kk, 1)); f = np.roll(f, int(a * 700), axis=1)
    f = finish(f)
    sa = 1 - min(1, max(0, (k - 70) / 12))
    if sa > 0:
        f = f * (1 - shade * .82 * sa) + shade * .82 * sa * np.array([.05, .07, .1], np.float32)
        ca = min(1, max(0, (k - 4) / 8)) * min(1, max(0, (72 - k) / 6)); f = over(f, cap_ov, ca, .92 + .08 * min(1, max(0, (k - 4) / 8)), (300, 210))
    bt = (k - 66) / 9
    if bt > 0:
        b = min(bt, 1); sc = .55 + .45 * (1 - (1 - b) ** 3) + .06 * math.sin(min(bt, 1.6) * math.pi) * (bt < 1.6)
        f = over(f, bub, min(1, bt * 2), sc)
    last = f; put((f * 255).astype(np.uint8))
marks['end'] = n / 30
for j in range(60):
    p = j / 59; f = cv2.GaussianBlur(last, (0, 0), 1 + 14 * min(1, p * 2)) * (1 - .55 * min(1, p * 2.5))
    f = over(f, bub, max(0, 1 - p * 4))
    a = min(1, max(0, (j - 6) / 10)); sc = 1.08 - .08 * (1 - (1 - min(1, (j - 6) / 14)) ** 3) if j > 6 else 1.08
    f = over(f, endc, a, sc, (540, 900)); put((np.clip(f, 0, 1) * 255).astype(np.uint8))
marks['dur'] = n / 30
json.dump(marks, open(f'{OUT}/marks.json', 'w')); print(marks)
