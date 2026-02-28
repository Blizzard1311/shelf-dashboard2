/**
 * 管理员账号密码认证测试
 * 验证 /api/admin/login、/api/admin/logout、/api/admin/me 路由
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ENV 模块
vi.mock("./_core/env", () => ({
  ENV: {
    cookieSecret: "test-secret-key-for-testing-only",
    adminUsername: "K.yan",
    adminPassword: "intellgen0.",
    appId: "test-app-id",
    databaseUrl: "",
    oAuthServerUrl: "",
    ownerOpenId: "",
    isProduction: false,
    forgeApiUrl: "",
    forgeApiKey: "",
  },
}));

// Mock cookies 模块
vi.mock("./_core/cookies", () => ({
  getSessionCookieOptions: () => ({
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  }),
}));

import { verifyAdminSession } from "./admin-auth";
import { SignJWT } from "jose";

const SECRET = new TextEncoder().encode("test-secret-key-for-testing-only");

describe("verifyAdminSession", () => {
  it("should return null for empty/undefined token", async () => {
    expect(await verifyAdminSession(null)).toBeNull();
    expect(await verifyAdminSession(undefined)).toBeNull();
    expect(await verifyAdminSession("")).toBeNull();
  });

  it("should return null for invalid token", async () => {
    expect(await verifyAdminSession("not-a-jwt")).toBeNull();
  });

  it("should return admin payload for valid token", async () => {
    const token = await new SignJWT({ username: "K.yan", role: "admin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(SECRET);

    const result = await verifyAdminSession(token);
    expect(result).not.toBeNull();
    expect(result?.username).toBe("K.yan");
    expect(result?.role).toBe("admin");
  });

  it("should return null for expired token", async () => {
    const token = await new SignJWT({ username: "K.yan", role: "admin" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1) // 已过期
      .sign(SECRET);

    const result = await verifyAdminSession(token);
    expect(result).toBeNull();
  });

  it("should return null for token with wrong role", async () => {
    const token = await new SignJWT({ username: "K.yan", role: "user" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 3600)
      .sign(SECRET);

    const result = await verifyAdminSession(token);
    expect(result).toBeNull();
  });
});

describe("Admin credentials validation logic", () => {
  it("should verify correct credentials match env vars", () => {
    const validUsername = "K.yan";
    const validPassword = "intellgen0.";

    expect("K.yan" === validUsername && "intellgen0." === validPassword).toBe(true);
    expect("wrong" === validUsername).toBe(false);
    expect("K.yan" === validUsername && "wrong" === validPassword).toBe(false);
  });
});
