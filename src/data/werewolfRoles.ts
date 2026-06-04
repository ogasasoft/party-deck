import type { RoleDefinition } from "../games/werewolf";

export const roleDefinitions: Record<string, RoleDefinition> = {
  villager: {
    roleId: "villager",
    name: "村人",
    team: "human",
    nightOrder: null,
    description: "特別な夜行動はありません。議論で人狼を探します。",
    actionSummary: "夜は何もせず、朝の議論で違和感を探します。",
    detail: "自分の情報は増えません。誰の発言が自然か、誰が役職を名乗るかを見て投票先を決めます。",
    nightAction: "目立つ行動はありません。画面を確認したら、そのまま次の人へ渡します。",
    discussionHint: "役職を名乗る人や、発言の矛盾を見ながら人狼を探します。",
    winConditionHint: "最終的に人狼が処刑されると人間チームの勝利に近づきます。"
  },
  werewolf: {
    roleId: "werewolf",
    name: "人狼",
    team: "werewolf",
    nightOrder: 2,
    description: "他の人狼を確認します。処刑されないように議論します。",
    actionSummary: "夜に仲間の人狼を確認できます。",
    detail: "仲間がいれば名前が表示されます。単独の場合は自分だけが人狼です。朝は正体を隠しながら処刑を避けます。",
    nightAction: "ほかに人狼がいるか確認します。仲間がいなければ単独の人狼です。",
    discussionHint: "正体を隠しながら、人間チームが人狼以外へ投票するように話します。",
    winConditionHint: "人狼が処刑されなければ人狼チームの勝利に近づきます。"
  },
  seer: {
    roleId: "seer",
    name: "占い師",
    team: "human",
    nightOrder: 1,
    description: "他プレイヤー1人、または中央の2枚を確認できます。",
    actionSummary: "夜に誰か1人、または中央2枚の役職を確認できます。",
    detail: "見た情報は議論の強い材料になります。ただし、怪盗が交換すると最終役職が変わることがあります。",
    nightAction: "他プレイヤー1人、または中央カード2枚のどちらかを確認できます。",
    discussionHint: "見た情報をどう出すかが重要です。怪盗の交換で最終役職が変わる可能性も考えます。",
    winConditionHint: "人狼を見つけて処刑できるよう、議論を助ける役職です。"
  },
  robber: {
    roleId: "robber",
    name: "怪盗",
    team: "variable",
    nightOrder: 3,
    description: "自分と他プレイヤー1人のカードを交換できます。",
    actionSummary: "夜に自分と他プレイヤー1人のカードを交換できます。",
    detail: "交換した場合、自分の新しい役職だけ確認できます。交換後の役職で勝敗が決まります。",
    nightAction: "他プレイヤー1人と自分のカードを交換できます。交換しないこともできます。",
    discussionHint: "交換した事実や新しい役職を、どこまで話すかを考えます。",
    winConditionHint: "交換後の最終役職で勝敗が決まります。"
  }
};
