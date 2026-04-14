import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "anti_doping_admin_session";

export type AdminRole = "admin" | "reviewer";

export type AdminUser = {
  password: string;
  role: AdminRole;
  username: string;
};

export function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin123456";
}

export function getAdminUsers(): AdminUser[] {
  const configuredUsers = process.env.ADMIN_USERS;

  if (!configuredUsers) {
    return [
      {
        password: getAdminPassword(),
        role: "admin",
        username: getAdminUsername(),
      },
    ];
  }

  return configuredUsers
    .split(",")
    .map((item) => {
      const [username, password, role] = item.split(":");

      if (!username || !password) {
        return null;
      }

      return {
        password,
        role: role === "reviewer" ? "reviewer" : "admin",
        username,
      } satisfies AdminUser;
    })
    .filter((item): item is AdminUser => Boolean(item));
}

export function findAdminUser(username: string, password: string) {
  return getAdminUsers().find(
    (user) => user.username === username && user.password === password,
  );
}

function createAdminSessionSignature(username: string, role: AdminRole) {
  return createHash("sha256")
    .update(`anti-doping-admin:${username}:${role}:${getAdminPassword()}`)
    .digest("hex");
}

export function createAdminSessionToken(user: AdminUser) {
  return `${user.username}:${user.role}:${createAdminSessionSignature(
    user.username,
    user.role,
  )}`;
}

export function getAdminSessionFromToken(value: string | undefined) {
  if (!value) return false;

  const [username, role, signature] = value.split(":");

  if (!username || !signature || (role !== "admin" && role !== "reviewer")) {
    return false;
  }

  const user = getAdminUsers().find(
    (item) => item.username === username && item.role === role,
  );

  if (!user) {
    return false;
  }

  const expected = Buffer.from(createAdminSessionSignature(username, role));
  const actual = Buffer.from(signature);

  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return false;
  }

  return {
    role,
    username,
  };
}

export function isValidAdminSessionToken(value: string | undefined) {
  return Boolean(getAdminSessionFromToken(value));
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE);

  return getAdminSessionFromToken(session?.value);
}

export async function hasAdminSession() {
  return Boolean(await getAdminSession());
}
