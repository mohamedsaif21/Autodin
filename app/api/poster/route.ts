import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

async function fetchPollinationsImage(prompt: string) {
  // Pollinations has multiple public endpoints; some environments get 401/JSON on one.
  // We try a primary URL, then fall back to an alternate URL.
  const encoded = encodeURIComponent(prompt);

  const candidates = [
    // Current endpoint used in the app
    `https://gen.pollinations.ai/image/${encoded}?model=zimage&width=1024&height=1024&safe=true`,
    // Alternate endpoint that often works for server-side fetch
    `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&safe=true&nologo=true`,
    // Same as #1 but without model (model can be rejected/changed server-side)
    `https://gen.pollinations.ai/image/${encoded}?width=1024&height=1024&safe=true`,
  ];

  const headers: Record<string, string> = {
    Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
    // Some providers block requests without UA/Referer.
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Referer: "https://gen.pollinations.ai/",
  };

  const attempts: Array<{
    url: string;
    status: number;
    contentType: string;
    bodySnippet?: string;
  }> = [];

  for (const url of candidates) {
    console.log("Fetching image from Pollinations:", url);
    const res = await fetch(url, { headers, cache: "no-store" });
    const contentType = res.headers.get("content-type") || "";

    if (res.ok && contentType.startsWith("image/")) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { ok: true as const, buffer, contentType, url };
    }

    // Capture some context for debugging; Pollinations often returns JSON on failure.
    let bodySnippet: string | undefined;
    try {
      const text = await res.text();
      bodySnippet = text.slice(0, 300);
    } catch {
      // ignore
    }

    attempts.push({ url, status: res.status, contentType, bodySnippet });
  }

  return { ok: false as const, attempts };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imagePrompt = body.imagePrompt || 'professional LinkedIn post background, modern clean design, business theme, blue gradient';

    console.log('Poster API - imagePrompt:', imagePrompt);

    const fetched = await fetchPollinationsImage(imagePrompt);
    if (!fetched.ok) {
      const first = fetched.attempts[0];
      const upstreamStatus = first?.status ?? 0;
      return NextResponse.json(
        {
          success: false,
          error: "Image generation failed (Pollinations did not return an image).",
          upstreamStatus,
          attempts: fetched.attempts.map(a => ({
            url: a.url,
            status: a.status,
            contentType: a.contentType,
          })),
        },
        // 502 = upstream failure (better than 500 for debugging)
        { status: 502 }
      );
    }

    const { buffer, contentType: fetchedContentType } = fetched;

    console.log('Image buffer size:', buffer.length);

    const postersDir = path.join(process.cwd(), "public", "posters");

    if (!fs.existsSync(postersDir)) {
      fs.mkdirSync(postersDir, { recursive: true });
    }

    const ext =
      fetchedContentType.includes("jpeg") || fetchedContentType.includes("jpg")
        ? "jpg"
        : fetchedContentType.includes("webp")
          ? "webp"
          : "png";
    const filename = `poster_${Date.now()}.${ext}`;
    const filePath = path.join(postersDir, filename);

    fs.writeFileSync(filePath, buffer);

    console.log('Image saved to:', filePath);

    return NextResponse.json({
      success: true,
      imageUrl: `/posters/${filename}`,
      filename,
    });
  } catch (error: any) {
    console.error('Poster API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
