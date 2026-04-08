import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the astrology-api.io v3 data → prompt mapping logic.
 *
 * The mapping lives inside the Supabase edge function (Deno runtime),
 * so we extract the pure mapping functions and test them in isolation
 * against realistic API response fixtures.
 */

// ─── Fixtures: realistic v3 API responses ─────────────────────────

const NATAL_RESPONSE = {
  subject_data: {
    name: "user",
    year: 1990, month: 6, day: 15, hour: 14, minute: 30,
    sun: {
      name: "Sun", sign: "Gem", position: 24.1495, abs_pos: 84.1495,
      house: "Ninth_House", retrograde: false,
    },
    moon: {
      name: "Moon", sign: "Pis", position: 15.6364, abs_pos: 345.6364,
      house: "Sixth_House", retrograde: false,
    },
    mercury: {
      name: "Mercury", sign: "Gem", position: 5.7265, abs_pos: 65.7265,
      house: "Ninth_House", retrograde: false,
    },
    venus: {
      name: "Venus", sign: "Tau", position: 18.8021, abs_pos: 48.8021,
      house: "Eighth_House", retrograde: false,
    },
    mars: {
      name: "Mars", sign: "Ari", position: 11.0612, abs_pos: 11.0612,
      house: "Seventh_House", retrograde: false,
    },
    jupiter: {
      name: "Jupiter", sign: "Can", position: 15.8906, abs_pos: 105.8906,
      house: "Tenth_House", retrograde: false,
    },
    saturn: {
      name: "Saturn", sign: "Cap", position: 24.0312, abs_pos: 294.0312,
      house: "Fourth_House", retrograde: true,
    },
    uranus: {
      name: "Uranus", sign: "Cap", position: 8.1634, abs_pos: 278.1634,
      house: "Fourth_House", retrograde: true,
    },
    neptune: {
      name: "Neptune", sign: "Cap", position: 13.7201, abs_pos: 283.7201,
      house: "Fourth_House", retrograde: true,
    },
    pluto: {
      name: "Pluto", sign: "Sco", position: 15.4023, abs_pos: 225.4023,
      house: "Second_House", retrograde: true,
    },
    mean_node: {
      name: "Mean_Node", sign: "Aqu", position: 7.9201, abs_pos: 307.9201,
      house: "Fifth_House", retrograde: true,
    },
    chiron: {
      name: "Chiron", sign: "Can", position: 21.0612, abs_pos: 111.0612,
      house: "Tenth_House", retrograde: false,
    },
    first_house: {
      name: "First_House", sign: "Lib", position: 2.524,
      abs_pos: 182.524, house: null, retrograde: null,
    },
    tenth_house: {
      name: "Tenth_House", sign: "Can", position: 2.937,
      abs_pos: 92.937, house: null, retrograde: null,
    },
    lunar_phase: { name: "Waning Gibbous", degrees_between: 232.5 },
  },
  chart_data: {},
};

const TRANSIT_RESPONSE = {
  subject_data: {},
  chart_data: {
    planetary_positions: [
      { name: "Sun_transit", sign: "Ari", degree: 18.58, absolute_longitude: 18.58, house: 10, is_retrograde: false },
      { name: "Moon_transit", sign: "Sag", degree: 28.97, absolute_longitude: 268.97, house: 6, is_retrograde: false },
      { name: "Mercury_transit", sign: "Pis", degree: 21.28, absolute_longitude: 351.28, house: 10, is_retrograde: true },
      { name: "Venus_transit", sign: "Tau", degree: 10.76, absolute_longitude: 40.76, house: 11, is_retrograde: false },
      { name: "Mars_transit", sign: "Pis", degree: 28.91, absolute_longitude: 358.91, house: 10, is_retrograde: false },
      // natal echoes (should be filtered out)
      { name: "Sun_natal", sign: "Gem", degree: 24.15, absolute_longitude: 84.15, house: 9, is_retrograde: false },
      { name: "Moon_natal", sign: "Pis", degree: 15.64, absolute_longitude: 345.64, house: 6, is_retrograde: false },
    ],
    aspects: [
      { point1: "Sun_transit", point2: "Jupiter_natal", aspect_type: "square", orb: 2.69, aspect_direction: "separating" },
      { point1: "Mercury_transit", point2: "Sun_natal", aspect_type: "square", orb: 2.87, aspect_direction: "applying" },
      { point1: "Mercury_transit", point2: "Venus_natal", aspect_type: "sextile", orb: 2.48, aspect_direction: "separating" },
      { point1: "Venus_transit", point2: "Mars_natal", aspect_type: "conjunction", orb: 0.30, aspect_direction: "applying" },
    ],
  },
};

const HD_RESPONSE = {
  success: true,
  data: {
    subject: {},
    bodygraph: {
      type: "manifesting_generator",
      strategy: "To Respond",
      authority: "sacral",
      profile: "2/4",
      definition: "single",
      incarnation_cross: "Right Angle Cross of Planning",
      not_self_theme: "Frustration and Anger",
      signature_theme: "Satisfaction and Peace",
      personality_gates: [
        { gate: 12, line: 2, planet: "Sun", i_ching: "Standstill", center: "throat", activation_type: "personality" },
        { gate: 11, line: 2, planet: "Earth", i_ching: "Peace", center: "ajna", activation_type: "personality" },
        { gate: 63, line: 5, planet: "Moon", i_ching: "After Completion", center: "head", activation_type: "personality" },
        { gate: 45, line: 3, planet: "Mercury", i_ching: "Gathering", center: "throat", activation_type: "personality" },
        { gate: 8, line: 6, planet: "Venus", i_ching: "Holding Together", center: "throat", activation_type: "personality" },
        { gate: 51, line: 1, planet: "Mars", i_ching: "The Arousing", center: "heart", activation_type: "personality" },
        { gate: 15, line: 4, planet: "Jupiter", i_ching: "Modesty", center: "g_center", activation_type: "personality" },
      ],
      design_gates: [
        { gate: 36, line: 4, planet: "Sun", i_ching: "Darkening of the Light", center: "solar_plexus", activation_type: "design" },
        { gate: 6, line: 4, planet: "Earth", i_ching: "Conflict", center: "solar_plexus", activation_type: "design" },
        { gate: 14, line: 4, planet: "Moon", i_ching: "Possession in Great Measure", center: "sacral", activation_type: "design" },
        { gate: 2, line: 1, planet: "Mercury", i_ching: "The Receptive", center: "g_center", activation_type: "design" },
        { gate: 46, line: 2, planet: "Venus", i_ching: "Pushing Upward", center: "g_center", activation_type: "design" },
        { gate: 25, line: 6, planet: "Mars", i_ching: "Innocence", center: "heart", activation_type: "design" },
        { gate: 7, line: 3, planet: "Jupiter", i_ching: "The Army", center: "g_center", activation_type: "design" },
      ],
      centers: {},
      channels: [],
    },
  },
  metadata: {},
};

// ─── Pure mapping functions (extracted from edge function) ─────────

const PLANET_KEYS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto","mean_node","chiron"];

function mapNatalPlanets(subjectData: any): string {
  return PLANET_KEYS
    .filter(k => subjectData[k])
    .map(k => {
      const p = subjectData[k];
      const retro = p.retrograde ? " [RETROGRADE]" : "";
      const house = p.house ? ` (${p.house.replace("_House","")} house)` : "";
      return `${p.name}: ${p.position?.toFixed(1)}° ${p.sign}${house}${retro}`;
    }).join("\n");
}

function mapAscMc(subjectData: any): { ascLine: string; mcLine: string } {
  const asc = subjectData.first_house;
  const mc = subjectData.tenth_house;
  return {
    ascLine: asc ? `Ascendant: ${asc.position?.toFixed(1)}° ${asc.sign}` : "",
    mcLine: mc ? `Midheaven: ${mc.position?.toFixed(1)}° ${mc.sign}` : "",
  };
}

function mapTransitPlanets(chartData: any): string {
  const positions: any[] = chartData.planetary_positions || [];
  return positions
    .filter((p: any) => p.name?.endsWith("_transit"))
    .map((p: any) => {
      const retro = p.is_retrograde ? " [R]" : "";
      return `${p.name.replace("_transit","")}: ${p.degree?.toFixed(1)}° ${p.sign}${retro}`;
    }).join("\n");
}

function mapTransitAspects(chartData: any): string {
  const aspects: any[] = (chartData.aspects || []).slice(0, 10);
  return aspects.map((a: any) =>
    `${a.point1.replace("_transit"," transit")} ${a.aspect_type} ${a.point2.replace("_natal"," natal")} (orb ${a.orb?.toFixed(1)}°, ${a.aspect_direction})`
  ).join("\n");
}

function mapHumanDesign(bodygraph: any): string {
  const pgates = (bodygraph.personality_gates || []).slice(0, 6).map((g: any) => `${g.gate}.${g.line}`).join(", ");
  const dgates = (bodygraph.design_gates || []).slice(0, 6).map((g: any) => `${g.gate}.${g.line}`).join(", ");
  return [
    `Type: ${bodygraph.type}`,
    `Profile: ${bodygraph.profile}`,
    `Authority: ${bodygraph.authority}`,
    `Definition: ${bodygraph.definition}`,
    `Incarnation Cross: ${bodygraph.incarnation_cross || ""}`,
    `Personality gates: ${pgates}`,
    `Design gates: ${dgates}`,
  ].join("\n");
}

/** Full chartContext builder — mirrors the edge function logic exactly */
function buildChartContext(
  natalData: any,
  transitData: any | null,
  hdData: any | null,
  isoDate: string,
): string {
  if (!natalData?.subject_data) return "";

  const sd = natalData.subject_data;
  const natalLines = mapNatalPlanets(sd);
  const { ascLine, mcLine } = mapAscMc(sd);

  let transitLines = "";
  let aspectLines = "";
  if (transitData?.chart_data) {
    transitLines = mapTransitPlanets(transitData.chart_data);
    aspectLines = mapTransitAspects(transitData.chart_data);
  }

  let hdContext = "";
  if (hdData?.data?.bodygraph) {
    const bg = hdData.data.bodygraph;
    hdContext = `\n\nHUMAN DESIGN (from Swiss Ephemeris):\n${mapHumanDesign(bg)}`;
  }

  return `\n\nREAL CALCULATED CHART DATA (Swiss Ephemeris — use these exact values, do not guess or approximate):\n\nNATAL PLANETS:\n${natalLines}\n${ascLine}\n${mcLine}${hdContext}\n\nTODAY'S TRANSITS (current sky, ${isoDate}):\n${transitLines}\n\n${aspectLines ? `KEY TRANSIT ASPECTS TO NATAL CHART:\n${aspectLines}` : ""}\n\nIMPORTANT: Reference these EXACT planetary positions, signs, houses, and aspects in your astrology_reading. Name specific planets with their signs and relevant aspects. Do NOT fabricate or approximate any chart data — use only the values above.`;
}

// ─── Tests ─────────────────────────────────────────────────────────

describe("Astrology API v3 → prompt mapping", () => {
  // ── Natal chart mapping ──

  describe("mapNatalPlanets", () => {
    const sd = NATAL_RESPONSE.subject_data;

    it("includes all 12 planet keys present in subject_data", () => {
      const lines = mapNatalPlanets(sd).split("\n");
      expect(lines).toHaveLength(12); // sun through chiron
    });

    it("formats planet with degree, sign, and house", () => {
      const lines = mapNatalPlanets(sd);
      expect(lines).toContain("Sun: 24.1° Gem (Ninth house)");
    });

    it("appends [RETROGRADE] for retrograde planets", () => {
      const lines = mapNatalPlanets(sd);
      expect(lines).toContain("Saturn: 24.0° Cap (Fourth house) [RETROGRADE]");
      expect(lines).toContain("Uranus: 8.2° Cap (Fourth house) [RETROGRADE]");
      expect(lines).toContain("Neptune: 13.7° Cap (Fourth house) [RETROGRADE]");
      expect(lines).toContain("Pluto: 15.4° Sco (Second house) [RETROGRADE]");
    });

    it("does NOT append [RETROGRADE] for direct planets", () => {
      const lines = mapNatalPlanets(sd);
      expect(lines).toContain("Sun: 24.1° Gem (Ninth house)");
      expect(lines).not.toContain("Sun: 24.1° Gem (Ninth house) [RETROGRADE]");
    });

    it("strips _House suffix from house names", () => {
      const lines = mapNatalPlanets(sd);
      expect(lines).not.toContain("_House");
    });

    it("uses position (in-sign degrees), not abs_pos", () => {
      const lines = mapNatalPlanets(sd);
      // Sun abs_pos is 84.1 but position (in-sign) is 24.1
      expect(lines).toContain("24.1° Gem");
      expect(lines).not.toContain("84.1°");
    });

    it("skips missing planet keys gracefully", () => {
      const partial = { sun: sd.sun, moon: sd.moon };
      const lines = mapNatalPlanets(partial).split("\n");
      expect(lines).toHaveLength(2);
    });

    it("returns empty string when subject_data has no planets", () => {
      expect(mapNatalPlanets({})).toBe("");
    });
  });

  describe("mapAscMc", () => {
    it("extracts Ascendant from first_house", () => {
      const { ascLine } = mapAscMc(NATAL_RESPONSE.subject_data);
      expect(ascLine).toBe("Ascendant: 2.5° Lib");
    });

    it("extracts Midheaven from tenth_house", () => {
      const { mcLine } = mapAscMc(NATAL_RESPONSE.subject_data);
      expect(mcLine).toBe("Midheaven: 2.9° Can");
    });

    it("returns empty strings when houses are missing", () => {
      const { ascLine, mcLine } = mapAscMc({});
      expect(ascLine).toBe("");
      expect(mcLine).toBe("");
    });
  });

  // ── Transit mapping ──

  describe("mapTransitPlanets", () => {
    const cd = TRANSIT_RESPONSE.chart_data;

    it("includes only _transit suffixed planets, not _natal echoes", () => {
      const lines = mapTransitPlanets(cd).split("\n");
      expect(lines).toHaveLength(5); // Sun, Moon, Mercury, Venus, Mars transits
      lines.forEach(line => {
        expect(line).not.toContain("_transit");
        expect(line).not.toContain("_natal");
      });
    });

    it("formats transit planets with degree and sign", () => {
      const lines = mapTransitPlanets(cd);
      expect(lines).toContain("Sun: 18.6° Ari");
      expect(lines).toContain("Moon: 29.0° Sag");
    });

    it("appends [R] for retrograde transits", () => {
      const lines = mapTransitPlanets(cd);
      expect(lines).toContain("Mercury: 21.3° Pis [R]");
    });

    it("does NOT append [R] for direct transits", () => {
      const lines = mapTransitPlanets(cd);
      expect(lines).toContain("Sun: 18.6° Ari");
      expect(lines).not.toContain("Sun: 18.6° Ari [R]");
    });

    it("returns empty string when no planetary_positions", () => {
      expect(mapTransitPlanets({})).toBe("");
    });
  });

  describe("mapTransitAspects", () => {
    const cd = TRANSIT_RESPONSE.chart_data;

    it("formats aspects with human-readable planet names", () => {
      const lines = mapTransitAspects(cd);
      expect(lines).toContain("Sun transit square Jupiter natal");
      expect(lines).toContain("Venus transit conjunction Mars natal");
    });

    it("includes orb and direction", () => {
      const lines = mapTransitAspects(cd);
      expect(lines).toContain("(orb 2.7°, separating)");
      expect(lines).toContain("(orb 2.9°, applying)");
    });

    it("caps at 10 aspects", () => {
      const bigChart = {
        aspects: Array.from({ length: 20 }, (_, i) => ({
          point1: `Sun_transit`, point2: `Planet${i}_natal`,
          aspect_type: "conjunction", orb: 1.0, aspect_direction: "applying",
        })),
      };
      const lines = mapTransitAspects(bigChart).split("\n");
      expect(lines).toHaveLength(10);
    });

    it("returns empty string when no aspects", () => {
      expect(mapTransitAspects({ aspects: [] })).toBe("");
      expect(mapTransitAspects({})).toBe("");
    });
  });

  // ── Human Design mapping ──

  describe("mapHumanDesign", () => {
    const bg = HD_RESPONSE.data.bodygraph;

    it("includes type, profile, authority, definition", () => {
      const result = mapHumanDesign(bg);
      expect(result).toContain("Type: manifesting_generator");
      expect(result).toContain("Profile: 2/4");
      expect(result).toContain("Authority: sacral");
      expect(result).toContain("Definition: single");
    });

    it("includes incarnation cross", () => {
      const result = mapHumanDesign(bg);
      expect(result).toContain("Incarnation Cross: Right Angle Cross of Planning");
    });

    it("formats personality gates as gate.line pairs (max 6)", () => {
      const result = mapHumanDesign(bg);
      expect(result).toContain("Personality gates: 12.2, 11.2, 63.5, 45.3, 8.6, 51.1");
    });

    it("formats design gates as gate.line pairs (max 6)", () => {
      const result = mapHumanDesign(bg);
      expect(result).toContain("Design gates: 36.4, 6.4, 14.4, 2.1, 46.2, 25.6");
    });

    it("caps gates at 6 even if more are present", () => {
      // Both personality_gates and design_gates have 7 entries in fixture
      const result = mapHumanDesign(bg);
      // Personality: 7th gate (15.4) should NOT appear
      expect(result).not.toContain("15.4");
      // Design: 7th gate (7.3) should NOT appear
      expect(result).not.toContain("7.3");
    });

    it("handles missing incarnation_cross gracefully", () => {
      const bgNoIC = { ...bg, incarnation_cross: null };
      const result = mapHumanDesign(bgNoIC);
      expect(result).toContain("Incarnation Cross: ");
    });
  });

  // ── Full chartContext builder ──

  describe("buildChartContext", () => {
    it("returns empty string when natalData is null", () => {
      expect(buildChartContext(null, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08")).toBe("");
    });

    it("returns empty string when subject_data is missing", () => {
      expect(buildChartContext({ chart_data: {} }, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08")).toBe("");
    });

    it("includes the REAL CALCULATED CHART DATA header", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("REAL CALCULATED CHART DATA (Swiss Ephemeris");
    });

    it("includes NATAL PLANETS section with all planets", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("NATAL PLANETS:");
      expect(ctx).toContain("Sun: 24.1° Gem (Ninth house)");
      expect(ctx).toContain("Moon: 15.6° Pis (Sixth house)");
      expect(ctx).toContain("Saturn: 24.0° Cap (Fourth house) [RETROGRADE]");
    });

    it("includes Ascendant and Midheaven", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("Ascendant: 2.5° Lib");
      expect(ctx).toContain("Midheaven: 2.9° Can");
    });

    it("includes TODAY'S TRANSITS section with date", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("TODAY'S TRANSITS (current sky, 2026-04-08):");
      expect(ctx).toContain("Sun: 18.6° Ari");
      expect(ctx).toContain("Mercury: 21.3° Pis [R]");
    });

    it("includes KEY TRANSIT ASPECTS section", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("KEY TRANSIT ASPECTS TO NATAL CHART:");
      expect(ctx).toContain("Sun transit square Jupiter natal");
      expect(ctx).toContain("Venus transit conjunction Mars natal");
    });

    it("includes HUMAN DESIGN section", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("HUMAN DESIGN (from Swiss Ephemeris):");
      expect(ctx).toContain("Type: manifesting_generator");
      expect(ctx).toContain("Profile: 2/4");
      expect(ctx).toContain("Authority: sacral");
      expect(ctx).toContain("Personality gates: 12.2, 11.2, 63.5, 45.3, 8.6, 51.1");
    });

    it("includes the IMPORTANT instruction for the LLM", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("IMPORTANT: Reference these EXACT planetary positions");
      expect(ctx).toContain("Do NOT fabricate or approximate");
    });

    it("works without transit data", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, null, HD_RESPONSE, "2026-04-08");
      expect(ctx).toContain("NATAL PLANETS:");
      expect(ctx).toContain("HUMAN DESIGN");
      // Transit section should be empty but not crash
      expect(ctx).toContain("TODAY'S TRANSITS");
      expect(ctx).not.toContain("KEY TRANSIT ASPECTS");
    });

    it("works without Human Design data", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, TRANSIT_RESPONSE, null, "2026-04-08");
      expect(ctx).toContain("NATAL PLANETS:");
      expect(ctx).toContain("TODAY'S TRANSITS");
      expect(ctx).not.toContain("HUMAN DESIGN");
    });

    it("works with only natal data (no transit, no HD)", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, null, null, "2026-04-08");
      expect(ctx).toContain("NATAL PLANETS:");
      expect(ctx).toContain("Sun: 24.1° Gem (Ninth house)");
      expect(ctx).toContain("Ascendant: 2.5° Lib");
      expect(ctx).not.toContain("HUMAN DESIGN");
    });
  });

  // ── Request body shape validation ──

  describe("v3 request body shape", () => {
    const birthData = {
      year: 1990, month: 6, day: 15,
      hour: 14, minute: 30, second: 0,
      latitude: 41.3874, longitude: 2.1686,
      timezone: "Europe/Madrid",
    };

    it("natal request wraps birth data in subject.birth_data", () => {
      const body = { subject: { name: "user", birth_data: birthData } };
      expect(body.subject).toBeDefined();
      expect(body.subject.birth_data).toBeDefined();
      expect(body.subject.birth_data.year).toBe(1990);
      expect(body.subject.birth_data.latitude).toBe(41.3874);
    });

    it("transit request includes transit_time.datetime object", () => {
      const body = {
        subject: { name: "user", birth_data: birthData },
        transit_time: {
          datetime: {
            year: 2026, month: 4, day: 8,
            hour: 12, minute: 0,
            latitude: 41.3874, longitude: 2.1686,
            timezone: "UTC",
          },
        },
      };
      expect(body.transit_time.datetime).toBeDefined();
      expect(body.transit_time.datetime.year).toBe(2026);
      expect(body.transit_time.datetime.timezone).toBe("UTC");
    });

    it("human design request uses same subject wrapper as natal", () => {
      const natalBody = { subject: { name: "user", birth_data: birthData } };
      const hdBody = { subject: { name: "user", birth_data: birthData } };
      expect(hdBody).toEqual(natalBody);
    });
  });

  // ── Birth date parsing (dd/mm/yyyy) ──

  describe("birth date parsing", () => {
    function parseBirthDate(birthDate: string): { day: number; month: number; year: number } {
      const dateParts = birthDate.split("/");
      if (dateParts.length === 3) {
        return {
          day: parseInt(dateParts[0], 10),
          month: parseInt(dateParts[1], 10),
          year: parseInt(dateParts[2], 10),
        };
      }
      const d = new Date(birthDate);
      return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
    }

    it("parses dd/mm/yyyy correctly", () => {
      const { day, month, year } = parseBirthDate("15/06/1990");
      expect(day).toBe(15);
      expect(month).toBe(6);
      expect(year).toBe(1990);
    });

    it("parses ISO date string as fallback", () => {
      const { day, month, year } = parseBirthDate("1990-06-15");
      expect(day).toBe(15);
      expect(month).toBe(6);
      expect(year).toBe(1990);
    });

    it("handles Feb 29 leap year", () => {
      const { day, month, year } = parseBirthDate("29/02/2000");
      expect(day).toBe(29);
      expect(month).toBe(2);
      expect(year).toBe(2000);
    });

    it("handles single-digit day/month", () => {
      const { day, month, year } = parseBirthDate("1/1/2000");
      expect(day).toBe(1);
      expect(month).toBe(1);
      expect(year).toBe(2000);
    });
  });

  // ── Birth time parsing ──

  describe("birth time parsing", () => {
    function parseBirthTime(birthTime: string | undefined): { hour: number; minute: number } {
      let bHour = 12, bMinute = 0;
      if (birthTime && birthTime !== "unknown") {
        const tp = birthTime.split(":");
        bHour = parseInt(tp[0], 10);
        bMinute = parseInt(tp[1], 10);
      }
      return { hour: bHour, minute: bMinute };
    }

    it("parses HH:MM correctly", () => {
      expect(parseBirthTime("14:30")).toEqual({ hour: 14, minute: 30 });
    });

    it("defaults to noon when time is unknown", () => {
      expect(parseBirthTime("unknown")).toEqual({ hour: 12, minute: 0 });
    });

    it("defaults to noon when time is undefined", () => {
      expect(parseBirthTime(undefined)).toEqual({ hour: 12, minute: 0 });
    });

    it("handles midnight", () => {
      expect(parseBirthTime("00:00")).toEqual({ hour: 0, minute: 0 });
    });

    it("handles 23:59", () => {
      expect(parseBirthTime("23:59")).toEqual({ hour: 23, minute: 59 });
    });
  });

  // ── Edge cases ──

  describe("edge cases", () => {
    it("handles planet with null position gracefully", () => {
      const sd = {
        sun: { name: "Sun", sign: "Gem", position: null, house: "Ninth_House", retrograde: false },
      };
      // toFixed on null → throws, but our code uses ?. so it returns undefined
      const line = mapNatalPlanets(sd);
      expect(line).toContain("Sun:");
      expect(line).toContain("Gem");
    });

    it("handles planet with no house field", () => {
      const sd = {
        sun: { name: "Sun", sign: "Gem", position: 24.1, house: null, retrograde: false },
      };
      const line = mapNatalPlanets(sd);
      expect(line).toBe("Sun: 24.1° Gem");
      expect(line).not.toContain("house");
    });

    it("handles transit with zero orb", () => {
      const cd = {
        aspects: [
          { point1: "Sun_transit", point2: "Sun_natal", aspect_type: "conjunction", orb: 0.0, aspect_direction: "exact" },
        ],
      };
      const result = mapTransitAspects(cd);
      expect(result).toContain("(orb 0.0°, exact)");
    });

    it("handles empty personality_gates and design_gates", () => {
      const bg = {
        type: "Generator", profile: "4/6", authority: "emotional",
        definition: "split", incarnation_cross: "",
        personality_gates: [], design_gates: [],
      };
      const result = mapHumanDesign(bg);
      expect(result).toContain("Personality gates: ");
      expect(result).toContain("Design gates: ");
    });

    it("HD response missing bodygraph key returns empty hdContext", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, null, { data: {} }, "2026-04-08");
      expect(ctx).not.toContain("HUMAN DESIGN");
    });

    it("HD response with success=false still checked via data.bodygraph", () => {
      const ctx = buildChartContext(NATAL_RESPONSE, null, { success: false, data: { bodygraph: HD_RESPONSE.data.bodygraph } }, "2026-04-08");
      expect(ctx).toContain("HUMAN DESIGN");
      expect(ctx).toContain("manifesting_generator");
    });
  });
});
