import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

// 上传批次表：记录每次上传的元信息
export const uploadSessions = mysqlTable("upload_sessions", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalRows: int("totalRows").notNull().default(0),
  shelfCount: int("shelfCount").notNull().default(0),
  productCount: int("productCount").notNull().default(0),
  uploadedBy: varchar("uploadedBy", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UploadSession = typeof uploadSessions.$inferSelect;
export type InsertUploadSession = typeof uploadSessions.$inferInsert;

// 货架储位数据表：存储每次上传的明细行
export const shelfData = mysqlTable("shelf_data", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ShelfData = typeof shelfData.$inferSelect;
export type InsertShelfData = typeof shelfData.$inferInsert;