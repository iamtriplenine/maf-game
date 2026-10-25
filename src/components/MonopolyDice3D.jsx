// MAF_MONOPOLY_DICE_3D_V1 : modele/texture du ZIP, sans Unity ni requete externe.
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { faceRotation, rollPose } from '../games/monopoly/diceMotion';

export default function MonopolyDice3D({ rolling, faces, count = 1 }) {
  const host = useRef(null);
  const latest = useRef({ rolling, faces, count });
  latest.current = { rolling, faces, count };
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let stopped = false, frame = 0, observer, dirty = true;
    let renderer, texture, template;
    const dice = [];
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48, metalness: 0 });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0, 6.6, 4.1);
    camera.lookAt(0, 0.25, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x9b947b, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 7, 5); scene.add(light);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fail = () => { if (!stopped) setFailed(true); };
    const resize = () => {
      const width = el.clientWidth, height = el.clientHeight;
      if (!width || !height || !renderer) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true;
    };
    const lost = (event) => { event.preventDefault(); fail(); };
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.addEventListener('webglcontextlost', lost);
      observer = new ResizeObserver(resize); observer.observe(el); resize();
    } catch { observer?.disconnect(); renderer?.domElement.remove(); renderer?.dispose(); material.dispose(); fail(); return undefined; }

    // Les deux ressources sont servies par le meme site que le jeu.
    new OBJLoader().load('/games/monopoly/dice/dice.obj', (model) => {
      if (stopped) { model.traverse(o => { o.geometry?.dispose(); o.material?.dispose?.(); }); return; }
      template = model; dirty = true;
      model.traverse((o) => { if (o.isMesh) { o.material?.dispose?.(); o.material = material; } });
      for (let i = 0; i < 2; i++) {
        const die = model.clone(); die.scale.setScalar(1.25);
        die.quaternion.copy(faceRotation(latest.current.faces?.[i] || 1));
        scene.add(die); dice.push(die);
      }
    }, undefined, fail);
    texture = new THREE.TextureLoader().load('/games/monopoly/dice/dice.png', () => {
      if (stopped) return;
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture; material.needsUpdate = true; dirty = true;
    }, undefined, fail);

    let previousRolling = false, rollStart = performance.now(), settleStart = 0;
    let settled = false, renderedKey = '';
    const starts = [];
    const draw = (now) => {
      if (stopped) return;
      frame = requestAnimationFrame(draw);
      const { rolling: isRolling, faces: result, count: n } = latest.current;
      const key = `${isRolling}:${n}:${result?.join(',')}`;
      if (isRolling && !previousRolling) { rollStart = now; settled = false; }
      if (!isRolling && previousRolling) {
        settleStart = now;
        starts.splice(0, starts.length, ...dice.map(d => ({ q: d.quaternion.clone(), p: d.position.clone() })));
      }
      previousRolling = isRolling;
      const settling = !isRolling && settleStart > 0 && now - settleStart < 320;
      const animate = !reduced.matches && (isRolling || settling);
      if (!animate && settled && renderedKey === key && !dirty) return;
      dice.forEach((die, i) => {
        die.visible = i < n;
        const base = n === 2 ? (i === 0 ? -0.92 : 0.92) : 0;
        if (isRolling && !reduced.matches) {
          const pose = rollPose((now - rollStart) / 1000, i);
          die.position.set(base + pose.x, pose.y, 0);
          die.rotation.set(pose.rx, pose.ry, pose.rz);
        } else {
          const target = faceRotation(result?.[i] || 1);
          const p = settling && !reduced.matches ? Math.min(1, (now - settleStart) / 320) : 1;
          const ease = 1 - (1 - p) ** 3;
          if (starts[i] && p < 1) {
            die.quaternion.copy(starts[i].q).slerp(target, ease);
            die.position.copy(starts[i].p).lerp(new THREE.Vector3(base, 0, 0), ease);
          } else { die.quaternion.copy(target); die.position.set(base, 0, 0); }
        }
      });
      renderer.render(scene, camera); dirty = false;
      settled = !animate && dice.length > 0; renderedKey = key;
    };
    frame = requestAnimationFrame(draw);
    return () => {
      stopped = true; cancelAnimationFrame(frame); observer?.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      const geometries = new Set();
      template?.traverse(o => { if (o.geometry) geometries.add(o.geometry); });
      geometries.forEach(g => g.dispose()); material.dispose(); texture?.dispose(); renderer.dispose();
      renderer.domElement.remove();
    };
  }, [failed]);

  if (failed) return <div className={`mono-dice${rolling ? ' is-rolling' : ''}`}>
    {Array.from({ length: count }, (_, i) => <span className="mono-die" key={i}>{['⚀','⚁','⚂','⚃','⚄','⚅'][(faces?.[i] || 1) - 1]}</span>)}
  </div>;
  return <div className="mono-dice3d" ref={host} aria-hidden="true" />;
}
