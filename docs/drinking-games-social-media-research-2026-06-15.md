# 海外SNS系パーティゲーム調査 2026-06-15

## 調査目的

TikTok、Instagram、YouTube Shortsなど、海外SNSで動画にしやすいパーティゲームやチャレンジを調べ、Party Deckへ追加する価値を判定する。

調査時の判断基準:

- スマホ1台を回すParty Deckの形式と相性がよい
- 短時間で説明でき、見ている人も楽しめる
- 個人情報、SNSログイン、撮影、投稿を必須にしない
- 暴露、飲酒強要、身体接触で人を傷つけにくい
- 既存75件の飲み会ゲーム辞典、または実装済みゲームと遊びの核が重複しない

## 調査結果の要約

- 海外SNSでは、60秒以内で結果が出て、失敗時の反応が映像として面白い形式が強い。
- TikTok Effect Houseには `Blind Rank`、`Tournament Bracket`、`Friend Roulette`、クイズ、ランダマイザーなどの公式テンプレートがあり、ランキング、二択、ランダム指名は繰り返し使われる形式と判断できる。
- 2026年のSNS系ゲームとして、秘密の0-100を体だけで表現する `Thermostat Game` が紹介され、専用アプリも公開されている。
- 暴露や人物いじりを中心にしたトレンドは反応を得やすく、Party Deckでも刺激強めの選択肢として収録する価値がある。
- Party Deckでは撮影やSNS投稿を実装せず、「動画にしなくてもその場で面白い核」だけを取り入れるのがよい。
- 刺激強めの候補は除外せず、開始前に内容の強さと含まれる話題を表示する。参加者は回答拒否や途中終了を選べるようにする。

## 実装状況

2026-06-15に、辞典へ刺激度フィルタと内容注意表示を追加し、次の7件を刺激強めゲームとして収録した。

- 聞くだけ告白タイム
- パス・ザ・フォン
- ホットシート
- 本音ランキング当て
- 即答トラップ
- あり・なしジャッジ
- レッド・ベージュ・グリーン

## 実装優先度: 高

### 1. ブラインドランキング

- 元形式: `Blind Rank`
- 推奨形態: 新しいスマホ回しゲーム
- 核: 次に何が出るか知らない状態で、提示された項目を空いている順位へ確定配置する。
- ゲーム例: 「旅行したい国」を1位から5位へ並べる。項目は1件ずつ表示され、一度置いた順位は変更できない。
- 既存との差: 実装済みの `ランキング回答` は秘密数字に合わせた回答をキャプテンが並べる協力ゲーム。本候補は未来の項目を知らずに自分の順位を埋める判断ゲーム。
- Party Deckとの相性: アプリがお題、項目、順位枠を管理でき、1人ずつ遊んでも全員で相談しても成立する。
- 権利方針: カテゴリと項目は独自データを作る。SNSの画像やフィルター素材は転載しない。

### 2. サーモスタット・ジェスチャー

- 元形式: `Thermostat Game`
- 推奨形態: `価値観メーター` の短時間モード
- 核: 1人だけが0-100の秘密数字を見て、声や指の本数を使わず体の動きで表現し、他の人が数字を当てる。
- 既存との差: `価値観メーター` は両極のお題に沿った言葉のヒントを使う。本候補は数字そのものを身体表現する。
- Party Deckとの相性: 既存の秘密数字表示、受け渡し、0-100ダイヤル、距離採点を再利用できる。
- 実装方針: 撮影、録画、共有機能は付けず、その場のゲームに集中させる。

### 3. 二択トーナメント

- 元形式: `Tournament Bracket`
- 推奨形態: 新しいスマホゲーム、または飲み会ゲーム辞典から開始
- 核: 2つの候補から好きな方を選び、勝者同士を対戦させて最終1位を決める。
- ゲーム例: コンビニ飯、旅行先、休日の過ごし方など、独自カテゴリから8候補を出す。
- 既存との差: `Would You Rather` は悩ましい二択への回答と会話が核。本候補は勝ち抜き表と最終優勝を決めることが核。
- Party Deckとの相性: 全員投票、代表者回答、予想ゲームなどへ広げやすい。

### 4. 正体不明会見

- 元形式: `Press Conference`
- 推奨形態: 飲み会ゲーム辞典
- 核: 会見する1人だけが自分の正体や出来事を知らず、記者役の質問から推理する。
- 既存との差: `Who Am I` は本人がはい・いいえ質問をする。本候補は周囲が記者として質問し、本人が即興で答えながら正体を推理する。
- Party Deckとの相性: アプリが正体を記者側だけへ見せる実装ゲームにも発展できる。

### 5. パス・ザ・フォン

- 元形式: `Pass the Phone Challenge`
- 推奨形態: ライト・刺激強めのお題パックを選べるスマホ回しゲーム
- 核: 「次は、今日いちばん場を明るくした人へ渡して」「次は、一番返信が遅い人へ渡して」のような指名文に合わせてスマホを渡す。
- Party Deck仕様: ライトは肯定的なお題中心、刺激強めは欠点、恋愛、秘密、人物評価を含む。
- Party Deckとの相性: 1台のスマホを回すプロダクト方針そのものと一致する。
- 注意表示: 刺激強めでは人間関係に踏み込むことを開始前に明示する。撮影と投稿は必須にしない。

### 6. 聞くだけ告白タイム

- 元形式: `We Listen and We Don't Judge`
- 推奨形態: 刺激強めの会話ゲーム
- 核: 順番に小さな秘密、不満、失敗談を話し、その場では反論や評価をせず最後まで聞く。
- 既存との差: `Never Have I Ever` は経験の有無を全員が示す。本候補は1人ずつ具体的な告白をすることが核。
- Party Deckとの相性: アプリがテーマと話す順番を出し、回答拒否ボタンと終了確認を提供できる。
- 注意表示: 秘密、不満、恋愛、過去の行動を含む。ゲーム終了後の議論へ発展する可能性がある。

### 7. ホットシート

- 元形式: `Hot Seat Questions`
- 推奨形態: ライト・刺激強めのお題パックを選べる会話ゲーム
- 核: 1人が一定時間ホットシートに座り、ほかの全員からの質問へテンポよく答える。
- 既存との差: `真実か挑戦か` は質問か挑戦を選ぶ。本候補は1人へ連続質問し、その人を深掘りすることが核。
- Party Deckとの相性: 質問表示、タイマー、回答拒否、次の人への受け渡しを実装できる。

### 8. 本音ランキング当て

- 元形式: `First to Worst`
- 推奨形態: 新しいスマホ回しゲーム
- 核: 1人が5項目を好きな順に秘密で並べ、ほかの人がその順番を予想する。
- 既存との差: `ブラインドランキング` は未来の項目を知らずに自分の順位を埋める。本候補は他人が作った本音の順位を当てる。
- Party Deckとの相性: 秘密入力、全員の予想、答え合わせをスマホ1台で管理できる。刺激強めカテゴリでは友人、恋愛、価値観も順位対象にできる。

### 9. 即答トラップ

- 元形式: `Name a Woman` などのSNS関係性テスト
- 推奨形態: 刺激強めの短時間ゲーム
- 核: 予告なしの短い質問へ即答し、その答えを全員で評価する。
- 既存との差: クイズではなく、最初に思い浮かべた人物や価値観から反応を楽しむ。
- Party Deckとの相性: アプリが短い質問を表示し、回答後に「なぜその答え？」を出せる。
- 注意表示: 恋愛関係や友人関係を試す質問を含む。答えに正解があるような見せ方はしない。

## 実装優先度: 中

### 推しプレゼン

- 元形式: `Hear Me Out Cake`
- 核: 一見意外な推し、作品、食べ物などを1つ挙げ、短時間で魅力を説明する。
- 判断: ケーキ、画像、恋愛対象を必須にせず、独自の会話ゲームへ置き換えれば使える。
- 注意: 人物画像を用意させず、実在人物を性的に評価するルールにしない。

### Party Quirks

- 核: 1人がホストになり、ほかの参加者は秘密の特徴を演じる。ホストは会話から全員の特徴を当てる。
- 判断: `共通設定当て` 候補とは異なり、参加者ごとに別の特徴を持つ。秘密情報配布を実装すると遊びやすい。

### What Are the Odds?

- 核: 2人が1から決めた上限までの数字を同時に言い、一致したら事前に合意した軽い挑戦をする。
- 判断: 数字一致の瞬間はSNS映えするが、無理な挑戦につながりやすい。安全なお題だけをアプリが提示する場合に候補。

### 一文字で映画を台無しにする

- 元形式: `Ruin a Movie by Changing One Letter`
- 核: 有名な作品名の一文字を変え、最も面白い別タイトルを作る。
- 判断: 道具不要で短いが、日本語では一文字変更の難易度差が大きい。作品名一覧の権利、表記、ローカライズ確認が必要。

### あり・なしジャッジ

- 元形式: `Smash or Pass`
- 核: 人物、架空のキャラクター、特徴、行動を恋愛対象としてありかなしか即答し、理由を話す。
- 判断: 刺激強め枠として追加候補。実在の参加者の写真を使わず、Party Deck独自のお題だけを出す。
- 表現方針: 画面には婉曲な表示名を使い、元名は `hiddenAliases` に入れる。

### レッド・ベージュ・グリーンフラッグ

- 核: 恋愛や友人関係の行動を、危険、気になるだけ、好印象の3段階で判定して議論する。
- 判断: TikTokのRed Flag、Beige Flag文化を使えるが、遊びの核は既存の `10点満点` に近い。新ゲームではなく刺激強めのお題パックを優先する。

## 既存ゲームへ統合する候補

| SNS上の呼び方・形式 | Party Deckでの判定 | 理由 |
|---|---|---|
| Put a Finger Down | `Never Have I Ever` の別名・派生 | 経験がある人が指を折る核が同じ |
| Suspect Challenge / Who Is Most Likely | `第一印象ゲーム` / `Most Likely To` の派生 | お題に合う人を同時に指す核が同じ |
| Impostor / Who Is the Spy | `インポスターワード`、実装済み`ワード潜入者`の派生 | 秘密語を知らない人を会話で探す核が同じ |
| Name 3 in 5 Seconds | `7秒チャレンジ` の時間違いvariant | 短時間に指定数の回答を出す核が同じ |
| Randomizer / Who Am I Filter | `Who Am I` の出題方法variant | ランダム表示は出題手段であり、推理の核は同じ |
| This or That | `Would You Rather` または多数派ゲームのvariant | 二択を選ぶ核が同じ |
| Friend Roulette | 共通のランダム指名機能 | 単体ゲームより、各ゲームで次の人を選ぶ部品として有用 |

## 見送り候補

| 候補 | 理由 |
|---|---|
| Hear Me Out Cakeの元ルール | ケーキ、画像、恋愛・性的評価が中心。独自の推しプレゼンへ変える |
| Candy Salad Trauma Dump | 食べ物が必要で、深刻な体験の告白を笑いに変える危険がある |
| Lip Reading Challenge | ヘッドホンが必要 |
| 身体接触・転倒を伴うチャレンジ | 居酒屋や狭い部屋での安全性が低い |
| 撮影・投稿が必須のゲーム | 個人情報を持たない、SNS連携しないParty Deckの方針と合わない |

## 推奨実装順

1. ブラインドランキングを独立ゲームとして設計する
2. サーモスタット・ジェスチャーを価値観メーターの短時間モードとして設計する
3. 正体不明会見を飲み会ゲーム辞典へ追加する
4. パス・ザ・フォンのライト・刺激強めお題ポリシーを作る
5. ホットシートと聞くだけ告白タイムを刺激強めゲームとして設計する
6. 二択トーナメントの独自カテゴリデータを作る

最初の2件は、海外SNSで遊び方が伝わりやすく、既存のParty Deck UIとロジックを活用しやすい。

## 参照元

- TikTok Effect House Blind Rank: https://effecthouse.tiktok.com/learn/guides/tutorials/template-tutorials/blind-rank
- TikTok Effect House Tournament Bracket: https://effecthouse.tiktok.com/learn/guides/tutorials/template-tutorials/tournament-bracket
- TikTok Effect House Friend Roulette: https://effecthouse.tiktok.com/learn/guides/tutorials/template-tutorials/friend-roulette
- TikTok Effect House Randomizer 2D: https://effecthouse.tiktok.com/learn/guides/tutorials/template-tutorials/randomizer-2d
- TikTok Effect House One Person Quiz: https://effecthouse.tiktok.com/learn/guides/tutorials/template-tutorials/one-person-quiz
- Thermostat Game App Store: https://apps.apple.com/pl/app/thermostat-game/id6758713470
- TikTok viral party games 2026: https://impostorwho.com/blog/tiktok-viral-party-games-2026/
- Pass the Phone Challenge overview: https://knowyourmeme.com/memes/pass-the-phone-challenge-passing-the-phone-to
- Hear Me Out Cake explanation: https://www.forbes.com/sites/danidiplacido/2024/10/09/tiktoks-hear-me-out-cake-trend-explained/
- We Listen and We Don't Judge explanation: https://www.glamour.com/story/the-we-listen-and-we-dont-judge-tiktok-trend-explained
- Hot Seat questions trend: https://parade.com/living/hot-seat-questions
- First to Worst overview: https://www.target.com/p/dyce-games-first-to-worst-couples-board-game/-/A-94769275
- TikTok Name a Woman relationship test: https://www.businessinsider.com/name-a-woman-challenge-tiktok-asking-husband-boyfriend-relationship-test-2023-12
- TikTok Beige Flags overview: https://time.com/6286130/tiktok-beige-flags/
- Smash or Pass overview: https://en.wikipedia.org/wiki/Smash_or_pass
- Recent no-props party game list: https://www.buzzfeed.com/terripous/fun-party-games
