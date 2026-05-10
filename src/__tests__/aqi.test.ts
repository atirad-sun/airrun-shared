import { describe, test, expect } from "vitest";
import {
  pm25ToAqi,
  aqiToBand,
  computeAqi,
  getBandThaiLabel,
  getBandColor,
  getBandTailwindBg,
  getBandTailwindText,
  getBandEmoji,
  type AqiBand,
} from "../aqi";

describe("pm25ToAqi (Thai PCD standard)", () => {
  test.each([
    // [pm25 μg/m³, expected Thai AQI, comment]
    [0,    0,   "อากาศสะอาด → AQI 0"],
    [15.0, 25,  "ดีมาก upper edge"],
    [15.1, 26,  "ดี lower edge"],
    [25.0, 50,  "ดี upper edge"],
    [25.1, 51,  "ปานกลาง lower edge"],
    [37.5, 100, "ปานกลาง upper edge"],
    [37.6, 101, "เริ่มมีผลต่อสุขภาพ lower edge"],
    [75.0, 200, "เริ่มมีผลต่อสุขภาพ upper edge"],
    [75.1, 201, "มีผลต่อสุขภาพ lower edge"],
  ])("pm25=%f → Thai AQI %i (%s)", (pm25, expected) => {
    expect(pm25ToAqi(pm25)).toBe(expected);
  });

  test("clamps negative PM2.5 to 0", () => {
    expect(pm25ToAqi(-5)).toBe(0);
  });

  test("clamps PM2.5 > 300 to AQI 500", () => {
    expect(pm25ToAqi(500)).toBe(500);
    expect(pm25ToAqi(1000)).toBe(500);
  });

  test("handles non-finite values defensively", () => {
    expect(pm25ToAqi(NaN)).toBe(0);
    expect(pm25ToAqi(Infinity)).toBe(0);
    expect(pm25ToAqi(-Infinity)).toBe(0);
  });

  test("truncates to 1 decimal place", () => {
    expect(pm25ToAqi(15.05)).toBe(pm25ToAqi(15.0));
    expect(pm25ToAqi(15.09)).toBe(pm25ToAqi(15.0));
  });
});

describe("aqiToBand (Thai PCD 5 levels)", () => {
  test.each<[number, AqiBand]>([
    [0,   "VeryGood"],
    [25,  "VeryGood"],
    [26,  "Good"],
    [50,  "Good"],
    [51,  "Moderate"],
    [100, "Moderate"],
    [101, "Sensitive"],
    [200, "Sensitive"],
    [201, "Unhealthy"],
    [500, "Unhealthy"],
  ])("Thai AQI %i → band %s", (aqi, band) => {
    expect(aqiToBand(aqi)).toBe(band);
  });
});

describe("computeAqi", () => {
  test("returns null for null/undefined PM2.5", () => {
    expect(computeAqi(null)).toBeNull();
    expect(computeAqi(undefined)).toBeNull();
  });

  test("returns null for NaN", () => {
    expect(computeAqi(NaN)).toBeNull();
  });

  test("PM2.5 of 0 returns valid result (extremely clean air, NOT null)", () => {
    expect(computeAqi(0)).toEqual({ aqi: 0, band: "VeryGood", pm25: 0 });
  });

  test("PM2.5 = 12.1 → ดีมาก (typical good Bangkok morning)", () => {
    const r = computeAqi(12.1);
    expect(r).not.toBeNull();
    expect(r!.band).toBe("VeryGood");
    expect(r!.pm25).toBe(12.1);
  });

  test("PM2.5 = 30 → ปานกลาง", () => {
    const r = computeAqi(30);
    expect(r!.band).toBe("Moderate");
    expect(r!.aqi).toBeGreaterThanOrEqual(51);
    expect(r!.aqi).toBeLessThanOrEqual(100);
  });

  test("PM2.5 = 50 → เริ่มมีผลต่อสุขภาพ", () => {
    const r = computeAqi(50);
    expect(r!.band).toBe("Sensitive");
    expect(r!.aqi).toBeGreaterThanOrEqual(101);
    expect(r!.aqi).toBeLessThanOrEqual(200);
  });

  test("truncates pm25 in result to 1 decimal", () => {
    const r = computeAqi(32.789);
    expect(r!.pm25).toBe(32.7);
  });
});

describe("band → label/color/class helpers", () => {
  const bands: AqiBand[] = ["VeryGood", "Good", "Moderate", "Sensitive", "Unhealthy"];

  test("every band has a Thai label", () => {
    for (const b of bands) expect(getBandThaiLabel(b)).toBeTruthy();
  });

  test("Thai labels match PCD standard", () => {
    expect(getBandThaiLabel("VeryGood")).toBe("ดีมาก");
    expect(getBandThaiLabel("Good")).toBe("ดี");
    expect(getBandThaiLabel("Moderate")).toBe("ปานกลาง");
    expect(getBandThaiLabel("Sensitive")).toBe("เริ่มมีผลต่อสุขภาพ");
    expect(getBandThaiLabel("Unhealthy")).toBe("มีผลต่อสุขภาพ");
  });

  test("every band returns a 6-digit hex color", () => {
    for (const b of bands) expect(getBandColor(b)).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test("Tailwind bg classes match the bg-aqi-* convention", () => {
    expect(getBandTailwindBg("VeryGood")).toBe("bg-aqi-good");
    expect(getBandTailwindBg("Good")).toBe("bg-aqi-moderate");
    expect(getBandTailwindBg("Moderate")).toBe("bg-aqi-sensitive");
    expect(getBandTailwindBg("Sensitive")).toBe("bg-aqi-poor");
    expect(getBandTailwindBg("Unhealthy")).toBe("bg-aqi-bad");
  });

  test("Tailwind text classes match the text-aqi-* convention", () => {
    expect(getBandTailwindText("Sensitive")).toBe("text-aqi-poor");
  });

  test("every band has an emoji", () => {
    for (const b of bands) expect(getBandEmoji(b)).toBeTruthy();
  });
});
