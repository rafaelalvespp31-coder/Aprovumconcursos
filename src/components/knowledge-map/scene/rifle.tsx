"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraRig } from "./rig";
import { glowTexture, labelTexture } from "./textures";

/**
 * Soldado em primeira pessoa: braços com luvas táticas e o fuzil cenográfico, preso à câmera.
 * Geometria própria (sem modelo externo). Só balança de leve com o olhar e a respiração:
 * não dispara nem tem qualquer mecânica de combate.
 */
export function Rifle({ rig, portrait }: { rig: CameraRig; portrait: boolean }) {
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTexture(), []);
  const brand = useMemo(() => labelTexture("APROVUM", "#d8d8dc", "700 58px 'Orbitron', 'Chakra Petch', sans-serif"), []);
  const mats = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({ color: "#2a2e36", roughness: 0.42, metalness: 0.75, fog: false }),
      metal2: new THREE.MeshStandardMaterial({ color: "#3a3f49", roughness: 0.3, metalness: 0.85, fog: false }),
      poly: new THREE.MeshStandardMaterial({ color: "#1c1e24", roughness: 0.7, metalness: 0.2, fog: false }),
      glove: new THREE.MeshStandardMaterial({ color: "#23252a", roughness: 0.85, metalness: 0.05, fog: false }),
      knuckle: new THREE.MeshStandardMaterial({ color: "#26282d", roughness: 0.7, metalness: 0.1, fog: false }),
      sleeve: new THREE.MeshStandardMaterial({ color: "#2a2e27", roughness: 0.95, metalness: 0, fog: false }),
      red: new THREE.MeshBasicMaterial({ color: "#ff2b2b", fog: false, toneMapped: false }),
      glass: new THREE.MeshStandardMaterial({ color: "#1a0a0c", roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55, fog: false, emissive: "#ff1a1a", emissiveIntensity: 0.25 }),
      brand: new THREE.MeshBasicMaterial({ map: brand, transparent: true, fog: false, depthWrite: false }),
    }),
    [brand],
  );
  const base = portrait ? new THREE.Vector3(0.07, -0.24, -0.66) : new THREE.Vector3(0.135, -0.155, -0.62);
  useFrame((s, dt) => {
    const g = group.current;
    if (!g) return;
    const t = s.clock.elapsedTime;
    const k = 1 - Math.exp(-dt * 5);
    const [px, py] = rig.pointerNow;
    const breathe = rig.reduced ? 0 : Math.sin(t * 1.4) * 0.006;
    const sway = rig.reduced ? 0 : Math.sin(t * 0.7) * 0.004;
    g.position.x += (base.x - px * 0.025 + sway - g.position.x) * k;
    g.position.y += (base.y + (rig.lowered ? -0.07 : 0) + py * 0.018 + breathe - g.position.y) * k;
    g.position.z += (base.z - g.position.z) * k;
    g.rotation.y += (0.15 - px * 0.05 - g.rotation.y) * k;
    g.rotation.x += ((rig.lowered ? 0.02 : 0.17) + py * 0.04 - g.rotation.x) * k;
    g.rotation.z += (-0.04 + px * 0.03 - g.rotation.z) * k;
  });
  const M = mats;
  return (
    <group ref={group} position={base} rotation={[0.17, 0.15, -0.04]} scale={portrait ? 0.62 : 0.8} renderOrder={10}>
      {/* Luz própria do primeiro plano: recorte vermelho e luz fria de preenchimento. */}
      <pointLight position={[-0.35, 0.3, -0.3]} color="#ff3a3a" intensity={0.35} distance={1.6} />
      <pointLight position={[-0.5, 0.6, 0.6]} color="#c9d6ea" intensity={1.1} distance={3} />
      <pointLight position={[0.3, -0.2, 0.4]} color="#7d8aa3" intensity={0.4} distance={2} />

      {/* Caixa da culatra (receiver) e trilho superior. */}
      <mesh material={M.metal} position={[0, 0, 0]}>
        <boxGeometry args={[0.07, 0.085, 0.42]} />
      </mesh>
      <mesh material={M.metal2} position={[0, 0.05, -0.02]}>
        <boxGeometry args={[0.05, 0.016, 0.46]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={`r${i}`} material={M.metal} position={[0, 0.06, -0.08 - i * 0.03]}>
          <boxGeometry args={[0.054, 0.005, 0.012]} />
        </mesh>
      ))}
      {/* Guarda-mão octogonal com trilhos laterais. */}
      <mesh material={M.poly} position={[0, -0.002, -0.4]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.042, 0.044, 0.38, 8]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={`s${i}`} material={M.metal2} position={[0.046, 0, -0.25 - i * 0.04]}>
          <boxGeometry args={[0.01, 0.02, 0.018]} />
        </mesh>
      ))}
      {/* Cano e quebra-chamas. */}
      <mesh material={M.metal2} position={[0, 0.004, -0.72]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.011, 0.011, 0.3, 12]} />
      </mesh>
      <mesh material={M.metal} position={[0, 0.004, -0.88]} rotation-x={Math.PI / 2}>
        <cylinderGeometry args={[0.018, 0.018, 0.07, 8]} />
      </mesh>
      {/* Massa de mira frontal. */}
      <mesh material={M.metal} position={[0, 0.07, -0.56]}>
        <boxGeometry args={[0.012, 0.05, 0.02]} />
      </mesh>
      {/* Carregador curvo e empunhadura. */}
      <mesh material={M.poly} position={[0, -0.12, -0.06]} rotation-x={0.22}>
        <boxGeometry args={[0.04, 0.17, 0.075]} />
      </mesh>
      <mesh material={M.poly} position={[0, -0.21, -0.03]} rotation-x={0.38}>
        <boxGeometry args={[0.04, 0.06, 0.07]} />
      </mesh>
      <mesh material={M.poly} position={[0, -0.1, 0.13]} rotation-x={-0.32}>
        <boxGeometry args={[0.038, 0.13, 0.05]} />
      </mesh>
      {/* Coronha (some para fora do quadro). */}
      <mesh material={M.poly} position={[0, -0.02, 0.36]}>
        <boxGeometry args={[0.05, 0.08, 0.2]} />
      </mesh>
      {/* Mira holográfica: janela vazada com o retículo vermelho visível por trás. */}
      <group position={[0, 0.112, -0.02]}>
        <mesh material={M.metal2} position={[0, -0.04, 0]}>
          <boxGeometry args={[0.058, 0.022, 0.12]} />
        </mesh>
        <mesh material={M.metal} position={[-0.031, 0.002, 0]}>
          <boxGeometry args={[0.008, 0.066, 0.1]} />
        </mesh>
        <mesh material={M.metal} position={[0.031, 0.002, 0]}>
          <boxGeometry args={[0.008, 0.066, 0.1]} />
        </mesh>
        <mesh material={M.metal} position={[0, 0.036, 0]}>
          <boxGeometry args={[0.07, 0.008, 0.1]} />
        </mesh>
        <mesh material={M.metal2} position={[0.04, -0.005, 0.01]}>
          <boxGeometry args={[0.012, 0.03, 0.05]} />
        </mesh>
        <mesh material={M.glass} position={[0, 0.003, -0.045]}>
          <planeGeometry args={[0.054, 0.062]} />
        </mesh>
        <mesh material={M.red} position={[0, 0.006, -0.044]}>
          <ringGeometry args={[0.0075, 0.0095, 32]} />
        </mesh>
        <mesh material={M.red} position={[0, 0.006, -0.044]}>
          <circleGeometry args={[0.0018, 12]} />
        </mesh>
        <sprite position={[0, 0.006, -0.043]} scale={[0.032, 0.032, 1]}>
          <spriteMaterial map={glow} color="#ff2a2a" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      </group>
      {/* Alavanca de manejo e janela de ejeção. */}
      <mesh material={M.metal2} position={[0.04, 0.01, 0.02]}>
        <boxGeometry args={[0.012, 0.03, 0.08]} />
      </mesh>
      {/* Marca na lateral e LEDs vermelhos. */}
      <mesh material={M.brand} position={[-0.0362, 0.008, 0.05]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[0.13, 0.024]} />
      </mesh>
      <mesh material={M.red} position={[-0.046, 0.0, -0.3]}>
        <boxGeometry args={[0.004, 0.012, 0.03]} />
      </mesh>

      {/* Mão de apoio (esquerda) no guarda-mão, com manga. */}
      <group position={[-0.02, -0.035, -0.42]} rotation={[0.1, 0.3, 0.2]}>
        <mesh material={M.glove} scale={[1, 0.8, 1.25]}>
          <sphereGeometry args={[0.055, 16, 12]} />
        </mesh>
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={i} material={M.knuckle} position={[0.04, 0.02 - i * 0.004, -0.03 + i * 0.022]} rotation-z={-0.6}>
            <capsuleGeometry args={[0.012, 0.045, 4, 8]} />
          </mesh>
        ))}
        <mesh material={M.sleeve} position={[-0.09, -0.06, 0.16]} rotation={[0.9, 0.2, 0.5]}>
          <cylinderGeometry args={[0.055, 0.075, 0.42, 12]} />
        </mesh>
        <mesh material={M.glove} position={[-0.03, -0.02, 0.05]} rotation={[0.9, 0.2, 0.5]}>
          <cylinderGeometry args={[0.048, 0.054, 0.09, 12]} />
        </mesh>
      </group>
      {/* Mão da empunhadura (direita) e antebraço saindo do quadro. */}
      <group position={[0.02, -0.1, 0.14]} rotation={[-0.2, -0.1, -0.15]}>
        <mesh material={M.glove} scale={[1, 1.2, 1]}>
          <sphereGeometry args={[0.055, 16, 12]} />
        </mesh>
        {Array.from({ length: 3 }, (_, i) => (
          <mesh key={i} material={M.knuckle} position={[-0.04, 0.03 - i * 0.03, -0.035]} rotation-z={Math.PI / 2}>
            <capsuleGeometry args={[0.013, 0.04, 4, 8]} />
          </mesh>
        ))}
        <mesh material={M.glove} position={[0.03, -0.07, 0.07]} rotation={[0.8, -0.3, -0.4]}>
          <cylinderGeometry args={[0.045, 0.05, 0.1, 12]} />
        </mesh>
        <mesh material={M.sleeve} position={[0.09, -0.17, 0.22]} rotation={[0.8, -0.3, -0.4]}>
          <cylinderGeometry args={[0.052, 0.07, 0.36, 12]} />
        </mesh>
      </group>
    </group>
  );
}
