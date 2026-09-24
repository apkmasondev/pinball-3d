import * as THREE from 'three';

// A moody night-arcade environment for reflections: dark gradient dome with a few soft light panels.
export function nightEnvironment(renderer) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = vP.y;
          vec3 top = vec3(0.020, 0.024, 0.060);
          vec3 hor = vec3(0.050, 0.030, 0.050);
          vec3 bot = vec3(0.010, 0.006, 0.008);
          vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor, bot, pow(-h, 0.5));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(dome);
  const panel = (w, h, color, intensity, pos, look) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...look); scene.add(m);
  };
  // overhead cool soft box (the "moon")
  panel(3.0, 1.2, 0xbfd0ff, 0.55, [0, 5, -1], [0, 0, 0]);
  // warm backbox glow behind the table
  panel(2.2, 1.4, 0xffa050, 0.95, [0, 1.5, -6], [0, 0, 0]);
  // two warm side strips (arcade cabinet neighbours)
  panel(0.6, 3.0, 0xff7040, 0.45, [-6, 1, 1], [0, 1, 0]);
  panel(0.6, 3.0, 0x6080ff, 0.45, [6, 1, 1], [0, 1, 0]);
  // faint front fill (player side)
  panel(4.0, 0.8, 0x302830, 1.0, [0, 1.2, 6], [0, 0, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  return rt.texture;
}
