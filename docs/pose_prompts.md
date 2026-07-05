# キャラ・ポーズ生成プロンプト集（小次郎)

これまでの「ROTATION STUDY(4面図)」と同じ**スタディシート形式**で、動作ごとに生成する。
1シート＝1動作。同じ画面内に複数コマを並べると、AIは同一キャラを保ちやすい。

## 生成のルール（毎回まもる）
- **背景は無地の濃いグレー**（今の絵と同じ。私が自動で背景除去します）
- **真横向き・右向き**（左向きはゲーム側で反転）
- 全コマ**同じ人物・同じ体格・同じ画角・同じ足元ライン**
- コマは**横一列**に並べる。各コマの下にラベル文字を入れてOK（私が切り分けます）
- カメラは固定。ズームしない

---

## 【毎回コピペ】キャラ固定ブロック

> Pixel art character animation study, arcade beat-em-up style (like 90s Capcom).
> The SAME character in every frame: a handsome young samurai, lean muscular build,
> long flowing purple ponytail (high tie), stern calm face, blue eyes.
> Wears a violet/purple kimono with light-purple trim and gold-and-white wave (seigaiha)
> patterns on the wide hakama hem, dark lamellar shoulder armor (sode) and forearm guards,
> black obi sash with a katana at the waist, white tabi socks and sandals.
> Strict SIDE VIEW, facing RIGHT. Plain dark grey background. Consistent character size,
> feet aligned on the same ground line in every frame. Detailed pixel shading, crisp
> outlines, no text bleeding into the character.

---

## ① 歩きサイクル（最優先）

キャラ固定ブロックに続けて:

> WALK CYCLE — 4 frames in a horizontal row, side view facing right, katana kept sheathed
> or held low at the side, ponytail and hakama flowing with the motion:
> Frame 1 "CONTACT R": right foot planted flat forward, left foot behind on its toe pushing off,
>   torso upright with a slight forward lean.
> Frame 2 "PASSING": left leg swings forward and passes under the body, both feet close together,
>   body at its highest point, standing tall.
> Frame 3 "CONTACT L": left foot planted flat forward, right foot behind on its toe,
>   torso upright, slight forward lean (mirror of frame 1's legs).
> Frame 4 "PASSING 2": right leg swings forward passing under the body, feet close together,
>   body highest.
> Show the feet clearly below the hakama hem. Keep the upper body and sword steady;
> only the legs, feet, ponytail and lower robe change between frames.

**ねらい:** コマ1と3で前に出る足が入れ替わり、2と4で足が揃う＝ちゃんと歩く。
足が袴で隠れないよう「show the feet clearly」を必ず入れる。

---

## ② 走り／ダッシュ（任意・移動を速く見せたい時）

> RUN CYCLE — 4 frames horizontal row, side view facing right, dynamic dash, deeper forward lean,
> bigger stride than walking, one frame fully airborne (both feet off the ground),
> ponytail and hakama streaming behind:
> Frame 1: right leg reaching far forward, left leg extended back, airborne.
> Frame 2: right foot landing, body low.
> Frame 3: left leg reaching far forward, right leg back, airborne (mirror).
> Frame 4: left foot landing, body low.

---

## ③ 立ち（idle・呼吸）

> IDLE — 3 frames horizontal row, side view facing right, standing at ease, katana sheathed,
> subtle breathing: Frame 1 neutral, Frame 2 chest slightly raised (inhale),
> Frame 3 back to neutral. Minimal change, feet planted together.

---

## ④ 斬り3連（attack combo）

> SWORD SLASH COMBO — 5 frames horizontal row, side view facing right:
> Frame 1 "WINDUP": sword raised high overhead, weight back.
> Frame 2 "STEP IN": stepping forward, sword starting to come down.
> Frame 3 "IMPACT": deep lunge, sword slashing down diagonally, arms extended,
>   a bright blue crescent slash arc in front.
> Frame 4 "FOLLOW": sword swept low across the front, body leaning forward.
> Frame 5 "RECOVER": returning toward guard stance.

---

## ⑤ 被弾・ダウン（hurt / knockdown）

> HIT AND KNOCKDOWN — 4 frames horizontal row, side view facing right:
> Frame 1 "HURT": head snapping back, staggering, arms flailing slightly.
> Frame 2 "FLY": knocked off the ground, body tilting backward in the air.
> Frame 3 "FALL": almost horizontal, about to land on the back.
> Frame 4 "DOWN": lying on the ground on the back, defeated.

---

## 敵・NPC を作るときの流れ
上のキャラ固定ブロックの**人物説明だけ差し替え**て、同じ動作プロンプトを使う。
- 悪党ザコA: `a scruffy ragged bandit, unshaven, messy hair, patched dirty kimono, holding a short dagger (dosu), sneering villain face`
- 悪党ザコB: `a big burly bandit, belly wrap, headband, wooden club, brutish face`
- ボス・鬼瓦の権三: `a huge bald scarred brute, bare muscular chest, open kimono, no weapon (bare fists)`
- ボス・徳利の岩五郎: `a fat red-faced drunk giant, holding a large sake jug, jolly menacing`
- NPC村人 / 娘 / 店主 / 馬屋 なども同様に説明差し替え。NPCは idle 1枚でOK。
