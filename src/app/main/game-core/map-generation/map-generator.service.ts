import { inject, Injectable, Optional } from '@angular/core';
import { GameScene } from '../map.types';
import { gameConfig } from '../config';
import {
  GeneratorBiomesMapService,
  GeneratorElevationMapService,
  GeneratorHexMapService,
  GeneratorHumidityMapService,
  GeneratorLithosphericMapService,
  GeneratorTemperatureMapService,
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
  private readonly _generatorTemperatureMapService = inject(GeneratorTemperatureMapService);
  private readonly _generatorHumidityMapService = inject(GeneratorHumidityMapService);
  private readonly _generatorBiomesMapService = inject(GeneratorBiomesMapService);

  public generateMap(params: MapGenerationParams): GameScene {
    const newGameScene: Partial<GameScene> = {};

    const hexMap = this._generatorHexMapService.generateGeodesicSphere(params.subdivisionLevel);
    console.log('Hex Map generated');

    const lithosphericPlatesMap =
      this._generatorLithosphericMapService.generateLithosphericPlates(hexMap);
    console.log('Lithospheric Plates generated');

    const elevationMap = this._generatorElevationMapService.generateElevation({
      map: lithosphericPlatesMap.map,
      lithosphericPlatesMap: lithosphericPlatesMap.lithosphericPlatesMap,
    });
    console.log('Elevation Map generated');

    const temperatureMap = this._generatorTemperatureMapService.generateTemperature(elevationMap);
    console.log('Temperature Map generated');

    const humidityMap = this._generatorHumidityMapService.generateHumidity(temperatureMap);
    console.log('Humidity Map generated');

    const biomeMap = this._generatorBiomesMapService.generateBiomes(humidityMap);
    console.log('Biome Map generated');

    newGameScene.gameMap = biomeMap as unknown as GameScene['gameMap'];

    return newGameScene as GameScene;
  }
}
