import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

interface HairstylePrompt {
  short: string;
  long: string;
  curly: string;
  ponytail: string;
  bun: string;
  bald: string;
}

const HAIRSTYLE_PROMPTS: HairstylePrompt = {
  short: "Change the person's hairstyle to a short haircut, keep the face and identity unchanged, realistic photo",
  long: "Change the person's hairstyle to long hair, keep the face and identity unchanged, realistic photo",
  curly: "Change the person's hairstyle to curly hair, keep the face and identity unchanged, realistic photo",
  ponytail: "Change the person's hairstyle to a ponytail, keep the face and identity unchanged, realistic photo",
  bun: "Change the person's hairstyle to a bun hairstyle, keep the face and identity unchanged, realistic photo",
  bald: "Change the person's hairstyle to bald/shaved head, keep the face and identity unchanged, realistic photo",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const hairstyle = formData.get("hairstyle") as string | null;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!hairstyle || !HAIRSTYLE_PROMPTS[hairstyle as keyof HairstylePrompt]) {
      return NextResponse.json({ error: "Invalid hairstyle" }, { status: 400 });
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    // Convert image to base64
    const imageBuffer = await image.arrayBuffer();
    const imageBase64 = Buffer.from(imageBuffer).toString("base64");
    const imageDataUrl = `data:${image.type};base64,${imageBase64}`;

    // Create prediction on Replicate
    const createResponse = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version:
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        input: {
          prompt: HAIRSTYLE_PROMPTS[hairstyle as keyof HairstylePrompt],
          image: imageDataUrl,
          strength: 0.7,
          guidance_scale: 7.5,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error("Replicate create error:", error);
      return NextResponse.json(
        { error: "Failed to create prediction" },
        { status: 500 }
      );
    }

    const prediction = await createResponse.json();

    return NextResponse.json({
      predictionId: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
