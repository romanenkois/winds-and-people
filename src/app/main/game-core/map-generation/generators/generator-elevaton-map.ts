import { inject, Injectable } from '@angular/core';
import { GameTileId, GameTile, LithosphericPlatesMap } from '../../map.types';
import { GeneratorLithosphericMap } from './generator-lithospheric-map';
import { MapUtils } from './utils';

export type GeneratorElevationMapTile = Pick<
  GameTile,
  | 'id'
  | 'type'
  | 'neighbors'
  | 'x'
  | 'y'
  | 'z'
  | 'lithosphericPlateId'
  | 'lithosphericType'
  | 'lithosphericActivityStress'
  | 'elevation'
>;
export type GeneratorElevationMap = Map<GameTileId, GeneratorElevationMapTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorElevationMapService {
  private readonly _mapUtils = inject(MapUtils);

  public generateElevation(params: {
    map: GeneratorLithosphericMap;
    lithosphericPlatesMap: LithosphericPlatesMap;
  }): GeneratorElevationMap {
    const newMap = new Map<GameTileId, GeneratorElevationMapTile>();
    let maxElevationGenerated = 0;
    let minElevationGenerated = 0;

    params.map.forEach((tile, id) => {
      let elevation = 0;
      if (tile.lithosphericType === 'ocean') {
        elevation = -Math.random() * 300 - 1000;

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 0.1) {
          elevation =
            elevation -
            Math.abs(Math.pow((Math.random() + 0.8) * tile.lithosphericActivityStress, 3) * 40);
        }

        const closestLandTile = this._mapUtils.closestSelectedPlateTile({
          map: params.map,
          tile,
          type: 'land',
          skipHexDistance: 5,
        })[0];

        if (closestLandTile) {
          const dist = closestLandTile.hexDistance;
          const maxShallowDist = 12;

          if (dist < maxShallowDist) {
            const factor = Math.max(0, 1 - (dist - 1) / 10);
            const shallowElevation = -20 - Math.random() * 70;
            elevation = elevation * (1 - factor) + shallowElevation * factor;
          }
        }

        if (elevation < minElevationGenerated) {
          minElevationGenerated = elevation;
          console.log('New min elevation generated:', minElevationGenerated);
        }
      } else {
        elevation = Math.random() * 400 + 100;

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 0.1) {
          elevation = Math.max(
            Math.pow(
              (0.8 + (0.6 * (Math.random() + Math.random())) / 2) * tile.lithosphericActivityStress,
              4,
            ) *
              15 +
              elevation,
            -200,
          );
        }

        const closestOceanTile = this._mapUtils.closestSelectedPlateTile({
          map: params.map,
          tile,
          type: 'ocean',
          skipHexDistance: 5,
        })[0];

        if (closestOceanTile) {
          const dist = closestOceanTile.hexDistance;
          const maxLowlandDist = 8;

          if (dist < maxLowlandDist) {
            const factor = Math.max(0, 2 - (dist - 1) / 10);
            const lowlandElevation = 10 + Math.random() * 50;
            elevation = elevation * (1 - factor) + lowlandElevation * factor;
          }
        }

        if (elevation > maxElevationGenerated) {
          maxElevationGenerated = elevation;
          console.log('New max elevation generated:', maxElevationGenerated);
        }
      }

      newMap.set(id, {
        ...tile,
        elevation,
      });
    });

    return newMap;
  }
}
