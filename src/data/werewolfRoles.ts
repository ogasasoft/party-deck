import type { RoleDefinition } from "../games/werewolf";

export const roleDefinitions: Record<string, RoleDefinition> = {
  villager: {
    roleId: "villager",
    name: "村人",
    icon: "村",
    team: "human",
    nightOrder: null,
    description: "特別な夜行動はありません。議論で人狼を探します。",
    actionSummary: "夜は何もせず、朝の議論で違和感を探します。",
    detail: "自分の情報は増えません。誰の発言が自然か、誰が役職を名乗るかを見て投票先を決めます。"
  },
  werewolf: {
    roleId: "werewolf",
    name: "人狼",
    icon: "狼",
    team: "werewolf",
    nightOrder: 2,
    description: "他の人狼を確認します。処刑されないように議論します。",
    actionSummary: "夜に仲間の人狼を確認できます。",
    detail: "仲間がいれば名前が表示されます。単独の場合は自分だけが人狼です。朝は正体を隠しながら処刑を避けます。"
  },
  seer: {
    roleId: "seer",
    name: "占い師",
    icon: "占",
    team: "human",
    nightOrder: 1,
    description: "他プレイヤー1人、または中央の2枚を確認できます。",
    actionSummary: "夜に誰か1人、または中央2枚の役職を確認できます。",
    detail: "見た情報は議論の強い材料になります。ただし、怪盗が交換すると最終役職が変わることがあります。"
  },
  robber: {
    roleId: "robber",
    name: "怪盗",
    icon: "盗",
    team: "variable",
    nightOrder: 3,
    description: "自分と他プレイヤー1人のカードを交換できます。",
    actionSummary: "夜に自分と他プレイヤー1人のカードを交換できます。",
    detail: "交換した場合、自分の新しい役職だけ確認できます。交換後の役職で勝敗が決まります。"
  }
};
