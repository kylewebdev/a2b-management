// @vitest-environment node
import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { eq, isNull } from "drizzle-orm";
import { estates, items, itemPhotos } from "../schema";
import { getTestDb, cleanDb } from "@/test/db";
import {
  createTestEstate,
  createTestItem,
  createTestItemPhoto,
  resetFactoryCounter,
} from "@/test/helpers";

// Skip if no DATABASE_URL
const db = (() => {
  try {
    return getTestDb();
  } catch {
    return null;
  }
})();

const describeDb = db ? describe : describe.skip;

describeDb("database queries (live Neon)", () => {
  beforeAll(() => {
    resetFactoryCounter();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  it("inserts and retrieves an estate by id", async () => {
    const input = createTestEstate({ clientName: "Jane Doe", notes: "VIP" });
    const [inserted] = await db!
      .insert(estates)
      .values(input)
      .returning();

    const [found] = await db!
      .select()
      .from(estates)
      .where(eq(estates.id, inserted.id));

    expect(found.name).toBe(input.name);
    expect(found.address).toBe(input.address);
    expect(found.userId).toBe(input.userId);
    expect(found.clientName).toBe("Jane Doe");
    expect(found.notes).toBe("VIP");
  });

  it("applies defaults for status and timestamps", async () => {
    const input = createTestEstate();
    const [inserted] = await db!
      .insert(estates)
      .values(input)
      .returning();

    expect(inserted.status).toBe("active");
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toBeInstanceOf(Date);
  });

  it("inserts an item linked to an estate", async () => {
    const [estate] = await db!
      .insert(estates)
      .values(createTestEstate())
      .returning();

    const [item] = await db!
      .insert(items)
      .values(createTestItem(estate.id))
      .returning();

    expect(item.estateId).toBe(estate.id);
    expect(item.status).toBe("pending");
    expect(item.tier).toBeNull();
  });

  it("rejects an item with invalid estate_id", async () => {
    const bogusId = "00000000-0000-0000-0000-000000000000";
    await expect(
      db!.insert(items).values(createTestItem(bogusId))
    ).rejects.toThrow();
  });

  it("inserts a photo linked to an item", async () => {
    const [estate] = await db!
      .insert(estates)
      .values(createTestEstate())
      .returning();
    const [item] = await db!
      .insert(items)
      .values(createTestItem(estate.id))
      .returning();

    const [photo] = await db!
      .insert(itemPhotos)
      .values(createTestItemPhoto(item.id))
      .returning();

    expect(photo.itemId).toBe(item.id);
    expect(photo.mimeType).toBe("image/jpeg");
  });

  it("cascade deletes items when estate is deleted", async () => {
    const [estate] = await db!
      .insert(estates)
      .values(createTestEstate())
      .returning();
    await db!.insert(items).values(createTestItem(estate.id));
    await db!.insert(items).values(createTestItem(estate.id));

    await db!.delete(estates).where(eq(estates.id, estate.id));

    const remaining = await db!
      .select()
      .from(items)
      .where(eq(items.estateId, estate.id));
    expect(remaining).toHaveLength(0);
  });

  it("cascade deletes photos when item is deleted", async () => {
    const [estate] = await db!
      .insert(estates)
      .values(createTestEstate())
      .returning();
    const [item] = await db!
      .insert(items)
      .values(createTestItem(estate.id))
      .returning();
    await db!.insert(itemPhotos).values(createTestItemPhoto(item.id));

    await db!.delete(items).where(eq(items.id, item.id));

    const remaining = await db!
      .select()
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, item.id));
    expect(remaining).toHaveLength(0);
  });

  it("queries estates filtered by status", async () => {
    await db!.insert(estates).values([
      createTestEstate({ status: "active" }),
      createTestEstate({ status: "active" }),
      createTestEstate({ status: "closed" }),
    ]);

    const active = await db!
      .select()
      .from(estates)
      .where(eq(estates.status, "active"));
    expect(active).toHaveLength(2);

    const closed = await db!
      .select()
      .from(estates)
      .where(eq(estates.status, "closed"));
    expect(closed).toHaveLength(1);
  });

  it("queries items filtered by tier (including null for untriaged)", async () => {
    const [estate] = await db!
      .insert(estates)
      .values(createTestEstate())
      .returning();

    await db!.insert(items).values([
      createTestItem(estate.id, { tier: "1" }),
      createTestItem(estate.id, { tier: "2" }),
      createTestItem(estate.id), // tier is null (untriaged)
    ]);

    const tier1 = await db!
      .select()
      .from(items)
      .where(eq(items.tier, "1"));
    expect(tier1).toHaveLength(1);

    const untriaged = await db!
      .select()
      .from(items)
      .where(isNull(items.tier));
    expect(untriaged).toHaveLength(1);
  });
});
