import type { RoleDefinition } from "../games/werewolf";

export const roleDefinitions: Record<string, RoleDefinition> = {
  villager: {
    roleId: "villager",
    name: "村人",
    team: "human",
    nightOrder: null,
    description: "特別な夜行動はありません。議論で人狼を探します。"
  },
  werewolf: {
    roleId: "werewolf",
    name: "人狼",
    team: "werewolf",
    nightOrder: 2,
    description: "他の人狼を確認します。処刑されないように議論します。"
  },
  seer: {
    roleId: "seer",
    name: "占い師",
    team: "human",
    nightOrder: 1,
    description: "他プレイヤー1人、または中央の2枚を確認できます。"
  },
  robber: {
    roleId: "robber",
    name: "怪盗",
    team: "variable",
    nightOrder: 3,
    description: "自分と他プレイヤー1人のカードを交換できます。"
  }
};
