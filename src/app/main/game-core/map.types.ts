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
  plateMovementVector: { x: number; y: number; z: number };
}

export type GameMap = Map<GameTileId, GameTile>;
export interface GameTile {
  id: GameTileId;

  base: {
    type: TileType;
    neighbors: GameTileId[];
    cordinates: {
      x: number;
      y: number;
      z: number;
    };
    corners?: {
      x: number;
      y: number;
      z: number;
    }[];
  };

  lithosphericData: {
    lithosphericPlateId: number;
    lithosphericType: LithosphericType;
    lithosphericActivityStress?: number;

    elevation: number;
  };

  climateData: {
    temperature: number;
    humidity: number;
    biome: Biome;
  };
}

export enum TileType {
  Hex = 'hex',
  Pent = 'pent',
}
export enum LithosphericType {
  Ocean = 'ocean',
  Continental = 'continental',
}
export type LandBiome = (typeof gameConfig.biomes.landBiomes)[number];
export type OceanicBiome = (typeof gameConfig.biomes.oceanBiomes)[number];
export type Biome = LandBiome | OceanicBiome;
