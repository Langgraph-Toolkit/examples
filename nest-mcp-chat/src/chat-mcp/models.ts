/** Explicit, reusable model-tier policy. Provider values are read only during resource bootstrap. */
export const modelTiers = {
  smart: { fromEnvironment: true, temperature: 0.1, reasoningEffort: 'none' },
  cheap: { fromEnvironment: true, temperature: 0.1, reasoningEffort: 'none' },
} as const;
