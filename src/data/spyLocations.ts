export type SpyLocationCategory = "travel" | "daily" | "work" | "leisure" | "nature" | "event";

export type SpyLocation = {
  id: string;
  category: SpyLocationCategory;
  categoryLabel: string;
  name: string;
  hint: string;
  enabled: boolean;
};

export const spyLocations: SpyLocation[] = [
  { id: "travel-airport-lounge", category: "travel", categoryLabel: "移動", name: "空港ラウンジ", hint: "静かに待つ人が多い場所", enabled: true },
  { id: "travel-night-bus", category: "travel", categoryLabel: "移動", name: "夜行バス", hint: "眠りながら移動する場所", enabled: true },
  { id: "travel-ferry", category: "travel", categoryLabel: "移動", name: "フェリー", hint: "海の上で過ごす乗り物", enabled: true },
  { id: "travel-ticket-gate", category: "travel", categoryLabel: "移動", name: "改札前", hint: "人が流れていく境目", enabled: true },
  { id: "travel-roadside-station", category: "travel", categoryLabel: "移動", name: "道の駅", hint: "休憩と買い物が混ざる場所", enabled: true },
  { id: "daily-supermarket", category: "daily", categoryLabel: "日常", name: "スーパー", hint: "夕方に混みやすい場所", enabled: true },
  { id: "daily-laundromat", category: "daily", categoryLabel: "日常", name: "コインランドリー", hint: "待ち時間が生まれやすい場所", enabled: true },
  { id: "daily-barbershop", category: "daily", categoryLabel: "日常", name: "理髪店", hint: "座って整えてもらう場所", enabled: true },
  { id: "daily-post-office", category: "daily", categoryLabel: "日常", name: "郵便局", hint: "小さな手続きをする場所", enabled: true },
  { id: "daily-apartment-elevator", category: "daily", categoryLabel: "日常", name: "マンションのエレベーター", hint: "短い沈黙が起きやすい場所", enabled: true },
  { id: "work-meeting-room", category: "work", categoryLabel: "仕事", name: "会議室", hint: "資料と発言が集まる場所", enabled: true },
  { id: "work-shared-office", category: "work", categoryLabel: "仕事", name: "シェアオフィス", hint: "知らない人同士が働く場所", enabled: true },
  { id: "work-backyard", category: "work", categoryLabel: "仕事", name: "店舗のバックヤード", hint: "表には見えない作業場所", enabled: true },
  { id: "work-call-booth", category: "work", categoryLabel: "仕事", name: "通話ブース", hint: "小声で集中する場所", enabled: true },
  { id: "work-training-room", category: "work", categoryLabel: "仕事", name: "研修室", hint: "新しい手順を覚える場所", enabled: true },
  { id: "leisure-karaoke-room", category: "leisure", categoryLabel: "遊び", name: "カラオケルーム", hint: "音量を気にしなくていい場所", enabled: true },
  { id: "leisure-bowling-alley", category: "leisure", categoryLabel: "遊び", name: "ボウリング場", hint: "順番を待ちながら応援する場所", enabled: true },
  { id: "leisure-aquarium", category: "leisure", categoryLabel: "遊び", name: "水族館", hint: "暗い通路で眺める場所", enabled: true },
  { id: "leisure-camp-site", category: "leisure", categoryLabel: "遊び", name: "キャンプ場", hint: "外で食べて眠る場所", enabled: true },
  { id: "leisure-comic-cafe", category: "leisure", categoryLabel: "遊び", name: "漫画喫茶", hint: "一人で長居しやすい場所", enabled: true },
  { id: "nature-observation-deck", category: "nature", categoryLabel: "自然", name: "展望台", hint: "遠くを見るための場所", enabled: true },
  { id: "nature-riverbank", category: "nature", categoryLabel: "自然", name: "河川敷", hint: "風が抜ける広い場所", enabled: true },
  { id: "nature-flower-garden", category: "nature", categoryLabel: "自然", name: "花畑", hint: "写真を撮りたくなる場所", enabled: true },
  { id: "nature-ski-lift", category: "nature", categoryLabel: "自然", name: "スキーリフト", hint: "足元が浮く移動場所", enabled: true },
  { id: "nature-cave", category: "nature", categoryLabel: "自然", name: "洞窟", hint: "声が響きやすい場所", enabled: true },
  { id: "event-wedding-party", category: "event", categoryLabel: "イベント", name: "結婚式の二次会", hint: "知らない人同士も祝う場所", enabled: true },
  { id: "event-school-festival", category: "event", categoryLabel: "イベント", name: "学園祭", hint: "手作り感のあるにぎやかな場所", enabled: true },
  { id: "event-flea-market", category: "event", categoryLabel: "イベント", name: "フリーマーケット", hint: "値段交渉が起きる場所", enabled: true },
  { id: "event-fireworks-venue", category: "event", categoryLabel: "イベント", name: "花火大会の会場", hint: "夜に人が集まる場所", enabled: true },
  { id: "event-sports-stand", category: "event", categoryLabel: "イベント", name: "スポーツ観戦席", hint: "一斉に声が上がる場所", enabled: true }
];
