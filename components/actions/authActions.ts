"use server";

import { signOut } from "@/auth";

export async function handleSignOut(_formData: FormData) {
  await signOut({ redirectTo: "/" });
}
