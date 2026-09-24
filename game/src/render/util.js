import * as THREE from 'three';

// Table space: x right, y up the table, z up from the playfield (metres).
// Three.js local space of the table root: (x, z, -y).
export const tv = (x, y, z = 0) => new THREE.Vector3(x, z, -y);
export const setTV = (v, x, y, z = 0) => v.set(x, z, -y);

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
