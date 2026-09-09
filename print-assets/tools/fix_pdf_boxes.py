# -*- coding: utf-8 -*-
"""把 Chrome 列印出來的 PDF 頁框改成精確的 69 × 94 mm。

Chrome 把 @page 的 mm 換算成點時有捨入，69×94mm 會寫成 69.17×93.80mm。
差 0.2mm 落在 3mm 出血裏本來無害，但印廠拼版時看到的是不乾淨的數字。

⚠️ 這支腳本刻意做**等長**替換：Chrome 產的是傳統 xref 表，裏面記的是每個
物件的位元組偏移量，改動長度會讓整張表失效（多數閱讀器會自行重建、但印廠的
RIP 不一定）。所以只換數值、不加 TrimBox —— TrimBox 會改變長度。
成品位置用「每邊 3mm 出血、63×88mm 置中」跟印廠說明即可。

用法：python3 print-assets/tools/fix_pdf_boxes.py <pdf> [<pdf> ...]（就地修改）
"""
import re, sys

MM = 72 / 25.4
TRIM_W, TRIM_H, BLEED = 63.0, 88.0, 3.0
W, H = (TRIM_W + BLEED * 2) * MM, (TRIM_H + BLEED * 2) * MM
NEW = ('/MediaBox[0 0 %.4f %.4f]' % (W, H)).encode('ascii')

for path in sys.argv[1:]:
    data = open(path, 'rb').read()
    found = set(re.findall(rb'/MediaBox\s*\[[^\]]*\]', data))
    if not found:
        print('%s: 找不到 MediaBox，跳過' % path); continue
    if len(found) > 1:
        print('%s: 頁框不一致 %r，跳過' % (path, found)); continue
    old = found.pop()
    if len(old) != len(NEW):
        print('%s: 長度不同（原 %d，新 %d），改了會破壞 xref —— 中止。'
              % (path, len(old), len(NEW))); continue
    n = data.count(old)
    open(path, 'wb').write(data.replace(old, NEW))
    print('%s: %d 個頁框 %s → %s（等長，xref 不動）'
          % (path.split('/')[-1], n, old.decode(), NEW.decode()))
