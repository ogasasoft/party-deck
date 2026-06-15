# 飲み会ゲーム追加調査 2026-06-11

## 調査目的

既存の飲み会ゲーム辞典70件と重複せず、道具なしで始められ、Party Deckへ追加する価値がある候補を探す。

調査時の優先条件:

- 1分以内に説明しやすい
- 2-8人程度で遊びやすい
- 居酒屋や自宅で大きな準備なしに遊べる
- 飲酒や罰ゲームを強制しなくても成立する
- 既存レコードと遊びの核が異なる

## 調査結果の要約

- 2026年時点の国内記事でも、短時間、簡単、誰かを傷つけないゲームが好まれる傾向が示されている。
- 2026年4月更新を含む国内の最新まとめ記事で紹介される道具なしゲームは、山手線ゲーム、第一印象ゲーム、NGワード、しりとり記憶ゲームなど既存辞典と重なるものが多い。
- 韓国系はAPT以外にも、リズム、指名、口と手の不一致を使うゲームが多く、既存辞典へ追加できる候補が残っている。
- 海外のno-prep party gameでは、即興、共同推理、複数人ジェスチャーが既存辞典の弱い領域。
- APT級に明確な「新しい単独バイラルゲーム」は今回確認できなかった。これは検索結果からの推測であり、TikTok等の閉じた投稿内トレンドは別途定期観測が必要。

## 実装状況

2026-06-15に、優先候補のうち次の5件を飲み会ゲーム辞典へ追加した。

- 炙りカルビゲーム
- かぶっちゃやーよ
- いちごゲーム
- 言う数・見せる数
- 質問だけ会話

## 追加優先度: 高

### 1. 炙りカルビゲーム

- 国: 日本
- 推奨表示名: 炙りカルビゲーム
- 推奨duplicateKey: `cumulative-tongue-twister`
- 核: 同じ短い言葉を、手番ごとに1回ずつ増やして言う。
- 既存との差: `早口言葉チャレンジ` は難しい文章を言えるかが核。本候補は反復回数の累積と記憶が核。
- 追加理由: 国内飲み会記事で現在も定番として紹介され、説明が非常に短い。

### 2. かぶっちゃやーよ

- 国: 日本
- 推奨表示名: かぶっちゃやーよ
- 推奨duplicateKey: `simultaneous-unique-answer`
- 核: お題への回答を同時に言い、他人と重複しなかった人が勝つ。
- 既存との差: `マジョリティゲーム` と `少数派ゲーム` は二択の人数差が核。本候補は自由回答で重複を避けることが核。
- 追加理由: 少人数でも大人数でも成立し、オープン回答なので繰り返しやすい。

### 3. いちごゲーム

- 国: 韓国
- aliases候補: `딸기게임`, `Ddalgi Game`, `Strawberry Game`
- 推奨duplicateKey: `rhythm-repetition-ladder`
- 核: 4拍子を刻みながら、同じ言葉を1回から8回まで増減させる。
- 既存との差: `炙りカルビゲーム` は順番に反復回数を増やす。いちごゲームは全員の4拍子と増減するリズムが核。
- 追加理由: K-POP関連の紹介記事でAPT、ホンサム、にんじんと並ぶ人気ゲームとして紹介されている。

### 4. 言う数・見せる数

- 国: 韓国
- 推奨表示名: 言う数・見せる数
- aliases候補: `Babo Game`, `바보게임`
- 推奨duplicateKey: `spoken-shown-number-mismatch`
- 核: 前の人が指で見せた数を口で言いながら、それとは違う数を指で見せる。
- 既存との差: `指スマ` は全員の指の合計予想。本候補は口と手の情報をずらし続ける反応ゲーム。
- 追加理由: 道具不要で座ったまま遊べ、ルールの核が既存と明確に異なる。
- 表現方針: 元名の直訳は避け、UIでは婉曲な表示名を使う。

### 5. コンタクト

- 国: 国際
- aliases候補: `Contact`
- 推奨duplicateKey: `cooperative-prefix-word-deduction`
- 核: 親の秘密語の先頭文字をもとに、回答側同士が別の言葉で同時一致し、秘密語の文字を少しずつ開ける。
- 既存との差: `20の質問` は親へのYes/No質問。本候補は回答側同士が連想を一致させる共同推理。
- 追加理由: 道具なしで4人以上に向き、既存辞典に少ない協力型ワード推理。

### 6. 質問だけ会話

- 国: 国際
- aliases候補: `Questions Only`
- 推奨duplicateKey: `questions-only-improv`
- 核: 2人が質問文だけで会話を続け、普通の文を言うか詰まると交代する。
- 既存との差: `質問マスター` はマスターの質問へ普通に答えない継続ルール。本候補は全発言を質問にする即興会話。
- 追加理由: 短時間で失敗が笑いになり、飲酒や個人攻撃が不要。

### 7. 共通設定当て

- 国: 国際
- 推奨表示名: 共通設定当て
- hiddenAliases候補: `Psychiatrist`, `Psychologist`
- 推奨duplicateKey: `shared-quirk-deduction`
- 核: 1人が席を外している間に、残り全員が回答時の共通設定を決め、戻った人が質問から設定を当てる。
- 既存との差: `Green Glass Door` は言葉が条件に合うかを当てる。本候補は全員の即興回答に共通する振る舞いを当てる。
- 追加理由: 会話、演技、推理を同時に楽しめる。
- 表現方針: 病気や診断を笑いの対象にしないよう、UIでは元名を使わない。

### 8. 逆ジェスチャー

- 国: 国際
- aliases候補: `Reverse Charades`
- 推奨duplicateKey: `group-gesture-one-guesser`
- 核: 1人が回答者になり、残り全員が同時にジェスチャーでお題を伝える。
- 既存との差: `ジェスチャーゲーム` は1人が演じて全員が当てる。本候補は役割が逆で、集団演技の混乱が核。
- 追加理由: 既存のお題を流用しやすく、チーム戦にもできる。

### 9. 音程上げチャレンジ

- 国: 韓国
- aliases候補: `Hello Cleopatra`, `안녕클레오파트라`
- 推奨duplicateKey: `rising-pitch-repeat`
- 核: 同じ短いフレーズを順番に、前の人より高い音程で繰り返す。
- 既存との差: `早口言葉チャレンジ` は発音速度。本候補は音程を上げ続けることが核。
- 追加理由: 説明が短く、歌唱力より失敗の面白さを楽しめる。
- 表現方針: 元ゲーム固有の歌詞は転載せず、Party Deck用の短い独自フレーズを使う。

## 追加優先度: 中

### 真顔メッセージリレー

- 元候補名: 愛してるよゲーム
- 核: 決めた言葉と聞き返しを左右へ送り、笑った人が負け。
- 判断: ルールは独自性があるが、参加者同士の距離感を選ぶ。恋愛表現に限定しない表示名とルールへ変える場合に追加候補。

### ホンサムゲーム

- 国: 韓国
- 核: 1人が2人を指名し、その2人が同じ人を指名したらアクションが発生する。
- 判断: 大人数では面白いが、初回説明がやや難しい。友人プレイテスト向け候補。

### I-AM-GROUND 自己紹介

- 国: 韓国
- 核: 4拍子の動作に合わせて、名前や指名をリレーする。
- 判断: 初対面のアイスブレイクには強いが、既に知り合い同士では弱くなりやすい。

### マジカルバナナ

- 国: 日本
- 核: 4拍子で前の言葉から連想した言葉をつなぐ。
- 判断: `連想ゲーム` のリズム派生として扱う。新規追加より既存レコードのvariant追記を優先する。

### 覚えてしりとり

- 国: 日本
- 核: しりとりを続けながら、それまでの全単語も順番に復唱する。
- 判断: `しりとり` と記憶リレーの複合。既存レコードの派生として追記する方が重複を抑えられる。

## 新規追加しない候補

| 候補 | 判定 | 理由 |
|---|---|---|
| ヌンチゲーム | `たけのこニョッキ` のalias/variant | 任意タイミングで順番に数え、同時発声と最後に残ることを避ける核がほぼ同じ |
| Zip Zap Zop | `ピンポンパンゲーム` のalias/variant | 3語を順番に言いながら指名を渡す核が同じ |
| にんじん・Bunnyゲーム | `007 Bang` に近いvariantとして保留 | 指名された人と両隣が反応する核が近い |
| 体内時計ゲーム | `5秒ストップ` のvariant | 指定秒数を体感で当てる核が同じ |
| Ninja | 辞典追加を保留 | 道具不要だが、居酒屋では接触、転倒、周囲への迷惑リスクがある |
| Hunminjeongeum | 辞典追加を保留 | 韓国語の子音知識に依存し、日本語向けに変えると別ゲームになる |
| Titanic、焼酎キャップ | 対象外 | グラス、飲料、キャップなど物理アイテムが核 |
| キムチゲーム | 対象外 | 検索端末が必要で、Google検索結果への依存が核 |

## 推奨追加順

1. 炙りカルビゲーム
2. かぶっちゃやーよ
3. いちごゲーム
4. 言う数・見せる数
5. 質問だけ会話
6. 共通設定当て
7. コンタクト
8. 逆ジェスチャー
9. 音程上げチャレンジ

最初の4件は説明が短く、飲み会の場で即開始しやすい。5件目以降は即興や推理を好むグループ向け。

## 参照元

- Space Market 最新飲み会ゲーム: https://www.spacemarket.com/magazine/know-how/party/drinking-party-game/
- 謎解きコンシェルジュ 2026年4月更新の飲み会ゲーム: https://nazotoki-concierge.com/column/internal-events/202209279418/
- Ennoshita 大人数・座ったままOKの飲みゲー: https://ennoshita.app/event/media/7sJE29P4eX1JpcQCgP7asX/
- ミライザカ 飲み会ゲーム: https://miraizaka.com/blog_list/10482/
- Yoyappin かぶっちゃやーよ: https://yoyappin.westjr.co.jp/media/drinking-party-game/
- K Village 韓国飲み会ゲーム: https://kvillage.jp/school/kawasaki/blog/236143/
- The Soul of Seoul Korean Drinking Games: https://thesoulofseoul.net/korean-drinking-games/
- Geonbae Korean Drinking Games: https://geonbae.com/most-popular-korean-drinking-games-you-can-play-to-break-the-ice/
- Contact rules: https://quuxplusone.github.io/blog/2021/11/12/contact/
- Questions Only: https://www.hooplaimpro.com/resource/questions-only
- Psychiatrist group game: https://www.theredheadedhostess.com/blog/home-and-family/fun-home-and-family/fun-family-group-game-psychiatrist/
- BuzzFeed recent party game list: https://www.buzzfeed.com/terripous/fun-party-games
- Zip Zap Zop: https://icebreakergame.net/games/zip-zap-zop
- So Cool Korea Nunchi Game: https://socoolkorea.wordpress.com/2015/03/30/korean-drinking-games-part-3-soju-cap-game-titanic-nunchisense-game/
