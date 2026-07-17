# 実装仕様

## 目的

`docs/user-stories.md` と `docs/system-design-units.md` をもとに、MVP実装へ入るための具体仕様を定義する。

MVP対象ゲーム:

- 日本マップ当て
- ナンバートーク
- ワンナイト人狼
- 飲み会ゲーム辞典
- ワード潜入者
- インサイダー推理
- スパイロケーション
- 価値観メーター
- ランキング回答
- エセアーティスト

残りの追加実装候補:


追加候補の原典調査と実装たたき台は `docs/table-game-expansion-spec.md`、実装順と完了条件は `docs/table-game-expansion-plan.md`、詳細タスクは `docs/table-game-expansion-task-list.md` にまとめる。

## 重要方針

- スマホ1台を回して遊ぶパスアンドプレイ型にする。
- アカウント、メール、電話番号、SNS連携、端末位置情報は使わない。
- プレイヤー情報はニックネームと担当色だけ。
- 最大8人。
- 広告SDKは後回し。初期実装では広告枠と表示可否ロジックだけ入れる。
- 本家系ゲームの進行、役職構成、勝敗条件、採点方法はできるだけ準拠して再現する。
- 本家ゲームの文章、画像、音声、UIデザイン、お題リスト、カード文面は許諾やライセンス確認なしに転載しない。
- 追加テーブルゲームは原典名をdocsの参照用途として保持する。UIに出す場合は商標利用可否を確認する。
- 飲み会ゲーム辞典は道具なしゲームのみを対象にし、通常の表示カテゴリは国だけにする。
- 下ネタ寄りのゲームだけは `下ネタ` を特別カテゴリとして扱い、直接的な名前や説明はUIに出さない。
- 飲み会ゲーム辞典のデータはAI/cron更新を想定し、重複判定用の `duplicateKey` と `aiReviewHint` を持つ。
- 秘密、恋愛、人物評価へ踏み込む刺激強めゲームも収録対象にし、`intensity` と `contentWarnings` で一覧時点に内容を表示する。
- 刺激強めゲームでは回答拒否と途中終了を用意するが、人間関係へ踏み込むことだけを理由にゲーム内容を除外しない。
- カード、サイコロ、カップ、ブロックなどが核の飲み会ゲームは、辞典へ無理に入れず将来の実装候補として分離する。
- 割り勘はゲーム登録へ混ぜず、店舗ごとの割合計算と一日集計を行う独立した便利ツールとして扱う。詳細は `docs/bill-split-spec.md` を参照する。

## 技術スタック

MVPでは以下を採用する。

- Vite
- React
- TypeScript
- React Router
- CSS Modules または通常CSS
- localStorage
- Leaflet
- Mapillary JS/API

採用理由:

- SPAで十分。
- ログインやサーバー同期が不要。
- ローカル状態中心なのでViteが軽い。
- 地図は日本地図にピンを刺す用途が中心なのでLeafletで十分。
- Next.jsのSSRやAPI routeは初期MVPでは不要。

後回し:

- PWA
- 広告SDK
- 管理画面
- オンライン同期
- Mapillary地点収集APIのサーバー化

## 実装順

1. Vite + React + TypeScriptをセットアップする。
2. 共通UIとルーティングを作る。
3. PlayerProfileとSession保存を作る。
4. GameRegistryを作る。
5. ナンバートークを実装する。
6. ワンナイト人狼を実装する。
7. 日本マップ当てを静的地点データで実装する。
8. 飲み会ゲーム辞典をデータ駆動で実装する。
9. Mapillary全国地点収集スクリプトを追加する。
10. 広告枠とAdPolicyを接続する。

最初にナンバートークを作る理由:

- 外部APIが不要。
- 受け渡し、秘密確認、会話、結果という共通体験を検証できる。

## ディレクトリ構成

```txt
src/
  main.tsx
  App.tsx
  app/
    routes.tsx
    AppShell.tsx
    screens/
      HomeScreen.tsx
      PlayerSetupScreen.tsx
      GameSetupScreen.tsx
      PassDeviceScreen.tsx
      AdSlot.tsx
  core/
    game-registry/
      GameDefinition.ts
      registry.ts
    player/
      playerTypes.ts
      playerStore.ts
      playerValidation.ts
    session/
      sessionTypes.ts
      sessionStore.ts
      sessionFactory.ts
    storage/
      storage.ts
      storageKeys.ts
    navigation/
      routeTypes.ts
      navigationGuards.ts
    ads/
      adPolicy.ts
    timer/
      useTimer.ts
    random/
      random.ts
      shuffle.ts
    geo/
      distance.ts
  games/
    geo-guessr/
      definition.ts
      types.ts
      state.ts
      screens/
        GeoSetupScreen.tsx
        GeoImageScreen.tsx
        GeoAnswerMapScreen.tsx
        GeoRoundResultScreen.tsx
        GeoGameResultScreen.tsx
      units/
        geoLocationRepository.ts
        mapillaryProvider.ts
        geoScoring.ts
    number-talk/
      definition.ts
      types.ts
      state.ts
      screens/
        NumberTalkSetupScreen.tsx
        NumberRevealScreen.tsx
        NumberDiscussionScreen.tsx
        NumberOrderScreen.tsx
        NumberResultScreen.tsx
      units/
        topicRepository.ts
        numberDealer.ts
        numberJudge.ts
    onenight-werewolf/
      definition.ts
      types.ts
      state.ts
      screens/
        WerewolfSetupScreen.tsx
        RoleRevealScreen.tsx
        NightActionScreen.tsx
        DiscussionScreen.tsx
        VoteScreen.tsx
        WerewolfResultScreen.tsx
      units/
        roleCatalog.ts
        roleSetBuilder.ts
        cardDealer.ts
        nightActions.ts
        judge.ts
    drinking-games/
      definition.ts
      types.ts
      state.ts
      screens/
        DrinkingGameBrowserScreen.tsx
      units/
        catalog.ts
        search.ts
        dedup.ts
  data/
    geo-locations.seed.json
    geo-locations.generated.json
    number-talk-topics.ts
    werewolf-roles.ts
    drinking-games.ts
scripts/
  collect-mapillary-japan.ts
  validate-geo-locations.ts
```

## 共通型

### Player

```ts
export type Player = {
  id: string;
  nickname: string;
  color: string;
};
```

### GameDefinition

```ts
export type GameDefinition<TConfig, TState> = {
  gameId: string;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  availability?: "active" | "paused";
  availabilityLabel?: string;
  createDefaultConfig: () => TConfig;
  createInitialState: (input: {
    players: Player[];
    config: TConfig;
    seed: string;
  }) => TState;
  canShowAds: (state: TState) => boolean;
};
```

ゲーム一覧はプロダクト上の優先順を明示的に定義し、飲み会ゲーム辞典を先頭へ固定する。一時停止中のゲームは一覧へ残すが、状態ラベルを表示して選択、開始、保存セッション復帰を無効化する。

### Session

```ts
export type SessionStatus = "setup" | "playing" | "result" | "completed";

export type SessionEnvelope<TState> = {
  sessionId: string;
  gameId: string;
  players: Player[];
  seed: string;
  status: SessionStatus;
  createdAt: string;
  updatedAt: string;
  gameState: TState;
};
```

### 保存key

```ts
party:v1:players
party:v1:sessions:{sessionId}:meta
party:v1:sessions:{sessionId}:game:{gameId}
party:v1:lastSession
```

## 共通画面仕様

### Home

表示:

- ゲームタイトル
- ゲーム内容
- 参加人数
- プレイヤー設定ボタン
- 広告枠

表示しない:

- 目安時間
- 細かいタグ
- Guessrのデッキ/移動設定

### PlayerSetup

仕様:

- 2人から8人。
- ニックネーム必須。
- 色は重複を避ける。
- 削除後、2人未満にはしない。

### PassDevice

仕様:

- 次のプレイヤー名だけ表示する。
- 秘密情報、前プレイヤーの回答、前プレイヤーの結果は表示しない。
- 広告は表示しない。
- ボタン押下後に対象画面へ進む。

## 広告仕様

初期実装では `AdSlot` を置くだけにする。

広告枠を置く画面:

- Home
- PlayerSetup
- GameSetup
- Guessr RoundResult
- Guessr GameResult
- NumberTalk Result
- Werewolf Result

広告を置かない画面:

- PassDevice
- NumberReveal
- RoleReveal
- NightAction
- GeoImage
- GeoAnswerMap
- Vote

```ts
export type AdSlotKind = "banner" | "rectangle" | "interstitial-placeholder";

export type AdSlotProps = {
  slotId: string;
  kind: AdSlotKind;
};
```

## State Machine

### 共通ルール

- secretを表示する画面は、ブラウザバックやリロードで直接復帰させない。
- リロード時にsecret系phaseだった場合はPassDeviceへ戻す。
- 回答/投票確定後は編集不可。
- `phase` は各ゲームstate内に持つ。

## 日本マップ当て

### Config

```ts
export type GeoConfig = {
  rounds: 3 | 5;
  timeLimitSec: 0 | 30 | 60 | 90;
  movementMode: "no-move";
};
```

ユーザーが設定できるもの:

- ラウンド数
- 制限時間

ユーザーに見せないもの:

- 地点データ選択
- デッキ選択
- 移動モード

### State

```ts
export type GeoPhase =
  | "setup"
  | "roundStart"
  | "handoff"
  | "viewingImage"
  | "placingPin"
  | "roundResult"
  | "gameResult";

export type GeoState = {
  phase: GeoPhase;
  config: GeoConfig;
  currentRoundIndex: number;
  currentPlayerIndex: number;
  roundLocations: GeoLocation[];
  answers: GeoAnswer[];
};
```

### 遷移

| 現在 | イベント | 次 |
| --- | --- | --- |
| setup | start | roundStart |
| roundStart | preparePlayer | handoff |
| handoff | confirmHandoff | viewingImage |
| viewingImage | openMap | placingPin |
| placingPin | submitGuess | handoff |
| placingPin | submitGuess and all players answered | roundResult |
| roundResult | nextRound | roundStart |
| roundResult | all rounds completed | gameResult |
| gameResult | restart | setup |
| gameResult | home | Home |

### 回答

```ts
export type GeoAnswer = {
  playerId: string;
  roundIndex: number;
  guessLat: number;
  guessLng: number;
  distanceMeters: number;
  score: number;
  submittedAt: string;
};
```

### スコア

MVPでは指数減衰で計算する。

```ts
score = distanceMeters <= 50
  ? 5000
  : Math.round(5000 * Math.exp(-distanceMeters / 180000));
```

## Mapillary地点データ仕様

### 方針

友人に遊んでもらえるMVPでは、まず小さな実データで3ゲーム全体を完成させる。  
日本全域のMapillary候補収集は後回しにし、地点数を増やす段階で後述の確認リストに沿って検証する。

基本方針:

- MVPの収集対象は東京周辺などの小範囲サンプル。
- 全国拡張時は収集データが大きくなる前提で扱う。
- 1つの巨大JSONにせず、地域/mesh単位で分割する。
- アプリ起動時に全件を読み込まない。
- 出題時に必要な地域chunkまたは軽量indexだけ読み込む。
- 品質フィルタは最初から入れるが、過度に絞りすぎない。
- 問題が出たら `docs/later-checklist.md` の項目に沿って改善する。

データは3層に分ける。

1. `raw candidates`
   - MVPでは小範囲から収集した候補。
   - 全国拡張時は日本全域から収集した候補。
   - Mapillary API responseに近い形。
   - アプリ本体には同梱しない。
   - 再生成や検証用。

2. `validated locations`
   - 日本ポリゴン内、最低限の画像情報あり、重複除去済み。
   - 地域/mesh単位で分割保存する。
   - MVPでは小範囲サンプルから作り、全国拡張時に都道府県単位へ広げる。

3. `playable index`
   - ゲーム開始時に参照する軽量index。
   - `id`, `lat`, `lng`, `prefecture`, `chunkId`, `difficulty`, `tags` など最小情報だけ持つ。
   - 実際の画像情報は必要時にchunkから読み込む。

### GeoLocation

```ts
export type GeoLocation = {
  id: string;
  provider: "mapillary";
  mapillaryImageId: string;
  lat: number;
  lng: number;
  heading?: number;
  region?: string;
  prefecture?: string;
  difficulty: "easy" | "normal" | "hard";
  tags: string[];
  enabled: boolean;
  qaStatus: "unreviewed" | "approved" | "rejected";
  source: "manual" | "generated";
  chunkId: string;
};
```

### GeoLocationIndexItem

```ts
export type GeoLocationIndexItem = {
  id: string;
  lat: number;
  lng: number;
  prefecture?: string;
  region?: string;
  difficulty: "easy" | "normal" | "hard";
  tags: string[];
  chunkId: string;
};
```

### Mapillary APIで取得したいfields

候補:

```txt
id
geometry
computed_geometry
computed_compass_angle
compass_angle
captured_at
camera_type
height
width
thumb_1024_url
thumb_2048_url
quality_score
sequence
```

`quality_score` はexperimental扱いなので、存在しない/信用しすぎない前提にする。

### API token

開発時:

```txt
VITE_MAPILLARY_ACCESS_TOKEN=...
```

扱い:

- フロントでMapillary画像を表示するなら、tokenは公開される前提で扱う。
- 秘匿が必要になったら、後でAPI proxyを作る。
- MVPではproxyなしで進める。

### 収集スクリプト

ファイル:

```txt
scripts/collect-mapillary-japan.ts
```

責務:

- 日本周辺bboxを小さいmeshへ分割する。
- 各meshごとにMapillary画像を検索する。
- 日本ポリゴン外の候補を除外する。
- 同一sequenceや近すぎる地点を間引く。
- `raw candidates` と `validated locations` を生成する。
- `playable index` を生成する。

日本周辺bbox:

```ts
const JAPAN_BBOX = {
  west: 122.9,
  south: 24.0,
  east: 146.1,
  north: 45.7,
};
```

注意:

- bboxだけだと海や近隣国の一部が入る。
- 最終的には日本ポリゴンでpoint-in-polygonする。
- MVPは小範囲対象、全国拡張時はmesh単位で分割実行する。
- 途中停止しても再開できるようにcheckpointを保存する。

### 収集mesh

全国拡張時に使う。

- 都道府県単位でjobを分ける。
- 各都道府県をさらにmeshへ分割する。
- 1 meshあたり最大取得数を制限する。
- 都市部だけが過密にならないよう、grid dedupeする。

dedupe案:

- geohash precision 6前後で1地点。
- 同一sequenceから連続して取りすぎない。
- 半径300m以内は代表1枚にする。

### データ出力

```txt
data-generated/
  mapillary/
    raw/
      prefecture-13/
        mesh-xxxx.json
    validated/
      prefecture-13/
        chunk-xxxx.json
    indexes/
      playable-index.json
      prefecture-index.json
      stats.json
```

アプリ同梱候補:

```txt
public/data/geo/
  playable-index.json
  chunks/
    prefecture-13/
      chunk-xxxx.json
```

同梱方法は検証で決める。

- 小さければ全chunk同梱。
- 大きければprefecture単位で遅延ロード。
- さらに大きければ静的ファイル配信または軽量API配信。

### 品質フィルタ

`validate-geo-locations.ts` で以下を確認する。

- `lat/lng` が日本ポリゴン内。
- `thumb_1024_url` またはMapillary viewerで表示可能。
- 画像の縦横が極端ではない。
- 同一地点に近すぎない。
- `enabled = true` の地点を出題候補にする。
- `qaStatus = rejected` は除外する。
- `qaStatus = unreviewed` は初期実装では出題可能にするが、問題が多ければ `approved` のみに切り替える。

将来の手動QA:

- 画像が真っ暗でない。
- 顔/ナンバー等はMapillary側で適切にぼかされている。
- 住所や店舗名が露骨すぎない。
- ゲームとして推測可能。

### 初期データ

MVPでは小範囲サンプルの収集データを使う。

```txt
src/data/geo/playable-index.json
src/data/geo/chunks/**/*.json
```

開発初期だけのfallbackとして、収集が未完了でも動作確認できるseedを置いてよい。

```txt
src/data/geo/seed-fallback.json
```

全国収集データは友人テスト後の拡張フェーズで投入する。

## ナンバートーク

### Config

```ts
export type NumberTalkConfig = {
  numberMin: 1;
  numberMax: 100;
  cardsPerPlayer: 1;
  topicCategory: "normal" | "twist" | "love";
  topicId?: string;
  discussionTimeSec: 180 | 300;
};
```

固定:

- 数字は1から100。
- 1人1枚。

ユーザーが設定できるもの:

- お題カテゴリ
- 今回のお題。setup画面で事前表示し、嫌な場合は同カテゴリ内で再抽選できる
- 会話時間

### State

```ts
export type NumberTalkPhase =
  | "setup"
  | "dealNumbers"
  | "handoff"
  | "revealNumber"
  | "discussion"
  | "ordering"
  | "result";

export type NumberTalkState = {
  phase: NumberTalkPhase;
  config: NumberTalkConfig;
  topic: NumberTalkTopic;
  currentPlayerIndex: number;
  assignments: NumberAssignment[];
  revealedPlayerIds: string[];
  order: string[];
};
```

### 遷移

| 現在 | イベント | 次 |
| --- | --- | --- |
| setup | start | dealNumbers |
| dealNumbers | assigned | handoff |
| handoff | confirmHandoff | revealNumber |
| revealNumber | hideAndNext | handoff |
| revealNumber | all players revealed | discussion |
| discussion | finishDiscussion | ordering |
| ordering | submitOrder | result |
| result | restart | setup |
| result | home | Home |

### NumberAssignment

```ts
export type NumberAssignment = {
  playerId: string;
  number: number;
};
```

### お題データ

本家のお題やカテゴリをコピーしない。  
初期データはオリジナル文言で作る。

カテゴリ案:

- `normal`: 日常
- `twist`: 変化球
- `love`: 恋愛

```ts
export type NumberTalkTopic = {
  id: string;
  category: NumberTalkConfig["topicCategory"];
  text: string;
  lowLabel?: string;
  highLabel?: string;
  enabled: boolean;
};
```

初期件数:

- 各カテゴリ20件。
- 合計60件。

例:

```ts
{
  id: "normal-001",
  category: "normal",
  text: "休日にやりたい過ごし方",
  lowLabel: "家で静か",
  highLabel: "外で派手"
}
```

### 判定

- 並び順が数字の昇順なら成功。
- 途中で逆転があれば失敗。
- 結果画面では全員の数字を公開する。

## ワンナイト人狼

### Config

```ts
export type WerewolfConfig = {
  discussionTimeSec: 180 | 300;
  roleSet: "basic";
};
```

### State

```ts
export type WerewolfPhase =
  | "setup"
  | "dealRoles"
  | "roleHandoff"
  | "roleReveal"
  | "nightHandoff"
  | "nightAction"
  | "discussion"
  | "voteHandoff"
  | "vote"
  | "result";

export type WerewolfState = {
  phase: WerewolfPhase;
  config: WerewolfConfig;
  currentPlayerIndex: number;
  playerInitialCards: Record<string, RoleId>;
  playerCurrentCards: Record<string, RoleId>;
  centerCards: [RoleId, RoleId];
  roleRevealDonePlayerIds: string[];
  nightActions: WerewolfNightAction[];
  nightResolved?: boolean;
  votes: WerewolfVote[];
};
```

### Role

```ts
export type RoleId = "villager" | "werewolf" | "seer" | "robber";

export type RoleDefinition = {
  roleId: RoleId;
  name: string;
  team: "human" | "werewolf" | "variable";
  nightOrder: number | null;
  description: string;
};
```

初期役職:

- 村人
- 人狼
- 占い師
- 怪盗

役職説明文:

- 実装ではオリジナル文言を使う。
- 公式文言を使う場合は許諾確認後に差し替える。

### 役職セット

使用カード数:

```ts
players.length + 2
```

基本構成:

- 人狼2枚
- 占い師1枚
- 怪盗1枚
- 残りは村人

例:

| 人数 | 使用カード |
| --- | --- |
| 3人 | 人狼2、占い師1、怪盗1、村人1 |
| 4人 | 人狼2、占い師1、怪盗1、村人2 |
| 5人 | 人狼2、占い師1、怪盗1、村人3 |
| 6人 | 人狼2、占い師1、怪盗1、村人4 |
| 7人 | 人狼2、占い師1、怪盗1、村人5 |
| 8人 | 人狼2、占い師1、怪盗1、村人6 |

### 遷移

| 現在 | イベント | 次 |
| --- | --- | --- |
| setup | start | dealRoles |
| dealRoles | dealt | roleHandoff |
| roleHandoff | confirmHandoff | roleReveal |
| roleReveal | hideAndNext | roleHandoff |
| roleReveal | all players revealed | nightHandoff |
| nightHandoff | confirmHandoff | nightAction |
| nightAction | hideAndNext | nightHandoff |
| nightAction | all players checked | discussion |
| discussion | finishDiscussion | voteHandoff |
| voteHandoff | confirmHandoff | vote |
| vote | submitVote | voteHandoff |
| vote | all players voted | result |
| result | restart | setup |
| result | home | Home |

### 夜行動

画面は人名順に全員へ回す。
ただしルール処理は公式順に寄せ、占い師と人狼の情報確認後、怪盗の交換を夜の最後に解決する。
このため、怪盗がプレイヤー順で占い師より先に操作した場合でも、占い師が見るカードは怪盗交換前のものになる。

#### 占い師

行動:

- 他プレイヤー1人の現在カードを見る。
- または中央カード2枚を見る。

#### 人狼

行動:

- 他の人狼を確認する。
- 自分だけが人狼の場合は、仲間がいないことを表示する。

#### 怪盗

行動:

- 自分と他プレイヤー1人のカードを交換できる。
- 交換しない選択もできる。
- 交換した場合、自分の新しい役職だけを確認する。
- 相手プレイヤーには交換されたことを自動通知しない。
- アプリ内部では選択を記録し、夜行動全員分が終わってから `playerCurrentCards` に反映する。

### 投票

```ts
export type WerewolfVote =
  | {
      fromPlayerId: string;
      targetType: "player";
      targetPlayerId: string;
    }
  | {
      fromPlayerId: string;
      targetType: "peace";
    };
```

### 勝敗判定

対象カード:

- 勝敗判定は `playerCurrentCards` を使う。
- 怪盗交換後の役職で陣営が決まる。

処刑対象:

- 投票数が最大のプレイヤー全員。
- 同票最大が複数なら複数処刑。
- 全員の投票先がバラバラなら処刑なし。

平和村:

- プレイヤー内に人狼がいない場合のみ成立しうる。
- MVPでは `peace` 投票が過半数の場合に処刑なし扱いにする。
- 詳細ルールは後で調整可能にする。

判定:

- 処刑対象に人狼が1人以上含まれるなら人間チーム勝利。
- 処刑対象が人間のみなら人狼チーム勝利。
- 処刑なしでプレイヤー内に人狼がいなければ全員勝利。
- 処刑なしでプレイヤー内に人狼がいれば人狼チーム勝利。

## 価値観メーター

4-8人を均等な2チームへ自動編成する標準チーム戦とする。先攻Aチームは0点、後攻Bチームは1点から開始する。

画面遷移:

```txt
teamReveal
  -> psychicHandoff
  -> psychicReveal
  -> clue
  -> teamGuessHandoff
  -> guess
  -> opponentGuessHandoff
  -> opponentGuess
  -> roundResult
  -> psychicHandoff | final
```

- 親だけが正解位置を見る。ヒント入力後は親以外の自チームへスマホを渡す。
- 親チームは数値を表示しないスライダーで位置を確定する。
- 相手チームは正解中心が推測より左か右かを予想する。
- 親確認と結果では正解中心の周囲に2-4点の得点帯を表示する。親チームの得点は2-4点または0点。相手チームは左右予想成功で1点。ただし親チームが4点なら相手チームは0点。
- 通常は相手チームへ手番を渡す。4点獲得後も負けているチームは、別の親で連続手番を行う。
- 10点以上へ到達した時点で高得点側が勝利。同点なら両チームが1手番ずつ行うサドンデスを繰り返す。
- 旧協力版の保存stateは互換性がないため、復帰時に破棄してHomeへ戻す。

## リロード/ブラウザバック仕様

### リロード復帰

secret系phaseの場合:

- `revealNumber`
- `roleReveal`
- `nightSeer`
- `nightWerewolf`
- `nightRobber`
- `vote`

復帰先:

- 対応する `handoff` phaseへ戻す。

理由:

- リロード後に秘密情報がいきなり見えることを防ぐ。

### 戻るボタン

- GameSetup -> Home
- PassDevice -> GameSetupまたは前phase
- 秘密情報画面 -> PassDevice
- Result -> Home

## 完了条件

MVP完了条件:

- トップから3ゲームを選べる。
- プレイヤー2から8人を設定できる。
- 各ゲームが最後まで遊べる。
- ゲーム間でstateが混ざらない。
- リロードで秘密情報が露出しない。
- 広告枠が表示可能画面にだけ置かれている。
- Mapillary実データの地点indexでGuessrが遊べる。
- `npm run smoke`、`npm run typecheck`、`npm run build` が通る。

## テスト項目

### 共通

- 2人未満では開始不可。
- 8人を超えて追加不可。
- 設定画面から戻れる。
- 受け渡し画面に秘密情報が出ない。
- 広告不可phaseでAdSlotが出ない。

### Guessr

- 全員が同じ地点に回答する。
- 前プレイヤーのピンが次プレイヤーに見えない。
- 全員回答後だけラウンド結果へ進む。
- 距離と点数が計算される。

### ナンバートーク

- 数字は1から100。
- 1人1枚。
- 数字が重複しない。
- 自分の数字だけ見える。
- 並び順の正誤判定ができる。

### ワンナイト人狼

- カード数がプレイヤー数+2。
- 中央カードが2枚。
- 占い師、人狼、怪盗の順に夜行動する。
- 怪盗交換後の役職で勝敗判定する。
- 同票最大は複数処刑になる。
- 処刑対象に人狼がいれば人間勝利。

## 参考

- Mapillary API: https://www.mapillary.com/developer/api-documentation/
- Mapillary API Help: https://help.mapillary.com/hc/en-us/articles/360010234680-Accessing-imagery-and-data-through-the-Mapillary-API
- Mapillary field examples: https://mapillary.github.io/mapillary-python-sdk/docs/mapillary.config.api/mapillary.config.api.entities/
- ワンナイト人狼 公式ルール解説: https://note.com/1nwerewolf/n/n446a1fde2286
- 価値観ゲーム参考: https://app-liv.jp/5351498/
