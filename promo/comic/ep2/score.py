# Звук серии 2: тиканье таймера, тревожные струнные, гудки, удар «24:00:00», облегчение, голоса (Весна — «в трубке»)
# usage: python score.py marks.json out.wav
import numpy as np, wave, sys, json, subprocess, os
mk = json.load(open(sys.argv[1])); OUT = sys.argv[2]
ROOT = os.path.abspath(os.path.dirname(os.path.abspath(__file__)) + '/../../..')
SR = 44100; DUR, END, SLAM = mk['dur'], mk['end'], mk['slam']; N = int(SR * DUR); rng = np.random.default_rng(2)
M = np.zeros((N, 2)); FX = np.zeros((N, 2)); VO = np.zeros((N, 2))
def note(m): return 440 * 2 ** ((m - 69) / 12)
def seg(d): return np.arange(int(d * SR)) / SR
def filt(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; return np.fft.irfft(X, len(x))
def add(buf, x, t, g=1., pan=0.):
    i = int(t * SR); e = min(N, i + len(x)); x = x[:e - i] * g; buf[i:e, 0] += x * (1 - max(0, pan)); buf[i:e, 1] += x * (1 + min(0, pan))
def strings(ms, d, amp, cut, att=.8, rel=.8):
    tt = seg(d); out = np.zeros(len(tt))
    for m in ms:
        for k, det in enumerate([-.08, 0, .07]):
            f = note(m + det); ph = 2 * np.pi * f * tt + .02 * f / 5.2 * np.sin(2 * np.pi * 5.2 * tt + k); out += sum(np.sin(h * ph) / h for h in range(1, 10))
    return filt(out, 30, cut) * np.minimum(1, tt / att) * np.minimum(1, (d - tt) / rel) * amp / len(ms)
def boom(t, g=1., f=48):
    tt = seg(1.6); x = np.sin(2 * np.pi * f * tt * (1 + .6 * np.exp(-tt * 10))) * np.exp(-tt * 2.6) + filt(rng.normal(0, 1, len(tt)), 40, 3000) * np.exp(-tt * 18) * .5; add(FX, x, t, g)
def whoosh(t, d=.45, g=.12, lo=500, hi=6000):
    tt = seg(d); add(FX, filt(rng.normal(0, 1, len(tt)), lo, hi) * np.sin(np.pi * tt / d) ** 2, t - d * .7, g)
def tick(t, hi):
    tt = seg(.08); x = (np.sin(2 * np.pi * (2400 if hi else 1800) * tt) * .6 + filt(rng.normal(0, 1, len(tt)), 2000, 9000)) * np.exp(-tt * 90); add(FX, x, t, .16, .25 if hi else -.25)
# --- тиканье: каждую секунду, пока идёт отсчёт; быстрее во время паники (сцена Весны)
t = 0.0; k = 0
while t < SLAM:
    tick(t, k % 2 == 0); k += 1; t += .5 if 13 <= t < 20.6 else 1.0
# --- музыка
add(M, strings([38, 50, 57, 62], 3.2, .12, 1200), 0)                                      # вступление: ставка
add(M, strings([38, 45, 50, 53, 57], 5.2, .12, 1500), 3.0)                                  # МУП: d-moll
add(M, strings([37, 49, 52, 56, 61], 5.3, .15, 1800), 7.9)                                 # тревога: cis-dim
add(M, strings([38, 50, 53, 56, 62], 7.8, .17, 2400), 12.9)                                # паника
for i, tb in enumerate(np.arange(13.0, 20.6, 60 / 150 / 2)):                               # бас-остинато 150 bpm
    tt = seg(.18); m = [38, 38, 50, 38, 41, 38, 50, 39][i % 8]; add(M, np.sign(np.sin(2 * np.pi * note(m) * tt)) * np.exp(-tt * 14) * .5, tb, .09)
add(M, strings([50, 57, 62, 66, 69, 74], 8.9, .2, 3200, att=.4), 20.5)                     # облегчение: D-dur
for i, tb in enumerate(np.arange(21.0, 29.0, .5)):                                          # лёгкое пиццикато
    tt = seg(.3); m = [74, 78, 81, 78, 76, 79, 83, 79][i % 8]; add(M, np.sin(2 * np.pi * note(m) * tt) * np.exp(-tt * 12), tb, .06, .3)
add(M, strings([50, 57, 62, 64, 69], 2.2, .1, 1600), 29.2)                                 # затишье перед ударом
add(M, strings([38, 44, 50, 56, 62], 1.9, .22, 3500, att=.02), SLAM)                       # удар: тритон
add(M, strings([43, 50, 55, 60, 62, 67], DUR - END + .2, .2, 2600, att=.3, rel=1.4), END - .1)  # финал: sus4, «продолжение следует»
# --- эффекты
boom(0.02, .7); boom(SLAM, 1.0, 42); boom(END, .45, 55)
tt = seg(1.0); add(FX, filt(rng.normal(0, 1, len(tt)), 300, 8000) * (tt / 1.0) ** 3, SLAM - 1.0, .2)       # реверс-нарастание перед ударом
for sh in mk['shots'][1:]: whoosh(sh[1])
for t0 in (8.6, 10.6):                                                                      # гудки 425 Гц
    tt = seg(1.0); add(FX, filt(np.sin(2 * np.pi * 425 * tt), 300, 3400) * np.minimum(1, tt / .02) * np.minimum(1, (1 - tt) / .02), t0, .08, .3)
for j, f0 in enumerate((950, 1400, 1800)):                                                  # «абонент недоступен»
    tt = seg(.33); add(FX, np.sin(2 * np.pi * f0 * tt) * np.minimum(1, tt / .01) * np.minimum(1, (.33 - tt) / .01), 12.3 + j * .36, .05, .3)
# --- голоса
def mp3(p):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, '<i2').astype(np.float64) / 32768
spans = []
for vid, voice, t0 in mk['voice']:
    x = mp3(f'{ROOT}/promo/media/voice/ep2/{voice}/{vid}.mp3')
    if vid.startswith('vesna'): x = np.tanh(filt(x, 320, 3400) * 2.2) * .55                   # голос из телефонной трубки
    add(VO, x / (np.abs(x).max() + 1e-9) * .8, t0, 1.0, .05 if vid.startswith('anya') else -.05 if vid.startswith('misha') else 0)
    spans.append((t0, t0 + len(x) / SR))
# --- микс: музыка приседает под голосом
duck = np.ones(N)
for a, b in spans: duck[int(max(0, a - .15) * SR):int(min(DUR, b + .2) * SR)] = .45
duck = np.convolve(duck, np.ones(2205) / 2205, 'same')[:, None]
ir = rng.normal(0, 1, int(SR * 1.8)) * np.exp(-np.arange(int(SR * 1.8)) / SR * 3.2) * .01
for c in (0, 1): M[:, c] += np.convolve(M[:, c], ir if c == 0 else ir[::-1].copy())[:N]
M /= np.abs(M).max() / .8
mix = M * .55 * duck + FX + VO * 1.05
mix /= max(1, np.abs(mix).max() / .97)
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes()); w.close()
print('ok', OUT)
