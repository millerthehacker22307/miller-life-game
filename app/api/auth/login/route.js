import { NextResponse } from "next/server";
import { getUserByUsername } from "../../../../lib/db";
import { verifyPassword, createSessionValue, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const user = username ? await getUserByUsername(username) : null;
  if (!user || !verifyPassword(password, user.salt, user.pass_hash)) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, username: user.username });
  res.cookies.set(SESSION_COOKIE, createSessionValue(Number(user.id)), sessionCookieOptions());
  return res;
}
