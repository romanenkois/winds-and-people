import { inject, Injectable, Optional } from '@angular/core';
import { BaseHexTile, Biome, GameScene, HexTile, LithosphericType } from '../map.types';
import { gameConfig } from '../config';
import {
  GeneratorElevationMapService,
  GeneratorHexMapService,
  GeneratorLithosphericMapService,
} from './generators';

interface MapGenerationParams {
  subdivisionLevel: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapGeneratorService {
  private readonly _generatorHexMapService = inject(GeneratorHexMapService);
  private readonly _generatorLithosphericMapService = inject(GeneratorLithosphericMapService);
  private readonly _generatorElevationMapService = inject(GeneratorElevationMapService);

  public generateMap(params: MapGenerationParams): GameScene {
    const newGameScene: Partial<GameScene> = {};

    const hexMap = this._generatorHexMapService.generateGeodesicSphere(params.subdivisionLevel);
    const lithosphericPlatesMap =
      this._generatorLithosphericMapService.generateLithosphericPlates(hexMap);
    const elevationMap =
      this._generatorElevationMapService.generateElevation(lithosphericPlatesMap);
    const temperatureMap = this._generateTemperature(elevationMap);
    const humidityMap = this._generateHumidity(temperatureMap);
    const biomeMap = this._generateBiomes(humidityMap);

    newGameScene.gameMap = biomeMap;

    return newGameScene as GameScene;
  }

  private _generateTemperature(
    map: Map<number, Omit<HexTile, 'biome' | 'temperature' | 'humidity'>>,
  ): Map<number, Omit<HexTile, 'biome' | 'humidity'>> {
    const newMap = new Map<number, Omit<HexTile, 'biome' | 'humidity'>>();

    map.forEach((tile, id) => {
      // Simple model: temperature decreases with elevation and latitude (y coordinate)
      const latitudeFactor = 1 - Math.abs(tile.y); // y ranges from -1 to 1
      const baseTemp = 30 * latitudeFactor; // Max temp at equator ~30C
      const elevationEffect = Math.max(0, tile.elevation) * 0.0065; // Approx lapse rate: 6.5C per 1000m
      const temperature = baseTemp - elevationEffect;

      newMap.set(id, {
        ...tile,
        temperature,
      });
    });

    return newMap;
  }

  private _generateHumidity(
    map: Map<number, Omit<HexTile, 'biome' | 'humidity'>>,
  ): Map<number, Omit<HexTile, 'biome'>> {
    const newMap = new Map<number, Omit<HexTile, 'biome'>>();

    map.forEach((tile, id) => {
      let humidity = 0;
      if (tile.lithosphericType === 'ocean') {
        humidity = 80 + Math.random() * 20; // Ocean tiles have high humidity
      } else {
        humidity = 30 + Math.random() * 50 - tile.elevation * 0.01;
        humidity = Math.max(0, Math.min(100, humidity)); // Clamp between 0 and 100
      }

      newMap.set(id, {
        ...tile,
        humidity,
      });
    });

    return newMap;
  }

  private _generateBiomes(map: Map<number, Omit<HexTile, 'biome'>>): Map<number, HexTile> {
    const newMap = new Map<number, HexTile>();

    map.forEach((tile, id) => {
      newMap.set(id, {
        ...tile,
        biome: this._getRandomBiome(tile as HexTile),
      });
    });

    return newMap;
  }

  // private

  private _isFarEnough(
    id: number,
    seeds: number[],
    map: Map<number, BaseHexTile>,
    minDist: number,
  ): boolean {
    if (seeds.length === 0) return true;
    const queue: { id: number; dist: number }[] = [{ id, dist: 0 }];
    const visited = new Set<number>([id]);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.dist >= minDist) continue;

      const tile = map.get(current.id);
      if (tile) {
        for (const n of tile.neighbors) {
          if (seeds.includes(n)) return false;
          if (!visited.has(n)) {
            visited.add(n);
            queue.push({ id: n, dist: current.dist + 1 });
          }
        }
      }
    }
    return true;
  }

  private _getRandomBiome(tile: HexTile): Biome {
    const biomes: Biome[] =
      tile.lithosphericType === 'land'
        ? gameConfig.biomes.landBiomes
        : gameConfig.biomes.oceanBiomes;

    const index = Math.floor(Math.random() * biomes.length);
    return biomes[index];
  }
}
