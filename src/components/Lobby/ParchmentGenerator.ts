import * as THREE from "three";
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

  const smooth = (value: number) =>
    value * value * (3 - 2 * value);

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

const simplifiedContinents: Array<[number, number, number, number]> = [
  [-168, 68, -52, 16],
  [-110, 72, -60, 28],
  [-85, 62, -52, 16],
  [-105, 30, -70, 8],
  [-25, 72, 35, 35],
  [-12, 68, 35, 35],
  [-18, 55, 55, 10],
  [95, 75, 170, 55],
  [20, -38, 155, -10],
  [-85, 15, -32, -58],
  [160, -48, 180, -32],
];

function drawLandmass(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.lineJoin = "round";
  context.lineCap = "round";

  simplifiedContinents.forEach(([lon0, lat0, lon1, lat1], index) => {
    const left = ((lon0 + 180) / 360) * width;
    const right = ((lon1 + 180) / 360) * width;
    const top = ((90 - lat0) / 180) * height;
    const bottom = ((90 - lat1) / 180) * height;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const radiusX = Math.abs(right - left) / 2;
    const radiusY = Math.abs(bottom - top) / 2;
    const points = 96;

    context.beginPath();

    for (let pointIndex = 0; pointIndex <= points; pointIndex += 1) {
      const angle = (pointIndex / points) * Math.PI * 2;
      const jitter =
        0.75 +
        0.25 *
          Math.sin(angle * 7 + index * 2.2) *
          Math.cos(angle * 4 + index * 1.7);
      const x = centerX + Math.cos(angle) * radiusX * jitter;
      const y = centerY + Math.sin(angle) * radiusY * jitter;
      const lineWidthJitter = Math.sin(angle * 19 + index) * 0.006;

      if (pointIndex === 0) {
        context.moveTo(x + lineWidthJitter * width, y);
      } else {
        context.lineTo(x + lineWidthJitter * width, y);
      }
    }

    context.closePath();
    context.fillStyle = lobbyConfig.colors.land;
    context.fill();
    context.lineWidth = Math.max(2, width / 1024);
    context.strokeStyle = lobbyConfig.colors.landInk;
    context.stroke();
  });
}

export function createParchmentEarthTexture(isMobile: boolean) {
  const width = isMobile
    ? lobbyConfig.texture.mobile[0]
    : window.devicePixelRatio > 1
      ? lobbyConfig.texture.tablet[0]
      : lobbyConfig.texture.desktop[0];
  const height = isMobile
    ? lobbyConfig.texture.mobile[1]
    : window.devicePixelRatio > 1
      ? lobbyConfig.texture.tablet[1]
      : lobbyConfig.texture.desktop[1];
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(document.createElement("canvas"));
  }

  const noise = createNoise({
    width: Math.min(1024, width),
    height: Math.min(512, height),
    scale: 9,
    octaves: 5,
    seed: 20260907,
  });
  const noiseWidth = Math.min(1024, width);
  const noiseHeight = Math.min(512, height);
  const image = context.createImageData(width, height);
  const { parchmentLight, parchmentMid, parchmentDark } =
    lobbyConfig.colors;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = Math.floor((x / width) * noiseWidth);
      const ny = Math.floor((y / height) * noiseHeight);
      const value = noise[ny * noiseWidth + nx];
      const fiber = (Math.sin(x * 0.23) + Math.sin(y * 0.17)) * 0.015;
      const shade = Math.min(1, Math.max(0, value + fiber));
      const low = {
        red: Number.parseInt(parchmentDark.slice(1, 3), 16),
        green: Number.parseInt(parchmentDark.slice(3, 5), 16),
        blue: Number.parseInt(parchmentDark.slice(5, 7), 16),
      };
      const mid = {
        red: Number.parseInt(parchmentMid.slice(1, 3), 16),
        green: Number.parseInt(parchmentMid.slice(3, 5), 16),
        blue: Number.parseInt(parchmentMid.slice(5, 7), 16),
      };
      const high = {
        red: Number.parseInt(parchmentLight.slice(1, 3), 16),
        green: Number.parseInt(parchmentLight.slice(3, 5), 16),
        blue: Number.parseInt(parchmentLight.slice(5, 7), 16),
      };
      const mixLowToMid = Math.min(1, shade / 0.55);
      const mixMidToHigh = Math.min(1, Math.max(0, (shade - 0.55) / 0.45));
      const red =
        (low.red + (mid.red - low.red) * mixLowToMid) *
        (1 - mixMidToHigh) +
        high.red * mixMidToHigh;
      const green =
        (low.green + (mid.green - low.green) * mixLowToMid) *
        (1 - mixMidToHigh) +
        high.green * mixMidToHigh;
      const blue =
        (low.blue + (mid.blue - low.blue) * mixLowToMid) *
        (1 - mixMidToHigh) +
        high.blue * mixMidToHigh;
      const pixelIndex = (y * width + x) * 4;

      image.data[pixelIndex] = red;
      image.data[pixelIndex + 1] = green;
      image.data[pixelIndex + 2] = blue;
      image.data[pixelIndex + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);

  drawLandmass(context, width, height);

  context.save();
  context.globalAlpha = 0.1;
  context.strokeStyle = parchmentLight;
  context.lineWidth = Math.max(1, width / 2048);

  for (let longitude = -180; longitude <= 180; longitude += 20) {
    const x = ((longitude + 180) / 360) * width;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }

  for (let latitude = -80; latitude <= 80; latitude += 20) {
    const y = ((90 - latitude) / 180) * height;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

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
    context.moveTo(((index * 67) % width), y);

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

  const texture = new THREE.CanvasTexture(canvas);

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  return texture;
}
