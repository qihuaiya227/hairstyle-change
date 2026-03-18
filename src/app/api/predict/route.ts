import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const predictionId = searchParams.get("predictionId");

    if (!predictionId) {
      return NextResponse.json(
        { error: "No prediction ID provided" },
        { status: 400 }
      );
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: "Replicate API token not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${REPLICATE_API_URL}/${predictionId}`,
      {
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Replicate poll error:", error);
      return NextResponse.json(
        { error: "Failed to get prediction status" },
        { status: 500 }
      );
    }

    const prediction = await response.json();

    return NextResponse.json({
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
