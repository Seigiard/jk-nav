import type { ScrollDirection } from './key-interpreter';

export const SCROLL_STEP_PX = 200;
export const SCROLL_STEP_DURATION_MS = 300;
export const CONTINUOUS_SCROLL_SPEED_PX_PER_S = 1500;
export const CONTINUOUS_SCROLL_RAMP_MS = 100;
export const MAX_FRAME_ELAPSED_MS = 50;

const CONTINUOUS_INITIAL_SPEED_PX_PER_MS = 0.6;
const CONTINUOUS_FINAL_SPEED_PX_PER_MS = CONTINUOUS_SCROLL_SPEED_PX_PER_S / 1000;
const CONTINUOUS_RAMP_ACCELERATION_PX_PER_MS2 =
  (CONTINUOUS_FINAL_SPEED_PX_PER_MS - CONTINUOUS_INITIAL_SPEED_PX_PER_MS) / CONTINUOUS_SCROLL_RAMP_MS;
const FRACTION_EPSILON = 1e-9;

interface StepAnimation {
  direction: ScrollDirection;
  elapsedMs: number;
}

export interface ScrollMotion {
  /**
   * Starts this tap's own easeOutQuint animation over SCROLL_STEP_DURATION_MS
   * (300 ms) by direction × SCROLL_STEP_PX; tap curves add up. Ignored during
   * Continuous scroll.
   */
  addStep(direction: ScrollDirection): void;
  /** Starts Continuous scroll in direction, drops pending step animations, and restarts the ramp. */
  startContinuous(direction: ScrollDirection): void;
  /** Ends Continuous scroll; afterwards advance() returns 0 until the next addStep/startContinuous. */
  stopContinuous(): void;
  /** Whole, signed px to scroll for a frame that took elapsedMs (clamped to [0, MAX_FRAME_ELAPSED_MS]). */
  advance(elapsedMs: number): number;
  /** True while any step animation is unfinished or Continuous scroll runs. */
  isMoving(): boolean;
}

export function createScrollMotion(): ScrollMotion {
  let stepAnimations: StepAnimation[] = [];
  let continuousDirection: ScrollDirection | null = null;
  let continuousElapsedMs = 0;
  let fractionalDistance = 0;

  function addStep(direction: ScrollDirection): void {
    if (continuousDirection !== null) {
      return;
    }
    stepAnimations.push({ direction, elapsedMs: 0 });
    if (Math.abs(fractionalDistance) < FRACTION_EPSILON) {
      fractionalDistance = 0;
    }
  }

  function startContinuous(direction: ScrollDirection): void {
    stepAnimations = [];
    continuousDirection = direction;
    continuousElapsedMs = 0;
    fractionalDistance = 0;
  }

  function stopContinuous(): void {
    stepAnimations = [];
    continuousDirection = null;
    continuousElapsedMs = 0;
    fractionalDistance = 0;
  }

  function advance(elapsedMs: number): number {
    const frameElapsedMs = clampElapsed(elapsedMs);

    if (continuousDirection !== null) {
      const startMs = continuousElapsedMs;
      const endMs = startMs + frameElapsedMs;
      const distance = continuousDistance(startMs, endMs);
      continuousElapsedMs = endMs;
      return wholePixels(distance * continuousDirection);
    }

    if (stepAnimations.length === 0) {
      return 0;
    }

    let distance = 0;
    const activeAnimations: StepAnimation[] = [];
    for (const animation of stepAnimations) {
      const nextElapsedMs = Math.min(animation.elapsedMs + frameElapsedMs, SCROLL_STEP_DURATION_MS);
      distance += animation.direction * (
        easeOutQuintDistance(nextElapsedMs) - easeOutQuintDistance(animation.elapsedMs)
      );
      animation.elapsedMs = nextElapsedMs;
      if (nextElapsedMs < SCROLL_STEP_DURATION_MS) {
        activeAnimations.push(animation);
      }
    }
    stepAnimations = activeAnimations;

    const pixels = wholePixels(distance);
    if (stepAnimations.length === 0) {
      const finalFractionCorrection = Math.round(fractionalDistance);
      fractionalDistance -= finalFractionCorrection;
      return pixels + finalFractionCorrection;
    }
    return pixels;
  }

  function isMoving(): boolean {
    return continuousDirection !== null || stepAnimations.length > 0;
  }

  function wholePixels(distance: number): number {
    fractionalDistance += distance;
    const pixels = Math.trunc(fractionalDistance);
    fractionalDistance -= pixels;
    return pixels === 0 ? 0 : pixels;
  }

  return { addStep, startContinuous, stopContinuous, advance, isMoving };
}

function clampElapsed(elapsedMs: number): number {
  if (Number.isNaN(elapsedMs)) {
    return 0;
  }
  return Math.min(Math.max(elapsedMs, 0), MAX_FRAME_ELAPSED_MS);
}

function easeOutQuintDistance(elapsedMs: number): number {
  const progress = Math.min(Math.max(elapsedMs / SCROLL_STEP_DURATION_MS, 0), 1);
  return SCROLL_STEP_PX * (1 - (1 - progress) ** 5);
}

function continuousDistance(startMs: number, endMs: number): number {
  const rampEndMs = Math.min(endMs, CONTINUOUS_SCROLL_RAMP_MS);
  const rampStartMs = Math.min(startMs, CONTINUOUS_SCROLL_RAMP_MS);
  const rampDurationMs = Math.max(rampEndMs - rampStartMs, 0);
  const rampDistance =
    CONTINUOUS_INITIAL_SPEED_PX_PER_MS * rampDurationMs +
    (CONTINUOUS_RAMP_ACCELERATION_PX_PER_MS2 / 2) *
      (rampEndMs * rampEndMs - rampStartMs * rampStartMs);
  const afterRampDurationMs = Math.max(endMs - Math.max(startMs, CONTINUOUS_SCROLL_RAMP_MS), 0);
  return rampDistance + CONTINUOUS_FINAL_SPEED_PX_PER_MS * afterRampDurationMs;
}
