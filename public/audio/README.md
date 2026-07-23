# 背景音乐

把正式的背景音乐文件命名为 `bgm.mp3` 放在这个目录（`public/audio/bgm.mp3`）。

- 建议：低饱和度、轻柔、可循环（loop）的器乐，音量已在代码里设为 0.35。
- 播放器组件：`src/components/shared/BgmPlayer.tsx`（挂在 layout，跨页连续播放）。
- 开关：右下角喇叭按钮，默认关闭（持久化在 localStorage `pm-bgm`）。
- 未放文件时按钮仍可点，只是没声音、不报错。
