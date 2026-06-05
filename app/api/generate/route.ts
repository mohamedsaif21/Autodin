import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  const { text, specialDay, type } = await req.json();

  // Check if API key is valid format (should start with AIza)
  const apiKey = process.env.GEMINI_API_KEY;
  const hasValidKey = apiKey && apiKey.startsWith('AIza');

  if (!hasValidKey) {
    console.warn('Invalid or missing Gemini API key. Using fallback content.');
    // Use fallback directly
    const fallbackText = text || specialDay || 'motivation and success';
    const fallbackData = {
      caption: `${fallbackText.charAt(0).toUpperCase() + fallbackText.slice(1)} is what drives real success.\n\nTake action today and create the future you envision.\n\nEvery step forward counts.\n\n#Success #Growth #LinkedIn #Motivation`,
      posterTitle: fallbackText.split(' ').slice(0, 3).map((w: string) => w.toUpperCase()).join(' ') || 'TAKE ACTION',
      posterSubtitle: 'Start your journey today',
      accentWord: fallbackText.split(' ')[0]?.toUpperCase() || 'ACTION',
      imagePrompt: `professional LinkedIn post image about ${fallbackText}, modern clean design, business theme, gradient background, no text overlay`,
      colorTheme: 'dark_purple',
      fallback: true
    };
    
    console.log('Generate API - Using Fallback:', fallbackData);
    return NextResponse.json(fallbackData);
  }

  const baseInstruction = `You are an expert LinkedIn content strategist and visual designer.
Return ONLY a valid JSON object. No markdown, no backticks, no explanation whatsoever.`;

  const prompt = type === 'calendar'
    ? `${baseInstruction}

Create a LinkedIn post for this special day: "${specialDay}"

Return exactly this JSON structure:
{
  "caption": "Professional LinkedIn caption, 3-4 sentences, warm but authoritative tone. End with 4-5 relevant hashtags.",
  "posterTitle": "2-4 ALL CAPS bold words for the poster headline",
  "posterSubtitle": "One supporting line, 7-10 words, sentence case",
  "accentWord": "Single most important word from posterTitle to highlight in accent color",
  "imagePrompt": "A beautiful, professional background image for a ${specialDay} LinkedIn post. Describe lighting, mood, colors, and visual elements. No text in image. Cinematic quality.",
  "colorTheme": "One of: dark_purple | warm_orange | deep_red | midnight_blue | forest_green"
}`
    : `${baseInstruction}

Create a LinkedIn post for this idea: "${text}"

Return exactly this JSON structure:
{
  "caption": "Professional LinkedIn caption, 3-4 sentences, conversational yet expert tone. End with 4-5 relevant hashtags.",
  "posterTitle": "2-4 ALL CAPS bold words capturing the core idea",
  "posterSubtitle": "One supporting line, 7-10 words, sentence case",
  "accentWord": "Single most important word from posterTitle to highlight in accent color",
  "imagePrompt": "A stunning, professional background image that visually represents: ${text}. Describe specific lighting (golden hour / moody studio / bright daylight), colors, compositional elements, and atmosphere. Photorealistic, no text, no people's faces, cinematic.",
  "colorTheme": "One of: dark_purple | warm_orange | deep_red | midnight_blue | forest_green"
}`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const raw = result.response.text()
      .replace(/```json/g, '').replace(/```/g, '').trim();

    const data = JSON.parse(raw);

    if (!data.caption || !data.posterTitle || !data.imagePrompt) {
      throw new Error('Incomplete response from Gemini');
    }

    console.log('Generate API - Success:', data);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Generate error:', err);
    
    // Fallback content
    const fallbackText = text || specialDay || 'motivation and success';
    const fallbackData = {
      caption: `${fallbackText.charAt(0).toUpperCase() + fallbackText.slice(1)} is what drives real success.\n\nTake action today and create the future you envision.\n\nEvery step forward counts.\n\n#Success #Growth #LinkedIn #Motivation`,
      posterTitle: fallbackText.split(' ').slice(0, 3).map((w: string) => w.toUpperCase()).join(' ') || 'TAKE ACTION',
      posterSubtitle: 'Start your journey today',
      accentWord: fallbackText.split(' ')[0]?.toUpperCase() || 'ACTION',
      imagePrompt: `professional LinkedIn post image about ${fallbackText}, modern clean design, business theme, gradient background, no text overlay`,
      colorTheme: 'dark_purple',
      fallback: true,
      error: err.message
    };
    
    console.log('Generate API - Using Fallback:', fallbackData);
    
    return NextResponse.json(fallbackData);
  }
}
