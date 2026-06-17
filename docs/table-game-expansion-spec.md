# パスアンドプレイ向けテーブルゲーム追加仕様

## 目的

スマホ1台を回すことで、秘密情報、役職、お題、投票、タイマー、採点を管理できるテーブルゲーム系コンテンツを追加する。

この文書は実装前の原典調査メモ兼仕様たたき台です。ゲーム進行、役職構成、勝敗条件、採点方法は本家系ルールにできるだけ準拠して再現する。一方で、ルールブック本文、カード文面、お題リスト、画像、音声、UIデザインなどの表現物は、許諾やライセンス確認がない限り転載しない。実装時は同じ遊び心地になるよう、表示文言とデータをParty Deck用に作る。

## 追加候補一覧

| 仮実装名 | 参考にした原典/系統 | 推奨人数 | スマホが担うもの | 優先度 |
| --- | --- | ---: | --- | --- |
| ワード潜入者 | The Chameleon / Word Wolf / Imposter系 | 3-8 | 秘密ワード配布、投票、潜入者の最終推理 | 高 |
| インサイダー推理 | Insider系 | 4-8 | 役職配布、答え配布、質問タイマー、投票 | 高 |
| スパイロケーション | Spyfall系 | 4-8 | 場所配布、スパイ配布、タイマー、告発投票、スパイ推理 | 高 |
| 価値観メーター | Wavelength系 | 4-8 | 2チーム、正解位置、尺度、左右予想、10点先取 | 高 |
| エセアーティスト | A Fake Artist Goes to New York系 | 5-8 | お題配布、キャンバス、描画順、投票、偽物の最終推理 | 中 |
| ランキング回答 | Top Ten系 | 4-8 | 1-10秘密番号、お題、回答記録、並び替え、協力採点 | 中 |

## 共通実装方針

- すべて `GameDefinition` 単位で独立登録する。
- 秘密情報を見る前に必ず受け渡し画面を挟む。
- リロード/ブラウザバックで秘密情報に直接復帰しない。
- 広告は秘密確認、投票、描画、回答中には表示しない。
- お題データは `src/data/*` にゲーム別で分離する。
- 商標名は調査用の `sourceName` としてdocsに残す。UIで原典名を出す場合は商標利用可否を確認する。
- 本家のゲーム進行、勝敗条件、得点方式は本家準拠で再現する。
- 本家のカード文面やお題リストは転載せず、同じ構造の独自データを作る。
- 既存の `飲み会ゲーム辞典` にあるルール説明だけのレコードとは別扱いにする。ここに書いた候補は、プレイ進行をアプリが持つ「実装ゲーム」候補。

## 1. ワード潜入者

### 原典/参考

- The Chameleon: Big Potato Games。公式ページでは3-8人、15分、1人だけ秘密トピックを知らず、全員が秘密トピックに関連する1語を言って潜入者を探す構造が説明されている。
- Imposter/Word Wolf系: 1台のスマホを回して秘密語を確認する実装例が多い。

参考URL:

- `https://bigpotato.com/gb/games/the-chameleon/`
- `https://impostergames.org/`

### 本家準拠ゲームフロー

1. 参加者へ秘密情報を配る。
2. 多数派は同じ秘密トピック/秘密語を知る。
3. 1人だけ秘密語を知らない、または別の語を受け取る。
4. 全員が順番に、秘密語に近すぎないヒントを1つ言う。
5. 会話して、誰が潜入者か投票する。
6. 潜入者が最多票なら、潜入者は秘密語を推理するチャンスを得る。
7. 潜入者が逃げ切る、または秘密語を当てれば潜入者側の勝ち。潜入者を見つけ、秘密語も守れたら多数派の勝ち。

### Party Deck仕様案

モード:

- `unknownWord`: 潜入者だけ秘密語を知らず、カテゴリだけ見る。
- `differentWord`: 潜入者だけ近い別ワードを見る。後回し。

画面フロー:

1. 設定: 人数、カテゴリ、潜入者人数1固定、ヒント順ランダム/登録順。
2. 受け渡し: 次のプレイヤー名を表示。
3. 秘密確認: 多数派はカテゴリと秘密語、潜入者はカテゴリのみを表示。
4. ヒント宣言: 画面上で順番を表示。各自が口頭で1語ヒントを言う。
5. 議論タイマー: 1-3分。
6. 投票: 全員が怪しい人を秘密投票。
7. 潜入者推理: 潜入者が最多票なら秘密語を入力/選択。
8. 結果: 潜入者、秘密語、投票、勝利陣営を表示。

必要state:

```ts
type WordInfiltratorState = {
  topicId: string;
  category: string;
  secretWord: string;
  decoyWord?: string;
  infiltratorPlayerIds: string[];
  revealViewedPlayerIds: string[];
  clueOrder: string[];
  votes: Record<string, string>;
  infiltratorGuess?: string;
  phase: "reveal" | "clue" | "discussion" | "vote" | "guess" | "result";
};
```

## 2. インサイダー推理

### 原典/参考

- Insider: Oink Games。公式ページでは4-8人、15分、ゲームマスターが答えを知り、質問には「Yes」「No」「I don't know」で答える。5分以内に答えを当て、その後インサイダーを探す構造が説明されている。

参考URL:

- `https://oinkgames.com/en/games/analog/insider/`

### 本家準拠ゲームフロー

1. 役職を配る。最低限、マスター、インサイダー、市民がいる。
2. マスターは公開役職として進行を担当し、答えを知る。
3. インサイダーも答えを知るが、正体は隠す。
4. 市民は答えを知らない。
5. 質問フェーズでは、全員がマスターへはい/いいえ/わからないで答えられる質問をする。
6. 制限時間内に答えを当てられなければ全員失敗。
7. 答えを当てたら、今度は誰がインサイダーだったか議論する。
8. インサイダーを当てれば市民側勝利。外せばインサイダー側勝利。

### Party Deck仕様案

画面フロー:

1. 設定: 制限時間、カテゴリ、マスターの選び方。
2. 役職配布: 全員にマスター/インサイダー/市民を秘密表示。マスターだけは役職を公開してよい。
3. 答え確認: マスターとインサイダーだけが答えを見る。
4. 質問タイマー: 全員が口頭で質問し、マスターが回答する。アプリはタイマーだけ管理。
5. 正解入力: 答えが出たらマスターが正解扱いにする。
6. インサイダー投票: 全員が怪しい人へ投票。
7. 結果: 答え、役職、投票、勝利陣営を表示。

必要state:

```ts
type InsiderState = {
  answerId: string;
  answerText: string;
  category: string;
  masterPlayerId: string;
  insiderPlayerId: string;
  revealViewedPlayerIds: string[];
  guessedCorrectly: boolean;
  answerGuessedByPlayerId?: string;
  votes: Record<string, string>;
  phase: "roleReveal" | "answerReveal" | "question" | "vote" | "result";
};
```

## 3. スパイロケーション

### 原典/参考

- Spyfall系。公開ルールでは4-8人、全員に同じ場所カードを配り、1人だけスパイカードを受け取る。8分タイマー、質問、告発投票、最後のスパイ推理で勝敗が決まる。

参考URL:

- `https://www.spyfall-game.com/rules`

### 本家準拠ゲームフロー

1. 1つの場所を選ぶ。
2. スパイ以外には同じ場所を配る。
3. スパイには場所を伏せる。
4. 制限時間中、プレイヤー同士で場所に関する質問をする。
5. スパイは場所を知らないまま自然に答える。
6. 誰かがスパイだと思ったら告発し、告発対象以外の全員一致で公開する。
7. スパイを当てれば非スパイ側勝利。誤告発ならスパイ勝利。
8. 時間切れ時、スパイは場所を推理する。正解ならスパイ勝利、不正解なら非スパイ側勝利。

### Party Deck仕様案

画面フロー:

1. 設定: 場所カテゴリ、制限時間、スパイ人数1固定。
2. 秘密確認: 非スパイは場所と簡単な説明、スパイは「場所不明」を見る。
3. 質問タイマー: アプリは残り時間と質問順を表示。
4. 告発: いつでも告発画面へ進める。
5. 投票: 告発対象以外が全員賛成したら公開し、1人でも反対なら質問へ戻る。
6. スパイ推理: 時間切れ、または任意でスパイが場所を選ぶ。
7. 結果: 場所、スパイ、投票、勝利陣営を表示。

必要state:

```ts
type SpyLocationState = {
  locationId: string;
  locationName: string;
  locationCategory: string;
  spyPlayerIds: string[];
  revealViewedPlayerIds: string[];
  accusedPlayerId?: string;
  accusationVotes: Record<string, boolean>;
  spyGuessLocationId?: string;
  phase: "reveal" | "question" | "accuse" | "spyGuess" | "result";
};
```

本家フロー寄せの実装メモ:

- 告発された本人は告発投票に参加しない。
- 過半数ではなく、告発対象以外の全員一致で告発成立とする。
- 告発不成立時は投票内容と告発対象をクリアし、質問フェーズへ戻る。

## 4. 価値観メーター

### 原典/参考

- Wavelength系。公開ルールでは親役のPsychicだけが隠れた正解位置を見て、対になる2つの概念の間でどの位置かを示すヒントを出す。回答側はダイヤルを動かして位置を推測し、近さで得点する。

参考URL:

- `https://wavelength.lol/rules/`
- `https://www.asmodee.ca/en/product/wavelength/`
- `https://indd.adobe.com/view/1f510118-439b-4750-85bf-69007afd2b6b`

### 本家準拠ゲームフロー

1. プレイヤーをほぼ同人数の2チームへ分け、先攻は0点、後攻は1点から開始する。
2. 手番チームの親だけが尺度と隠れた正解位置を見る。
3. 親はその位置を連想させる短い1つのヒントを出し、その後は回答へ口出ししない。
4. 親以外の手番チームは相談してメーター上の位置を決める。
5. 相手チームは正解の中心が推測より左か右かを予想する。
6. 正解位置を公開し、親チームは近さに応じて2-4点、相手チームは左右予想成功で1点を得る。親チームが4点の場合、相手チームは得点しない。
7. 通常は相手チームへ手番を渡す。4点を取ったチームが採点後も負けている場合は、別の親で連続手番を行う。
8. どちらかが10点以上になった時点で高得点側が勝利。同点なら両チームが1手番ずつ行うサドンデスを繰り返す。

### Party Deck実装仕様

画面フロー:

1. 設定: 尺度カテゴリを選択する。開始時に4-8人を均等な2チームへ自動編成する。
2. チーム確認: 両チームのメンバーと後攻1点を公開する。
3. 親確認: 手番チームの親だけが尺度と正解位置を見る。
4. ヒント入力: 親が短いヒントを入力し、親以外の自チームへスマホを渡す。
5. 位置推測: 親チームが相談し、数値を表示しないスライダーで位置を確定する。
6. 左右予想: 相手チームへスマホを渡し、正解が確定位置より左右どちらかを選ぶ。
7. 結果: 正解位置、2-4点の得点帯、推測位置、両チームの獲得点と累計点を表示する。
8. 次手番、キャッチアップ、サドンデス、最終結果へ進む。

必要state:

```ts
type SpectrumMeterState = {
  phase: SpectrumMeterPhase;
  seed: string;
  currentRoundIndex: number;
  rounds: SpectrumMeterRound[];
  teamPlayerIds: Record<"a" | "b", string[]>;
  teamScores: Record<"a" | "b", number>;
  suddenDeathTurnsRemaining?: number;
  winningTeamId?: "a" | "b";
};
```

現状メモ:

- 2チーム制、相手チームの左右予想、後攻1点、10点先取、キャッチアップ、サドンデスを実装済み。
- スマホ1台で秘密位置を守るため、親確認後と左右予想前に受け渡し画面を挟む。
- 0-100は内部計算だけに使い、推測中は数値を表示しない。

## 5. エセアーティスト

### 原典/参考

- A Fake Artist Goes to New York: Oink Games。公式ページでは5-10人、20分。全員で1つの絵を描くが、1人だけお題を知らない。各プレイヤーは合計2本の線を描き、最後に偽物を投票で探す。偽物が捕まっても、お題を当てれば偽物側が勝てる。

参考URL:

- `https://oinkgames.com/en/games/analog/a-fake-artist-goes-to-new-york/`

### 本家準拠ゲームフロー

1. 出題者/ゲームマスターがお題とカテゴリを決める。
2. 本物のアーティストはお題を知る。
3. 偽物のアーティストはカテゴリだけ知り、お題は知らない。
4. 出題者は描かず、残りのプレイヤーが順番に1本ずつ線を描く。
5. 描画参加者が合計2本描いたら、誰が偽物か投票する。
6. 偽物が単独最多票でなければ偽物側勝利。同票最多なら捕まっていない扱いにする。
7. 偽物が単独最多票でも、偽物がお題を当てれば偽物側勝利。
8. 偽物を当て、かつお題を守れたら本物側勝利。

### Party Deck仕様案

画面フロー:

1. 設定: カテゴリ、線の本数2固定、描画色。
2. 出題者配布: 1人を出題者にし、お題とカテゴリを見せる。出題者は描画と投票に参加しない。
3. お題配布: 本物にはカテゴリとお題、偽物にはカテゴリのみ。
4. キャンバス描画: スマホを回し、出題者以外が1筆ずつ描く。2周する。
5. 投票: 出題者以外が怪しい人に投票。
6. 偽物推理: 偽物が単独最多票なら、お題を入力/選択。
7. 結果: キャンバス、出題者、偽物、お題、投票、勝敗を表示。

必要state:

```ts
type FakeArtistState = {
  category: string;
  topic: string;
  questionMasterPlayerId: string;
  fakeArtistPlayerId: string;
  revealViewedPlayerIds: string[];
  drawOrder: string[];
  currentStrokeIndex: number;
  strokes: Array<{ playerId: string; color: string; points: Array<{ x: number; y: number }> }>;
  votes: Record<string, string>;
  fakeGuess?: string;
  phase: "reveal" | "draw" | "vote" | "fakeGuess" | "result";
};
```

本家フロー寄せの実装メモ:

- 出題者は偽物側として扱い、描画順と投票者から外す。
- 偽物の捕捉判定は単独最多票のみ。同票最多は偽物側の逃げ切りにする。

## 6. ランキング回答

### 原典/参考

- Top Ten: Cocktail Games。公開ルールPDFでは4-8人通常ルール、協力ゲーム、5ラウンド。各プレイヤーが1-10の秘密番号を受け取り、お題に対して番号の強さに合う回答をする。キャプテンが回答を小さい順に並べ、順序ミスごとに失点トークンが移動する。

参考URL:

- `https://www.cocktailgames.com/wp-content/uploads/2021/01/Top_ten_18_regles_BD.pdf`
- `https://www.asmodee.es/product/top-ten/`

### 本家準拠ゲームフロー

1. キャプテンを決める。
2. お題を1つ読む。
3. 各プレイヤーへ1-10の秘密番号を配る。
4. 各プレイヤーは自分の番号の強さに合う回答を言う。
5. キャプテンは回答を小さい番号順に並べる。
6. 並び順を1人ずつ公開する。
7. 前に公開した番号より小さい番号が出たら失点。
8. 失敗トークンはプレイヤー人数分。
9. 5ラウンド終了時にトークンが残っていれば全員勝利。

### Party Deck仕様案

ナンバートークとの差別化:

- ナンバートーク: 1-100、全員で順番を作る会話ゲーム。
- ランキング回答: 1-10、各自が回答/演技し、キャプテン1人が順番を当てる協力ゲーム。

画面フロー:

1. 設定: ラウンド数5固定、カテゴリ、キャプテン順。
2. 番号配布: 各自が1-10の秘密番号を見る。
3. お題表示: 全員にお題を表示。
4. 回答入力/口頭回答: 各自が番号の強さに合う回答を言う。アプリには短くメモできる。
5. キャプテン並び替え: キャプテンが回答者を小さい順に並べる。
6. 公開: 番号を順に公開し、ミス数を記録。
7. 最終結果: ラウンドごとのミス数と協力成功/失敗を表示。

本家フロー寄せの実装メモ:

- `mistakeLimit` は開始時のプレイヤー人数に合わせる。
- 途中で順番が崩れた回数だけトークンを減らす。
- トークン0、または5ラウンド終了で最終結果へ進む。

必要state:

```ts
type RankingAnswersState = {
  roundIndex: number;
  captainPlayerId: string;
  topicId: string;
  topicText: string;
  assignments: Array<{ playerId: string; number: number; answerText?: string }>;
  captainOrder: string[];
  mistakeCount: number;
  mistakeLimit: number;
  roundResults: Array<{ roundIndex: number; mistakeCount: number }>;
  phase: "numberReveal" | "answer" | "order" | "reveal" | "result" | "final";
};
```

## 追加時の実装順

1. `ワード潜入者`
   - 既存の秘密確認、投票、結果表示を流用しやすい。
   - お題データだけでリプレイ性を作れる。
2. `インサイダー推理`
   - ワンナイト人狼の役職配布とタイマーを応用できる。
   - 答えデータが必要。
3. `スパイロケーション`
   - 場所データが必要だが、実装は軽い。
   - ワード潜入者とデータ構造が近い。
4. `価値観メーター`
   - スライダーUIと採点UIが必要。
   - 既存ナンバートークの価値観会話と相性がよい。
5. `ランキング回答`
   - ナンバートークに近いが、キャプテン制と5ラウンド制を分けて実装する。
6. `エセアーティスト`
   - キャンバス描画が必要なためUI検証コストが高い。
   - ただし完成するとスマホを回す体験として強い。

## 第2弾: クイックゲーム

### みんなと同じ回答

- 4-8人、5問。
- 全員が受け渡し画面から秘密回答を入力する。
- NFKC、小文字化、空白、句読点を正規化して同じ回答を集計する。
- 最大人数の回答グループが2人以上なら、そのグループ全員へ1点を与える。
- 同数最多が複数ある場合は、該当するすべてのグループを得点対象にする。
- お題文と表示名はParty Deck用に自作する。

### ワンワード協力クイズ

- 3-8人、5問。
- 各ラウンドで回答者を1人選び、それ以外が一人ずつ答えを見て秘密ヒントを入力する。
- 正規化後に同じヒントはすべて自動取消する。
- ヒント確認担当は、似すぎたヒント、答えを含むヒント、不適切なヒントを手動取消できる。
- 回答者は残ったヒントだけを見て1回回答する。
- 答えデータ、表示文言、UIはParty Deck用に自作する。

## 法務/データ注意

- 原典名はdocsの参照用途として保持する。UIに出す場合は商標利用可否を確認する。
- ゲーム進行、役職構成、勝敗条件、採点方法は本家準拠で再現してよい。
- お題、場所、尺度、カード文面は独自作成する。
- ルール説明も同じ内容を説明しつつ、画面表示用の文言は独自に書く。
- 公式/出版社の画像、ロゴ、カードデザイン、パッケージ画像は使わない。
- カードデザインや言い回しは転載しない。ゲーム体験が本家系になることは許容する。
- 実装前に、各ゲームの商標名を画面に出す必要があるか確認する。基本は出さない。

## 参照元

- The Chameleon / Big Potato Games: `https://bigpotato.com/gb/games/the-chameleon/`
- Insider / Oink Games: `https://oinkgames.com/en/games/analog/insider/`
- Spyfall rules: `https://www.spyfall-game.com/rules`
- Wavelength rules: `https://wavelength.lol/rules/`
- Wavelength / Asmodee Canada: `https://www.asmodee.ca/en/product/wavelength/`
- Wavelength rulebook: `https://indd.adobe.com/view/1f510118-439b-4750-85bf-69007afd2b6b`
- A Fake Artist Goes to New York / Oink Games: `https://oinkgames.com/en/games/analog/a-fake-artist-goes-to-new-york/`
- Top Ten rules PDF / Cocktail Games: `https://www.cocktailgames.com/wp-content/uploads/2021/01/Top_ten_18_regles_BD.pdf`
- Top Ten / Asmodee Spain: `https://www.asmodee.es/product/top-ten/`
- Just One / Repos Production: `https://www.rprod.com/en/press/just-one`
- Herd Mentality / Big Potato Games: `https://bigpotato.com/products/herd-mentality`
