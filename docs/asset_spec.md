# 「武蔵がくる」アートアセット発注仕様書

## この文書の目的

リファレンス(カプコン「天地を喰らうII」)水準のビジュアルは、**コード描画では実現できず、本物のスプライト画像が必要**です。
ゲーム側には差し替え基盤を実装済みで、この仕様どおりのPNGを `assets/img/sprites/` に置くだけで、
**コード変更なしで**キャラクターが本物の絵に切り替わります(置くまでは現行のコード描画で動作)。

画像の作り方は問いません:
- 画像生成AI(Midjourney / DALL·E / Stable Diffusion + Retro Diffusion / PixelLab など)
- ドット絵師への発注
- 社内デザイナー

---

## 1. キャラクタースプライトシート

### 共通ルール

- **背景透過PNG**、キャラは**右向き**で描く(左向きはゲーム側で反転)
- シートは**縦に「動作」、横に「コマ」**を並べた等間隔グリッド
- 行の順番は下表の「動作の順番」どおり(厳守)。コマ数が少ない行は左詰めで、余りは空でよい
- 各コマ内でキャラの**足元は必ず「足元ライン」(上からのpx)に接地**、左右中央に配置
- 「キャラ高さ」は直立時の頭頂〜足元の目安px(これを基準にゲーム内で拡縮)

### ファイル一覧

| ファイル | 内容 | 1コマ | 足元ライン | キャラ高さ | シート全体 |
|---|---|---|---|---|---|
| `kojiro_strong.png` | 変身後の小次郎 | 160×160 | 148 | 118 | 1280×1440 (8列×9行) |
| `kojiro_weak.png` | 頼りない小次郎 | 160×160 | 148 | 108 | 1280×1280 (8列×8行) |
| `zakoA.png` | 悪党ザコ(ドス持ち) | 144×144 | 134 | 102 | 864×864 (6列×6行) |
| `zakoB.png` | 悪党ザコ(棍棒持ち・大柄) | 144×144 | 134 | 112 | 864×864 (6列×6行) |
| `bossFist.png` | 鬼瓦の権三(素手の大男) | 224×224 | 208 | 168 | 1344×1568 (6列×7行) |
| `bossBottle.png` | 徳利の岩五郎(酒瓶投げ) | 208×208 | 194 | 158 | 1248×1456 (6列×7行) |
| `musashi.png` | 宮本武蔵(二刀流・将来用) | 176×176 | 164 | 124 | 1408×1056 (8列×6行) |

### 動作の順番とコマ数

**kojiro_strong.png**(9行)
| 行 | 動作 | コマ数 | 内容 |
|---|---|---|---|
| 1 | idle | 6 | 八相の構えで呼吸(ループ) |
| 2 | walk | 8 | 歩き(ループ) |
| 3 | attack1 | 5 | 斬り下ろし(溜め1→一閃2→残心2) |
| 4 | attack2 | 5 | 返し斬り(斬り上げ) |
| 5 | attack3 | 6 | 強斬り(大きく踏み込んで両断) |
| 6 | jump | 4 | 跳躍→頂点→下降→着地寸前 |
| 7 | hurt | 3 | のけぞり |
| 8 | down | 5 | 吹き飛び→倒れ(最後のコマ=倒れ姿) |
| 9 | special | 8 | 必殺技「巌流旋風斬り」回転斬り |

**kojiro_weak.png**(8行) … 上記から special を除いた8行。猫背で自信なさげに。

**zakoA.png / zakoB.png / musashi.png**(6行)
| 行 | 動作 | コマ数 (zako / musashi) |
|---|---|---|
| 1 | idle | 4 / 6 |
| 2 | walk | 6 / 8 |
| 3 | windup | 3 / 3 (振りかぶり・攻撃予兆) |
| 4 | strike | 4 / 5 (攻撃) |
| 5 | hurt | 2 / 3 |
| 6 | down | 5 / 5 |

**bossFist.png**(7行): idle 4 / walk 6 / windup 4 / strike 5(正拳突き) / kick 5(蹴り) / hurt 2 / down 5
**bossBottle.png**(7行): idle 4 / walk 6 / windup 4 / strike 5(殴り) / throw 5(酒瓶投げ) / hurt 2 / down 5

### キャラクターデザイン指定

- **小次郎(変身後)**: 浅葱色の羽織+白袴の美剣士。長い黒髪のポニーテール。長大な野太刀「物干し竿」。凛々しく構えは様になっている
- **小次郎(変身前)**: 同一人物だが猫背・困り眉・くすんだ茶の着流し・乱れた髷。刀を持つ手も頼りない
- **ザコA**: ボロの継ぎ当てだらけの着物、蓬髪に無精髭、ドス(短刀)を逆手持ち。下品でガラの悪い破落戸
- **ザコB**: Aより大柄で太い。木の棍棒。腹巻き、頭に手ぬぐい
- **鬼瓦の権三**: スキンヘッドに向こう傷の巨漢。上半身は筋骨隆々ではだけた着物。素手(拳・蹴り)
- **徳利の岩五郎**: 赤ら顔の肥満の大男。片手に一升徳利。酔っ払いの豪傑風
- **宮本武蔵**: 黒ずくめの浪人。荒々しい蓬髪と無精髭。二刀流

### 画像生成AI用プロンプト例(英語)

> 90s Capcom arcade belt-scroll beat-em-up pixel art sprite sheet, in the style of
> "Warriors of Fate / Tenchi wo Kurau II". A handsome samurai swordsman in light-blue
> haori and white hakama, long black ponytail, holding a very long nodachi katana.
> Sprite sheet grid 160x160 per frame, 8 columns x 9 rows, character facing right,
> feet grounded at y=148 in each frame, transparent background, rows top to bottom:
> idle 6 frames, walk cycle 8 frames, downward slash 5 frames, upward slash 5 frames,
> heavy lunging slash 6 frames, jump 4 frames, hit reaction 3 frames,
> knocked down 5 frames, spinning special attack 8 frames.
> Detailed shading, strong silhouette, arcade quality, no outlines bleeding, no text.

※ 生成AIはグリッドを正確に守れないことが多いので、**1動作ずつ生成→Aseprite等でグリッドに配置**が現実的です。
※ ポーズごとの生成なら「same character, walk cycle frame 3 of 8」等でキャラを固定しつつ量産します。

---

## 2. 背景・アイテム(1枚絵)

`assets/img/` 直下。置くとコード生成背景から自動で差し替わります。

| ファイル | 内容 | 推奨サイズ |
|---|---|---|
| `river.png` | 紫川の川沿い(昼) | 1920×540 |
| `shopin.png` | 商店の中(夜・提灯の灯り) | 1920×540 |
| `mihagino.png` | 三萩野の村(夕暮れ) | 1920×540 |
| `city.png` | 馬借町の通り(宵) | 1920×540 |
| `castle.png` | 小倉城(タイトル用) | 1920×540 |
| `cola.png` | 小倉コーラのボトル | 48×96 透過 |
| `cola_logo.png` | 小倉コーラのロゴ | 400×160 透過 |
| `niku.png` / `tea.png` | 肉焼飯 / グリーンティー | 48×48 透過 |

背景は横にタイル(繰り返し)されるので**左右の端が繋がる絵**にしてください。
地面(画面の下1/3)はゲーム側が描くので、**背景は上2/3(空〜地平線、y=340が地面の始まり)**が本体です。

背景プロンプト例:
> 90s Capcom arcade pixel art background, Japanese Edo period riverside in daylight,
> grassy bank with purple gromwell flowers, sparkling river, distant green hills,
> horizontal seamless tiling, 1920x540, horizon line at y=340, detailed dithering.

---

## 3. 組み込み手順

1. PNGを仕様どおりの名前で `assets/img/sprites/`(キャラ)/ `assets/img/`(背景・アイテム)に置く
2. ブラウザを再読み込み — それだけです
3. コマ送りの速さや当たり判定はコード側で調整するので、絵が入った後に微調整します
