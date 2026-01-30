import { gameConfig } from './config';

export interface GameScene {
  gameMap: GameMap;
  lithosphericPlates: LithosphericPlatesMap;
}

export type GameTileId = number;
export type LithosphericPlateId = number;

export type LithosphericPlatesMap = Map<LithosphericPlateId, LithosphericPlate>;
export interface LithosphericPlate {
  id: LithosphericPlateId;
  type: LithosphericType;
  tiles: GameTileId[];
}

export type GameMap = Map<GameTileId, GameTile>;
export interface GameTile {
  id: GameTileId;
  type: TileType;
  neighbors: GameTileId[];
  x: number;
  y: number;
  z: number;
  corners?: { x: number; y: number; z: number }[];

  lithosphericPlateId: number;
  lithosphericType: LithosphericType;

  elevation: number;
  temperature: number;
  humidity: number;

  biome: Biome;
}

export type TileType = 'hex' | 'pent';
export type LithosphericType = 'ocean' | 'land';
export type LandBiome = (typeof gameConfig.biomes.landBiomes)[number];
export type OceanicBiome = (typeof gameConfig.biomes.oceanBiomes)[number];
export type Biome = LandBiome | OceanicBiome;
