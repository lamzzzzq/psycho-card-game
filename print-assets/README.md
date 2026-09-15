# 印刷交付檔案

真相源是 `/card-lab?deck=print`（元件 `src/components/card-lab/PrintEditionSpec.tsx`），
本目錄只放它算出來的**實體檔案**與**量測腳本**。牌庫或題面一改，重跑 tools/ 底下的腳本。

## 檔案

| 檔案 | 用途 |
|---|---|
| `card-back_63x88_bleed3_350dpi_RGB.png` | 卡背（米白底＋一枚 logo），校稿看這份 |
| `card-back_63x88_bleed3_350dpi_CMYK.tif` | 卡背，送印用（Generic CMYK，正式送印請換印廠 ICC 重轉） |
| `knowledge-cards_zh_63x88_bleed3.pdf` | 知識牌 20 張・繁中，20 頁，**文字為向量** |
| `knowledge-cards_en_63x88_bleed3.pdf` | 知識牌 20 張・英文，同上 |

PDF 頁框 69 × 94 mm ＝ 成品 63 × 88 mm ＋ 每邊 3 mm 出血，成品置中。
（沒有寫 TrimBox：Chrome 產的是傳統 xref 表，加了會改變位元組長度而讓 xref 失效，
見 `tools/fix_pdf_boxes.py` 的說明。跟印廠講「每邊 3mm 出血、成品置中」即可。）

## 重新產生知識牌 PDF

卡面版式在 `src/app/print/knowledge/page.tsx`（改文案改那裏，題庫改了它自己會跟）。

```bash
npm run dev
for lang in "" "?lang=en"; do
  n=$([ -z "$lang" ] && echo zh || echo en)
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    --headless=new --disable-gpu --no-pdf-header-footer \
    --run-all-compositor-stages-before-draw --virtual-time-budget=10000 \
    --print-to-pdf="print-assets/knowledge-cards_${n}_63x88_bleed3.pdf" \
    "http://localhost:3000/print/knowledge$lang"
done
python3 print-assets/tools/fix_pdf_boxes.py print-assets/knowledge-cards_*.pdf
```

手動出也可以：瀏覽器開 `/print/knowledge` → ⌘P → 儲存為 PDF → 邊界「無」→ 勾「背景圖形」。

規格：成品 63 × 88 mm，出血每邊 3 mm（檔案 69 × 94 mm ＝ 951 × 1295 px ＠350 dpi），
底色 `#F6F0E1`（取自 logo 原圖背景，貼合零接縫）。

## 整副牌 + 規則卡（0916，實體版 3 副用）

| 頁面 | 內容 |
|---|---|
| `/print/cards` | Big Five **明牌版**整副 100 張正面（人格 80 + 知識 20），中英雙語，一張一頁 69×94mm |
| `/print/cards?side=back` | 卡背一頁 |
| `/print/cards?layout=a4` | A4 3×3 拼版，正面／卡背交替（雙面長邊翻），自己印用 |
| `/print/rules` | 規則卡 A4 雙面：正面繁中、背面英文 |

```bash
npm run dev -- -p 3005
C="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
F="--headless=new --disable-gpu --no-pdf-header-footer --run-all-compositor-stages-before-draw --virtual-time-budget=30000"
"$C" $F --print-to-pdf=front.pdf "http://localhost:3005/print/cards"
"$C" $F --print-to-pdf=back.pdf  "http://localhost:3005/print/cards?side=back"
"$C" $F --print-to-pdf=a4.pdf    "http://localhost:3005/print/cards?layout=a4"
"$C" $F --print-to-pdf=rules.pdf "http://localhost:3005/print/rules"
python3 print-assets/tools/fix_pdf_boxes.py front.pdf back.pdf   # 只對 69×94 的兩份跑
```

明牌版＝維度印在卡面（左上角圓標＋中間色帶），不需要維度卡、查閱代幣、色標、牌架。
複製牌編號加「·2」；每維後 4 張複製牌再印「4P」＝2–3 人局開盒抽走的 20 張。

⚠️ **卡背 0916 改成一枚 logo（老闆要求），不再點對稱。** 原本一正一倒是為了隱藏難度：
卡背有方向性，玩家把查過的牌倒插進牌架就等於做了永久標記。明牌版沒有隱藏難度所以沒關係；
日後若要出「維度不印卡面」的標準版實體牌，卡背要重新做成旋轉 180° 相同。

## 腳本

| 腳本 | 做什麼 |
|---|---|
| `tools/measure.py` | 量 50 題題面與 20 張知識牌的文字長度，換算行數、判斷會不會溢出 |
| `tools/cmyk.py` | 50 張插畫走 sRGB→CMYK→sRGB 往返，量掉色；並算維度色的 CMYK 指定值 |
| `tools/make_back.py` | 生成卡背（含出血）＋ `public/print/card-back.png` ＋ card-lab 預覽圖 |
| `tools/export_cards.py` | 把 50 張插畫轉成送印用 CMYK TIFF（約 165 MB，輸出目錄已 gitignore） |
| `tools/fix_pdf_boxes.py` | 把 Chrome 列印的 PDF 頁框改成精確 69×94mm（等長替換，不動 xref） |

跑法：在專案根目錄 `python3 print-assets/tools/<檔名>`（需要 Pillow）。
