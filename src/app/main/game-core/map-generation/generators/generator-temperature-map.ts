import { Injectable } from '@angular/core';
import { GameTile } from '../../map.types';
import { GeneratorElevationMap } from './generator-elevation-map';

export type GeneratorTemperatureMapTile = Pick<GameTile, 'id' | 'base' | 'lithosphericData'> & {
  climateData: Pick<GameTile['climateData'], 'temperature'>;
};
export type GeneratorTemperatureMap = Map<number, GeneratorTemperatureMapTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorTemperatureMapService {
  public generateTemperature(map: GeneratorElevationMap): GeneratorTemperatureMap {
    const newMap = new Map<number, GeneratorTemperatureMapTile>();

    map.forEach((tile, id) => {
      // Simple model: temperature decreases with elevation and latitude (y coordinate)
      const latitudeFactor = 0.95 - Math.abs(tile.base.cordinates.y); // y ranges from -1 to 1
      const baseTemp = 35 * latitudeFactor; // Max temp at equator ~30C
      const elevationEffect = Math.max(0, tile.lithosphericData.elevation) * 0.0065; // Approx lapse rate: 6.5C per 1000m
      const temperature = baseTemp - elevationEffect;

      newMap.set(id, {
        ...tile,
        climateData: {
          temperature,
        },
      });
    });

    return newMap;
  }
}
