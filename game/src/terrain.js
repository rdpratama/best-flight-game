// Merapi Sky Run — the island: terrain mesh, sea, runway, town, volcano, clouds.
// Everything is built from the deterministic height function, no textures.

var MSR_TERRAIN = (function () {
  var terrainGroup = null;
  var papiLights = [];
  var clouds = [];

  function build(scene) {
    var cfg = MSR_CONFIG, pal = cfg.PALETTE;
    terrainGroup = new THREE.Group();
    terrainGroup.name = 'island';

    buildIslandMesh();
    buildSea();
    buildRunway();
    buildTown();
    buildVolcanoGlow();
    buildClouds();
    buildBeaconBuoy();

    scene.add(terrainGroup);
    return terrainGroup;
  }

  function colorForHeight(h, x, z, slope) {
    var pal = MSR_CONFIG.PALETTE;
    var c = new THREE.Color();
    if (h < 2.5) c.setHex(pal.sand);
    else if (h < 26) c.setHex(pal.grass).lerp(new THREE.Color(pal.grassDry), MSR_NOISE.fbm(x + 9, z + 4) * 0.5 + 0.5);
    else if (h < 120) c.setHex(pal.grassDry).lerp(new THREE.Color(pal.rock), Math.min(1, (h - 26) / 90));
    else c.setHex(pal.rock);
    // Volcano rock near the cone.
    var v = MSR_CONFIG.VOLCANO;
    var vd = Math.sqrt((x - v.x) * (x - v.x) + (z - v.z) * (z - v.z));
    if (vd < 620) c.lerp(new THREE.Color(pal.volcanoRock), Math.max(0, 1 - vd / 620) * 0.85);
    if (slope > 0.55) c.lerp(new THREE.Color(pal.rock), 0.5);
    return c;
  }

  function buildIslandMesh() {
    var R = MSR_CONFIG.ISLAND_RADIUS + 260;
    var SEG = 150;
    var geo = new THREE.PlaneGeometry(R * 2, R * 2, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var colors = new Float32Array(pos.count * 3);
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var h = MSR_NOISE.terrainHeight(x, z);
      pos.setY(i, h);
      // Slope estimate for rock colouring on cliffs.
      var hx = MSR_NOISE.terrainHeight(x + 8, z) - h;
      var hz = MSR_NOISE.terrainHeight(x, z + 8) - h;
      var slope = Math.sqrt(hx * hx + hz * hz) / 8;
      var c = colorForHeight(h, x, z, slope);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'terrain';
    terrainGroup.add(mesh);
  }

  function buildSea() {
    var pal = MSR_CONFIG.PALETTE;
    var geo = new THREE.PlaneGeometry(14000, 14000);
    geo.rotateX(-Math.PI / 2);
    var mat = new THREE.MeshPhongMaterial({ color: pal.sea, shininess: 90, specular: 0x99ccdd, transparent: true, opacity: 0.94 });
    var sea = new THREE.Mesh(geo, mat);
    sea.position.y = 0;
    sea.name = 'sea';
    terrainGroup.add(sea);
    // A lighter shallow ring hugging the beach.
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(MSR_CONFIG.ISLAND_RADIUS * 0.86, MSR_CONFIG.ISLAND_RADIUS * 1.04, 64),
      new THREE.MeshBasicMaterial({ color: 0x7fd4d9, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.4;
    terrainGroup.add(ring);
  }

  function buildRunway() {
    var cfg = MSR_CONFIG, rw = cfg.RUNWAY, pal = cfg.PALETTE;
    var group = new THREE.Group();
    group.name = 'runway';
    var strip = new THREE.Mesh(
      new THREE.BoxGeometry(rw.length, 1.2, rw.width),
      new THREE.MeshLambertMaterial({ color: pal.runway })
    );
    strip.position.set(rw.x, rw.elevation + 0.4, rw.z);
    group.add(strip);
    // Centreline dashes and threshold bars.
    var markMat = new THREE.MeshBasicMaterial({ color: pal.runwayMark });
    for (var d = -rw.length / 2 + 40; d < rw.length / 2 - 20; d += 46) {
      var dash = new THREE.Mesh(new THREE.BoxGeometry(22, 0.3, 2.4), markMat);
      dash.position.set(rw.x + d, rw.elevation + 1.1, rw.z);
      group.add(dash);
    }
    for (var side = -1; side <= 1; side += 2) {
      var th = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, rw.width - 8), markMat);
      th.position.set(rw.x + side * (rw.length / 2 - 12), rw.elevation + 1.1, rw.z);
      group.add(th);
      // "09" numbers as simple bars (readable from the air).
      var num = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 12), markMat);
      num.position.set(rw.x + side * (rw.length / 2 - 46), rw.elevation + 1.1, rw.z);
      group.add(num);
    }
    // PAPI lights: four lamps each end, red/white by glide path (lit amber here).
    papiLights = [];
    for (var end = -1; end <= 1; end += 2) {
      for (var k = 0; k < 4; k++) {
        var lamp = new THREE.Mesh(
          new THREE.SphereGeometry(1.6, 8, 8),
          new THREE.MeshBasicMaterial({ color: k < 2 ? 0xff3b30 : 0xffffff })
        );
        lamp.position.set(rw.x + end * (rw.length / 2 - 6), rw.elevation + 2.5, rw.z + (rw.width / 2 + 14) + k * 4.5);
        group.add(lamp);
        papiLights.push(lamp);
      }
    }
    // Windsock on a pole beside the runway.
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 14, 8), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
    pole.position.set(rw.x - 120, rw.elevation + 7, rw.z - rw.width / 2 - 26);
    group.add(pole);
    var sock = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 10), new THREE.MeshLambertMaterial({ color: 0xff7a1a }));
    sock.rotation.z = Math.PI / 2;
    sock.position.set(rw.x - 112, rw.elevation + 13.5, rw.z - rw.width / 2 - 26);
    sock.name = 'windsock';
    group.add(sock);
    // Two hangars and a control tower near the apron.
    var hangarMat = new THREE.MeshLambertMaterial({ color: 0xe8e2d2 });
    [-70, -40].forEach(function (dx) {
      var h = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 20), hangarMat);
      h.position.set(rw.x + dx, rw.elevation + 6, rw.z - rw.width / 2 - 42);
      group.add(h);
      var roof = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 26, 12, 1, false, 0, Math.PI), new THREE.MeshLambertMaterial({ color: 0x9a3b2e }));
      roof.rotation.z = Math.PI / 2; roof.rotation.y = Math.PI / 2;
      roof.position.set(rw.x + dx, rw.elevation + 12, rw.z - rw.width / 2 - 42);
      group.add(roof);
    });
    var tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 26, 10), new THREE.MeshLambertMaterial({ color: 0xdde5ea }));
    tower.position.set(rw.x + 90, rw.elevation + 13, rw.z - rw.width / 2 - 40);
    group.add(tower);
    var cab = new THREE.Mesh(new THREE.CylinderGeometry(6, 5, 6, 10), new THREE.MeshPhongMaterial({ color: 0x2a6f9e, shininess: 120 }));
    cab.position.set(rw.x + 90, rw.elevation + 29, rw.z - rw.width / 2 - 40);
    group.add(cab);
    terrainGroup.add(group);
  }

  function buildTown() {
    var cfg = MSR_CONFIG, city = cfg.CITY;
    var group = new THREE.Group();
    group.name = 'town';
    var palette = [0xe8dcc0, 0xd9a06a, 0x7fa8c9, 0xc96a5a, 0xf0ead8];
    var rand = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(12345);
    for (var i = 0; i < 46; i++) {
      var bx = city.x - 160 + rand() * 420;
      var bz = city.z - 120 + rand() * 260;
      if (Math.abs(bz - cfg.RUNWAY.z) < 60 && Math.abs(bx - cfg.RUNWAY.x) < cfg.RUNWAY.length / 2 + 30) continue;
      var w = 10 + rand() * 16, d = 10 + rand() * 16, h = 6 + rand() * rand() * 26;
      var ground = MSR_NOISE.terrainHeight(bx, bz);
      var block = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshLambertMaterial({ color: palette[Math.floor(rand() * palette.length)] })
      );
      block.position.set(bx, ground + h / 2, bz);
      block.rotation.y = (rand() - 0.5) * 0.4;
      group.add(block);
      // Warm lit windows on some blocks.
      if (rand() > 0.5) {
        var win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, h * 0.55, 0.4), new THREE.MeshBasicMaterial({ color: 0xffd97a }));
        win.position.set(bx, ground + h / 2, bz + d / 2 + 0.2);
        win.rotation.y = block.rotation.y;
        group.add(win);
      }
    }
    terrainGroup.add(group);
  }

  function buildVolcanoGlow() {
    var v = MSR_CONFIG.VOLCANO;
    var craterY = MSR_NOISE.terrainHeight(v.x, v.z);
    // Lava pool glowing in the crater.
    var lava = new THREE.Mesh(
      new THREE.CircleGeometry(v.craterRadius * 0.62, 24),
      new THREE.MeshBasicMaterial({ color: MSR_CONFIG.PALETTE.lava })
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(v.x, craterY + 2, v.z);
    lava.name = 'lava';
    terrainGroup.add(lava);
    var glow = new THREE.PointLight(0xff5a1a, 1.4, 900);
    glow.position.set(v.x, craterY + 60, v.z);
    glow.name = 'volcanoGlow';
    terrainGroup.add(glow);
    // A lazy smoke column above the crater.
    for (var i = 0; i < 5; i++) {
      var puff = new THREE.Mesh(
        new THREE.SphereGeometry(26 + i * 9, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xf2ede2, transparent: true, opacity: 0.55 })
      );
      puff.position.set(v.x + (i - 2) * 14, craterY + 90 + i * 42, v.z - i * 8);
      puff.name = 'smoke' + i;
      terrainGroup.add(puff);
      clouds.push(puff);
    }
  }

  function buildClouds() {
    var rand = (function (s) { return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; })(777);
    for (var i = 0; i < 16; i++) {
      var g = new THREE.Group();
      var puffs = 3 + Math.floor(rand() * 3);
      for (var k = 0; k < puffs; k++) {
        var p = new THREE.Mesh(
          new THREE.SphereGeometry(22 + rand() * 26, 10, 10),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 })
        );
        p.position.set((rand() - 0.5) * 90, (rand() - 0.5) * 12, (rand() - 0.5) * 40);
        g.add(p);
      }
      g.position.set((rand() - 0.5) * 5200, 520 + rand() * 260, (rand() - 0.5) * 5200);
      g.userData.drift = 2 + rand() * 3;
      terrainGroup.add(g);
      clouds.push(g);
    }
  }

  function buildBeaconBuoy() {
    var b = MSR_CONFIG.BEACON;
    var buoy = new THREE.Group();
    buoy.name = 'beacon';
    var base = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 5, 10), new THREE.MeshLambertMaterial({ color: 0xd94a2e }));
    base.position.y = 2;
    buoy.add(base);
    var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 16, 6), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    mast.position.y = 12;
    buoy.add(mast);
    var lamp = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffd23d }));
    lamp.position.y = 21;
    lamp.name = 'beaconLamp';
    buoy.add(lamp);
    buoy.position.set(b.x, 0, b.z);
    terrainGroup.add(buoy);
  }

  function update(dt, t) {
    // PAPI lamps pulse gently; clouds drift; smoke rises and loops.
    for (var i = 0; i < papiLights.length; i++) {
      var s = 1 + Math.sin(t * 3 + i) * 0.18;
      papiLights[i].scale.set(s, s, s);
    }
    for (var j = 0; j < clouds.length; j++) {
      var c = clouds[j];
      if (c.userData.drift) {
        c.position.x += c.userData.drift * dt;
        if (c.position.x > 2800) c.position.x = -2800;
      } else {
        c.position.y += Math.sin(t * 0.4 + j) * dt * 1.5;
      }
    }
  }

  return { build: build, update: update };
})();
