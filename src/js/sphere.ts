
import * as THREE from 'three';

export function createSphereGeometry(row: number, column: number, rad: number, color
  ?: THREE.Color
) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const colors = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= row; i++) {
    const r = Math.PI / row * i;
    const ry = Math.cos(r);
    const rr = Math.sin(r);
    for (let ii = 0; ii <= column; ii++) {
      const tr = Math.PI * 2 / column * ii;
      const tx = rr * rad * Math.cos(tr);
      const ty = ry * rad;
      const tz = rr * rad * Math.sin(tr);
      const rx = rr * Math.cos(tr);
      const rz = rr * Math.sin(tr);

      positions.push(tx, ty, tz);
      normals.push(rx, ry, rz);

      if (color) {
        colors.push(color.r, color.g, color.b);
      } else {
        const tc = new THREE.Color().setHSL(i / row, 1, 0.5);
        colors.push(tc.r, tc.g, tc.b);
      }

      uvs.push(1 - ii / column, i / row);
    }
  }

  for (let i = 0; i < row; i++) {
    for (let ii = 0; ii < column; ii++) {
      const r = (column + 1) * i + ii;
      indices.push(r, r + 1, r + column + 2);
      indices.push(r, r + column + 2, r + column + 1);
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}
