import { randomUUID } from "node:crypto";

import type { Family, Member, Prisma, User } from "@prisma/client";

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
  clearCurrentFamilySession,
  clearSession,
  getSession,
  type SessionData,
} from "@/lib/session";

type MemberRole = "CHEF" | "DINER";
type HomeView = "CHEF" | "FAMILY";
type HomePath = "/chef" | "/family";
type WorkflowStatus =
  | "COLLECTING"
  | "PLANNING"
  | "PRESET"
  | "PUBLISHED"
  | "FEEDBACK"
  | "COMPLETED";

type UserSessionContext = {
  user: User;
  session: SessionData;
};

type SessionContext = UserSessionContext & {
  family: Family;
  member: Member;
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

export type CurrentMemberView = {
  id: string;
  nickname: string;
  role: MemberRole;
  isOwner: boolean;
  status: string;
  displayRole: "OWNER" | "CHEF" | "DINER" | "PENDING_MEMBER";
  canManageMenu: boolean;
  canApproveMembers: boolean;
  homePath: HomePath;
  activeView: HomeView;
  preferredHomeView: HomeView;
  availableViews: HomeView[];
};

export type RequestSummary = {
  id: string;
  memberId: string;
  nickname: string;
  desiredDishes: string[];
  dislikes: string[];
  flavorPreference: string;
  portionPreference: string;
  tagPreferences: string[];
  needsRecommendation: boolean;
  note: string | null;
  isFlexible: boolean;
};

type RecommendationView = {
  id: string;
  title: string;
  reason: string;
  recipes: RecipeView[];
};

type RecentMenuView = {
  id: string;
  dinnerDate: string;
  items: { name: string; tags: string[] }[];
};

type FamilySnapshot = {
  family: {
    id: string;
    name: string;
    code: string;
    joinPolicy: string;
    defaultServings: number;
  };
  currentMember: CurrentMemberView;
  workflowStatus: WorkflowStatus;
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
  todayRequestSummary: RequestSummary[];
  myRequest: RequestSummary | null;
  currentMenu: MenuView | null;
  quickRecipes: RecipeView[];
  recommendations: RecommendationView[];
  recentMenus: RecentMenuView[];
};

export type DinerHomeData = FamilySnapshot & {
  quickStart: {
    suggestedDishes: string[];
    recentChoices: string[];
    recommendedDishes: string[];
    tagChoices: string[];
  };
};

export type ChefWorkspaceData = FamilySnapshot;

export type HistoryData = {
  family: { name: string; code: string };
  currentMember: CurrentMemberView;
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
  user: { code: string };
  family: { name: string; code: string; joinPolicy: string };
  currentMember: CurrentMemberView;
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

export type FamiliesHubData = {
  user: { code: string };
  currentFamilyId: string | null;
  families: {
    memberId: string;
    familyId: string;
    familyName: string;
    familyCode: string;
    joinPolicy: string;
    nickname: string;
    role: string;
    isOwner: boolean;
    status: string;
    homePath: "/family" | "/chef";
  }[];
};

type SessionLaunch = {
  session: SessionData;
  landingPath: "/families" | "/family" | "/chef";
};

function nowIso() {
  return new Date().toISOString();
}

const USER_CODE_PATTERN = /^[A-Z0-9]{6,12}$/;

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

function normalizeUserCode(value: string) {
  return value.trim().toUpperCase();
}

function parseUserCodeInput(formData: FormData) {
  return normalizeUserCode(String(formData.get("userCode") ?? ""));
}

function ensureValidUserCode(userCode: string) {
  if (!USER_CODE_PATTERN.test(userCode)) {
    throw new Error("USER_CODE_INVALID");
  }
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

function canManageMenuForMember(member: Pick<Member, "status" | "role" | "isOwner">) {
  return member.status === "ACTIVE" && (member.isOwner || member.role === "CHEF");
}

function getPreferredHomeView(member: Pick<Member, "status" | "role" | "isOwner" | "preferredHomeView">): HomeView {
  if (!canManageMenuForMember(member)) {
    return "FAMILY";
  }

  return member.preferredHomeView === "FAMILY" ? "FAMILY" : "CHEF";
}

function getHomePathForMember(
  member: Pick<Member, "status" | "role" | "isOwner" | "preferredHomeView">,
): HomePath {
  return getPreferredHomeView(member) === "FAMILY" ? "/family" : "/chef";
}

function canEditRequests(context: SessionContext) {
  return context.member.status === "ACTIVE";
}

function canEditMenu(context: SessionContext) {
  return canManageMenuForMember(context.member);
}

function canApproveMembers(context: SessionContext) {
  return canManageMenuForMember(context.member);
}

function mapCurrentMember(member: Member, activeView: HomeView): CurrentMemberView {
  const canManageMenu = canManageMenuForMember(member);
  const preferredHomeView = getPreferredHomeView(member);

  return {
    id: member.id,
    nickname: member.nickname,
    role: member.role === "CHEF" ? "CHEF" : "DINER",
    isOwner: member.isOwner,
    status: member.status,
    displayRole: getDisplayRole(member),
    canManageMenu,
    canApproveMembers: canManageMenu,
    homePath: getHomePathForMember(member),
    activeView,
    preferredHomeView,
    availableViews: canManageMenu ? ["CHEF", "FAMILY"] : ["FAMILY"],
  };
}

async function getSessionContext(): Promise<SessionContext | null> {
  const userContext = await getUserSessionContext();

  if (!userContext?.session.familyId || !userContext.session.memberId) {
    return null;
  }

  const [family, member] = await Promise.all([
    prisma.family.findUnique({ where: { id: userContext.session.familyId } }),
    prisma.member.findUnique({ where: { id: userContext.session.memberId } }),
  ]);

  if (
    !family ||
    !member ||
    member.familyId !== family.id ||
    member.userId !== userContext.user.id
  ) {
    await clearCurrentFamilySession();
    return null;
  }

  return {
    user: userContext.user,
    session: userContext.session,
    family,
    member,
  };
}

async function requireSessionContext() {
  const context = await getSessionContext();

  if (!context) {
    throw new Error("SESSION_REQUIRED");
  }

  return context;
}

async function getUserSessionContext(): Promise<UserSessionContext | null> {
  const session = await getSession();

  if (!session?.userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    await clearSession();
    return null;
  }

  return {
    user,
    session,
  };
}

async function requireUserSessionContext() {
  const context = await getUserSessionContext();

  if (!context) {
    throw new Error("USER_SESSION_REQUIRED");
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

async function resolveUserIdentityForCreateOrJoin(formData: FormData) {
  const providedUserCode = parseUserCodeInput(formData);

  if (providedUserCode) {
    ensureValidUserCode(providedUserCode);
    const existingUser = await prisma.user.findUnique({
      where: { code: providedUserCode },
    });

    if (existingUser) {
      return {
        userId: existingUser.id,
        userCode: existingUser.code,
        shouldCreateUser: false,
      };
    }

    return {
      userId: randomUUID(),
      userCode: providedUserCode,
      shouldCreateUser: true,
    };
  }

  const userContext = await requireUserSessionContext();

  return {
    userId: userContext.user.id,
    userCode: userContext.user.code,
    shouldCreateUser: false,
  };
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
    items: menu.items.map((rawItem) => {
      const item = rawItem as typeof rawItem & {
        recipeId: string | null;
        dishNameSnapshot: string;
        source: string;
        servings: number;
        chefApproved: boolean;
        notes: string | null;
      };

      return {
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
      };
    }),
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
): WorkflowStatus {
  if (!menu || menu.items.length === 0) {
    return requestCount > 0 ? "PLANNING" : "COLLECTING";
  }

  if (menu.status === "PRESET") {
    return "PRESET";
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
  requestRows: RequestSummary[],
  recentMenus: RecentMenuView[],
) {
  const desired = requestRows
    .flatMap((request) => request.desiredDishes)
    .filter((dish) => dish !== "都可以");
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
        ? `优先照顾今天提到的“${desiredText}”，同时尽量避开最近重复率太高的搭配。`
        : tagText.length > 0
          ? `按今天偏好的 ${tagText} 方向组合，方便厨师直接开做。`
          : "结合历史高频菜和省心搭配，尽量让今晚少纠结。";

    return {
      id: `recommendation-${index + 1}`,
      title: ["省心开做", "照顾偏好", "换个口味"][index] ?? `推荐方案 ${index + 1}`,
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

export async function createFamilyActionData(formData: FormData): Promise<SessionLaunch> {
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

  const userIdentity = await resolveUserIdentityForCreateOrJoin(formData);
  const familyId = randomUUID();
  const memberId = randomUUID();
  const code = await createFamilyCode();
  const timestamp = nowIso();

  await prisma.$transaction(async (tx) => {
    if (userIdentity.shouldCreateUser) {
      await tx.user.create({
        data: {
          id: userIdentity.userId,
          code: userIdentity.userCode,
          createdAt: timestamp,
        },
      });
    }

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
        userId: userIdentity.userId,
        familyId,
        nickname,
        role: "CHEF",
        isOwner: true,
        preferredHomeView: "CHEF",
        status: "ACTIVE",
        createdAt: timestamp,
      },
    });

    await seedDefaultRecipes(tx, familyId);
  });

  return {
    session: { userId: userIdentity.userId, familyId, memberId },
    landingPath: "/chef",
  };
}

export async function joinFamilyActionData(formData: FormData): Promise<SessionLaunch> {
  const familyCode = String(formData.get("familyCode") ?? "").trim().toUpperCase();
  const nickname = String(formData.get("nickname") ?? "").trim();
  const role = String(formData.get("role") ?? "DINER") === "CHEF" ? "CHEF" : "DINER";

  if (!familyCode || !nickname) {
    throw new Error("JOIN_FAMILY_INVALID");
  }

  const userIdentity = await resolveUserIdentityForCreateOrJoin(formData);
  const family = await prisma.family.findUnique({ where: { code: familyCode } });

  if (!family) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const existing = await prisma.member.findFirst({
    where: {
      familyId: family.id,
      userId: userIdentity.userId,
    },
  });

  if (existing) {
    return {
      session: {
        userId: userIdentity.userId,
        familyId: family.id,
        memberId: existing.id,
      },
      landingPath: getHomePathForMember(existing),
    };
  }

  const created = await prisma.$transaction(async (tx) => {
    if (userIdentity.shouldCreateUser) {
      await tx.user.create({
        data: {
          id: userIdentity.userId,
          code: userIdentity.userCode,
          createdAt: nowIso(),
        },
      });
    }

    return tx.member.create({
      data: {
        id: randomUUID(),
        userId: userIdentity.userId,
        familyId: family.id,
        nickname,
        role,
        isOwner: false,
        preferredHomeView: role === "CHEF" ? "CHEF" : "FAMILY",
        status: family.joinPolicy === "APPROVAL" ? "PENDING" : "ACTIVE",
        createdAt: nowIso(),
      },
    });
  });

  return {
    session: {
      userId: userIdentity.userId,
      familyId: family.id,
      memberId: created.id,
    },
    landingPath: getHomePathForMember(created),
  };
}

async function loadFamilySnapshot(activeView: HomeView): Promise<FamilySnapshot | null> {
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
    const desiredDishes = parseStoredArray(request.desiredDishes);

    return {
      id: request.id,
      memberId: request.memberId,
      nickname: author?.nickname ?? "家庭成员",
      desiredDishes,
      dislikes: parseStoredArray(request.dislikes),
      flavorPreference: request.flavorPreference,
      portionPreference: request.portionPreference,
      tagPreferences: parseStoredArray(request.tagPreferences),
      needsRecommendation: request.needsRecommendation,
      note: request.note,
      isFlexible: desiredDishes.includes("都可以"),
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
    currentMember: mapCurrentMember(context.member, activeView),
    workflowStatus: deriveWorkflowStatus(
      todayMenu,
      requestSummary.length,
      activeMembers.map((member) => member.id),
    ),
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

export async function getDinerHomeData(): Promise<DinerHomeData | null> {
  const snapshot = await loadFamilySnapshot("FAMILY");

  if (!snapshot) {
    return null;
  }

  const recommendedDishes = snapshot.recommendations
    .flatMap((recommendation) => recommendation.recipes.map((recipe) => recipe.name))
    .filter((dish, index, array) => array.indexOf(dish) === index)
    .slice(0, 6);
  const recentChoices = snapshot.recentMenus
    .flatMap((menu) => menu.items.map((item) => item.name))
    .filter((dish, index, array) => dish !== "都可以" && array.indexOf(dish) === index)
    .slice(0, 6);
  const suggestedDishes = snapshot.quickRecipes
    .map((recipe) => recipe.name)
    .filter((dish, index, array) => array.indexOf(dish) === index)
    .slice(0, 6);

  return {
    ...snapshot,
    quickStart: {
      suggestedDishes,
      recentChoices,
      recommendedDishes,
      tagChoices: [...PRESET_TAGS],
    },
  };
}

export async function getChefWorkspaceData(): Promise<ChefWorkspaceData | null> {
  return loadFamilySnapshot("CHEF");
}

export async function getSessionLandingPath() {
  const userContext = await getUserSessionContext();

  if (!userContext) {
    return null;
  }

  const context = await getSessionContext();

  if (!context) {
    return "/families" as const;
  }

  return getHomePathForMember(context.member);
}

export async function signInWithUserCodeActionData(formData: FormData): Promise<SessionLaunch> {
  const userCode = parseUserCodeInput(formData);
  ensureValidUserCode(userCode);

  const user = await prisma.user.findUnique({
    where: { code: userCode },
  });

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return {
    session: { userId: user.id },
    landingPath: "/families",
  };
}

export async function selectFamilyActionData(formData: FormData): Promise<SessionLaunch> {
  const memberId = String(formData.get("memberId") ?? "");
  const userContext = await requireUserSessionContext();

  if (!memberId) {
    throw new Error("FAMILY_SELECTION_INVALID");
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member || member.userId !== userContext.user.id) {
    throw new Error("FAMILY_SELECTION_INVALID");
  }

  return {
    session: {
      userId: userContext.user.id,
      familyId: member.familyId,
      memberId: member.id,
    },
    landingPath: getHomePathForMember(member),
  };
}

export async function switchMemberHomeView(targetView: HomeView): Promise<HomePath | null> {
  const context = await getSessionContext();

  if (!context || !canEditMenu(context)) {
    return null;
  }

  const preferredHomeView = targetView === "FAMILY" ? "FAMILY" : "CHEF";

  await prisma.member.update({
    where: { id: context.member.id },
    data: {
      preferredHomeView,
    },
  });

  return preferredHomeView === "FAMILY" ? "/family" : "/chef";
}

export async function getFamiliesHubData(): Promise<FamiliesHubData | null> {
  const userContext = await getUserSessionContext();

  if (!userContext) {
    return null;
  }

  const memberships = await prisma.member.findMany({
    where: { userId: userContext.user.id },
    include: {
      family: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    user: {
      code: userContext.user.code,
    },
    currentFamilyId: userContext.session.familyId ?? null,
    families: memberships.map((membership) => ({
      memberId: membership.id,
      familyId: membership.familyId,
      familyName: membership.family.name,
      familyCode: membership.family.code,
      joinPolicy: membership.family.joinPolicy,
      nickname: membership.nickname,
      role: membership.role,
      isOwner: membership.isOwner,
      status: membership.status,
      homePath: getHomePathForMember(membership),
    })),
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

  const isFlexible = formData.get("isFlexible") === "on";
  const desiredDishes = normalizeList([
    ...formData.getAll("desiredDishes"),
    String(formData.get("customDesiredDish") ?? ""),
  ]).filter((dish) => dish !== "都可以");
  const finalDesiredDishes = isFlexible ? ["都可以", ...desiredDishes] : desiredDishes;
  const dislikes = normalizeList([String(formData.get("dislikes") ?? "")]);
  const tagPreferences = normalizeTags([
    ...formData.getAll("tagPreferences"),
    String(formData.get("customTagPreferences") ?? ""),
  ]);
  const note = String(formData.get("note") ?? "").trim() || null;
  const needsRecommendation =
    formData.get("needsRecommendation") === null || formData.get("needsRecommendation") === "on";

  if (
    finalDesiredDishes.length === 0 &&
    dislikes.length === 0 &&
    tagPreferences.length === 0 &&
    !note &&
    !needsRecommendation
  ) {
    return false;
  }

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
      desiredDishes: JSON.stringify(finalDesiredDishes),
      dislikes: JSON.stringify(dislikes),
      note,
      flavorPreference: String(formData.get("flavorPreference") ?? "正常就好"),
      portionPreference: String(formData.get("portionPreference") ?? "刚刚好"),
      tagPreferences: JSON.stringify(tagPreferences),
      needsRecommendation,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    update: {
      desiredDishes: JSON.stringify(finalDesiredDishes),
      dislikes: JSON.stringify(dislikes),
      note,
      flavorPreference: String(formData.get("flavorPreference") ?? "正常就好"),
      portionPreference: String(formData.get("portionPreference") ?? "刚刚好"),
      tagPreferences: JSON.stringify(tagPreferences),
      needsRecommendation,
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

  await prisma.menu.update({
    where: { id: menuItem.menuId },
    data: {
      status: "DRAFT",
      updatedAt: nowIso(),
    },
  });

  return true;
}

export async function savePresetMenu(): Promise<boolean> {
  const context = await requireSessionContext();
  const { family } = context;

  if (!canEditMenu(context)) {
    return false;
  }

  let saved = false;
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
        status: "PRESET",
        updatedAt: nowIso(),
      },
    });

    saved = true;
  });

  return saved;
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

  await prisma.menu.update({
    where: { id: menuItem.menuId },
    data: {
      status: "DRAFT",
      updatedAt: nowIso(),
    },
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
    currentMember: mapCurrentMember(context.member, getPreferredHomeView(context.member)),
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
    user: {
      code: context.user.code,
    },
    family: {
      name: context.family.name,
      code: context.family.code,
      joinPolicy: context.family.joinPolicy,
    },
    currentMember: mapCurrentMember(context.member, getPreferredHomeView(context.member)),
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

  if (!canApproveMembers(context) || !memberId) {
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
  await clearCurrentFamilySession();
}

export async function leaveUserSession() {
  await clearSession();
}

export function getPresetTags() {
  return PRESET_TAGS;
}
