import { describe, it, expect, vi, afterEach } from "vitest";
import { formatValueRange, formatRelativeTime } from "../format";

describe("formatValueRange", () => {
  it("returns formatted range for non-zero values", () => {
    expect(formatValueRange(250, 600)).toBe("$250 – $600");
  });

  it("formats large numbers with commas", () => {
    expect(formatValueRange(1200, 5000)).toBe("$1,200 – $5,000");
  });

  it("returns -- when both values are zero", () => {
    expect(formatValueRange(0, 0)).toBe("--");
  });

  it("returns range when only low is zero", () => {
    expect(formatValueRange(0, 500)).toBe("$0 – $500");
  });

  it("returns range when only high is zero", () => {
    expect(formatValueRange(100, 0)).toBe("$100 – $0");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for times less than a minute ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:30Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("Just now");
  });

  it("returns minutes ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:05:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("5m ago");
  });

  it("returns hours ago", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T15:00:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("3h ago");
  });

  it("returns '1 day ago' for yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-16T12:00:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("1 day ago");
  });

  it("returns days ago for multiple days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-20T12:00:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("5 days ago");
  });

  it("returns '1 month ago' for ~30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("1 month ago");
  });

  it("returns months ago for multiple months", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
    expect(formatRelativeTime("2026-01-15T12:00:00Z")).toBe("3 months ago");
  });
});
