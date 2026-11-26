// Merapi Sky Run — seeded value noise and the island height function.
// Deterministic: the same seed always builds the same island.

var MSR_NOISE = (function () {
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // A small permutation-free value-noise field, smooth and repeatable.
  function makeNoise(seed) {
    var rand = mulberry32(seed);
    var grid = [];
    var SIZE = 64;
    for (var i = 0; i < SIZE * SIZE; i++) grid.push(rand() * 2 - 1);
    function at(ix, iz) {
      var x = ((ix % SIZE) + SIZE) % SIZE;
      var z = ((iz % SIZE) + SIZE) % SIZE;
      return grid[z * SIZE + x];
    }
    function smooth(t) { return t * t * (3 - 2 * t); }
    return function noise2(x, z) {
      var ix = Math.floor(x), iz = Math.floor(z);
      var fx = x - ix, fz = z - iz;
      var a = at(ix, iz), b = at(ix + 1, iz), c = at(ix, iz + 1), d = at(ix + 1, iz + 1);
      var u = smooth(fx), v = smooth(fz);
      return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
    };
  }

  var noise = makeNoise(20261126);
  var fbm = function (x, z) {
    return noise(x * 0.0016, z * 0.0016) * 0.55
      + noise(x * 0.0042 + 31, z * 0.0042 + 17) * 0.3
      + noise(x * 0.011 + 57, z * 0.011 + 43) * 0.15;
  };

  // Height of the island at (x, z). Sea level is y = 0.
  function terrainHeight(x, z) {
    var cfg = MSR_CONFIG;
    var dx = x, dz = z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    var R = cfg.ISLAND_RADIUS;
    // Island mask: 1 in the middle, 0 past the coast, smooth beach in between.
    var coast = 1 - smoothstep(R * 0.82, R, dist);
    if (coast <= 0) return -6; // sea floor
    var hills = 26 + fbm(x, z) * 34;
    var h = hills * coast;
    // Volcano cone with a crater bowl on top.
    var v = cfg.VOLCANO;
    var vd = Math.sqrt((x - v.x) * (x - v.x) + (z - v.z) * (z - v.z));
    var cone = Math.max(0, 1 - vd / 620) * v.height;
    var crater = -Math.max(0, 1 - vd / v.craterRadius) * 90;
    h = Math.max(h, cone + crater);
    // Flatten the runway strip and the town shelf on the south coast.
    var rw = cfg.RUNWAY;
    var along = Math.abs(x - rw.x);
    var across = Math.abs(z - rw.z);
    if (along < rw.length / 2 + 60 && across < 130) {
      var flat = smoothstep(rw.length / 2 + 60, rw.length / 2 - 40, along)
        * smoothstep(130, 60, across);
      h = h * (1 - flat) + rw.elevation * flat;
    }
    return h;
  }

  function smoothstep(a, b, x) {
    var t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  return { terrainHeight: terrainHeight, fbm: fbm, smoothstep: smoothstep };
})();
