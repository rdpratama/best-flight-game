// Merapi Sky Run — the aircraft: a bush plane built from primitives, plus the
// arcade flight model (throttle / pitch / roll / yaw, lift, stall, ground handling).

var MSR_AIRCRAFT = (function () {
  // Flight state, in world metres. Heading 0 = north (-z), 90 = east (+x).
  var state = {
    pos: new THREE.Vector3(0, 11, 1380),
    heading: 90, pitch: 0, roll: 0,
    speed: 0, throttle: 0, fuel: 100, damage: 0,
    gearDown: true, flapsDown: false, airbrake: false,
    verticalSpeed: 0, onGround: true, crashed: false, landed: false
  };
  var mesh = null;
  var prop = null;

  function buildPlane() {
    var pal = MSR_CONFIG.PALETTE;
    var g = new THREE.Group();
    g.name = 'kestrel';
    var bodyMat = new THREE.MeshPhongMaterial({ color: pal.planeBody, shininess: 60 });
    var wingMat = new THREE.MeshPhongMaterial({ color: pal.planeWing, shininess: 40 });
    var darkMat = new THREE.MeshPhongMaterial({ color: 0x2c2c30, shininess: 30 });
    var glassMat = new THREE.MeshPhongMaterial({ color: 0x9fd8ef, shininess: 140, specular: 0xffffff });

    // Fuselage: nose cone + body + tail cone.
    var body = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.75, 6.4, 12), bodyMat);
    body.rotation.x = Math.PI / 2;
    g.add(body);
    var nose = new THREE.Mesh(new THREE.ConeGeometry(1.02, 1.6, 12), bodyMat);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -4.0;
    g.add(nose);
    var tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 2.2, 12), bodyMat);
    tailCone.rotation.x = Math.PI / 2;
    tailCone.position.z = 4.2;
    g.add(tailCone);
    // Cockpit glass.
    var glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), glassMat);
    glass.scale.set(1, 0.62, 1.7);
    glass.position.set(0, 0.62, -1.4);
    g.add(glass);
    // Main wing (high wing, bush plane) + struts.
    var wing = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.22, 1.9), wingMat);
    wing.position.set(0, 0.95, -0.4);
    g.add(wing);
    [-1, 1].forEach(function (s) {
      var strut = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 6), darkMat);
      strut.position.set(s * 2.2, 0.35, -0.4);
      strut.rotation.z = s * 0.5;
      g.add(strut);
      var tip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.9), bodyMat);
      tip.position.set(s * 5.7, 0.95, -0.4);
      g.add(tip);
    });
    // Tail: horizontal stabiliser + fin, orange with white stripe.
    var stab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.2), wingMat);
    stab.position.set(0, 0.35, 4.9);
    g.add(stab);
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.1, 1.5), bodyMat);
    fin.position.set(0, 1.15, 5.0);
    g.add(fin);
    // Propeller: spinner + two blades + translucent disc.
    var spinner = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.0, 10), darkMat);
    spinner.rotation.x = -Math.PI / 2;
    spinner.position.z = -5.0;
    g.add(spinner);
    prop = new THREE.Group();
    prop.name = 'propeller';
    var bladeMat = new THREE.MeshPhongMaterial({ color: 0x1c1c20, shininess: 20 });
    [-1, 1].forEach(function (s) {
      var blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.1), bladeMat);
      blade.position.y = s * 1.0;
      prop.add(blade);
    });
    var disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.1, 24),
      new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    prop.add(disc);
    prop.position.z = -5.05;
    g.add(prop);
    // Fixed landing gear: three wheels.
    [[-1.1, -1.2], [1.1, -1.2], [0, 3.6]].forEach(function (p) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), darkMat);
      leg.position.set(p[0], -1.0, p[1]);
      g.add(leg);
      var wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 12), darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(p[0], -1.55, p[1]);
      g.add(wheel);
    });
    // Navigation lights: red left, green right, white tail.
    var nav = [[-5.7, 0xff2a2a], [5.7, 0x2aff5a], [0, 0xffffff]];
    nav.forEach(function (n) {
      var l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: n[1] }));
      l.position.set(n[0], 0.95, n[0] === 0 ? 5.9 : -0.4);
      g.add(l);
    });
    mesh = g;
    return g;
  }

  function reset(mission) {
    var s = mission.start;
    state.pos.set(s.x, s.y, s.z);
    state.heading = s.heading;
    state.pitch = 0; state.roll = 0;
    state.speed = s.speed || 0;
    state.throttle = 0; state.fuel = 100; state.damage = 0;
    state.gearDown = true; state.flapsDown = false; state.airbrake = false;
    state.verticalSpeed = 0; state.onGround = true;
    state.crashed = false; state.landed = false;
  }

  function onRunway() {
    var rw = MSR_CONFIG.RUNWAY;
    var dx = Math.abs(state.pos.x - rw.x);
    var dz = Math.abs(state.pos.z - rw.z);
    return dx < rw.length / 2 && dz < rw.width / 2 + 4;
  }

  function step(dt, input) {
    var F = MSR_CONFIG.FLIGHT;
    if (state.crashed || state.landed) return;

    // Throttle.
    if (input.throttleUp) state.throttle = Math.min(1, state.throttle + dt * 0.7);
    if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt * 0.7);
    state.airbrake = !!input.airbrake;
    if (input.gearToggle) { state.gearDown = !state.gearDown; }
    if (input.flapsToggle) { state.flapsDown = !state.flapsDown; }

    // Fuel burn; empty tank means the engine quits.
    var burn = F.fuelBurnIdle + (F.fuelBurn - F.fuelBurnIdle) * state.throttle;
    state.fuel = Math.max(0, state.fuel - burn * dt);
    var thrust = state.fuel > 0 ? state.throttle : 0;

    // Attitude: pitch and roll chase the stick, yaw turns the nose.
    var pitchTarget = input.pitch * F.pitchRate * 0.9;
    var rollTarget = input.roll * 1.1;
    state.pitch += (pitchTarget - state.pitch) * Math.min(1, dt * 3.2);
    state.roll += (rollTarget - state.roll) * Math.min(1, dt * 3.6);
    // Banked flight turns the heading; rudder adds a little.
    var turnRate = -state.roll * F.turnCoord + input.yaw * F.yawRate * 0.5;
    state.heading = (state.heading + turnRate * 57.2958 * dt + 360) % 360;

    // Speed: thrust minus drag and the cost of climbing (climb = sin(pitch);
    // nose-up is negative pitch, so climbing costs speed through +climb*g).
    var climb = Math.sin(state.pitch);
    var accel = thrust * F.accel * 2.2 - F.drag * state.speed * state.speed * 0.055
      + climb * F.gravity * F.climbFactor;
    if (state.airbrake) accel -= 14;
    if (state.onGround) accel -= 2.5; // rolling resistance
    state.speed = Math.max(0, state.speed + accel * dt);

    // Lift: enough speed and the wing flies; below stall speed it sinks.
    var liftFactor = Math.min(1, state.speed / F.minFlySpeed);
    var vsTarget = -climb * state.speed * liftFactor;
    if (state.speed < F.minFlySpeed && !state.onGround) vsTarget = -14;
    if (state.onGround && state.speed > F.minFlySpeed * 1.05 && state.pitch < -0.06) {
      state.onGround = false; // rotation (nose-up is negative pitch)
    }
    if (state.onGround) vsTarget = 0;
    state.verticalSpeed += (vsTarget - state.verticalSpeed) * Math.min(1, dt * 2.4);

    // Move along the nose.
    var hRad = state.heading * Math.PI / 180;
    var forward = new THREE.Vector3(Math.sin(hRad), 0, -Math.cos(hRad));
    state.pos.addScaledVector(forward, state.speed * Math.cos(state.pitch) * dt);
    state.pos.y += state.verticalSpeed * dt;

    // Ground and water.
    var ground = MSR_NOISE.terrainHeight(state.pos.x, state.pos.z);
    var gearHeight = state.gearDown ? 1.6 : 0.6;
    if (state.pos.y <= ground + gearHeight) {
      if (onRunway() && ground > 0) {
        // On the strip: a gentle touchdown lands, a hard one breaks the gear.
        if (state.verticalSpeed < -F.crashSpeed * 0.45) {
          state.damage += F.damagePerHit;
          if (state.damage >= 100) { crash('Gear collapsed on a hard touchdown.'); return; }
        }
        state.pos.y = ground + gearHeight;
        state.verticalSpeed = 0;
        state.onGround = true;
        state.pitch = 0;
        if (state.speed < 4 && state.throttle < 0.1) state.landed = true;
      } else if (ground <= 0.5 && state.pos.y <= 0.6) {
        crash('Ditched in the sea.');
        return;
      } else {
        // Rough terrain strike.
        if (state.verticalSpeed < -6 || state.speed > 30) {
          state.damage += F.damagePerHit;
          if (state.damage >= 100) { crash('Struck the hillside.'); return; }
          state.pos.y = ground + gearHeight;
          state.verticalSpeed = 0;
          state.speed *= 0.4;
          state.onGround = true;
        } else {
          state.pos.y = ground + gearHeight;
          state.verticalSpeed = 0;
          state.onGround = true;
        }
      }
    }
    if (state.pos.y > 1500) state.pos.y = 1500; // service ceiling
    if (state.pos.y < 0.4 && ground <= 0) { crash('Ditched in the sea.'); return; }
    if (state.damage >= 100) { crash('Airframe failure.'); return; }

    // Pose the mesh from the state (also used to freeze a screenshot pose).
    poseMesh(dt);
  }

  function poseMesh(dt) {
    if (!mesh) return;
    var hRad = state.heading * Math.PI / 180;
    mesh.position.copy(state.pos);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = -hRad;
    mesh.rotation.x = -state.pitch;
    mesh.rotation.z = -state.roll;
    if (prop && dt) prop.rotation.z += dt * (4 + state.throttle * 60);
    if (prop && !dt) prop.rotation.z = Math.PI / 4; // frozen pose: blades as an X, not a bar
  }

  function crash(reason) {
    state.crashed = true;
    state.crashReason = reason;
    state.speed = 0;
    state.verticalSpeed = 0;
    if (mesh) mesh.rotation.z = 0.7; // tipped over
  }

  function getState() { return state; }
  function getMesh() { return mesh; }

  return { buildPlane: buildPlane, reset: reset, step: step, poseMesh: poseMesh, getState: getState, getMesh: getMesh, onRunway: onRunway };
})();
