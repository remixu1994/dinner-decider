import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addManualDishAction,
  addRecipeToMenuAction,
  adoptRecommendationAction,
  approveMemberAction,
  publishMenuAction,
  removeMenuDishAction,
  savePresetMenuAction,
  switchFamilyAction,
  toggleMenuItemChefApprovalAction,
} from "@/app/actions";
import { ActionStatusForm, InlineActionButtonForm } from "@/components/action-forms";
import { HomeViewSwitcher } from "@/components/home-view-switcher";
import { SectionCard, StatusBadge, TagChip } from "@/components/ui";
import { MEMBER_ROLE_LABELS, MENU_STATUS_LABELS, PRESET_TAGS } from "@/lib/constants";
import { formatDinnerDate, getChefWorkspaceData, getSessionLandingPath, todayKey } from "@/lib/data";

export const dynamic = "force-dynamic";

function SelectableTag({
  name,
  value,
  label,
}: {
  name: string;
  value: string;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input type="checkbox" name={name} value={value} className="peer sr-only" />
      <span className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-700 transition peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white">
        {label}
      </span>
    </label>
  );
}

function ChefStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
        {label}
      </p>
      <p className="mt-2 text-base font-semibold text-stone-950">{value}</p>
    </div>
  );
}

export default async function ChefPage() {
  const workspace = await getChefWorkspaceData();

  if (!workspace) {
    redirect((await getSessionLandingPath()) ?? "/");
  }

  if (!workspace.currentMember.canManageMenu) {
    redirect("/family");
  }

  const menuLocked =
    workspace.currentMenu?.status === "PUBLISHED" ||
    workspace.currentMenu?.status === "COMPLETED";
  const isPresetMenu = workspace.currentMenu?.status === "PRESET";
  const confirmedCount =
    workspace.currentMenu?.items.filter((item) => item.chefApproved).length ?? 0;
  const menuSummary = !workspace.currentMenu?.items.length
    ? "还没定菜"
    : menuLocked
      ? "已发布"
      : isPresetMenu
        ? "预设已保存"
        : "草稿编辑中";

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="paper-panel hero-glow rounded-[34px] border p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={MENU_STATUS_LABELS[workspace.workflowStatus]} />
              <TagChip label={`家庭码 ${workspace.family.code}`} tone="soft" />
              <TagChip
                label={MEMBER_ROLE_LABELS[workspace.currentMember.displayRole]}
                tone="accent"
              />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <div>
                  <p className="text-sm text-stone-500">{formatDinnerDate(todayKey())}</p>
                  <h1 className="mt-1 text-3xl font-semibold text-stone-950 sm:text-4xl">
                    今晚决策工作台
                  </h1>
                </div>
                <p className="text-sm leading-6 text-stone-600 sm:text-base">
                  这里专门给厨师做今晚决策。先看家人今天想吃什么，再从推荐、常做菜和临时加菜里快速整理出预设菜单，最后再正式发布。
                </p>
                <HomeViewSwitcher activeView={workspace.currentMember.activeView} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/history"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
                >
                  历史菜单
                </Link>
                <Link
                  href="/settings"
                  className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
                >
                  家庭设置
                </Link>
                <form action={switchFamilyAction}>
                  <button className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700">
                    切换家庭
                  </button>
                </form>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <ChefStat label="已收集诉求" value={`${workspace.todayRequestSummary.length} 人`} />
              <ChefStat label="今晚菜单" value={`${workspace.currentMenu?.items.length ?? 0} 道菜`} />
              <ChefStat label="已确认菜品" value={`${confirmedCount} 道`} />
              <ChefStat label="当前状态" value={menuSummary} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-5">
            <SectionCard
              title="家庭今日诉求"
              description="干饭人可以说想吃什么，但今晚真正做什么由你来拍板。"
              emphasis={workspace.workflowStatus === "PLANNING" || workspace.workflowStatus === "PRESET"}
            >
              {workspace.todayRequestSummary.length === 0 ? (
                <p className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  还没人提交今天的想法，可以先从推荐方案或常做菜开始。
                </p>
              ) : (
                <div className="grid gap-3">
                  {workspace.todayRequestSummary.map((request) => (
                    <article
                      key={request.id}
                      className="rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-950">
                          {request.nickname}
                        </h3>
                        {request.isFlexible ? <TagChip label="都可以" tone="accent" /> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.desiredDishes
                          .filter((dish) => dish !== "都可以")
                          .map((dish) => (
                            <TagChip key={`${request.id}-${dish}`} label={dish} />
                          ))}
                        {request.tagPreferences.map((tag) => (
                          <TagChip key={`${request.id}-${tag}`} label={tag} tone="soft" />
                        ))}
                      </div>
                      {request.note ? (
                        <p className="mt-3 text-sm leading-6 text-stone-600">{request.note}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="今晚菜单"
              description={
                isPresetMenu
                  ? "这版菜单已经保存成预设，干饭人现在会看到它作为参考。你仍然可以继续调整，调整后再重新保存预设。"
                  : menuLocked
                    ? "今晚正式菜单已经发布。"
                    : "把真正要做的菜放在这里，整理好后先保存成预设菜单，再决定什么时候正式发布。"
              }
              emphasis={workspace.workflowStatus === "PRESET" || workspace.workflowStatus === "PUBLISHED"}
            >
              {!workspace.currentMenu?.items.length ? (
                <p className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  还没有今晚菜单。可以先采用推荐方案，或者从常做菜里加一道。
                </p>
              ) : (
                <div className="space-y-4">
                  {workspace.currentMenu.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[30px] border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-stone-950">{item.name}</h3>
                            <TagChip
                              label={item.chefApproved ? "已确认" : "待确认"}
                              tone={item.chefApproved ? "accent" : "soft"}
                            />
                          </div>
                          <p className="mt-2 text-sm text-stone-500">
                            {item.servings} 人份 ·
                            {item.source === "CUSTOM" ? " 临时新增" : " 菜谱库"}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <TagChip key={`${item.id}-${tag}`} label={tag} />
                            ))}
                          </div>
                        </div>

                        {!menuLocked ? (
                          <div className="flex flex-wrap gap-2">
                            <InlineActionButtonForm
                              action={toggleMenuItemChefApprovalAction}
                              label={item.chefApproved ? "取消确认" : "确认这道菜"}
                              pendingLabel="处理中..."
                              showMessage={false}
                              buttonClassName={`rounded-full px-4 py-2 text-xs font-semibold ${
                                item.chefApproved
                                  ? "border border-orange-400 bg-orange-500 text-white"
                                  : "border border-orange-300 bg-orange-50 text-orange-900"
                              }`}
                            >
                              <input type="hidden" name="menuItemId" value={item.id} />
                            </InlineActionButtonForm>
                            <InlineActionButtonForm
                              action={removeMenuDishAction}
                              label="移除"
                              pendingLabel="移除中..."
                              showMessage={false}
                              buttonClassName="rounded-full border border-stone-300 px-4 py-2 text-xs text-stone-700"
                            >
                              <input type="hidden" name="menuItemId" value={item.id} />
                            </InlineActionButtonForm>
                          </div>
                        ) : null}
                      </div>

                      {item.ingredients.length > 0 ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.ingredients.map((ingredient) => (
                            <TagChip
                              key={`${item.id}-${ingredient.name}`}
                              label={`${ingredient.name} ${ingredient.grams}${ingredient.unit}`}
                              tone="soft"
                            />
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}

              {workspace.currentMenu?.items.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InlineActionButtonForm
                    action={savePresetMenuAction}
                    label={isPresetMenu ? "重新保存预设菜单" : "保存为预设菜单"}
                    pendingLabel="保存中..."
                    disabled={menuLocked}
                    buttonClassName="primary-button w-full rounded-2xl px-5 py-3 text-sm font-semibold disabled:opacity-50"
                  />
                  <InlineActionButtonForm
                    action={publishMenuAction}
                    label={menuLocked ? "今晚菜单已发布" : "确认发布今晚菜单"}
                    pendingLabel="发布中..."
                    disabled={menuLocked}
                    buttonClassName="w-full rounded-2xl border border-orange-300 bg-orange-100 px-5 py-3 text-sm font-semibold text-orange-900 disabled:opacity-50"
                  />
                </div>
              ) : null}
            </SectionCard>
          </div>

          <div className="space-y-5">
            <SectionCard
              title="推荐方案"
              description="系统会根据今天诉求、近期重复率和标签偏好，给你准备整套菜单建议。"
            >
              <div className="space-y-3">
                {workspace.recommendations.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className="rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-900">
                          {recommendation.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-stone-600">
                          {recommendation.reason}
                        </p>
                      </div>
                      <TagChip label={`${recommendation.recipes.length} 道菜`} tone="accent" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recommendation.recipes.map((recipe) => (
                        <TagChip key={`${recommendation.id}-${recipe.id}`} label={recipe.name} />
                      ))}
                    </div>
                    <InlineActionButtonForm
                      action={adoptRecommendationAction}
                      className="mt-4"
                      label="整套采用"
                      pendingLabel="采用中..."
                      disabled={menuLocked}
                      buttonClassName="rounded-2xl border border-orange-300 bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-900 disabled:opacity-50"
                    >
                      <input
                        type="hidden"
                        name="recipeIds"
                        value={recommendation.recipes.map((recipe) => recipe.id).join(",")}
                      />
                    </InlineActionButtonForm>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="家庭常做菜"
              description="不用重新输入，点一下就能加进今晚菜单。"
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {workspace.quickRecipes.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                  >
                    <h3 className="font-semibold text-stone-900">{recipe.name}</h3>
                    <p className="mt-1 text-xs text-stone-500">{recipe.defaultServings} 人份</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {recipe.tags.map((tag) => (
                        <TagChip key={`${recipe.id}-${tag}`} label={tag} tone="soft" />
                      ))}
                    </div>
                    <InlineActionButtonForm
                      action={addRecipeToMenuAction}
                      className="mt-4"
                      label="加入今晚菜单"
                      pendingLabel="加入中..."
                      disabled={menuLocked}
                      buttonClassName="rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-700 disabled:opacity-50"
                    >
                      <input type="hidden" name="recipeId" value={recipe.id} />
                    </InlineActionButtonForm>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="临时新增一道菜"
              description="菜谱库里没有的，直接补一道就够了。"
            >
              <ActionStatusForm
                action={addManualDishAction}
                className="grid gap-4"
                submitLabel="加入今晚菜单"
                pendingLabel="保存中..."
                submitDisabled={menuLocked}
                submitClassName="primary-button rounded-2xl px-5 py-3 text-sm font-semibold"
              >
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  菜名
                  <input
                    required
                    name="dishName"
                    placeholder="比如：青椒肉丝"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  几人份
                  <input
                    type="number"
                    min={1}
                    max={10}
                    name="servings"
                    defaultValue={workspace.family.defaultServings}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                  />
                </label>

                <div className="grid gap-2">
                  <p className="text-sm font-medium text-stone-700">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_TAGS.map((tag) => (
                      <SelectableTag key={tag} name="dishTags" value={tag} label={tag} />
                    ))}
                  </div>
                </div>

                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  食材克数
                  <textarea
                    rows={4}
                    name="ingredientsText"
                    placeholder={"一行一个，比如：\n鸡胸肉 300g\n西兰花 200g"}
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>
              </ActionStatusForm>
            </SectionCard>

            <SectionCard
              title="待审核成员"
              description="需要时你可以直接在这里处理加入申请。"
            >
              {workspace.pendingMembers.length === 0 ? (
                <p className="text-sm text-stone-500">当前没有待审核成员。</p>
              ) : (
                <div className="space-y-3">
                  {workspace.pendingMembers.map((member) => (
                    <article
                      key={member.id}
                      className="rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-stone-900">{member.nickname}</h3>
                          <p className="mt-1 text-sm text-stone-500">
                            申请角色：{MEMBER_ROLE_LABELS[member.role as "CHEF" | "DINER"]}
                          </p>
                        </div>
                        <TagChip label="待审核" tone="accent" />
                      </div>
                      <InlineActionButtonForm
                        action={approveMemberAction}
                        className="mt-4"
                        label="通过加入"
                        pendingLabel="处理中..."
                        buttonClassName="primary-button rounded-2xl px-4 py-3 text-sm font-semibold"
                      >
                        <input type="hidden" name="memberId" value={member.id} />
                      </InlineActionButtonForm>
                    </article>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
