import { Router, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { TENANT_COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import {
  getLicenseKeyByKey,
  getTenantByLicenseKeyId,
  activateLicenseKey,
  getTenantById,
  isTenantValid,
  expireOverdueTenants,
} from "./db";

const router = Router();

type TenantSessionPayload = {
  tenantId: number;
  licenseKey: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

/** 创建租户会话 JWT */
async function createTenantSession(tenantId: number, licenseKey: string): Promise<string> {
  const secretKey = getSessionSecret();
  const expiresInMs = 30 * 24 * 60 * 60 * 1000; // 30 天
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);

  return new SignJWT({ tenantId, licenseKey } as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/** 验证租户会话 JWT */
export async function verifyTenantSession(cookieValue: string | undefined | null): Promise<TenantSessionPayload | null> {
  if (!cookieValue) return null;
  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
    const { tenantId, licenseKey } = payload as unknown as TenantSessionPayload;
    if (!tenantId || !licenseKey) return null;
    return { tenantId, licenseKey };
  } catch {
    return null;
  }
}

/** 从请求中提取租户信息（供 tRPC context 使用） */
export async function extractTenantFromRequest(req: Request): Promise<{ tenantId: number; licenseKey: string } | null> {
  const cookies = req.headers.cookie ? parseCookieHeader(req.headers.cookie) : {};
  const sessionCookie = cookies[TENANT_COOKIE_NAME];
  const session = await verifyTenantSession(sessionCookie);
  if (!session) return null;

  // 验证租户是否仍然有效
  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return null;
  const validity = isTenantValid(tenant);
  if (!validity.valid) return null;

  return { tenantId: tenant.id, licenseKey: tenant.licenseKey };
}

// POST /api/tenant/login — 序列号登录
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { licenseKey, displayName } = req.body as { licenseKey?: string; displayName?: string };

    if (!licenseKey || licenseKey.trim().length === 0) {
      res.status(400).json({ success: false, error: "请输入序列号" });
      return;
    }

    // 先执行过期检查
    await expireOverdueTenants();

    // 查找序列号
    const license = await getLicenseKeyByKey(licenseKey);
    if (!license) {
      res.status(401).json({ success: false, error: "序列号无效" });
      return;
    }

    if (license.status === 'disabled') {
      res.status(401).json({ success: false, error: "该序列号已被停用" });
      return;
    }

    // 检查是否已激活（已有租户）
    let tenant = await getTenantByLicenseKeyId(license.id);

    if (tenant) {
      // 已激活，检查有效性
      const validity = isTenantValid(tenant);
      if (!validity.valid) {
        res.status(401).json({ success: false, error: validity.reason });
        return;
      }
    } else if (license.status === 'active') {
      // 首次激活
      tenant = await activateLicenseKey(license, displayName);
    } else {
      res.status(401).json({ success: false, error: "该序列号状态异常" });
      return;
    }

    // 创建会话
    const token = await createTenantSession(tenant.id, tenant.licenseKey);
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(TENANT_COOKIE_NAME, token, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 天
    });

    res.json({
      success: true,
      tenant: {
        id: tenant.id,
        licenseKey: tenant.licenseKey,
        displayName: tenant.displayName,
        usedUploads: tenant.usedUploads,
        maxUploads: tenant.maxUploads,
        expiresAt: tenant.expiresAt,
        status: tenant.status,
      },
    });
  } catch (err) {
    console.error("[tenant/login] error:", err);
    res.status(500).json({ success: false, error: "登录失败，请稍后重试" });
  }
});

// GET /api/tenant/me — 获取当前租户信息
router.get("/me", async (req: Request, res: Response) => {
  try {
    const tenantInfo = await extractTenantFromRequest(req);
    if (!tenantInfo) {
      res.json({ tenant: null });
      return;
    }

    const tenant = await getTenantById(tenantInfo.tenantId);
    if (!tenant) {
      res.json({ tenant: null });
      return;
    }

    res.json({
      tenant: {
        id: tenant.id,
        licenseKey: tenant.licenseKey,
        displayName: tenant.displayName,
        usedUploads: tenant.usedUploads,
        maxUploads: tenant.maxUploads,
        expiresAt: tenant.expiresAt,
        status: tenant.status,
      },
    });
  } catch (err) {
    console.error("[tenant/me] error:", err);
    res.json({ tenant: null });
  }
});

// POST /api/tenant/logout — 租户登出
router.post("/logout", (req: Request, res: Response) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie(TENANT_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

export default router;
