import { describe, expect, it } from 'vitest';

import { createScrollMotion } from '../../utils/scroll-motion';

describe('createScrollMotion', () => {
  it('eases one downward step over 300 ms and then stops', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);

    // #when
    const frames = [
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
    ];
    const total = frames.reduce((sum, frame) => sum + frame, 0);
    const movingAfterStep = motion.isMoving();
    const nextFrame = motion.advance(50);

    // #then
    expect({ frames, total, movingAfterStep, nextFrame }).toEqual({
      frames: [119, 54, 20, 6, 0, 1],
      total: 200,
      movingAfterStep: false,
      nextFrame: 0,
    });
  });

  it('mirrors one step in the upward direction', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(-1);

    // #when
    const frames = [
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
    ];

    // #then
    expect({ frames, total: frames.reduce((sum, frame) => sum + frame, 0) }).toEqual({
      frames: [-119, -54, -20, -6, 0, -1],
      total: -200,
    });
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
      motion.advance(50),
      motion.advance(50),
    );

    // #then
    expect({ outputs, total: outputs.reduce((sum, output) => sum + output, 0), moving: motion.isMoving() }).toEqual({
      outputs: [81, 196, 84, 30, 8, 0, 1],
      total: 400,
      moving: false,
    });
  });

  it('lets an opposite tap cancel the unfinished part of a step', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);
    const outputs = [motion.advance(30)];
    motion.addStep(-1);

    // #when
    outputs.push(
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
      motion.advance(50),
    );

    // #then
    expect({ outputs, total: outputs.reduce((sum, output) => sum + output, 0), moving: motion.isMoving() }).toEqual({
      outputs: [81, -43, -23, -10, -4, 0, -1],
      total: 0,
      moving: false,
    });
  });

  it('carries fractional frame distance without losing pixels', () => {
    // #given
    const motion = createScrollMotion();
    motion.addStep(1);
    motion.addStep(1);

    // #when
    const outputs = Array.from({ length: 18 }, () => motion.advance(16.7));

    // #then
    expect({
      outputs,
      total: outputs.reduce((sum, output) => sum + output, 0),
      allFramesAreWholePixels: outputs.every(Number.isInteger),
      moving: motion.isMoving(),
    }).toEqual({
      outputs: [99, 79, 61, 47, 35, 26, 19, 12, 9, 6, 3, 2, 1, 0, 0, 0, 0, 1],
      total: 400,
      allFramesAreWholePixels: true,
      moving: false,
    });
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
    expect({ longFrame, negativeFrame }).toEqual({ longFrame: 119, negativeFrame: 0 });
  });
});
