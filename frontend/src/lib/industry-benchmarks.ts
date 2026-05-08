/**
 * Representative industry benchmarks for CIS Controls v8.
 * These are synthetic baselines based on typical sector maturity,
 * not from a published survey. They are useful for comparison only.
 */

export interface IndustryBenchmark {
  name: string;
  total: number;
  byControl: Record<number, number>;
}

export const INDUSTRIES = [
  { key: "government", name: "Government / Defense" },
  { key: "finance", name: "Finance / Insurance" },
  { key: "healthcare", name: "Healthcare" },
  { key: "technology", name: "Technology / SaaS" },
  { key: "energy", name: "Energy / Utilities" },
  { key: "retail", name: "Retail / E-commerce" },
  { key: "manufacturing", name: "Manufacturing" },
  { key: "education", name: "Education" },
] as const;

export type IndustryKey = (typeof INDUSTRIES)[number]["key"];

export const BENCHMARKS: Record<IndustryKey, IndustryBenchmark> = {
  government: {
    name: "Government / Defense",
    total: 82,
    byControl: {
      1: 95, 2: 93, 3: 90, 4: 88, 5: 86,
      6: 88, 7: 90, 8: 85, 9: 88, 10: 86, 11: 82, 12: 84, 13: 85,
      14: 75, 15: 68, 16: 65, 17: 72, 18: 62,
    },
  },
  finance: {
    name: "Finance / Insurance",
    total: 78,
    byControl: {
      1: 92, 2: 90, 3: 88, 4: 86, 5: 84,
      6: 86, 7: 88, 8: 82, 9: 85, 10: 83, 11: 78, 12: 80, 13: 82,
      14: 70, 15: 62, 16: 60, 17: 68, 18: 55,
    },
  },
  healthcare: {
    name: "Healthcare",
    total: 72,
    byControl: {
      1: 88, 2: 85, 3: 82, 4: 80, 5: 78,
      6: 80, 7: 82, 8: 76, 9: 78, 10: 76, 11: 72, 12: 74, 13: 75,
      14: 62, 15: 55, 16: 52, 17: 60, 18: 48,
    },
  },
  technology: {
    name: "Technology / SaaS",
    total: 68,
    byControl: {
      1: 85, 2: 82, 3: 78, 4: 76, 5: 72,
      6: 74, 7: 78, 8: 70, 9: 72, 10: 70, 11: 66, 12: 68, 13: 68,
      14: 58, 15: 50, 16: 48, 17: 56, 18: 45,
    },
  },
  energy: {
    name: "Energy / Utilities",
    total: 65,
    byControl: {
      1: 82, 2: 78, 3: 75, 4: 74, 5: 72,
      6: 72, 7: 76, 8: 68, 9: 70, 10: 68, 11: 64, 12: 66, 13: 66,
      14: 56, 15: 48, 16: 46, 17: 54, 18: 42,
    },
  },
  retail: {
    name: "Retail / E-commerce",
    total: 58,
    byControl: {
      1: 78, 2: 74, 3: 70, 4: 68, 5: 66,
      6: 64, 7: 68, 8: 60, 9: 62, 10: 60, 11: 56, 12: 58, 13: 58,
      14: 48, 15: 40, 16: 38, 17: 46, 18: 35,
    },
  },
  manufacturing: {
    name: "Manufacturing",
    total: 55,
    byControl: {
      1: 75, 2: 70, 3: 66, 4: 65, 5: 64,
      6: 60, 7: 65, 8: 56, 9: 58, 10: 56, 11: 52, 12: 54, 13: 54,
      14: 44, 15: 36, 16: 34, 17: 42, 18: 32,
    },
  },
  education: {
    name: "Education",
    total: 52,
    byControl: {
      1: 72, 2: 68, 3: 64, 4: 62, 5: 60,
      6: 58, 7: 62, 8: 54, 9: 56, 10: 54, 11: 50, 12: 52, 13: 52,
      14: 42, 15: 34, 16: 32, 17: 40, 18: 30,
    },
  },
};

export function getGroupScores(benchmark: IndustryBenchmark) {
  const basic = [1, 2, 3, 4, 5];
  const foundational = [6, 7, 8, 9, 10, 11, 12, 13];
  const organizational = [14, 15, 16, 17, 18];

  const avg = (ids: number[]) =>
    Math.round(ids.reduce((sum, id) => sum + benchmark.byControl[id], 0) / ids.length);

  return {
    Basic: avg(basic),
    Foundational: avg(foundational),
    Organizational: avg(organizational),
  };
}

export function getIGScores(benchmark: IndustryBenchmark) {
  // Approximate mapping of controls to IG (IG1 = all, IG2 = most, IG3 = some)
  // This is a simplification; real IG mapping is per-safeguard
  const ig1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const ig2 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const ig3 = Array.from({ length: 18 }, (_, i) => i + 1);

  const avg = (ids: number[]) =>
    Math.round(ids.reduce((sum, id) => sum + benchmark.byControl[id], 0) / ids.length);

  return {
    IG1: avg(ig1),
    IG2: avg(ig2),
    IG3: avg(ig3),
  };
}

export function getSpiderData(benchmark: IndustryBenchmark) {
  return Array.from({ length: 18 }, (_, i) => ({
    cis_id: String(i + 1),
    current: benchmark.byControl[i + 1],
    target: 100,
  }));
}
