import { Injectable } from '@angular/core';
import { Biome, GameTile, GameTileId } from '../../map.types';
import { gameConfig } from '../../config';

export type GeneratorBiomeHexTile = GameTile;
export type GeneratorBiomesMap = Map<GameTileId, GeneratorBiomeHexTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorBiomesMapService {
  public generateBiomes(map: Map<number, Omit<GameTile, 'biome'>>): Map<number, GameTile> {
    const newMap = new Map<number, GameTile>();

    map.forEach((tile, id) => {
      newMap.set(id, {
        ...tile,
        biome: this._determineBiome(tile as GameTile),
      });
    });

    return newMap;
  }

  private _getRandomBiome(tile: GameTile): Biome {
    const biomes: Biome[] =
      tile.lithosphericType === 'land'
        ? gameConfig.biomes.landBiomes
        : gameConfig.biomes.oceanBiomes;

    const index = Math.floor(Math.random() * biomes.length);
    return biomes[index];
  }

  private _determineBiome(tile: GameTile): Biome {
    if (tile.elevation < 0) {
      if (tile.temperature < 0) {
        return 'arctic ocean';
      } else if (tile.temperature < 5) {
        return 'freezing ocean';
      } else if (tile.temperature > 30 && tile.elevation > -100) {
        return 'coral reef';
      } else if (tile.elevation < -700) {
        return 'deep ocean';
      } else {
        return 'shallow ocean';
      }
    }
    if (tile.elevation >= 0) {
      if (tile.elevation > 1000) {
        return 'mountain';
      }
      if (tile.temperature < 0) {
        return 'arctic desert';
      } else if (tile.temperature < 5) {
        return 'tundra';
      } else if (tile.temperature < 10) {
        return 'taiga';
      } else if (tile.temperature < 20) {
        return 'forest';
      } else if (tile.temperature < 28) {
        if (tile.humidity < 50) {
          return 'desert';
        } else {
          return 'jungle';
        }
      } else {
        return 'desert';
      }
    }
    return 'ocean';
  }
}
