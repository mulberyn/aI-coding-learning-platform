import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { saveAiSettings } from "../actions";
import { SettingSelect } from "../setting-select";
import { LLMApiKeys } from "../llm-api-keys";
import type { ReactNode } from "react";

type UserSettingsPageProps = {
  params: Promise<{ id: string }>;
};

function formatDateTime(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mm = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 py-4 md:grid-cols-[220px_1fr] md:gap-6">
      <div>
        <h2 className="text-sm font-medium text-foreground">{label}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default async function UserSettingsPage({
  params,
}: UserSettingsPageProps) {
  const { id } = await params;
  const session = await auth();

  if (session?.user?.id !== id) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      aiProvider: true,
      aiModel: true,
      aiApiKey: true,
      aiWeeklySummaryUpdatedAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  // Fetch all API Key configs
  const llmConfigs = await prisma.apiKeyConfig.findMany({
    where: { userId: id },
    select: {
      id: true,
      provider: true,
      name: true,
      model: true,
      apiKey: true,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4 border-b border-ui pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted">
              User Settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold">个人设置</h1>
            <p className="mt-2 text-sm text-muted">
              以文档式条目维护账号与 AI 配置，保存后会立即生效。
            </p>
          </div>
          <Link
            href={`/users/${user.id}`}
            className="rounded-md border border-ui px-3 py-2 text-sm text-foreground transition hover:bg-panel-strong"
          >
            返回个人中心
          </Link>
        </div>

        <form action={saveAiSettings} className="mt-6">
          <input type="hidden" name="userId" value={user.id} />

          <section className="border-b border-ui">
            <div className="py-4">
              <h2 className="text-base font-semibold">账号信息</h2>
              <p className="mt-1 text-sm text-muted">基础资料与身份信息。</p>
            </div>
            <SettingRow
              label="昵称"
              description="显示在个人中心与评论区的名称。"
            >
              <input
                name="displayName"
                defaultValue={user.name}
                className="w-full rounded-md border border-ui bg-panel px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
              />
            </SettingRow>
            <SettingRow label="邮箱" description="登录凭证，当前为只读状态。">
              <div className="rounded-md border border-ui bg-panel px-3 py-2 text-sm text-muted">
                {user.email}
              </div>
            </SettingRow>
            <SettingRow label="身份" description="当前账户权限。">
              <div className="rounded-md border border-ui bg-panel px-3 py-2 text-sm text-muted">
                {user.role}
              </div>
            </SettingRow>
            <SettingRow label="注册时间" description="账号创建时间。">
              <div className="rounded-md border border-ui bg-panel px-3 py-2 text-sm text-muted">
                {formatDateTime(user.createdAt)}
              </div>
            </SettingRow>
          </section>

          <section className="border-b border-ui">
            <div className="py-4">
              <h2 className="text-base font-semibold">大模型 APIKEY 设置</h2>
              <p className="mt-1 text-sm text-muted">
                配置多个大模型的 API Key，支持 Deepseek、Qwen
                等多个运营商，用于生成学习评语和其他 AI 功能。
              </p>
            </div>

            <SettingRow
              label="配置管理"
              description="添加、选择和管理不同运营商的 API Key 配置。"
            >
              <LLMApiKeys initialKeys={llmConfigs} userId={user.id} />
            </SettingRow>

            <div className="border-t border-ui py-4">
              <h3 className="mb-3 text-sm font-medium text-foreground">
                默认 Deepseek 配置（兼容旧版本）
              </h3>
              <p className="mb-3 text-xs text-muted">
                如果没有从上方选中的 API Key，将使用此处的默认 Deepseek 配置。
              </p>
              <SettingRow
                label="大模型服务商"
                description="当前先保留 Deepseek，后续可以扩展到更多服务商。"
              >
                <SettingSelect
                  name="aiProvider"
                  defaultValue={user.aiProvider}
                  options={[{ value: "deepseek", label: "Deepseek" }]}
                />
              </SettingRow>
              <SettingRow
                label="模型"
                description="用于生成周度学习评语的模型名称。"
              >
                <SettingSelect
                  name="aiModel"
                  defaultValue={user.aiModel}
                  options={[
                    { value: "deepseek-chat", label: "deepseek-chat" },
                    { value: "deepseek-reasoner", label: "deepseek-reasoner" },
                  ]}
                />
              </SettingRow>
              <SettingRow
                label="API Key"
                description="留空则保持现有密钥，建议仅在自己的设备上填写。"
              >
                <input
                  type="password"
                  name="aiApiKey"
                  placeholder={
                    user.aiApiKey
                      ? "已配置，留空则保持不变"
                      : "请输入 Deepseek API Key"
                  }
                  className="w-full rounded-md border border-ui bg-panel px-3 py-2 text-sm text-foreground outline-none transition focus:border-blue-500"
                />
                <p className="mt-2 text-xs text-muted">
                  最近刷新：
                  {user.aiWeeklySummaryUpdatedAt
                    ? formatDateTime(user.aiWeeklySummaryUpdatedAt)
                    : "尚未刷新"}
                </p>
              </SettingRow>
            </div>
          </section>

          <section className="py-4">
            <div className="py-4">
              <h2 className="text-base font-semibold">常见设置</h2>
              <p className="mt-1 text-sm text-muted">
                用于后续扩展通知与展示偏好。
              </p>
            </div>
            <SettingRow label="通知偏好" description="接收平台重要提醒的方式。">
              <SettingSelect
                name="notificationPreference"
                defaultValue="site"
                options={[
                  { value: "site", label: "站内通知" },
                  { value: "email", label: "邮件通知" },
                  { value: "none", label: "静默模式" },
                ]}
              />
            </SettingRow>
            <SettingRow
              label="界面密度"
              description="控制页面元素的展示紧凑程度。"
            >
              <SettingSelect
                name="interfaceDensity"
                defaultValue="comfortable"
                options={[
                  { value: "comfortable", label: "舒适" },
                  { value: "compact", label: "紧凑" },
                ]}
              />
            </SettingRow>
          </section>

          <div className="flex items-center justify-end border-t border-ui pt-5">
            <button
              type="submit"
              className="rounded-md bg-[#111827] px-4 py-2 text-sm text-white transition hover:bg-[#1f2937] dark:bg-[#f3f4f6] dark:text-[#111827] dark:hover:bg-[#e5e7eb]"
            >
              保存设置
            </button>
          </div>
        </form>
      </div>
    </SiteShell>
  );
}
