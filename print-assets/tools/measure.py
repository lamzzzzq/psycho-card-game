# -*- coding: utf-8 -*-
import io, re, unicodedata

def load(path, fields=('text','textEn')):
    s = io.open(path, encoding='utf-8').read()
    return s

def grab(s, key):
    # 抓 key: '....' 或 key: "...."，處理轉義單引號
    out = []
    for m in re.finditer(key + r":\s*(['\"])(.*?)(?<!\\)\1", s, re.S):
        out.append(m.group(2).replace("\\'", "'").replace('\\"','"'))
    return out

def wide(t):
    """以 em 為單位的視覺寬度：全角=1.0，半角=0.5"""
    w = 0.0
    for ch in t:
        w += 1.0 if unicodedata.east_asian_width(ch) in ('W','F') else 0.5
    return w

def lines(text, col_mm, pt):
    """粗估行數：字級 pt → em 寬 mm；col_mm 一行放得下幾 em"""
    em_mm = pt * 25.4 / 72
    per_line = col_mm / em_mm
    # 中文按字斷行，英文按單詞斷行（保守：加一點斷詞損耗）
    has_cjk = any(unicodedata.east_asian_width(c) in ('W','F') for c in text)
    w = wide(text)
    n = w / per_line
    if not has_cjk:
        n *= 1.08          # 英文換行不能斷詞，留 8% 餘量
    import math
    return math.ceil(n - 1e-9), w

# ---------- 版面參數 ----------
COL_MM   = 55.0   # 文字區寬（63mm 卡，左右各留 4mm 安全邊）
BODY_MM  = 22.0   # 人格牌文字區高
CN_PT, EN_PT = 10.5, 9.5
def line_h(pt, lead=1.45): return pt * 25.4 / 72 * lead

qs = load('src/data/questions.ts')
cn = grab(qs, 'text'); en = grab(qs, 'textEn')
cn = [t for t in cn if t]; en = [t for t in en if t]
print('題數 中文/英文:', len(cn), len(en))

def report(name, items, pt, col=COL_MM, box=BODY_MM):
    lh = line_h(pt)
    cap = int(box // lh)
    rows = []
    for i, t in enumerate(items, 1):
        n, w = lines(t, col, pt)
        rows.append((n, w, i, t))
    rows.sort(reverse=True)
    over = [r for r in rows if r[0] > cap]
    print('\n=== %s ===' % name)
    print('  字級 %.1fpt，行高 %.2fmm，文字區 %.0f×%.0fmm → 最多 %d 行' % (pt, lh, col, box, cap))
    print('  實際行數分佈:', {n: sum(1 for r in rows if r[0]==n) for n in sorted({r[0] for r in rows})})
    print('  最長 5 條:')
    for n,w,i,t in rows[:5]:
        print('   #%-3d %d行 %5.1fem  %s' % (i, n, w, t[:60]))
    print('  溢出 (>%d 行): %d 條' % (cap, len(over)))
    for n,w,i,t in over[:8]:
        print('   ⚠ #%-3d %d行  %s' % (i, n, t[:60]))
    return over

report('人格牌 · 繁中題面', cn, CN_PT)
report('人格牌 · 英文題面', en, EN_PT)

# ---------- 知識牌：無插畫，版面另算 ----------
kc = load('src/data/dummy-cards.ts')
term   = grab(kc, 'term');       termZh = grab(kc, 'termZh')
defn   = grab(kc, 'definition'); defnZh = grab(kc, 'definitionZh')
print('\n知識牌數:', len(term), len(termZh), len(defn), len(defnZh))

# 術語當標題：13pt，標題區高 16mm；定義 10pt，區高 40mm
report('知識牌 · 繁中術語（標題）', termZh, 13.0, box=16.0)
report('知識牌 · 英文術語（標題）', term,   13.0, box=16.0)
report('知識牌 · 繁中定義',        defnZh, 10.0, box=40.0)
report('知識牌 · 英文定義',        defn,   10.0, box=40.0)

# ---------- 明牌版維度名（印在色帶上）----------
dims_en = ['Openness','Conscientiousness','Extraversion','Agreeableness','Neuroticism']
dims_zh = ['開放性','盡責性','外向性','宜人性','神經質']
print('\n=== 明牌版色帶維度名 ===')
for pt in (8.0, 7.0):
    em = pt*25.4/72
    print(' %.0fpt:' % pt)
    for d in dims_en:
        print('   %-18s %5.1fmm %s' % (d, wide(d)*em, '⚠ 超過 45mm 色帶可用寬' if wide(d)*em > 45 else ''))
