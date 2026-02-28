/**
 * 管理员账号密码认证路由
 * 替换 Manus OAuth，确保中国大陆用户无需 VPN 即可登录
 *
 * 路由：
 *   POST /api/admin/login  — 账号密码登录
 *   POST /api/admin/logout — 登出
 *   GET  /api/admin/me     — 获取当前管理员信息
 */
import { Router, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";
import { getSessionCookieOptions } from "./_core/cookies";

export const ADMIN_COOKIE_NAME = "admin_session_id";

// 登录失败计数（内存中，重启后清零）
const loginFailures = new Map<string, { count: number; lockedUntil: number }>();

const MAX_FAILURES = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 分钟

type AdminSessionPayload = {
  username: string;
  role: "admin";
};

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret || "fallback-secret-change-me");
}

/** 创建管理员会话 JWT（24 小时有效） */
async function createAdminSession(username: string): Promise<string> {
  const secretKey = getSessionSecret();
  const expiresInMs = 24 * 60 * 60 * 1000; // 24 小时
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({ username, role: "admin" } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/** 验证管理员会话 JWT */
export async function verifyAdminSession(
  cookieValue: string | undefined | null
): Promise<AdminSessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });
    const { username, role } = payload as unknown as AdminSessionPayload;
    if (!username || role !== "admin") return null;
    return { username, role };
  } catch {
    return null;
  }
}

/** 从请求中提取管理员信息（供 tRPC context 使用） */
export async function extractAdminFromRequest(
  req: Request
): Promise<{ username: string; role: "admin" } | null> {
  const cookies = req.headers.cookie ? parseCookieHeader(req.headers.cookie) : {};
  const sessionCookie = cookies[ADMIN_COOKIE_NAME];
  return verifyAdminSession(sessionCookie);
}

const router = Router();

// POST /api/admin/login — 账号密码登录
router.post("/login", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

  // 检查是否被锁定
  const failures = loginFailures.get(ip);
  if (failures && failures.lockedUntil > Date.now()) {
    const remainingMs = failures.lockedUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    res.status(429).json({
      success: false,
      error: `登录失败次数过多，请 ${remainingMin} 分钟后重试`,
    });
    return;
  }

  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ success: false, error: "请输入用户名和密码" });
    return;
  }

  // 验证凭据（从环境变量读取，不在前端代码中暴露）
  const validUsername = ENV.adminUsername;
  const validPassword = ENV.adminPassword;

  if (!validUsername || !validPassword) {
    console.error("[admin/login] ADMIN_USERNAME or ADMIN_PASSWORD not configured");
    res.status(500).json({ success: false, error: "服务器配置错误，请联系管理员" });
    return;
  }

  const isValid =
    username.trim() === validUsername && password === validPassword;

  if (!isValid) {
    // 记录失败次数
    const current = loginFailures.get(ip) ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_FAILURES) {
      current.lockedUntil = Date.now() + LOCKOUT_MS;
      current.count = 0; // 重置计数，锁定期结束后重新计数
    }
    loginFailures.set(ip, current);

    const remaining = MAX_FAILURES - current.count;
    const msg =
      current.lockedUntil > Date.now()
        ? "登录失败次数过多，账号已锁定 15 分钟"
        : remaining > 0
        ? `用户名或密码错误，还有 ${remaining} 次机会`
        : "用户名或密码错误";

    res.status(401).json({ success: false, error: msg });
    return;
  }

  // 登录成功，清除失败记录
  loginFailures.delete(ip);

  // 创建会话
  const token = await createAdminSession(username.trim());
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(ADMIN_COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: 24 * 60 * 60 * 1000, // 24 小时
  });

  res.json({
    success: true,
    admin: {
      username: username.trim(),
      role: "admin",
    },
  });
});

// POST /api/admin/logout — 登出
router.post("/logout", (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(ADMIN_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// GET /api/admin/me — 获取当前管理员信息
router.get("/me", async (req: Request, res: Response) => {
  const admin = await extractAdminFromRequest(req);
  if (!admin) {
    res.json({ admin: null });
    return;
  }
  res.json({
    admin: {
      username: admin.username,
      role: "admin",
    },
  });
});

export default router;
