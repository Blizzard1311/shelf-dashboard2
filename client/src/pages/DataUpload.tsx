import { useState, useRef, useCallback } from "react";
import { Download, Upload, CheckCircle2, XCircle, FileSpreadsheet, BarChart2, Package } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// 模版字段列表
const TEMPLATE_FIELDS = [
  "大类", "中类", "小类", "子类",
  "商品编码", "商品名称", "货架编码", "货架层数",
  "储位编码", "陈列面数", "陈列层数", "单层层数",
  "销售数量", "销售金额", "合计销售金额", "合计销售毛利额",
];

interface ParseResult {
  success: boolean;
  error?: string;
  missingFields?: string[];
  extraFields?: string[];
  message?: string;
  summary?: {
    totalRows: number;
    shelfCodeCount: number;
    shelfCodes: string[];
    productCodeCount: number;
    productCodes: string[];
  };
}

export default function DataUpload() {
  const { isAuthenticated, loading } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 模版下载
  const handleTemplateDownload = async () => {
    try {
      const res = await fetch("/api/upload/template-url");
      const data = await res.json();
      const a = document.createElement("a");
      a.href = data.url;
      a.download = data.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("模版下载已开始");
    } catch {
      toast.error("模版下载失败，请稍后重试");
    }
  };

  // 处理文件选择
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext || "")) {
      toast.error("仅支持 Excel (.xlsx/.xls) 或 CSV (.csv) 格式");
      return;
    }
    setSelectedFile(file);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // 执行上传解析
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("请先选择文件");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch("/api/upload/parse", {
        method: "POST",
        body: formData,
      });
      const data: ParseResult = await res.json();
      setResult(data);
      if (data.success) {
        toast.success("文件解析成功");
      } else {
        toast.error(data.message || data.error || "解析失败");
      }
    } catch {
      toast.error("上传失败，请检查网络后重试");
    } finally {
      setUploading(false);
    }
  };

  const resetFile = () => {
    setSelectedFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "oklch(0.55 0.18 260)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center max-w-sm">
          <h2 className="text-lg font-bold text-foreground mb-2">请先登录</h2>
          <p className="text-sm text-muted-foreground mb-4">访问此页面需要登录。</p>
          <a href={getLoginUrl()}>
            <Button style={{ background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))" }}>
              立即登录
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
              boxShadow: "0 4px 12px oklch(0.55 0.18 260 / 0.35)",
            }}
          >
            <Upload className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">数据上传</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-12">
          上传商品储位信息文件，支持 Excel 和 CSV 格式
        </p>
      </div>

      {/* 两个主要操作卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 模版下载卡片 */}
        <div
          className="bg-white rounded-2xl p-6 flex flex-col gap-4"
          style={{ boxShadow: "0 2px 16px oklch(0 0 0 / 0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
                boxShadow: "0 4px 12px oklch(0.55 0.18 260 / 0.35)",
              }}
            >
              <Download className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">模版下载</h2>
              <p className="text-xs text-muted-foreground">商品储位信息标准模版</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            下载标准模版文件，按照模版格式填写商品储位信息后再上传。
          </p>

          {/* 字段列表 */}
          <div className="bg-muted/40 rounded-xl p-3 flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">模版包含字段</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_FIELDS.map((f) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 rounded-full bg-white border border-border text-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={handleTemplateDownload}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, oklch(0.55 0.18 260), oklch(0.50 0.20 280))",
              boxShadow: "0 4px 14px oklch(0.55 0.18 260 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.15)",
            }}
          >
            <Download className="w-4 h-4" />
            下载模版
          </button>
        </div>

        {/* 数据上传卡片 */}
        <div
          className="bg-white rounded-2xl p-6 flex flex-col gap-4"
          style={{ boxShadow: "0 2px 16px oklch(0 0 0 / 0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.55 0.18 200))",
                boxShadow: "0 4px 12px oklch(0.65 0.15 185 / 0.35)",
              }}
            >
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">数据上传</h2>
              <p className="text-xs text-muted-foreground">上传填写好的储位信息文件</p>
            </div>
          </div>

          {/* 拖拽上传区域 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-5 text-center transition-all duration-200
              ${isDragging
                ? "border-teal-400 bg-teal-50 cursor-copy"
                : selectedFile
                ? "border-teal-300 bg-teal-50/50 cursor-default"
                : "border-border hover:border-teal-300 hover:bg-muted/30 cursor-pointer"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleInputChange}
            />
            {selectedFile ? (
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-teal-500 flex-shrink-0" />
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); resetFile(); }}
                  className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
                >
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-1 py-2">
                <Upload className="w-7 h-7 text-muted-foreground mx-auto" />
                <p className="text-sm text-foreground font-medium">点击或拖拽文件到此处</p>
                <p className="text-xs text-muted-foreground">支持 .xlsx · .xls · .csv，最大 20MB</p>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 mt-auto"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.15 185), oklch(0.55 0.18 200))",
              boxShadow: "0 4px 14px oklch(0.65 0.15 185 / 0.4), inset 0 1px 0 oklch(1 0 0 / 0.15)",
            }}
          >
            {uploading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                解析中...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                上传并解析
              </>
            )}
          </button>
        </div>
      </div>

      {/* 解析结果展示 */}
      {result && (
        <div
          className="bg-white rounded-2xl p-6"
          style={{ boxShadow: "0 2px 16px oklch(0 0 0 / 0.07)" }}
        >
          {result.success ? (
            <div className="space-y-5">
              {/* 成功标题 */}
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-500" />
                <h3 className="font-semibold text-foreground">解析成功</h3>
                <span className="text-xs text-muted-foreground ml-auto">
                  共 {result.summary!.totalRows} 条有效数据
                </span>
              </div>

              {/* 统计卡片 */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="rounded-xl p-4"
                  style={{ background: "linear-gradient(135deg, oklch(0.97 0.02 260), oklch(0.95 0.03 280))" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-medium text-muted-foreground">货架编码</span>
                  </div>
                  <p className="text-3xl font-bold text-indigo-600">
                    {result.summary!.shelfCodeCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">组货架</p>
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{ background: "linear-gradient(135deg, oklch(0.97 0.02 185), oklch(0.95 0.03 200))" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-teal-500" />
                    <span className="text-xs font-medium text-muted-foreground">商品编码</span>
                  </div>
                  <p className="text-3xl font-bold text-teal-600">
                    {result.summary!.productCodeCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">个商品</p>
                </div>
              </div>

              {/* 货架编码列表 */}
              {result.summary!.shelfCodes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    货架编码列表（{result.summary!.shelfCodes.length} 组）
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {result.summary!.shelfCodes.map((code) => (
                      <span
                        key={code}
                        className="text-xs px-2.5 py-1 rounded-full font-medium"
                        style={{
                          background: "oklch(0.95 0.03 260)",
                          color: "oklch(0.45 0.18 260)",
                        }}
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 额外字段提示 */}
              {result.extraFields && result.extraFields.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-amber-500 text-sm mt-0.5">⚠</span>
                  <p className="text-xs text-amber-700">
                    文件包含模版外的额外字段，已忽略：{result.extraFields.join("、")}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-semibold text-foreground">字段校验失败</h3>
              </div>
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {result.message || result.error}
              </p>
              {result.missingFields && result.missingFields.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">缺少以下字段</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.missingFields.map((f) => (
                      <span
                        key={f}
                        className="text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                请下载标准模版，按照模版格式填写后重新上传。
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
