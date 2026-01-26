import { Injectable } from '@angular/core';
import { GameTile } from '../../map.types';
import { GeneratorElevationMap } from './generator-elevaton-map';

export type GeneratorTemperatureMapTile = Pick<
  GameTile,
  | 'id'
  | 'type'
  | 'neighbors'
  | 'x'
  | 'y'
  | 'z'
  | 'lithosphericPlateId'
  | 'lithosphericType'
  | 'elevation'
  | 'temperature'
>;
export type GeneratorTemperatureMap = Map<number, GeneratorTemperatureMapTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorTemperatureMapService {
  public generateTemperature(map: GeneratorElevationMap): GeneratorTemperatureMap {
    const newMap = new Map<number, Omit<GeneratorTemperatureMapTile, 'temperature'>>();

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
}
