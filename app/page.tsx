import { redirect } from "next/navigation";

import {
  createFamilyAction,
  joinFamilyAction,
  signInWithUserCodeAction,
} from "@/app/actions";
import { JOIN_POLICY_LABELS } from "@/lib/constants";
import { getSessionLandingPath } from "@/lib/data";

function FeatureCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="paper-panel rounded-[28px] border bg-white/90 p-4">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
    </div>
  );
}

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
    <section className="paper-panel rounded-[32px] border bg-white/92 p-6">
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      {children}
    </section>
  );
}

function UserCodeField() {
  return (
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      用户码
      <input
        required
        name="userCode"
        minLength={6}
        maxLength={12}
        pattern="[A-Za-z0-9]{6,12}"
        autoCapitalize="characters"
        placeholder="比如：MOON88"
        className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 uppercase text-stone-900 placeholder:text-stone-400"
      />
      <span className="text-xs text-stone-500">6-12 位字母或数字，再次进入系统时用它找回自己。</span>
    </label>
  );
}

export default async function HomePage() {
  const landingPath = await getSessionLandingPath();

  if (landingPath) {
    redirect(landingPath);
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col justify-center gap-6 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
        <section className="paper-panel hero-glow rounded-[36px] border p-7 md:p-10">
          <div className="inline-flex min-h-9 items-center rounded-full border border-orange-200 bg-orange-100 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-orange-900">
            家庭晚餐决策助手
          </div>

          <div className="mt-6 max-w-2xl">
            <h1 className="text-4xl font-semibold leading-tight text-stone-950 md:text-5xl">
              今晚吃什么，
              <br />
              让全家用更少步骤定下来。
            </h1>
            <p className="mt-4 text-base leading-7 text-stone-600 md:text-lg">
              成员只要快速提想法，厨师在独立工作台集中定菜单。用用户码就能再次回到自己的家庭，还能同时管理多个家庭。
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeatureCard
              title="用户码找回身份"
              text="每个人都有自己的唯一用户码，下次回来先输用户码，就能看到自己加入过的全部家庭。"
            />
            <FeatureCard
              title="家庭内分工明确"
              text="成员负责提需求和餐后反馈，厨师负责采用推荐、加菜、确认并发布今晚菜单。"
            />
            <FeatureCard
              title="越用越懂口味"
              text="历史菜单、标签偏好和逐菜反馈都会保留下来，后续推荐更贴近这家人的真实习惯。"
            />
          </div>
        </section>

        <section className="grid gap-5">
          <FormCard
            title="用用户码进入"
            description="第二次回来，或者你已经加入过多个家庭时，先输入用户码进入“我的家庭”列表。"
          >
            <form action={signInWithUserCodeAction} className="mt-5 grid gap-4">
              <UserCodeField />

              <button className="primary-button mt-2 rounded-2xl px-5 py-3 text-sm font-semibold">
                用用户码进入
              </button>
            </form>
          </FormCard>

          <FormCard
            title="创建家庭"
            description="第一次使用时先创建家庭。创建者默认拥有厨师权限，也会自动成为这个家庭的管理者。"
          >
            <form action={createFamilyAction} className="mt-5 grid gap-4">
              <UserCodeField />

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                家庭名称
                <input
                  required
                  name="familyName"
                  placeholder="比如：晚餐研究所"
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
            title="加入家庭"
            description="输入家庭码、用户码、昵称和角色即可加入。如果家庭开启审核，会先进入待审核状态。"
          >
            <form action={joinFamilyAction} className="mt-5 grid gap-4">
              <UserCodeField />

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
        </section>
      </div>
    </main>
  );
}
