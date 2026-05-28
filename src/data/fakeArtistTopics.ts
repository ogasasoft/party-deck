export type FakeArtistCategory = "food" | "place" | "animal" | "object" | "event";

export type FakeArtistTopic = {
  id: string;
  category: FakeArtistCategory;
  categoryLabel: string;
  text: string;
  enabled: boolean;
};

export const fakeArtistTopics: FakeArtistTopic[] = [
  { id: "food-burger", category: "food", categoryLabel: "食べ物", text: "ハンバーガー", enabled: true },
  { id: "food-parfait", category: "food", categoryLabel: "食べ物", text: "パフェ", enabled: true },
  { id: "food-onigiri", category: "food", categoryLabel: "食べ物", text: "おにぎり", enabled: true },
  { id: "food-pizza", category: "food", categoryLabel: "食べ物", text: "ピザ", enabled: true },
  { id: "food-watermelon", category: "food", categoryLabel: "食べ物", text: "スイカ", enabled: true },
  { id: "food-fried-egg", category: "food", categoryLabel: "食べ物", text: "目玉焼き", enabled: true },
  { id: "place-castle", category: "place", categoryLabel: "場所", text: "お城", enabled: true },
  { id: "place-cafe", category: "place", categoryLabel: "場所", text: "カフェ", enabled: true },
  { id: "place-pool", category: "place", categoryLabel: "場所", text: "プール", enabled: true },
  { id: "place-station-platform", category: "place", categoryLabel: "場所", text: "駅のホーム", enabled: true },
  { id: "place-playground", category: "place", categoryLabel: "場所", text: "公園の遊具", enabled: true },
  { id: "place-mountain-hut", category: "place", categoryLabel: "場所", text: "山小屋", enabled: true },
  { id: "animal-cat", category: "animal", categoryLabel: "生き物", text: "猫", enabled: true },
  { id: "animal-penguin", category: "animal", categoryLabel: "生き物", text: "ペンギン", enabled: true },
  { id: "animal-turtle", category: "animal", categoryLabel: "生き物", text: "カメ", enabled: true },
  { id: "animal-giraffe", category: "animal", categoryLabel: "生き物", text: "キリン", enabled: true },
  { id: "animal-frog", category: "animal", categoryLabel: "生き物", text: "カエル", enabled: true },
  { id: "animal-owl", category: "animal", categoryLabel: "生き物", text: "フクロウ", enabled: true },
  { id: "object-chair", category: "object", categoryLabel: "もの", text: "イス", enabled: true },
  { id: "object-guitar", category: "object", categoryLabel: "もの", text: "ギター", enabled: true },
  { id: "object-rocket", category: "object", categoryLabel: "もの", text: "ロケット", enabled: true },
  { id: "object-glasses", category: "object", categoryLabel: "もの", text: "メガネ", enabled: true },
  { id: "object-teapot", category: "object", categoryLabel: "もの", text: "急須", enabled: true },
  { id: "object-sneaker", category: "object", categoryLabel: "もの", text: "スニーカー", enabled: true },
  { id: "event-camping", category: "event", categoryLabel: "できごと", text: "キャンプ", enabled: true },
  { id: "event-birthday", category: "event", categoryLabel: "できごと", text: "誕生日", enabled: true },
  { id: "event-rainy-day", category: "event", categoryLabel: "できごと", text: "雨の日", enabled: true },
  { id: "event-sports-day", category: "event", categoryLabel: "できごと", text: "運動会", enabled: true },
  { id: "event-shopping", category: "event", categoryLabel: "できごと", text: "買い物", enabled: true },
  { id: "event-space-trip", category: "event", categoryLabel: "できごと", text: "宇宙旅行", enabled: true }
];
