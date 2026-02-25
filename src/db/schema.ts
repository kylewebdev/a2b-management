import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";

// ── Enums ──────────────────────────────────────────────

export const estateStatusEnum = pgEnum("estate_status", [
  "active",
  "resolving",
  "closed",
]);

export const itemStatusEnum = pgEnum("item_status", [
  "pending",
  "triaged",
  "routed",
  "resolved",
]);

export const itemTierEnum = pgEnum("item_tier", ["1", "2", "3", "4"]);

export const aiProviderEnum = pgEnum("ai_provider", [
  "anthropic",
  "openai",
  "google",
]);

// ── Tables ─────────────────────────────────────────────

export const estates = pgTable("estates", {
  id: uuid().primaryKey().defaultRandom(),
  name: text(),
  address: text().notNull(),
  status: estateStatusEnum().notNull().default("active"),
  clientName: text("client_name"),
  notes: text(),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const items = pgTable("items", {
  id: uuid().primaryKey().defaultRandom(),
  estateId: uuid("estate_id")
    .notNull()
    .references(() => estates.id, { onDelete: "cascade" }),
  tier: itemTierEnum(),
  status: itemStatusEnum().notNull().default("pending"),
  aiIdentification: jsonb("ai_identification"),
  aiValuation: jsonb("ai_valuation"),
  aiRawResponse: text("ai_raw_response"),
  aiProvider: text("ai_provider"),
  tokensUsed: integer("tokens_used"),
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  disposition: text(),
  notes: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const itemPhotos = pgTable("item_photos", {
  id: uuid().primaryKey().defaultRandom(),
  itemId: uuid("item_id")
    .notNull()
    .references(() => items.id, { onDelete: "cascade" }),
  r2Key: text("r2_key").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: serial().primaryKey(),
  aiProvider: aiProviderEnum("ai_provider").notNull().default("anthropic"),
  aiModel: text("ai_model"),
  apiKeyAnthropic: text("api_key_anthropic"),
  apiKeyOpenai: text("api_key_openai"),
  apiKeyGoogle: text("api_key_google"),
  costWarningThreshold: integer("cost_warning_threshold"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  updatedBy: text("updated_by"),
});
