# 印刷交付檔案

真相源是 `/card-lab?deck=print`（元件 `src/components/card-lab/PrintEditionSpec.tsx`），
本目錄只放它算出來的**實體檔案**與**量測腳本**。牌庫或題面一改，重跑 tools/ 底下的腳本。

## 檔案

| 檔案 | 用途 |
|---|---|
| `card-back_standard-zh_63x88_bleed3_350dpi_RGB.png` | 卡背，校稿看這份 |
| `card-back_standard-zh_63x88_bleed3_350dpi_CMYK.tif` | 卡背，送印用（Generic CMYK，正式送印請換印廠 ICC 重轉） |
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

⚠️ **卡背是點對稱的（旋轉 180° 完全相同），這是規則要求不是美術選擇。**
卡背若有方向性，隱藏難度下玩家把查過的牌倒插進牌架就等於做了永久標記，
而隱藏檔的設計前提是「不准做任何標記」。改卡背務必重跑 `tools/make_back_sym.py`
的自我相同驗證。

## 腳本

| 腳本 | 做什麼 |
|---|---|
| `tools/measure.py` | 量 50 題題面與 20 張知識牌的文字長度，換算行數、判斷會不會溢出 |
| `tools/cmyk.py` | 50 張插畫走 sRGB→CMYK→sRGB 往返，量掉色；並算維度色的 CMYK 指定值 |
| `tools/make_back_sym.py` | 生成卡背（含出血），並逐像素驗證點對稱 |
| `tools/export_cards.py` | 把 50 張插畫轉成送印用 CMYK TIFF（約 165 MB，輸出目錄已 gitignore） |
| `tools/fix_pdf_boxes.py` | 把 Chrome 列印的 PDF 頁框改成精確 69×94mm（等長替換，不動 xref） |

跑法：在專案根目錄 `python3 print-assets/tools/<檔名>`（需要 Pillow）。
