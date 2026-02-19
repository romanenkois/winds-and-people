import { Injectable } from '@angular/core';
import { Biome, GameTile, GameTileId, LithosphericType } from '../../map.types';
import { gameConfig } from '../../config';
import { GeneratorHumidityMap } from './generator-humidity-map';

export type GeneratorBiomeHexTile = GameTile;
export type GeneratorBiomesMap = Map<GameTileId, GeneratorBiomeHexTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorBiomesMapService {
  public generateBiomes(map: GeneratorHumidityMap): Map<number, GameTile> {
    const newMap = new Map<number, GameTile>();

    map.forEach((tile, id) => {
      newMap.set(id, {
        ...tile,
        climateData: {
          ...tile.climateData,
          biome: this._determineBiome(tile as GameTile),
        },
      });
    });

    return newMap;
  }

  private _getRandomBiome(tile: GameTile): Biome {
    const biomes: readonly Biome[] =
      tile.lithosphericData.lithosphericType === LithosphericType.Continental
        ? gameConfig.biomes.landBiomes
        : gameConfig.biomes.oceanBiomes;

    const index = Math.floor(Math.random() * biomes.length);
    return biomes[index];
  }

  private _determineBiome(tile: GameTile): Biome {
    if (tile.terrainData.elevation <= 0) {
      if (tile.lithosphericData.lithosphericType === LithosphericType.Continental) {
        if (tile.climateData.temperature > 5) {
          return 'inland sea';
        } else {
          return 'freezing inland sea';
        }
      }

      if (tile.climateData.temperature < 0) {
        return 'arctic ocean';
      } else if (tile.climateData.temperature < 5) {
        return 'freezing ocean';
      } else if (tile.climateData.temperature > 32 && tile.terrainData.elevation > -5) {
        return 'coral reef';
      } else if (tile.terrainData.elevation < -700) {
        return 'deep ocean';
      } else {
        return 'shallow ocean';
      }
    } else {
      if (tile.terrainData.elevation > 1000) {
        return 'mountain';
      }
      if (tile.climateData.temperature < 0) {
        return 'arctic desert';
      } else if (tile.climateData.temperature < 5) {
        return 'tundra';
      } else if (tile.climateData.temperature < 10) {
        return 'taiga';
      } else if (tile.climateData.temperature < 20) {
        return 'forest';
      } else if (tile.climateData.temperature < 28) {
        if (tile.climateData.humidity < 50) {
          return 'desert';
        } else {
          return 'jungle';
        }
      } else {
        return 'desert';
      }
    }
  }
}
