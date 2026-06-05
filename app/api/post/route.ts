import { NextRequest, NextResponse } from "next/server";
import { LinkedInPostError, publishToLinkedIn } from "@/lib/linkedin";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption } = await req.json();
    const { postId, postData } = await publishToLinkedIn({ imageUrl, caption });

    return NextResponse.json({
      success: true,
      postId,
      postData,
    });
  } catch (error: any) {
    console.error("POST ERROR:", error);
    if (error instanceof LinkedInPostError) {
      return NextResponse.json(error.payload, { status: error.statusCode });
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
