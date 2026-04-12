import Link from "next/link";
import { redirect } from "next/navigation";

import {
  submitDinnerRequestAction,
  submitFeedbackAction,
  switchFamilyAction,
} from "@/app/actions";
import { ActionStatusForm } from "@/components/action-forms";
import { HomeViewSwitcher } from "@/components/home-view-switcher";
import { SectionCard, StatusBadge, TagChip } from "@/components/ui";
import {
  FEEDBACK_LIKE_OPTIONS,
  FEEDBACK_PORTION_OPTIONS,
  FEEDBACK_SALT_OPTIONS,
  MEMBER_ROLE_LABELS,
  MENU_STATUS_LABELS,
} from "@/lib/constants";
import { formatDinnerDate, getDinerHomeData, getSessionLandingPath, todayKey } from "@/lib/data";

export const dynamic = "force-dynamic";

function SelectableChip({
  name,
  value,
  label,
  defaultChecked = false,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-11 items-center rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-700 transition peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white">
        {label}
      </span>
    </label>
  );
}

function RadioGroup({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: readonly string[];
  defaultValue: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option}
            defaultChecked={option === defaultValue}
            className="peer sr-only"
          />
          <span className="inline-flex min-h-10 items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 transition peer-checked:border-orange-500 peer-checked:bg-orange-500 peer-checked:text-white">
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

function HeroStat({
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

function MenuPreviewCard({
  id,
  name,
  servings,
  chefApproved,
  tags,
  ingredients,
}: {
  id: string;
  name: string;
  servings: number;
  chefApproved: boolean;
  tags: string[];
  ingredients: { name: string; grams: number; unit: string }[];
}) {
  return (
    <article className="rounded-[28px] border border-stone-200 bg-stone-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-stone-950">{name}</h3>
          <p className="mt-1 text-sm text-stone-500">
            {servings} 人份 · {chefApproved ? "厨师已确认" : "厨师还在调整"}
          </p>
        </div>
        <TagChip label={chefApproved ? "已确认" : "整理中"} tone={chefApproved ? "accent" : "soft"} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <TagChip key={`${id}-${tag}`} label={tag} />
        ))}
      </div>

      {ingredients.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {ingredients.map((ingredient) => (
            <TagChip
              key={`${id}-${ingredient.name}`}
              label={`${ingredient.name} ${ingredient.grams}${ingredient.unit}`}
              tone="soft"
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function FamilyPage() {
  const home = await getDinerHomeData();

  if (!home) {
    redirect((await getSessionLandingPath()) ?? "/");
  }

  const isPending = home.currentMember.status === "PENDING";
  const menuLocked =
    home.currentMenu?.status === "PUBLISHED" || home.currentMenu?.status === "COMPLETED";
  const canSubmitRequest = home.currentMember.status === "ACTIVE" && !menuLocked;
  const hasMenu = Boolean(home.currentMenu?.items.length);
  const hasPresetMenu = home.currentMenu?.status === "PRESET" && hasMenu;
  const hasPublishedMenu = menuLocked && hasMenu;
  const menuSummary = hasPublishedMenu
    ? `${home.currentMenu?.items.length ?? 0} 道菜`
    : hasPresetMenu
      ? `预设 ${home.currentMenu?.items.length ?? 0} 道菜`
      : hasMenu
        ? "厨师整理中"
        : "还没确认";
  const dateText = formatDinnerDate(todayKey());
  const primaryHref = hasPublishedMenu ? "#feedback" : "#request";
  const primaryLabel = hasPublishedMenu ? "去给今晚菜单反馈" : "马上说今晚想吃什么";

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="paper-panel hero-glow rounded-[34px] border p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={MENU_STATUS_LABELS[home.workflowStatus]} />
              <TagChip label={`家庭码 ${home.family.code}`} tone="soft" />
              <TagChip label={MEMBER_ROLE_LABELS[home.currentMember.displayRole]} tone="accent" />
            </div>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <div>
                  <p className="text-sm text-stone-500">{dateText}</p>
                  <h1 className="mt-1 text-3xl font-semibold text-stone-950 sm:text-4xl">
                    今晚想吃什么
                  </h1>
                </div>
                <p className="text-sm leading-6 text-stone-600 sm:text-base">
                  先选几道想吃的菜、偏好的口味和标签，愿意的话再补一条备注。
                  如果厨师先整理了一版预设菜单，你也可以边看参考边继续提交今晚需求。
                </p>
                {home.currentMember.canManageMenu ? (
                  <div className="space-y-2">
                    <HomeViewSwitcher activeView={home.currentMember.activeView} />
                    <p className="text-sm text-orange-900/80">
                      你当前也是厨师，这里切到干饭人视角后依然可以像家人一样提交今晚想吃什么。
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-3 sm:min-w-64">
                <Link
                  href={primaryHref}
                  className="primary-button rounded-2xl px-5 py-3 text-center text-sm font-semibold"
                >
                  {primaryLabel}
                </Link>
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
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <HeroStat label="今日状态" value={MENU_STATUS_LABELS[home.workflowStatus]} />
              <HeroStat label="已提交想法" value={`${home.todayRequestSummary.length} 人`} />
              <HeroStat label="今晚菜单" value={menuSummary} />
            </div>
          </div>
        </header>

        {isPending ? (
          <SectionCard
            title="等待家庭审核"
            description="你已经加入这个家庭，但现在仍是待审核状态。审核通过后就可以提今晚想法、看菜单和提交餐后反馈。"
            emphasis
          >
            <div className="flex flex-wrap gap-2">
              <TagChip label={`待审核成员 ${home.pendingCount} 人`} tone="accent" />
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="家庭今日想法"
          description="这里会汇总大家今天的晚饭倾向，厨师会据此决定今晚怎么做。"
        >
          {home.todayRequestSummary.length === 0 ? (
            <p className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
              还没人开口，先说一句今晚想吃什么吧。
            </p>
          ) : (
            <div className="grid gap-3">
              {home.todayRequestSummary.map((request) => (
                <article
                  key={request.id}
                  className="rounded-[26px] border border-stone-200 bg-stone-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-stone-950">{request.nickname}</h3>
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
          title={
            hasPublishedMenu
              ? "今晚菜单已发布"
              : home.myRequest
                ? "你已经提交过今晚想法"
                : "两步表达今晚想吃什么"
          }
          description={
            hasPublishedMenu
              ? "正式菜单已经发布，下面直接看菜和提交餐后反馈就好。"
              : hasPresetMenu
                ? "厨师已经给出一版预设菜单，你可以先参考，同时继续补充今晚真正想吃什么。"
                : "先点想吃的菜和标签，再决定要不要补一条备注，尽量在首页就把今天的需求说清楚。"
          }
          emphasis={!hasPublishedMenu}
          className="scroll-mt-4"
        >
          {home.currentMember.canManageMenu ? (
            <p className="mb-4 rounded-[22px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              你当前是厨师，但在这个页面里依然会按干饭人视角提交需求，方便你也把自己的晚饭偏好记下来。
            </p>
          ) : null}

          {home.myRequest ? (
            <div className="mb-5 rounded-[28px] border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">你今天已经提交</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {home.myRequest.isFlexible ? <TagChip label="都可以" /> : null}
                {home.myRequest.desiredDishes
                  .filter((dish) => dish !== "都可以")
                  .map((dish) => (
                    <TagChip key={`mine-${dish}`} label={dish} />
                  ))}
                {home.myRequest.tagPreferences.map((tag) => (
                  <TagChip key={`mine-tag-${tag}`} label={tag} tone="accent" />
                ))}
              </div>
              {home.myRequest.note ? (
                <p className="mt-3 text-sm leading-6 text-emerald-900/80">
                  备注：{home.myRequest.note}
                </p>
              ) : null}
            </div>
          ) : null}

          <ActionStatusForm
            action={submitDinnerRequestAction}
            className="grid gap-5"
            submitLabel="提交我的想法"
            pendingLabel="提交中..."
            submitDisabled={!canSubmitRequest}
            submitClassName="primary-button rounded-2xl px-5 py-3 text-sm font-semibold"
          >
            <input
              type="hidden"
              name="flavorPreference"
              value={home.myRequest?.flavorPreference ?? "正常就好"}
            />
            <input
              type="hidden"
              name="portionPreference"
              value={home.myRequest?.portionPreference ?? "刚刚好"}
            />

            <div id="request" className="grid gap-4 scroll-mt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-stone-900">
                  第 1 步，先点几个你倾向的选择
                </p>
                <label className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="isFlexible"
                    defaultChecked={home.myRequest?.isFlexible ?? false}
                    className="size-4 accent-orange-500"
                  />
                  都可以
                </label>
              </div>

              <div>
                <p className="mb-2 text-sm text-stone-500">常吃菜</p>
                <div className="flex flex-wrap gap-2">
                  {home.quickStart.suggestedDishes.map((dish) => (
                    <SelectableChip
                      key={`suggested-${dish}`}
                      name="desiredDishes"
                      value={dish}
                      label={dish}
                      defaultChecked={home.myRequest?.desiredDishes.includes(dish) ?? false}
                    />
                  ))}
                </div>
              </div>

              {home.quickStart.recommendedDishes.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-stone-500">推荐菜</p>
                  <div className="flex flex-wrap gap-2">
                    {home.quickStart.recommendedDishes.map((dish) => (
                      <SelectableChip
                        key={`recommended-${dish}`}
                        name="desiredDishes"
                        value={dish}
                        label={dish}
                        defaultChecked={home.myRequest?.desiredDishes.includes(dish) ?? false}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {home.quickStart.recentChoices.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm text-stone-500">最近点过</p>
                  <div className="flex flex-wrap gap-2">
                    {home.quickStart.recentChoices.map((dish) => (
                      <SelectableChip
                        key={`recent-${dish}`}
                        name="desiredDishes"
                        value={dish}
                        label={dish}
                        defaultChecked={home.myRequest?.desiredDishes.includes(dish) ?? false}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="mb-2 text-sm text-stone-500">标签偏好</p>
                <div className="flex flex-wrap gap-2">
                  {home.quickStart.tagChoices.map((tag) => (
                    <SelectableChip
                      key={`tag-${tag}`}
                      name="tagPreferences"
                      value={tag}
                      label={tag}
                      defaultChecked={home.myRequest?.tagPreferences.includes(tag) ?? false}
                    />
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                也可以手动补一道菜
                <input
                  name="customDesiredDish"
                  placeholder="比如：清蒸鱼、冬瓜排骨汤、蘑菇炒肉"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                />
              </label>
            </div>

            <div className="grid gap-3">
              <p className="text-sm font-semibold text-stone-900">第 2 步，可选补一句话</p>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                备注
                <textarea
                  name="note"
                  rows={3}
                  defaultValue={home.myRequest?.note ?? ""}
                  placeholder="比如：想喝热汤、今天别太辣、想清淡一点"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                />
              </label>

              <label className="inline-flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                <input
                  type="checkbox"
                  name="needsRecommendation"
                  defaultChecked={home.myRequest?.needsRecommendation ?? true}
                  className="size-4 accent-orange-500"
                />
                接受系统推荐
              </label>
            </div>

            {!canSubmitRequest ? (
              <p className="text-sm text-stone-500">
                {hasPublishedMenu
                  ? "今晚正式菜单已经发布，需求区暂时关闭。"
                  : "当前还不能提交今晚想法。"}
              </p>
            ) : null}
          </ActionStatusForm>
        </SectionCard>

        {hasPresetMenu ? (
          <SectionCard
            title="厨师预设菜单"
            description="这是厨师先整理出来的一版参考菜单，正式发布前你仍然可以继续提交今晚想吃什么。"
            emphasis
          >
            <div className="grid gap-3">
              {home.currentMenu?.items.map((item) => (
                <MenuPreviewCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  servings={item.servings}
                  chefApproved={item.chefApproved}
                  tags={item.tags}
                  ingredients={item.ingredients}
                />
              ))}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          title="今晚正式菜单"
          description={
            hasPublishedMenu
              ? "这是厨师已经确认并发布的今晚菜单。"
              : "正式菜单发布后，这里会自动切换成最终菜单展示。"
          }
          emphasis={hasPublishedMenu}
        >
          {!hasPublishedMenu ? (
            <p className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
              {hasPresetMenu
                ? "现在展示的是预设菜单，等厨师确认发布后，这里会显示正式版本。"
                : "厨师还没正式发布今晚菜单。"}
            </p>
          ) : (
            <div className="grid gap-3">
              {home.currentMenu?.items.map((item) => (
                <MenuPreviewCard
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  servings={item.servings}
                  chefApproved={item.chefApproved}
                  tags={item.tags}
                  ingredients={item.ingredients}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="餐后反馈"
          description="晚饭后逐道点一下喜欢程度、咸淡和分量，系统就会慢慢记住你们家的口味。"
          emphasis={hasPublishedMenu}
          className="scroll-mt-4"
        >
          {!hasPublishedMenu ? (
            <p
              id="feedback"
              className="rounded-[26px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500 scroll-mt-4"
            >
              等正式菜单发布后，这里会自动切换成反馈区。
            </p>
          ) : (
            <div id="feedback" className="space-y-4 scroll-mt-4">
              {home.currentMenu?.items.map((item) => {
                const existingFeedback = item.feedbackByMemberId[home.currentMember.id];

                return (
                  <ActionStatusForm
                    key={`feedback-${item.id}`}
                    action={submitFeedbackAction}
                    className="grid gap-4 rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                    submitLabel="提交这道菜反馈"
                    pendingLabel="提交中..."
                    submitClassName="primary-button rounded-2xl px-4 py-3 text-sm font-semibold"
                  >
                    <input type="hidden" name="menuItemId" value={item.id} />
                    <div>
                      <h3 className="text-lg font-semibold text-stone-950">{item.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <TagChip key={`${item.id}-feedback-${tag}`} label={tag} tone="soft" />
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <p className="mb-2 text-sm font-medium text-stone-700">喜欢程度</p>
                        <RadioGroup
                          name="likeScore"
                          options={FEEDBACK_LIKE_OPTIONS}
                          defaultValue={existingFeedback?.likeScore ?? FEEDBACK_LIKE_OPTIONS[0]}
                        />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium text-stone-700">咸淡</p>
                        <RadioGroup
                          name="saltLevel"
                          options={FEEDBACK_SALT_OPTIONS}
                          defaultValue={existingFeedback?.saltLevel ?? FEEDBACK_SALT_OPTIONS[1]}
                        />
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-medium text-stone-700">分量</p>
                        <RadioGroup
                          name="portionFit"
                          options={FEEDBACK_PORTION_OPTIONS}
                          defaultValue={
                            existingFeedback?.portionFit ?? FEEDBACK_PORTION_OPTIONS[1]
                          }
                        />
                      </div>

                      <label className="grid gap-2 text-sm font-medium text-stone-700">
                        可选备注
                        <textarea
                          name="comment"
                          rows={2}
                          defaultValue={existingFeedback?.comment ?? ""}
                          placeholder="比如：这道菜很下饭，下次可以再淡一点"
                          className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 placeholder:text-stone-400"
                        />
                      </label>
                    </div>
                  </ActionStatusForm>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="最近吃过"
          description="不用翻很多层，最近几次菜单在这里直接回看。"
        >
          {home.recentMenus.length === 0 ? (
            <p className="text-sm text-stone-500">还没有历史菜单，今晚这顿会成为第一条。</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {home.recentMenus.map((menu) => (
                <article
                  key={menu.id}
                  className="rounded-[26px] border border-stone-200 bg-stone-50 p-4"
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
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
