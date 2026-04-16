import Link from "next/link";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-ui bg-panel p-6 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          AI Code Learning
        </p>
        <h1 className="mt-3 text-2xl font-semibold">注册账号</h1>
        <p className="mt-2 text-sm text-muted">
          创建学生账号后即可进入题库、提交记录和论坛。
        </p>

        <div className="mt-6">
          <RegisterForm />
        </div>

        <div className="mt-6 rounded-2xl border border-ui bg-panel-strong p-4 text-sm text-muted">
          注册后账号默认是学生身份，教师和管理员可以通过后台单独开通。
        </div>

        <Link
          href="/login"
          className="mt-5 inline-flex text-sm text-muted hover:text-current"
        >
          返回登录
        </Link>
      </div>
    </div>
  );
}
