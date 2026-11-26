// Merapi Sky Run — the ring course: glowing torus gates, pass detection, beacon.

var MSR_RINGS = (function () {
  var group = null;
  var ringMeshes = [];
  var beaconMesh = null;
  var nextIndex = 0;
  var passedCount = 0;
  var beaconDone = false;
  var activeRings = [];

  function build(scene, rings) {
    if (group) scene.remove(group);
    group = new THREE.Group();
    group.name = 'rings';
    ringMeshes = [];
    activeRings = rings || [];
    nextIndex = 0; passedCount = 0; beaconDone = false;
    activeRings.forEach(function (r, i) {
      var mesh = new THREE.Mesh(
        new THREE.TorusGeometry(r.r, 1.6, 10, 40),
        new THREE.MeshBasicMaterial({ color: i === 0 ? MSR_CONFIG.PALETTE.ringNext : MSR_CONFIG.PALETTE.ring })
      );
      mesh.position.set(r.x, r.y, r.z);
      mesh.userData.index = i;
      // Face the ring toward the previous ring (or the runway for the first).
      var prev = i === 0 ? { x: 0, z: 1380 } : activeRings[i - 1];
      mesh.lookAt(prev.x, r.y, prev.z);
      group.add(mesh);
      // A small floating chevron above the next ring.
      var chev = new THREE.Mesh(
        new THREE.ConeGeometry(4, 9, 4),
        new THREE.MeshBasicMaterial({ color: 0x37e08b })
      );
      chev.position.set(r.x, r.y + r.r + 12, r.z);
      chev.rotation.x = Math.PI;
      chev.userData.isChevron = true;
      chev.userData.ringIndex = i;
      group.add(chev);
      ringMeshes.push(mesh);
    });
    // Beacon ring for the landing mission.
    var b = MSR_CONFIG.BEACON;
    beaconMesh = new THREE.Mesh(
      new THREE.TorusGeometry(b.r, 2.2, 10, 48),
      new THREE.MeshBasicMaterial({ color: 0x37e08b })
    );
    beaconMesh.position.set(b.x, b.y, b.z);
    beaconMesh.lookAt(0, b.y, 1380);
    beaconMesh.visible = false;
    group.add(beaconMesh);
    scene.add(group);
    return group;
  }

  function showBeacon(show) { if (beaconMesh) beaconMesh.visible = show; }

  // Returns 'ring' | 'beacon' | null. A pass counts when the plane crosses the
  // ring plane within the torus radius.
  function checkPass(pos, prevPos) {
    if (nextIndex < activeRings.length) {
      var r = activeRings[nextIndex];
      var c = new THREE.Vector3(r.x, r.y, r.z);
      var toPrev = new THREE.Vector3().subVectors(prevPos, c);
      var toNow = new THREE.Vector3().subVectors(pos, c);
      // Ring normal: from ring centre toward previous ring (its facing).
      var prev = nextIndex === 0 ? { x: 0, z: 1380 } : activeRings[nextIndex - 1];
      var normal = new THREE.Vector3(prev.x - r.x, 0, prev.z - r.z).normalize();
      var dPrev = toPrev.dot(normal), dNow = toNow.dot(normal);
      if ((dPrev > 0 && dNow <= 0) || (dPrev < 0 && dNow >= 0)) {
        // Crossed the plane: how far from the centre?
        var t = dPrev / (dPrev - dNow);
        var cross = new THREE.Vector3().lerpVectors(prevPos, pos, t);
        if (cross.distanceTo(c) < r.r) {
          var passed = nextIndex;
          nextIndex++;
          passedCount++;
          recolor();
          return { type: 'ring', index: passed };
        }
      }
    }
    if (beaconMesh && beaconMesh.visible && !beaconDone) {
      var b = MSR_CONFIG.BEACON;
      var bc = new THREE.Vector3(b.x, b.y, b.z);
      var bp = new THREE.Vector3().subVectors(prevPos, bc);
      var bn = new THREE.Vector3().subVectors(pos, bc);
      var normalB = new THREE.Vector3(0 - b.x, 0, 1380 - b.z).normalize();
      var dp = bp.dot(normalB), dn = bn.dot(normalB);
      if ((dp > 0 && dn <= 0) || (dp < 0 && dn >= 0)) {
        var tb = dp / (dp - dn);
        var crossB = new THREE.Vector3().lerpVectors(prevPos, pos, tb);
        if (crossB.distanceTo(bc) < b.r) {
          beaconDone = true;
          beaconMesh.material.color.setHex(0xffc93d);
          return { type: 'beacon' };
        }
      }
    }
    return null;
  }

  function recolor() {
    ringMeshes.forEach(function (m, i) {
      var mat = m.material;
      if (i < nextIndex) mat.color.setHex(0x8a93a0); // flown
      else if (i === nextIndex) mat.color.setHex(MSR_CONFIG.PALETTE.ringNext); // next
      else mat.color.setHex(MSR_CONFIG.PALETTE.ring); // ahead
    });
    group.children.forEach(function (child) {
      if (child.userData.isChevron) child.visible = child.userData.ringIndex === nextIndex;
    });
  }

  function update(dt, t) {
    ringMeshes.forEach(function (m, i) {
      if (i === nextIndex) {
        var s = 1 + Math.sin(t * 4) * 0.05;
        m.scale.set(s, s, s);
      }
    });
    if (beaconMesh && beaconMesh.visible) beaconMesh.rotation.z += dt * 0.3;
  }

  function getNextRing() { return nextIndex < activeRings.length ? activeRings[nextIndex] : null; }
  function getPassed() { return passedCount; }
  function getTotal() { return activeRings.length; }
  function isBeaconDone() { return beaconDone; }
  function allRingsDone() { return nextIndex >= activeRings.length; }

  // Deterministic pose helpers (used by the screenshot poses only).
  function setPassed(n) {
    nextIndex = Math.min(n, activeRings.length);
    passedCount = nextIndex;
    recolor();
  }
  function setBeaconDone(done) {
    beaconDone = done;
    if (beaconMesh) beaconMesh.material.color.setHex(done ? 0xffc93d : 0x37e08b);
  }

  return {
    build: build, checkPass: checkPass, update: update, showBeacon: showBeacon,
    getNextRing: getNextRing, getPassed: getPassed, getTotal: getTotal,
    isBeaconDone: isBeaconDone, allRingsDone: allRingsDone,
    setPassed: setPassed, setBeaconDone: setBeaconDone
  };
})();
