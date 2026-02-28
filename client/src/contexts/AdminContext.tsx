/**
 * 管理员认证 Context
 * 替换 Manus OAuth，使用账号密码登录
 * 所有 API 调用均指向本地服务器，无需访问 portal.manus.im
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export type AdminInfo = {
  username: string;
  role: "admin";
};

type AdminContextType = {
  admin: AdminInfo | null;
  loading: boolean;
  /** 管理员当前选中查看的租户 ID（null = 查看管理员自己的数据） */
  selectedTenantId: number | null;
  setSelectedTenantId: (id: number | null) => void;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // 检查当前管理员会话
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      setAdmin(data.admin ?? null);
    } catch {
      setAdmin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 账号密码登录
  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setAdmin(data.admin);
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
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setAdmin(null);
    setSelectedTenantId(null);
  }, []);

  return (
    <AdminContext.Provider value={{ admin, loading, selectedTenantId, setSelectedTenantId, login, logout, refresh }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
