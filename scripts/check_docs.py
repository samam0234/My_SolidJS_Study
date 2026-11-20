from pathlib import Path
import re
from curriculum import CHAPTERS
from generate_docs import ORIGINAL
root = Path(__file__).resolve().parents[1]
issues = []
for chapter in CHAPTERS:
    file = root / f'study{chapter["key"]}.md'
    if not file.exists(): issues.append(f'{file.name}: 파일 없음'); continue
    value = file.read_text(encoding='utf-8')
    for label in ['① 목표 한 줄','② 📖 이론','③ 🛠️ 실기','④ 🔗 연동 포인트','⑤ 오류 노트','⑥ 직접 해보기','⑦ ☐ 체크리스트','⑧ 다음 단계 연결 문장']:
        if f'## {label}' not in value: issues.append(f'{file.name}: {label} 없음')
    for item in ORIGINAL.get(chapter['key'], []):
        if f'- [ ] {item}' not in value: issues.append(f'{file.name}: 원문 항목 누락 {item}')
    for source in chapter['files']:
        code = (root / source).read_text(encoding='utf-8').rstrip()
        if code not in value: issues.append(f'{file.name}: {source} 전체 코드가 최신 파일과 다름')
    if value.count('```') % 2: issues.append(f'{file.name}: 코드 펜스 짝 오류')
for file in list(root.glob('study*.md')) + [root / 'README.md'] + list((root / 'docs').glob('*.md')):
    value = file.read_text(encoding='utf-8')
    for destination in re.findall(r'\]\(([^)]+)\)', value):
        if destination.startswith(('http:', 'https:', '#')): continue
        target = destination.split('#')[0]
        if not (file.parent / target).exists(): issues.append(f'{file.name}: 링크 없음 {target}')
expected = {f'study{chapter["key"]}.md' for chapter in CHAPTERS}
if set(p.name for p in root.glob('study*.md')) != expected: issues.append('루트 study 문서 목록이 21개 구성과 다름')
if issues:
    raise SystemExit('\n'.join(issues))
print('PASS: 21개 문서의 8개 공통 구성·원문 체크리스트·전체 코드 동기화·로컬 링크')
