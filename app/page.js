import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession, SESSION_COOKIE } from "../lib/auth";
import { getUserById } from "../lib/db";
import GameClient from "./GameClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  const store = await cookies();
  const sess = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!sess) redirect("/login");
  const user = await getUserById(sess.uid);
  if (!user) redirect("/login");
  return <GameClient username={user.username} />;
}
