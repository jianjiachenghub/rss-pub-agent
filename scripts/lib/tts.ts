import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function synthesizeSpeech(
  script: string,
  voices: string[] = ["Kore", "Puck"]
): Promise<Buffer> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: script,
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            {
              speaker: "A",
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voices[0] },
              },
            },
            {
              speaker: "B",
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voices[1] },
              },
            },
          ],
        },
      },
    },
  } as any);

  const audioData = (response as any).candidates?.[0]?.content?.parts?.[0]
    ?.inlineData?.data;
  if (!audioData) throw new Error("TTS returned no audio data");

  return Buffer.from(audioData, "base64");
}
