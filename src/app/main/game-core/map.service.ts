import { inject, Injectable } from '@angular/core';
import { Biome, HexTile } from './map.types';
import { MapGeneratorService } from './map-generation/map-generator.service';

@Injectable({
  providedIn: 'root',
})
export class MapService {
  private readonly _mapGeneratorService = inject(MapGeneratorService);

  private map = new Map<number, HexTile>();

  public generateNewMap(subdivisionLevel: number) {
    this.map.clear();
    const totalTiles = 10 * Math.pow(4, subdivisionLevel) + 2;
    console.log(
      'Generating geodesic sphere with subdivision level:',
      subdivisionLevel,
      'with total tiles:',
      totalTiles,
    );
    this.map = this._mapGeneratorService.generateGeodesicSphere(subdivisionLevel);
  }

  public getTitleColor(tile: HexTile, coloringType: 'humidity' | 'temperature' | 'biomes' | 'lithospheric' | never): string {
    switch (coloringType) {
      case 'humidity':
        return this._getColorByHumidity(tile);
      case 'temperature':
        return this._getColorByTemperature(tile);
      case 'biomes':
        return this._getColorByBiome(tile);
      case 'lithospheric':
        return this._getColorByLithospheric(tile);
      default:
        return this._getColorByBiome(tile);
    }
  }

  private _getColorByHumidity(tile: HexTile): string {
    const humidity = tile.humidity;
    if (humidity >= 0 && humidity < 20) {
      return '#E0F7FA'; // Very Light Blue
    } else if (humidity >= 20 && humidity < 40) {
      return '#81D4FA'; // Light Blue
    } else if (humidity >= 40 && humidity < 60) {
      return '#29B6F6'; // Sky Blue
    } else if (humidity >= 60 && humidity < 80) {
      return '#0288D1'; // Darker Blue
    } else if (humidity >= 80 && humidity <= 100) {
      return '#01579B'; // Deep Blue
    } else {
      return '#000000'; // Black as fallback
    }
  }

  private _getColorByTemperature(tile: HexTile): string {
    const temperature = tile.temperature;
    if (temperature < -10) {
      return '#FFFFFF'; // Polar
    } else if (temperature >= -10 && temperature < 0) {
      return '#E0FFFF'; // Freezing
    } else if (temperature >= 0 && temperature < 10) {
      return '#87CEEB'; // Cold
    } else if (temperature >= 10 && temperature < 20) {
      return '#90EE90'; // Temperate
    } else if (temperature >= 20 && temperature < 30) {
      return '#FFD700'; // Warm
    } else {
      return '#FF4500'; // Hot
    }
  }

  private _getColorByBiome(tile: HexTile): string {
    switch (tile.lithosphericType) {
      case 'ocean':
        return '#1E90FF';
      case 'land':
        switch (tile.biome) {
          case 'plains':
            return '#7CFC00';
          case 'forest':
            return '#228B22';
          case 'desert':
            return '#EDC9AF';
          case 'mountain':
            return '#A9A9A9';
          case 'tundra':
            return '#E0FFFF';
          default:
            return '#000000'; // Black as fallback
        }
      default:
        return '#000000'; // Black as fallback
    }
  }

  private _getColorByLithospheric(tile: HexTile): string {
    return this._generatePlateColor(tile.lithosphericPlateId, tile.lithosphericType);
  }

  private _generatePlateColor(plateId: number, lithosphericType: string): string {
    // Generate a hue based on the plate ID
    const hue = (plateId * 137.5) % 360; // Golden angle for better color distribution

    if (lithosphericType === 'ocean') {
      // Blue-shifted hues for oceans
      const oceanHue = (hue + 200) % 360; // Shift towards blue
      return `hsl(${oceanHue}, 100%, 50%)`;
    } else {
      // Green-shifted hues for land
      const landHue = (hue + 120) % 360; // Shift towards green
      return `hsl(${landHue}, 75%, 45%)`;
    }
  }

  public getMap(): Map<number, HexTile> {
    return this.map;
  }

  public getTile(id: number): HexTile | undefined {
    return this.map.get(id);
  }
}
