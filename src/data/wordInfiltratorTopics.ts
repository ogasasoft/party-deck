export type WordInfiltratorCategory = "food" | "place" | "daily" | "culture" | "nature" | "action";

export type WordInfiltratorTopic = {
  id: string;
  category: WordInfiltratorCategory;
  categoryLabel: string;
  secretWord: string;
  enabled: boolean;
};

export const wordInfiltratorTopics: WordInfiltratorTopic[] = [
  { id: "food-ramen", category: "food", categoryLabel: "食べ物", secretWord: "ラーメン", enabled: true },
  { id: "food-curry", category: "food", categoryLabel: "食べ物", secretWord: "カレー", enabled: true },
  { id: "food-sushi", category: "food", categoryLabel: "食べ物", secretWord: "寿司", enabled: true },
  { id: "food-pancake", category: "food", categoryLabel: "食べ物", secretWord: "パンケーキ", enabled: true },
  { id: "food-takoyaki", category: "food", categoryLabel: "食べ物", secretWord: "たこ焼き", enabled: true },
  { id: "food-ice-cream", category: "food", categoryLabel: "食べ物", secretWord: "アイスクリーム", enabled: true },
  { id: "place-station", category: "place", categoryLabel: "場所", secretWord: "駅", enabled: true },
  { id: "place-library", category: "place", categoryLabel: "場所", secretWord: "図書館", enabled: true },
  { id: "place-rooftop", category: "place", categoryLabel: "場所", secretWord: "屋上", enabled: true },
  { id: "place-hot-spring", category: "place", categoryLabel: "場所", secretWord: "温泉", enabled: true },
  { id: "place-airport", category: "place", categoryLabel: "場所", secretWord: "空港", enabled: true },
  { id: "place-convenience-store", category: "place", categoryLabel: "場所", secretWord: "コンビニ", enabled: true },
  { id: "daily-umbrella", category: "daily", categoryLabel: "日用品", secretWord: "傘", enabled: true },
  { id: "daily-wallet", category: "daily", categoryLabel: "日用品", secretWord: "財布", enabled: true },
  { id: "daily-key", category: "daily", categoryLabel: "日用品", secretWord: "鍵", enabled: true },
  { id: "daily-headphones", category: "daily", categoryLabel: "日用品", secretWord: "イヤホン", enabled: true },
  { id: "daily-mirror", category: "daily", categoryLabel: "日用品", secretWord: "鏡", enabled: true },
  { id: "daily-backpack", category: "daily", categoryLabel: "日用品", secretWord: "リュック", enabled: true },
  { id: "culture-movie", category: "culture", categoryLabel: "エンタメ", secretWord: "映画", enabled: true },
  { id: "culture-karaoke", category: "culture", categoryLabel: "エンタメ", secretWord: "カラオケ", enabled: true },
  { id: "culture-fireworks", category: "culture", categoryLabel: "エンタメ", secretWord: "花火", enabled: true },
  { id: "culture-game-center", category: "culture", categoryLabel: "エンタメ", secretWord: "ゲームセンター", enabled: true },
  { id: "culture-festival", category: "culture", categoryLabel: "エンタメ", secretWord: "文化祭", enabled: true },
  { id: "culture-comedy", category: "culture", categoryLabel: "エンタメ", secretWord: "お笑い", enabled: true },
  { id: "nature-mountain", category: "nature", categoryLabel: "自然", secretWord: "山", enabled: true },
  { id: "nature-sea", category: "nature", categoryLabel: "自然", secretWord: "海", enabled: true },
  { id: "nature-rainbow", category: "nature", categoryLabel: "自然", secretWord: "虹", enabled: true },
  { id: "nature-sakura", category: "nature", categoryLabel: "自然", secretWord: "桜", enabled: true },
  { id: "nature-typhoon", category: "nature", categoryLabel: "自然", secretWord: "台風", enabled: true },
  { id: "nature-moon", category: "nature", categoryLabel: "自然", secretWord: "月", enabled: true },
  { id: "action-running", category: "action", categoryLabel: "行動", secretWord: "走る", enabled: true },
  { id: "action-cooking", category: "action", categoryLabel: "行動", secretWord: "料理", enabled: true },
  { id: "action-cleaning", category: "action", categoryLabel: "行動", secretWord: "掃除", enabled: true },
  { id: "action-dancing", category: "action", categoryLabel: "行動", secretWord: "ダンス", enabled: true },
  { id: "action-shopping", category: "action", categoryLabel: "行動", secretWord: "買い物", enabled: true },
  { id: "action-napping", category: "action", categoryLabel: "行動", secretWord: "昼寝", enabled: true }
];
