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
    const lithosphericPlatesMap =
      this._generatorLithosphericMapService.generateLithosphericPlates(hexMap);
    const elevationMap =
      this._generatorElevationMapService.generateElevation(lithosphericPlatesMap);
    const temperatureMap = this._generatorTemperatureMapService.generateTemperature(elevationMap);
    const humidityMap = this._generatorHumidityMapService.generateHumidity(temperatureMap);
    const biomeMap = this._generatorBiomesMapService.generateBiomes(humidityMap);

    newGameScene.gameMap = biomeMap;

    return newGameScene as GameScene;
  }



  // private




}
