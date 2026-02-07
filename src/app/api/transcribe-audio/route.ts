import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});
const MODEL_NAME = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "Audio file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    // Use Gemini to transcribe
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Transcribe this audio exactly. Only output the transcription, nothing else.",
            },
            {
              inlineData: {
                mimeType: "audio/wav",
                data: base64Audio,
              },
            },
          ],
        },
      ],
    });

    const transcript = response.text?.trim() || "";

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error("Transcription failed:", error);
    return NextResponse.json(
      { success: false, error: "Transcription failed" },
      { status: 500 }
    );
  }
}
