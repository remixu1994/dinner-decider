import { cookies } from "next/headers";

const SESSION_COOKIE = "dinner-decider-session";

export type SessionData = {
  familyId: string;
  memberId: string;
};

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  const [familyId, memberId] = raw.split(":");

  if (!familyId || !memberId) {
    return null;
  }

  return { familyId, memberId } satisfies SessionData;
}

export async function setSession(session: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, `${session.familyId}:${session.memberId}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
