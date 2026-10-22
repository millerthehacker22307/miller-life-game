import { NextResponse } from "next/server";
import { createUser, getUserByUsername, emptyState } from "../../../../lib/db";
import { hashPassword, createSessionValue, SESSION_COOKIE, sessionCookieOptions } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3–20 characters: letters, numbers or underscore only." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const existing = await getUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: "That username is already taken. Try another one." }, { status: 409 });
  }

  const { salt, hash } = hashPassword(password);
  let userId;
  try {
    userId = await createUser(username, hash, salt);
  } catch (e) {
    // UNIQUE constraint race — treat as duplicate.
    if (String(e?.message || "").toLowerCase().includes("unique")) {
      return NextResponse.json({ error: "That username is already taken. Try another one." }, { status: 409 });
    }
    throw e;
  }

  const res = NextResponse.json({ ok: true, username, state: emptyState() });
  res.cookies.set(SESSION_COOKIE, createSessionValue(userId), sessionCookieOptions());
  return res;
}
