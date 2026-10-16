import numpy as np, wave, sys
SR=44100; DUR=16.0; N=int(SR*DUR); rng=np.random.default_rng(1)
L=np.zeros(N); R=np.zeros(N); t=np.arange(N)/SR
def note(f): return 440*2**((f-69)/12)
def lp(x,c):  # simple FFT lowpass
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(len(x),1/SR); X*=1/(1+(fr/c)**4); return np.fft.irfft(X,len(x))
def strings(midis,t0,t1,amp,att=1.2,cut=1800):
    n0,n1=int(t0*SR),int(t1*SR); tt=np.arange(n1-n0)/SR; out=np.zeros(n1-n0); d=t1-t0
    for m in midis:
        for k,det in enumerate([-0.08,0,0.07]):
            f=note(m+det); ph=2*np.pi*f*tt+0.4*np.sin(2*np.pi*5.2*tt+k)*0.02*f/5.2  # vibrato
            saw=sum(np.sin(h*ph)/h for h in range(1,12))
            out+=saw
    env=np.minimum(1,tt/att)*np.minimum(1,(d-tt)/0.8); out=lp(out,cut)*env*amp/len(midis)
    return n0,out
def add(n0,x,pan=0.):
    e=min(N,n0+len(x)); L[n0:e]+=x[:e-n0]*(1-max(0,pan)); R[n0:e]+=x[:e-n0]*(1+min(0,pan))
# progression: D minor mystery in space -> Bb -> F -> A (tension) -> D major (Dobar dan)
for (a,b,ch,amp,cut) in [(0,3.2,[38,50,57,62,65],.10,900),(3,6.2,[34,46,58,62,65],.12,1300),(6,9.2,[41,53,60,65,69],.14,1800),(9,12.2,[45,57,61,64,69],.17,2400),(12,16,[38,50,62,66,69,74],.22,3200)]:
    n0,x=strings(ch,a,b,amp,cut=cut); add(n0,x,-.2); n0,x=strings([m+12 for m in ch[2:]],a,b,amp*.4,cut=cut); add(n0,x,.25)
# timpani roll into landing + hits
def timp(t0,amp,f=73):
    n=int(SR*1.4); tt=np.arange(n)/SR; x=(np.sin(2*np.pi*f*tt)+.5*np.sin(2*np.pi*f*1.5*tt))*np.exp(-tt*3.5)+rng.normal(0,1,n)*np.exp(-tt*40)*.3
    add(int(t0*SR),x*amp)
for i,tt0 in enumerate(np.arange(9.6,11.9,0.09)): timp(tt0,.05+.12*i/26)
timp(12.0,.6); timp(0.05,.35,55)
# brass fanfare on D major at 12s: D A D F# A
def brass(m,t0,d,amp):
    n=int(SR*d); tt=np.arange(n)/SR; f=note(m); ph=2*np.pi*f*tt
    x=sum(np.sin(h*ph)*(0.9**h) for h in range(1,10)); env=np.minimum(1,tt/.06)*np.exp(-tt*.4)*np.minimum(1,(d-tt)/.15)
    add(int(t0*SR),lp(x,2600)*env*amp,.1)
for m,a,d in [(62,12.0,.35),(69,12.35,.35),(74,12.7,.5),(78,13.2,.35),(81,13.55,1.6)]: brass(m,a,d,.09)
# whoosh of plane 6-10 s
n=int(4*SR); nz=lp(rng.normal(0,1,n),900); tt=np.arange(n)/SR; add(int(6*SR),nz*np.sin(np.pi*tt/4)**2*.12,0)
# reverb
ir=rng.normal(0,1,int(SR*2.2))*np.exp(-np.arange(int(SR*2.2))/SR*2.8)*.012
L=L+np.convolve(L,ir)[:N]; R=R+np.convolve(R,ir[::-1].copy())[:N]
m=max(abs(L).max(),abs(R).max()); L/=m/0.85; R/=m/0.85
st=np.stack([L,R],1); pcm=(st*32767).astype('<i2')
w=wave.open(sys.argv[1],'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes()); w.close()
