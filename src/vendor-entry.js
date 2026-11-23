// Only what the app uses — esbuild tree-shakes the rest of three.js away.
export {
  REVISION, WebGLRenderer, Scene, PerspectiveCamera, Color, Vector2, Vector3, Matrix4, Group, Mesh,
  TorusGeometry, CircleGeometry, BufferGeometry, Float32BufferAttribute, MeshBasicMaterial, ShaderMaterial,
  Points, PointsMaterial, Sprite, SpriteMaterial, CanvasTexture, Raycaster, SRGBColorSpace, FrontSide,
  DoubleSide, GreaterDepth, MathUtils, LineSegments, LineBasicMaterial, LineDashedMaterial,
  NotEqualStencilFunc, ReplaceStencilOp,
} from 'three';
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
export { Line2 } from 'three/addons/lines/Line2.js';
export { LineGeometry } from 'three/addons/lines/LineGeometry.js';
export { LineMaterial } from 'three/addons/lines/LineMaterial.js';
export { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
export { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
