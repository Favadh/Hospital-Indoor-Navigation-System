// --- Map & SVG Constants ---
export const SVG_W = 1920;
export const SVG_H = 1080;
export const WALL_HEIGHT = 80;
export const WALL_THICKNESS = 8;
export const OFFSET_X = -SVG_W / 2; // -960
export const OFFSET_Z = -SVG_H / 2; // -540

/**
 * Converts 2D SVG (x, y) coordinates to 3D World (x, z) coordinates.
 * The Y-axis in Three.js is vertical (height), so SVG Y maps to World Z.
 */
export function svgToWorld(sx, sy) {
  return [sx + OFFSET_X, sy + OFFSET_Z];
}
