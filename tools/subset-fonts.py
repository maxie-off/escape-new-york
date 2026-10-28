"""把源石黑體（GenSeki Gothic 2 TW，SIL OFL 授權）縮成只含遊戲裡用到的字，放進 public/fonts/。
遊戲文字有改動時重跑一次：
  git clone --depth 1 https://github.com/ButTaiwan/genseki-font /tmp/genseki
  pip install fonttools brotli
  python3 tools/subset-fonts.py /tmp/genseki
"""
import pathlib, subprocess, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/home/claude/buttaiwan/genseki-font') / 'otf' / 'TW'
text = set()
for p in list(root.glob('*.js')) + list((root / 'scenes').glob('*.js')) + list((root / 'public').glob('*.js')) + list((root / 'public').glob('*.html')):
    text |= set(p.read_text(encoding='utf-8'))
text |= set(chr(c) for c in range(0x20, 0x7F))
text |= set('，。、！？：；「」『』（）《》〈〉…—～・·％＋－＝／０１２３４５６７８９')
chars = ''.join(sorted(c for c in text if ord(c) >= 0x20))
(root / 'tools' / '.chars.txt').write_text(chars, encoding='utf-8')
for w in ['R', 'B', 'H']:
    out = root / 'public' / 'fonts' / f'genseki-{w}.woff2'
    subprocess.run(['pyftsubset', str(src / f'GenSekiGothic2TW-{w}.otf'), f'--text-file={root / "tools" / ".chars.txt"}',
                    '--flavor=woff2', '--layout-features=*', f'--output-file={out}'], check=True)
    print(out.name, out.stat().st_size // 1024, 'KB')
