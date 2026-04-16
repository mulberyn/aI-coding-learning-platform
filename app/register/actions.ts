"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2, "请输入至少 2 个字符的昵称。"),
  email: z.string().email("请输入有效邮箱。"),
  password: z.string().min(6, "密码至少 6 位。"),
});

export async function registerAction(
  _prevState: string | undefined,
  formData: FormData,
) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "请检查注册信息。";
  }

  try {
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return "该邮箱已经注册过了。";
    }

    throw error;
  }

  redirect("/login?registered=1");
}
