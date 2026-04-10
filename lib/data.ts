import { randomUUID } from "node:crypto";

import type {
  Family,
  Member,
  Prisma,
} from "@prisma/client";

import {
  APP_TIME_ZONE,
  DEFAULT_RECIPES,
  FEEDBACK_LIKE_OPTIONS,
  FEEDBACK_PORTION_OPTIONS,
  FEEDBACK_SALT_OPTIONS,
  PRESET_TAGS,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  type ActiveMode,
  clearSession,
  getSession,
  setSession,
} from "@/lib/session";

type SessionContext = {
  family: Family;
  member: Member;
  activeMode: ActiveMode;
};

type RecipeWithMeta = Prisma.RecipeGetPayload<{
  include: {
    tags: true;
    ingredients: true;
  };
}>;

type MenuWithMeta = Prisma.MenuGetPayload<{
  include: {
    items: {
      include: {
        tags: true;
        ingredients: true;
        feedbacks: true;
      };
      orderBy: [{ sortOrder: "asc" }, { dishNameSnapshot: "asc" }];
    };
  };
}>;

type RecipeView = {
  id: string;
  name: string;
  source: string;
  defaultServings: number;
  lastCookedAt: string | null;
  tags: string[];
  ingredients: { name: string; grams: number; unit: string }[];
};

type MenuItemView = {
  id: string;
  recipeId: string | null;
  name: string;
  source: string;
  servings: number;
  chefApproved: boolean;
  notes: string | null;
  tags: string[];
  ingredients: { name: string; grams: number; unit: string }[];
  feedbackByMemberId: Record<
    string,
    {
      likeScore: string;
      saltLevel: string;
      portionFit: string;
      comment: string | null;
    }
  >;
};

type MenuView = {
  id: string;
  status: string;
  publishedAt: string | null;
  completedAt: string | null;
  items: MenuItemView[];
};

export type DashboardData = {
  family: {
    id: string;
    name: string;
    code: string;
    joinPolicy: string;
    defaultServings: number;
  };
  currentMember: {
    id: string;
    nickname: string;
    role: ActiveMode;
    isOwner: boolean;
    status: string;
    displayRole: "OWNER" | "CHEF" | "DINER" | "PENDING_MEMBER";
  };
  activeMode: ActiveMode;
  workflowStatus: "COLLECTING" | "PLANNING" | "PUBLISHED" | "FEEDBACK" | "COMPLETED";
  canUseDinerMode: boolean;
  canUseChefMode: boolean;
  canEditRequests: boolean;
  canEditMenu: boolean;
  canApproveMembers: boolean;
  pendingCount: number;
  activeMembers: {
    id: string;
    nickname: string;
    role: string;
    isOwner: boolean;
  }[];
  pendingMembers: {
    id: string;
    nickname: string;
    role: string;
    createdAt: string;
  }[];
  todayRequestSummary: {
    id: string;
    memberId: string;
    nickname: string;
    desiredDishes: string[];
    dislikes: string[];
    flavorPreference: string;
    portionPreference: string;
    tagPreferences: string[];
    needsRecommendation: boolean;
  }[];
  myRequest:
      | {
        desiredDishes: string[];
        dislikes: string[];
        flavorPreference: string;
        portionPreference: string;
        tagPreferences: string[];
        needsRecommendation: boolean;
      }
    | null;
  currentMenu: MenuView | null;
  quickRecipes: RecipeView[];
  recommendations: {
    id: string;
    title: string;
    reason: string;
    recipes: RecipeView[];
  }[];
  recentMenus: {
    id: string;
    dinnerDate: string;
    items: { name: string; tags: string[] }[];
  }[];
};

export type HistoryData = {
  family: { name: string; code: string };
  currentMember: DashboardData["currentMember"];
  allTags: string[];
  activeTag: string | null;
  menus: {
    id: string;
    dinnerDate: string;
    status: string;
    items: {
      id: string;
      name: string;
      tags: string[];
      ingredients: { name: string; grams: number; unit: string }[];
      feedbackSummary: {
        likeLabels: string[];
        saltLabels: string[];
        portionLabels: string[];
      };
    }[];
  }[];
};

export type SettingsData = {
  family: { name: string; code: string; joinPolicy: string };
  currentMember: DashboardData["currentMember"];
  members: {
    id: string;
    nickname: string;
    role: string;
    isOwner: boolean;
    status: string;
  }[];
  pendingMembers: {
    id: string;
    nickname: string;
    role: string;
    createdAt: string;
  }[];
};

function nowIso() {
  return new Date().toISOString();
}

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDinnerDate(dinnerDate: string) {
  const [year, month, day] = dinnerDate.split("-");
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function parseStoredArray(value: string | null | undefined) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizeList(values: Iterable<FormDataEntryValue | string>) {
  const items: string[] = [];

  for (const rawValue of values) {
    const value = String(rawValue).trim();

    if (!value) {
      continue;
    }

    for (const piece of value.split(/[\n,，、]/)) {
      const normalized = piece.trim();

      if (normalized) {
        items.push(normalized);
      }
    }
  }

  return [...new Set(items)];
}

function normalizeTags(values: Iterable<FormDataEntryValue | string>) {
  return [...new Set(normalizeList(values))];
}

function parseIngredientLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      const maybeLast = parts.at(-1) ?? "";
      const match = maybeLast.match(/^(\d+)(g|克)?$/i);

      if (match) {
        return {
          name: parts.slice(0, -1).join(" ") || line,
          grams: Number(match[1]),
          unit: "g",
        };
      }

      return {
        name: line,
        grams: 0,
        unit: "g",
      };
    });
}

function getDisplayRole(member: Member) {
  if (member.status === "PENDING") {
    return "PENDING_MEMBER" as const;
  }

  if (member.isOwner) {
    return "OWNER" as const;
  }

  return member.role === "CHEF" ? ("CHEF" as const) : ("DINER" as const);
}

function getDefaultActiveMode(member: Pick<Member, "role" | "isOwner">): ActiveMode {
  return member.isOwner || member.role === "CHEF" ? "CHEF" : "DINER";
}

function canEditRequests(context: SessionContext) {
  return context.member.status === "ACTIVE" && context.activeMode === "DINER";
}

function canEditMenu(context: SessionContext) {
  return context.member.status === "ACTIVE" && context.activeMode === "CHEF";
}

function canApproveMembers(context: SessionContext) {
  return context.member.status === "ACTIVE" && context.activeMode === "CHEF";
}

async function getSessionContext(): Promise<SessionContext | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const [family, member] = await Promise.all([
    prisma.family.findUnique({ where: { id: session.familyId } }),
    prisma.member.findUnique({ where: { id: session.memberId } }),
  ]);

  if (!family || !member || member.familyId !== family.id) {
    await clearSession();
    return null;
  }

  return {
    family,
    member,
    activeMode: session.activeMode,
  };
}

async function requireSessionContext() {
  const context = await getSessionContext();

  if (!context) {
    throw new Error("SESSION_REQUIRED");
  }

  return context;
}

async function createFamilyCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const existing = await prisma.family.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  return randomUUID().slice(0, 6).toUpperCase();
}

function mapRecipe(recipe: RecipeWithMeta): RecipeView {
  return {
    id: recipe.id,
    name: recipe.name,
    source: recipe.source,
    defaultServings: recipe.defaultServings,
    lastCookedAt: recipe.lastCookedAt,
    tags: recipe.tags.map((tag) => tag.tag),
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.ingredientName,
      grams: ingredient.grams,
      unit: ingredient.unit,
    })),
  };
}

function mapMenu(menu: MenuWithMeta | null): MenuView | null {
  if (!menu) {
    return null;
  }

  return {
    id: menu.id,
    status: menu.status,
    publishedAt: menu.publishedAt,
    completedAt: menu.completedAt,
    items: menu.items.map((item) => ({
      id: item.id,
      recipeId: item.recipeId,
      name: item.dishNameSnapshot,
      source: item.source,
      servings: item.servings,
      chefApproved: item.chefApproved,
      notes: item.notes,
      tags: item.tags.map((tag) => tag.tag),
      ingredients: item.ingredients.map((ingredient) => ({
        name: ingredient.ingredientName,
        grams: ingredient.grams,
        unit: ingredient.unit,
      })),
      feedbackByMemberId: Object.fromEntries(
        item.feedbacks.map((feedback) => [
          feedback.memberId,
          {
            likeScore: feedback.likeScore,
            saltLevel: feedback.saltLevel,
            portionFit: feedback.portionFit,
            comment: feedback.comment,
          },
        ]),
      ),
    })),
  };
}

async function loadRecipesForFamily(familyId: string) {
  const rows = await prisma.recipe.findMany({
    where: { familyId },
    include: {
      tags: true,
      ingredients: true,
    },
    orderBy: [{ lastCookedAt: "desc" }, { name: "asc" }],
  });

  return rows.map(mapRecipe);
}

async function loadMenuByDate(familyId: string, dinnerDate: string) {
  const menu = await prisma.menu.findUnique({
    where: {
      familyId_dinnerDate: {
        familyId,
        dinnerDate,
      },
    },
    include: {
      items: {
        include: {
          tags: true,
          ingredients: true,
          feedbacks: true,
        },
        orderBy: [{ sortOrder: "asc" }, { dishNameSnapshot: "asc" }],
      },
    },
  });

  return mapMenu(menu);
}

function deriveWorkflowStatus(
  menu: MenuView | null,
  requestCount: number,
  activeMemberIds: string[],
) {
  if (!menu || menu.items.length === 0) {
    return requestCount > 0 ? "PLANNING" : "COLLECTING";
  }

  const totalExpectedFeedback = menu.items.length * activeMemberIds.length;
  const receivedFeedback = menu.items.reduce(
    (count, item) => count + Object.keys(item.feedbackByMemberId).length,
    0,
  );

  if (
    menu.status === "COMPLETED" ||
    (totalExpectedFeedback > 0 && receivedFeedback >= totalExpectedFeedback)
  ) {
    return "COMPLETED" as const;
  }

  if (menu.status === "PUBLISHED") {
    return receivedFeedback > 0 ? ("FEEDBACK" as const) : ("PUBLISHED" as const);
  }

  return "PLANNING" as const;
}

function isMenuLockedStatus(status: string | null | undefined) {
  return status === "PUBLISHED" || status === "COMPLETED";
}

function scoreRecipe(
  recipe: RecipeView,
  signals: {
    desired: string[];
    dislikes: string[];
    tags: string[];
    recentlyCooked: string[];
    favorites: string[];
  },
) {
  let score = 0;
  const lowerName = recipe.name.toLowerCase();

  for (const desired of signals.desired) {
    if (lowerName.includes(desired.toLowerCase())) {
      score += 4;
    }
  }

  for (const dislike of signals.dislikes) {
    if (lowerName.includes(dislike.toLowerCase())) {
      score -= 5;
    }
  }

  for (const tag of recipe.tags) {
    if (signals.tags.includes(tag)) {
      score += 2;
    }
  }

  if (signals.recentlyCooked.includes(recipe.name)) {
    score -= 3;
  }

  if (signals.favorites.includes(recipe.name)) {
    score += 2;
  }

  return score;
}

function buildRecommendations(
  allRecipes: RecipeView[],
  requestRows: DashboardData["todayRequestSummary"],
  recentMenus: DashboardData["recentMenus"],
) {
  const desired = requestRows.flatMap((request) => request.desiredDishes);
  const dislikes = requestRows.flatMap((request) => request.dislikes);
  const tags = [...new Set(requestRows.flatMap((request) => request.tagPreferences))];
  const recentlyCooked = recentMenus.flatMap((menu) => menu.items.map((item) => item.name));
  const favorites = recentMenus.slice(0, 1).flatMap((menu) => menu.items.map((item) => item.name));

  const scoredRecipes = [...allRecipes]
    .map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, {
        desired,
        dislikes,
        tags,
        recentlyCooked,
        favorites,
      }),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.recipe.name.localeCompare(right.recipe.name, "zh-CN"),
    );

  const top = scoredRecipes.map((item) => item.recipe);
  const groups = [
    top.slice(0, 3),
    top.slice(1, 4),
    [
      ...top.filter((recipe) => recipe.tags.includes("汤品")).slice(0, 1),
      ...top.slice(3, 5),
    ],
  ]
    .map((items) =>
      items.filter(
        (item, index, array) =>
          item &&
          array.findIndex((candidate) => candidate.id === item.id) === index,
      ),
    )
    .filter((items) => items.length > 0)
    .slice(0, 3);

  return groups.map((recipesGroup, index) => {
    const tagText = recipesGroup.flatMap((recipe) => recipe.tags).slice(0, 3).join(" / ");
    const desiredText = desired.slice(0, 2).join("、");
    const reason =
      desiredText.length > 0
        ? `优先照顾今天提到的“${desiredText}”，同时避开最近频繁重复的组合。`
        : tagText.length > 0
          ? `按今天偏好的 ${tagText} 方向组合，方便厨师直接开做。`
          : "结合历史常做菜和省心搭配，尽量让今晚少纠结。";

    return {
      id: `recommendation-${index + 1}`,
      title: ["顺手开做", "照顾偏好", "换个口味"][index] ?? `推荐方案 ${index + 1}`,
      reason,
      recipes: recipesGroup,
    };
  });
}

async function seedDefaultRecipes(tx: Prisma.TransactionClient, familyId: string) {
  const timestamp = nowIso();

  for (const recipe of DEFAULT_RECIPES) {
    await tx.recipe.create({
      data: {
        id: randomUUID(),
        familyId,
        name: recipe.name,
        source: "LIBRARY",
        defaultServings: recipe.servings,
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: {
          create: recipe.tags.map((tag) => ({
            id: randomUUID(),
            tag,
          })),
        },
        ingredients: {
          create: recipe.ingredients.map(([name, grams]) => ({
            id: randomUUID(),
            ingredientName: name,
            grams,
            unit: "g",
            optional: false,
          })),
        },
      },
    });
  }
}

async function getOrCreateDraftMenu(
  tx: Prisma.TransactionClient,
  familyId: string,
  dinnerDate: string,
) {
  const existingMenu = await tx.menu.findUnique({
    where: {
      familyId_dinnerDate: {
        familyId,
        dinnerDate,
      },
    },
  });

  if (existingMenu) {
    return existingMenu;
  }

  return tx.menu.create({
    data: {
      id: randomUUID(),
      familyId,
      dinnerDate,
      mealType: "DINNER",
      status: "DRAFT",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    },
  });
}

async function replaceMenuItemsFromRecipes(
  tx: Prisma.TransactionClient,
  menuId: string,
  selectedRecipes: RecipeView[],
) {
  const existingItems = await tx.menuItem.findMany({
    where: { menuId },
    select: { id: true },
  });
  const existingIds = existingItems.map((item) => item.id);

  if (existingIds.length > 0) {
    await tx.dishFeedback.deleteMany({ where: { menuItemId: { in: existingIds } } });
    await tx.menuItemIngredient.deleteMany({ where: { menuItemId: { in: existingIds } } });
    await tx.menuItemTag.deleteMany({ where: { menuItemId: { in: existingIds } } });
    await tx.menuItem.deleteMany({ where: { id: { in: existingIds } } });
  }

  for (const [index, recipe] of selectedRecipes.entries()) {
    await tx.menuItem.create({
      data: {
        id: randomUUID(),
        menuId,
        recipeId: recipe.id,
        dishNameSnapshot: recipe.name,
        servings: recipe.defaultServings,
        chefApproved: false,
        source: "RECOMMENDED",
        sortOrder: index,
        tags: {
          create: recipe.tags.map((tag) => ({
            id: randomUUID(),
            tag,
          })),
        },
        ingredients: {
          create: recipe.ingredients.map((ingredient) => ({
            id: randomUUID(),
            ingredientName: ingredient.name,
            grams: ingredient.grams,
            unit: ingredient.unit,
          })),
        },
      },
    });
  }
}

async function markMenuCompletedIfReady(menuId: string, activeMemberIds: string[]) {
  const menu = await prisma.menu.findUnique({
    where: { id: menuId },
    include: {
      items: {
        include: {
          feedbacks: true,
        },
      },
    },
  });

  if (!menu || menu.status !== "PUBLISHED" || activeMemberIds.length === 0) {
    return;
  }

  const expectedCount = menu.items.length * activeMemberIds.length;
  const actualCount = menu.items.reduce(
    (count, item) => count + item.feedbacks.length,
    0,
  );

  if (menu.items.length > 0 && actualCount >= expectedCount) {
    await prisma.menu.update({
      where: { id: menuId },
      data: {
        status: "COMPLETED",
        completedAt: nowIso(),
        updatedAt: nowIso(),
      },
    });
  }
}

export async function createFamilyActionData(formData: FormData) {
  const familyName = String(formData.get("familyName") ?? "").trim();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const joinPolicy =
    String(formData.get("joinPolicy") ?? "OPEN") === "APPROVAL" ? "APPROVAL" : "OPEN";
  const defaultServings = Math.max(
    2,
    Number.parseInt(String(formData.get("defaultServings") ?? "3"), 10) || 3,
  );

  if (!familyName || !nickname) {
    throw new Error("CREATE_FAMILY_INVALID");
  }

  const familyId = randomUUID();
  const memberId = randomUUID();
  const code = await createFamilyCode();
  const timestamp = nowIso();

  await prisma.$transaction(async (tx) => {
    await tx.family.create({
      data: {
        id: familyId,
        name: familyName,
        code,
        joinPolicy,
        defaultServings,
        createdAt: timestamp,
      },
    });

    await tx.member.create({
      data: {
        id: memberId,
        familyId,
        nickname,
        role: "CHEF",
        isOwner: true,
        status: "ACTIVE",
        createdAt: timestamp,
      },
    });

    await seedDefaultRecipes(tx, familyId);
  });

  return { familyId, memberId, activeMode: "CHEF" as const };
}

export async function joinFamilyActionData(formData: FormData) {
  const familyCode = String(formData.get("familyCode") ?? "").trim().toUpperCase();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const role = String(formData.get("role") ?? "DINER") === "CHEF" ? "CHEF" : "DINER";

  if (!familyCode || !nickname) {
    throw new Error("JOIN_FAMILY_INVALID");
  }

  const family = await prisma.family.findUnique({ where: { code: familyCode } });

  if (!family) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const existing = await prisma.member.findFirst({
    where: {
      familyId: family.id,
      nickname,
    },
  });

  if (existing) {
    return {
      familyId: family.id,
      memberId: existing.id,
      activeMode: getDefaultActiveMode(existing),
    };
  }

  const created = await prisma.member.create({
    data: {
      id: randomUUID(),
      familyId: family.id,
      nickname,
      role,
      isOwner: false,
      status: family.joinPolicy === "APPROVAL" ? "PENDING" : "ACTIVE",
      createdAt: nowIso(),
    },
  });

  return {
    familyId: family.id,
    memberId: created.id,
    activeMode: getDefaultActiveMode(created),
  };
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const context = await getSessionContext();

  if (!context) {
    return null;
  }

  const currentDate = todayKey();

  const [familyMembers, recipeRows, todayMenu, todayRequests, allMenus] = await Promise.all([
    prisma.member.findMany({
      where: { familyId: context.family.id },
      orderBy: { createdAt: "desc" },
    }),
    loadRecipesForFamily(context.family.id),
    loadMenuByDate(context.family.id, currentDate),
    prisma.dinnerRequest.findMany({
      where: {
        familyId: context.family.id,
        dinnerDate: currentDate,
      },
    }),
    prisma.menu.findMany({
      where: { familyId: context.family.id },
      orderBy: { dinnerDate: "desc" },
      take: 4,
    }),
  ]);

  const activeMembers = familyMembers.filter((member) => member.status === "ACTIVE");
  const pendingMembers = familyMembers.filter((member) => member.status === "PENDING");
  const requestSummary = todayRequests.map((request) => {
    const author = familyMembers.find((member) => member.id === request.memberId);

    return {
      id: request.id,
      memberId: request.memberId,
      nickname: author?.nickname ?? "家庭成员",
      desiredDishes: parseStoredArray(request.desiredDishes),
      dislikes: parseStoredArray(request.dislikes),
      flavorPreference: request.flavorPreference,
      portionPreference: request.portionPreference,
      tagPreferences: parseStoredArray(request.tagPreferences),
      needsRecommendation: request.needsRecommendation,
    };
  });
  const myRequest = requestSummary.find((request) => request.memberId === context.member.id) ?? null;

  const recentMenus = (
    await Promise.all(
      allMenus
        .filter((menu) => menu.dinnerDate !== currentDate)
        .slice(0, 3)
        .map(async (menu) => {
          const fullMenu = await loadMenuByDate(context.family.id, menu.dinnerDate);

          return {
            id: menu.id,
            dinnerDate: menu.dinnerDate,
            items:
              fullMenu?.items.map((item) => ({
                name: item.name,
                tags: item.tags,
              })) ?? [],
          };
        }),
    )
  ).filter((menu) => menu.items.length > 0);

  return {
    family: {
      id: context.family.id,
      name: context.family.name,
      code: context.family.code,
      joinPolicy: context.family.joinPolicy,
      defaultServings: context.family.defaultServings,
    },
    currentMember: {
      id: context.member.id,
      nickname: context.member.nickname,
      role: context.member.role as ActiveMode,
      isOwner: context.member.isOwner,
      status: context.member.status,
      displayRole: getDisplayRole(context.member),
    },
    activeMode: context.activeMode,
    workflowStatus: deriveWorkflowStatus(
      todayMenu,
      requestSummary.length,
      activeMembers.map((member) => member.id),
    ),
    canUseDinerMode: true,
    canUseChefMode: true,
    canEditRequests: canEditRequests(context),
    canEditMenu: canEditMenu(context),
    canApproveMembers: canApproveMembers(context),
    pendingCount: pendingMembers.length,
    activeMembers: activeMembers.map((member) => ({
      id: member.id,
      nickname: member.nickname,
      role: member.role,
      isOwner: member.isOwner,
    })),
    pendingMembers: pendingMembers.map((member) => ({
      id: member.id,
      nickname: member.nickname,
      role: member.role,
      createdAt: member.createdAt,
    })),
    todayRequestSummary: requestSummary,
    myRequest,
    currentMenu: todayMenu,
    quickRecipes: recipeRows.slice(0, 6),
    recommendations: buildRecommendations(recipeRows, requestSummary, recentMenus),
    recentMenus,
  };
}

export async function saveDinnerRequest(formData: FormData): Promise<boolean> {
  const context = await requireSessionContext();
  const { family, member } = context;

  if (!canEditRequests(context)) {
    return false;
  }

  const timestamp = nowIso();
  const dinnerDate = todayKey();
  const todayMenu = await prisma.menu.findUnique({
    where: {
      familyId_dinnerDate: {
        familyId: family.id,
        dinnerDate,
      },
    },
    select: {
      status: true,
    },
  });

  if (isMenuLockedStatus(todayMenu?.status)) {
    return false;
  }

  const existing = await prisma.dinnerRequest.findUnique({
    where: {
      familyId_memberId_dinnerDate: {
        familyId: family.id,
        memberId: member.id,
        dinnerDate,
      },
    },
  });
  const desiredDishes = [
    ...new Set([
      ...parseStoredArray(existing?.desiredDishes),
      ...normalizeList([String(formData.get("desiredDishes") ?? "")]),
    ]),
  ];

  await prisma.dinnerRequest.upsert({
    where: {
      familyId_memberId_dinnerDate: {
        familyId: family.id,
        memberId: member.id,
        dinnerDate,
      },
    },
    create: {
      id: randomUUID(),
      familyId: family.id,
      memberId: member.id,
      dinnerDate,
      desiredDishes: JSON.stringify(desiredDishes),
      dislikes: JSON.stringify(normalizeList([String(formData.get("dislikes") ?? "")])),
      flavorPreference: String(formData.get("flavorPreference") ?? "正常就好"),
      portionPreference: String(formData.get("portionPreference") ?? "刚刚好"),
      tagPreferences: JSON.stringify(
        normalizeTags([
          ...formData.getAll("tagPreferences"),
          String(formData.get("customTagPreferences") ?? ""),
        ]),
      ),
      needsRecommendation: formData.get("needsRecommendation") === "on",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    update: {
      desiredDishes: JSON.stringify(desiredDishes),
      dislikes: JSON.stringify(normalizeList([String(formData.get("dislikes") ?? "")])),
      flavorPreference: String(formData.get("flavorPreference") ?? "正常就好"),
      portionPreference: String(formData.get("portionPreference") ?? "刚刚好"),
      tagPreferences: JSON.stringify(
        normalizeTags([
          ...formData.getAll("tagPreferences"),
          String(formData.get("customTagPreferences") ?? ""),
        ]),
      ),
      needsRecommendation: formData.get("needsRecommendation") === "on",
      updatedAt: timestamp,
    },
  });

  return true;
}

export async function adoptRecommendation(recipeIdsValue: string): Promise<boolean> {
  const context = await requireSessionContext();
  const { family } = context;

  if (!canEditMenu(context)) {
    return false;
  }

  const selectedIds = normalizeList([recipeIdsValue]);

  if (selectedIds.length === 0) {
    return false;
  }

  let adopted = false;
  await prisma.$transaction(async (tx) => {
    const menu = await getOrCreateDraftMenu(tx, family.id, todayKey());

    if (isMenuLockedStatus(menu.status)) {
      return;
    }

    const recipes = (
      await tx.recipe.findMany({
        where: {
          familyId: family.id,
          id: { in: selectedIds },
        },
        include: {
          tags: true,
          ingredients: true,
        },
      })
    ).map(mapRecipe);

    if (recipes.length === 0) {
      return;
    }

    await replaceMenuItemsFromRecipes(tx, menu.id, recipes);
    await tx.menu.update({
      where: { id: menu.id },
      data: {
        status: "DRAFT",
        updatedAt: nowIso(),
      },
    });

    adopted = true;
  });

  return adopted;
}

export async function addRecipeToCurrentMenu(recipeId: string): Promise<boolean> {
  const context = await requireSessionContext();
  const { family } = context;

  if (!canEditMenu(context) || !recipeId) {
    return false;
  }

  let added = false;
  await prisma.$transaction(async (tx) => {
    const [menu, recipe] = await Promise.all([
      getOrCreateDraftMenu(tx, family.id, todayKey()),
      tx.recipe.findUnique({
        where: { id: recipeId },
        include: {
          tags: true,
          ingredients: true,
        },
      }),
    ]);

    if (isMenuLockedStatus(menu.status)) {
      return;
    }

    if (!recipe || recipe.familyId !== family.id) {
      return;
    }

    const sortOrder = await tx.menuItem.count({ where: { menuId: menu.id } });

    await tx.menuItem.create({
      data: {
        id: randomUUID(),
        menuId: menu.id,
        recipeId: recipe.id,
        dishNameSnapshot: recipe.name,
        servings: recipe.defaultServings,
        chefApproved: false,
        source: "LIBRARY",
        sortOrder,
        tags: {
          create: recipe.tags.map((tag) => ({
            id: randomUUID(),
            tag: tag.tag,
          })),
        },
        ingredients: {
          create: recipe.ingredients.map((ingredient) => ({
            id: randomUUID(),
            ingredientName: ingredient.ingredientName,
            grams: ingredient.grams,
            unit: ingredient.unit,
          })),
        },
      },
    });

    await tx.menu.update({
      where: { id: menu.id },
      data: {
        status: "DRAFT",
        updatedAt: nowIso(),
      },
    });

    added = true;
  });

  return added;
}

export async function addManualDish(formData: FormData): Promise<boolean> {
  const context = await requireSessionContext();
  const { family } = context;

  if (!canEditMenu(context)) {
    return false;
  }

  const dishName = String(formData.get("dishName") ?? "").trim();

  if (!dishName) {
    return false;
  }

  const servings = Math.max(
    1,
    Number.parseInt(String(formData.get("servings") ?? family.defaultServings), 10) ||
      family.defaultServings,
  );
  const tags = normalizeTags([
    ...formData.getAll("dishTags"),
    String(formData.get("dishCustomTags") ?? ""),
  ]);
  const ingredients = parseIngredientLines(String(formData.get("ingredientsText") ?? ""));

  let added = false;
  await prisma.$transaction(async (tx) => {
    const menu = await getOrCreateDraftMenu(tx, family.id, todayKey());

    if (isMenuLockedStatus(menu.status)) {
      return;
    }

    const sortOrder = await tx.menuItem.count({ where: { menuId: menu.id } });

    await tx.menuItem.create({
      data: {
        id: randomUUID(),
        menuId: menu.id,
        dishNameSnapshot: dishName,
        servings,
        chefApproved: false,
        source: "CUSTOM",
        sortOrder,
        tags: {
          create: tags.map((tag) => ({
            id: randomUUID(),
            tag,
          })),
        },
        ingredients: {
          create: ingredients.map((ingredient) => ({
            id: randomUUID(),
            ingredientName: ingredient.name,
            grams: ingredient.grams,
            unit: ingredient.unit,
          })),
        },
      },
    });

    await tx.menu.update({
      where: { id: menu.id },
      data: {
        status: "DRAFT",
        updatedAt: nowIso(),
      },
    });

    added = true;
  });

  return added;
}

export async function removeMenuDish(menuItemId: string): Promise<boolean> {
  const context = await requireSessionContext();

  if (!canEditMenu(context) || !menuItemId) {
    return false;
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      menu: true,
    },
  });

  if (
    !menuItem ||
    menuItem.menu.familyId !== context.family.id ||
    isMenuLockedStatus(menuItem.menu.status)
  ) {
    return false;
  }

  await prisma.menuItem.delete({
    where: { id: menuItemId },
  });

  return true;
}

export async function publishCurrentMenu(): Promise<boolean> {
  const context = await requireSessionContext();
  const { family, member } = context;

  if (!canEditMenu(context)) {
    return false;
  }

  let published = false;
  await prisma.$transaction(async (tx) => {
    const menu = await getOrCreateDraftMenu(tx, family.id, todayKey());

    if (isMenuLockedStatus(menu.status)) {
      return;
    }

    const items = await tx.menuItem.findMany({ where: { menuId: menu.id } });

    if (items.length === 0) {
      return;
    }

    await tx.menu.update({
      where: { id: menu.id },
      data: {
        status: "PUBLISHED",
        publishedBy: member.id,
        publishedAt: nowIso(),
        updatedAt: nowIso(),
      },
    });

    const recipeIds = items.map((item) => item.recipeId).filter(Boolean) as string[];

    if (recipeIds.length > 0) {
      await tx.recipe.updateMany({
        where: { id: { in: recipeIds } },
        data: {
          lastCookedAt: todayKey(),
          updatedAt: nowIso(),
        },
      });
    }

    published = true;
  });

  return published;
}

export async function submitDishFeedback(formData: FormData): Promise<boolean> {
  const { family, member } = await requireSessionContext();

  if (member.status !== "ACTIVE") {
    return false;
  }

  const menuItemId = String(formData.get("menuItemId") ?? "");
  const likeScore = String(formData.get("likeScore") ?? "");
  const saltLevel = String(formData.get("saltLevel") ?? "");
  const portionFit = String(formData.get("portionFit") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();

  if (
    !menuItemId ||
    !FEEDBACK_LIKE_OPTIONS.includes(likeScore as (typeof FEEDBACK_LIKE_OPTIONS)[number]) ||
    !FEEDBACK_SALT_OPTIONS.includes(saltLevel as (typeof FEEDBACK_SALT_OPTIONS)[number]) ||
    !FEEDBACK_PORTION_OPTIONS.includes(portionFit as (typeof FEEDBACK_PORTION_OPTIONS)[number])
  ) {
    return false;
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      menu: true,
    },
  });

  if (!menuItem || menuItem.menu.familyId !== family.id) {
    return false;
  }

  const timestamp = nowIso();

  await prisma.dishFeedback.upsert({
    where: {
      menuItemId_memberId: {
        menuItemId,
        memberId: member.id,
      },
    },
    create: {
      id: randomUUID(),
      menuItemId,
      memberId: member.id,
      likeScore,
      saltLevel,
      portionFit,
      comment: comment || null,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    update: {
      likeScore,
      saltLevel,
      portionFit,
      comment: comment || null,
      updatedAt: timestamp,
    },
  });

  const activeMemberIds = (
    await prisma.member.findMany({
      where: {
        familyId: family.id,
        status: "ACTIVE",
      },
      select: { id: true },
    })
  ).map((activeMember) => activeMember.id);

  await markMenuCompletedIfReady(menuItem.menuId, activeMemberIds);

  return true;
}

export async function toggleMenuItemChefApproval(menuItemId: string): Promise<boolean> {
  const context = await requireSessionContext();

  if (!canEditMenu(context) || !menuItemId) {
    return false;
  }

  const menuItem = await prisma.menuItem.findUnique({
    where: { id: menuItemId },
    include: {
      menu: true,
    },
  });

  if (
    !menuItem ||
    menuItem.menu.familyId !== context.family.id ||
    isMenuLockedStatus(menuItem.menu.status)
  ) {
    return false;
  }

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: {
      chefApproved: !menuItem.chefApproved,
    },
  });

  return true;
}

export async function switchActiveMode(mode: ActiveMode): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  await setSession({
    ...session,
    activeMode: mode,
  });

  return true;
}

export async function getHistoryData(activeTag?: string | null): Promise<HistoryData | null> {
  const context = await getSessionContext();

  if (!context) {
    return null;
  }

  const menus = await prisma.menu.findMany({
    where: { familyId: context.family.id },
    include: {
      items: {
        include: {
          tags: true,
          ingredients: true,
          feedbacks: true,
        },
        orderBy: [{ sortOrder: "asc" }, { dishNameSnapshot: "asc" }],
      },
    },
    orderBy: { dinnerDate: "desc" },
  });

  const filteredMenus = menus
    .map((menu) => {
      const items = menu.items.filter((item) =>
        activeTag ? item.tags.some((tag) => tag.tag === activeTag) : true,
      );

      if (items.length === 0) {
        return null;
      }

      return {
        id: menu.id,
        dinnerDate: menu.dinnerDate,
        status: menu.status,
        items: items.map((item) => ({
          id: item.id,
          name: item.dishNameSnapshot,
          tags: item.tags.map((tag) => tag.tag),
          ingredients: item.ingredients.map((ingredient) => ({
            name: ingredient.ingredientName,
            grams: ingredient.grams,
            unit: ingredient.unit,
          })),
          feedbackSummary: {
            likeLabels: item.feedbacks.map((feedback) => feedback.likeScore),
            saltLabels: item.feedbacks.map((feedback) => feedback.saltLevel),
            portionLabels: item.feedbacks.map((feedback) => feedback.portionFit),
          },
        })),
      };
    })
    .filter(Boolean) as HistoryData["menus"];

  return {
    family: {
      name: context.family.name,
      code: context.family.code,
    },
    currentMember: {
      id: context.member.id,
      nickname: context.member.nickname,
      role: context.member.role as ActiveMode,
      isOwner: context.member.isOwner,
      status: context.member.status,
      displayRole: getDisplayRole(context.member),
    },
    allTags: [
      ...new Set(
        menus.flatMap((menu) =>
          menu.items.flatMap((item) => item.tags.map((tag) => tag.tag)),
        ),
      ),
    ],
    activeTag: activeTag ?? null,
    menus: filteredMenus,
  };
}

export async function getSettingsData(): Promise<SettingsData | null> {
  const context = await getSessionContext();

  if (!context) {
    return null;
  }

  const familyMembers = await prisma.member.findMany({
    where: { familyId: context.family.id },
    orderBy: { createdAt: "desc" },
  });

  return {
    family: {
      name: context.family.name,
      code: context.family.code,
      joinPolicy: context.family.joinPolicy,
    },
    currentMember: {
      id: context.member.id,
      nickname: context.member.nickname,
      role: context.member.role as ActiveMode,
      isOwner: context.member.isOwner,
      status: context.member.status,
      displayRole: getDisplayRole(context.member),
    },
    members: familyMembers.map((familyMember) => ({
      id: familyMember.id,
      nickname: familyMember.nickname,
      role: familyMember.role,
      isOwner: familyMember.isOwner,
      status: familyMember.status,
    })),
    pendingMembers: familyMembers
      .filter((familyMember) => familyMember.status === "PENDING")
      .map((familyMember) => ({
        id: familyMember.id,
        nickname: familyMember.nickname,
        role: familyMember.role,
        createdAt: familyMember.createdAt,
      })),
  };
}

export async function approvePendingMember(memberId: string): Promise<boolean> {
  const context = await requireSessionContext();
  const { family } = context;
  const canApproveFromSettings =
    context.member.status === "ACTIVE" &&
    (context.member.isOwner || context.member.role === "CHEF");

  if ((!canApproveMembers(context) && !canApproveFromSettings) || !memberId) {
    return false;
  }

  await prisma.member.updateMany({
    where: {
      id: memberId,
      familyId: family.id,
    },
    data: {
      status: "ACTIVE",
    },
  });

  return true;
}

export async function leaveCurrentFamilySession() {
  await clearSession();
}

export function getPresetTags() {
  return PRESET_TAGS;
}
