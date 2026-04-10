import Link from "next/link";
import { redirect } from "next/navigation";

import { approveMemberAction } from "@/app/actions";
import { InlineActionButtonForm } from "@/components/action-forms";
import { SectionCard, TagChip } from "@/components/ui";
import { JOIN_POLICY_LABELS, MEMBER_ROLE_LABELS } from "@/lib/constants";
import { getSettingsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsData();

  if (!settings) {
    redirect("/");
  }

  const canApprove =
    settings.currentMember.isOwner || settings.currentMember.role === "CHEF";

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="flex flex-col gap-3 rounded-[32px] border border-stone-200 bg-[var(--surface)] p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-stone-500">家庭设置</p>
            <h1 className="mt-1 text-3xl font-semibold text-stone-950">
              {settings.family.name}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <TagChip label={`家庭码 ${settings.family.code}`} tone="accent" />
              <TagChip
                label={
                  JOIN_POLICY_LABELS[
                    settings.family.joinPolicy as "OPEN" | "APPROVAL"
                  ]
                }
                tone="soft"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/family"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              回到今晚页面
            </Link>
            <Link
              href="/history"
              className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
            >
              查看历史
            </Link>
          </div>
        </header>

        <SectionCard title="家庭成员" description="角色一目了然，便于知道谁可以最终发今晚菜单。">
          <div className="grid gap-3">
            {settings.members.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <h2 className="text-base font-semibold text-stone-950">{member.nickname}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TagChip
                      label={
                        member.status === "PENDING"
                          ? MEMBER_ROLE_LABELS.PENDING_MEMBER
                          : member.isOwner
                            ? MEMBER_ROLE_LABELS.OWNER
                            : MEMBER_ROLE_LABELS[member.role as "CHEF" | "DINER"]
                      }
                      tone={member.status === "PENDING" ? "accent" : "soft"}
                    />
                    <TagChip label={member.status === "ACTIVE" ? "已启用" : "待审核"} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="待审核成员" description="只有厨师或家庭创建者可以通过审核。">
          {settings.pendingMembers.length === 0 ? (
            <p className="text-sm text-stone-500">当前没有待审核成员。</p>
          ) : (
            <div className="grid gap-3">
              {settings.pendingMembers.map((member) => (
                <article
                  key={member.id}
                  className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h2 className="text-base font-semibold text-stone-950">{member.nickname}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      申请角色：{MEMBER_ROLE_LABELS[member.role as "CHEF" | "DINER"]}
                    </p>
                  </div>
                  {canApprove ? (
                    <InlineActionButtonForm
                      action={approveMemberAction}
                      label="通过加入"
                      pendingLabel="处理中..."
                      buttonClassName="rounded-2xl bg-stone-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
                      messageClassName="mt-2 text-xs"
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                    </InlineActionButtonForm>
                  ) : (
                    <TagChip label="你暂无审核权限" tone="soft" />
                  )}
                </article>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </main>
  );
}
