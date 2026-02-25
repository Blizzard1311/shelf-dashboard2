import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";

const router = Router();

// 模版字段定义（与商品储位信息模版.xlsx 一致）
export const TEMPLATE_FIELDS = [
  "大类",
  "中类",
  "小类",
  "子类",
  "商品编码",
  "商品名称",
  "货架编码",
  "货架层数",
  "储位编码",
  "陈列面数",
  "陈列层数",
  "单层层数",
];

// 模版 CDN 地址
const TEMPLATE_URL =
  "https://files.manuscdn.com/user_upload_by_module/session_file/310070185010691470/adNwTWEyBDIfQTSO.xlsx";

// multer 内存存储（不写磁盘）
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    const extOk = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    if (allowed.includes(file.mimetype) || extOk) {
      cb(null, true);
    } else {
      cb(new Error("仅支持 Excel (.xlsx/.xls) 或 CSV (.csv) 格式"));
    }
  },
});

// GET /api/upload/template-url — 返回模版下载地址
router.get("/template-url", (_req, res) => {
  res.json({ url: TEMPLATE_URL, filename: "商品储位信息模版.xlsx" });
});

// POST /api/upload/parse — 解析上传文件
router.post("/parse", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "未收到文件" });
      return;
    }

    // 解析工作簿
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      res.status(400).json({ success: false, error: "文件中没有工作表" });
      return;
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: null,
    });

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: "文件内容为空" });
      return;
    }

    // 字段校验
    const uploadedFields = Object.keys(rows[0] as object);
    const missingFields = TEMPLATE_FIELDS.filter(
      (f) => !uploadedFields.includes(f)
    );
    const extraFields = uploadedFields.filter(
      (f) => !TEMPLATE_FIELDS.includes(f)
    );

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        error: "字段不匹配",
        missingFields,
        extraFields,
        message: `缺少字段：${missingFields.join("、")}`,
      });
      return;
    }

    // 过滤空行
    const validRows = rows.filter((row) =>
      TEMPLATE_FIELDS.some((f) => row[f] !== null && row[f] !== "")
    );

    if (validRows.length === 0) {
      res.status(400).json({ success: false, error: "文件中没有有效数据行" });
      return;
    }

    // 统计货架编码和商品编码
    const shelfCodes = new Set<string>();
    const productCodes = new Set<string>();

    for (const row of validRows) {
      const shelfCode = row["货架编码"];
      const productCode = row["商品编码"];
      if (shelfCode !== null && shelfCode !== "") {
        shelfCodes.add(String(shelfCode));
      }
      if (productCode !== null && productCode !== "") {
        productCodes.add(String(productCode));
      }
    }

    res.json({
      success: true,
      summary: {
        totalRows: validRows.length,
        shelfCodeCount: shelfCodes.size,
        shelfCodes: Array.from(shelfCodes).sort(),
        productCodeCount: productCodes.size,
        productCodes: Array.from(productCodes).sort(),
      },
      extraFields: extraFields.length > 0 ? extraFields : undefined,
    });
  } catch (err) {
    console.error("[upload/parse] error:", err);
    res.status(500).json({
      success: false,
      error: "文件解析失败，请检查文件格式是否正确",
    });
  }
});

export default router;
