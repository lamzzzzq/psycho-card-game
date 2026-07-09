# Sandbox Walkthrough — Recording Script (Route A)

**Goal:** a ~1-minute screen recording of the real interactive sandbox, following the actual 7-step flow. You click + record; the sandbox's gold highlight guides each next click. English narration lines are provided for captions/voiceover.

---

## Setup (before recording)

1. **Switch UI to English:** open `https://psycho-card-game.vercel.app/?lang=en` first (this sets + remembers English). You should see the homepage in English.
2. Then go to `https://psycho-card-game.vercel.app/tutorial`.
3. Get ready to record: **`Cmd + Shift + 5`** → choose "Record Selected Portion" and frame the browser window (cleaner than full screen) → **Record**.
4. Recording tips:
   - Move the mouse **slowly and deliberately** — the cursor is the star of a walkthrough.
   - **Pause ~1.5–2s after each click** so the on-screen reaction is visible and I have room to place a caption.
   - Don't rush. A calm 60–75s is better than a frantic 45s.
   - If you fumble a step, just pause and redo it — I'll trim mistakes out afterward.

---

## The 7 steps (follow the gold highlight)

> Each step: **what's highlighted → what you click → English narration line for that moment.**

**0 · Enter the sandbox**
- Click **"▶ Enter Interactive Sandbox"**.
- An intro overlay appears ("First: the Targets board"). Read it for a beat, then click **"Start"**.
- 🎙️ *"This is the interactive sandbox. First, check the Targets board — each dimension shows how many cards you need to lock it."*

**1 · Draw**
- The **draw pile** is highlighted ("Tap to draw").
- Click the **draw pile** once. → A card flips up ("I am rather sensitive to criticism" — Neuroticism).
- 🎙️ *"On your turn, tap the draw pile to draw one card."*

**2 · View 2 cards**
- The **"View 2"** button is highlighted. Click it.
- Two **hand cards** are now highlighted. Click **each of the two** — they flip to reveal their true dimension.
- The **"Finish viewing"** button highlights. Click it.
- 🎙️ *"Each turn you may reveal two of your hand cards. Tap 'View 2', then pick two to uncover their real dimension."*

**3 · Self-draw Pong — pick the dimension**
- Guide says Neuroticism needs 4, and you now hold exactly 4. The **"Self-draw Pong"** button is highlighted. Click it.
- Dimension chips appear; **"Neuroticism"** is highlighted. Click it.
- 🎙️ *"You now hold four Neuroticism cards — exactly the target. Tap 'Self-draw Pong', then choose Neuroticism."*

**4 · Self-draw Pong — pick the cards & confirm**
- **Four Neuroticism cards** are highlighted. Click **all four**.
- The **"Confirm Pong"** button highlights. Click it. → Toast "Pong complete!", the 4 cards move up into your **public archive**.
- 🎙️ *"Select exactly four Neuroticism cards, then confirm. The set locks into your public archive."*

**5 · Discard to end the turn**
- Guide: pick a card to discard. Click **one hand card** → the **"Discard"** button highlights. Click **"Discard"**.
- 🎙️ *"After declaring, discard one card to end your turn."*

**6 · Claim Pong (respond to someone's discard)**
- Click the highlighted **"Simulate a discard"** button. → A claim window opens: an opponent discarded a clue card.
- **Two matching hand cards** are highlighted. Click **both** → the **"Pong"** button highlights. Click **"Pong"**. → "Claim Pong complete!"
- 🎙️ *"When another player discards, you can claim it — pick two matching cards plus that discard to complete a set. Tap 'Pong'."*

**7 · Win (食胡 / declare victory)**
- Click **"Enter the Win lesson"** (highlighted). → You've now declared 4 dimensions; the opponent plays your last missing one (Neuroticism).
- The **"Win"** button is highlighted. Click it. → "Win! 🏆" — all five dimensions complete.
- 🎙️ *"With four dimensions declared, the opponent plays your final missing dimension. Tap 'Win' — all five complete. You win!"*

**End**
- Optionally click **"Finish tutorial"**, then stop recording (`Cmd + Shift + 5` → Stop, or the menu-bar stop button).

---

## After recording

Send me the `.mov`. I can then:
- **Add the English captions** (the 🎙️ lines above, timed to each step)
- **Trim** dead time / any fumbles
- **Compress** to a shareable MP4 (ffmpeg)
- Optionally add a title card + end card to match the game's look

Total on-screen time target: **~60–75 seconds**.
