import { Injectable } from '@angular/core';
import { GameTileId, GameTile } from '../../map.types';
import { GeneratorLithosphericMap } from './generator-lithospheric-map';

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
  | 'elevation'
>;
export type GeneratorElevationMap = Map<GameTileId, GeneratorElevationMapTile>;

@Injectable({
  providedIn: 'root',
})
export class GeneratorElevationMapService {
  public generateElevation(map: GeneratorLithosphericMap): GeneratorElevationMap {
    const newMap = new Map<GameTileId, GeneratorElevationMapTile>();

    map.forEach((tile, id) => {
      let elevation = 0;
      if (tile.lithosphericType === 'ocean') {
        elevation = -Math.random() * 1000; // Ocean depth between 0 and -1000
      } else {
        elevation = Math.random() * 2000; // Land elevation between 0 and 2000
      }

      newMap.set(id, {
        ...tile,
        elevation,
      });
    });

    return newMap;
  }
}
