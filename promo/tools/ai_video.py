# ИИ-видео из кадра через бесплатные GPU-демо на Hugging Face (запускается в GitHub Actions, workflow ai.yml).
#   python ai_video.py discover                       — какие image-to-video модели сейчас работают
#   python ai_video.py api <space>                    — какие параметры принимает модель
#   python ai_video.py run <space> <job.json>         — сгенерировать ролики по заданию
import json, os, sys, shutil, time
from huggingface_hub import HfApi
TOKEN = os.environ.get('HF_TOKEN') or None
cmd = sys.argv[1]
if cmd == 'discover':
    api = HfApi(token=TOKEN)
    seen = set()
    for q in ['image-to-video', 'wan2', 'ltx-video', 'wan 2.2', 'i2v', 'framepack', 'hunyuan video', 'kandinsky video']:
        try:
            for s in api.list_spaces(search=q, sort='likes', limit=25, expand=['runtime', 'likes', 'sdk', 'lastModified']):
                if s.id in seen: continue
                seen.add(s.id); rt = s.runtime
                stage = getattr(rt, 'stage', None) if rt else None; hw = getattr(rt, 'hardware', None) if rt else None
                print(f'{s.likes:6} {str(stage):10} {str(hw):16} {s.sdk:8} {s.last_modified:%Y-%m-%d}  {s.id}')
        except Exception as e: print('search fail', q, e)
elif cmd == 'api':
    from gradio_client import Client
    for sp in sys.argv[2].split(','):
        print('=' * 20, sp)
        try: Client(sp, token=TOKEN, verbose=False).view_api(print_info=True)
        except Exception as e: print('fail', e)
elif cmd == 'run':
    from gradio_client import Client, handle_file
    sp, job = sys.argv[2], json.load(open(sys.argv[3]))
    out = job['out']; os.makedirs(out, exist_ok=True)
    c = Client(sp, token=TOKEN, verbose=False)
    for shot in job['shots']:
        if shot.get('skip'): continue
        args = {k: (handle_file(v[5:]) if isinstance(v, str) and v.startswith('file:') else v) for k, v in shot['args'].items()}
        for attempt in range(2):
            try:
                t = time.time(); r = c.predict(api_name=job['api_name'], **args); print(shot['name'], 'ok', round(time.time() - t), 's', str(r)[:300]); break
            except Exception as e: print(shot['name'], 'fail', str(e)[:500]); r = None; time.sleep(20)
        if r is None: continue
        def find(x):
            if isinstance(x, str) and os.path.exists(x): return x
            if isinstance(x, dict): return find(x.get('video') or x.get('path') or x.get('value'))
            if isinstance(x, (list, tuple)):
                for y in x:
                    f = find(y)
                    if f: return f
        f = find(r)
        if f: shutil.copy(f, f"{out}/{shot['name']}{os.path.splitext(f)[1] or '.mp4'}"); print('saved', shot['name'])
