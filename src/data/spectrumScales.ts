export type SpectrumScaleCategory = "taste" | "life" | "personality" | "culture" | "silly";

export type SpectrumScale = {
  id: string;
  category: SpectrumScaleCategory;
  categoryLabel: string;
  leftLabel: string;
  rightLabel: string;
  enabled: boolean;
};

export const spectrumScales: SpectrumScale[] = [
  { id: "taste-cheap-luxury", category: "taste", categoryLabel: "好み", leftLabel: "安っぽい", rightLabel: "高級感がある", enabled: true },
  { id: "taste-light-heavy", category: "taste", categoryLabel: "好み", leftLabel: "軽い", rightLabel: "重い", enabled: true },
  { id: "taste-simple-flashy", category: "taste", categoryLabel: "好み", leftLabel: "地味", rightLabel: "派手", enabled: true },
  { id: "taste-ordinary-special", category: "taste", categoryLabel: "好み", leftLabel: "普通", rightLabel: "特別", enabled: true },
  { id: "taste-childish-adult", category: "taste", categoryLabel: "好み", leftLabel: "子どもっぽい", rightLabel: "大人っぽい", enabled: true },
  { id: "life-morning-night", category: "life", categoryLabel: "暮らし", leftLabel: "朝向き", rightLabel: "夜向き", enabled: true },
  { id: "life-indoor-outdoor", category: "life", categoryLabel: "暮らし", leftLabel: "家の中", rightLabel: "外に出る", enabled: true },
  { id: "life-planned-random", category: "life", categoryLabel: "暮らし", leftLabel: "計画的", rightLabel: "行き当たりばったり", enabled: true },
  { id: "life-saving-spending", category: "life", categoryLabel: "暮らし", leftLabel: "節約", rightLabel: "奮発", enabled: true },
  { id: "life-fast-slow", category: "life", categoryLabel: "暮らし", leftLabel: "急ぐ", rightLabel: "ゆっくり", enabled: true },
  { id: "personality-cool-hot", category: "personality", categoryLabel: "性格", leftLabel: "冷静", rightLabel: "情熱的", enabled: true },
  { id: "personality-shy-bold", category: "personality", categoryLabel: "性格", leftLabel: "控えめ", rightLabel: "大胆", enabled: true },
  { id: "personality-gentle-strict", category: "personality", categoryLabel: "性格", leftLabel: "やさしい", rightLabel: "厳しい", enabled: true },
  { id: "personality-real-dream", category: "personality", categoryLabel: "性格", leftLabel: "現実的", rightLabel: "夢見がち", enabled: true },
  { id: "personality-careful-risky", category: "personality", categoryLabel: "性格", leftLabel: "慎重", rightLabel: "攻めてる", enabled: true },
  { id: "culture-classic-new", category: "culture", categoryLabel: "カルチャー", leftLabel: "昔ながら", rightLabel: "新しい", enabled: true },
  { id: "culture-mainstream-niche", category: "culture", categoryLabel: "カルチャー", leftLabel: "王道", rightLabel: "ニッチ", enabled: true },
  { id: "culture-family-solo", category: "culture", categoryLabel: "カルチャー", leftLabel: "みんな向け", rightLabel: "ひとり向け", enabled: true },
  { id: "culture-serious-funny", category: "culture", categoryLabel: "カルチャー", leftLabel: "真面目", rightLabel: "笑える", enabled: true },
  { id: "culture-local-global", category: "culture", categoryLabel: "カルチャー", leftLabel: "ローカル", rightLabel: "世界的", enabled: true },
  { id: "silly-weak-strong", category: "silly", categoryLabel: "変化球", leftLabel: "弱そう", rightLabel: "強そう", enabled: true },
  { id: "silly-safe-danger", category: "silly", categoryLabel: "変化球", leftLabel: "安全", rightLabel: "危なそう", enabled: true },
  { id: "silly-normal-weird", category: "silly", categoryLabel: "変化球", leftLabel: "まとも", rightLabel: "変わってる", enabled: true },
  { id: "silly-forgettable-iconic", category: "silly", categoryLabel: "変化球", leftLabel: "忘れがち", rightLabel: "印象が強い", enabled: true },
  { id: "silly-quiet-noisy", category: "silly", categoryLabel: "変化球", leftLabel: "静か", rightLabel: "うるさい", enabled: true }
];
