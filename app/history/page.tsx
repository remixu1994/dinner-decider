import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard, TagChip } from "@/components/ui";
import { formatDinnerDate, getHistoryData, getSessionLandingPath } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const history = await getHistoryData(tag);

  if (!history) {
    redirect((await getSessionLandingPath()) ?? "/");
  }

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="paper-panel hero-glow rounded-[34px] border p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">历史菜单</p>
              <h1 className="mt-1 text-3xl font-semibold text-stone-950">
                {history.family.name}
              </h1>
              <p className="mt-2 text-sm text-stone-600">家庭码 {history.family.code}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={history.currentMember.homePath}
                className="primary-button rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                回到首页
              </Link>
              <Link
                href="/settings"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
              >
                家庭设置
              </Link>
            </div>
          </div>
        </header>

        <SectionCard
          title="按标签筛选"
          description="想找减脂餐、健身餐或最近受欢迎的菜时，直接点标签就行。"
        >
          <div className="flex flex-wrap gap-2">
            <Link href="/history">
              <TagChip label="全部标签" tone={history.activeTag ? "soft" : "accent"} />
            </Link>
            {history.allTags.map((item) => (
              <Link key={item} href={`/history?tag=${encodeURIComponent(item)}`}>
                <TagChip label={item} tone={history.activeTag === item ? "accent" : "soft"} />
              </Link>
            ))}
          </div>
        </SectionCard>

        <div className="space-y-4">
          {history.menus.length === 0 ? (
            <SectionCard
              title="还没有历史菜单"
              description="等今晚吃完第一顿后，这里就会开始沉淀可复用的历史记录。"
            >
              <p className="text-sm text-stone-500">先回到首页把今晚菜单定下来。</p>
            </SectionCard>
          ) : (
            history.menus.map((menu) => (
              <SectionCard
                key={menu.id}
                title={formatDinnerDate(menu.dinnerDate)}
                description={`菜单状态：${menu.status}`}
              >
                <div className="space-y-3">
                  {menu.items.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[28px] border border-stone-200 bg-stone-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-stone-950">{item.name}</h2>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.tags.map((tagItem) => (
                              <TagChip key={`${item.id}-${tagItem}`} label={tagItem} />
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                          {item.feedbackSummary.likeLabels.map((label, index) => (
                            <TagChip
                              key={`${item.id}-feedback-${label}-${index}`}
                              label={label}
                              tone="soft"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.ingredients.map((ingredient) => (
                          <TagChip
                            key={`${item.id}-${ingredient.name}`}
                            label={`${ingredient.name} ${ingredient.grams}${ingredient.unit}`}
                            tone="soft"
                          />
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </SectionCard>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
