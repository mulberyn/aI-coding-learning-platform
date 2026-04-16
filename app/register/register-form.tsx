"use client";

import { useActionState } from "react";
import { registerAction } from "./actions";

export function RegisterForm() {
  const [error, formAction, isPending] = useActionState(
    registerAction,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-muted" htmlFor="name">
          昵称
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-xl border border-ui bg-panel-strong px-3 py-2 outline-none ring-black/40 transition focus:ring dark:ring-white/40"
          placeholder="Demo Student"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-muted" htmlFor="email">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border border-ui bg-panel-strong px-3 py-2 outline-none ring-black/40 transition focus:ring dark:ring-white/40"
          placeholder="student@example.com"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm text-muted" htmlFor="password">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="w-full rounded-xl border border-ui bg-panel-strong px-3 py-2 outline-none ring-black/40 transition focus:ring dark:ring-white/40"
          placeholder="至少 6 位"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-ui bg-panel-strong px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="btn-inverse w-full rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "注册中..." : "创建账号"}
      </button>
    </form>
  );
}
