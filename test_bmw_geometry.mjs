// Validate BMW M3 GTR Body Geometry Construction
import * as THREE from 'three';

console.log('Testing BMW M3 GTR Parametric Body Shell Generation...');

function createBmwM3BodyGeometry() {
  const geo = new THREE.BufferGeometry();

  // Longitudinal stations along Z (from nose Z=-2.25 to tail Z=+2.25)
  // Each station has cross-section points along half the car (X >= 0) and mirrored for symmetry
  // Points from bottom to top:
  // 0: Underbody bottom edge
  // 1: Lower rocker sill / valance
  // 2: Wheel arch / lower body crease
  // 3: Shoulder / beltline crease
  // 4: Hood / trunk / deck outer edge
  // 5: Hood / roof / trunk center spine (X = 0)

  const stations = [
    // z,     w_bot,  w_sill, w_arch, w_belt, w_deck, y_bot,  y_sill, y_arch, y_belt, y_deck, y_spine
    [-2.25,   0.50,   0.72,   0.74,   0.72,   0.45,   0.14,   0.22,   0.34,   0.46,   0.52,   0.55], // 0: Front bumper tip
    [-2.05,   0.55,   0.78,   0.82,   0.80,   0.62,   0.13,   0.20,   0.36,   0.52,   0.60,   0.63], // 1: Front fascia / headlights
    [-1.75,   0.58,   0.82,   0.92,   0.88,   0.72,   0.14,   0.22,   0.42,   0.58,   0.64,   0.67], // 2: Front flare start
    [-1.35,   0.58,   0.80,   0.95,   0.92,   0.76,   0.15,   0.36,   0.50,   0.62,   0.67,   0.71], // 3: Front wheel center (arch cutout)
    [-0.95,   0.58,   0.82,   0.90,   0.88,   0.74,   0.15,   0.22,   0.44,   0.62,   0.68,   0.72], // 4: Front flare end / gill
    [-0.65,   0.56,   0.82,   0.84,   0.85,   0.68,   0.15,   0.20,   0.36,   0.63,   0.70,   0.73], // 5: Windshield cowl base
    [-0.20,   0.56,   0.82,   0.83,   0.85,   0.62,   0.15,   0.20,   0.36,   0.64,   1.24,   1.27], // 6: Front cabin / A-pillar / roof
    [+0.35,   0.56,   0.82,   0.83,   0.85,   0.62,   0.15,   0.20,   0.36,   0.64,   1.23,   1.26], // 7: Mid roof / B-pillar
    [+0.85,   0.56,   0.82,   0.85,   0.86,   0.66,   0.15,   0.20,   0.38,   0.64,   0.98,   1.02], // 8: Rear glass / C-pillar
    [+1.10,   0.58,   0.84,   0.94,   0.92,   0.74,   0.15,   0.22,   0.45,   0.64,   0.75,   0.77], // 9: Rear flare start
    [+1.35,   0.58,   0.80,   0.97,   0.95,   0.78,   0.15,   0.38,   0.52,   0.65,   0.74,   0.76], // 10: Rear wheel center (arch cutout)
    [+1.65,   0.58,   0.84,   0.93,   0.92,   0.75,   0.15,   0.22,   0.44,   0.65,   0.74,   0.76], // 11: Rear flare end / vent
    [+2.05,   0.54,   0.78,   0.84,   0.82,   0.68,   0.14,   0.22,   0.38,   0.64,   0.76,   0.78], // 12: Trunk deck / ducktail spoiler
    [+2.25,   0.48,   0.72,   0.76,   0.74,   0.55,   0.16,   0.24,   0.36,   0.58,   0.66,   0.68], // 13: Rear bumper tail
  ];

  const positions = [];
  const indices = [];
  const numSlices = stations.length;
  const ptsPerHalf = 6;
  const ptsPerSlice = ptsPerHalf * 2 - 1; // Left points + center point + right points (no duplicate spine)

  for (let s = 0; s < numSlices; s++) {
    const [z, w0, w1, w2, w3, w4, y0, y1, y2, y3, y4, y5] = stations[s];
    const widths = [w0, w1, w2, w3, w4, 0];
    const heights = [y0, y1, y2, y3, y4, y5];

    // Left side (X < 0): from bottom (pt 0) up to just before center
    for (let p = 0; p < ptsPerHalf - 1; p++) {
      positions.push(-widths[p], heights[p], z);
    }
    // Center spine (X = 0)
    positions.push(0, heights[ptsPerHalf - 1], z);
    // Right side (X > 0): from just after center down to bottom
    for (let p = ptsPerHalf - 2; p >= 0; p--) {
      positions.push(widths[p], heights[p], z);
    }
  }

  // Generate Quads between consecutive slices
  for (let s = 0; s < numSlices - 1; s++) {
    const sliceA = s * ptsPerSlice;
    const sliceB = (s + 1) * ptsPerSlice;

    for (let p = 0; p < ptsPerSlice - 1; p++) {
      const a1 = sliceA + p;
      const a2 = sliceA + p + 1;
      const b1 = sliceB + p;
      const b2 = sliceB + p + 1;

      // Quad triangle 1
      indices.push(a1, b1, a2);
      // Quad triangle 2
      indices.push(a2, b1, b2);
    }
  }

  // Front Cap (Front bumper intake face)
  const frontSlice = 0;
  for (let p = 0; p < ptsPerSlice - 2; p++) {
    indices.push(frontSlice, frontSlice + p + 2, frontSlice + p + 1);
  }

  // Rear Cap (Rear bumper tail face)
  const rearSlice = (numSlices - 1) * ptsPerSlice;
  for (let p = 0; p < ptsPerSlice - 2; p++) {
    indices.push(rearSlice, rearSlice + p + 1, rearSlice + p + 2);
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  return geo;
}

const bodyGeo = createBmwM3BodyGeometry();
console.log(`Generated Body Vertices: ${bodyGeo.attributes.position.count}`);
console.log(`Generated Body Triangles: ${bodyGeo.index.count / 3}`);
console.log(`Bounding Box Min: [${bodyGeo.boundingBox.min.x.toFixed(2)}, ${bodyGeo.boundingBox.min.y.toFixed(2)}, ${bodyGeo.boundingBox.min.z.toFixed(2)}]`);
console.log(`Bounding Box Max: [${bodyGeo.boundingBox.max.x.toFixed(2)}, ${bodyGeo.boundingBox.max.y.toFixed(2)}, ${bodyGeo.boundingBox.max.z.toFixed(2)}]`);
console.log('BMW M3 GTR Body Shell Test Succeeded!');
