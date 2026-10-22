import { NextResponse } from "next/server";
import { getState, putState, getUserById } from "../../../lib/db";
import { sessionFromRequest } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const sess = sessionFromRequest(req);
  if (!sess) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const user = await getUserById(sess.uid);
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const state = await getState(sess.uid);
  return NextResponse.json({ username: user.username, state });
}

function isValidState(s) {
  return (
    s !== null &&
    typeof s === "object" &&
    !Array.isArray(s) &&
    Array.isArray(s.custom) &&
    s.days !== null &&
    typeof s.days === "object" &&
    !Array.isArray(s.days)
  );
}

export async function PUT(req) {
  const sess = sessionFromRequest(req);
  if (!sess) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!isValidState(body?.state)) {
    return NextResponse.json({ error: "Invalid game state." }, { status: 400 });
  }
  const raw = JSON.stringify(body.state);
  if (raw.length > 1_000_000) {
    return NextResponse.json({ error: "Game state is too large." }, { status: 413 });
  }
  await putState(sess.uid, body.state);
  return NextResponse.json({ ok: true });
}
