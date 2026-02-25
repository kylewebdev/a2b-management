// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  estates,
  items,
  itemPhotos,
  estateStatusEnum,
  itemStatusEnum,
  itemTierEnum,
} from "../schema";

// ── Enum tests ─────────────────────────────────────────

describe("enums", () => {
  it("exports all 3 enums", () => {
    expect(estateStatusEnum).toBeDefined();
    expect(itemStatusEnum).toBeDefined();
    expect(itemTierEnum).toBeDefined();
  });

  it("estateStatusEnum has correct values", () => {
    expect(estateStatusEnum.enumValues).toEqual([
      "active",
      "resolving",
      "closed",
    ]);
  });

  it("itemStatusEnum has correct values", () => {
    expect(itemStatusEnum.enumValues).toEqual([
      "pending",
      "triaged",
      "routed",
      "resolved",
    ]);
  });

  it("itemTierEnum has correct values", () => {
    expect(itemTierEnum.enumValues).toEqual(["1", "2", "3", "4"]);
  });
});

// ── Estates table tests ────────────────────────────────

describe("estates table", () => {
  const config = getTableConfig(estates);

  it("has correct table name", () => {
    expect(config.name).toBe("estates");
  });

  it("has all 9 columns", () => {
    expect(config.columns).toHaveLength(9);
  });

  it("has expected column names", () => {
    const names = config.columns.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "address",
        "status",
        "client_name",
        "notes",
        "user_id",
        "created_at",
        "updated_at",
      ])
    );
  });

  it("name, address, user_id are notNull", () => {
    const notNullCols = ["name", "address", "user_id"];
    for (const colName of notNullCols) {
      const col = config.columns.find((c) => c.name === colName);
      expect(col?.notNull, `${colName} should be notNull`).toBe(true);
    }
  });

  it("client_name and notes are nullable", () => {
    const nullableCols = ["client_name", "notes"];
    for (const colName of nullableCols) {
      const col = config.columns.find((c) => c.name === colName);
      expect(col?.notNull, `${colName} should be nullable`).toBe(false);
    }
  });

  it("user_id is text type (not uuid)", () => {
    const col = config.columns.find((c) => c.name === "user_id");
    expect(col?.dataType).toBe("string");
    expect(col?.columnType).toBe("PgText");
  });
});

// ── Items table tests ──────────────────────────────────

describe("items table", () => {
  const config = getTableConfig(items);

  it("has correct table name", () => {
    expect(config.name).toBe("items");
  });

  it("has all 13 columns", () => {
    expect(config.columns).toHaveLength(13);
  });

  it("tier is nullable", () => {
    const col = config.columns.find((c) => c.name === "tier");
    expect(col?.notNull).toBe(false);
  });

  it("estate_id is notNull", () => {
    const col = config.columns.find((c) => c.name === "estate_id");
    expect(col?.notNull).toBe(true);
  });

  it("has FK to estates with cascade delete", () => {
    expect(config.foreignKeys).toHaveLength(1);
    const fk = config.foreignKeys[0];
    const ref = fk.reference();
    expect(ref.foreignColumns.map((c) => c.name)).toEqual(["id"]);
    expect(fk.onDelete).toBe("cascade");
  });
});

// ── Item photos table tests ────────────────────────────

describe("item_photos table", () => {
  const config = getTableConfig(itemPhotos);

  it("has correct table name", () => {
    expect(config.name).toBe("item_photos");
  });

  it("has all 8 columns", () => {
    expect(config.columns).toHaveLength(8);
  });

  it("does NOT have an updated_at column", () => {
    const col = config.columns.find((c) => c.name === "updated_at");
    expect(col).toBeUndefined();
  });

  it("has FK to items with cascade delete", () => {
    expect(config.foreignKeys).toHaveLength(1);
    const fk = config.foreignKeys[0];
    const ref = fk.reference();
    expect(ref.foreignColumns.map((c) => c.name)).toEqual(["id"]);
    expect(fk.onDelete).toBe("cascade");
  });

  it("r2_key and sort_order are notNull", () => {
    for (const colName of ["r2_key", "sort_order"]) {
      const col = config.columns.find((c) => c.name === colName);
      expect(col?.notNull, `${colName} should be notNull`).toBe(true);
    }
  });
});
