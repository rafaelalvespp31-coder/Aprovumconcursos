"use client";
/* Three.js é imperativo: texturas, geometrias e a névoa da cena são ajustadas no lugar. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { KnowledgeMap, MapTopic, Territory } from "@/domain/knowledge-map/model";
import { fbm, fireTexture, glowTexture, gridTexture, labelTexture, smokeTexture, terrainHeight, windowsTexture } from "./textures";

export type Quality = "alta" | "baixa";

/** Gerador pseudoaleatório com semente: o cenário é sempre o mesmo (sem "pular" entre visitas). */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// ---------------------------------------------------------------------------
// Céu, nuvens e relâmpagos
// ---------------------------------------------------------------------------

const skyVertex = `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const skyFragment = `
varying vec3 vPos;
uniform float uFlash;
void main(){
  vec3 d = normalize(vPos);
  float h = clamp(d.y, -0.2, 1.0);
  vec3 top = vec3(0.012, 0.014, 0.02);
  vec3 mid = vec3(0.05, 0.045, 0.05);
  vec3 horizon = vec3(0.16, 0.05, 0.035);
  // Clarão vermelho/laranja do incêndio ao norte, atrás da cidade.
  float north = smoothstep(0.2, 1.0, -d.z) * smoothstep(0.35, 0.0, h);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.18, h));
  c = mix(c, top, smoothstep(0.18, 0.75, h));
  c += vec3(0.35, 0.08, 0.03) * north * 0.6;
  c += vec3(0.35, 0.38, 0.45) * uFlash * smoothstep(0.0, 0.6, h);
  gl_FragColor = vec4(c, 1.0);
}`;

export function Sky({ reduced }: { reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const next = useRef(6);
  const flash = useRef(0);
  useFrame((s, dt) => {
    if (!reduced) {
      next.current -= dt;
      if (next.current <= 0) {
        flash.current = 1;
        next.current = 7 + ((s.clock.elapsedTime * 7919) % 10);
      }
    }
    flash.current = Math.max(0, flash.current - dt * (flash.current > 0.5 ? 6 : 2.2));
    const f = flash.current * (0.6 + 0.4 * Math.sin(s.clock.elapsedTime * 60));
    if (mat.current) mat.current.uniforms.uFlash!.value = f;
    if (hemi.current) hemi.current.intensity = 0.55 + f * 1.6;
  });
  return (
    <>
      <mesh scale={600} renderOrder={-10}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial ref={mat} vertexShader={skyVertex} fragmentShader={skyFragment} side={THREE.BackSide} depthWrite={false} fog={false} uniforms={{ uFlash: { value: 0 } }} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#7b8496", "#2a1410", 0.55]} />
    </>
  );
}

export function Clouds({ quality }: { quality: Quality }) {
  const tex = useMemo(() => smokeTexture(), []);
  const group = useRef<THREE.Group>(null);
  const items = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: quality === "alta" ? 26 : 12 }, () => ({
      pos: [(r() - 0.5) * 420, 55 + r() * 45, -60 - r() * 260] as [number, number, number],
      scale: 90 + r() * 120,
      shade: 0.12 + r() * 0.12,
      speed: 0.4 + r() * 0.8,
    }));
  }, [quality]);
  useFrame((_, dt) => {
    group.current?.children.forEach((c, i) => {
      c.position.x += items[i]!.speed * dt;
      if (c.position.x > 230) c.position.x = -230;
    });
  });
  return (
    <group ref={group}>
      {items.map((c, i) => (
        <sprite key={i} position={c.pos} scale={[c.scale, c.scale * 0.45, 1]}>
          <spriteMaterial map={tex} color={new THREE.Color(c.shade, c.shade * 0.95, c.shade)} transparent opacity={0.85} depthWrite={false} fog={false} />
        </sprite>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Terreno, estradas e grade tática
// ---------------------------------------------------------------------------

export function Terrain({ quality }: { quality: Quality }) {
  const geo = useMemo(() => {
    const seg = quality === "alta" ? 220 : 120;
    const g = new THREE.PlaneGeometry(560, 560, seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(p.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = terrainHeight(x, z);
      p.setY(i, y);
      // Terra escura, vegetação queimada e rocha nas montanhas.
      const v = fbm(x * 0.05, z * 0.05);
      const veg = fbm(x * 0.09 + 10, z * 0.09);
      c.setRGB(0.09 + v * 0.07, 0.1 + v * 0.07 + veg * 0.05, 0.085 + v * 0.05);
      if (y > 18) c.lerp(new THREE.Color(0.11, 0.1, 0.1), Math.min(1, (y - 18) / 30));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [quality]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow={false}>
      <meshStandardMaterial vertexColors roughness={0.96} metalness={0.02} />
    </mesh>
  );
}

/** Grade holográfica vermelha em volta do núcleo (some aos poucos nas bordas). */
export function TacticalGrid() {
  const tex = useMemo(() => {
    const t = gridTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 26);
    t.needsUpdate = true;
    return t;
  }, []);
  const alpha = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 64);
    r.addColorStop(0, "#fff");
    r.addColorStop(0.55, "#666");
    r.addColorStop(1, "#000");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }, []);
  useEffect(() => () => {
    tex.dispose();
    alpha.dispose();
  }, [tex, alpha]);
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.25, 0]}>
      <planeGeometry args={[120, 120]} />
      <meshBasicMaterial map={tex} alphaMap={alpha} color="#ff3030" transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Rotas luminosas do núcleo até cada território (ligação real: a matéria faz parte do catálogo). */
export function Routes({ map, selected, reduced }: { map: KnowledgeMap; selected: string | null; reduced: boolean }) {
  const glow = useMemo(() => glowTexture(), []);
  const curves = useMemo(
    () =>
      map.territories.map((t) => {
        const a = new THREE.Vector3(0, 0.15, 0);
        const b = new THREE.Vector3(t.pos[0], 0.15, t.pos[1]);
        const mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0, 0));
        mid.x += (t.pos[1] / 30) * 3;
        return { t, curve: new THREE.QuadraticBezierCurve3(a, mid, b) };
      }),
    [map],
  );
  const tubes = useMemo(() => curves.map(({ curve }) => new THREE.TubeGeometry(curve, 40, 0.12, 6, false)), [curves]);
  useEffect(() => () => tubes.forEach((g) => g.dispose()), [tubes]);
  const pulses = useRef<THREE.Sprite[]>([]);
  useFrame((s) => {
    const time = s.clock.elapsedTime;
    curves.forEach(({ curve }, i) => {
      const sp = pulses.current[i];
      if (!sp) return;
      const u = reduced ? 0.5 : (time * 0.18 + i * 0.37) % 1;
      sp.position.copy(curve.getPoint(u)).setY(0.6);
    });
  });
  return (
    <group>
      {curves.map(({ t }, i) => {
        const on = !selected || selected === t.id;
        return (
          <group key={t.id}>
            <mesh geometry={tubes[i]}>
              <meshBasicMaterial color={t.color} transparent opacity={on ? 0.55 : 0.15} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
            <sprite ref={(el) => void (el && (pulses.current[i] = el))} scale={[2.2, 2.2, 1]}>
              <spriteMaterial map={glow} color={t.color} transparent opacity={on ? 0.95 : 0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
          </group>
        );
      })}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cidade destruída ao fundo, fumaça, fogo e brasas
// ---------------------------------------------------------------------------

export function City({ quality }: { quality: Quality }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const win = useMemo(() => {
    const t = windowsTexture().clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }, []);
  const count = quality === "alta" ? 170 : 90;
  const towers = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: count }, (_, i) => {
      const x = (r() - 0.5) * 300;
      const z = -150 - r() * 120 - (Math.abs(x) < 60 ? 0 : r() * 20);
      const h = (i < 10 ? 22 + r() * 22 : 3 + r() * 15) * (Math.abs(x) < 70 ? 1.15 : 0.75);
      const w = 3 + r() * 5;
      const broken = r() < 0.28;
      return { x, z, h, w, d: 3 + r() * 5, tilt: broken ? (r() - 0.5) * 0.25 : 0, cut: broken ? 0.5 + r() * 0.4 : 1 };
    });
  }, [count]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    towers.forEach((t, i) => {
      const hh = t.h * t.cut;
      o.position.set(t.x, terrainHeight(t.x, t.z) + hh / 2 - 1, t.z);
      o.rotation.set(0, 0, t.tilt);
      o.scale.set(t.w, hh, t.d);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [towers]);
  useEffect(() => () => win.dispose(), [win]);
  return (
    <group>
      <instancedMesh ref={ref} args={[undefined, undefined, towers.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#14161b" roughness={0.85} metalness={0.25} emissive="#ffffff" emissiveMap={win} emissiveIntensity={0.85} />
      </instancedMesh>
      {/* Torre-símbolo ao fundo, como na referência. */}
      <group position={[18, terrainHeight(18, -205), -205]} scale={0.55}>
        <mesh position={[0, 40, 0]}>
          <cylinderGeometry args={[2.2, 6, 80, 8]} />
          <meshStandardMaterial color="#121318" roughness={0.7} metalness={0.4} emissive="#ff5a3c" emissiveMap={win} emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 92, 0]}>
          <coneGeometry args={[2.2, 26, 8]} />
          <meshStandardMaterial color="#16171c" roughness={0.6} metalness={0.5} />
        </mesh>
        <pointLight position={[0, 104, 0]} color="#ff2a2a" intensity={40} distance={60} />
      </group>
    </group>
  );
}

const FIRE_SPOTS: Array<[number, number]> = [
  [-118, -150],
  [-70, -138],
  [40, -160],
  [95, -132],
  [150, -150],
  [-150, -95],
  [128, -82],
  [-42, -200],
];

export function FireAndSmoke({ quality, reduced }: { quality: Quality; reduced: boolean }) {
  const smoke = useMemo(() => smokeTexture(), []);
  const fire = useMemo(() => fireTexture(), []);
  const spots = quality === "alta" ? FIRE_SPOTS : FIRE_SPOTS.slice(0, 5);
  const per = quality === "alta" ? 7 : 4;
  const puffs = useRef<THREE.Sprite[]>([]);
  const flames = useRef<THREE.Sprite[]>([]);
  const lights = useRef<THREE.PointLight[]>([]);
  const seeds = useMemo(() => {
    const r = rng(5);
    return spots.flatMap((_, s) => Array.from({ length: per }, (_, k) => ({ s, phase: k / per + r() * 0.1, drift: (r() - 0.5) * 6 })));
  }, [spots, per]);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    seeds.forEach((p, i) => {
      const sp = puffs.current[i];
      if (!sp) return;
      const [x, z] = spots[p.s]!;
      const u = reduced ? p.phase : (t * 0.035 + p.phase) % 1;
      const base = terrainHeight(x, z);
      sp.position.set(x + p.drift * u + u * 18, base + 4 + u * 60, z - u * 6);
      const sc = 14 + u * 55;
      sp.scale.set(sc, sc, 1);
      (sp.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * u) * 0.5;
    });
    flames.current.forEach((f, i) => {
      const fl = reduced ? 1 : 0.85 + Math.sin(t * 9 + i * 2.1) * 0.08 + Math.sin(t * 23 + i) * 0.05;
      f.scale.set(9 * fl, 11 * fl, 1);
    });
    lights.current.forEach((l, i) => {
      l.intensity = 260 * (reduced ? 1 : 0.8 + Math.sin(t * 11 + i * 3) * 0.12 + Math.sin(t * 29 + i) * 0.08);
    });
  });
  return (
    <group>
      {spots.map(([x, z], i) => (
        <group key={i}>
          <sprite ref={(el) => void (el && (flames.current[i] = el))} position={[x, terrainHeight(x, z) + 3, z]}>
            <spriteMaterial map={fire} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
          {i < (quality === "alta" ? 4 : 2) && <pointLight ref={(el) => void (el && (lights.current[i] = el))} position={[x, terrainHeight(x, z) + 6, z]} color="#ff6a1a" distance={90} decay={1.6} />}
        </group>
      ))}
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => void (el && (puffs.current[i] = el))}>
          <spriteMaterial map={smoke} color="#2a2422" transparent opacity={0.4} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

export function Embers({ quality, reduced }: { quality: Quality; reduced: boolean }) {
  const n = quality === "alta" ? 420 : 160;
  const glow = useMemo(() => glowTexture(), []);
  const geo = useMemo(() => {
    const r = rng(3);
    const p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(r() - 0.5) * 160, r() * 40, -r() * 160 + 30], i * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [n]);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    if (reduced) return;
    const p = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      let y = p.getY(i) + dt * (1.2 + (i % 7) * 0.25);
      let x = p.getX(i) + dt * 0.9;
      if (y > 42) y = 0;
      if (x > 80) x = -80;
      p.setXY(i, x, y);
    }
    p.needsUpdate = true;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial map={glow} color="#ff8a3d" size={0.55} sizeAttenuation transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

/** Helicópteros ao longe (silhuetas com luz piscando, só decoração). */
export function Helicopters({ reduced }: { reduced: boolean }) {
  const glow = useMemo(() => glowTexture(), []);
  const refs = useRef<THREE.Group[]>([]);
  const rotors = useRef<THREE.Mesh[]>([]);
  const lamps = useRef<THREE.Sprite[]>([]);
  const paths = useMemo(
    () => [
      { r: 70, y: 34, speed: 0.05, phase: 0.6, cz: -60 },
      { r: 95, y: 42, speed: -0.035, phase: 2.4, cz: -40 },
    ],
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    paths.forEach((p, i) => {
      const g = refs.current[i];
      if (!g) return;
      const a = p.phase + (reduced ? 0 : t * p.speed);
      g.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.7 + i) * 0.6, p.cz + Math.sin(a) * p.r * 0.45);
      g.rotation.y = -a + (p.speed > 0 ? Math.PI : 0);
      if (rotors.current[i]) rotors.current[i]!.rotation.y = t * 30;
      if (lamps.current[i]) (lamps.current[i]!.material as THREE.SpriteMaterial).opacity = Math.sin(t * 5 + i) > 0.6 ? 1 : 0.1;
    });
  });
  return (
    <>
      {paths.map((_, i) => (
        <group key={i} ref={(el) => void (el && (refs.current[i] = el))} scale={1.4}>
          <mesh>
            <capsuleGeometry args={[0.9, 2.6, 4, 8]} />
            <meshStandardMaterial color="#0b0c0f" roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh rotation-z={Math.PI / 2} position={[0, 0.3, 0]}>
            <boxGeometry args={[0.2, 5.5, 0.3]} />
            <meshStandardMaterial color="#0b0c0f" />
          </mesh>
          <mesh position={[3.6, 0.5, 0]}>
            <boxGeometry args={[0.3, 1.4, 0.15]} />
            <meshStandardMaterial color="#0b0c0f" />
          </mesh>
          <mesh ref={(el) => void (el && (rotors.current[i] = el))} position={[0, 1.25, 0]}>
            <boxGeometry args={[9, 0.06, 0.35]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.55} />
          </mesh>
          <sprite ref={(el) => void (el && (lamps.current[i] = el))} position={[0, -0.9, 0]} scale={[2.4, 2.4, 1]}>
            <spriteMaterial map={glow} color="#ff2a2a" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Núcleo Aprovum (centro vermelho) e territórios
// ---------------------------------------------------------------------------

export function Core({ reduced, onSelect }: { reduced: boolean; onSelect: () => void }) {
  const glow = useMemo(() => glowTexture(), []);
  const mark = useMemo(() => {
    const t = new THREE.TextureLoader().load("/icons/aprovum-mark.png");
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const word = useMemo(() => labelTexture("APROVUM", "#ff4545", "800 70px 'Orbitron', 'Chakra Petch', sans-serif"), []);
  useEffect(() => () => mark.dispose(), [mark]);
  const rings = useRef<THREE.Mesh[]>([]);
  const beam = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    rings.current.forEach((r, i) => {
      if (!r) return;
      const u = reduced ? 0.5 : (t * 0.22 + i / 3) % 1;
      r.scale.setScalar(9 + u * 15);
      (r.material as THREE.MeshBasicMaterial).opacity = (1 - u) * 0.55;
    });
    if (beam.current) (beam.current.material as THREE.MeshBasicMaterial).opacity = 0.55 + (reduced ? 0 : Math.sin(t * 3) * 0.12);
  });
  const red = "#ff2a2a";
  return (
    <group
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Base em degraus, como uma fortaleza octogonal. */}
      {[
        [11, 1.2, 0],
        [8.6, 1.4, 1.2],
        [6.4, 1.8, 2.6],
        [4.2, 2.6, 4.4],
      ].map(([r, h, y], i) => (
        <mesh key={i} position={[0, y! + h! / 2 - 0.4, 0]}>
          <cylinderGeometry args={[r! * 0.92, r!, h!, 8]} />
          <meshStandardMaterial color="#17181d" roughness={0.55} metalness={0.6} emissive={red} emissiveIntensity={i === 3 ? 0.35 : 0.08} />
        </mesh>
      ))}
      {/* Anéis luminosos e torres de vigia. */}
      {[11.4, 9, 6.8].map((r, i) => (
        <mesh key={r} rotation-x={-Math.PI / 2} position={[0, [0.85, 2.25, 4.0][i]!, 0]}>
          <ringGeometry args={[r, r + 0.18, 64]} />
          <meshBasicMaterial color={red} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 10.4, 0, Math.sin(a) * 10.4]}>
            <mesh position={[0, 2.2, 0]}>
              <boxGeometry args={[1, 4.4, 1]} />
              <meshStandardMaterial color="#141519" roughness={0.6} metalness={0.5} />
            </mesh>
            <sprite position={[0, 4.8, 0]} scale={[2.2, 2.2, 1]}>
              <spriteMaterial map={glow} color={red} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
          </group>
        );
      })}
      {/* Pulsos no chão. */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => void (el && (rings.current[i] = el))} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.96, 1, 96]} />
          <meshBasicMaterial color={red} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Feixe vertical e marca. */}
      <mesh ref={beam} position={[0, 46, 0]}>
        <cylinderGeometry args={[0.22, 0.5, 84, 12, 1, true]} />
        <meshBasicMaterial color={red} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite position={[0, 7.4, 0]} scale={[16, 16, 1]}>
        <spriteMaterial map={glow} color={red} transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite position={[0, 8.6, 0]} scale={[4.2, 4.2, 1]}>
        <spriteMaterial map={mark} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <mesh position={[0, 3.3, 6.95]} rotation-x={-0.05}>
        <planeGeometry args={[7.5, 1.4]} />
        <meshBasicMaterial map={word} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 9, 0]} color={red} intensity={420} distance={70} decay={1.7} />
    </group>
  );
}

function hexRim(r: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

export function TerritoryBase({ t, selected, dimmed, onSelect, reduced }: { t: Territory; selected: boolean; dimmed: boolean; onSelect: (t: Territory) => void; reduced: boolean }) {
  const glow = useMemo(() => glowTexture(), []);
  const rim = useMemo(() => hexRim(6.2), []);
  const rim2 = useMemo(() => hexRim(7.4), []);
  useEffect(() => () => {
    rim.dispose();
    rim2.dispose();
  }, [rim, rim2]);
  const pulse = useRef<THREE.Mesh>(null);
  const buildings = useMemo(() => {
    const r = rng(t.id.length * 977 + t.label.charCodeAt(0));
    return Array.from({ length: 7 }, () => {
      const a = r() * Math.PI * 2;
      const d = 1 + r() * 3.6;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, w: 0.8 + r() * 1.4, h: 0.8 + r() * 2.8, dd: 0.8 + r() * 1.4 };
    });
  }, [t.id, t.label]);
  const y = terrainHeight(t.pos[0], t.pos[1]);
  useFrame((s) => {
    if (!pulse.current) return;
    const u = reduced ? 0.5 : (s.clock.elapsedTime * 0.35 + t.pos[0] * 0.01) % 1;
    pulse.current.scale.setScalar(5 + u * (selected ? 9 : 5));
    (pulse.current.material as THREE.MeshBasicMaterial).opacity = (1 - u) * (selected ? 0.9 : 0.5);
  });
  const o = dimmed ? 0.35 : 1;
  return (
    <group
      position={[t.pos[0], y, t.pos[1]]}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 6) return;
        e.stopPropagation();
        onSelect(t);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "")}
    >
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[6.4, 7, 0.9, 6]} />
        <meshStandardMaterial color="#121419" roughness={0.6} metalness={0.55} emissive={t.color} emissiveIntensity={selected ? 0.22 : 0.06} />
      </mesh>
      <lineLoop geometry={rim} position={[0, 0.82, 0]}>
        <lineBasicMaterial color={t.color} transparent opacity={o} toneMapped={false} />
      </lineLoop>
      <lineLoop geometry={rim2} position={[0, 0.1, 0]}>
        <lineBasicMaterial color={t.color} transparent opacity={0.5 * o} toneMapped={false} />
      </lineLoop>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, 0.8 + b.h / 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.dd]} />
          <meshStandardMaterial color="#1a1c22" roughness={0.5} metalness={0.5} emissive={t.color} emissiveIntensity={(selected ? 0.5 : 0.18) * o} />
        </mesh>
      ))}
      <mesh ref={pulse} rotation-x={-Math.PI / 2} position={[0, 0.9, 0]}>
        <ringGeometry args={[0.94, 1, 6]} />
        <meshBasicMaterial color={t.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Pilar de luz até a placa holográfica (a placa em si é HTML, legível). */}
      <mesh position={[0, 5.4, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 9, 6, 1, true]} />
        <meshBasicMaterial color={t.color} transparent opacity={0.8 * o} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <sprite position={[0, 1.6, 0]} scale={[selected ? 12 : 8, selected ? 12 : 8, 1]}>
        <spriteMaterial map={glow} color={t.color} transparent opacity={0.6 * o} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {/* Área de clique maior que a plataforma. */}
      <mesh position={[0, 3, 0]} visible={false}>
        <cylinderGeometry args={[7.5, 7.5, 7, 6]} />
        <meshBasicMaterial />
      </mesh>
      <pointLight position={[0, 4, 0]} color={t.color} intensity={selected ? 90 : 30} distance={22} />
    </group>
  );
}

export function TopicNodes({ t, selectedTopic, onSelect }: { t: Territory; selectedTopic: string | null; onSelect: (topic: MapTopic) => void }) {
  const glow = useMemo(() => glowTexture(), []);
  return (
    <group>
      {t.topics.map((topic) => {
        const y = terrainHeight(topic.pos[0], topic.pos[1]);
        const sel = selectedTopic === topic.id;
        const done = topic.study?.done;
        return (
          <group
            key={topic.id}
            position={[topic.pos[0], y, topic.pos[1]]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              if (e.delta > 6) return;
              e.stopPropagation();
              onSelect(topic);
            }}
            onPointerOver={() => (document.body.style.cursor = "pointer")}
            onPointerOut={() => (document.body.style.cursor = "")}
          >
            <mesh position={[0, 0.3, 0]}>
              <cylinderGeometry args={[0.9, 1.1, 0.6, 6]} />
              <meshStandardMaterial color="#15171c" metalness={0.6} roughness={0.5} emissive={t.color} emissiveIntensity={sel ? 0.6 : 0.15} />
            </mesh>
            <mesh position={[0, 1.6, 0]}>
              <octahedronGeometry args={[sel ? 0.75 : 0.55]} />
              <meshBasicMaterial color={done ? "#ffffff" : t.color} toneMapped={false} />
            </mesh>
            <sprite position={[0, 1.6, 0]} scale={[sel ? 5 : 3.2, sel ? 5 : 3.2, 1]}>
              <spriteMaterial map={glow} color={t.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
            <mesh position={[0, 1.5, 0]} visible={false}>
              <cylinderGeometry args={[1.6, 1.6, 3.4, 6]} />
              <meshBasicMaterial />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Ajusta neblina/cor de fundo uma vez. */
export function Atmosphere() {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.FogExp2("#1a1012", 0.0062);
    scene.background = new THREE.Color("#08090c");
    return () => {
      scene.fog = null;
    };
  }, [scene]);
  return null;
}
