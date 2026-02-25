import { eq, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertShelfData, InsertUploadSession, users, shelfData, uploadSessions } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============ 货架数据相关查询 ============

/** 创建上传批次记录 */
export async function createUploadSession(data: Omit<InsertUploadSession, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(uploadSessions).values(data);
  return (result as any).insertId as number;
}

/** 批量插入货架储位明细行 */
export async function insertShelfDataBatch(rows: InsertShelfData[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // 分批插入，每批 500 条
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(shelfData).values(rows.slice(i, i + BATCH));
  }
}

/** 获取最新一次上传的 sessionId */
export async function getLatestSessionId(): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: uploadSessions.id })
    .from(uploadSessions)
    .orderBy(desc(uploadSessions.createdAt))
    .limit(1);
  return rows.length > 0 ? rows[0].id : null;
}

/** 货架透视看板统计：基于最新 session */
export async function getShelfDashboardStats(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      totalRows: sql<number>`count(*)`,
      totalShelfCodes: sql<number>`count(distinct ${shelfData.shelfCode})`,
      totalProductCodes: sql<number>`count(distinct ${shelfData.productCode})`,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalSalesQty: sql<number>`sum(${shelfData.salesQty})`,
    })
    .from(shelfData)
    .where(eq(shelfData.sessionId, sessionId));
  return rows[0] ?? null;
}

/** 按货架编码汇总销售金额（用于货架方块卡片） */
export async function getShelfSummaryList(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      shelfCode: shelfData.shelfCode,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalSalesQty: sql<number>`sum(${shelfData.salesQty})`,
      productCount: sql<number>`count(distinct ${shelfData.productCode})`,
      rowCount: sql<number>`count(*)`,
    })
    .from(shelfData)
    .where(eq(shelfData.sessionId, sessionId))
    .groupBy(shelfData.shelfCode)
    .orderBy(shelfData.shelfCode);
  return rows;
}

/** 获取所有货架编码列表（用于筛选） */
export async function getShelfCodeList(sessionId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ shelfCode: shelfData.shelfCode })
    .from(shelfData)
    .where(eq(shelfData.sessionId, sessionId))
    .orderBy(shelfData.shelfCode);
  return rows.map(r => r.shelfCode);
}

/** 获取上传批次列表 */
export async function getUploadSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uploadSessions).orderBy(desc(uploadSessions.createdAt)).limit(10);
}
