# 印刷交付檔案

真相源是 `/card-lab?deck=print`（元件 `src/components/card-lab/PrintEditionSpec.tsx`），
本目錄只放它算出來的**實體檔案**與**量測腳本**。牌庫或題面一改，重跑 tools/ 底下的腳本。

## 檔案

| 檔案 | 用途 |
|---|---|
| `card-back_standard-zh_63x88_bleed3_350dpi_RGB.png` | 卡背，校稿看這份 |
| `card-back_standard-zh_63x88_bleed3_350dpi_CMYK.tif` | 卡背，送印用（Generic CMYK，正式送印請換印廠 ICC 重轉） |

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

跑法：在專案根目錄 `python3 print-assets/tools/<檔名>`（需要 Pillow）。
