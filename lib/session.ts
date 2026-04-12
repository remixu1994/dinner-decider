import { cookies } from "next/headers";

const SESSION_COOKIE = "dinner-decider-session";

export type SessionData = {
  userId: string;
  familyId?: string | null;
  memberId?: string | null;
};

function normalizeSessionData(value: SessionData) {
  const familyId = value.familyId?.trim() || null;
  const memberId = value.memberId?.trim() || null;

  return {
    userId: value.userId.trim(),
    familyId: familyId && memberId ? familyId : null,
    memberId: familyId && memberId ? memberId : null,
  } satisfies SessionData;
}

function isSessionData(value: unknown): value is SessionData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const userId = candidate.userId;
  const familyId = candidate.familyId;
  const memberId = candidate.memberId;

  return (
    typeof userId === "string" &&
    (familyId === undefined || familyId === null || typeof familyId === "string") &&
    (memberId === undefined || memberId === null || typeof memberId === "string")
  );
}

export async function getSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!isSessionData(parsed) || !parsed.userId.trim()) {
      return null;
    }

    return normalizeSessionData(parsed);
  } catch {
    return null;
  }
}

export async function setSession(session: SessionData) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, JSON.stringify(normalizeSessionData(session)), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearCurrentFamilySession() {
  const session = await getSession();

  if (!session?.userId) {
    await clearSession();
    return;
  }

  await setSession({ userId: session.userId });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
