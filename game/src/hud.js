// Merapi Sky Run — HUD: DOM readouts, compass tape, attitude ball, cockpit gauges.

var MSR_HUD = (function () {
  var el = {};
  var attitudeCtx = null;
  var gaugesCtx = null;
  var messageTimer = 0;
  var lastMessage = '';

  function init() {
    var ids = ['v-speed', 'v-alt', 'v-hdg', 'v-vsi', 'v-fuel', 'v-damage', 'v-gear', 'v-flaps',
      'v-rings', 'v-time', 'v-score', 'bar-throttle', 'bar-fuel', 'bar-damage',
      'mission-name', 'message', 'objective', 'compass-tape', 'hud', 'cockpit'];
    ids.forEach(function (id) { el[id] = document.getElementById(id); });
    attitudeCtx = document.getElementById('attitude').getContext('2d');
    gaugesCtx = document.getElementById('gauges').getContext('2d');
    buildCompassTape();
  }

  function buildCompassTape() {
    var html = '';
    for (var deg = 0; deg < 360; deg += 5) {
      var label = deg % 30 === 0 ? (deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : String(deg / 10)) : '|';
      html += '<span style="display:inline-block;width:24px;text-align:center">' + label + '</span>';
    }
    el['compass-tape'].innerHTML = html + html + html; // tripled for wrap-around scrolling
  }

  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function showMessage(text, seconds) {
    el.message.textContent = text;
    lastMessage = text;
    messageTimer = seconds || 2.5;
  }

  function update(dt, flight, mission, ringsPassed, ringsTotal, timeSec, score, cameraMode) {
    // Readouts: knots and feet, the way a pilot reads them.
    var kts = Math.round(flight.speed * 1.944);
    var ft = Math.round(flight.pos.y * 3.281);
    el['v-speed'].textContent = kts;
    el['v-alt'].textContent = ft;
    var hdg = Math.round(((flight.heading % 360) + 360) % 360);
    el['v-hdg'].innerHTML = ('00' + hdg).slice(-3) + '&deg;';
    el['v-vsi'].textContent = (flight.verticalSpeed >= 0 ? '+' : '') + Math.round(flight.verticalSpeed * 196.85);
    el['bar-throttle'].style.width = Math.round(flight.throttle * 100) + '%';
    el['bar-fuel'].style.width = Math.round(flight.fuel) + '%';
    el['bar-fuel'].style.background = flight.fuel < 25 ? '#ff5a4e' : '#4ecb71';
    el['v-fuel'].textContent = Math.round(flight.fuel) + '%';
    el['bar-damage'].style.width = Math.round(flight.damage) + '%';
    el['v-damage'].textContent = Math.round(flight.damage) + '%';
    el['v-gear'].textContent = flight.gearDown ? 'DOWN' : 'UP';
    el['v-flaps'].textContent = flight.flapsDown ? 'DOWN' : 'UP';
    el['v-rings'].textContent = ringsPassed + ' / ' + ringsTotal;
    el['v-time'].textContent = fmtTime(timeSec);
    el['v-score'].textContent = score;
    el['mission-name'].textContent = mission.name;
    // Compass tape scrolls with heading (24px per 5 degrees, middle copy).
    var px = -1570 - hdg * 4.8;
    el['compass-tape'].style.transform = 'translateX(' + px + 'px)';
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0) el.message.textContent = '';
    }
    drawAttitude(flight);
    if (cameraMode === 'cockpit') {
      el.cockpit.classList.remove('hidden');
      el.objective.style.bottom = '170px';
      drawGauges(flight, kts, ft, hdg);
    } else {
      el.cockpit.classList.add('hidden');
      el.objective.style.bottom = '16px';
    }
  }

  function drawAttitude(flight) {
    var ctx = attitudeCtx;
    if (!ctx) return;
    var W = 150, H = 150, cx = W / 2, cy = H / 2, R = 70;
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    // Sky / ground split, rotated by roll, shifted by pitch.
    ctx.translate(cx, cy);
    ctx.rotate(-flight.roll);
    var pitchPx = flight.pitch * 90;
    ctx.translate(0, pitchPx);
    ctx.fillStyle = '#3f8fd2';
    ctx.fillRect(-R, -R - 90, R * 2, R + 90);
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(-R, 0, R * 2, R + 90);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.stroke();
    ctx.restore();
    // Fixed aircraft symbol.
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 34, cy); ctx.lineTo(cx - 10, cy);
    ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 34, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  }

  function drawGauges(flight, kts, ft, hdg) {
    var ctx = gaugesCtx;
    if (!ctx) return;
    var W = 560, H = 150;
    ctx.clearRect(0, 0, W, H);
    // Panel body.
    ctx.fillStyle = 'rgba(12, 22, 34, 0.92)';
    roundRect(ctx, 0, 0, W, H, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140, 210, 255, 0.5)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 1, 1, W - 2, H - 2, 14);
    ctx.stroke();
    gauge(ctx, 78, 75, 58, 'AIRSPEED', kts, 0, 220, 'KT');
    gauge(ctx, 196, 75, 58, 'ALTITUDE', ft, 0, 2000, 'FT');
    gauge(ctx, 314, 75, 58, 'HEADING', hdg, 0, 360, 'DEG');
    gauge(ctx, 432, 75, 58, 'FUEL', Math.round(flight.fuel), 0, 100, '%');
    // Lit warning lamps.
    lamp(ctx, 508, 22, flight.fuel < 25, 'FUEL');
    lamp(ctx, 508, 52, flight.damage > 50, 'DMG');
    lamp(ctx, 508, 82, !flight.gearDown && flight.onGround === false && ft < 500, 'GEAR');
  }

  function gauge(ctx, cx, cy, r, label, value, min, max, unit) {
    ctx.save();
    // Face.
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#0a141f'; ctx.fill();
    ctx.strokeStyle = '#8fd0ff'; ctx.lineWidth = 2; ctx.stroke();
    // Ticks.
    ctx.strokeStyle = 'rgba(200, 230, 255, 0.8)'; ctx.lineWidth = 1.5;
    for (var i = 0; i <= 10; i++) {
      var a = -Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      var x1 = cx + Math.cos(a) * (r - 6), y1 = cy + Math.sin(a) * (r - 6);
      var x2 = cx + Math.cos(a) * (r - 13), y2 = cy + Math.sin(a) * (r - 13);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // Needle.
    var frac = Math.max(0, Math.min(1, (value - min) / (max - min)));
    var na = -Math.PI * 0.75 + frac * Math.PI * 1.5;
    ctx.strokeStyle = '#ffb63d'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * (r - 16), cy + Math.sin(na) * (r - 16));
    ctx.stroke();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
    // Label + digital value.
    ctx.fillStyle = '#8fd0ff'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(label, cx, cy - r + 20);
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 15px monospace';
    ctx.fillText(String(value), cx, cy + 14);
    ctx.fillStyle = '#8fd0ff'; ctx.font = '9px sans-serif';
    ctx.fillText(unit, cx, cy + 28);
    ctx.restore();
  }

  function lamp(ctx, x, y, on, label) {
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = on ? '#ff3b30' : '#22303e'; ctx.fill();
    if (on) { ctx.shadowColor = '#ff3b30'; ctx.shadowBlur = 12; ctx.fill(); }
    ctx.strokeStyle = 'rgba(140, 210, 255, 0.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#8fd0ff'; ctx.font = '8px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(label, x + 11, y + 3);
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function setObjective(text) { el.objective.textContent = text; }
  function showHud(show) { el.hud.classList.toggle('hidden', !show); }

  return { init: init, update: update, showMessage: showMessage, setObjective: setObjective, showHud: showHud };
})();
