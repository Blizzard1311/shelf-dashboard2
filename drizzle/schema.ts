import { bigint, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * 管理员通过账号密码登录（/api/admin/login），不再依赖 Manus OAuth。
 * 此表主要用于兼容性保留，管理员会话通过本地 JWT 管理。
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────
// 授权序列号表
// ─────────────────────────────────────────────
export const licenseKeys = mysqlTable("license_keys", {
  id: int("id").autoincrement().primaryKey(),
  /** 序列号字符串，如 SH-A3X9-K7M2-P5Q1 */
  key: varchar("licenseKey", { length: 32 }).notNull().unique(),
  /** 上传次数上限：3 / 10 / 0（0 表示无限制） */
  maxUploads: int("maxUploads").notNull().default(3),
  /** 有效天数：30 / 90 / 0（0 表示无限制） */
  validDays: int("validDays").notNull().default(30),
  /** 备注（标记给了谁/哪个门店） */
  note: text("note"),
  /** 状态：active=可用, used=已激活, disabled=已停用 */
  status: mysqlEnum("status", ["active", "used", "disabled"]).default("active").notNull(),
  /** 创建时间 */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LicenseKey = typeof licenseKeys.$inferSelect;
export type InsertLicenseKey = typeof licenseKeys.$inferInsert;

// ─────────────────────────────────────────────
// 租户表（通过序列号激活后创建）
// ─────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联的序列号 ID */
  licenseKeyId: int("licenseKeyId").notNull(),
  /** 序列号原文（冗余存储，方便查询展示） */
  licenseKey: varchar("licenseKey", { length: 32 }).notNull(),
  /** 租户显示名称（可选，激活时可设置） */
  displayName: varchar("displayName", { length: 100 }),
  /** 已使用上传次数 */
  usedUploads: int("usedUploads").notNull().default(0),
  /** 上传次数上限（从序列号继承） */
  maxUploads: int("maxUploads").notNull().default(3),
  /** 激活时间 */
  activatedAt: timestamp("activatedAt").defaultNow().notNull(),
  /** 过期时间（激活时间 + validDays，null 表示永不过期） */
  expiresAt: timestamp("expiresAt"),
  /** 状态：active=活跃, expired=已过期, disabled=已停用 */
  status: mysqlEnum("tenantStatus", ["active", "expired", "disabled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─────────────────────────────────────────────
// 上传批次表：记录每次上传的元信息
// ─────────────────────────────────────────────
export const uploadSessions = mysqlTable("upload_sessions", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联租户 ID（null 表示管理员上传的历史数据） */
  tenantId: int("tenantId"),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalRows: int("totalRows").notNull().default(0),
  shelfCount: int("shelfCount").notNull().default(0),
  productCount: int("productCount").notNull().default(0),
  uploadedBy: varchar("uploadedBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UploadSession = typeof uploadSessions.$inferSelect;
export type InsertUploadSession = typeof uploadSessions.$inferInsert;

// ─────────────────────────────────────────────
// 货架储位数据表：存储每次上传的明细行
// ─────────────────────────────────────────────
export const shelfData = mysqlTable("shelf_data", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  /** 关联租户 ID（null 表示管理员上传的历史数据） */
  tenantId: int("tenantId"),
  // 品类维度
  category1: varchar("category1", { length: 100 }),  // 大类
  category2: varchar("category2", { length: 100 }),  // 中类
  category3: varchar("category3", { length: 100 }),  // 小类
  category4: varchar("category4", { length: 100 }),  // 子类
  // 商品信息
  productCode: varchar("productCode", { length: 100 }).notNull(),  // 商品编码
  productName: varchar("productName", { length: 255 }),            // 商品名称
  // 货架位置信息
  shelfCode: varchar("shelfCode", { length: 100 }).notNull(),      // 货架编码
  shelfLevel: int("shelfLevel"),                                   // 货架层数（商品所在层）
  positionCode: varchar("positionCode", { length: 100 }),          // 储位编码（同层横向位置）
  facingCount: int("facingCount"),                                 // 陈列面数（横向展示面数）
  displayLevel: int("displayLevel"),                               // 陈列层数（纵向叠放层数）
  stackCount: int("stackCount"),                                   // 单层层数（单位置纵向叠放件数）
  // 销售数据
  salesQty: int("salesQty"),                                       // 销售数量
  salesAmount: text("salesAmount"),                                // 销售金额（text 保留精度）
  grossProfit: text("grossProfit"),                                // 销售毛利（text 保留精度）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShelfData = typeof shelfData.$inferSelect;
export type InsertShelfData = typeof shelfData.$inferInsert;
