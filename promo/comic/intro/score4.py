# Score + sound design timed to marks.json (orchestral strings, timpani, brass fanfare, jet, tyres, kafana)
import numpy as np, wave, sys, json
mk = json.load(open(sys.argv[1])); OUT = sys.argv[2]
P1, P2, P3, END, DUR = mk['p1'], mk['p2'], mk['p3'], mk['end'], mk['dur']
TD = P2 + .5; HI = P3 + 2.4
SR = 44100; N = int(SR * DUR); rng = np.random.default_rng(1); L = np.zeros(N); R = np.zeros(N)
def note(m): return 440 * 2 ** ((m - 69) / 12)
def lp(x, c): X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X *= 1 / (1 + (f / c) ** 4); return np.fft.irfft(X, len(x))
def bp(x, lo, hi): X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); X[(f < lo) | (f > hi)] = 0; y = np.fft.irfft(X, len(x)); return y / (np.abs(y).max() + 1e-9)
def add(x, t, g=1., pan=0.):
    i = int(t * SR); e = min(N, i + len(x)); x = x[:e - i] * g; L[i:e] += x * (1 - max(0, pan)); R[i:e] += x * (1 + min(0, pan))
def seg(d): return np.arange(int(d * SR)) / SR
def strings(ms, a, b, amp, cut, att=1.2):
    tt = seg(b - a); out = np.zeros(len(tt)); d = b - a
    for m in ms:
        for k, det in enumerate([-.08, 0, .07]):
            f = note(m + det); ph = 2 * np.pi * f * tt + .02 * f / 5.2 * np.sin(2 * np.pi * 5.2 * tt + k)
            out += sum(np.sin(h * ph) / h for h in range(1, 12))
    env = np.minimum(1, tt / att) * np.minimum(1, (d - tt) / .8); return lp(out, cut) * env * amp / len(ms)
def timp(t0, amp, f=73):
    tt = seg(1.4); add((np.sin(2 * np.pi * f * tt) + .5 * np.sin(2 * np.pi * f * 1.5 * tt)) * np.exp(-tt * 3.5) + rng.normal(0, 1, len(tt)) * np.exp(-tt * 40) * .3, t0, amp)
def brass(m, t0, d, amp):
    tt = seg(d); ph = 2 * np.pi * note(m) * tt; x = sum(np.sin(h * ph) * .9 ** h for h in range(1, 10))
    add(lp(x, 2600) * np.minimum(1, tt / .06) * np.exp(-tt * .4) * np.minimum(1, (d - tt) / .15), t0, amp, .1)
# harmony: space mystery -> flight -> tension before touchdown -> warm kafana -> D major hello -> resolution
for a, b, ch, amp, cut in [(0, 3.2, [38, 50, 57, 62, 65], .10, 900), (3, P1 + .4, [34, 46, 58, 62, 65], .12, 1300),
                           (P1, P2 - .6, [41, 53, 60, 65, 69], .15, 2000), (P2 - .9, TD + .3, [45, 57, 61, 64, 69], .17, 2400),
                           (TD, P3 + .3, [43, 55, 59, 62, 67], .14, 2200), (P3, HI + .2, [43, 55, 59, 62, 67, 71], .11, 1800),
                           (HI - .1, END + .3, [38, 50, 62, 66, 69, 74], .22, 3200), (END, DUR, [43, 50, 59, 62, 67, 74], .18, 2600)]:
    x = strings(ch, a, b, amp, cut); add(x, a, 1, -.2); add(strings([m + 12 for m in ch[2:]], a, b, amp * .4, cut), a, 1, .25)
for i, t0 in enumerate(np.arange(TD - 1.3, TD - .05, .08)): timp(t0, .05 + .12 * i / 16)   # roll into touchdown
timp(TD, .6); timp(.05, .35, 55); timp(HI, .45); timp(END, .5, 55)
for m, a, d in [(62, HI, .35), (69, HI + .35, .35), (74, HI + .7, .5), (78, HI + 1.2, .35), (81, HI + 1.55, 1.2), (74, END, .3), (79, END + .3, .3), (83, END + .6, 1.3)]: brass(m, a, d, .09)
music = np.stack([L, R], 1).copy(); L[:] = 0; R[:] = 0
ir = rng.normal(0, 1, int(SR * 2.2)) * np.exp(-np.arange(int(SR * 2.2)) / SR * 2.8) * .012
music[:, 0] += np.convolve(music[:, 0], ir)[:N]; music[:, 1] += np.convolve(music[:, 1], ir[::-1].copy())[:N]
music /= np.abs(music).max() / .85
# sound design
t = seg(P2 - P1 + .2); env = np.minimum(1, t / .8) * np.minimum(1, (len(t) / SR - t) / .5) * (.6 + .4 * t / t[-1])
add(bp(rng.normal(0, 1, len(t)), 30, 180) * env, P1, .2); add(bp(rng.normal(0, 1, len(t)), 400, 2500) * env, P1, .07, .2)
add(np.sin(2 * np.pi * (2900 + 40 * np.sin(t * .7)) * t) * env * .5, P1, .012, .3)
for t0, lo, hi, d, g in [(P2 - .35, 300, 4000, .9, .16), (P3 - .25, 600, 6000, .45, .2)]:
    tt = seg(d); add(bp(rng.normal(0, 1, len(tt)), lo, hi) * np.sin(np.pi * tt / d) ** 2, t0, g)
t = seg(P3 - P2); add(bp(rng.normal(0, 1, len(t)), 40, 1400) * np.minimum(1, t / .3) * np.minimum(1, (len(t) / SR - t) / .4) * (1 + .6 * (t > TD - P2)), P2, .14)
for k, t0 in enumerate([TD, TD + .08]):
    tt = seg(.3); add(bp(rng.normal(0, 1, len(tt)), 1400, 4200) * np.exp(-tt * 13), t0, .13, (-.3, .3)[k])
tt = seg(.5); add(np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 9), TD, .35)
t = seg(DUR - P3); mur = bp(rng.normal(0, 1, len(t)), 250, 1200) * (.6 + .4 * np.abs(np.sin(t * 3.1) * np.sin(t * 1.7))) * np.minimum(1, t / .4)
add(mur, P3, .045, -.2); add(bp(rng.normal(0, 1, len(t)), 60, 300) * np.minimum(1, t / .4), P3, .03, .2)
for t0, f0 in [(P3 + .9, 2630), (P3 + 3.9, 3120)]:
    tt = seg(.6); add((np.sin(2 * np.pi * f0 * tt) + .5 * np.sin(2 * np.pi * f0 * 2.76 * tt)) * np.exp(-tt * 9), t0, .03, .4)
mix = music * .8 + np.stack([L, R], 1)
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(mix, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
print('TD', TD, 'HI', HI)
