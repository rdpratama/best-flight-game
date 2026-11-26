// Merapi Sky Run — boot, game loop, cameras, missions, scoring, end states.

(function () {
  var canvas, renderer, scene, camera;
  var gameState = 'title'; // title | flying | paused | ended
  var mission = null;
  var missionId = 'rally';
  var score = 0, timeSec = 0;
  var cameraMode = 'chase';
  var prevPos = new THREE.Vector3();
  var prevOnGround = true;
  var prevVs = 0;
  var touchdownVs = 0;
  var clock = { last: 0 };
  var simTime = 0;
  var shotMode = 0;
  var frozen = false;
  var guideLine = null;
  var guideGeo = null;
  var chasePos = new THREE.Vector3();
  var chaseInit = false;
  var titleAngle = 0;

  function boot() {
    canvas = document.getElementById('scene');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    scene = new THREE.Scene();
    scene.background = makeSkyTexture();
    scene.fog = new THREE.Fog(0xcfe0ea, 1400, 8000);
    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);
    camera.position.set(0, 600, 2600);

    var hemi = new THREE.HemisphereLight(0xbfd9ff, 0x6a7a5a, 0.95);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xfff2d8, 1.15);
    sun.position.set(900, 1400, 500);
    scene.add(sun);

    MSR_TERRAIN.build(scene);
    var plane = MSR_AIRCRAFT.buildPlane();
    scene.add(plane);
    addDashboard(plane);
    MSR_RINGS.build(scene, MSR_CONFIG.MISSIONS.rally.rings);
    MSR_HUD.init();
    MSR_INPUT.init(canvas);
    buildGuideLine();
    wireScreens();

    window.addEventListener('resize', onResize);
    shotMode = MSR_SHOTS.getShot();
    if (shotMode > 0) {
      // Deterministic screenshot pose: skip the title, freeze the sim.
      document.getElementById('title-screen').classList.add('hidden');
      cameraMode = MSR_SHOTS.applyShot(shotMode, api);
      gameState = 'flying';
      frozen = true;
      MSR_HUD.showHud(true);
    } else {
      MSR_AIRCRAFT.reset(MSR_CONFIG.MISSIONS.rally);
      MSR_HUD.setObjective('Pick a mission — 1, 2 or 3 — then fly.');
    }
    clock.last = performance.now();
    requestAnimationFrame(loop);
  }

  function makeSkyTexture() {
    var c = document.createElement('canvas');
    c.width = 4; c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#2f6fb4');
    grad.addColorStop(0.45, '#7fb6dd');
    grad.addColorStop(0.72, '#cfe8f5');
    grad.addColorStop(1, '#e8f2f8');
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 512);
    var tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function addDashboard(plane) {
    // A dark glareshield + panel, seen from the cockpit camera.
    var panel = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 1.1, 0.35),
      new THREE.MeshPhongMaterial({ color: 0x1a2028, shininess: 10 })
    );
    panel.position.set(0, 0.15, -2.7);
    panel.rotation.x = -0.25;
    panel.name = 'dashboard';
    plane.add(panel);
    var shield = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 0.35, 1.4),
      new THREE.MeshPhongMaterial({ color: 0x14181d, shininess: 5 })
    );
    shield.position.set(0, 0.75, -2.2);
    shield.rotation.x = 0.15;
    shield.name = 'glareshield';
    plane.add(shield);
  }

  function buildGuideLine() {
    guideGeo = new THREE.BufferGeometry();
    guideGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    guideLine = new THREE.Line(guideGeo, new THREE.LineBasicMaterial({
      color: 0xffc93d, transparent: true, opacity: 0.55
    }));
    guideLine.frustumCulled = false;
    scene.add(guideLine);
  }

  function wireScreens() {
    var buttons = document.querySelectorAll('.mission-btn');
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        MSR_AUDIO.resume();
        MSR_AUDIO.click();
        startMission(b.getAttribute('data-mission'));
      });
    });
    document.getElementById('again-btn').addEventListener('click', function () {
      MSR_AUDIO.click();
      startMission(missionId);
    });
    document.getElementById('menu-btn').addEventListener('click', function () {
      MSR_AUDIO.click();
      toTitle();
    });
  }

  function toTitle() {
    gameState = 'title';
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
    MSR_HUD.showHud(false);
    MSR_AIRCRAFT.reset(MSR_CONFIG.MISSIONS.rally);
    MSR_RINGS.build(scene, MSR_CONFIG.MISSIONS.rally.rings);
    guideLine.visible = false;
  }

  function startMission(id, silent) {
    missionId = id;
    mission = MSR_CONFIG.MISSIONS[id];
    MSR_AIRCRAFT.reset(mission);
    MSR_RINGS.build(scene, mission.rings);
    MSR_RINGS.showBeacon(id === 'landing');
    score = 0; timeSec = 0;
    prevOnGround = true;
    gameState = 'flying';
    cameraMode = 'chase';
    chaseInit = false;
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('pause-screen').classList.add('hidden');
    MSR_HUD.showHud(true);
    MSR_HUD.setObjective(mission.brief);
    if (!silent) MSR_HUD.showMessage(mission.name, 2.5);
    guideLine.visible = true;
    MSR_AUDIO.resume();
  }

  function landingQuality(vs, heading, lateral) {
    var vsScore = Math.abs(vs) <= 2 ? 600 : Math.abs(vs) <= 4 ? 400 : Math.abs(vs) <= 8 ? 200 : 50;
    var hdgDiff = Math.min(Math.abs(heading - 90), Math.abs(heading - 270));
    var hdgScore = hdgDiff <= 5 ? 450 : hdgDiff <= 12 ? 300 : hdgDiff <= 25 ? 150 : 50;
    var latScore = lateral <= 6 ? 450 : lateral <= 12 ? 300 : 100;
    return vsScore + hdgScore + latScore;
  }

  function missionComplete() {
    if (missionId === 'landing') return MSR_RINGS.isBeaconDone();
    return MSR_RINGS.allRingsDone();
  }

  function endMission(won, title, detail) {
    gameState = 'ended';
    var timeBonus = 0;
    if (won) {
      timeBonus = Math.max(0, Math.round((mission.parTime - timeSec) * MSR_CONFIG.FLIGHT.scorePerSecondBonus));
      score += timeBonus;
      MSR_AUDIO.winFanfare();
    }
    document.getElementById('end-title').textContent = title;
    document.getElementById('end-detail').textContent = detail
      + '\nTime ' + fmtClock(timeSec) + (won ? '  ·  Time bonus +' + timeBonus : '');
    document.getElementById('end-score').textContent = 'SCORE  ' + score;
    document.getElementById('end-screen').classList.remove('hidden');
    guideLine.visible = false;
  }

  function fmtClock(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - clock.last) / 1000);
    clock.last = now;
    if (frozen) dt = 0;
    var t = frozen ? 2.0 : simTime;
    simTime += dt;

    if (gameState === 'title') {
      titleAngle += dt * 0.03;
      camera.position.set(Math.sin(titleAngle) * 2600, 620, Math.cos(titleAngle) * 2600);
      camera.lookAt(-150, 120, -650);
      MSR_TERRAIN.update(dt, t);
      renderer.render(scene, camera);
      handleTitleKeys();
      return;
    }

    if (gameState === 'paused') {
      if (MSR_INPUT.wasPressed('KeyP') || MSR_INPUT.wasPressed('Escape')) {
        gameState = 'flying';
        document.getElementById('pause-screen').classList.add('hidden');
      }
      renderer.render(scene, camera);
      return;
    }

    if (gameState === 'ended') {
      if (MSR_INPUT.wasPressed('KeyR')) startMission(missionId);
      if (MSR_INPUT.wasPressed('KeyM')) toTitle();
      MSR_TERRAIN.update(dt, t);
      renderer.render(scene, camera);
      return;
    }

    // --- flying ---
    var input = MSR_INPUT.poll();
    var F = MSR_AIRCRAFT.getState();
    prevPos.copy(F.pos);
    prevVs = F.verticalSpeed;
    prevOnGround = F.onGround;

    if (MSR_INPUT.wasPressed('KeyP') || MSR_INPUT.wasPressed('Escape')) {
      gameState = 'paused';
      document.getElementById('pause-screen').classList.remove('hidden');
      renderer.render(scene, camera);
      return;
    }
    if (MSR_INPUT.wasPressed('KeyC')) cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
    if (MSR_INPUT.wasPressed('KeyM')) MSR_AUDIO.setMuted(!MSR_AUDIO.isMuted());
    if (MSR_INPUT.wasPressed('Digit1')) startMission('rally');
    if (MSR_INPUT.wasPressed('Digit2')) startMission('volcano');
    if (MSR_INPUT.wasPressed('Digit3')) startMission('landing');

    if (!frozen) {
      MSR_AIRCRAFT.step(dt, input);
      timeSec += dt;
      // Ring / beacon passes.
      var pass = MSR_RINGS.checkPass(F.pos, prevPos);
      if (pass && pass.type === 'ring') {
        score += MSR_CONFIG.FLIGHT.scorePerRing;
        MSR_AUDIO.ringChime();
        MSR_HUD.showMessage('RING ' + (pass.index + 1) + '  +250', 2);
        if (MSR_RINGS.allRingsDone()) {
          MSR_HUD.setObjective('All rings flown — land on runway 09 to finish!');
        } else {
          MSR_HUD.setObjective('Ring ' + (MSR_RINGS.getPassed() + 1) + ' of ' + MSR_RINGS.getTotal() + ' — follow the green ring');
        }
      }
      if (pass && pass.type === 'beacon') {
        score += 500;
        MSR_AUDIO.beaconChime();
        MSR_HUD.showMessage('BEACON ROUNDED  +500', 2.5);
        MSR_HUD.setObjective('Beacon rounded — land back on runway 09!');
      }
      // Touchdown detection (airborne -> on ground, on the strip).
      if (!prevOnGround && F.onGround && MSR_AIRCRAFT.onRunway()) {
        touchdownVs = prevVs;
        MSR_AUDIO.touchdown();
        if (missionComplete()) {
          var q = landingQuality(touchdownVs, F.heading, Math.abs(F.pos.z - MSR_CONFIG.RUNWAY.z));
          score += q;
          var verdict = q >= 1200 ? 'a greaser — textbook!' : q >= 800 ? 'a firm but safe arrival.' : 'down in one piece — rough, but it counts.';
          endMission(true, 'LANDED', mission.name + ' complete: ' + verdict
            + '\nLanding quality +' + q + '  ·  Rings ' + MSR_RINGS.getPassed() + '/' + MSR_RINGS.getTotal());
          renderer.render(scene, camera);
          return;
        } else {
          MSR_HUD.showMessage('TOUCHDOWN — take off again!', 2.5);
          MSR_HUD.setObjective(missionComplete() ? 'Land on runway 09 to finish!' : mission.brief);
        }
      }
      if (F.crashed) {
        MSR_AUDIO.crashSound();
        endMission(false, 'CRASHED', (F.crashReason || 'The Kestrel is down.')
          + '\nRings ' + MSR_RINGS.getPassed() + '/' + MSR_RINGS.getTotal() + '  ·  Damage 100%');
        renderer.render(scene, camera);
        return;
      }
      if (F.fuel <= 0 && F.onGround && F.speed < 4 && !MSR_AIRCRAFT.onRunway()) {
        endMission(false, 'OUT OF FUEL', 'The tank ran dry away from the runway.'
          + '\nRings ' + MSR_RINGS.getPassed() + '/' + MSR_RINGS.getTotal());
        renderer.render(scene, camera);
        return;
      }
      if (F.landed && !missionComplete()) {
        MSR_HUD.showMessage('Parked on the runway — press R to fly again', 3);
      }
      MSR_AUDIO.update(F.throttle, F.speed, F.onGround);
    }

    updateCamera(dt, F);
    updateGuide(F);
    MSR_TERRAIN.update(dt, t);
    MSR_RINGS.update(dt, t);
    if (frozen) MSR_AIRCRAFT.poseMesh(0);
    MSR_HUD.update(dt, F, mission, MSR_RINGS.getPassed(), MSR_RINGS.getTotal(), timeSec, score, cameraMode);
    renderer.render(scene, camera);
  }

  function handleTitleKeys() {
    if (MSR_INPUT.wasPressed('Digit1')) startMission('rally');
    if (MSR_INPUT.wasPressed('Digit2')) startMission('volcano');
    if (MSR_INPUT.wasPressed('Digit3')) startMission('landing');
    if (MSR_INPUT.wasPressed('Enter')) startMission(missionId);
  }

  function updateCamera(dt, F) {
    var hRad = F.heading * Math.PI / 180;
    var fwd = new THREE.Vector3(Math.sin(hRad), 0, -Math.cos(hRad));
    var plane = MSR_AIRCRAFT.getMesh();
    if (plane) {
      var propeller = plane.getObjectByName('propeller');
      if (propeller) propeller.visible = cameraMode !== 'cockpit';
    }
    if (cameraMode === 'cockpit') {
      var eye = F.pos.clone().addScaledVector(fwd, 1.6);
      eye.y += 1.5;
      camera.position.copy(eye);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = -hRad;
      camera.rotation.x = -F.pitch * 0.5 - 0.10;
      camera.rotation.z = -F.roll * 0.55;
    } else {
      var desired = F.pos.clone().addScaledVector(fwd, -24);
      desired.y += 8;
      if (!chaseInit) { chasePos.copy(desired); chaseInit = true; }
      chasePos.lerp(desired, Math.min(1, dt * 5 + 0.12));
      camera.position.copy(chasePos);
      var look = F.pos.clone().addScaledVector(fwd, 46);
      look.y += 1;
      camera.lookAt(look);
      camera.rotation.z += -F.roll * 0.12;
    }
  }

  function updateGuide(F) {
    if (!guideLine.visible) return;
    var target = null;
    var next = MSR_RINGS.getNextRing();
    if (next) target = new THREE.Vector3(next.x, next.y, next.z);
    else if (missionId === 'landing' && !MSR_RINGS.isBeaconDone()) {
      var b = MSR_CONFIG.BEACON;
      target = new THREE.Vector3(b.x, b.y, b.z);
    } else {
      target = new THREE.Vector3(MSR_CONFIG.RUNWAY.x, MSR_CONFIG.RUNWAY.elevation + 6, MSR_CONFIG.RUNWAY.z);
    }
    var p = guideGeo.attributes.position.array;
    p[0] = F.pos.x; p[1] = F.pos.y - 1; p[2] = F.pos.z;
    p[3] = target.x; p[4] = target.y; p[5] = target.z;
    guideGeo.attributes.position.needsUpdate = true;
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // API used by the deterministic screenshot poses.
  var api = {
    startMission: startMission,
    setRingsPassed: function (n) { MSR_RINGS.setPassed(n); },
    setScore: function (n) { score = n; },
    setTime: function (n) { timeSec = n; },
    setBeaconDone: function (done) { MSR_RINGS.setBeaconDone(done); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
