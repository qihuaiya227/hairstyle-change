"use client";

import { useState, useRef, useCallback } from "react";

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

export default function Home() {
  const [imageData, setImageData] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<Hairstyle | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setFileSize(file.size);
    setResultUrl(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageData(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePresetClick = useCallback((preset: Preset) => {
    setSelectedPreset(preset.id);
    setCustomPrompt(preset.prompt);
  }, []);

  const handleGenerate = useCallback(async () => {
    const promptToUse = customPrompt.trim();
    
    if (!promptToUse) {
      setError("请选择预设或输入自定义描述");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResultUrl(null);

    try {
      // Build the Pollinations URL directly
      const encodedPrompt = encodeURIComponent(promptToUse);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&model=flux&nologo=true&seed=${Date.now()}`;
      
      setResultUrl(imageUrl);
    } catch (err) {
      setError("生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }, [customPrompt]);

  const handleReset = useCallback(() => {
    setImageData(null);
    setSelectedPreset(null);
    setCustomPrompt("");
    setError(null);
    setResultUrl(null);
    setFileName("");
    setFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

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
              ✨ 生成结果
            </div>
            <div className="flex flex-col items-center justify-center min-h-[200px] bg-[#1a1a1a]">
              {resultUrl ? (
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
            onClick={() => fileInputRef.current?.click()}
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

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!customPrompt.trim() || isGenerating}
          className={`w-full py-3 rounded-xl font-medium text-base transition-all ${
            customPrompt.trim() && !isGenerating
              ? "bg-gradient-to-r from-[#667eea] to-[#764ba2] hover:opacity-90"
              : "bg-gray-700 cursor-not-allowed opacity-50"
          }`}
        >
          {isGenerating ? "✨ 生成中..." : "🚀 开始生成"}
        </button>

        {/* Error */}
        {error && (
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
        <p>使用 Pollinations AI 免费生成</p>
      </footer>
    </div>
  );
}
