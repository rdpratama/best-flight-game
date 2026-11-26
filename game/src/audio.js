// Merapi Sky Run — synthesized sound: engine drone, wind, chimes, thuds.
// WebAudio only, no audio files. Starts on the first user gesture.

var MSR_AUDIO = (function () {
  var ctx = null;
  var engineOsc = null, engineOsc2 = null, engineGain = null, engineFilter = null;
  var windSrc = null, windGain = null, windFilter = null;
  var muted = false;
  var started = false;

  function ensure() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { ctx = null; }
    if (!ctx) return;
    // Engine: two detuned saws through a low-pass, pitch follows RPM.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'square';
    engineOsc2.frequency.value = 28;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(ctx.destination);
    engineOsc.start(); engineOsc2.start();
    // Wind: looped noise buffer through a band-pass, loudness follows airspeed.
    var len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf; windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 700;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);
    windSrc.start();
    started = true;
  }

  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  // Called every frame with the flight state; shapes engine + wind.
  function update(throttle, speed, onGround) {
    if (!ctx || muted) return;
    var now = ctx.currentTime;
    var rpm = 0.25 + throttle * 0.75;
    var target = onGround ? 0.02 + throttle * 0.05 : 0.05 + throttle * 0.075;
    engineGain.gain.setTargetAtTime(target, now, 0.1);
    engineOsc.frequency.setTargetAtTime(48 + rpm * 95, now, 0.1);
    engineOsc2.frequency.setTargetAtTime(24 + rpm * 48, now, 0.1);
    engineFilter.frequency.setTargetAtTime(320 + rpm * 900, now, 0.1);
    var wind = Math.min(1, speed / 90) * 0.11;
    windGain.gain.setTargetAtTime(onGround ? wind * 0.3 : wind, now, 0.15);
    windFilter.frequency.setTargetAtTime(420 + speed * 9, now, 0.15);
  }

  function blip(freq, dur, type, vol, when) {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol || 0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function ringChime() { blip(880, 0.5, 'sine', 0.2); blip(1318, 0.6, 'sine', 0.14, 0.08); }
  function beaconChime() { blip(659, 0.4, 'triangle', 0.18); blip(988, 0.5, 'triangle', 0.14, 0.1); }
  function click() { blip(1200, 0.07, 'square', 0.06); }
  function touchdown() { blip(90, 0.25, 'sine', 0.3); blip(55, 0.3, 'sine', 0.22, 0.05); }
  function crashSound() {
    if (!ctx || muted) return;
    var t0 = ctx.currentTime;
    var noise = ctx.createBufferSource();
    var len = ctx.sampleRate * 0.7;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    noise.buffer = buf;
    var f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.5, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.7);
    noise.connect(f); f.connect(g); g.connect(ctx.destination);
    noise.start(t0);
    blip(60, 0.8, 'sawtooth', 0.2);
  }
  function winFanfare() {
    [523, 659, 784, 1047].forEach(function (f, i) { blip(f, 0.5, 'triangle', 0.16, i * 0.12); });
  }

  function setMuted(m) {
    muted = m;
    if (ctx && engineGain) engineGain.gain.setTargetAtTime(m ? 0 : 0.05, ctx.currentTime, 0.05);
    if (ctx && windGain) windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
  }
  function isMuted() { return muted; }
  function isStarted() { return started; }

  return {
    resume: resume, update: update, ringChime: ringChime, beaconChime: beaconChime,
    click: click, touchdown: touchdown, crashSound: crashSound, winFanfare: winFanfare,
    setMuted: setMuted, isMuted: isMuted, isStarted: isStarted
  };
})();
