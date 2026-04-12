import Link from "next/link";
import { redirect } from "next/navigation";

import { approveMemberAction } from "@/app/actions";
import { InlineActionButtonForm } from "@/components/action-forms";
import { SectionCard, TagChip } from "@/components/ui";
import { JOIN_POLICY_LABELS, MEMBER_ROLE_LABELS } from "@/lib/constants";
import { getSessionLandingPath, getSettingsData } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsData();

  if (!settings) {
    redirect((await getSessionLandingPath()) ?? "/");
  }

  return (
    <main className="app-shell">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="paper-panel hero-glow rounded-[34px] border p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-medium text-stone-500">家庭设置</p>
              <h1 className="mt-1 text-3xl font-semibold text-stone-950">
                {settings.family.name}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2">
                <TagChip label={`用户码 ${settings.user.code}`} tone="soft" />
                <TagChip label={`家庭码 ${settings.family.code}`} tone="accent" />
                <TagChip
                  label={JOIN_POLICY_LABELS[settings.family.joinPolicy as "OPEN" | "APPROVAL"]}
                  tone="soft"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={settings.currentMember.homePath}
                className="primary-button rounded-2xl px-4 py-3 text-sm font-semibold"
              >
                回到首页
              </Link>
              <Link
                href="/history"
                className="rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-700"
              >
                查看历史
              </Link>
            </div>
          </div>
        </header>

        <SectionCard
          title="家庭成员"
          description="这里能快速看清谁负责做决定，谁还在待审核。"
        >
          <div className="grid gap-3">
            {settings.members.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-3 rounded-[28px] border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between"
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

        <SectionCard
          title="待审核成员"
          description="只有厨师或家庭创建者可以通过成员审核。"
        >
          {settings.pendingMembers.length === 0 ? (
            <p className="text-sm text-stone-500">当前没有待审核成员。</p>
          ) : (
            <div className="grid gap-3">
              {settings.pendingMembers.map((member) => (
                <article
                  key={member.id}
                  className="flex flex-col gap-3 rounded-[28px] border border-stone-200 bg-stone-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <h2 className="text-base font-semibold text-stone-950">{member.nickname}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      申请角色：{MEMBER_ROLE_LABELS[member.role as "CHEF" | "DINER"]}
                    </p>
                  </div>
                  {settings.currentMember.canApproveMembers ? (
                    <InlineActionButtonForm
                      action={approveMemberAction}
                      label="通过加入"
                      pendingLabel="处理中..."
                      buttonClassName="primary-button rounded-2xl px-4 py-3 text-sm font-semibold"
                      messageClassName="mt-2 text-xs"
                    >
                      <input type="hidden" name="memberId" value={member.id} />
                    </InlineActionButtonForm>
                  ) : (
                    <TagChip label="你暂时没有审核权限" tone="soft" />
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
