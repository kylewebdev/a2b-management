import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, TriageRequest, TriageUsage } from "../types";
import { buildSystemPrompt, buildUserMessage } from "../prompt";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  model: string;
  private client: Anthropic;
  private usage: TriageUsage | null = null;

  constructor(apiKey: string, model?: string) {
    this.model = model || DEFAULT_MODEL;
    this.client = new Anthropic({ apiKey });
  }

  async *triage(request: TriageRequest): AsyncIterable<string> {
    const content: Anthropic.Messages.ContentBlockParam[] = [];

    // Add photos as base64 images
    for (const photo of request.photos) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: photo.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
          data: photo.base64,
        },
      });
    }

    // Add text prompt
    content.push({
      type: "text",
      text: buildUserMessage(request.photos.length),
    });

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 4096,
      system: buildSystemPrompt(request.estateContext),
      messages: [{ role: "user", content }],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }

    const finalMessage = await stream.finalMessage();
    this.usage = {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
      totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
    };
  }

  getUsage(): TriageUsage | null {
    return this.usage;
  }
}
