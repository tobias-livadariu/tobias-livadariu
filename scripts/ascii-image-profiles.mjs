/**
 * Static image-to-ASCII tuning knobs.
 *
 * This is intentionally the same modalHeaderPlanet profile used by
 * portfolio-v3. Keep the values in sync with STATIC_ASCII_PROFILES in
 * src/modals/components/ascii-image-profiles.ts when tuning either planet.
 * The portrait-only profile is omitted because this repository renders only
 * the animated header planet.
 */
export const STATIC_ASCII_PROFILES = {
  modalHeaderPlanet: {
    // Stable profile name. Changing it identifies a new visual treatment.
    id: "modal-header-planet-v2",
    raster: {
      // Samples every output glyph on this N-by-N grid before averaging.
      samplesPerAxis: 2,
      // Enables browser interpolation while shrinking each source frame.
      smoothingEnabled: true,
      // Resampling quality used when smoothing is enabled.
      smoothingQuality: "high",
      // Runtime portfolio batching knob retained for one-to-one profile parity.
      // This offline generator has no UI thread to yield to between batches.
      framesPerYield: 2,
    },
    alpha: {
      // Cells below this average opacity become transparent spaces.
      threshold: 0.075,
    },
    tone: {
      // Multiplies source RGB before tone analysis; values above 1 brighten.
      exposure: 1.08,
      // Midtone curve; values above 1 brighten midtones without moving black.
      gamma: 1.02,
      // Contrast around middle gray; 1 preserves source contrast.
      contrast: 1.08,
      // Ignores this darkest fraction when automatically finding black.
      blackPointPercentile: 0.025,
      // Uses this luminance percentile as white during automatic leveling.
      whitePointPercentile: 0.985,
      // Gaussian sigma used to remove detail too fine for one character cell.
      preBlurSigma: 0.35,
      // Small-scale Gaussian sigma used by the unsharp-mask stage.
      sharpenSigma: 0.8,
      // Strength of fine edge sharpening; 0 disables the stage.
      sharpenAmount: 0.55,
      // Large-scale Gaussian sigma used to measure surrounding brightness.
      localContrastSigma: 2.3,
      // Strength of large-scale local contrast; 0 disables the stage.
      localContrastAmount: 0.22,
      // Raises only dark tones by this fraction of their remaining headroom.
      shadowLift: 0.205,
      // Luminance around which the shadow-only lift fades to zero.
      shadowLiftThreshold: 0.36,
      // Width of the transition between lifted shadows and untouched tones.
      shadowLiftSoftness: 0.21,
      // Adds Sobel edge magnitude to glyph density; 0 preserves pure tone.
      edgeBoost: 0.1,
    },
    color: {
      // Color saturation multiplier; 0 is grayscale and 1 preserves source.
      saturation: 1.08,
      // Blends output color brightness toward processed glyph luminance.
      toneMapStrength: 0.45,
    },
    quantization: {
      // Characters ordered from visually lightest to visually densest.
      ramp: " .,:;irsXA253hMHGS#9B&@",
      // Error-diffusion algorithm: "floyd-steinberg", "atkinson", or "none".
      dither: "floyd-steinberg",
      // Fraction of quantization error diffused into neighboring cells.
      ditherStrength: 0.38,
      // Alternates scan direction each row to avoid directional streaking.
      serpentine: true,
    },
    structure: {
      // Replaces strong contour cells with direction-matched line glyphs.
      enabled: true,
      // Minimum normalized Sobel magnitude required for a contour glyph.
      edgeThreshold: 0.34,
      // Prevents contour glyphs in tones darker than this value.
      minTone: 0.12,
      // Prevents contour glyphs in tones brighter than this value.
      maxTone: 0.78,
      // Glyph used when an image contour runs horizontally.
      horizontalGlyph: "-",
      // Glyph used when an image contour runs vertically.
      verticalGlyph: "|",
      // Glyph used for a bottom-left to top-right contour.
      forwardSlashGlyph: "/",
      // Glyph used for a top-left to bottom-right contour.
      backwardSlashGlyph: "\\",
    },
  },
};
