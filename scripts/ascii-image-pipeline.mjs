import { chromium } from "playwright-core";

export const TRANSPARENT_CELL = { char: " ", color: "transparent" };

const clampUnit = (value) => Math.min(1, Math.max(0, value));

function smoothstep(edgeStart, edgeEnd, value) {
  if (edgeStart === edgeEnd) {
    return value < edgeStart ? 0 : 1;
  }

  const amount = clampUnit((value - edgeStart) / (edgeEnd - edgeStart));
  return amount * amount * (3 - 2 * amount);
}

function colorString(red, green, blue) {
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

/** Relative luminance converted back to a perceptually spaced sRGB value. */
function perceptualLuminance(red, green, blue) {
  const linear =
    srgbToLinear(clampUnit(red)) * 0.2126 +
    srgbToLinear(clampUnit(green)) * 0.7152 +
    srgbToLinear(clampUnit(blue)) * 0.0722;

  return clampUnit(linearToSrgb(linear));
}

async function sampleFrames(imageBuffer, sources, columns, rows, profile) {
  const samplesPerAxis = Math.max(1, Math.round(profile.raster.samplesPerAxis));
  const sampleWidth = columns * samplesPerAxis;
  const frameSampleHeight = rows * samplesPerAxis;
  const sampleHeight = frameSampleHeight * sources.length;
  const imageUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
  const executablePath = process.env.PROFILE_ASCII_BROWSER_EXECUTABLE;
  const channel = process.env.PROFILE_ASCII_BROWSER_CHANNEL ?? "chrome";
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : { channel }),
  });
  let pixels;

  try {
    const page = await browser.newPage();
    pixels = await page.evaluate(
      async ({
        imageUrl: sourceImageUrl,
        sources: frameSources,
        sampleWidth: width,
        frameSampleHeight: frameHeight,
        sampleHeight: height,
        smoothingEnabled,
        smoothingQuality,
      }) => {
        const image = new Image();
        image.src = sourceImageUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { willReadFrequently: true });
        canvas.width = width;
        canvas.height = height;

        if (!context) {
          throw new Error("Canvas 2D context is unavailable");
        }

        context.clearRect(0, 0, width, height);
        context.imageSmoothingEnabled = smoothingEnabled;
        context.imageSmoothingQuality = smoothingQuality;
        frameSources.forEach((source, frameIndex) => {
          context.drawImage(
            image,
            source.x,
            source.y,
            source.w,
            source.h,
            0,
            frameIndex * frameHeight,
            width,
            frameHeight,
          );
        });

        return Array.from(context.getImageData(0, 0, width, height).data);
      },
      {
        imageUrl,
        sources,
        sampleWidth,
        frameSampleHeight,
        sampleHeight,
        smoothingEnabled: profile.raster.smoothingEnabled,
        smoothingQuality: profile.raster.smoothingQuality,
      },
    );
  } finally {
    await browser.close();
  }

  const length = columns * rows;
  const samplesPerCell = samplesPerAxis * samplesPerAxis;

  return sources.map((_, frameIndex) => {
    const red = new Float32Array(length);
    const green = new Float32Array(length);
    const blue = new Float32Array(length);
    const alpha = new Float32Array(length);
    const framePixelOffset = frameIndex * frameSampleHeight;

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        let alphaSum = 0;
        let redSum = 0;
        let greenSum = 0;
        let blueSum = 0;

        for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
          const pixelY = framePixelOffset + row * samplesPerAxis + sampleY;

          for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
            const pixelX = column * samplesPerAxis + sampleX;
            const offset = (pixelY * sampleWidth + pixelX) * 4;
            const sampleAlpha = pixels[offset + 3] / 255;

            alphaSum += sampleAlpha;
            redSum += (pixels[offset] / 255) * sampleAlpha;
            greenSum += (pixels[offset + 1] / 255) * sampleAlpha;
            blueSum += (pixels[offset + 2] / 255) * sampleAlpha;
          }
        }

        const index = row * columns + column;
        alpha[index] = alphaSum / samplesPerCell;

        if (alphaSum > 0) {
          red[index] = redSum / alphaSum;
          green[index] = greenSum / alphaSum;
          blue[index] = blueSum / alphaSum;
        }
      }
    }

    return { alpha, blue, green, red };
  });
}

function gaussianKernel(sigma) {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float32Array(radius * 2 + 1);
  let sum = 0;

  for (let offset = -radius; offset <= radius; offset += 1) {
    const weight = Math.exp(-(offset * offset) / (2 * sigma * sigma));
    kernel[offset + radius] = weight;
    sum += weight;
  }

  for (let index = 0; index < kernel.length; index += 1) {
    kernel[index] /= sum;
  }

  return { kernel, radius };
}

/** Gaussian blur that does not bleed transparent pixels into visible edges. */
function blurField(values, alpha, width, height, sigma) {
  if (sigma <= 0) {
    return values.slice();
  }

  const { kernel, radius } = gaussianKernel(sigma);
  const horizontalValue = new Float32Array(values.length);
  const horizontalWeight = new Float32Array(values.length);
  const output = new Float32Array(values.length);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleColumn = Math.min(width - 1, Math.max(0, column + offset));
        const sampleIndex = row * width + sampleColumn;
        const weight = kernel[offset + radius] * alpha[sampleIndex];
        horizontalValue[index] += values[sampleIndex] * weight;
        horizontalWeight[index] += weight;
      }
    }
  }

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      let valueSum = 0;
      let weightSum = 0;

      for (let offset = -radius; offset <= radius; offset += 1) {
        const sampleRow = Math.min(height - 1, Math.max(0, row + offset));
        const sampleIndex = sampleRow * width + column;
        const kernelWeight = kernel[offset + radius];
        valueSum += horizontalValue[sampleIndex] * kernelWeight;
        weightSum += horizontalWeight[sampleIndex] * kernelWeight;
      }

      output[index] = weightSum > 0 ? valueSum / weightSum : values[index];
    }
  }

  return output;
}

function percentile(sorted, position) {
  if (sorted.length === 0) {
    return 0;
  }

  const index = clampUnit(position) * (sorted.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const amount = index - lowerIndex;

  return sorted[lowerIndex] * (1 - amount) + sorted[upperIndex] * amount;
}

function applyAutomaticLevels(values, alpha, profile) {
  const visibleValues = Array.from(values).filter(
    (_, index) => alpha[index] >= profile.alpha.threshold,
  );
  visibleValues.sort((left, right) => left - right);

  const black = percentile(visibleValues, profile.tone.blackPointPercentile);
  const white = percentile(visibleValues, profile.tone.whitePointPercentile);
  const range = Math.max(1 / 255, white - black);

  return values.map((value) => clampUnit((value - black) / range));
}

function getFieldValue(values, alpha, width, height, row, column, fallback) {
  const safeRow = Math.min(height - 1, Math.max(0, row));
  const safeColumn = Math.min(width - 1, Math.max(0, column));
  const index = safeRow * width + safeColumn;

  return alpha[index] > 0 ? values[index] : fallback;
}

function sobelField(values, alpha, width, height) {
  const gradientX = new Float32Array(values.length);
  const gradientY = new Float32Array(values.length);
  const edgeMagnitude = new Float32Array(values.length);

  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const index = row * width + column;
      const center = values[index];
      const topLeft = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column - 1,
        center,
      );
      const top = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column,
        center,
      );
      const topRight = getFieldValue(
        values,
        alpha,
        width,
        height,
        row - 1,
        column + 1,
        center,
      );
      const left = getFieldValue(
        values,
        alpha,
        width,
        height,
        row,
        column - 1,
        center,
      );
      const right = getFieldValue(
        values,
        alpha,
        width,
        height,
        row,
        column + 1,
        center,
      );
      const bottomLeft = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column - 1,
        center,
      );
      const bottom = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column,
        center,
      );
      const bottomRight = getFieldValue(
        values,
        alpha,
        width,
        height,
        row + 1,
        column + 1,
        center,
      );

      const x =
        -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const y =
        -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;

      gradientX[index] = x;
      gradientY[index] = y;
      edgeMagnitude[index] = clampUnit(Math.hypot(x, y) / 4);
    }
  }

  return { edgeMagnitude, gradientX, gradientY };
}

function processTone(sampled, columns, rows, profile) {
  let luminance = new Float32Array(sampled.alpha.length);

  for (let index = 0; index < luminance.length; index += 1) {
    luminance[index] = perceptualLuminance(
      sampled.red[index] * profile.tone.exposure,
      sampled.green[index] * profile.tone.exposure,
      sampled.blue[index] * profile.tone.exposure,
    );
  }

  luminance = blurField(
    luminance,
    sampled.alpha,
    columns,
    rows,
    profile.tone.preBlurSigma,
  );
  luminance = applyAutomaticLevels(luminance, sampled.alpha, profile);

  for (let index = 0; index < luminance.length; index += 1) {
    const contrasted = (luminance[index] - 0.5) * profile.tone.contrast + 0.5;
    luminance[index] = clampUnit(
      clampUnit(contrasted) ** (1 / Math.max(0.01, profile.tone.gamma)),
    );
  }

  if (profile.tone.localContrastAmount !== 0) {
    const surroundings = blurField(
      luminance,
      sampled.alpha,
      columns,
      rows,
      profile.tone.localContrastSigma,
    );

    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] +
          (luminance[index] - surroundings[index]) *
            profile.tone.localContrastAmount,
      );
    }
  }

  if (profile.tone.sharpenAmount !== 0) {
    const softened = blurField(
      luminance,
      sampled.alpha,
      columns,
      rows,
      profile.tone.sharpenSigma,
    );

    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] +
          (luminance[index] - softened[index]) * profile.tone.sharpenAmount,
      );
    }
  }

  if (profile.tone.shadowLift !== 0) {
    const halfSoftness = Math.max(0, profile.tone.shadowLiftSoftness) / 2;
    const transitionStart = profile.tone.shadowLiftThreshold - halfSoftness;
    const transitionEnd = profile.tone.shadowLiftThreshold + halfSoftness;

    for (let index = 0; index < luminance.length; index += 1) {
      const shadowWeight =
        1 - smoothstep(transitionStart, transitionEnd, luminance[index]);
      luminance[index] = clampUnit(
        luminance[index] +
          profile.tone.shadowLift * shadowWeight * (1 - luminance[index]),
      );
    }
  }

  const edges = sobelField(luminance, sampled.alpha, columns, rows);

  if (profile.tone.edgeBoost !== 0) {
    for (let index = 0; index < luminance.length; index += 1) {
      luminance[index] = clampUnit(
        luminance[index] + edges.edgeMagnitude[index] * profile.tone.edgeBoost,
      );
    }
  }

  return { ...edges, luminance };
}

function diffusionTargets(mode, row, column, direction) {
  if (mode === "atkinson") {
    return [
      { column: column + direction, row, weight: 1 / 8 },
      { column: column + direction * 2, row, weight: 1 / 8 },
      { column: column - direction, row: row + 1, weight: 1 / 8 },
      { column, row: row + 1, weight: 1 / 8 },
      { column: column + direction, row: row + 1, weight: 1 / 8 },
      { column, row: row + 2, weight: 1 / 8 },
    ];
  }

  return [
    { column: column + direction, row, weight: 7 / 16 },
    { column: column - direction, row: row + 1, weight: 3 / 16 },
    { column, row: row + 1, weight: 5 / 16 },
    { column: column + direction, row: row + 1, weight: 1 / 16 },
  ];
}

function quantizeLuminance(tone, alpha, columns, rows, profile) {
  const rampLength = Math.max(1, Array.from(profile.quantization.ramp).length);
  const levels = Math.max(1, rampLength - 1);
  const indices = new Int16Array(tone.luminance.length);
  indices.fill(-1);
  const working = tone.luminance.slice();
  const useDiffusion = profile.quantization.dither !== "none";

  for (let row = 0; row < rows; row += 1) {
    const direction = profile.quantization.serpentine && row % 2 === 1 ? -1 : 1;
    const start = direction === 1 ? 0 : columns - 1;

    for (let step = 0; step < columns; step += 1) {
      const column = start + step * direction;
      const index = row * columns + column;

      if (alpha[index] < profile.alpha.threshold) {
        continue;
      }

      const value = clampUnit(working[index]);
      const quantizedIndex = Math.round(value * levels);
      const quantizedValue = quantizedIndex / levels;
      indices[index] = quantizedIndex;

      if (!useDiffusion || profile.quantization.ditherStrength === 0) {
        continue;
      }

      const error =
        (value - quantizedValue) * profile.quantization.ditherStrength;

      for (const target of diffusionTargets(
        profile.quantization.dither,
        row,
        column,
        direction,
      )) {
        if (
          target.row < 0 ||
          target.row >= rows ||
          target.column < 0 ||
          target.column >= columns
        ) {
          continue;
        }

        const targetIndex = target.row * columns + target.column;

        if (alpha[targetIndex] >= profile.alpha.threshold) {
          working[targetIndex] += error * target.weight;
        }
      }
    }
  }

  return indices;
}

function contourGlyph(gradientX, gradientY, profile) {
  const halfTurn = Math.PI;
  let angle = Math.atan2(gradientY, gradientX) + Math.PI / 2;
  angle = ((angle % halfTurn) + halfTurn) % halfTurn;

  if (angle < Math.PI / 8 || angle >= (Math.PI * 7) / 8) {
    return profile.structure.horizontalGlyph;
  }

  if (angle < (Math.PI * 3) / 8) {
    return profile.structure.backwardSlashGlyph;
  }

  if (angle < (Math.PI * 5) / 8) {
    return profile.structure.verticalGlyph;
  }

  return profile.structure.forwardSlashGlyph;
}

function processedColor(sampled, tone, index, profile) {
  let red = clampUnit(sampled.red[index] * profile.tone.exposure);
  let green = clampUnit(sampled.green[index] * profile.tone.exposure);
  let blue = clampUnit(sampled.blue[index] * profile.tone.exposure);
  const sourceTone = perceptualLuminance(red, green, blue);

  red = sourceTone + (red - sourceTone) * profile.color.saturation;
  green = sourceTone + (green - sourceTone) * profile.color.saturation;
  blue = sourceTone + (blue - sourceTone) * profile.color.saturation;

  const targetTone =
    sourceTone * (1 - profile.color.toneMapStrength) +
    tone.luminance[index] * profile.color.toneMapStrength;
  const adjustedTone = perceptualLuminance(red, green, blue);
  const scale = targetTone / Math.max(1 / 255, adjustedTone);

  return colorString(
    clampUnit(red * scale) * 255,
    clampUnit(green * scale) * 255,
    clampUnit(blue * scale) * 255,
  );
}

function sampledFrameToAscii(sampled, columns, rows, profile) {
  const tone = processTone(sampled, columns, rows, profile);
  const quantized = quantizeLuminance(
    tone,
    sampled.alpha,
    columns,
    rows,
    profile,
  );
  const ramp = Array.from(profile.quantization.ramp);

  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) => {
      const index = row * columns + column;
      const rampIndex = quantized[index];

      if (rampIndex < 0) {
        return TRANSPARENT_CELL;
      }

      const useContour =
        profile.structure.enabled &&
        tone.edgeMagnitude[index] >= profile.structure.edgeThreshold &&
        tone.luminance[index] >= profile.structure.minTone &&
        tone.luminance[index] <= profile.structure.maxTone;

      return {
        char: useContour
          ? contourGlyph(tone.gradientX[index], tone.gradientY[index], profile)
          : (ramp[rampIndex] ?? ramp.at(-1) ?? " "),
        color: processedColor(sampled, tone, index, profile),
      };
    }),
  );
}

/** Converts an RGBA image atlas with the same stages as portfolio-v3. */
export async function imageAtlasToAsciiFrames({
  imageBuffer,
  sources,
  columns,
  rows,
  profile,
}) {
  const sampledFrames = await sampleFrames(
    imageBuffer,
    sources,
    columns,
    rows,
    profile,
  );

  return sampledFrames.map((sampled) =>
    sampledFrameToAscii(sampled, columns, rows, profile),
  );
}

export function flipFrameHorizontally(frame) {
  return frame.map((row) => [...row].reverse());
}
