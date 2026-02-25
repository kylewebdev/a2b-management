import OpenAI from "openai";
import type { AIProvider, TriageRequest, TriageUsage } from "../types";
import { buildSystemPrompt, buildUserMessage } from "../prompt";

const DEFAULT_MODEL = "gpt-4o";

export class OpenAIProvider implements AIProvider {
  name = "openai";
  model: string;
  private client: OpenAI;
  private usage: TriageUsage | null = null;

  constructor(apiKey: string, model?: string) {
    this.model = model || DEFAULT_MODEL;
    this.client = new OpenAI({ apiKey });
  }

  async *triage(request: TriageRequest): AsyncIterable<string> {
    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = request.photos.map(
      (photo) => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${photo.mimeType};base64,${photo.base64}`,
        },
      })
    );

    const stream = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: 4096,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(request.estateContext),
        },
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text", text: buildUserMessage(request.photos.length) },
          ],
        },
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;

      // Capture usage from the final chunk
      if (chunk.usage) {
        this.usage = {
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens,
        };
      }
    }
  }

  getUsage(): TriageUsage | null {
    return this.usage;
  }
}
