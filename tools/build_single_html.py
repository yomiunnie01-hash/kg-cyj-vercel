"""Bundle the final site/ into ONE html file that opens by double-click (no server).

site/ 의 CSS·JS를 html 안에 넣고, 이미지는 webp로 압축해 data URI로 넣는다.
결과: DoraCura.html (프로젝트 폴더)

실행:  python tools/build_site.py   (먼저 site/ 갱신)
       python tools/build_single_html.py
"""
import base64, io, os, re
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, 'site')
OUT = os.path.join(ROOT, 'DoraCura.html')
ASSET_RE = re.compile(r'assets/[\w./-]+\.(?:png|jpe?g|webp|svg|gif)')
MAX_W = 1800


def read(name):
    return open(os.path.join(SITE, name), encoding='utf-8').read()


def data_uri(path):
    full = os.path.join(SITE, path)
    if path.endswith(('.svg', '.gif')):
        mime = 'image/svg+xml' if path.endswith('.svg') else 'image/gif'
        raw = open(full, 'rb').read()
    else:
        im = Image.open(full)
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im = im.convert('RGBA' if im.mode in ('RGBA', 'LA', 'P') else 'RGB')
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=84, method=6)
        raw, mime = buf.getvalue(), 'image/webp'
    return f'data:{mime};base64,' + base64.b64encode(raw).decode('ascii')


def main():
    html = read('index.html')
    css = {n: read(n) for n in ('style.css', 'intro.css')}
    js = {n: read(n) for n in ('intro.js', 'main.js')}

    # 이미지가 html 안에 들어 있으니 인트로의 사전 로딩 목록은 비운다 (같은 이미지 중복 방지)
    js['intro.js'] = re.sub(r'const ASSETS = \[.*?\];', lambda m: 'const ASSETS = [];', js['intro.js'], flags=re.S)

    for n, s in css.items():
        html = re.sub(r'<link rel="stylesheet" href="%s(?:\?[^"]*)?">' % re.escape(n),
                      lambda m, s=s: '<style>\n' + s + '\n</style>', html)
    for n, s in js.items():
        html = re.sub(r'<script src="%s(?:\?[^"]*)?"></script>' % re.escape(n),
                      lambda m, s=s: '<script>\n' + s.replace('</script', '<\\/script') + '\n</script>', html)

    cache = {}
    def swap(m):
        p = m.group(0)
        if p not in cache:
            cache[p] = data_uri(p) if os.path.exists(os.path.join(SITE, p)) else p
        return cache[p]
    html = ASSET_RE.sub(swap, html)

    open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
    print(f'{OUT} 생성: 이미지 {len(cache)}개 포함, {os.path.getsize(OUT) / 1e6:.1f} MB')
    missing = [p for p, v in cache.items() if v == p]
    if missing:
        print('파일이 없어 그대로 둔 경로:', ', '.join(missing))


if __name__ == '__main__':
    main()
