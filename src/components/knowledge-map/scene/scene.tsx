"use client";
/* Three.js é imperativo: câmera, materiais e geometrias são alterados no lugar a cada quadro. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, type RefObject } from "react";
import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { KnowledgeMap, MapTopic, Territory } from "@/domain/knowledge-map/model";
import { clamp, type CameraRig } from "./rig";
import { Rifle } from "./rifle";
import { disposeTextureCache, terrainHeight } from "./textures";
import { Atmosphere, City, Clouds, Core, Embers, FireAndSmoke, Helicopters, Routes, Sky, TacticalGrid, Terrain, TerritoryBase, TopicNodes, type Quality } from "./world";

export interface Anchor {
  key: string;
  pos: [number, number, number];
}

export interface SceneProps {
  map: KnowledgeMap;
  rig: CameraRig;
  quality: Quality;
  portrait: boolean;
  selectedTerritory: string | null;
  selectedTopic: string | null;
  anchors: Anchor[];
  labels: RefObject<Map<string, HTMLElement>>;
  /** Escreve a direção da câmera no radar (sem re-render). */
  onHeading: (yaw: number, focus: [number, number], dist: number) => void;
  onSelectTerritory: (t: Territory) => void;
  onSelectTopic: (t: Territory, topic: MapTopic) => void;
  onSelectCore: () => void;
  onContextLost: () => void;
}

const tmp = new THREE.Vector3();

/** Câmera em primeira pessoa: interpola até os alvos da HUD e projeta as placas holográficas. */
function CameraDriver({ rig, anchors, labels, onHeading, portrait }: Pick<SceneProps, "rig" | "anchors" | "labels" | "onHeading" | "portrait">) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = portrait ? 66 : 50;
    cam.near = 0.03;
    cam.far = 900;
    cam.updateProjectionMatrix();
  }, [camera, portrait]);
  useFrame((s, dtRaw) => {
    rig.step(dtRaw);
    const look = rig.reduced ? 0 : 1;
    const yaw = rig.yawNow + rig.pointerNow[0] * 0.07 * look;
    const pitch = clamp(rig.pitchNow - rig.pointerNow[1] * 0.04 * look, 0.08, 1.2);
    const [fx, fz] = rig.focusNow;
    const d = rig.distNow;
    const cx = fx + Math.sin(yaw) * Math.cos(pitch) * d;
    const cz = fz + Math.cos(yaw) * Math.cos(pitch) * d;
    const ground = terrainHeight(cx, cz) + 3;
    const cy = Math.max(ground, Math.sin(pitch) * d + 2);
    const bob = rig.reduced ? 0 : Math.sin(s.clock.elapsedTime * 1.4) * 0.05;
    camera.position.set(cx, cy + bob, cz);
    camera.lookAt(fx, 2.5, fz);
    // Inclinação lateral muito discreta acompanhando o olhar.
    camera.rotateZ(-rig.pointerNow[0] * 0.012 * look);

    // Placas holográficas (HTML) acompanham os pontos do mapa.
    const map = labels.current;
    if (map) {
      for (const a of anchors) {
        const el = map.get(a.key);
        if (!el) continue;
        tmp.set(a.pos[0], a.pos[1], a.pos[2]).project(camera);
        const behind = tmp.z > 1;
        const x = (tmp.x * 0.5 + 0.5) * size.width;
        const y = (-tmp.y * 0.5 + 0.5) * size.height;
        const off = behind || x < -200 || x > size.width + 200 || y < -120 || y > size.height + 120;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.visibility = off ? "hidden" : "visible";
        // Placas mais próximas ficam por cima.
        el.style.zIndex = String(Math.round((1 - tmp.z) * 10000));
      }
    }
    onHeading(yaw, rig.focusNow, d);
  });
  return null;
}

/** Coloca a câmera na cena para o fuzil (filho da câmera) aparecer. */
function FirstPerson({ rig, portrait }: { rig: CameraRig; portrait: boolean }) {
  const { camera, scene } = useThree();
  useEffect(() => {
    scene.add(camera);
    return () => void scene.remove(camera);
  }, [camera, scene]);
  return createPortal(<Rifle rig={rig} portrait={portrait} />, camera);
}

function ContextGuard({ onLost }: { onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    const c = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    c.addEventListener("webglcontextlost", lost);
    return () => c.removeEventListener("webglcontextlost", lost);
  }, [gl, onLost]);
  useEffect(() => () => disposeTextureCache(), []);
  return null;
}

export default function KnowledgeScene(p: SceneProps) {
  const sel = useMemo(() => p.map.territories.find((t) => t.id === p.selectedTerritory) ?? null, [p.map, p.selectedTerritory]);
  return (
    <Canvas
      dpr={p.quality === "alta" ? [1, 1.75] : [1, 1.25]}
      gl={{ antialias: p.quality === "alta", powerPreference: "high-performance", alpha: false }}
      camera={{ position: [0, 30, 70], fov: 50, near: 0.03, far: 900 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
      style={{ position: "absolute", inset: 0, touchAction: "none" }}
      aria-hidden
    >
      <ContextGuard onLost={p.onContextLost} />
      <Atmosphere />
      <Sky reduced={p.rig.reduced} />
      <directionalLight position={[-60, 80, -120]} intensity={0.9} color="#ffb08a" />
      <directionalLight position={[50, 40, 80]} intensity={0.25} color="#8aa0c8" />
      <ambientLight intensity={0.22} />
      <Clouds quality={p.quality} />
      <Terrain quality={p.quality} />
      <TacticalGrid />
      <City quality={p.quality} />
      <FireAndSmoke quality={p.quality} reduced={p.rig.reduced} />
      <Embers quality={p.quality} reduced={p.rig.reduced} />
      <Helicopters reduced={p.rig.reduced} />
      <Routes map={p.map} selected={p.selectedTerritory} reduced={p.rig.reduced} />
      <Core reduced={p.rig.reduced} onSelect={p.onSelectCore} />
      {p.map.territories.map((t) => (
        <TerritoryBase key={t.id} t={t} selected={p.selectedTerritory === t.id} dimmed={!!p.selectedTerritory && p.selectedTerritory !== t.id} onSelect={p.onSelectTerritory} reduced={p.rig.reduced} />
      ))}
      {sel && <TopicNodes t={sel} selectedTopic={p.selectedTopic} onSelect={(topic) => p.onSelectTopic(sel, topic)} />}
      <CameraDriver rig={p.rig} anchors={p.anchors} labels={p.labels} onHeading={p.onHeading} portrait={p.portrait} />
      <FirstPerson rig={p.rig} portrait={p.portrait} />
    </Canvas>
  );
}
