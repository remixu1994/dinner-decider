export const APP_TIME_ZONE = "Asia/Shanghai";

export const PRESET_TAGS = [
  "家常",
  "快手菜",
  "健身餐",
  "减脂餐",
  "高蛋白",
  "清淡",
  "下饭",
  "汤品",
] as const;

export const FLAVOR_OPTIONS = ["清淡一点", "正常就好", "重口一点"] as const;
export const PORTION_OPTIONS = ["少一点", "刚刚好", "多一点"] as const;
export const FEEDBACK_LIKE_OPTIONS = ["喜欢", "一般", "不喜欢"] as const;
export const FEEDBACK_SALT_OPTIONS = ["偏淡", "刚好", "偏咸"] as const;
export const FEEDBACK_PORTION_OPTIONS = ["偏少", "刚好", "偏多"] as const;

export const MEMBER_ROLE_LABELS = {
  OWNER: "家庭创建者",
  CHEF: "厨师",
  DINER: "干饭人",
  PENDING_MEMBER: "待审核成员",
} as const;

export const JOIN_POLICY_LABELS = {
  OPEN: "直接加入",
  APPROVAL: "审核加入",
} as const;

export const MENU_STATUS_LABELS = {
  COLLECTING: "待收集想法",
  PLANNING: "待厨师确认",
  PRESET: "已存为预设菜单",
  PUBLISHED: "已发布待用餐",
  FEEDBACK: "待反馈",
  COMPLETED: "已完成",
} as const;

export const DEFAULT_RECIPES = [
  {
    name: "鸡胸肉时蔬碗",
    servings: 3,
    tags: ["健身餐", "减脂餐", "高蛋白"],
    ingredients: [
      ["鸡胸肉", 320],
      ["西兰花", 260],
      ["胡萝卜", 120],
      ["玉米粒", 100],
    ],
  },
  {
    name: "番茄炒蛋",
    servings: 3,
    tags: ["家常", "下饭", "快手菜"],
    ingredients: [
      ["番茄", 300],
      ["鸡蛋", 220],
      ["小葱", 20],
    ],
  },
  {
    name: "蒜蓉生菜",
    servings: 3,
    tags: ["清淡", "快手菜"],
    ingredients: [
      ["生菜", 320],
      ["蒜末", 18],
    ],
  },
  {
    name: "土豆炖牛腩",
    servings: 4,
    tags: ["家常", "下饭"],
    ingredients: [
      ["牛腩", 420],
      ["土豆", 320],
      ["洋葱", 100],
    ],
  },
  {
    name: "紫菜蛋花汤",
    servings: 4,
    tags: ["汤品", "清淡"],
    ingredients: [
      ["紫菜", 20],
      ["鸡蛋", 110],
      ["虾皮", 18],
    ],
  },
  {
    name: "香煎三文鱼",
    servings: 3,
    tags: ["健身餐", "高蛋白", "清淡"],
    ingredients: [
      ["三文鱼", 360],
      ["芦笋", 180],
      ["柠檬", 40],
    ],
  },
] as const;
