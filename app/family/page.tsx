import Link from "next/link";
import { redirect } from "next/navigation";

import {
  addManualDishAction,
  addRecipeToMenuAction,
  adoptRecommendationAction,
  approveMemberAction,
  publishMenuAction,
  removeMenuDishAction,
  submitDinnerRequestAction,
  submitFeedbackAction,
  switchActiveModeAction,
  switchFamilyAction,
  toggleMenuItemChefApprovalAction,
} from "@/app/actions";
import {
  ActionStatusForm,
  InlineActionButtonForm,
  ModeSwitchForm,
} from "@/components/action-forms";
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
import { formatDinnerDate, getDashboardData, getPresetTags, todayKey } from "@/lib/data";

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
  const showDinerStage = dashboard.activeMode === "DINER";
  const requestLocked = !dashboard.canEditRequests || isPublishedOrCompleted;
  const menuEditingLocked = !dashboard.canEditMenu || isPublishedOrCompleted;
  const familyDate = formatDinnerDate(todayKey());

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="overflow-hidden rounded-[36px] border border-stone-200 bg-[linear-gradient(135deg,rgba(255,252,247,0.96),rgba(246,236,224,0.88))] p-6 shadow-[0_26px_70px_rgba(70,52,34,0.08)] md:p-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={MENU_STATUS_LABELS[dashboard.workflowStatus]} />
                <TagChip label={`家庭码 ${dashboard.family.code}`} tone="soft" />
                <TagChip
                  label={MEMBER_ROLE_LABELS[dashboard.currentMember.displayRole]}
                  tone="accent"
                />
                <TagChip
                  label={showDinerStage ? "当前模式：干饭人" : "当前模式：厨师"}
                />
              </div>
              <h1 className="mt-5 text-3xl font-semibold tracking-tight text-stone-950 md:text-5xl">
                {dashboard.family.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                今天是 {familyDate}。中间主区只保留当前工作模式最关键的操作，左右两侧负责汇总信息与辅助动作，避免今晚的决策被打散。
              </p>
            </div>

            <div className="flex flex-col gap-4 xl:items-end">
              <ModeSwitchForm
                action={switchActiveModeAction}
                activeMode={dashboard.activeMode}
              />
              <div className="flex flex-wrap gap-2 xl:justify-end">
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
          </div>
        </header>

        {isPending ? (
          <SectionCard
            title="等待审核"
            description="你已经加入这个家庭，但当前仍处于待审核状态。你可以切换模式查看页面结构，但暂时不能提交想法、编辑菜单或审批成员。"
            emphasis
          >
            <div className="flex flex-wrap gap-2">
              <TagChip label="当前为只读状态" tone="accent" />
              <TagChip label={`待审核成员 ${dashboard.pendingCount} 人`} tone="soft" />
            </div>
          </SectionCard>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)_22rem]">
          <aside className="space-y-5">
            <SectionCard
              title="今晚概览"
              description="把当前节奏、成员状态和模式入口压缩成一眼可读的摘要。"
            >
              <div className="space-y-4">
                <div className="grid gap-3">
                  <div className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                      当前流程
                    </p>
                    <p className="mt-2 text-base font-semibold text-stone-950">
                      {MENU_STATUS_LABELS[dashboard.workflowStatus]}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                      今日活跃成员
                    </p>
                    <p className="mt-2 text-base font-semibold text-stone-950">
                      {dashboard.activeMembers.length} 人
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {dashboard.activeMembers.map((member) => (
                    <TagChip
                      key={member.id}
                      label={`${member.nickname}${member.isOwner ? " · 创建者" : ""}`}
                      tone="soft"
                    />
                  ))}
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="家庭今日想法汇总"
              description="按成员聚合今天已经累计提交的想吃清单，避免只剩最后一次输入。"
            >
              <div className="space-y-3">
                {dashboard.todayRequestSummary.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                    还没人发想法，先说一句今天想吃什么吧。
                  </p>
                ) : (
                  dashboard.todayRequestSummary.map((request) => (
                    <article
                      key={request.id}
                      className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-stone-950">
                          {request.nickname}
                        </h3>
                        <span className="text-xs text-stone-500">
                          {request.flavorPreference}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {request.desiredDishes.length > 0 ? (
                          request.desiredDishes.map((item) => (
                            <TagChip
                              key={`${request.id}-${item}`}
                              label={`想吃 ${item}`}
                            />
                          ))
                        ) : (
                          <TagChip label="还没填想吃的菜" tone="soft" />
                        )}
                        {request.dislikes.map((item) => (
                          <TagChip
                            key={`${request.id}-avoid-${item}`}
                            label={`避开 ${item}`}
                            tone="soft"
                          />
                        ))}
                        {request.tagPreferences.map((tag) => (
                          <TagChip
                            key={`${request.id}-tag-${tag}`}
                            label={tag}
                            tone="accent"
                          />
                        ))}
                      </div>
                      <p className="mt-3 text-xs leading-6 text-stone-500">
                        分量偏好：{request.portionPreference}
                        {request.needsRecommendation ? " · 接受推荐" : " · 只看手动选择"}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="最近吃过"
              description="快速回看最近几顿，避免今晚重复率太高。"
            >
              <div className="space-y-3">
                {dashboard.recentMenus.length === 0 ? (
                  <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
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
          <section className="space-y-5">
            {showDinerStage ? (
              <>
                <SectionCard
                  title="今晚想吃什么"
                  description="每次提交会把新的菜名追加到今天的想吃清单里；口味、分量和标签偏好会按最新一次表单更新。"
                  emphasis={dashboard.workflowStatus === "COLLECTING"}
                >
                  {dashboard.myRequest?.desiredDishes.length ? (
                    <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-medium text-emerald-900">
                        今天已记录的想吃清单
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {dashboard.myRequest.desiredDishes.map((item) => (
                          <TagChip key={`my-request-${item}`} label={item} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <ActionStatusForm
                    action={submitDinnerRequestAction}
                    className="grid gap-4"
                    submitLabel="提交我的想法"
                    pendingLabel="提交中..."
                    submitDisabled={requestLocked}
                    submitClassName="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      再加几道想吃的菜
                      <input
                        name="desiredDishes"
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
                          defaultValue={
                            dashboard.myRequest?.flavorPreference ?? FLAVOR_OPTIONS[1]
                          }
                        />
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-stone-700">分量倾向</p>
                        <ChoiceGroup
                          name="portionPreference"
                          options={PORTION_OPTIONS}
                          defaultValue={
                            dashboard.myRequest?.portionPreference ?? PORTION_OPTIONS[1]
                          }
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
                    {requestLocked ? (
                      <p className="text-sm text-stone-500">
                        {isPublishedOrCompleted
                          ? "今晚菜单已经进入发布或完成状态，想法区暂时锁定。"
                          : "当前模式或状态下不能提交想法。"}
                      </p>
                    ) : null}
                  </ActionStatusForm>
                </SectionCard>

                <SectionCard
                  title="餐后反馈"
                  description="用完餐后直接按菜品打分，系统会在历史里积累你家的偏好。"
                  emphasis={
                    dashboard.workflowStatus === "FEEDBACK" ||
                    dashboard.workflowStatus === "COMPLETED"
                  }
                >
                  {!dashboard.currentMenu?.items.length ? (
                    <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                      等厨师先发布今晚菜单，反馈区才会出现。
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {dashboard.currentMenu.items.map((item) => {
                        const existingFeedback =
                          item.feedbackByMemberId[dashboard.currentMember.id];

                        return (
                          <div
                            key={`feedback-${item.id}`}
                            className="rounded-[30px] border border-stone-200 bg-stone-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="text-base font-semibold text-stone-900">
                                  {item.name}
                                </h3>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <TagChip
                                    label={item.chefApproved ? "厨师已同意" : "待厨师确认"}
                                    tone={item.chefApproved ? "accent" : "soft"}
                                  />
                                  {item.tags.map((tag) => (
                                    <TagChip
                                      key={`${item.id}-feedback-${tag}`}
                                      label={tag}
                                      tone="soft"
                                    />
                                  ))}
                                </div>
                              </div>
                              {existingFeedback ? (
                                <TagChip label="你已反馈" tone="accent" />
                              ) : null}
                            </div>

                            <ActionStatusForm
                              action={submitFeedbackAction}
                              className="mt-4 grid gap-4"
                              submitLabel="提交晚餐反馈"
                              pendingLabel="提交中..."
                              submitDisabled={dashboard.currentMember.status !== "ACTIVE"}
                              submitClassName="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              <input type="hidden" name="menuItemId" value={item.id} />
                              <div>
                                <p className="mb-2 text-sm font-medium text-stone-700">
                                  喜欢程度
                                </p>
                                <ChoiceGroup
                                  name="likeScore"
                                  options={FEEDBACK_LIKE_OPTIONS}
                                  defaultValue={
                                    existingFeedback?.likeScore ?? FEEDBACK_LIKE_OPTIONS[0]
                                  }
                                />
                              </div>
                              <div>
                                <p className="mb-2 text-sm font-medium text-stone-700">
                                  咸淡感受
                                </p>
                                <ChoiceGroup
                                  name="saltLevel"
                                  options={FEEDBACK_SALT_OPTIONS}
                                  defaultValue={
                                    existingFeedback?.saltLevel ?? FEEDBACK_SALT_OPTIONS[1]
                                  }
                                />
                              </div>
                              <div>
                                <p className="mb-2 text-sm font-medium text-stone-700">
                                  分量感受
                                </p>
                                <ChoiceGroup
                                  name="portionFit"
                                  options={FEEDBACK_PORTION_OPTIONS}
                                  defaultValue={
                                    existingFeedback?.portionFit ??
                                    FEEDBACK_PORTION_OPTIONS[1]
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
                            </ActionStatusForm>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>
              </>
            ) : (
              <SectionCard
                title="今晚菜单"
                description="厨师模式只保留菜单编辑主舞台，把今晚真正要做的菜聚焦到中间。"
                emphasis={dashboard.workflowStatus === "PLANNING"}
              >
                {dashboard.currentMenu?.items.length ? (
                  <div className="space-y-4">
                    {dashboard.currentMenu.items.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[32px] border border-stone-200 bg-stone-50 p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-stone-950">
                                {item.name}
                              </h3>
                              <TagChip
                                label={item.chefApproved ? "厨师已同意" : "待厨师确认"}
                                tone={item.chefApproved ? "accent" : "soft"}
                              />
                            </div>
                            <p className="mt-2 text-sm text-stone-500">
                              {item.servings} 人份 ·
                              {item.source === "CUSTOM" ? " 临时新增" : " 家庭菜谱"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {dashboard.canEditMenu && !isPublishedOrCompleted ? (
                              <>
                                <InlineActionButtonForm
                                  action={toggleMenuItemChefApprovalAction}
                                  label={item.chefApproved ? "已点赞" : "点赞"}
                                  pendingLabel="保存中..."
                                  showMessage={false}
                                  refreshOnSuccess
                                  buttonClassName={`rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                                    item.chefApproved
                                      ? "border border-orange-400 bg-orange-500 text-white"
                                      : "border border-orange-300 bg-orange-50 text-orange-900"
                                  }`}
                                >
                                  <input type="hidden" name="menuItemId" value={item.id} />
                                </InlineActionButtonForm>
                                <InlineActionButtonForm
                                  action={removeMenuDishAction}
                                  label="删除"
                                  pendingLabel="删除中..."
                                  showMessage={false}
                                  buttonClassName="rounded-full border border-stone-300 px-3 py-2 text-xs text-stone-700 disabled:opacity-50"
                                >
                                  <input type="hidden" name="menuItemId" value={item.id} />
                                </InlineActionButtonForm>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {item.tags.map((tag) => (
                            <TagChip key={`${item.id}-${tag}`} label={tag} />
                          ))}
                        </div>

                        <div className="mt-4 rounded-3xl bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                            食材克数
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.ingredients.length === 0 ? (
                              <span className="text-sm text-stone-500">
                                这道菜暂时没填食材。
                              </span>
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
                  <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                    还没有今晚菜单。先从右侧推荐里一键采用，或者把常做菜加入今晚。
                  </p>
                )}

                {dashboard.currentMenu?.items.length ? (
                  <div className="mt-5">
                    <InlineActionButtonForm
                      action={publishMenuAction}
                      label={isPublishedOrCompleted ? "今晚菜单已发布" : "确认今晚菜单"}
                      pendingLabel="确认中..."
                      disabled={menuEditingLocked}
                      buttonClassName="w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
                    />
                  </div>
                ) : null}
              </SectionCard>
            )}
          </section>
          <aside className="space-y-5">
            {showDinerStage ? (
              <>
                <SectionCard
                  title="今晚菜单摘要"
                  description="当前模式只读查看菜单进度，真正编辑要切换到厨师模式。"
                >
                  {!dashboard.currentMenu?.items.length ? (
                    <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                      厨师还没定下今晚菜单。
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.currentMenu.items.map((item) => (
                        <article
                          key={`readonly-menu-${item.id}`}
                          className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="font-medium text-stone-900">{item.name}</h3>
                            <TagChip
                              label={item.chefApproved ? "厨师已同意" : "待厨师确认"}
                              tone={item.chefApproved ? "accent" : "soft"}
                            />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.tags.map((tag) => (
                              <TagChip key={`${item.id}-readonly-${tag}`} label={tag} tone="soft" />
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="推荐与选菜"
                  description="推荐保留在右侧做只读参考，切换厨师模式后再一键采用。"
                >
                  <div className="space-y-3">
                    {dashboard.recommendations.map((recommendation) => (
                      <article
                        key={recommendation.id}
                        className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
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
                        <p className="mt-3 text-xs text-stone-500">
                          切换到厨师模式后可一键采用这套菜单。
                        </p>
                      </article>
                    ))}
                  </div>
                </SectionCard>
              </>
            ) : (
              <>
                <SectionCard
                  title="推荐与选菜"
                  description="右侧保留推荐、加菜和审批动作，避免和中间菜单编辑互相干扰。"
                  emphasis={dashboard.workflowStatus === "PLANNING" && dashboard.canEditMenu}
                >
                  <div className="space-y-3">
                    {dashboard.recommendations.map((recommendation) => (
                      <article
                        key={recommendation.id}
                        className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
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
                          label="一键采用这套菜单"
                          pendingLabel="采用中..."
                          disabled={menuEditingLocked}
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

                  <div className="mt-5 rounded-[30px] border border-stone-200 bg-white p-4">
                    <h3 className="text-base font-semibold text-stone-900">家庭常做菜</h3>
                    <div className="mt-3 grid gap-3">
                      {dashboard.quickRecipes.map((recipe) => (
                        <div
                          key={recipe.id}
                          className="rounded-3xl border border-stone-200 bg-stone-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-stone-900">{recipe.name}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                {recipe.defaultServings} 人份
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {recipe.tags.map((tag) => (
                              <TagChip key={`${recipe.id}-${tag}`} label={tag} tone="soft" />
                            ))}
                          </div>
                          <InlineActionButtonForm
                            action={addRecipeToMenuAction}
                            className="mt-3"
                            label="添加到今晚菜单"
                            pendingLabel="添加中..."
                            disabled={menuEditingLocked}
                            buttonClassName="rounded-full border border-stone-300 px-3 py-2 text-xs text-stone-700 disabled:opacity-50"
                            messageClassName="mt-2 text-xs"
                          >
                            <input type="hidden" name="recipeId" value={recipe.id} />
                          </InlineActionButtonForm>
                        </div>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="临时新增一道菜"
                  description="想做菜谱库里没有的菜时，直接在右侧补一条就够。"
                >
                  <ActionStatusForm
                    action={addManualDishAction}
                    className="grid gap-4"
                    submitLabel="添加到今晚菜单"
                    pendingLabel="保存中..."
                    submitDisabled={menuEditingLocked}
                    submitClassName="rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
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
                  </ActionStatusForm>
                </SectionCard>

                <SectionCard
                  title="待审核成员"
                  description="厨师模式下可以直接处理新成员的加入申请。"
                >
                  {dashboard.pendingMembers.length === 0 ? (
                    <p className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                      当前没有待审核成员。
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {dashboard.pendingMembers.map((member) => (
                        <article
                          key={member.id}
                          className="rounded-3xl border border-stone-200 bg-stone-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold text-stone-900">
                                {member.nickname}
                              </h3>
                              <p className="mt-1 text-sm text-stone-500">
                                申请角色：
                                {
                                  MEMBER_ROLE_LABELS[
                                    member.role as "CHEF" | "DINER"
                                  ]
                                }
                              </p>
                            </div>
                            <TagChip label="待审核" tone="accent" />
                          </div>
                          <InlineActionButtonForm
                            action={approveMemberAction}
                            className="mt-4"
                            label="通过加入"
                            pendingLabel="处理中..."
                            disabled={!dashboard.canApproveMembers}
                            buttonClassName="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            <input type="hidden" name="memberId" value={member.id} />
                          </InlineActionButtonForm>
                        </article>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
