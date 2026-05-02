
export const ACU_PACKAGES = {
  ENTRY: {
    code: "ENTRY",
    pricePence: 500,
    baseACUs: 500,
    bonusACUs: 0,
    totalACUs: 500,
    label: "Entry"
  },
  GROWTH: {
    code: "GROWTH",
    pricePence: 1000,
    baseACUs: 1000,
    bonusACUs: 100,
    totalACUs: 1100,
    label: "Growth"
  },
  SCALE: {
    code: "SCALE",
    pricePence: 1500,
    baseACUs: 1500,
    bonusACUs: 150,
    totalACUs: 1650,
    label: "Scale"
  }
} as const;
