import { NextRequest, NextResponse } from "next/server";

const PROMPTS: Record<string, string> = {
  short: "A person with a stylish short haircut, realistic portrait photo, studio lighting",
  long: "A person with long flowing hair, realistic portrait photo, studio lighting",
  curly: "A person with beautiful curly hair, realistic portrait photo, studio lighting",
  ponytail: "A person with a high ponytail hairstyle, realistic portrait photo, studio lighting",
  bun: "A person with an elegant bun hairstyle, realistic portrait photo, studio lighting",
  bald: "A bald person with shaved head, realistic portrait photo, studio lighting",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const hairstyle = formData.get("hairstyle") as string | null;

    if (!hairstyle || !PROMPTS[hairstyle]) {
      return NextResponse.json({ error: "Invalid hairstyle" }, { status: 400 });
    }

    const prompt = PROMPTS[hairstyle];
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Return the Pollinations URL directly - the frontend will load this
    // We return the URL that will be used as src for the image
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&model=flux&nologo=true`;

    return NextResponse.json({ 
      url: imageUrl,
      message: "Image generation started. URL will load when ready."
    });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
