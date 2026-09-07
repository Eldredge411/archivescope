"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { lobbyConfig } from "@/components/Lobby/lobby.config";
import { createParchmentEarthTexture } from "@/components/Lobby/ParchmentGenerator";
import { getUnitedStatesGeometry } from "@/components/Lobby/worldAtlas";

type GlobeSceneProps = {
  isReducedMotion: boolean;
  isMobile: boolean;
  onTextureReady?: () => void;
  onRevealComplete?: () => void;
};

type Mode = "entry" | "idle" | "click";

function getCountryGeometryLines(geometry: GeoJSON.MultiPolygon | GeoJSON.Polygon) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.map((polygon) => polygon[0]);
}

function latLngToVector3(lng: number, lat: number, radius: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180) + lobbyConfig.texture.longitudeOffset;

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function focusToRotation() {
  const { longitude, latitude } = lobbyConfig.focus;
  return {
    x: (latitude * Math.PI) / 180,
    y: -((longitude * Math.PI) / 180) - lobbyConfig.texture.longitudeOffset,
  };
}

export function GlobeScene({
  isReducedMotion,
  isMobile,
  onTextureReady,
  onRevealComplete,
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
  const modeRef = useRef<Mode>(isReducedMotion ? "idle" : "entry");
  const revealRef = useRef({
    start: 0,
    done: isReducedMotion,
    skip: isReducedMotion,
  });
  const dragRef = useRef({
    active: false,
    lastX: 0,
    lastY: 0,
    velocityX: 0,
    velocityY: 0,
  });
  const clickStartRef = useRef(0);
  const textureReadyRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

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

    const textureWidth = isMobile
      ? lobbyConfig.texture.mobile[0]
      : lobbyConfig.texture.desktop[0];
    const textureHeight = isMobile
      ? lobbyConfig.texture.mobile[1]
      : lobbyConfig.texture.desktop[1];
    const texture = createParchmentEarthTexture(textureWidth, textureHeight);
    textureReadyRef.current = true;
    onTextureReady?.();

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const globe = new THREE.Mesh(geometry, material);
    const finalRotation = focusToRotation();
    globe.rotation.x = finalRotation.x;
    globe.rotation.y = finalRotation.y;
    scene.add(globe);

    const keyLight = new THREE.DirectionalLight(
      new THREE.Color(lobbyConfig.colors.keyLight),
      1.2,
    );
    keyLight.position.set(3.2, 2.4, 2.6);
    scene.add(keyLight);
    scene.add(
      new THREE.AmbientLight(new THREE.Color(lobbyConfig.colors.ambientLight), 0.4),
    );
    const rimLight = new THREE.PointLight(
      new THREE.Color(lobbyConfig.colors.rimLight),
      0.8,
      20,
    );
    rimLight.position.set(-3.2, 0.6, -2.2);
    scene.add(rimLight);

    const usGeometry = getUnitedStatesGeometry();
    const usLines: THREE.Line[] = [];

    if (usGeometry) {
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color(lobbyConfig.colors.usGold),
        transparent: true,
        opacity: 0.95,
      });

      getCountryGeometryLines(usGeometry).forEach((coordinates) => {
        const points = coordinates.map(([lng, lat]) =>
          latLngToVector3(lng, lat, lobbyConfig.texture.lineRadius),
        );
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, material);

        line.geometry.setDrawRange(0, isReducedMotion ? points.length : 0);
        globe.add(line);
        usLines.push(line);
      });
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isPointerOverUs = false;

    const updatePointer = (event: PointerEvent) => {
      const rectangle = container.getBoundingClientRect();

      pointer.x = ((event.clientX - rectangle.left) / rectangle.width) * 2 - 1;
      pointer.y = -((event.clientY - rectangle.top) / rectangle.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const intersections = raycaster.intersectObject(globe, false);
      isPointerOverUs = intersections.length > 0;
      container.style.cursor =
        modeRef.current === "idle" && isPointerOverUs ? "pointer" : "grab";
    };

    const pointerMove = (event: PointerEvent) => {
      updatePointer(event);

      if (!dragRef.current.active) {
        return;
      }

      const deltaX = event.clientX - dragRef.current.lastX;
      const deltaY = event.clientY - dragRef.current.lastY;

      globe.rotation.y += deltaX * 0.005;
      globe.rotation.x = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 6, globe.rotation.x + deltaY * 0.003),
      );
      dragRef.current.velocityX = deltaX * 0.005;
      dragRef.current.velocityY = deltaY * 0.003;
      dragRef.current.lastX = event.clientX;
      dragRef.current.lastY = event.clientY;
    };

    const pointerDown = (event: PointerEvent) => {
      if (modeRef.current !== "idle") {
        return;
      }

      dragRef.current = {
        active: true,
        lastX: event.clientX,
        lastY: event.clientY,
        velocityX: 0,
        velocityY: 0,
      };
      container.setPointerCapture(event.pointerId);
    };

    const pointerUp = () => {
      dragRef.current.active = false;
    };

    const windowPointerMove = (event: PointerEvent) => pointerMove(event);
    const windowPointerDown = (event: PointerEvent) => {
      const rectangle = container.getBoundingClientRect();

      if (
        event.clientX < rectangle.left ||
        event.clientX > rectangle.right ||
        event.clientY < rectangle.top ||
        event.clientY > rectangle.bottom
      ) {
        return;
      }

      updatePointer(event);
      pointerDown(event);
    };
    const windowPointerUp = () => pointerUp();

    window.addEventListener("pointermove", windowPointerMove);
    window.addEventListener("pointerdown", windowPointerDown);
    window.addEventListener("pointerup", windowPointerUp);

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
      if (!revealRef.current.start) {
        revealRef.current.start = time;
      }

      const elapsed = time - revealRef.current.start;

      if (modeRef.current === "entry") {
        const progress = Math.min(
          1,
          Math.max(
            0,
            (elapsed - lobbyConfig.motion.globeSpinStartMs) /
              (lobbyConfig.motion.globeSpinEndMs - lobbyConfig.motion.globeSpinStartMs),
          ),
        );
        const eased = easeOutCubic(progress);
        const spins = lobbyConfig.motion.globeSpins;
        globe.rotation.y =
          finalRotation.y + Math.PI * 2 * spins * (1 - eased);
        globe.rotation.x = finalRotation.x;

        if (progress >= 1) {
          modeRef.current = "idle";
          onRevealComplete?.();
        }
      } else if (modeRef.current === "idle" && !dragRef.current.active) {
        globe.rotation.y += dragRef.current.velocityX;
        globe.rotation.x = Math.max(
          -Math.PI / 6,
          Math.min(Math.PI / 6, globe.rotation.x + dragRef.current.velocityY),
        );
        dragRef.current.velocityX *= 0.94;
        dragRef.current.velocityY *= 0.94;
      } else if (modeRef.current === "click") {
        const progress = Math.min(
          1,
          (time - clickStartRef.current) / lobbyConfig.motion.clickTransitionMs,
        );
        const eased = easeOutCubic(progress);

        camera.position.z =
          lobbyConfig.camera.z -
          (lobbyConfig.camera.z - lobbyConfig.camera.closeZ) * eased;
        camera.fov =
          lobbyConfig.camera.fov +
          (lobbyConfig.camera.closeFov - lobbyConfig.camera.fov) * eased;
        camera.updateProjectionMatrix();
        globe.rotation.y += 0.18;
      }

      const lineProgress = revealRef.current.skip
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (elapsed - lobbyConfig.motion.usLineStartMs) /
                lobbyConfig.motion.usLineDurationMs,
            ),
          );
      const easedLineProgress = easeOutCubic(lineProgress);

      usLines.forEach((line) => {
        const count = line.geometry.getAttribute("position").count;
        line.geometry.setDrawRange(0, Math.ceil(count * easedLineProgress));
      });

      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(render);

    return () => {
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", windowPointerMove);
      window.removeEventListener("pointerdown", windowPointerDown);
      window.removeEventListener("pointerup", windowPointerUp);
      window.removeEventListener("resize", resize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      usLines.forEach((line) => line.geometry.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [isMobile, isReducedMotion, onRevealComplete, onTextureReady]);

  useEffect(() => {
    if (isReducedMotion && !revealRef.current.done) {
      revealRef.current.done = true;
      onRevealComplete?.();
    }
  }, [isReducedMotion, onRevealComplete]);

  const enterUnitedStates = () => {
    if (modeRef.current !== "idle") {
      revealRef.current.skip = true;
      modeRef.current = "idle";
      onRevealComplete?.();
      return;
    }

    modeRef.current = "click";
    clickStartRef.current = performance.now();
    window.setTimeout(() => {
      router.push("/countries/usa?country=usa");
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
      onClick={(event) => {
        if (event.clientX === 0 && event.clientY === 0) return;
        enterUnitedStates();
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          enterUnitedStates();
        }
      }}
      aria-label="拖拽查看地球，点击进入美国档案卷宗"
    />
  );
}
