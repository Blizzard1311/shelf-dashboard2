import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type TenantInfo = {
  id: number;
  licenseKey: string;
  displayName: string | null;
  usedUploads: number;
  maxUploads: number;
  expiresAt: string | null;
  status: string;
};

type TenantContextType = {
  tenant: TenantInfo | null;
  loading: boolean;
  login: (licenseKey: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // 检查当前租户会话
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tenant/me");
      const data = await res.json();
      setTenant(data.tenant ?? null);
    } catch {
      setTenant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 序列号登录
  const login = useCallback(async (licenseKey: string, displayName?: string) => {
    try {
      const res = await fetch("/api/tenant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey, displayName }),
      });
      const data = await res.json();
      if (data.success) {
        setTenant(data.tenant);
        return { success: true };
      }
      return { success: false, error: data.error || "登录失败" };
    } catch {
      return { success: false, error: "网络错误，请稍后重试" };
    }
  }, []);

  // 登出
  const logout = useCallback(async () => {
    try {
      await fetch("/api/tenant/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setTenant(null);
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, loading, login, logout, refresh }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}
