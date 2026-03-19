import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// Stability AI img2img model on Replicate
const MODEL_VERSION = "db275e8e-8a10-410b-a6f0-36f6b0d83a60";

export async function POST(request: NextRequest) {
  if (!REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "Replicate API token 未配置，请联系管理员设置 REPLICATE_API_TOKEN 环境变量" },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const imageBase64 = formData.get("image") as string | null;
    const prompt = formData.get("prompt") as string | null;

    if (!imageBase64 || !prompt) {
      return NextResponse.json({ error: "缺少图片或描述" }, { status: 400 });
    }

    // Convert data URL to blob for upload
    const imageBuffer = Buffer.from(imageBase64.split(",")[1], "base64");
    const imageBlob = new Blob([imageBuffer], { type: "image/jpeg" });

    // Build multipart form for Replicate
    const replicateFormData = new FormData();
    replicateFormData.append("version", MODEL_VERSION);
    replicateFormData.append("input", JSON.stringify({
      prompt: prompt + ", keep the face and identity exactly the same, only change the hairstyle, realistic portrait photo, high quality",
      negative_prompt: "cartoon, anime, illustration, painting, drawing, art, low quality, blurry, bad anatomy, deformed, watermark, text",
      image: imageBase64,
      strength: 0.7,
      guidance_scale: 7.5,
      num_inference_steps: 50,
    }));

    // Create prediction
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Token ${REPLICATE_API_TOKEN}`,
      },
      body: replicateFormData,
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("Replicate create error:", errText);
      return NextResponse.json({ error: "AI 服务调用失败" }, { status: 500 });
    }

    const prediction = await createRes.json();
    return NextResponse.json({ predictionId: prediction.id });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
