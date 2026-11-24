"""Build the final DoraCura site from the approved preview.

preview/ 를 그대로 두고, 승인용 요소(프리뷰 노트, AI 위치 표시)를 걷어낸 최종본을
site/ 에 만든다. 페이지에서 실제로 참조하는 이미지만 복사한다.

실행:  python tools/build_site.py
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'preview')
OUT = os.path.join(ROOT, 'site')
TEXT = ['index.html', 'style.css', 'intro.css', 'intro.js', 'main.js']


def cut(s, start, end, keep_end=True):
    i = s.index(start)
    j = s.index(end, i)
    return s[:i] + (s[j:] if keep_end else s[j + len(end):])


def main():
    files = {n: open(os.path.join(SRC, n), encoding='utf-8').read() for n in TEXT}

    html = files['index.html']
    html = cut(html, '<!-- ============ PREVIEW NOTES', '</aside>', keep_end=False)
    html = re.sub(r'\s+data-ai="[^"]*"', '', html)
    html = html.replace('<title>DoraCura World — Preview</title>', '<title>DoraCura World</title>')
    html = html.replace('<meta name="viewport"', '<meta name="description" content="Meet Dora and Cura, twin baby vampires who sing, play and learn with their family. Nursery rhymes and kids songs on YouTube @doracura_en.">\n<meta name="viewport"', 1)
    files['index.html'] = html

    files['style.css'] = cut(files['style.css'], '/* ===== Preview notes (approval only) ===== */', '/* ===== Mobile')
    files['main.js'] = cut(files['main.js'], '  /* ---------- Preview notes ---------- */', '  /* ---------- wiring ---------- */')

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    for n, s in files.items():
        open(os.path.join(OUT, n), 'w', encoding='utf-8', newline='\n').write(s)

    refs = set()
    for s in files.values():
        refs.update(re.findall(r'assets/[\w./-]+\.(?:png|jpe?g|webp|svg|gif)', s))
    missing = []
    for r in sorted(refs):
        src = os.path.join(SRC, r)
        if not os.path.exists(src):
            missing.append(r)
            continue
        dst = os.path.join(OUT, r)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copy2(src, dst)

    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(OUT) for f in fs)
    print(f'site/ 생성: 텍스트 {len(files)}개, 이미지 {len(refs) - len(missing)}개, 총 {size / 1e6:.1f} MB')
    if missing:
        print('참조는 있지만 파일이 없는 경로 (선택적 파일이면 정상):', ', '.join(missing))


if __name__ == '__main__':
    main()
