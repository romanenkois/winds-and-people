import { Injectable } from '@angular/core';
import { GameTile, GameTileId } from '../../map.types';
import { GeneratorTemperatureMap } from './generator-temperature-map';

export type GeneratorHumidityMapTile = Pick<
  GameTile,
  'id' | 'base' | 'lithosphericData' | 'terrainData'
> & {
  climateData: Pick<GameTile['climateData'], 'temperature' | 'humidity'>;
};
export type GeneratorHumidityMap = Map<GameTileId, GeneratorHumidityMapTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorHumidityMapService {
  public generateHumidity(map: GeneratorTemperatureMap): GeneratorHumidityMap {
    const newMap = new Map<GameTileId, GeneratorHumidityMapTile>();

    map.forEach((tile, id) => {
      let humidity = 0;
      if (tile.lithosphericData.lithosphericType === 'ocean') {
        humidity = 80 + Math.random() * 20; // Ocean tiles have high humidity
      } else {
        humidity = 30 + Math.random() * 50 - tile.terrainData.elevation * 0.01;
        humidity = Math.max(0, Math.min(100, humidity)); // Clamp between 0 and 100
      }

      newMap.set(id, {
        ...tile,
        climateData: {
          ...tile.climateData,
          humidity,
        },
      });
    });

    return newMap;
  }
}
