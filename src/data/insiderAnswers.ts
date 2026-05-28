export type InsiderAnswerCategory = "object" | "food" | "place" | "daily" | "culture" | "nature";

export type InsiderAnswer = {
  id: string;
  category: InsiderAnswerCategory;
  categoryLabel: string;
  text: string;
  enabled: boolean;
};

export const insiderAnswers: InsiderAnswer[] = [
  { id: "object-clock", category: "object", categoryLabel: "もの", text: "時計", enabled: true },
  { id: "object-camera", category: "object", categoryLabel: "もの", text: "カメラ", enabled: true },
  { id: "object-bicycle", category: "object", categoryLabel: "もの", text: "自転車", enabled: true },
  { id: "object-sofa", category: "object", categoryLabel: "もの", text: "ソファ", enabled: true },
  { id: "object-calendar", category: "object", categoryLabel: "もの", text: "カレンダー", enabled: true },
  { id: "food-omelet", category: "food", categoryLabel: "食べ物", text: "オムライス", enabled: true },
  { id: "food-donut", category: "food", categoryLabel: "食べ物", text: "ドーナツ", enabled: true },
  { id: "food-miso-soup", category: "food", categoryLabel: "食べ物", text: "味噌汁", enabled: true },
  { id: "food-grape", category: "food", categoryLabel: "食べ物", text: "ぶどう", enabled: true },
  { id: "food-fried-chicken", category: "food", categoryLabel: "食べ物", text: "唐揚げ", enabled: true },
  { id: "place-park", category: "place", categoryLabel: "場所", text: "公園", enabled: true },
  { id: "place-hospital", category: "place", categoryLabel: "場所", text: "病院", enabled: true },
  { id: "place-museum", category: "place", categoryLabel: "場所", text: "美術館", enabled: true },
  { id: "place-beach", category: "place", categoryLabel: "場所", text: "砂浜", enabled: true },
  { id: "place-school", category: "place", categoryLabel: "場所", text: "学校", enabled: true },
  { id: "daily-laundry", category: "daily", categoryLabel: "暮らし", text: "洗濯", enabled: true },
  { id: "daily-commute", category: "daily", categoryLabel: "暮らし", text: "通勤", enabled: true },
  { id: "daily-sleep", category: "daily", categoryLabel: "暮らし", text: "睡眠", enabled: true },
  { id: "daily-shopping", category: "daily", categoryLabel: "暮らし", text: "買い出し", enabled: true },
  { id: "daily-cleanup", category: "daily", categoryLabel: "暮らし", text: "片付け", enabled: true },
  { id: "culture-concert", category: "culture", categoryLabel: "文化", text: "ライブ", enabled: true },
  { id: "culture-novel", category: "culture", categoryLabel: "文化", text: "小説", enabled: true },
  { id: "culture-anime", category: "culture", categoryLabel: "文化", text: "アニメ", enabled: true },
  { id: "culture-theater", category: "culture", categoryLabel: "文化", text: "演劇", enabled: true },
  { id: "culture-podcast", category: "culture", categoryLabel: "文化", text: "ラジオ", enabled: true },
  { id: "nature-snow", category: "nature", categoryLabel: "自然", text: "雪", enabled: true },
  { id: "nature-cloud", category: "nature", categoryLabel: "自然", text: "雲", enabled: true },
  { id: "nature-river", category: "nature", categoryLabel: "自然", text: "川", enabled: true },
  { id: "nature-forest", category: "nature", categoryLabel: "自然", text: "森", enabled: true },
  { id: "nature-starlight", category: "nature", categoryLabel: "自然", text: "星空", enabled: true }
];
