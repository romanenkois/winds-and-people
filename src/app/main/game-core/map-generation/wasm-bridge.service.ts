import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class WasmBridgeService {
  private worker: Worker | null = null;

  generateMap(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        this.worker = new Worker(
          new URL('./map-generator.worker.ts', import.meta.url),
          { type: 'module' },
        );
      }

      this.worker.onmessage = ({ data }) => {
        if (data.type === 'map-ready') {
          resolve([data.result, data.mapData]);
        }
      };

      this.worker.onerror = (error) => {
        reject(error);
      };

      this.worker.postMessage({ type: 'generate' });
    });
  }
}
