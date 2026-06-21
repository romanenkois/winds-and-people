import { gameConfig } from './config';

export interface GameScene {
  gameMap: GameMap;
  lithosphericPlates: LithosphericPlatesMap;
}

export type GameTileId = number;
export type LithosphericPlateId = number;
export interface Coordinates {
  x: number;
  y: number;
  z: number;
}

export type LithosphericPlatesMap = Map<LithosphericPlateId, LithosphericPlate>;
export interface LithosphericPlate {
  id: LithosphericPlateId;
  type: LithosphericType;
  seedId: GameTileId;
  tiles: Set<GameTileId>;
  frontier: Set<GameTileId>;
  movementVector: Coordinates;
}

export type GameMap = Map<GameTileId, GameTile>;
export interface GameTile {
  id: GameTileId;

  base: {
    type: TileType;
    neighbors: Set<GameTileId>;
    cordinates: Coordinates;
    corners: Coordinates[];
  };



  lithosphericData: {
    lithosphericPlateId: number;
    lithosphericType: LithosphericType;
    lithosphericActivityStress?: number;
  };

  terrainData: {
    elevation: number;
    // terrainType: TerrainType;
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
export enum TerrainType {
  OpenOcean = 'open-ocean',

  Continent = 'continent',
  ContinentalShelf = 'continental-shelf',

  SmallLake = 'small-lake',
  LargeLake = 'large-lake',

  SmallIsland = 'small-island',
  LargeIsland = 'large-island',
}

export type LandBiome = (typeof gameConfig.biomes.landBiomes)[number];
export type OceanicBiome = (typeof gameConfig.biomes.oceanBiomes)[number];
export type Biome = LandBiome | OceanicBiome;

export enum MapMode {
  Lithospheric = 'lithospheric',
  LithosphericActivity = 'lithospheric-activity',
  Elevation = 'elevation',
  Temperature = 'temperature',
  Humidity = 'humidity',
  Biomes = 'biomes',
}
