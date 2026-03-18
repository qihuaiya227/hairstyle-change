import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("predictionId");

    if (!predictionId) {
      return NextResponse.json({ error: "No prediction ID provided" }, { status: 400 });
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "API token not configured" }, { status: 500 });
    }

    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: 500 });
    }

    const prediction = await response.json();

    // Check if completed
    if (prediction.status === "succeeded") {
      const output = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      return NextResponse.json({
        status: "succeeded",
        image: output,
      });
    } else if (prediction.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      });
    } else {
      return NextResponse.json({
        status: prediction.status,
      });
    }

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
