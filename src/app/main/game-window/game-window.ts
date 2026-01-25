import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  viewChild,
  effect,
  inject,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MapGenerator } from '../map-generator';

export interface HexTile {
  id: string;
  color: string;
  type: 'hex' | 'pent';
  neighbors: string[];
  x: number;
  y: number;
  z: number;
}

@Component({
  selector: 'app-game-window',
  imports: [],
  templateUrl: './game-window.html',
  styleUrls: ['./game-window.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameWindow {
  private mapGeneratorService = inject(MapGenerator);

  private canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private animationId?: number;

  constructor() {
    this.mapGeneratorService.generateNewMap();

    effect(() => {
      const canvas = this.canvasRef().nativeElement;
      this.initThreeJS(canvas);
      this.animate();
    });
  }

  private initThreeJS(canvas: HTMLCanvasElement): void {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 5;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Render hex sphere from map generator
    this.renderHexSphere();

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Setup orbit controls
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    // this.controls.autoRotate = true;
    // this.controls.autoRotateSpeed = 0.5;

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Add click event listener
    canvas.addEventListener('click', (event) => this.onCanvasClick(event));
  }

  private renderHexSphere(): void {
    console.log('Rendering hex sphere...');
    const map: Map<string, HexTile> = this.mapGeneratorService.getMap();
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

    map.forEach((tile) => {
      // Create geometry based on tile type (pentagon or hexagon)
      const segments = tile.type === 'pent' ? 5 : 6;
      const tileGeometry = new THREE.CircleGeometry(tileRadius, segments);
      const tileMaterial = new THREE.MeshStandardMaterial({
        color: tile.color,
        side: THREE.DoubleSide,
        flatShading: true,
      });

      const tileMesh = new THREE.Mesh(tileGeometry, tileMaterial);

      // Store tile data in mesh userData for click detection
      tileMesh.userData = { tile };

      // Position on sphere surface
      const position = new THREE.Vector3(tile.x, tile.y, tile.z);
      position.multiplyScalar(radius);
      tileMesh.position.copy(position);

      // Orient the tile to face outward from sphere center
      tileMesh.lookAt(0, 0, 0);
      tileMesh.rotateY(Math.PI);

      // Align tile rotation with first neighbor for proper edge connection
      if (tile.neighbors.length > 0) {
        const neighbor = map.get(tile.neighbors[0]);
        if (neighbor) {
          const neighborPos = new THREE.Vector3(neighbor.x, neighbor.y, neighbor.z);
          neighborPos.multiplyScalar(radius);

          // Calculate direction to first neighbor in local tile space
          const toNeighbor = neighborPos.clone().sub(tileMesh.position);
          const localUp = position.clone().normalize();

          // Project neighbor direction onto tile plane
          const tangent = toNeighbor.clone().sub(localUp.clone().multiplyScalar(toNeighbor.dot(localUp)));
          tangent.normalize();

          // Calculate rotation angle to align edge with neighbor
          const angle = Math.atan2(tangent.y, tangent.x);
          tileMesh.rotateZ(-angle + Math.PI / 2);
        }
      }

      this.scene.add(tileMesh);
    });
  }

  private onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update raycaster with camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.scene.children);

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      if (clickedObject.userData['tile']) {
        console.log('Clicked tile:', clickedObject.userData['tile']);
      }
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    // Update controls for damping and auto-rotation
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize(): void {
    const canvas = this.canvasRef().nativeElement;
    this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  ngOnDestroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', () => this.onWindowResize());
    this.controls.dispose();
    this.renderer.dispose();
  }
}
