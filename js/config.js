/*
 * Variant presets and the dev-panel parameter schema.
 * A preset is a partial config merged over Constellation.DEFAULT_CONFIG.
 * Add a new variant by adding a preset here and a thin page in /variants.
 */
(function (global) {
  'use strict';

  const PRESETS = {
    classic: {
      // Balanced default — just the defaults.
    },
    'noise-stars': {
      // Loose distractor stars that aren't part of any letter, with fewer decoys.
      noiseStars: 45,
      decoyCount: 6,
    },
    'hard-skew': {
      // Heavier rotation / skew / scale variance so letters are harder to read.
      rotate: 1.2,
      skewX: 0.9,
      skewY: 0.8,
      scaleJitter: 12,
      cellJitter: 0.45,
    },
  };

  // Drives the live slider panel. Each entry maps to a numeric config key.
  const PARAMS = [
    { key: 'decoyCount',  label: 'decoys',       min: 0,    max: 12,  step: 1 },
    { key: 'noiseStars',  label: 'noise stars',  min: 0,    max: 120, step: 5 },
    { key: 'bgStars',     label: 'bg stars',     min: 0,    max: 400, step: 20 },
    { key: 'scaleBase',   label: 'scale',        min: 0.10, max: 0.32, step: 0.01 },
    { key: 'scaleJitter', label: 'scale jitter', min: 0,    max: 20,  step: 1 },
    { key: 'rotate',      label: 'rotate',       min: 0,    max: 1.5, step: 0.05 },
    { key: 'skewX',       label: 'skew x',       min: 0,    max: 1,   step: 0.05 },
    { key: 'skewY',       label: 'skew y',       min: 0,    max: 1,   step: 0.05 },
    { key: 'cellJitter',  label: 'cell jitter',  min: 0,    max: 0.6, step: 0.05 },
    { key: 'hitRadius',   label: 'tap radius',   min: 15,   max: 60,  step: 1 },
  ];

  global.CONSTELLATION_PRESETS = PRESETS;
  global.CONSTELLATION_PARAMS = PARAMS;
})(window);
