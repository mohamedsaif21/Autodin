import fs from "fs";
import path from "path";

export class LinkedInPostError extends Error {
  statusCode: number;
  payload: Record<string, unknown>;

  constructor(message: string, statusCode: number, payload: Record<string, unknown>) {
    super(message);
    this.name = "LinkedInPostError";
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export async function publishToLinkedIn({
  imageUrl,
  caption,
}: {
  imageUrl: string;
  caption: string;
}) {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const personUrn = process.env.LINKEDIN_PERSON_URN;

  if (!accessToken || !personUrn) {
    throw new LinkedInPostError("Missing LinkedIn env values", 400, {
      success: false,
      error: "Missing LinkedIn env values",
    });
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
    throw new LinkedInPostError("LinkedIn register upload failed", 400, {
      success: false,
      step: "registerUpload",
      status: registerRes.status,
      error: registerData,
    });
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
    throw new LinkedInPostError("Image file not found", 404, {
      success: false,
      error: "Image file not found",
      imagePath,
    });
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
    throw new LinkedInPostError("LinkedIn image upload failed", 400, {
      success: false,
      step: "uploadImage",
      status: uploadRes.status,
      error: uploadText,
    });
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
    throw new LinkedInPostError("LinkedIn create post failed", 400, {
      success: false,
      step: "createPost",
      status: postRes.status,
      error: postData,
    });
  }

  return {
    postId: postData.id,
    postData,
  };
}
