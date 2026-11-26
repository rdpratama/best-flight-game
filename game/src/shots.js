// Merapi Sky Run — deterministic screenshot poses (?shot=1..4).
// Each pose sets the flight state, mission and camera, then freezes the sim
// so the render is stable frame after frame.

var MSR_SHOTS = (function () {
  function getShot() {
    var m = /[?&]shot=(\d)/.exec(window.location.search || '');
    return m ? parseInt(m[1], 10) : 0;
  }

  // Poses the game for a screenshot. Returns the camera mode to use.
  function applyShot(n, api) {
    var F = MSR_AIRCRAFT.getState();
    if (n === 1) {
      // Cover: chase view, mid ring-run over the south coast, volcano ahead.
      api.startMission('rally', true);
      F.pos.set(520, 210, 960);
      F.heading = 80; F.pitch = 0.04; F.roll = -0.28;
      F.speed = 66; F.throttle = 0.78; F.fuel = 81; F.onGround = false;
      api.setRingsPassed(1);
      api.setScore(250); api.setTime(42);
      MSR_HUD.setObjective('Ring 2 of 8 — follow the green ring over the town');
      MSR_HUD.showMessage('', 0);
      return 'chase';
    }
    if (n === 2) {
      // Through the ring: plane just short of ring 3, mountains behind.
      api.startMission('rally', true);
      var r = MSR_CONFIG.MISSIONS.rally.rings[2];
      F.pos.set(r.x - 18, r.y, r.z + 24);
      F.heading = 37; F.pitch = 0.02; F.roll = 0.15;
      F.speed = 70; F.throttle = 0.82; F.fuel = 72; F.onGround = false;
      api.setRingsPassed(2);
      api.setScore(500); api.setTime(88);
      MSR_HUD.setObjective('Ring 3 of 8 — through the gate!');
      MSR_HUD.showMessage('RING 2 — +250', 99);
      return 'chase';
    }
    if (n === 3) {
      // Cockpit view on final approach: runway and PAPI lights ahead.
      api.startMission('landing', true);
      F.pos.set(-560, 78, 1380);
      F.heading = 90; F.pitch = -0.05; F.roll = 0;
      F.speed = 54; F.throttle = 0.42; F.fuel = 64; F.onGround = false;
      F.gearDown = true; F.flapsDown = true;
      MSR_RINGS.showBeacon(true);
      api.setBeaconDone(true);
      api.setScore(500); api.setTime(154);
      MSR_HUD.setObjective('Beacon rounded — final approach, runway 09, gear down');
      MSR_HUD.showMessage('', 0);
      return 'cockpit';
    }
    if (n === 4) {
      // Touchdown: rolling out on runway 09, town and volcano behind.
      api.startMission('landing', true);
      F.pos.set(120, 10.6, 1380);
      F.heading = 90; F.pitch = 0; F.roll = 0;
      F.speed = 30; F.throttle = 0.1; F.fuel = 58; F.onGround = true;
      F.gearDown = true; F.flapsDown = true;
      MSR_RINGS.showBeacon(true);
      api.setBeaconDone(true);
      api.setScore(1250); api.setTime(196);
      MSR_HUD.setObjective('Touchdown on runway 09 — roll out and stop');
      MSR_HUD.showMessage('TOUCHDOWN! +750', 99);
      return 'chase';
    }
    return 'chase';
  }

  return { getShot: getShot, applyShot: applyShot };
})();
