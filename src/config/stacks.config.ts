export const stacksConfig = {
  boxes: {
    ambientWidth: 54,
    highlightWidth: 60,
    mobileAmbientWidth: 48,
    mobileHighlightWidth: 52,
    gap: 4,
    mobileGap: 3,
  },
  card: {
    maxWidth: 132,
    maxHeight: 200,
    padding: "15px 16px",
  },
  typography: {
    title: {
      size: 17,
      weight: 600,
      lineHeight: 1.4,
    },
    question: {
      size: 13,
      weight: 500,
      lineHeight: 1.6,
    },
    records: {
      size: 11,
      weight: 700,
    },
  },
} as const;
