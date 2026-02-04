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

  randomSeeds = {
    seedA: 0,
    seedB: 0,
    seedC: 0,
    seedD: 0,
  };

  constructor() {
    this.randomSeeds.seedA = Math.random() * 10000;
    this.randomSeeds.seedB = Math.random() * 10000;
    this.randomSeeds.seedC = Math.random() * 10000;
    this.randomSeeds.seedD = Math.random() * 10000;
  }

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
        elevation = this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 1),
          -3000,
          0,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 2),
          -1000,
          400,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedC, 4),
          -500,
          100,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedD, 8),
          -100,
          50,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 16),
          -20,
          20,
        );

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 0.1) {
          elevation =
            elevation -
            Math.abs(Math.pow((Math.random() + 0.8) * tile.lithosphericActivityStress, 3) * 40);
        } else {
          const randomIslands: number | false = (() => {
            let a = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 32),
              0,
              70,
            );
            let b = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 8),
              0,
              130,
            );
            let c = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 4),
              0,
              150,
            );
            a = a + b + c;
            return a > 250 ? (a - 250) * 12 : false;
          })();
          const randomIslandsOreol: number | false = (() => {
            let a = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 32),
              0,
              70,
            );
            let b = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 8),
              0,
              130,
            );
            let c = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 4),
              0,
              130,
            );
            let d = this.remap(
              this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 2),
              0,
              40,
            );
            a = a + b + c + d;
            return a > 230 ? -(a - 230) : false;
          })();

          if (
            randomIslands !== false &&
            randomIslands > 0 &&
            tile.lithosphericActivityStress &&
            Math.abs(tile.lithosphericActivityStress) < 0.05
          ) {
            elevation = randomIslands;
          } else if (randomIslandsOreol !== false && randomIslandsOreol < 0) {
            elevation = randomIslandsOreol;
          }
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
        // elevation = 2000;
        elevation = this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 1),
          0,
          500,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedB, 2),
          0,
          70,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedC, 4),
          0,
          30,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedD, 8),
          0,
          15,
        );
        elevation += this.remap(
          this.getNoise(tile.x, tile.y, tile.z, this.randomSeeds.seedA, 16),
          0,
          10,
        );

        if (tile.lithosphericActivityStress && Math.abs(tile.lithosphericActivityStress) > 0.1) {
          elevation = Math.max(
            Math.pow(
              (0.8 + (0.6 * (Math.random() + Math.random())) / 2) * tile.lithosphericActivityStress,
              4,
            ) *
              15 +
              elevation,
            -100,
          );
        }

        if (elevation > 0) {
          const closestOceanTile = this._mapUtils.closestSelectedPlateTile({
            map: params.map,
            tile,
            type: 'ocean',
            skipHexDistance: 7,
          })[0];

          if (closestOceanTile) {
            elevation = this.smoothElevationNearOcean(
              elevation,
              closestOceanTile.hexDistance,
              1,
              7,
              200,
              'sigmoid',
            );
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

  private hash(x: number, y: number, z: number, seed: number): number {
    // Simple hash function
    let h = seed + x * 374761393 + y * 668265263 + z * 1274126177;
    h = (h ^ (h >> 13)) * 1274126177;
    return (((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff) * 2 - 1;
  }

  getNoise(x: number, y: number, z: number, seed: number, scale: number = 1): number {
    x *= scale;
    y *= scale;
    z *= scale;

    // Get integer and fractional parts
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    const xf = x - xi;
    const yf = y - yi;
    const zf = z - zi;

    // Smooth interpolation
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const w = zf * zf * (3 - 2 * zf);

    // Interpolate between corner values
    const n000 = this.hash(xi, yi, zi, seed);
    const n100 = this.hash(xi + 1, yi, zi, seed);
    const n010 = this.hash(xi, yi + 1, zi, seed);
    const n110 = this.hash(xi + 1, yi + 1, zi, seed);
    const n001 = this.hash(xi, yi, zi + 1, seed);
    const n101 = this.hash(xi + 1, yi, zi + 1, seed);
    const n011 = this.hash(xi, yi + 1, zi + 1, seed);
    const n111 = this.hash(xi + 1, yi + 1, zi + 1, seed);

    const nx00 = n000 * (1 - u) + n100 * u;
    const nx10 = n010 * (1 - u) + n110 * u;
    const nx01 = n001 * (1 - u) + n101 * u;
    const nx11 = n011 * (1 - u) + n111 * u;

    const nxy0 = nx00 * (1 - v) + nx10 * v;
    const nxy1 = nx01 * (1 - v) + nx11 * v;

    return nxy0 * (1 - w) + nxy1 * w;
  }

  smoothElevationNearOcean(
    elevation: number,
    distanceToOcean: number,
    maxSmoothDistance: number = 2,
    noSmoothDistance: number = 6,
    randomVariance: number = 0.1,
    smoothingType: 'sigmoid' | 'smoothstep' | 'quintic' | 'exponential' = 'smoothstep',
  ): number {
    // If beyond no-smooth distance, return original elevation
    if (distanceToOcean >= noSmoothDistance) {
      return elevation;
    }

    // Calculate normalized distance (0 = max smooth, 1 = no smooth)
    const normalizedDistance = Math.max(
      0,
      Math.min(1, (distanceToOcean - maxSmoothDistance) / (noSmoothDistance - maxSmoothDistance)),
    );

    // Calculate smoothing factor based on curve type
    let smoothingFactor: number;

    switch (smoothingType) {
      case 'sigmoid':
        // Sigmoid curve: aggressive smoothing, good falloff
        // Maps 0->1 to ~0->~1 with S-curve
        smoothingFactor = 1 / (1 + Math.exp(-10 * (normalizedDistance - 0.5)));
        break;

      case 'smoothstep':
        // Smoothstep: Best balance of performance and quality
        // Hermite interpolation
        smoothingFactor = normalizedDistance * normalizedDistance * (3 - 2 * normalizedDistance);
        break;

      case 'quintic':
        // Quintic smoothstep: Smoother than smoothstep, very natural looking
        smoothingFactor =
          normalizedDistance *
          normalizedDistance *
          normalizedDistance *
          (normalizedDistance * (normalizedDistance * 6 - 15) + 10);
        break;

      case 'exponential':
        // Exponential decay: Most aggressive near boundary
        smoothingFactor = 1 - Math.exp(-4 * normalizedDistance);
        break;

      default:
        smoothingFactor = normalizedDistance;
    }

    // Add random variance at the boundary
    const boundaryValue = (Math.random() - 0.5) * 2 * randomVariance;

    // Interpolate between boundary value and original elevation
    return Math.max(5, boundaryValue * (1 - smoothingFactor) + elevation * smoothingFactor);
  }

  remap(v: number, min: number, max: number) {
    return min + (v + 1) * 0.5 * (max - min);
  }
}
