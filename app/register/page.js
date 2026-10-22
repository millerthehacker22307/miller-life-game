import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "../../lib/auth";
import AuthForm from "../AuthForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const store = await cookies();
  if (verifySession(store.get(SESSION_COOKIE)?.value)) redirect("/");
  return <AuthForm mode="register" />;
}
