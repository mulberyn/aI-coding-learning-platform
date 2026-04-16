import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-ui bg-panel p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          AI Code Learning
        </p>
        <h1 className="mt-3 text-2xl font-semibold">登录平台</h1>
        <p className="mt-2 text-sm text-muted">
          先登录后访问题库、Agent、学习分析和管理页面。
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <div className="mt-6 rounded-2xl border border-ui bg-panel-strong p-4 text-sm">
          <p className="font-medium">演示账号</p>
          <p className="mt-2">student@example.com / password123</p>
          <p>teacher@example.com / password123</p>
          <p>admin@example.com / password123</p>
        </div>

        <div className="mt-4 text-sm text-muted">
          还没有账号？
          <Link href="/register" className="ml-1 text-current hover:underline">
            去注册
          </Link>
        </div>

        <Link
          href="/"
          className="mt-5 inline-flex text-sm text-muted hover:text-current"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
