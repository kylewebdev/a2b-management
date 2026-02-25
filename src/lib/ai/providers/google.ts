import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIProvider, TriageRequest, TriageUsage } from "../types";
import { buildSystemPrompt, buildUserMessage } from "../prompt";

const DEFAULT_MODEL = "gemini-2.0-flash";

export class GoogleProvider implements AIProvider {
  name = "google";
  model: string;
  private genAI: GoogleGenerativeAI;
  private usage: TriageUsage | null = null;

  constructor(apiKey: string, model?: string) {
    this.model = model || DEFAULT_MODEL;
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *triage(request: TriageRequest): AsyncIterable<string> {
    const generativeModel = this.genAI.getGenerativeModel({
      model: this.model,
      systemInstruction: buildSystemPrompt(request.estateContext),
    });

    const inlineParts = request.photos.map((photo) => ({
      inlineData: {
        mimeType: photo.mimeType,
        data: photo.base64,
      },
    }));

    const result = await generativeModel.generateContentStream([
      ...inlineParts,
      { text: buildUserMessage(request.photos.length) },
    ]);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }

    const response = await result.response;
    const usageMetadata = response.usageMetadata;
    if (usageMetadata) {
      this.usage = {
        inputTokens: usageMetadata.promptTokenCount ?? 0,
        outputTokens: usageMetadata.candidatesTokenCount ?? 0,
        totalTokens: usageMetadata.totalTokenCount ?? 0,
      };
    }
  }

  getUsage(): TriageUsage | null {
    return this.usage;
  }
}
