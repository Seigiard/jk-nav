import { describe, expect, it } from 'vitest';

import { createScrollMotion } from '../../utils/scroll-motion';

describe('createScrollMotion', () => {
  it('moves one downward step over 100 ms and then stops', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);

    // #when
    const firstFrame = motion.advance(50);
    const total = firstFrame + motion.advance(50);
    const movingAfterStep = motion.isMoving();
    const nextFrame = motion.advance(50);

    // #then
    expect({ firstFrame, total, movingAfterStep, nextFrame }).toEqual({
      firstFrame: 30,
      total: 60,
      movingAfterStep: false,
      nextFrame: 0,
    });
  });

  it('mirrors one step in the upward direction', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(-1);

    // #when
    const total = motion.advance(50) + motion.advance(50);

    // #then
    expect(total).toBe(-60);
  });

  it('preserves both steps when two taps are 30 ms apart', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);
    const outputs = [motion.advance(30)];
    motion.addStep(1);

    // #when
    outputs.push(
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
    );

    // #then
    expect({ total: outputs.reduce((sum, output) => sum + output, 0), moving: motion.isMoving() }).toEqual({
      total: 120,
      moving: false,
    });
  });

  it('lets an opposite tap cancel the unfinished part of a step', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);
    const firstFrame = motion.advance(30);
    motion.addStep(-1);

    // #when
    const total = firstFrame + motion.advance(50);

    // #then
    expect({ total, moving: motion.isMoving() }).toEqual({ total: 0, moving: false });
  });

  it('carries fractional frame distance without losing pixels', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);
    motion.addStep(1);

    // #when
    const outputs = Array.from({ length: 12 }, () => motion.advance(16.7));

    // #then
    expect({
      total: outputs.reduce((sum, output) => sum + output, 0),
      allFramesAreWholePixels: outputs.every(Number.isInteger),
      moving: motion.isMoving(),
    }).toEqual({ total: 120, allFramesAreWholePixels: true, moving: false });
  });

  it('ramps Continuous scroll to 1500 px per second', () => {
    // #given
    const motion = createScrollMotion();
    motion.startContinuous(1);

    // #when
    const framesDuringRamp = [motion.advance(50), motion.advance(50)];
    const distanceDuringRamp = framesDuringRamp.reduce((sum, distance) => sum + distance, 0);
    const distanceAfterRamp = motion.advance(20);

    // #then
    expect({ framesDuringRamp, distanceDuringRamp, distanceAfterRamp }).toEqual({
      framesDuringRamp: [41, 64],
      distanceDuringRamp: 105,
      distanceAfterRamp: 30,
    });
  });

  it('stops Continuous scroll without another frame of motion', () => {
    // #given
    const motion = createScrollMotion();
    motion.startContinuous(-1);
    motion.advance(20);

    // #when
    motion.stopContinuous();

    // #then
    expect({ nextFrame: motion.advance(20), moving: motion.isMoving() }).toEqual({
      nextFrame: 0,
      moving: false,
    });
  });

  it('clamps elapsed time to the supported frame range', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);

    // #when
    const longFrame = motion.advance(5000);
    const negativeFrame = motion.advance(-20);

    // #then
    expect({ longFrame, negativeFrame }).toEqual({ longFrame: 30, negativeFrame: 0 });
  });
});
