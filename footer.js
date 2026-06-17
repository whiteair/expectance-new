/* =========================================================
   EXPECTANCE — Three.js footer field
   A vibrant, undulating wave of glowing particles on black,
   with rising motes. Additive blending makes peaks shimmer.
   Monochrome to stay on-brand; energy comes from motion.
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("footerParticles");
  if (!canvas || typeof THREE === "undefined") {
    if (canvas) canvas.style.display = "none";
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 1, 5000);
  camera.position.set(0, 210, 620);
  camera.lookAt(0, -40, 0);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);

  // ---- soft round sprite (white) ----------------------------------------
  function sprite() {
    var c = document.createElement("canvas");
    c.width = c.height = 64;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.65)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 32, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(c);
  }
  var tex = sprite();

  // ---- wave grid ---------------------------------------------------------
  var GX = 78, GY = 36;
  var SPAN_X = 1700, SPAN_Z = 900;
  var COUNT = GX * GY;
  var wavePos = new Float32Array(COUNT * 3);
  var waveCol = new Float32Array(COUNT * 3);
  var baseX = new Float32Array(COUNT);
  var baseZ = new Float32Array(COUNT);
  var offX = new Float32Array(COUNT);   // cursor-spread offsets — spring back to 0
  var offY = new Float32Array(COUNT);
  var offZ = new Float32Array(COUNT);

  for (var gy = 0; gy < GY; gy++) {
    for (var gx = 0; gx < GX; gx++) {
      var idx = gy * GX + gx;
      var x = (gx / (GX - 1) - 0.5) * SPAN_X;
      var z = (gy / (GY - 1) - 0.5) * SPAN_Z;
      baseX[idx] = x; baseZ[idx] = z;
      wavePos[idx * 3] = x; wavePos[idx * 3 + 1] = 0; wavePos[idx * 3 + 2] = z;
      waveCol[idx * 3] = waveCol[idx * 3 + 1] = waveCol[idx * 3 + 2] = 0.6;
    }
  }

  var waveGeo = new THREE.BufferGeometry();
  waveGeo.setAttribute("position", new THREE.BufferAttribute(wavePos, 3).setUsage(THREE.DynamicDrawUsage));
  waveGeo.setAttribute("color", new THREE.BufferAttribute(waveCol, 3).setUsage(THREE.DynamicDrawUsage));
  var waveMat = new THREE.PointsMaterial({
    size: 7, map: tex, vertexColors: true,
    transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  var wave = new THREE.Points(waveGeo, waveMat);
  scene.add(wave);

  // ---- rising motes (free particles) ------------------------------------
  var MOTES = 90;
  var motePos = new Float32Array(MOTES * 3);
  var moteVel = new Float32Array(MOTES);
  function rnd(s) { var v = Math.sin(s * 91.7 + 13.1) * 43758.5; return v - Math.floor(v); }
  for (var m = 0; m < MOTES; m++) {
    motePos[m * 3] = (rnd(m + 2) * 2 - 1) * SPAN_X * 0.55;
    motePos[m * 3 + 1] = (rnd(m + 7) * 2 - 1) * 260;
    motePos[m * 3 + 2] = (rnd(m + 5) * 2 - 1) * SPAN_Z * 0.5;
    moteVel[m] = 0.16 + rnd(m + 9) * 0.34;
  }
  var moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3).setUsage(THREE.DynamicDrawUsage));
  var moteMat = new THREE.PointsMaterial({
    size: 9, map: tex, color: 0xffffff,
    transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  var motes = new THREE.Points(moteGeo, moteMat);
  scene.add(motes);

  // ---- cursor interaction: spread the particles, then spring back --------
  var ndcx = 0, ndcy = 0, active = false;
  function onMove(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    ndcx = (x / rect.width) * 2 - 1;
    ndcy = -((y / rect.height) * 2 - 1);
    active = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
  }
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", function () { active = false; });
  window.addEventListener("blur", function () { active = false; });

  // project the cursor onto the wave plane (y = 0) in world space
  var _v = new THREE.Vector3();
  var cw = { x: 0, z: 0 };
  function cursorWorld() {
    _v.set(ndcx, ndcy, 0.5).unproject(camera).sub(camera.position).normalize();
    var tt = (0 - camera.position.y) / _v.y;
    cw.x = camera.position.x + _v.x * tt;
    cw.z = camera.position.z + _v.z * tt;
  }
  var SPREAD_R = 300, SPREAD_R2 = SPREAD_R * SPREAD_R, SPREAD = 105, RISE = 150;

  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  var t = 0, running = true;

  function step() {
    if (!running) return;
    requestAnimationFrame(step);
    t += reduceMotion ? 0 : 0.0085;

    if (active) cursorWorld();

    // undulating wave + cursor spread (springs back) + crest brightness
    for (var i = 0; i < COUNT; i++) {
      var x = baseX[i], z = baseZ[i];
      var y = 46 * Math.sin(x * 0.006 + t) +
              40 * Math.cos(z * 0.012 + t * 0.8) +
              30 * Math.sin((x + z) * 0.004 + t * 1.3);

      var tox = 0, toy = 0, toz = 0;
      if (active) {
        var dx = x - cw.x, dz = z - cw.z, d2 = dx * dx + dz * dz;
        if (d2 < SPREAD_R2) {
          var d = Math.sqrt(d2) + 0.0001;
          var f = 1 - d / SPREAD_R;
          tox = (dx / d) * f * SPREAD;        // push out
          toz = (dz / d) * f * SPREAD;
          toy = f * f * RISE;                 // lift up
        }
      }
      offX[i] += (tox - offX[i]) * 0.12;       // spring toward target (0 when away)
      offY[i] += (toy - offY[i]) * 0.12;
      offZ[i] += (toz - offZ[i]) * 0.12;

      wavePos[i * 3]     = x + offX[i];
      wavePos[i * 3 + 1] = y + offY[i];
      wavePos[i * 3 + 2] = z + offZ[i];

      var b = 0.42 + (y + 116) / 232 * 0.85 + (offY[i] / RISE) * 0.5;  // lifted = brighter
      if (b > 1) b = 1; if (b < 0.2) b = 0.2;
      waveCol[i * 3] = b; waveCol[i * 3 + 1] = b; waveCol[i * 3 + 2] = b;
    }
    waveGeo.attributes.position.needsUpdate = true;
    waveGeo.attributes.color.needsUpdate = true;

    // rising motes, wrap at the top
    if (!reduceMotion) {
      for (var k = 0; k < MOTES; k++) {
        motePos[k * 3 + 1] += moteVel[k];
        if (motePos[k * 3 + 1] > 280) motePos[k * 3 + 1] = -260;
      }
      moteGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  // Start immediately (robust — does not depend on IntersectionObserver
  // firing). IO is used only to pause the loop when the footer is fully
  // out of view as a battery/perf optimisation.
  resize();
  step();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var was = running;
        running = e.isIntersecting;
        if (running && !was) step();
      });
    }, { threshold: 0 });
    io.observe(canvas);
  }

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 160); });
})();
