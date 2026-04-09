import { redirect } from "next/navigation";

import { createFamilyAction, joinFamilyAction } from "@/app/actions";
import { JOIN_POLICY_LABELS } from "@/lib/constants";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();

  if (session) {
    redirect("/family");
  }

  return (
    <main className="app-shell">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col justify-center gap-6 md:grid md:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-stone-200 bg-[var(--surface)] p-7 shadow-[0_25px_60px_rgba(74,56,34,0.08)] backdrop-blur md:p-10">
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold tracking-wide text-orange-900">
            家庭晚餐单页工作台
          </span>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-stone-950 md:text-5xl">
            今晚吃什么，
            <br />
            让全家在一个页面里定下来。
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 md:text-lg">
            干饭人只要说想吃什么，厨师直接看汇总、选推荐、发菜单。晚饭后也在同一页打分，省去来回跳转。
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ["干饭人提想法", "说想吃的菜、忌口和标签偏好"],
              ["厨师定今晚菜单", "从推荐或常做菜里一键开做"],
              ["餐后快速反馈", "每道菜点一点，下次更懂口味"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm"
              >
                <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-5">
          <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">创建家庭</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              第一次使用时创建家庭码，并自动成为家庭创建者兼厨师。
            </p>
            <form action={createFamilyAction} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                家庭名称
                <input
                  required
                  name="familyName"
                  placeholder="比如：月亮家"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                你的昵称
                <input
                  required
                  name="nickname"
                  placeholder="比如：今天掌勺的人"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900 placeholder:text-stone-400"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  加入方式
                  <select
                    name="joinPolicy"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-900"
                    defaultValue="OPEN"
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
              <button className="mt-2 rounded-2xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800">
                创建家庭并进入
              </button>
            </form>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-950">加入家庭</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              输入家庭码和昵称即可加入。家庭如开启审核，会先进入待审核状态。
            </p>
            <form action={joinFamilyAction} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                家庭码
                <input
                  required
                  name="familyCode"
                  placeholder="6 位家庭码"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 uppercase text-stone-900 placeholder:text-stone-400"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  昵称
                  <input
                    required
                    name="nickname"
                    placeholder="今晚想吃什么的人"
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
              <button className="mt-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">
                输入家庭码并进入
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
