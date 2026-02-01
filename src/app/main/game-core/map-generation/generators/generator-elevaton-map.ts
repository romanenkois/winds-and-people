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

    params.map.forEach((tile, id) => {
      let elevation = 0;
      if (tile.lithosphericType === 'ocean') {
        elevation = -Math.random() * 300 - 1000;

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 1) {
          elevation = elevation - Math.abs(Math.pow(tile.lithosphericActivityStress, 3) * 40);

          const closestLandTile = this._mapUtils.closestSelectedPlateTile({
            map: params.map,
            tile,
            type: 'land',
          })[0];

          if (closestLandTile.relativeDistance > 0.1) {
            //
          }
        }
      } else {
        elevation = Math.random() * 400 + 100;

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 1) {
          elevation = Math.max(
            Math.pow(tile.lithosphericActivityStress, 3) * 200 + elevation,
            -200,
          );
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
