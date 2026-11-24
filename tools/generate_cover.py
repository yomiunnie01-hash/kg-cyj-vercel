"""DoraCura 책 표지 AI 일러스트 생성.

.env 의 OPENAI_API_KEY / OPENAI_IMAGE_MODEL 을 읽어, PDF에서 고른 포즈 컷아웃을
참고 이미지로 넣고 고화질 표지 일러스트를 만든다. 결과는 preview/assets/cover_ai_simple.png 로
저장되며, 페이지는 이 파일이 있으면 자동으로 표지를 교체한다.

실행:  python tools/generate_cover.py
"""
import base64, json, os, sys, uuid, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSES = os.path.join(ROOT, 'preview', 'assets', 'hd')
OUT = os.path.join(ROOT, 'preview', 'assets', 'cover_ai_simple.png')

REFS = ['twins_hug.webp', 'dora_wink.webp', 'cura_cheer.webp']  # 첨부받은 고화질 포즈 이미지

PROMPT = (
    "Children's storybook cover illustration in the exact 3D animated style, character design, "
    "proportions and colours of the reference images. Twin baby vampires: Dora (red hair in two buns "
    "with little black bat-wing bows, red vest, black skirt) and Cura (spiky black hair, black vest, "
    "red bow tie, red shorts), both with pale lavender-blue skin, big ruby eyes and tiny fangs. "
    "They are hugging and leaping joyfully together in a playful, bouncy pose, mid-air, laughing. "
    "Background: very simple and clean, a smooth flat lavender-to-purple gradient with only a soft "
    "white glow behind the characters and at most a few tiny stars. No buildings, no moon, no clutter. "
    "Keep the top 35% of the image calm and fairly empty "
    "(sky only) so a logo can be placed there; characters fill the lower 65%. Bright, cheerful, "
    "high detail, soft studio lighting. No text, no letters, no logos, no watermark."
)


def load_env():
    env = {}
    path = os.path.join(ROOT, '.env')
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def multipart(fields, files):
    b = uuid.uuid4().hex
    out = []
    for k, v in fields.items():
        out += [f'--{b}', f'Content-Disposition: form-data; name="{k}"', '', str(v)]
    body = '\r\n'.join(out).encode() + b'\r\n'
    for k, path in files:
        body += (f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{os.path.basename(path)}"\r\n'
                 f'Content-Type: image/{os.path.splitext(path)[1][1:]}\r\n\r\n').encode() + open(path, 'rb').read() + b'\r\n'
    body += f'--{b}--\r\n'.encode()
    return body, f'multipart/form-data; boundary={b}'


def main():
    env = load_env()
    key = env.get('OPENAI_API_KEY') or os.environ.get('OPENAI_API_KEY', '')
    model = env.get('OPENAI_IMAGE_MODEL') or 'gpt-image-2.5-sunburst'
    if not key:
        sys.exit('.env 의 OPENAI_API_KEY 가 비어 있습니다. 키를 입력한 뒤 다시 실행하세요.')
    body, ctype = multipart(
        {'model': model, 'prompt': PROMPT, 'size': '1024x1536', 'quality': 'high', 'n': 1},
        [('image[]', os.path.join(POSES, f)) for f in REFS])
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST',
                                 headers={'Authorization': f'Bearer {key}', 'Content-Type': ctype})
    print(f'모델 {model} 로 표지 생성 중... (1~2분 걸릴 수 있습니다)')
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8', 'replace')
        try:
            msg = json.loads(msg)['error']['message']
        except Exception:
            pass
        sys.exit(f'API 오류 ({e.code}): {msg}')
    item = data['data'][0]
    if item.get('b64_json'):
        img = base64.b64decode(item['b64_json'])
    else:
        img = urllib.request.urlopen(item['url'], timeout=120).read()
    open(OUT, 'wb').write(img)
    print('저장 완료:', OUT)


if __name__ == '__main__':
    main()
