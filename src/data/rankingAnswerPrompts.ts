export type RankingAnswerCategory = "daily" | "party" | "acting" | "taste" | "silly";

export type RankingAnswerPrompt = {
  id: string;
  category: RankingAnswerCategory;
  categoryLabel: string;
  text: string;
  lowLabel: string;
  highLabel: string;
  enabled: boolean;
};

export const rankingAnswerPrompts: RankingAnswerPrompt[] = [
  { id: "daily-late-excuse", category: "daily", categoryLabel: "日常", text: "遅刻したときの言い訳", lowLabel: "まだ許せる", highLabel: "かなり苦しい", enabled: true },
  { id: "daily-room-noise", category: "daily", categoryLabel: "日常", text: "隣の部屋から聞こえた音", lowLabel: "気にならない", highLabel: "すぐ確認する", enabled: true },
  { id: "daily-small-reward", category: "daily", categoryLabel: "日常", text: "自分へのごほうび", lowLabel: "ささやか", highLabel: "豪華", enabled: true },
  { id: "daily-weekend-plan", category: "daily", categoryLabel: "日常", text: "理想の休日プラン", lowLabel: "ゆるい", highLabel: "予定ぎっしり", enabled: true },
  { id: "daily-message", category: "daily", categoryLabel: "日常", text: "返信に困るメッセージ", lowLabel: "返しやすい", highLabel: "かなり困る", enabled: true },
  { id: "party-toast", category: "party", categoryLabel: "パーティ", text: "乾杯のひとこと", lowLabel: "普通", highLabel: "忘れられない", enabled: true },
  { id: "party-nickname", category: "party", categoryLabel: "パーティ", text: "今日だけのあだ名", lowLabel: "無難", highLabel: "攻めてる", enabled: true },
  { id: "party-table-talk", category: "party", categoryLabel: "パーティ", text: "場があたたまる話題", lowLabel: "静か", highLabel: "一気に盛り上がる", enabled: true },
  { id: "party-cheer", category: "party", categoryLabel: "パーティ", text: "友達への応援", lowLabel: "控えめ", highLabel: "全力", enabled: true },
  { id: "party-photo-pose", category: "party", categoryLabel: "パーティ", text: "集合写真のポーズ", lowLabel: "自然", highLabel: "かなり目立つ", enabled: true },
  { id: "acting-villain-line", category: "acting", categoryLabel: "演技", text: "悪役のセリフ", lowLabel: "弱そう", highLabel: "ラスボス感", enabled: true },
  { id: "acting-hero-entry", category: "acting", categoryLabel: "演技", text: "ヒーローの登場シーン", lowLabel: "地味", highLabel: "大迫力", enabled: true },
  { id: "acting-apology", category: "acting", categoryLabel: "演技", text: "本気の謝罪", lowLabel: "軽い", highLabel: "人生をかけている", enabled: true },
  { id: "acting-surprise", category: "acting", categoryLabel: "演技", text: "驚いたリアクション", lowLabel: "小さい", highLabel: "大げさ", enabled: true },
  { id: "acting-sales", category: "acting", categoryLabel: "演技", text: "謎の商品を売る一言", lowLabel: "売れなさそう", highLabel: "欲しくなる", enabled: true },
  { id: "taste-gift", category: "taste", categoryLabel: "好み", text: "もらったら嬉しいプレゼント", lowLabel: "まあまあ", highLabel: "最高", enabled: true },
  { id: "taste-breakfast", category: "taste", categoryLabel: "好み", text: "朝ごはんのメニュー", lowLabel: "軽い", highLabel: "しっかり", enabled: true },
  { id: "taste-date", category: "taste", categoryLabel: "好み", text: "デートの行き先", lowLabel: "気軽", highLabel: "特別感", enabled: true },
  { id: "taste-movie", category: "taste", categoryLabel: "好み", text: "映画のおすすめ", lowLabel: "万人向け", highLabel: "刺さる人には深い", enabled: true },
  { id: "taste-fashion", category: "taste", categoryLabel: "好み", text: "今日のファッション案", lowLabel: "落ち着き", highLabel: "個性的", enabled: true },
  { id: "silly-spell", category: "silly", categoryLabel: "変化球", text: "使えそうな魔法の名前", lowLabel: "弱い", highLabel: "強い", enabled: true },
  { id: "silly-new-holiday", category: "silly", categoryLabel: "変化球", text: "新しい祝日の名前", lowLabel: "地味", highLabel: "国民が喜ぶ", enabled: true },
  { id: "silly-alien", category: "silly", categoryLabel: "変化球", text: "宇宙人への第一声", lowLabel: "安全", highLabel: "攻めてる", enabled: true },
  { id: "silly-secret-skill", category: "silly", categoryLabel: "変化球", text: "実は持っていたい能力", lowLabel: "日常向き", highLabel: "世界が変わる", enabled: true },
  { id: "silly-final-boss", category: "silly", categoryLabel: "変化球", text: "最終決戦前の一言", lowLabel: "弱気", highLabel: "勝てそう", enabled: true }
];
