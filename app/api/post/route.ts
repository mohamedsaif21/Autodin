import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption } = await req.json();

    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const personUrn = process.env.LINKEDIN_PERSON_URN;

    if (!accessToken || !personUrn) {
      return NextResponse.json(
        { success: false, error: "Missing LinkedIn env values" },
        { status: 400 }
      );
    }

    console.log("TOKEN EXISTS:", !!accessToken);
    console.log("PERSON URN:", personUrn);
    console.log("IMAGE URL:", imageUrl);

    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: personUrn,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      }
    );

    const registerData = await registerRes.json();

    console.log("REGISTER STATUS:", registerRes.status);
    console.log("REGISTER DATA:", JSON.stringify(registerData, null, 2));

    if (!registerRes.ok) {
      return NextResponse.json(
        {
          success: false,
          step: "registerUpload",
          status: registerRes.status,
          error: registerData,
        },
        { status: 400 }
      );
    }

    const uploadUrl =
      registerData.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;

    const assetUrn = registerData.value.asset;

    const cleanImageUrl = imageUrl.startsWith("/")
      ? imageUrl.substring(1)
      : imageUrl;

    const imagePath = path.join(process.cwd(), "public", cleanImageUrl);

    if (!fs.existsSync(imagePath)) {
      return NextResponse.json(
        {
          success: false,
          error: "Image file not found",
          imagePath,
        },
        { status: 404 }
      );
    }

    const imageBuffer = fs.readFileSync(imagePath);

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "image/png",
      },
      body: imageBuffer,
    });

    console.log("UPLOAD STATUS:", uploadRes.status);

    if (!uploadRes.ok) {
      const uploadText = await uploadRes.text();
      return NextResponse.json(
        {
          success: false,
          step: "uploadImage",
          status: uploadRes.status,
          error: uploadText,
        },
        { status: 400 }
      );
    }

    const postRes = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: personUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: caption,
            },
            shareMediaCategory: "IMAGE",
            media: [
              {
                status: "READY",
                description: {
                  text: caption.slice(0, 200),
                },
                media: assetUrn,
                title: {
                  text: "Autogram Post",
                },
              },
            ],
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const postData = await postRes.json();

    console.log("LINKEDIN CREATE POST STATUS:", postRes.status);
    console.log("LINKEDIN CREATE POST DATA:", JSON.stringify(postData, null, 2));

    if (!postRes.ok) {
      return NextResponse.json(
        {
          success: false,
          step: "createPost",
          status: postRes.status,
          error: postData,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      postId: postData.id,
      postData,
    });
  } catch (error: any) {
    console.error("POST ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
