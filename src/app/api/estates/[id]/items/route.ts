import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { estates, items, itemPhotos } from "@/db/schema";
import { getAuthUserId, jsonError, jsonSuccess } from "@/lib/api";
import { uploadFile, generateR2Key, getSignedViewUrl, MAX_FILE_SIZE } from "@/lib/r2";
import { MAX_PHOTOS, MIN_PHOTOS, ALLOWED_MIME_TYPES } from "@/lib/validations/item";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id: estateId } = await params;

  // Verify estate ownership
  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, estateId));

  if (!estate) return jsonError("Not found", 404);
  if (estate.userId !== userId) return jsonError("Forbidden", 403);

  // Parse FormData
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const files = formData.getAll("photos") as File[];

  // Validate file count
  if (files.length < MIN_PHOTOS) {
    return jsonError(`At least ${MIN_PHOTOS} photo is required`, 400);
  }
  if (files.length > MAX_PHOTOS) {
    return jsonError(`Maximum ${MAX_PHOTOS} photos allowed`, 400);
  }

  // Validate each file
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) {
      return jsonError("Invalid file", 400);
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as typeof ALLOWED_MIME_TYPES[number])) {
      return jsonError(`File type ${file.type} is not allowed`, 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return jsonError(`File ${file.name} exceeds maximum size of 15MB`, 400);
    }
  }

  // Create item
  const [item] = await db
    .insert(items)
    .values({ estateId })
    .returning();

  // Upload files and create photo records
  const photoRecords = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const r2Key = generateR2Key(estateId, item.id, file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    await uploadFile(r2Key, buffer, file.type);

    const [photo] = await db
      .insert(itemPhotos)
      .values({
        itemId: item.id,
        r2Key,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        sortOrder: i,
      })
      .returning();

    photoRecords.push(photo);
  }

  // Generate signed URLs for response
  const photosWithUrls = await Promise.all(
    photoRecords.map(async (photo) => ({
      ...photo,
      url: await getSignedViewUrl(photo.r2Key),
    }))
  );

  return jsonSuccess({ ...item, photos: photosWithUrls }, 201);
}

export async function GET(_request: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (!userId) return jsonError("Unauthorized", 401);

  const { id: estateId } = await params;

  // Verify estate ownership
  const [estate] = await db
    .select()
    .from(estates)
    .where(eq(estates.id, estateId));

  if (!estate) return jsonError("Not found", 404);
  if (estate.userId !== userId) return jsonError("Forbidden", 403);

  // Get all items for this estate
  const estateItems = await db
    .select()
    .from(items)
    .where(eq(items.estateId, estateId))
    .orderBy(desc(items.createdAt));

  // Get first photo for each item (thumbnail)
  const itemsWithThumbnails = await Promise.all(
    estateItems.map(async (item) => {
      const [firstPhoto] = await db
        .select()
        .from(itemPhotos)
        .where(eq(itemPhotos.itemId, item.id))
        .orderBy(itemPhotos.sortOrder)
        .limit(1);

      let thumbnailUrl: string | null = null;
      if (firstPhoto) {
        thumbnailUrl = await getSignedViewUrl(firstPhoto.r2Key);
      }

      return { ...item, thumbnailUrl };
    })
  );

  return jsonSuccess(itemsWithThumbnails);
}
