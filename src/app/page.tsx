"use client";

import { useState, useRef, useCallback } from "react";

type Hairstyle = "short" | "long" | "curly" | "ponytail" | "bun" | "bald";

interface HairstyleOption {
  id: Hairstyle;
  name: string;
  emoji: string;
}

const HAIRSTYLES: HairstyleOption[] = [
  { id: "short", name: "短发", emoji: "👦" },
  { id: "long", name: "长发", emoji: "👩" },
  { id: "curly", name: "卷发", emoji: "👱‍♀️" },
  { id: "ponytail", name: "马尾", emoji: "💁‍♀️" },
  { id: "bun", name: "丸子头", emoji: "🧑‍🎓" },
  { id: "bald", name: "光头", emoji: "😎" },
];

type Step = "upload" | "preview" | "processing" | "result";
type ProcessingStatus = "uploading" | "processing" | "complete" | "error";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<Hairstyle | null>(
    null
  );
  const [processingStatus, setProcessingStatus] =
    useState<ProcessingStatus>("uploading");
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const predictionIdRef = useRef<string | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|jpg)$/)) {
      setErrorMessage("请上传 JPG 或 PNG 格式的图片");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("图片大小不能超过 10MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setStep("preview");
    setErrorMessage(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleStartOver = useCallback(() => {
    setStep("upload");
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedHairstyle(null);
    setProcessingStatus("uploading");
    setResultImage(null);
    setErrorMessage(null);
    predictionIdRef.current = null;
  }, [previewUrl]);

  const handleGenerate = useCallback(async () => {
    if (!selectedFile || !selectedHairstyle) return;

    setStep("processing");
    setProcessingStatus("uploading");
    setErrorMessage(null);

    try {
      // Start prediction
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("hairstyle", selectedHairstyle);

      const response = await fetch("/api/replicate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start processing");
      }

      const { predictionId } = await response.json();
      predictionIdRef.current = predictionId;
      setProcessingStatus("processing");

      // Poll for result
      pollForResult(predictionId);
    } catch (error) {
      setProcessingStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "处理失败，请重试"
      );
    }
  }, [selectedFile, selectedHairstyle]);

  const pollForResult = useCallback((predictionId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/predict?predictionId=${predictionId}`);
        const data = await response.json();

        if (data.status === "succeeded") {
          setProcessingStatus("complete");
          // Output is usually an array, first element is the image URL
          const imageUrl = Array.isArray(data.output)
            ? data.output[0]
            : data.output;
          setResultImage(imageUrl);
          setStep("result");
        } else if (data.status === "failed") {
          setProcessingStatus("error");
          setErrorMessage(data.error || "处理失败，请重试");
        } else {
          // Still processing, poll again
          setTimeout(poll, 2000);
        }
      } catch (error) {
        setProcessingStatus("error");
        setErrorMessage("查询结果失败，请重试");
      }
    };

    // Start polling after a short delay
    setTimeout(poll, 3000);
  }, []);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;

    const link = document.createElement("a");
    link.href = resultImage;
    link.download = `hairstyle-${selectedHairstyle}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [resultImage, selectedHairstyle]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="py-8 text-center">
        <h1 className="text-4xl font-bold gradient-text mb-2">AI 发型替换</h1>
        <p className="text-gray-400 text-lg">
          上传照片，AI 帮你换个新发型
        </p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-12">
        {/* Step 1: Upload */}
        {step === "upload" && (
          <div
            className={`upload-zone rounded-2xl p-12 text-center cursor-pointer ${
              isDragOver ? "drag-over" : ""
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={handleInputChange}
            />
            <div className="text-6xl mb-4">📸</div>
            <p className="text-xl font-medium mb-2">
              点击或拖拽上传照片
            </p>
            <p className="text-gray-500 text-sm">
              支持 JPG/PNG，最大 10MB
            </p>
            {errorMessage && (
              <p className="text-red-400 mt-4">{errorMessage}</p>
            )}
          </div>
        )}

        {/* Step 2: Preview & Select */}
        {step === "preview" && previewUrl && (
          <div className="space-y-6">
            {/* Image Preview */}
            <div className="rounded-2xl overflow-hidden gradient-border">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-auto max-h-96 object-contain bg-[#1a1a1a]"
              />
            </div>

            {/* Hairstyle Selection */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-center">
                选择发型
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {HAIRSTYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedHairstyle(style.id)}
                    className={`hairstyle-card p-4 rounded-xl bg-[#1a1a1a] border-2 transition-all ${
                      selectedHairstyle === style.id
                        ? "border-[#667eea] shadow-lg shadow-purple-500/20"
                        : "border-transparent hover:border-gray-600"
                    }`}
                  >
                    <div className="text-4xl mb-2">{style.emoji}</div>
                    <div className="text-sm font-medium">{style.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleStartOver}
                className="flex-1 py-4 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors font-medium"
              >
                重新上传
              </button>
              <button
                onClick={handleGenerate}
                disabled={!selectedHairstyle}
                className={`flex-1 py-4 rounded-xl font-medium transition-all ${
                  selectedHairstyle
                    ? "gradient-bg hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/30"
                    : "bg-gray-700 cursor-not-allowed opacity-50"
                }`}
              >
                🚀 开始生成
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processing */}
        {step === "processing" && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-bg mb-6">
              <div className="text-3xl">✨</div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {processingStatus === "uploading" && "上传中..."}
              {processingStatus === "processing" && "AI 处理中..."}
            </h2>
            <p className="text-gray-400 mb-4">
              {processingStatus === "uploading" && "正在上传图片..."}
              {processingStatus === "processing" && "预计需要 30-60 秒"}
            </p>

            {/* Progress indicator */}
            <div className="max-w-xs mx-auto">
              <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className={`h-full gradient-bg shimmer ${
                    processingStatus === "uploading"
                      ? "w-1/3"
                      : "w-2/3 animate-pulse"
                  }`}
                />
              </div>
            </div>

            {errorMessage && (
              <div className="mt-6">
                <p className="text-red-400 mb-4">{errorMessage}</p>
                <button
                  onClick={handleStartOver}
                  className="px-6 py-2 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors"
                >
                  重新开始
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Result */}
        {step === "result" && resultImage && (
          <div className="space-y-6">
            {/* Result Image */}
            <div className="rounded-2xl overflow-hidden gradient-border">
              <img
                src={resultImage}
                alt="Result"
                className="w-full h-auto max-h-96 object-contain bg-[#1a1a1a]"
              />
            </div>

            <p className="text-center text-green-400 font-medium">
              ✨ 处理完成！
            </p>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleDownload}
                className="flex-1 py-4 rounded-xl gradient-bg hover:opacity-90 hover:shadow-lg hover:shadow-purple-500/30 font-medium transition-all"
              >
                📥 下载图片
              </button>
              <button
                onClick={handleStartOver}
                className="flex-1 py-4 rounded-xl bg-[#1a1a1a] hover:bg-[#2a2a2a] transition-colors font-medium"
              >
                🔄 重新开始
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-gray-500 text-sm">
        <p>头像仅用于本次处理，不存储服务器</p>
      </footer>
    </div>
  );
}
