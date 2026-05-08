from pathlib import Path
import sys

path = Path('src/main.js')
text = path.read_text(encoding='utf-8')
start = text.find('const translations = {')
if start == -1:
    print('translations block not found')
    sys.exit(1)
end = text.find('const i18n = createI18n({', start)
if end == -1:
    print('i18n block not found')
    sys.exit(1)
new_text = text[:start] + text[end:]
path.write_text(new_text, encoding='utf-8')
print('removed translations block')
