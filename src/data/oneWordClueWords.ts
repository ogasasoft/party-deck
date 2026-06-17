export type OneWordClueCategory = "daily" | "food" | "nature" | "culture";

export type OneWordClueWord = {
  id: string;
  category: OneWordClueCategory;
  categoryLabel: string;
  text: string;
  enabled: boolean;
};

export const oneWordClueWords: OneWordClueWord[] = [
  { id: "daily-alarm", category: "daily", categoryLabel: "日常", text: "目覚まし時計", enabled: true },
  { id: "daily-umbrella", category: "daily", categoryLabel: "日常", text: "傘", enabled: true },
  { id: "daily-wallet", category: "daily", categoryLabel: "日常", text: "財布", enabled: true },
  { id: "daily-elevator", category: "daily", categoryLabel: "日常", text: "エレベーター", enabled: true },
  { id: "daily-toothbrush", category: "daily", categoryLabel: "日常", text: "歯ブラシ", enabled: true },
  { id: "daily-calendar", category: "daily", categoryLabel: "日常", text: "カレンダー", enabled: true },
  { id: "daily-key", category: "daily", categoryLabel: "日常", text: "鍵", enabled: true },
  { id: "daily-pillow", category: "daily", categoryLabel: "日常", text: "枕", enabled: true },
  { id: "daily-refrigerator", category: "daily", categoryLabel: "日常", text: "冷蔵庫", enabled: true },
  { id: "daily-crosswalk", category: "daily", categoryLabel: "日常", text: "横断歩道", enabled: true },
  { id: "food-curry", category: "food", categoryLabel: "食べ物", text: "カレー", enabled: true },
  { id: "food-popcorn", category: "food", categoryLabel: "食べ物", text: "ポップコーン", enabled: true },
  { id: "food-pudding", category: "food", categoryLabel: "食べ物", text: "プリン", enabled: true },
  { id: "food-onigiri", category: "food", categoryLabel: "食べ物", text: "おにぎり", enabled: true },
  { id: "food-parfait", category: "food", categoryLabel: "食べ物", text: "パフェ", enabled: true },
  { id: "food-pizza", category: "food", categoryLabel: "食べ物", text: "ピザ", enabled: true },
  { id: "food-ramen", category: "food", categoryLabel: "食べ物", text: "ラーメン", enabled: true },
  { id: "food-watermelon", category: "food", categoryLabel: "食べ物", text: "すいか", enabled: true },
  { id: "food-chocolate", category: "food", categoryLabel: "食べ物", text: "チョコレート", enabled: true },
  { id: "food-omelet", category: "food", categoryLabel: "食べ物", text: "オムライス", enabled: true },
  { id: "nature-rainbow", category: "nature", categoryLabel: "自然", text: "虹", enabled: true },
  { id: "nature-volcano", category: "nature", categoryLabel: "自然", text: "火山", enabled: true },
  { id: "nature-penguin", category: "nature", categoryLabel: "自然", text: "ペンギン", enabled: true },
  { id: "nature-sunflower", category: "nature", categoryLabel: "自然", text: "ひまわり", enabled: true },
  { id: "nature-waterfall", category: "nature", categoryLabel: "自然", text: "滝", enabled: true },
  { id: "nature-cactus", category: "nature", categoryLabel: "自然", text: "サボテン", enabled: true },
  { id: "nature-dolphin", category: "nature", categoryLabel: "自然", text: "イルカ", enabled: true },
  { id: "nature-thunder", category: "nature", categoryLabel: "自然", text: "雷", enabled: true },
  { id: "nature-mushroom", category: "nature", categoryLabel: "自然", text: "きのこ", enabled: true },
  { id: "nature-moon", category: "nature", categoryLabel: "自然", text: "月", enabled: true },
  { id: "culture-karaoke", category: "culture", categoryLabel: "カルチャー", text: "カラオケ", enabled: true },
  { id: "culture-ninja", category: "culture", categoryLabel: "カルチャー", text: "忍者", enabled: true },
  { id: "culture-fireworks", category: "culture", categoryLabel: "カルチャー", text: "花火大会", enabled: true },
  { id: "culture-museum", category: "culture", categoryLabel: "カルチャー", text: "美術館", enabled: true },
  { id: "culture-magic", category: "culture", categoryLabel: "カルチャー", text: "手品", enabled: true },
  { id: "culture-robot", category: "culture", categoryLabel: "カルチャー", text: "ロボット", enabled: true },
  { id: "culture-festival", category: "culture", categoryLabel: "カルチャー", text: "夏祭り", enabled: true },
  { id: "culture-detective", category: "culture", categoryLabel: "カルチャー", text: "探偵", enabled: true },
  { id: "culture-space", category: "culture", categoryLabel: "カルチャー", text: "宇宙旅行", enabled: true },
  { id: "culture-treasure", category: "culture", categoryLabel: "カルチャー", text: "宝探し", enabled: true }
];
