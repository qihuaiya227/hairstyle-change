"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Hairstyle = "short" | "long" | "curly" | "ponytail" | "bun" | "bald";

interface Preset {
  id: Hairstyle;
  name: string;
  emoji: string;
  prompt: string;
}

const PRESETS: Preset[] = [
  { id: "short", name: "短发", emoji: "👦", prompt: "A person with a stylish short haircut, realistic portrait photo, studio lighting" },
  { id: "long", name: "长发", emoji: "👩", prompt: "A person with long flowing hair, realistic portrait photo, studio lighting" },
  { id: "curly", name: "卷发", emoji: "👱‍♀️", prompt: "A person with beautiful curly hair, realistic portrait photo, studio lighting" },
  { id: "ponytail", name: "马尾", emoji: "💁‍♀️", prompt: "A person with a high ponytail hairstyle, realistic portrait photo, studio lighting" },
  { id: "bun", name: "丸子头", emoji: "🧑‍🎓", prompt: "A person with an elegant bun hairstyle, realistic portrait photo, studio lighting" },
  { id: "bald", name: "光头", emoji: "😎", prompt: "A bald person with shaved head, realistic portrait photo, studio lighting" },
];

// HuggingFace Inference API - text-to-image
async function generateWithHF(prompt: string, hfToken: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: prompt,
        options: {
          wait_for_model: true,
        },
      }),
      signal,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HF API error: ${response.status}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export default function Home() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Hairstyle | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [hfToken, setHfToken] = useState<string>("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [generationTime, setGenerationTime] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 从 sessionStorage 读取 token
  useEffect(() => {
    const saved = sessionStorage.getItem("hf_token");
    if (saved) {
      setHfToken(saved);
      setShowTokenInput(false);
    } else {
      setShowTokenInput(true);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setError("请上传 JPG 或 PNG 格式的图片");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("图片大小不能超过 10MB");
      return;
    }

    setError(null);
    setFileName(file.name);
    setResultUrl(null);
    setGenerationTime("");

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Fix: 解决同文件无法重复上传的问题
  const handleReuploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    fileInputRef.current?.click();
  }, []);

  const handlePresetClick = useCallback((preset: Preset) => {
    setSelectedPreset(preset.id);
    setCustomPrompt(preset.prompt);
  }, []);

  const handleTokenSave = useCallback((token: string) => {
    const trimmed = token.trim();
    if (!trimmed.startsWith("hf_")) {
      setError("Token 格式不对，应以 hf_ 开头");
      return;
    }
    setHfToken(trimmed);
    sessionStorage.setItem("hf_token", trimmed);
    setShowTokenInput(false);
    setError(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    const promptToUse = customPrompt.trim();

    if (!promptToUse) {
      setError("请选择预设或输入自定义描述");
      return;
    }

    if (!hfToken) {
      setError("请先填写 HuggingFace Token");
      setShowTokenInput(true);
      return;
    }

    // 清理旧的结果 URL
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    setResultUrl(null);
    setGenerationTime("");
    const startTime = Date.now();

    try {
      setGenerationTime("模型加载中（首次可能较慢）...");

      const imageBlobUrl = await generateWithHF(
        promptToUse,
        hfToken,
        abortControllerRef.current.signal
      );

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      setGenerationTime(`生成成功 (${elapsed}秒)`);
      setResultUrl(imageBlobUrl);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("请求已取消");
      } else if (err.message?.includes("401")) {
        setError("Token 无效，请检查 HF Token 是否正确");
        setShowTokenInput(true);
      } else if (err.message?.includes("403")) {
        setError("Token 权限不足，需要有 Inference API 访问权限");
        setShowTokenInput(true);
      } else if (err.message?.includes("503") || err.message?.includes("Model is currently loading")) {
        setError("模型正在加载中，请稍等几秒再试");
        setGenerationTime("");
      } else {
        setError(err.message || "生成失败，请重试");
        setGenerationTime("");
      }
    } finally {
      setIsGenerating(false);
    }
  }, [customPrompt, hfToken, resultUrl]);

  const handleReset = useCallback(() => {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setImageData(null);
    setSelectedPreset(null);
    setCustomPrompt("");
    setError(null);
    setResultUrl(null);
    setFileName("");
    setGenerationTime("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resultUrl]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Header */}
      <header className="py-6 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent mb-1">
          AI 发型替换
        </h1>
        <p className="text-gray-400 text-sm">上传照片 + 选择/输入发型描述</p>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 pb-8 space-y-5">

        {/* Token Input */}
        {showTokenInput && (
          <div className="rounded-xl bg-[#1a1a1a] border border-gray-700 p-4 space-y-3">
            <div className="text-center text-sm text-gray-300">
              <p className="mb-1">🔑 首次使用需要 HuggingFace Token（免费）</p>
              <p className="text-xs text-gray-500">
                获得方式：HF 设置 → Access Tokens → New Token → 选 <code className="bg-gray-800 px-1 rounded">Read</code> 类型
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="hf_xxxxxxxxxx"
                className="flex-1 px-4 py-2 rounded-lg bg-[#252525] border border-gray-600 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#667eea]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTokenSave((e.target as HTMLInputElement).value);
                  }
                }}
                id="hf-token-input"
              />
              <button
                onClick={() => handleTokenSave((document.getElementById("hf-token-input") as HTMLInputElement).value)}
                className="px-4 py-2 rounded-lg bg-[#667eea] hover:bg-[#5568d4] text-white text-sm font-medium transition-colors"
              >
                确定
              </button>
            </div>
            {error && error.includes("Token") && (
              <div className="text-red-400 text-xs text-center">{error}</div>
            )}
          </div>
        )}

        {/* Upload Area */}
        {!imageData && (
          <div
            className="border-2 border-dashed border-gray-700 rounded-2xl p-6 text-center cursor-pointer hover:border-[#667eea] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="text-4xl mb-2">📸</div>
            <p className="text-base font-medium mb-1">点击上传照片</p>
            <p className="text-gray-500 text-xs">支持 JPG/PNG，最大 10MB</p>
          </div>
        )}

        {/* Result - Side by Side Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Original */}
          <div className="rounded-xl bg-[#1a1a1a] overflow-hidden">
            <div className="px-3 py-2 bg-[#252525] text-center text-xs text-gray-400">
              原图 {fileName && `(${fileName})`}
            </div>
            <div className="flex items-center justify-center min-h-[200px] bg-[#1a1a1a]">
              {imageData ? (
                <img
                  src={imageData}
                  alt="原图"
                  className="max-w-full max-h-[300px] object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm">上传照片后显示</div>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="rounded-xl bg-[#1a1a1a] overflow-hidden">
            <div className="px-3 py-2 bg-[#252525] text-center text-xs text-green-400">
              ✨ 生成结果 {generationTime && <span className="text-gray-500 ml-1">({generationTime})</span>}
            </div>
            <div className="flex flex-col items-center justify-center min-h-[200px] bg-[#1a1a1a]">
              {isGenerating ? (
                <div className="text-center">
                  <div className="text-3xl mb-2 animate-pulse">✨</div>
                  <div className="text-gray-400 text-sm">AI 生成中，请稍候...</div>
                </div>
              ) : resultUrl ? (
                <img
                  src={resultUrl}
                  alt="结果"
                  className="max-w-full max-h-[300px] object-contain"
                />
              ) : (
                <div className="text-gray-500 text-sm">点击生成后显示</div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Button (shown when image exists) */}
        {imageData && (
          <button
            onClick={handleReuploadClick}
            className="w-full py-2 rounded-xl bg-[#252525] hover:bg-[#333] transition-colors text-sm"
          >
            📷 重新上传照片
          </button>
        )}

        {/* Presets */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-center">选择发型预设</h2>
          <div className="grid grid-cols-6 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedPreset === preset.id
                    ? "border-[#667eea] bg-[#667eea]/20"
                    : "border-transparent bg-[#1a1a1a] hover:bg-[#2a2a2a]"
                }`}
              >
                <div className="text-2xl mb-1">{preset.emoji}</div>
                <div className="text-xs font-medium">{preset.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Prompt Input */}
        <div>
          <h2 className="text-lg font-semibold mb-2 text-center">自定义描述</h2>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="输入你想要的发型描述...（选择预设会自动填入）"
            className="w-full h-20 px-4 py-3 rounded-xl bg-[#1a1a1a] border border-gray-700 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-[#667eea] transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1 text-center">
            选择预设会自动填入，也可手动修改
          </p>
        </div>

        {/* Token toggle */}
        {!showTokenInput && (
          <button
            onClick={() => {
              setShowTokenInput(true);
              setHfToken("");
              sessionStorage.removeItem("hf_token");
            }}
            className="w-full py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors text-xs text-gray-500"
          >
            🔑 更换 HuggingFace Token
          </button>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!customPrompt.trim() || isGenerating || !hfToken}
          className={`w-full py-3 rounded-xl font-medium text-base transition-all ${
            customPrompt.trim() && !isGenerating && hfToken
              ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90"
              : "bg-gray-700 cursor-not-allowed opacity-50"
          }`}
        >
          {isGenerating ? "✨ 生成中..." : "🚀 开始生成"}
        </button>

        {/* Error */}
        {error && !error.includes("Token") && (
          <div className="text-center text-red-400 text-sm">{error}</div>
        )}

        {/* Reset Button */}
        <button
          onClick={handleReset}
          className="w-full py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors font-medium text-sm"
        >
          🔄 重新开始
        </button>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-xs">
        <p>使用 HuggingFace Inference API 免费额度生成</p>
      </footer>
    </div>
  );
}
