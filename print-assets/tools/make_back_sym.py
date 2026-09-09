# -*- coding: utf-8 -*-
"""卡背必須點對稱（旋轉 180° 完全相同），否則玩家可以靠「把牌轉個方向」
   在隱藏難度下偷偷標記查過的牌 —— 那正是隱藏檔要禁掉的事。"""
from PIL import Image, ImageCms
import os

DPI, TRIM_W, TRIM_H, BLEED = 350, 63.0, 88.0, 3.0
mm = lambda v: int(round(v / 25.4 * DPI))
W, H = mm(TRIM_W + BLEED*2), mm(TRIM_H + BLEED*2)

logo = Image.open('public/brand/logo/hive-psi-mark.png').convert('RGBA')
bg = logo.convert('RGB').getpixel((3, 3))
rgb = logo.convert('RGB'); px = rgb.load()
diff = Image.new('L', rgb.size); dp = diff.load()
for y in range(rgb.height):
    for x in range(rgb.width):
        c = px[x, y]
        dp[x, y] = 255 if max(abs(c[i]-bg[i]) for i in range(3)) > 10 else 0
mark = logo.crop(diff.getbbox())

LOGO_W = 26.0                      # 兩枚並置，各縮小
tw = mm(LOGO_W)
if (W - tw) % 2: tw += 1           # 保證左右邊距相等，否則差 1px 就不是嚴格點對稱
th = int(round(mark.height * tw / mark.width))
m1 = mark.resize((tw, th), Image.LANCZOS)
m2 = m1.rotate(180)

card = Image.new('RGB', (W, H), bg)
gap  = mm(6)
if (H - gap) % 2: gap += 1         # 同理，保證上下對稱
x  = (W - tw) // 2
y1 = (H - gap) // 2 - th           # 上枚：底邊距中心 gap/2
y2 = (H + gap) // 2                # 下枚：頂邊距中心 gap/2
card.paste(m1, (x, y1), m1)
card.paste(m2, (x, y2), m2)

os.makedirs('print-assets', exist_ok=True)
p = 'print-assets/card-back_standard-zh_63x88_bleed3_350dpi_RGB.png'
card.save(p, dpi=(DPI, DPI))
print('點對稱卡背:', p, card.size)

# 驗證：旋轉 180° 後應與原圖逐像素相同
chk = card.rotate(180)
same = card.tobytes() == chk.tobytes()
print('旋轉 180° 自我相同:', same)

srgb = ImageCms.createProfile('sRGB')
cmyk_p = ImageCms.getOpenProfile('/System/Library/ColorSync/Profiles/Generic CMYK Profile.icc')
tf = ImageCms.buildTransform(srgb, cmyk_p, 'RGB', 'CMYK', renderingIntent=0)
pc = 'print-assets/card-back_standard-zh_63x88_bleed3_350dpi_CMYK.tif'
ImageCms.applyTransform(card, tf).save(pc, dpi=(DPI, DPI), compression='tiff_lzw')
print('CMYK:', pc, '%.1f MB' % (os.path.getsize(pc)/1e6))
