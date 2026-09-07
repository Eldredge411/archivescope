"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { lobbyConfig } from "@/components/Lobby/lobby.config";
import { createParchmentEarthTexture } from "@/components/Lobby/ParchmentGenerator";

type GlobeSceneProps = {
  onTextureReady?: () => void;
  onTransitionStart?: () => void;
};

type Mode = "entry" | "idle" | "click";

export function GlobeScene({
  onTextureReady,
  onTransitionStart,
}: GlobeSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [isWebglAvailable] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return Boolean(
      window.WebGLRenderingContext &&
        document.createElement("canvas").getContext("webgl2") &&
        document.createElement("canvas").getContext("webgl"),
    );
  });
  const modeRef = useRef<Mode>("entry");
  const pointerRef = useRef({ x: 0, y: 0 });
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const entryStartRef = useRef(0);
  const clickStartRef = useRef(0);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      lobbyConfig.camera.fov,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 0, lobbyConfig.camera.z);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(lobbyConfig.colors.scene, 0);
    container.appendChild(renderer.domElement);

    const texture = createParchmentEarthTexture(
      window.matchMedia("(max-width: 700px)").matches,
    );
    texture.needsUpdate = true;
    onTextureReady?.();

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const globe = new THREE.Mesh(geometry, material);
    globe.rotation.y = -Math.PI;
    scene.add(globe);

    const keyLight = new THREE.DirectionalLight(
      new THREE.Color(lobbyConfig.colors.keyLight),
      1.2,
    );
    keyLight.position.set(3.2, 2.4, 2.6);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(
      new THREE.Color(lobbyConfig.colors.ambientLight),
      0.4,
    );
    scene.add(ambientLight);

    const rimLight = new THREE.PointLight(
      new THREE.Color(lobbyConfig.colors.rimLight),
      0.8,
      20,
    );
    rimLight.position.set(-3.2, 0.6, -2.2);
    scene.add(rimLight);

    const pointerMove = (event: PointerEvent) => {
      const rectangle = container.getBoundingClientRect();

      pointerTargetRef.current = {
        x: ((event.clientX - rectangle.left) / rectangle.width - 0.5) * 2,
        y: ((event.clientY - rectangle.top) / rectangle.height - 0.5) * 2,
      };
    };

    window.addEventListener("pointermove", pointerMove);

    const resize = () => {
      const width = container.clientWidth;
      const height = Math.max(1, container.clientHeight);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", resize);

    const easeOutCubic = (value: number) => 1 - (1 - value) ** 3;
    const render = (time: number) => {
      if (!entryStartRef.current) {
        entryStartRef.current = time;
      }

      pointerRef.current.x +=
        (pointerTargetRef.current.x - pointerRef.current.x) * 0.05;
      pointerRef.current.y +=
        (pointerTargetRef.current.y - pointerRef.current.y) * 0.05;

      const elapsed = (time - entryStartRef.current) / 1000;

      if (modeRef.current === "entry" && !reducedMotionRef.current) {
        const progress = Math.min(1, elapsed / (lobbyConfig.motion.entryMs / 1000));
        const eased = easeOutCubic(progress);
        globe.rotation.y = -Math.PI + eased * Math.PI * 2;
        globe.scale.setScalar(0.9 + eased * 0.1);

        if (progress >= 1) {
          modeRef.current = "idle";
        }
      } else if (modeRef.current === "click") {
        const clickElapsed =
          (time - clickStartRef.current) / lobbyConfig.motion.clickTransitionMs;
        const progress = Math.min(1, clickElapsed);
        const eased = easeOutCubic(progress);
        const currentZ =
          lobbyConfig.camera.z -
          (lobbyConfig.camera.z - lobbyConfig.camera.closeZ) * eased;

        camera.position.z = currentZ;
        camera.fov =
          lobbyConfig.camera.fov +
          (lobbyConfig.camera.closeFov - lobbyConfig.camera.fov) * eased;
        camera.updateProjectionMatrix();
        globe.rotation.y += 0.22;
        globe.scale.setScalar(1 + eased * 0.08);
      } else {
        globe.rotation.y +=
          lobbyConfig.motion.idleRotationPerSecond / 60;
        globe.scale.setScalar(1);
      }

      globe.rotation.x = pointerRef.current.y *
        (lobbyConfig.motion.parallaxDegrees * Math.PI / 180);
      globe.rotation.z =
        pointerRef.current.x *
        (lobbyConfig.motion.parallaxDegrees * Math.PI / 180) * -1;

      renderer.render(scene, camera);
    };

    renderer.setAnimationLoop(render);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onTextureReady]);

  const runClickTransition = () => {
    onTransitionStart?.();

    if (reducedMotionRef.current) {
      router.push("/stacks?country=usa");
      return;
    }

    modeRef.current = "click";
    clickStartRef.current = performance.now();
    window.setTimeout(() => {
      router.push("/stacks?country=usa");
    }, lobbyConfig.motion.burstMs + 80);
  };

  if (!isWebglAvailable) {
    return (
      <div
        ref={containerRef}
        className="lobby-globe-scene is-fallback"
        role="img"
        aria-label="做旧羊皮纸地球档案场景"
      >
        <div className="lobby-globe-fallback" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="lobby-globe-scene"
      onMouseDown={runClickTransition}
      onTouchStart={runClickTransition}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          runClickTransition();
        }
      }}
      aria-label="点击地球进入美国档案架"
    />
  );
}
