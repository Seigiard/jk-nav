import type { ScrollDirection } from './key-interpreter';

export const SCROLL_STEP_PX = 60;
export const SCROLL_STEP_DURATION_MS = 100;
export const SCROLL_STEP_SPEED_PX_PER_MS = SCROLL_STEP_PX / SCROLL_STEP_DURATION_MS;
export const CONTINUOUS_SCROLL_SPEED_PX_PER_S = 1500;
export const CONTINUOUS_SCROLL_RAMP_MS = 100;
export const MAX_FRAME_ELAPSED_MS = 50;

const CONTINUOUS_INITIAL_SPEED_PX_PER_MS = SCROLL_STEP_SPEED_PX_PER_MS;
const CONTINUOUS_FINAL_SPEED_PX_PER_MS = CONTINUOUS_SCROLL_SPEED_PX_PER_S / 1000;
const CONTINUOUS_RAMP_ACCELERATION_PX_PER_MS2 =
  (CONTINUOUS_FINAL_SPEED_PX_PER_MS - CONTINUOUS_INITIAL_SPEED_PX_PER_MS) / CONTINUOUS_SCROLL_RAMP_MS;
const FRACTION_EPSILON = 1e-9;

export interface ScrollMotion {
  /** One tap: adds direction × SCROLL_STEP_PX to the remaining distance. */
  addStep(direction: ScrollDirection): void;
  /** Starts Continuous scroll in direction; drops any remaining step distance and restarts the ramp. */
  startContinuous(direction: ScrollDirection): void;
  /** Ends Continuous scroll; afterwards advance() returns 0 until the next addStep/startContinuous. */
  stopContinuous(): void;
  /** Whole, signed px to scroll for a frame that took elapsedMs (clamped to [0, MAX_FRAME_ELAPSED_MS]). */
  advance(elapsedMs: number): number;
  /** True while remaining step distance is not 0 or Continuous scroll runs. */
  isMoving(): boolean;
}

export function createScrollMotion(): ScrollMotion {
  let remainingStepDistance = 0;
  let continuousDirection: ScrollDirection | null = null;
  let continuousElapsedMs = 0;
  let fractionalDistance = 0;

  function addStep(direction: ScrollDirection): void {
    remainingStepDistance += direction * SCROLL_STEP_PX;
    if (Math.abs(fractionalDistance) < FRACTION_EPSILON) {
      fractionalDistance = 0;
    }
  }

  function startContinuous(direction: ScrollDirection): void {
    remainingStepDistance = 0;
    continuousDirection = direction;
    continuousElapsedMs = 0;
    fractionalDistance = 0;
  }

  function stopContinuous(): void {
    remainingStepDistance = 0;
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

    if (remainingStepDistance === 0) {
      return 0;
    }

    const direction = Math.sign(remainingStepDistance) as ScrollDirection;
    const distance = Math.min(
      Math.abs(remainingStepDistance),
      SCROLL_STEP_SPEED_PX_PER_MS * frameElapsedMs,
    );
    remainingStepDistance -= direction * distance;
    if (Math.abs(remainingStepDistance) < FRACTION_EPSILON) {
      remainingStepDistance = 0;
    }

    const pixels = wholePixels(direction * distance);
    if (remainingStepDistance === 0) {
      const finalFractionCorrection = Math.round(fractionalDistance);
      fractionalDistance -= finalFractionCorrection;
      return pixels + finalFractionCorrection;
    }
    return pixels;
  }

  function isMoving(): boolean {
    return continuousDirection !== null || remainingStepDistance !== 0;
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
