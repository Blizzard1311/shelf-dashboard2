import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import { TEMPLATE_FIELDS } from "./upload.route";

// 辅助：生成 Excel buffer
function makeExcelBuffer(headers: string[], rows: Record<string, unknown>[] = []) {
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [Object.fromEntries(headers.map(h => [h, "test"]))]);
  // 如果没有 rows，手动设置 header 行
  if (rows.length === 0) {
    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: "A1" });
    // 删除第二行（json_to_sheet 自动加的数据行）
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet([headers]), "Sheet1");
    return XLSX.write(wb2, { type: "buffer", bookType: "xlsx" }) as Buffer;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// 辅助：模拟解析逻辑（与 upload.route.ts 保持一致）
function parseBuffer(buffer: Buffer): {
  success: boolean;
  error?: string;
  missingFields?: string[];
  summary?: { totalRows: number; shelfCodeCount: number; productCodeCount: number };
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { success: false, error: "文件中没有工作表" };

  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  if (rows.length === 0) return { success: false, error: "文件内容为空" };

  const uploadedFields = Object.keys(rows[0] as object);
  const missingFields = TEMPLATE_FIELDS.filter(f => !uploadedFields.includes(f));
  if (missingFields.length > 0) return { success: false, error: "字段不匹配", missingFields };

  const validRows = rows.filter(row => TEMPLATE_FIELDS.some(f => row[f] !== null && row[f] !== ""));
  if (validRows.length === 0) return { success: false, error: "文件内容为空" };

  const shelfCodes = new Set(validRows.map(r => String(r["货架编码"])).filter(v => v && v !== "null"));
  const productCodes = new Set(validRows.map(r => String(r["商品编码"])).filter(v => v && v !== "null"));

  return {
    success: true,
    summary: { totalRows: validRows.length, shelfCodeCount: shelfCodes.size, productCodeCount: productCodes.size },
  };
}

describe("TEMPLATE_FIELDS", () => {
  it("应包含 15 个字段", () => {
    expect(TEMPLATE_FIELDS).toHaveLength(15);
  });

  it("应包含货架编码和商品编码", () => {
    expect(TEMPLATE_FIELDS).toContain("货架编码");
    expect(TEMPLATE_FIELDS).toContain("商品编码");
  });
});

describe("upload parse logic", () => {
  it("字段完整且有数据时解析成功", () => {
    const rows = [
      { 大类: "A", 中类: "B", 小类: "C", 子类: "D", 商品编码: "P001", 商品名称: "商品1", 货架编码: "S01", 货架层数: 3, 储位编码: "S01-1", 陈列面数: 2, 陈列层数: 1, 单层层数: 4, 销售数量: 10, 销售金额: 100, 销售毛利: 10 },
      { 大类: "A", 中类: "B", 小类: "C", 子类: "D", 商品编码: "P002", 商品名称: "商品2", 货架编码: "S01", 货架层数: 3, 储位编码: "S01-2", 陈列面数: 2, 陈列层数: 1, 单层层数: 4, 销售数量: 20, 销售金额: 200, 销售毛利: 20 },
      { 大类: "A", 中类: "B", 小类: "C", 子类: "D", 商品编码: "P003", 商品名称: "商品3", 货架编码: "S02", 货架层数: 3, 储位编码: "S02-1", 陈列面数: 2, 陈列层数: 1, 单层层数: 4, 销售数量: 15, 销售金额: 150, 销售毛利: 15 },
    ];
    const buf = makeExcelBuffer(TEMPLATE_FIELDS, rows);
    const result = parseBuffer(buf);
    expect(result.success).toBe(true);
    expect(result.summary?.totalRows).toBe(3);
    expect(result.summary?.shelfCodeCount).toBe(2); // S01, S02
    expect(result.summary?.productCodeCount).toBe(3); // P001, P002, P003
  });

  it("缺少字段时返回失败和缺失字段列表", () => {
    const incompleteRows = [{ 大类: "A", 商品编码: "P001" }];
    const ws = XLSX.utils.json_to_sheet(incompleteRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
    const result = parseBuffer(buf);
    expect(result.success).toBe(false);
    expect(result.missingFields).toBeDefined();
    expect(result.missingFields!.length).toBeGreaterThan(0);
    expect(result.missingFields).toContain("货架编码");
  });

  it("只有表头无数据时返回内容为空", () => {
    const buf = makeExcelBuffer(TEMPLATE_FIELDS);
    const result = parseBuffer(buf);
    expect(result.success).toBe(false);
    expect(result.error).toContain("空");
  });
});
