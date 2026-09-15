# -*- coding: utf-8 -*-
"""卡背：米白底 + 置中一枚蜂巢 Ψ logo（0916 老闆：兩枚改一枚）。

⚠️ 一枚 logo 就不再點對稱（旋轉 180° 會變樣）。原本做成一正一倒是為了隱藏難度：
   玩家不能靠「把牌倒插」偷偷標記查過的牌。現在實體版走**明牌版**（維度印在卡面，
   沒有隱藏難度），這條約束不存在；日後若要出隱藏難度的實體牌，卡背要重新處理。

輸出：
  print-assets/card-back_63x88_bleed3_350dpi_{RGB.png,CMYK.tif}  送印檔（含 3mm 出血）
  public/print/card-back.png        /print/cards 頁面列印 PDF 用（同一張圖）
  public/brand/card-back-preview.webp  card-lab 規格頁的成品預覽（裁掉出血）
"""
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

LOGO_W = 34.0
tw = mm(LOGO_W)
th = int(round(mark.height * tw / mark.width))
m1 = mark.resize((tw, th), Image.LANCZOS)

card = Image.new('RGB', (W, H), bg)
card.paste(m1, ((W - tw) // 2, (H - th) // 2), m1)

os.makedirs('print-assets', exist_ok=True)
os.makedirs('public/print', exist_ok=True)
p = 'print-assets/card-back_63x88_bleed3_350dpi_RGB.png'
card.save(p, dpi=(DPI, DPI))
card.save('public/print/card-back.png', dpi=(DPI, DPI), optimize=True)
print('卡背:', p, card.size, '底色', '#%02X%02X%02X' % bg)

b = mm(BLEED)
card.crop((b, b, W - b, H - b)).resize((336, 469), Image.LANCZOS) \
    .save('public/brand/card-back-preview.webp', quality=90)

srgb = ImageCms.createProfile('sRGB')
cmyk_p = ImageCms.getOpenProfile('/System/Library/ColorSync/Profiles/Generic CMYK Profile.icc')
tf = ImageCms.buildTransform(srgb, cmyk_p, 'RGB', 'CMYK', renderingIntent=0)
pc = 'print-assets/card-back_63x88_bleed3_350dpi_CMYK.tif'
ImageCms.applyTransform(card, tf).save(pc, dpi=(DPI, DPI), compression='tiff_lzw')
print('CMYK:', pc, '%.1f MB' % (os.path.getsize(pc)/1e6))
