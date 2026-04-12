import { redirect } from "next/navigation";

import {
  createFamilyAction,
  enterFamilyAction,
  joinFamilyAction,
  useDifferentUserCodeAction,
} from "@/app/actions";
import { JOIN_POLICY_LABELS, MEMBER_ROLE_LABELS } from "@/lib/constants";
import { getFamiliesHubData } from "@/lib/data";

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="paper-panel rounded-[30px] border bg-white/92 p-5">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      {children}
    </section>
  );
}

function StatusPill({
  label,
  tone = "soft",
}: {
  label: string;
  tone?: "soft" | "accent";
}) {
  const toneClass =
    tone === "accent"
      ? "border-orange-200 bg-orange-100 text-orange-900"
      : "border-stone-200 bg-stone-100 text-stone-700";

  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}
    >
      {label}
    </span>
  );
}

export default async function FamiliesPage() {
  const hub = await getFamiliesHubData();

  if (!hub) {
    redirect("/");
  }

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="paper-panel hero-glow rounded-[34px] border p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex min-h-9 items-center rounded-full border border-orange-200 bg-orange-100 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-orange-900">
                我的家庭
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-stone-950 sm:text-4xl">
                用同一个用户码，进入不同家庭
              </h1>
              <p className="mt-3 text-sm leading-6 text-stone-600 sm:text-base">
                当前用户码是 <span className="font-semibold text-stone-900">{hub.user.code}</span>。
                你可以在这里切换已加入的家庭，也可以继续创建或加入新的家庭。
              </p>
            </div>

            <form action={useDifferentUserCodeAction}>
              <button className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-stone-50">
                使用其他用户码
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <FormCard
              title="已加入的家庭"
              description="选择一个家庭继续进入。待审核成员也会出现在这里，方便你随时回来查看进度。"
            >
              {hub.families.length === 0 ? (
                <p className="mt-4 rounded-[24px] border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                  你还没有加入任何家庭，先在右侧创建一个，或者输入家庭码加入吧。
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {hub.families.map((family) => {
                    const isCurrent = hub.currentFamilyId === family.familyId;
                    const roleLabel =
                      family.status === "PENDING"
                        ? MEMBER_ROLE_LABELS.PENDING_MEMBER
                        : family.isOwner
                          ? MEMBER_ROLE_LABELS.OWNER
                          : MEMBER_ROLE_LABELS[family.role as "CHEF" | "DINER"];

                    return (
                      <article
                        key={family.memberId}
                        className={`rounded-[28px] border p-4 ${
                          isCurrent
                            ? "border-orange-200 bg-orange-50/70"
                            : "border-stone-200 bg-stone-50"
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="text-lg font-semibold text-stone-950">
                                {family.familyName}
                              </h2>
                              {isCurrent ? <StatusPill label="当前正在使用" tone="accent" /> : null}
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <StatusPill label={`家庭码 ${family.familyCode}`} tone="accent" />
                              <StatusPill label={roleLabel} />
                              <StatusPill
                                label={
                                  family.status === "ACTIVE" ? "已启用" : "待审核"
                                }
                                tone={family.status === "ACTIVE" ? "soft" : "accent"}
                              />
                              <StatusPill
                                label={
                                  JOIN_POLICY_LABELS[
                                    family.joinPolicy as "OPEN" | "APPROVAL"
                                  ]
                                }
                              />
                            </div>
                            <p className="mt-3 text-sm text-stone-600">
                              你在这个家庭里的昵称：{family.nickname}
                            </p>
                          </div>

                          <form action={enterFamilyAction}>
                            <input type="hidden" name="memberId" value={family.memberId} />
                            <button className="primary-button rounded-2xl px-4 py-3 text-sm font-semibold">
                              进入这个家庭
                            </button>
                          </form>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </FormCard>
          </div>

          <div className="space-y-5">
            <FormCard
              title="创建新家庭"
              description="沿用当前用户码直接创建，不需要再次填写身份信息。"
            >
              <form action={createFamilyAction} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  家庭名称
                  <input
                    required
                    name="familyName"
                    placeholder="比如：周末炖汤小组"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  你的昵称
                  <input
                    required
                    name="nickname"
                    placeholder="比如：今晚掌勺的人"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    加入方式
                    <select
                      name="joinPolicy"
                      defaultValue="OPEN"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                    >
                      {Object.entries(JOIN_POLICY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    默认几人份
                    <input
                      min={2}
                      max={10}
                      type="number"
                      name="defaultServings"
                      defaultValue={3}
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                    />
                  </label>
                </div>

                <button className="primary-button mt-2 rounded-2xl px-5 py-3 text-sm font-semibold">
                  创建家庭并进入
                </button>
              </form>
            </FormCard>

            <FormCard
              title="加入新家庭"
              description="继续使用当前用户码，只需要补家庭码、昵称和角色。"
            >
              <form action={joinFamilyAction} className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  家庭码
                  <input
                    required
                    name="familyCode"
                    placeholder="输入 6 位家庭码"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 uppercase text-stone-900 placeholder:text-stone-400"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    昵称
                    <input
                      required
                      name="nickname"
                      placeholder="比如：今晚想吃什么的人"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    角色
                    <select
                      name="role"
                      defaultValue="DINER"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                    >
                      <option value="DINER">干饭人</option>
                      <option value="CHEF">厨师</option>
                    </select>
                  </label>
                </div>

                <button className="primary-button mt-2 rounded-2xl px-5 py-3 text-sm font-semibold">
                  输入家庭码并进入
                </button>
              </form>
            </FormCard>
          </div>
        </section>
      </div>
    </main>
  );
}
