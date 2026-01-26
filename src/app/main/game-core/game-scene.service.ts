import { Injectable, NgZone, OnDestroy, inject } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapGeneratorService } from './map-generation/map-generator.service';
import { GameTile } from './map.types';
import { MapService } from './map.service';

@Injectable()
export class GameSceneService implements OnDestroy {
  private readonly _mapService = inject(MapService);
  private readonly _ngZone = inject(NgZone);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationId?: number;

  private hexMesh!: THREE.InstancedMesh;
  private pentMesh!: THREE.InstancedMesh;
  private hexTilesData: GameTile[] = [];
  private pentTilesData: GameTile[] = [];

  private canvas!: HTMLCanvasElement;

  constructor() {}

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupControls();

    // Generate map
    this._mapService.generateNewMap(8);
    this.renderHexSphere();

    // Start animation loop outside Angular
    this._ngZone.runOutsideAngular(() => {
      this.animate();
    });
  }

  private setupScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
  }

  private setupCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.canvas.clientWidth / this.canvas.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 5;
  }

  private setupRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 10;
  }

  private renderHexSphere(): void {
    console.log('Rendering hex sphere...');
    const map: Map<number, GameTile> = this._mapService.getMap();
    const radius = 1;

    // Calculate average distance to nearest neighbor for tile sizing
    let avgDistance = 0;
    let count = 0;
    map.forEach((tile) => {
      if (tile.neighbors.length > 0) {
        const neighbor = map.get(tile.neighbors[0]);
        if (neighbor) {
          const dx = tile.x - neighbor.x;
          const dy = tile.y - neighbor.y;
          const dz = tile.z - neighbor.z;
          avgDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
          count++;
        }
      }
    });
    avgDistance = (avgDistance / count) * radius;

    // Size tiles so they touch at edges (inscribed circle radius for regular polygon)
    const tileRadius = avgDistance / 2;

    // Separate tiles by type
    this.hexTilesData = [];
    this.pentTilesData = [];

    map.forEach((tile) => {
      if (tile.type === 'hex') {
        this.hexTilesData.push(tile);
      } else {
        this.pentTilesData.push(tile);
      }
    });

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // Helper function to create and populate instanced mesh
    const createInstancedMesh = (tiles: GameTile[], segments: number): THREE.InstancedMesh => {
      const geometry = new THREE.CircleGeometry(tileRadius, segments);
      const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color();

      tiles.forEach((tile, i) => {
        // Position on sphere surface
        const position = new THREE.Vector3(tile.x, tile.y, tile.z);
        position.multiplyScalar(radius);
        dummy.position.copy(position);

        // Orient the tile to face outward from sphere center
        dummy.lookAt(0, 0, 0);
        dummy.rotateY(Math.PI);

        // Align tile rotation with first neighbor for proper edge connection
        if (tile.neighbors.length > 0) {
          const neighbor = map.get(tile.neighbors[0]);
          if (neighbor) {
            const neighborPos = new THREE.Vector3(neighbor.x, neighbor.y, neighbor.z);
            neighborPos.multiplyScalar(radius);

            // Calculate direction to first neighbor in local tile space
            const toNeighbor = neighborPos.clone().sub(dummy.position);
            const localUp = position.clone().normalize();

            // Project neighbor direction onto tile plane
            const tangent = toNeighbor
              .clone()
              .sub(localUp.clone().multiplyScalar(toNeighbor.dot(localUp)));
            tangent.normalize();

            // Calculate rotation angle to align edge with neighbor
            const angle = Math.atan2(tangent.y, tangent.x);
            dummy.rotateZ(-angle + Math.PI / 2);
          }
        }

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, color.set(this._mapService.getTitleColor(tile, 'lithospheric')));
      });

      return mesh;
    };

    // Create and add meshes
    if (this.hexTilesData.length > 0) {
      this.hexMesh = createInstancedMesh(this.hexTilesData, 6);
      this.scene.add(this.hexMesh);
    }

    if (this.pentTilesData.length > 0) {
      this.pentMesh = createInstancedMesh(this.pentTilesData, 5);
      this.scene.add(this.pentMesh);
    }
  }

  public onCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the picking ray
    // We only need to check the instanced meshes
    const meshesToCheck: THREE.Object3D[] = [];
    if (this.hexMesh) meshesToCheck.push(this.hexMesh);
    if (this.pentMesh) meshesToCheck.push(this.pentMesh);

    const intersects = this.raycaster.intersectObjects(meshesToCheck);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const instanceId = intersection.instanceId;

      if (instanceId !== undefined) {
        let clickedTile: GameTile | undefined;

        if (intersection.object === this.hexMesh) {
          clickedTile = this.hexTilesData[instanceId];
        } else if (intersection.object === this.pentMesh) {
          clickedTile = this.pentTilesData[instanceId];
        }

        if (clickedTile) {
          console.log('Clicked tile:', clickedTile);
          // Optional: Visual feedback
          // const color = new THREE.Color().set(
          //   this._mapService.getTitleColor(clickedTile),
          // );
          // (intersection.object as THREE.InstancedMesh).setColorAt(instanceId, color);
          (intersection.object as THREE.InstancedMesh).instanceColor!.needsUpdate = true;
        }
      }
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update controls for damping and auto-rotation
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public onWindowResize(): void {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.controls) this.controls.dispose();
    if (this.renderer) this.renderer.dispose();
  }
}
