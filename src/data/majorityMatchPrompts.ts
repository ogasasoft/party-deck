export type MajorityMatchCategory = "daily" | "food" | "party" | "imagination";

export type MajorityMatchPrompt = {
  id: string;
  category: MajorityMatchCategory;
  categoryLabel: string;
  text: string;
  enabled: boolean;
};

export const majorityMatchPrompts: MajorityMatchPrompt[] = [
  { id: "daily-first-app", category: "daily", categoryLabel: "日常", text: "朝起きて最初に開きがちなアプリは？", enabled: true },
  { id: "daily-late-excuse", category: "daily", categoryLabel: "日常", text: "遅刻の言い訳といえば？", enabled: true },
  { id: "daily-rain-item", category: "daily", categoryLabel: "日常", text: "雨の日に忘れたくないものは？", enabled: true },
  { id: "daily-convenience-buy", category: "daily", categoryLabel: "日常", text: "コンビニでつい買うものは？", enabled: true },
  { id: "daily-weekend-place", category: "daily", categoryLabel: "日常", text: "休日に行きたい場所は？", enabled: true },
  { id: "daily-small-stress", category: "daily", categoryLabel: "日常", text: "地味にストレスなことは？", enabled: true },
  { id: "daily-forgotten-item", category: "daily", categoryLabel: "日常", text: "家を出てから忘れたと気づきやすいものは？", enabled: true },
  { id: "food-rice-friend", category: "food", categoryLabel: "食べ物", text: "白ごはんに一番合うものは？", enabled: true },
  { id: "food-night-snack", category: "food", categoryLabel: "食べ物", text: "夜食といえば？", enabled: true },
  { id: "food-summer", category: "food", categoryLabel: "食べ物", text: "夏に食べたいものは？", enabled: true },
  { id: "food-festival", category: "food", categoryLabel: "食べ物", text: "お祭りの屋台で買うものは？", enabled: true },
  { id: "food-comfort", category: "food", categoryLabel: "食べ物", text: "疲れた日に食べたいものは？", enabled: true },
  { id: "food-breakfast", category: "food", categoryLabel: "食べ物", text: "定番の朝ごはんは？", enabled: true },
  { id: "food-share", category: "food", categoryLabel: "食べ物", text: "みんなで分けやすい食べ物は？", enabled: true },
  { id: "party-karaoke", category: "party", categoryLabel: "パーティ", text: "カラオケの一曲目に選びやすい曲の雰囲気は？", enabled: true },
  { id: "party-photo-pose", category: "party", categoryLabel: "パーティ", text: "集合写真の定番ポーズは？", enabled: true },
  { id: "party-prize", category: "party", categoryLabel: "パーティ", text: "もらって嬉しい景品は？", enabled: true },
  { id: "party-icebreaker", category: "party", categoryLabel: "パーティ", text: "初対面で話しやすい話題は？", enabled: true },
  { id: "party-toast", category: "party", categoryLabel: "パーティ", text: "乾杯の前に言いがちな一言は？", enabled: true },
  { id: "party-late-night", category: "party", categoryLabel: "パーティ", text: "二次会で行きたい場所は？", enabled: true },
  { id: "party-group-role", category: "party", categoryLabel: "パーティ", text: "グループに一人はいる役回りは？", enabled: true },
  { id: "imagination-superpower", category: "imagination", categoryLabel: "想像", text: "一つだけ欲しい超能力は？", enabled: true },
  { id: "imagination-pet", category: "imagination", categoryLabel: "想像", text: "飼ってみたい架空の生き物は？", enabled: true },
  { id: "imagination-island", category: "imagination", categoryLabel: "想像", text: "無人島に一つ持っていくなら？", enabled: true },
  { id: "imagination-time-travel", category: "imagination", categoryLabel: "想像", text: "過去と未来、行くならどっち？", enabled: true },
  { id: "imagination-hero-color", category: "imagination", categoryLabel: "想像", text: "ヒーローのイメージカラーは？", enabled: true },
  { id: "imagination-secret-room", category: "imagination", categoryLabel: "想像", text: "秘密基地に置きたいものは？", enabled: true },
  { id: "imagination-alien-gift", category: "imagination", categoryLabel: "想像", text: "宇宙人に渡す地球のお土産は？", enabled: true }
];
