import { Injectable, NgZone, OnDestroy, inject, signal } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapGeneratorService } from './map-generation/map-generator.service';
import { GameTile } from './map.types';
import { MapService } from './map.service';

@Injectable()
export class GameSceneService implements OnDestroy {
  private readonly _mapService = inject(MapService);
  private readonly _ngZone = inject(NgZone);

  public clickedTile = signal<GameTile | null>(null);

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationId?: number;

  private hexMesh!: THREE.Mesh;
  private faceIndexToTileIdMap: number[] = [];

  private canvas!: HTMLCanvasElement;

  mapColoringMode:
    | 'lithospheric'
    | 'lithospheric-activity'
    | 'elevation'
    | 'temperature'
    | 'humidity'
    | 'biomes' = 'elevation';
  mapSize = 7;

  constructor() {}

  public init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.setupControls();

    // Generate map
    this._mapService.generateNewMap(this.mapSize);
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
    const map = this._mapService.getMap();
    const radius = 1;

    const positions: number[] = [];
    const colors: number[] = [];
    this.faceIndexToTileIdMap = [];

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.6,
      metalness: 0.1,
      flatShading: true,
      vertexColors: true,
      side: THREE.DoubleSide,
    });

    map.forEach((tile) => {
      if (!tile.corners) return;

      // Center of the tile
      const center = new THREE.Vector3(tile.x, tile.y, tile.z).multiplyScalar(radius);
      // Colors
      const colorHex = this._mapService.getTitleColor(tile, this.mapColoringMode);
      const color = new THREE.Color(colorHex);

      const corners = tile.corners.map((c) =>
        new THREE.Vector3(c.x, c.y, c.z).multiplyScalar(radius),
      );

      for (let i = 0; i < corners.length; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % corners.length];

        // Triangle: Center -> P1 -> P2
        positions.push(center.x, center.y, center.z);
        positions.push(p1.x, p1.y, p1.z);
        positions.push(p2.x, p2.y, p2.z);

        // Vertex colors (all same for the tile)
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);

        // Map face index to tile ID
        this.faceIndexToTileIdMap.push(tile.id);
      }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    this.hexMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.hexMesh);
  }

  public onCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();

    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.hexMesh);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const faceIndex = intersection.faceIndex;

      if (faceIndex !== undefined && faceIndex !== null) {
        const tileId = this.faceIndexToTileIdMap[faceIndex];
        const clickedTile = this._mapService.getMap().get(tileId);

        if (clickedTile) {
          // console.log('Clicked tile:', clickedTile);
          console.log('Clicked tile:', clickedTile);
          this.clickedTile.set(clickedTile);

          // TODO: Implement visual feedback highlighting for single mesh
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
