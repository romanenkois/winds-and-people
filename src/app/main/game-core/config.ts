export const gameConfig = {
  biomes: {
    oceanBiomes: [
      'deep ocean',
      'shallow ocean',
      'freezing ocean',
      'arctic ocean',
      'coral reef',
    ] as const,
    landBiomes: [
      'mountain',
      'inland sea',
      'freezing inland sea',

      'arctic desert',
      'tundra',
      'taiga',
      'forest',
      'plains',
      'desert',
      'jungle',
    ] as const,
  } as const,
};
