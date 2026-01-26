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
        biome: this._getRandomBiome(tile as GameTile),
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
}
