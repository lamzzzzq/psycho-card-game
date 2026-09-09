# -*- coding: utf-8 -*-
"""把 50 張人格牌插畫從 webp 轉成送印用檔（CMYK TIFF, 350dpi）。

用法：python3 print-assets/tools/export_cards.py [輸出目錄]
預設輸出到 print-assets/illustrations/（約 50–100 MB，刻意不進 git）。

⚠️ 這裏用的是系統通用 CMYK profile，只是給排版看的基準。
正式送印請把 CMYK_ICC 換成印廠指定的 ICC（Coated FOGRA39 / Japan Color 之類）重跑。
"""
from PIL import Image, ImageCms
import glob, os, sys

DPI = 350
CMYK_ICC = '/System/Library/ColorSync/Profiles/Generic CMYK Profile.icc'
out_dir = sys.argv[1] if len(sys.argv) > 1 else 'print-assets/illustrations'
os.makedirs(out_dir, exist_ok=True)

srgb = ImageCms.createProfile('sRGB')
cmyk = ImageCms.getOpenProfile(CMYK_ICC)
tf = ImageCms.buildTransform(srgb, cmyk, 'RGB', 'CMYK', renderingIntent=0)

files = sorted(glob.glob('public/cards/[0-9]*.webp'),
               key=lambda p: int(os.path.basename(p).split('.')[0]))
print('轉換 %d 張 → %s' % (len(files), out_dir))
for f in files:
    n = os.path.basename(f).split('.')[0]
    im = Image.open(f).convert('RGB')
    w, h = im.size
    ImageCms.applyTransform(im, tf).save(
        os.path.join(out_dir, '%s_%dx%d_%ddpi_CMYK.tif' % (n, w, h, DPI)),
        dpi=(DPI, DPI), compression='tiff_lzw')
print('完成。圖窗 55mm 下實際 %.0f dpi' % (1024 / (55 / 25.4)))
