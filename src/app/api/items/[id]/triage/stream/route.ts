import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { estates, items, itemPhotos, appSettings } from "@/db/schema";
import { getAuthUserId, jsonError } from "@/lib/api";
import { decrypt } from "@/lib/crypto";
import { getFileBuffer } from "@/lib/r2";
import { resizeForTriage } from "@/lib/image-resize";
import { getProvider } from "@/lib/ai";
import { parseTriageResult } from "@/lib/ai/parse-triage";
import { createSSEStream, sseResponse } from "@/lib/sse";
import { triageRateLimiter } from "@/lib/triage-rate-limit";
import type { ProviderName } from "@/lib/ai";

type Params = { params: Promise<{ id: string }> };

const PROVIDER_KEY_MAP = {
  anthropic: "apiKeyAnthropic",
  openai: "apiKeyOpenai",
  google: "apiKeyGoogle",
} as const;

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  // Rate limit check
  const rateResult = triageRateLimiter.check(userId);
  if (!rateResult.allowed) {
    return NextResponse.json(
      { error: "Too many triage requests. Please wait." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateResult.retryAfterMs / 1000)) } }
    );
  }

  const { id } = await params;

  // Fetch item
  const [item] = await db
    .select()
    .from(items)
    .where(eq(items.id, id));

  if (!item) return jsonError("Not found", 404);

  // Verify estate ownership
  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, item.estateId));

  if (!estate || estate.userId !== userId) {
    return jsonError("Forbidden", 403);
  }

  // Get photos
  const photos = await db
    .select()
    .from(itemPhotos)
    .where(eq(itemPhotos.itemId, id))
    .orderBy(itemPhotos.sortOrder);

  if (photos.length === 0) {
    return jsonError("Item has no photos", 400);
  }

  // Get settings
  const [settings] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.id, 1));

  if (!settings) {
    return jsonError("AI settings not configured", 400);
  }

  const keyField = PROVIDER_KEY_MAP[settings.aiProvider];
  const encryptedKey = settings[keyField];

  if (!encryptedKey) {
    return jsonError(`No API key for ${settings.aiProvider}`, 400);
  }

  let apiKey: string;
  try {
    apiKey = decrypt(encryptedKey);
  } catch {
    return jsonError("API key corrupted", 400);
  }

  // Create SSE stream
  const { stream, writer } = createSSEStream();

  // Run triage in background (don't await — we want to return the SSE response immediately)
  (async () => {
    try {
      // Download photos from R2 and resize for AI consumption
      const photoData = await Promise.all(
        photos.map(async (photo) => {
          const rawBuffer = await getFileBuffer(photo.r2Key);
          const { buffer, mimeType } = await resizeForTriage(rawBuffer, photo.mimeType);
          return {
            base64: buffer.toString("base64"),
            mimeType,
          };
        })
      );

      // Create provider and stream triage
      const provider = getProvider(
        settings.aiProvider as ProviderName,
        apiKey,
        settings.aiModel ?? undefined
      );

      let fullText = "";

      for await (const chunk of provider.triage({
        photos: photoData,
        estateContext: { address: estate.address, name: estate.name },
      })) {
        fullText += chunk;
        writer.send({ type: "chunk", text: chunk });
      }

      // Parse the result
      const { result, partial } = parseTriageResult(fullText);

      // Get usage
      const usage = provider.getUsage();

      // Update item in DB
      const updateData: Record<string, unknown> = {
        aiRawResponse: fullText,
        aiProvider: `${settings.aiProvider}/${provider.model}`,
        tokensUsed: usage?.totalTokens ?? null,
        inputTokens: usage?.inputTokens ?? null,
        outputTokens: usage?.outputTokens ?? null,
        status: "triaged",
      };

      if (result) {
        updateData.tier = result.tier;
        updateData.aiIdentification = {
          title: result.identification.title,
          description: result.identification.description,
          category: result.identification.category,
          period: result.identification.period,
          maker: result.identification.maker,
          materials: result.identification.materials,
        };
        updateData.aiValuation = {
          lowEstimate: result.valuation.lowEstimate,
          highEstimate: result.valuation.highEstimate,
          currency: result.valuation.currency,
          comparables: result.valuation.comparables,
          confidence: result.confidence,
          condition: result.condition,
          listingGuidance: result.listingGuidance,
          sleeperAlert: result.sleeperAlert,
          additionalPhotosRequested: result.additionalPhotosRequested,
        };
      } else if (partial) {
        if (partial.tier) updateData.tier = partial.tier;
        if (partial.valuation) {
          updateData.aiValuation = {
            lowEstimate: partial.valuation.lowEstimate,
            highEstimate: partial.valuation.highEstimate,
            currency: partial.valuation.currency,
          };
        }
      }

      await db
        .update(items)
        .set(updateData)
        .where(eq(items.id, id));

      // Send completion event
      writer.sendEvent("complete", {
        result: result ?? partial ?? null,
        usage,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Triage failed";
      writer.sendEvent("error", { error: message });
    } finally {
      writer.close();
    }
  })();

  return sseResponse(stream);
}
