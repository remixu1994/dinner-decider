import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addManualDishAction,
  addRecipeToMenuAction,
  adoptRecommendationAction,
  publishMenuAction,
  removeMenuDishAction,
  submitDinnerRequestAction,
  submitFeedbackAction,
  switchFamilyAction,
} from "@/app/actions";
import { SectionCard, StatusBadge, TagChip } from "@/components/ui";
import {
  FEEDBACK_LIKE_OPTIONS,
  FEEDBACK_PORTION_OPTIONS,
  FEEDBACK_SALT_OPTIONS,
  FLAVOR_OPTIONS,
  MEMBER_ROLE_LABELS,
  MENU_STATUS_LABELS,
  PORTION_OPTIONS,
} from "@/lib/constants";
import { formatDinnerDate, getDashboardData, getPresetTags } from "@/lib/data";

export const dynamic = "force-dynamic";

function TagSelector({
  name,
  tags,
  selectedTags = [],
}: {
  name: string;
  tags: string[];
  selectedTags?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <label
          key={tag}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
        >
          <input
            type="checkbox"
            name={name}
            value={tag}
            defaultChecked={selectedTags.includes(tag)}
            className="size-4 accent-orange-500"
          />
          {tag}
        </label>
      ))}
    </div>
  );
}

function ChoiceGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly string[];
  defaultValue: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <label
          key={option}
          className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-700"
        >
          <input
            type="radio"
            name={name}
            value={option}
            defaultChecked={option === defaultValue}
            className="accent-orange-500"
          />
          {option}
        </label>
      ))}
    </div>
  );
}

export default async function FamilyPage() {
  const dashboard = await getDashboardData();

  if (!dashboard) {
    redirect("/");
  }

  const presetTags = getPresetTags();
  const isPending = dashboard.currentMember.status === "PENDING";
  const isPublishedOrCompleted =
    dashboard.currentMenu?.status === "PUBLISHED" ||
    dashboard.currentMenu?.status === "COMPLETED";
  const requestLocked = isPending || isPublishedOrCompleted;

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-[32px] border border-stone-200 bg-[var(--surface)] p-5 shadow-sm md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={MENU_STATUS_LABELS[dashboard.workflowStatus]} />
                <TagChip label={`家庭码 ${dashboard.family.code}`} tone="soft" />
                <TagChip
                  label={MEMBER_ROLE_LABELS[dashboard.currentMember.displayRole]}
                  tone="accent"
                />
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-stone-950">
                {dashboard.family.name}
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                今天是 {formatDinnerDate(new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Shanghai",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date()))}
                ，核心操作都在这一页完成。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/history"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
              >
                看历史菜单
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
        </header>

        {isPending ? (
          <SectionCard
            title="等待审核"
            description="你已经加入这个家庭，当前处于待审核状态。等厨师或家庭创建者通过后，就能开始提今晚想法和餐后反馈。"
            emphasis
          >
            <div className="flex flex-wrap gap-2">
              <TagChip label="当前不可提交需求" tone="accent" />
              <TagChip label={`待审核成员 ${dashboard.pendingCount} 人`} tone="soft" />
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <SectionCard
              title="今晚想吃什么"
              description="干饭人只需要说想吃什么、忌口和标签偏好。厨师会在下方统一决定今晚菜单。"
              emphasis={dashboard.workflowStatus === "COLLECTING"}
            >
              <form action={submitDinnerRequestAction} className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  想吃的菜
                  <input
                    name="desiredDishes"
                    defaultValue={dashboard.myRequest?.desiredDishes.join("、") ?? ""}
                    placeholder="比如：番茄炒蛋、牛肉、汤"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  不想吃 / 忌口
                  <input
                    name="dislikes"
                    defaultValue={dashboard.myRequest?.dislikes.join("、") ?? ""}
                    placeholder="比如：太辣、香菜、肥肉"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>
                <div className="grid gap-4">
                  <div>
                    <p className="mb-2 text-sm font-medium text-stone-700">口味倾向</p>
                    <ChoiceGroup
                      name="flavorPreference"
                      options={FLAVOR_OPTIONS}
                      defaultValue={dashboard.myRequest?.flavorPreference ?? FLAVOR_OPTIONS[1]}
                    />
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-stone-700">分量倾向</p>
                    <ChoiceGroup
                      name="portionPreference"
                      options={PORTION_OPTIONS}
                      defaultValue={dashboard.myRequest?.portionPreference ?? PORTION_OPTIONS[1]}
                    />
                  </div>
                </div>
                <div className="grid gap-3">
                  <p className="text-sm font-medium text-stone-700">偏好的菜品标签</p>
                  <TagSelector
                    name="tagPreferences"
                    tags={presetTags}
                    selectedTags={dashboard.myRequest?.tagPreferences ?? []}
                  />
                  <input
                    name="customTagPreferences"
                    placeholder="也可以补充自定义标签，比如：高纤维"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400"
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="needsRecommendation"
                    defaultChecked={dashboard.myRequest?.needsRecommendation ?? true}
                    className="size-4 accent-orange-500"
                  />
                  我愿意参考系统推荐
                </label>
                <button
                  className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={requestLocked}
                >
                  提交我的想法
                </button>
              </form>

              <div className="mt-5 space-y-3">
                <h3 className="text-sm font-semibold text-stone-900">家庭今日想法汇总</h3>
                {dashboard.todayRequestSummary.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                    还没人发想法，先说一句今天想吃什么吧。
                  </p>
                ) : (
                  dashboard.todayRequestSummary.map((request) => (
                    <article
                      key={request.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-medium text-stone-900">{request.nickname}</h4>
                        <span className="text-xs text-stone-500">{request.flavorPreference}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.desiredDishes.map((item) => (
                          <TagChip key={`${request.id}-${item}`} label={`想吃 ${item}`} />
                        ))}
                        {request.dislikes.map((item) => (
                          <TagChip key={`${request.id}-avoid-${item}`} label={`避开 ${item}`} tone="soft" />
                        ))}
                        {request.tagPreferences.map((tag) => (
                          <TagChip key={`${request.id}-tag-${tag}`} label={tag} tone="accent" />
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="今晚菜单"
              description="一顿晚餐可以包含多道菜。厨师在这里决定今晚真正做什么，干饭人可以直接查看已发布菜单。"
              emphasis={dashboard.workflowStatus === "PLANNING"}
            >
              {dashboard.currentMenu?.items.length ? (
                <div className="space-y-3">
                  {dashboard.currentMenu.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-stone-950">{item.name}</h3>
                          <p className="mt-1 text-sm text-stone-500">
                            {item.servings} 人份 · {item.source === "CUSTOM" ? "临时新增" : "家庭菜谱"}
                          </p>
                        </div>
                        {dashboard.canManage && !isPublishedOrCompleted ? (
                          <form action={removeMenuDishAction}>
                            <input type="hidden" name="menuItemId" value={item.id} />
                            <button className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-600">
                              删除
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <TagChip key={`${item.id}-${tag}`} label={tag} />
                        ))}
                      </div>
                      <div className="mt-4 rounded-2xl bg-white p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                          食材克数
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.ingredients.length === 0 ? (
                            <span className="text-sm text-stone-500">这道菜暂时没填食材。</span>
                          ) : (
                            item.ingredients.map((ingredient) => (
                              <TagChip
                                key={`${item.id}-${ingredient.name}`}
                                label={`${ingredient.name} ${ingredient.grams}${ingredient.unit}`}
                                tone="soft"
                              />
                            ))
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  还没有今晚菜单。先从右侧推荐里一键采用，或从常做菜里加几道。
                </p>
              )}

              {dashboard.canManage && dashboard.currentMenu?.items.length ? (
                <form action={publishMenuAction} className="mt-4">
                  <button
                    className="w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                    disabled={isPublishedOrCompleted}
                  >
                    {isPublishedOrCompleted ? "今晚菜单已发布" : "确认今晚菜单"}
                  </button>
                </form>
              ) : null}
            </SectionCard>

            <SectionCard
              title="餐后反馈"
              description="晚饭后直接按菜品打分。点一点就行，系统会记住下次更适合你家的口味。"
              emphasis={
                dashboard.workflowStatus === "FEEDBACK" ||
                dashboard.workflowStatus === "COMPLETED"
              }
            >
              {!dashboard.currentMenu?.items.length ? (
                <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                  等厨师先发布今晚菜单，反馈区才会出现。
                </p>
              ) : (
                <div className="space-y-4">
                  {dashboard.currentMenu.items.map((item) => {
                    const existingFeedback =
                      item.feedbackByMemberId[dashboard.currentMember.id];

                    return (
                      <form
                        key={`feedback-${item.id}`}
                        action={submitFeedbackAction}
                        className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                      >
                        <input type="hidden" name="menuItemId" value={item.id} />
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 className="text-base font-semibold text-stone-900">
                              {item.name}
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.tags.map((tag) => (
                                <TagChip key={`${item.id}-feedback-${tag}`} label={tag} tone="soft" />
                              ))}
                            </div>
                          </div>
                          {existingFeedback ? (
                            <TagChip label="你已反馈" tone="accent" />
                          ) : null}
                        </div>

                        <div className="mt-4 grid gap-4">
                          <div>
                            <p className="mb-2 text-sm font-medium text-stone-700">喜欢程度</p>
                            <ChoiceGroup
                              name="likeScore"
                              options={FEEDBACK_LIKE_OPTIONS}
                              defaultValue={existingFeedback?.likeScore ?? FEEDBACK_LIKE_OPTIONS[0]}
                            />
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-medium text-stone-700">咸淡感受</p>
                            <ChoiceGroup
                              name="saltLevel"
                              options={FEEDBACK_SALT_OPTIONS}
                              defaultValue={existingFeedback?.saltLevel ?? FEEDBACK_SALT_OPTIONS[1]}
                            />
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-medium text-stone-700">分量感受</p>
                            <ChoiceGroup
                              name="portionFit"
                              options={FEEDBACK_PORTION_OPTIONS}
                              defaultValue={
                                existingFeedback?.portionFit ?? FEEDBACK_PORTION_OPTIONS[1]
                              }
                            />
                          </div>
                          <label className="grid gap-2 text-sm font-medium text-stone-700">
                            补充一句
                            <textarea
                              name="comment"
                              rows={3}
                              defaultValue={existingFeedback?.comment ?? ""}
                              placeholder="比如：这道菜很下饭，下次可以少一点盐"
                              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400"
                            />
                          </label>
                        </div>

                        <button className="mt-4 rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white">
                          提交晚餐反馈
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </div>

          <aside className="space-y-5">
            <SectionCard
              title="推荐与选菜"
              description="厨师可以整套采用推荐，也可以点常做菜快速加入，尽量不做复杂操作。"
              emphasis={dashboard.workflowStatus === "PLANNING" && dashboard.canManage}
            >
              <div className="space-y-3">
                {dashboard.recommendations.map((recommendation) => (
                  <article
                    key={recommendation.id}
                    className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-900">{recommendation.title}</h3>
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
                    {dashboard.canManage && !isPublishedOrCompleted ? (
                      <form action={adoptRecommendationAction} className="mt-4">
                        <input
                          type="hidden"
                          name="recipeIds"
                          value={recommendation.recipes.map((recipe) => recipe.id).join(",")}
                        />
                        <button className="rounded-2xl border border-orange-300 bg-orange-100 px-4 py-3 text-sm font-semibold text-orange-900">
                          一键采用这套菜单
                        </button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-4">
                <h3 className="text-base font-semibold text-stone-900">家庭常做菜</h3>
                <div className="mt-3 grid gap-3">
                  {dashboard.quickRecipes.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-stone-900">{recipe.name}</p>
                          <p className="mt-1 text-xs text-stone-500">
                            {recipe.defaultServings} 人份
                          </p>
                        </div>
                        {dashboard.canManage && !isPublishedOrCompleted ? (
                          <form action={addRecipeToMenuAction}>
                            <input type="hidden" name="recipeId" value={recipe.id} />
                            <button className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700">
                              加进今晚
                            </button>
                          </form>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {recipe.tags.map((tag) => (
                          <TagChip key={`${recipe.id}-${tag}`} label={tag} tone="soft" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

            {dashboard.canManage && !isPublishedOrCompleted ? (
              <SectionCard
                title="临时新增一道菜"
                description="想做菜单库里没有的菜时，直接填菜名和大概克数就够了。"
              >
                <form action={addManualDishAction} className="grid gap-4">
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
                      defaultValue={dashboard.family.defaultServings}
                      name="servings"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                    />
                  </label>
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-stone-700">菜品标签</p>
                    <TagSelector name="dishTags" tags={presetTags} />
                    <input
                      name="dishCustomTags"
                      placeholder="补充其他标签，比如：高纤维"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400"
                    />
                  </div>
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    食材克数
                    <textarea
                      rows={4}
                      name="ingredientsText"
                      placeholder={"一行一个，比如：\n鸡胸肉 300g\n青椒 120g"}
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                    />
                  </label>
                  <button className="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white">
                    添加到今晚菜单
                  </button>
                </form>
              </SectionCard>
            ) : null}

            <SectionCard title="最近吃过" description="快速回看最近几顿，避免连续重复。">
              <div className="space-y-3">
                {dashboard.recentMenus.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                    还没有历史记录，今晚这顿会成为第一条参考。
                  </p>
                ) : (
                  dashboard.recentMenus.map((menu) => (
                    <article
                      key={menu.id}
                      className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                    >
                      <p className="text-sm font-semibold text-stone-900">
                        {formatDinnerDate(menu.dinnerDate)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {menu.items.map((item) => (
                          <TagChip key={`${menu.id}-${item.name}`} label={item.name} tone="soft" />
                        ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </main>
  );
}
