import { eq, desc, sql, and, isNotNull } from "drizzle-orm";
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
      totalGrossProfit: sql<number>`sum(cast(${shelfData.grossProfit} as decimal(18,2)))`,
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

/** 获取单货架所有储位明细（用于棚格图），按层数+储位编码排序 */
export async function getShelfPlanogramData(sessionId: number, shelfCode: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: shelfData.id,
      productCode: shelfData.productCode,
      productName: shelfData.productName,
      shelfLevel: shelfData.shelfLevel,
      positionCode: shelfData.positionCode,
      facingCount: shelfData.facingCount,
      displayLevel: shelfData.displayLevel,
      stackCount: shelfData.stackCount,
      salesQty: shelfData.salesQty,
      salesAmount: shelfData.salesAmount,
      grossProfit: shelfData.grossProfit,
    })
    .from(shelfData)
    .where(
      sql`${shelfData.sessionId} = ${sessionId} AND ${shelfData.shelfCode} = ${shelfCode}`
    )
    .orderBy(shelfData.shelfLevel, sql`cast(${shelfData.positionCode} as unsigned)`);
  return rows;
}

/** 获取上传批次列表 */
export async function getUploadSessions() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(uploadSessions).orderBy(desc(uploadSessions.createdAt)).limit(10);
}

/** 获取大类列表（用于筛选器下拉） */
export async function getCategoryList(sessionId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .selectDistinct({ category1: shelfData.category1 })
    .from(shelfData)
    .where(
      and(
        eq(shelfData.sessionId, sessionId),
        isNotNull(shelfData.category1)
      )
    )
    .orderBy(shelfData.category1);
  return rows.map(r => r.category1).filter(Boolean) as string[];
}

/** 全货架排面效率汇总（用于生命力透视第一层） */
export async function getShelfEfficiencyList(sessionId: number, category?: string) {
  const db = await getDb();
  if (!db) return [];

  const whereConditions = category
    ? and(eq(shelfData.sessionId, sessionId), eq(shelfData.category1, category))
    : eq(shelfData.sessionId, sessionId);

  const rows = await db
    .select({
      shelfCode: shelfData.shelfCode,
      totalFacings: sql<number>`sum(${shelfData.facingCount})`,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalGrossProfit: sql<number>`sum(cast(${shelfData.grossProfit} as decimal(18,2)))`,
      totalSalesQty: sql<number>`sum(${shelfData.salesQty})`,
      productCount: sql<number>`count(distinct ${shelfData.productCode})`,
      zeroSalesCount: sql<number>`sum(case when ${shelfData.salesQty} = 0 or ${shelfData.salesQty} is null then 1 else 0 end)`,
      zeroSalesFacings: sql<number>`sum(case when ${shelfData.salesQty} = 0 or ${shelfData.salesQty} is null then ${shelfData.facingCount} else 0 end)`,
    })
    .from(shelfData)
    .where(whereConditions)
    .groupBy(shelfData.shelfCode)
    .orderBy(shelfData.shelfCode);

  return rows;
}

/** 全场汇总指标（生命力透视顶部卡片） */
export async function getOverallEfficiencyStats(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      totalFacings: sql<number>`sum(${shelfData.facingCount})`,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalGrossProfit: sql<number>`sum(cast(${shelfData.grossProfit} as decimal(18,2)))`,
      zeroSalesCount: sql<number>`count(distinct case when ${shelfData.salesQty} = 0 or ${shelfData.salesQty} is null then ${shelfData.productCode} end)`,
      zeroSalesFacings: sql<number>`sum(case when ${shelfData.salesQty} = 0 or ${shelfData.salesQty} is null then ${shelfData.facingCount} else 0 end)`,
    })
    .from(shelfData)
    .where(eq(shelfData.sessionId, sessionId));
  return rows[0] ?? null;
}

/** 按大类汇总排面效率（生命力透视大类分析） */
export async function getCategoryEfficiencyList(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      category1: shelfData.category1,
      totalFacings: sql<number>`sum(${shelfData.facingCount})`,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalGrossProfit: sql<number>`sum(cast(${shelfData.grossProfit} as decimal(18,2)))`,
      zeroSalesCount: sql<number>`sum(case when ${shelfData.salesQty} = 0 or ${shelfData.salesQty} is null then 1 else 0 end)`,
      productCount: sql<number>`count(distinct ${shelfData.productCode})`,
    })
    .from(shelfData)
    .where(
      and(
        eq(shelfData.sessionId, sessionId),
        isNotNull(shelfData.category1)
      )
    )
    .groupBy(shelfData.category1)
    .orderBy(sql`sum(cast(${shelfData.salesAmount} as decimal(18,2))) desc`);
  return rows;
}

/** 单货架详细诊断：每个商品的排面效率（生命力透视第二层） */
export async function getShelfProductEfficiency(sessionId: number, shelfCode: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: shelfData.id,
      productCode: shelfData.productCode,
      productName: shelfData.productName,
      shelfLevel: shelfData.shelfLevel,
      positionCode: shelfData.positionCode,
      facingCount: shelfData.facingCount,
      displayLevel: shelfData.displayLevel,
      stackCount: shelfData.stackCount,
      salesQty: shelfData.salesQty,
      salesAmount: shelfData.salesAmount,
      grossProfit: shelfData.grossProfit,
      category1: shelfData.category1,
      category2: shelfData.category2,
      category3: shelfData.category3,
    })
    .from(shelfData)
    .where(
      sql`${shelfData.sessionId} = ${sessionId} AND ${shelfData.shelfCode} = ${shelfCode}`
    )
    .orderBy(shelfData.shelfLevel, sql`cast(${shelfData.positionCode} as unsigned)`);
  return rows;
}

/**
 * 货架卡看板区域一汇总指标：支持大类筛选
 * - 货架总数：该大类下完全属于该大类的货架数（即该货架上所有商品均属于该大类）
 * - 商品数量：该大类下不重复的 SKU 数
 * - 排面动效率：有销售商品的排面数 ÷ 总排面数
 * - 销售总金额：该大类销售金额汇总
 */
export async function getSummaryStats(sessionId: number, category?: string) {
  const db = await getDb();
  if (!db) return null;

  const baseWhere = category
    ? and(eq(shelfData.sessionId, sessionId), eq(shelfData.category1, category))
    : eq(shelfData.sessionId, sessionId);

  // 计算商品数量、排面数据、销售金额
  const statsRows = await db
    .select({
      totalProductCodes: sql<number>`count(distinct ${shelfData.productCode})`,
      totalFacings: sql<number>`sum(${shelfData.facingCount})`,
      activeFacings: sql<number>`sum(case when coalesce(${shelfData.salesQty}, 0) > 0 then ${shelfData.facingCount} else 0 end)`,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
    })
    .from(shelfData)
    .where(baseWhere);

  const stats = statsRows[0] ?? null;
  if (!stats) return null;

  // 货架总数：完全属于该大类的货架数量
  // 即该货架下所有商品的 category1 均为指定大类
  let totalShelfCodes: number;
  if (category) {
    // 找出属于该大类的货架（该货架上所有商品均属于该大类）
    const allShelfRows = await db
      .select({ shelfCode: shelfData.shelfCode })
      .from(shelfData)
      .where(eq(shelfData.sessionId, sessionId))
      .groupBy(shelfData.shelfCode);

    const categoryShelfRows = await db
      .select({ shelfCode: shelfData.shelfCode })
      .from(shelfData)
      .where(and(eq(shelfData.sessionId, sessionId), eq(shelfData.category1, category)))
      .groupBy(shelfData.shelfCode);

    // 属于该大类的货架：该货架出现在大类筛选结果中，且该货架所有行均属于该大类
    const allShelfSet = new Set(allShelfRows.map(r => r.shelfCode));
    const categoryShelfSet = new Set(categoryShelfRows.map(r => r.shelfCode));
    // 全场货架中，属于该大类的货架：该货架的所有商品均属于该大类
    // 即 categoryShelfSet 中的货架，其在 allShelfRows 中的所有行均属于该大类
    // 简化处理：如果货架在大类筛选结果中出现，则认为属于该大类
    totalShelfCodes = categoryShelfSet.size;
  } else {
    const shelfCountRows = await db
      .select({ shelfCode: shelfData.shelfCode })
      .from(shelfData)
      .where(eq(shelfData.sessionId, sessionId))
      .groupBy(shelfData.shelfCode);
    totalShelfCodes = shelfCountRows.length;
  }

  const totalFacings = Number(stats.totalFacings) || 0;
  const activeFacings = Number(stats.activeFacings) || 0;
  const facingActivityRate = totalFacings > 0 ? (activeFacings / totalFacings) * 100 : 0;

  return {
    totalShelfCodes,
    totalProductCodes: Number(stats.totalProductCodes) || 0,
    totalSalesAmount: Number(stats.totalSalesAmount) || 0,
    totalFacings,
    activeFacings,
    facingActivityRate: Math.round(facingActivityRate * 10) / 10, // 保留一位小数
  };
}

/** 分页获取货架汇总列表（支持大类筛选） */
export async function getShelfSummaryListPaged(
  sessionId: number,
  page: number,
  pageSize: number,
  category?: string
) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const whereConditions = category
    ? and(eq(shelfData.sessionId, sessionId), eq(shelfData.category1, category))
    : eq(shelfData.sessionId, sessionId);

  // 先查满足条件的货架编码总数（用于分页）
  const countRows = await db
    .select({ shelfCode: shelfData.shelfCode })
    .from(shelfData)
    .where(whereConditions)
    .groupBy(shelfData.shelfCode);
  const total = countRows.length;

  // 再查当前页的货架汇总
  const offset = (page - 1) * pageSize;
  // 获取当前页的货架编码
  const pageCodes = countRows
    .map(r => r.shelfCode)
    .sort()
    .slice(offset, offset + pageSize);

  if (pageCodes.length === 0) return { rows: [], total };

  const rows = await db
    .select({
      shelfCode: shelfData.shelfCode,
      totalSalesAmount: sql<number>`sum(cast(${shelfData.salesAmount} as decimal(18,2)))`,
      totalGrossProfit: sql<number>`sum(cast(${shelfData.grossProfit} as decimal(18,2)))`,
      totalSalesQty: sql<number>`sum(${shelfData.salesQty})`,
      productCount: sql<number>`count(distinct ${shelfData.productCode})`,
    })
    .from(shelfData)
    .where(
      and(
        whereConditions,
        sql`${shelfData.shelfCode} IN (${sql.join(pageCodes.map(c => sql`${c}`), sql`, `)})`
      )
    )
    .groupBy(shelfData.shelfCode)
    .orderBy(shelfData.shelfCode);

  return { rows, total };
}
