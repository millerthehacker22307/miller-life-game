import crypto from "crypto";

export const SESSION_COOKIE = "lg_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    // Dev-only fallback so local runs work without env; production must set SESSION_SECRET.
    console.warn("SESSION_SECRET is not set — using an insecure dev fallback.");
    return "dev-only-insecure-secret";
  }
  return s;
}

/* ---------- password hashing (scrypt) ---------- */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHashHex) {
  const actual = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHashHex, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

/* ---------- signed session cookie ---------- */
function sign(payload) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionValue(userId) {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

/* Returns { uid } for a valid, unexpired session value, else null. */
export function verifySession(value) {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [uidStr, expStr, sig] = parts;
  const payload = `${uidStr}.${expStr}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const uid = Number(uidStr);
  if (!Number.isInteger(uid) || uid <= 0) return null;
  return { uid };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
    secure: process.env.NODE_ENV === "production",
  };
}

/* Read + verify the session from a NextRequest (route handlers). */
export function sessionFromRequest(req) {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  return verifySession(value);
}
