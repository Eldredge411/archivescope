import * as THREE from "three";
import { geoEquirectangular, geoPath, geoGraticule } from "d3-geo";
import { getWorldCountries } from "@/components/Lobby/worldAtlas";
import { lobbyConfig } from "@/components/Lobby/lobby.config";

type NoiseOptions = {
  width: number;
  height: number;
  scale: number;
  octaves: number;
  seed: number;
};

function createNoise({ width, height, scale, octaves, seed }: NoiseOptions) {
  const values = new Float32Array(width * height);
  let currentSeed = seed;

  const random = () => {
    currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
    return currentSeed / 4294967296;
  };

  const grids = Array.from({ length: octaves }, (_, octave) => {
    const size = Math.max(2, Math.round(scale / 2 ** octave));
    return Array.from({ length: (size + 1) * (size + 1) }, random);
  });
  const smooth = (value: number) => value * value * (3 - 2 * value);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let amplitude = 1;
      let sum = 0;
      let normalization = 0;

      grids.forEach((grid, octave) => {
        const size = Math.max(2, Math.round(scale / 2 ** octave));
        const gx = (x / width) * size;
        const gy = (y / height) * size;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const tx = smooth(gx - x0);
        const ty = smooth(gy - y0);
        const x1 = Math.min(x0 + 1, size);
        const y1 = Math.min(y0 + 1, size);
        const top =
          grid[y0 * (size + 1) + x0] * (1 - tx) +
          grid[y0 * (size + 1) + x1] * tx;
        const bottom =
          grid[y1 * (size + 1) + x0] * (1 - tx) +
          grid[y1 * (size + 1) + x1] * tx;

        sum += (top * (1 - ty) + bottom * ty) * amplitude;
        normalization += amplitude;
        amplitude *= 0.5;
      });

      values[y * width + x] = sum / normalization;
    }
  }

  return values;
}

function paintParchmentBase(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const noiseWidth = 1024;
  const noiseHeight = 512;
  const noise = createNoise({
    width: noiseWidth,
    height: noiseHeight,
    scale: 9,
    octaves: 5,
    seed: 20260907,
  });
  const image = context.createImageData(width, height);
  const parse = (hex: string) => [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
  const light = parse(lobbyConfig.colors.parchmentLight);
  const mid = parse(lobbyConfig.colors.parchmentMid);
  const dark = parse(lobbyConfig.colors.parchmentDark);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = Math.floor((x / width) * noiseWidth);
      const ny = Math.floor((y / height) * noiseHeight);
      const fiber = (Math.sin(x * 0.23) + Math.sin(y * 0.17)) * 0.015;
      const shade = Math.min(1, Math.max(0, noise[ny * noiseWidth + nx] + fiber));
      const lowMix = Math.min(1, shade / 0.55);
      const highMix = Math.min(1, Math.max(0, (shade - 0.55) / 0.45));
      const pixelIndex = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel += 1) {
        const lowToMid = dark[channel] + (mid[channel] - dark[channel]) * lowMix;
        image.data[pixelIndex + channel] =
          lowToMid * (1 - highMix) + light[channel] * highMix;
      }

      image.data[pixelIndex + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
}

function paintAging(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.save();
  context.globalAlpha = 0.12;

  for (let index = 0; index < 46; index += 1) {
    const x = ((index * 89) % width + index * 37) % width;
    const y = ((index * 137) % height + index * 19) % height;
    const radius = height * (0.025 + ((index * 7) % 13) / 160);
    const stain = context.createRadialGradient(x, y, 0, x, y, radius);

    stain.addColorStop(0, "rgb(93 69 43 / 0.75)");
    stain.addColorStop(1, "rgb(93 69 43 / 0)");
    context.fillStyle = stain;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();

  context.save();
  context.globalAlpha = 0.18;
  context.strokeStyle = "rgb(66 52 35)";
  context.lineWidth = Math.max(1, width / 2048);

  for (let index = 0; index < 36; index += 1) {
    const y = ((index * 173) % height + index * 11) % height;
    context.beginPath();
    context.moveTo((index * 67) % width, y);

    for (let x = 0; x <= width; x += width / 8) {
      context.lineTo(x, y + Math.sin(x / 80 + index) * height * 0.004);
    }

    context.stroke();
  }
  context.restore();

  context.save();
  context.globalCompositeOperation = "multiply";
  const vignette = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.2,
    width / 2,
    height / 2,
    width * 0.7,
  );
  vignette.addColorStop(0, "rgb(255 255 255)");
  vignette.addColorStop(1, "rgb(128 108 76)");
  context.fillStyle = vignette;
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function createParchmentEarthTexture(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(document.createElement("canvas"));
  }

  paintParchmentBase(context, width, height);
  context.fillStyle = lobbyConfig.colors.ocean;
  context.fillRect(0, 0, width, height);

  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])
    .scale(width / (Math.PI * 2));
  const path = geoPath(projection, context);
  const countries = getWorldCountries();

  countries.forEach((country, index) => {
    const isUnitedStates = country.id === "840";
    const variation = ((index * 17) % 8) / 100;
    context.beginPath();

    if (isUnitedStates) {
      context.fillStyle = lobbyConfig.colors.usLand;
    } else {
      context.fillStyle = index % 2 === 0
        ? `rgb(166 139 95 / ${1 - variation})`
        : `rgb(${Math.round(166 * (1 + variation))} ${Math.round(139 * (1 + variation))} ${Math.round(95 * (1 + variation))} / 1)`;
    }

    path(country.geometry);
    context.fill();
    context.lineWidth = Math.max(1.2, width / 2048);
    context.strokeStyle = lobbyConfig.colors.border;
    context.stroke();
  });

  context.save();
  context.globalAlpha = 0.12;
  context.strokeStyle = lobbyConfig.colors.parchmentLight;
  context.lineWidth = Math.max(1, width / 2048);
  context.beginPath();
  path(geoGraticule()());
  context.stroke();
  context.restore();

  paintAging(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}
