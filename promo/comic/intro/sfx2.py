import numpy as np, wave, sys
SR=44100; N=int(SR*16); rng=np.random.default_rng(3); L=np.zeros(N); R=np.zeros(N)
def bp(x,lo,hi):
    X=np.fft.rfft(x); f=np.fft.rfftfreq(len(x),1/SR); X[(f<lo)|(f>hi)]=0; y=np.fft.irfft(X,len(x)); return y/(np.abs(y).max()+1e-9)
def add(x,t,g,pan=0.):
    i=int(t*SR); e=min(N,i+len(x)); x=x[:e-i]*g; L[i:e]+=x*(1-max(0,pan)); R[i:e]+=x*(1+min(0,pan))
def seg(d): return np.arange(int(d*SR))/SR
# jet cruise: rumble + airy roar + faint turbine whine, swelling as camera nears (5.7-10.4)
t=seg(4.9); env=np.minimum(1,t/.8)*np.minimum(1,(4.9-t)/.6)*(0.6+0.4*t/4.9)
add(bp(rng.normal(0,1,len(t)),30,180)*env,5.6,.20); add(bp(rng.normal(0,1,len(t)),400,2500)*env,5.6,.07,.2)
add(np.sin(2*np.pi*(2900+40*np.sin(t*.7))*t)*env*.5,5.6,.012,.3)
# cloud wipe whoosh 10.0 and whip-pan 12.1
for t0,lo,hi,d,g in [(9.95,300,4000,.9,.16),(12.05,600,6000,.45,.2)]:
    tt=seg(d); add(bp(rng.normal(0,1,len(tt)),lo,hi)*np.sin(np.pi*tt/d)**2,t0,g)
# landing: approach roar 10.4-11.75, tyre chirps + thump at 11.75, reverse thrust to 12.3
t=seg(1.9); add(bp(rng.normal(0,1,len(t)),40,1200)*np.minimum(1,t/.4)*np.minimum(1,(1.9-t)/.3),10.4,.16)
for k,t0 in enumerate([11.75,11.83]):
    tt=seg(.28); ch=bp(rng.normal(0,1,len(tt)),1400,4200)*np.exp(-tt*14); add(ch,t0,.12,(-.3,.3)[k])
tt=seg(.5); add(np.sin(2*np.pi*55*tt)*np.exp(-tt*9),11.75,.35)
# kafana ambience from 12.2: murmur, cup clink, distant street
t=seg(3.8); mur=bp(rng.normal(0,1,len(t)),250,1200)*(0.6+0.4*np.abs(np.sin(t*3.1)*np.sin(t*1.7)))*np.minimum(1,t/.4)
add(mur,12.2,.045,-.2); add(bp(rng.normal(0,1,len(t)),60,300)*np.minimum(1,t/.4),12.2,.03,.2)
for t0,f0 in [(13.1,2630),(14.7,3120)]:
    tt=seg(.6); add((np.sin(2*np.pi*f0*tt)+.5*np.sin(2*np.pi*f0*2.76*tt))*np.exp(-tt*9),t0,.03,.4)
st=np.stack([L,R],1); pcm=(np.clip(st,-1,1)*32767).astype('<i2')
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
