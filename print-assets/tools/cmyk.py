# -*- coding: utf-8 -*-
from PIL import Image, ImageCms
import glob, os

CMYK_ICC = '/System/Library/ColorSync/Profiles/Generic CMYK Profile.icc'
srgb = ImageCms.createProfile('sRGB')
cmyk = ImageCms.getOpenProfile(CMYK_ICC)
print('CMYK profile:', ImageCms.getProfileDescription(cmyk).strip())

to_cmyk = ImageCms.buildTransform(srgb, cmyk, 'RGB', 'CMYK', renderingIntent=0)  # perceptual
to_rgb   = ImageCms.buildTransform(cmyk, srgb, 'CMYK', 'RGB', renderingIntent=0)

def loss(path, sample=96):
    im = Image.open(path).convert('RGB').resize((sample, sample), Image.LANCZOS)
    back = ImageCms.applyTransform(ImageCms.applyTransform(im, to_cmyk), to_rgb)
    p1, p2 = im.load(), back.load()
    worst, tot, wpx = -1, 0, None
    for y in range(sample):
        for x in range(sample):
            a, b = p1[x, y], p2[x, y]
            d = max(abs(a[i]-b[i]) for i in range(3))
            tot += d
            if d > worst: worst, wpx = d, (a, b)
    return worst, tot/(sample*sample), wpx

files = sorted(glob.glob('public/cards/[0-9]*.webp'), key=lambda p:int(os.path.basename(p).split('.')[0]))
rows = []
for f in files:
    w, avg, wpx = loss(f)
    rows.append((w, avg, os.path.basename(f), wpx))
rows.sort(reverse=True)
print('\n=== sRGB → CMYK → sRGB 往返色偏（0–255）===')
print('  掉色最重的 8 張:')
for w, avg, f, wpx in rows[:8]:
    print('   %-10s 最大 %3d  平均 %5.1f   最差像素 rgb%s → rgb%s' % (f, w, avg, wpx[0], wpx[1]))
print('  50 張平均: 最大偏差均值 %.1f / 整體平均偏差 %.1f' % (
    sum(r[0] for r in rows)/len(rows), sum(r[1] for r in rows)/len(rows)))
bad = [r for r in rows if r[1] > 12]
print('  平均偏差 >12 的張數:', len(bad), [r[2] for r in bad][:10])

# 維度配色與 logo 色的 CMYK 還原度
print('\n=== 品牌／維度色轉 CMYK 後的還原度 ===')
brand = {'開放 O':'#2A9D8F','盡責 C':'#2A4365','外向 E':'#D97706','宜人 A':'#E07A5F',
         '神經 N':'#7E6C8F','logo 底':'#F6F0E1'}
for name, hx in brand.items():
    rgb = tuple(int(hx[i:i+2],16) for i in (1,3,5))
    one = Image.new('RGB',(1,1),rgb)
    back = ImageCms.applyTransform(ImageCms.applyTransform(one, to_cmyk), to_rgb).getpixel((0,0))
    d = max(abs(rgb[i]-back[i]) for i in range(3))
    flag = '⚠ 明顯偏移' if d > 25 else ('· 輕微' if d > 12 else '✓')
    print('  %-8s %s → rgb%s  偏差 %3d  %s' % (name, hx, back, d, flag))
