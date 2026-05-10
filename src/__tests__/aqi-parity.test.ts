import { describe, test, expect } from "vitest";
import { pm25ToAqi, aqiToBand, type AqiBand } from "../aqi";

/**
 * Thai PCD AQI parity contract.
 *
 * The frontend (src/lib/aqi.ts) and backend edge functions must agree on
 * PM2.5 → Thai AQI → band for every case below.
 *
 * Source: กรมควบคุมมลพิษ (PCD Thailand) PM2.5 standard (24-hour average).
 * Data from: PCD Thailand, WAQI, OpenWeatherMap (all provide raw PM2.5 μg/m³).
 *
 * When PCD changes thresholds, update this file AND the edge-function copies
 * in the same commit.
 */
interface ParityCase {
  pm25: number;
  aqi: number;
  band: AqiBand;
}

export const AQI_PARITY_CASES: readonly ParityCase[] = [
  { pm25: 0,    aqi: 0,   band: "VeryGood"  },
  { pm25: 7.5,  aqi: 13,  band: "VeryGood"  },
  { pm25: 15.0, aqi: 25,  band: "VeryGood"  },
  { pm25: 15.1, aqi: 26,  band: "Good"      },
  { pm25: 20.0, aqi: 38,  band: "Good"      },
  { pm25: 25.0, aqi: 50,  band: "Good"      },
  { pm25: 25.1, aqi: 51,  band: "Moderate"  },
  { pm25: 31.0, aqi: 74,  band: "Moderate"  },
  { pm25: 37.5, aqi: 100, band: "Moderate"  },
  { pm25: 37.6, aqi: 101, band: "Sensitive" },
  { pm25: 56.0, aqi: 150, band: "Sensitive" },
  { pm25: 75.0, aqi: 200, band: "Sensitive" },
  { pm25: 75.1, aqi: 201, band: "Unhealthy" },
  { pm25: 150,  aqi: 301, band: "Unhealthy" },
  { pm25: 500,  aqi: 500, band: "Unhealthy" },
] as const;

describe("AQI parity contract (Thai PCD — frontend vs edge-function copies)", () => {
  test.each(AQI_PARITY_CASES.map((c) => [c.pm25, c.aqi, c.band] as const))(
    "pm25=%f → Thai AQI %i, band %s",
    (pm25, expectedAqi, expectedBand) => {
      const aqi = pm25ToAqi(pm25);
      expect(aqi).toBe(expectedAqi);
      expect(aqiToBand(aqi)).toBe(expectedBand);
    }
  );
});
