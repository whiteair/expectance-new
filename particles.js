/* =========================================================
   EXPECTANCE — Three.js flow-field constellation (HERO)
   Particles are spread out at irregular distances and drift
   in slow waves (a flow field). Each particle takes a colour
   from a smooth low-frequency field, so colour varies in
   coherent clusters and shifts slowly over time. Where the
   cursor goes, nearby particles grow a touch larger, brighten
   and weave lines to one another — a little constellation that
   follows the pointer and dissolves when it leaves.
   Orthographic, world units = pixels. Degrades gracefully.
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("particles");
  if (!canvas || typeof THREE === "undefined") {
    if (canvas) canvas.style.display = "none";
    return;
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  camera.position.z = 10;

  // ---- Tunables ----------------------------------------------------------
  var CURSOR_R = 210;       // radius of cursor influence (px)
  var LINK = 155;           // max gap between two dots to draw a line (px)
  var FLOW = 0.05;          // flow-field acceleration (drift speed)
  var DAMP = 0.94;          // velocity damping
  var FLOW_SPEED = 0.006;   // how fast the wave field evolves
  var CURSOR_GROW = 3.4;    // a tad larger near the cursor
  var COLOR_SAT = 0.52;     // cluster colour saturation
  var COLOR_LIGHT = 0.5;    // cluster colour lightness
  var COLOR_FREQ = 0.011;   // lower = bigger colour clusters
  var COLOR_DRIFT = 0.5;    // how fast the colour field shifts

  var ptMat = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: 1 } },
    vertexShader:
      "attribute float aSize; attribute float aAlpha; attribute vec3 aColor;" +
      "varying float vA; varying vec3 vC; uniform float uPR;" +
      "void main(){ vA = aAlpha; vC = aColor;" +
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);" +
      "  gl_PointSize = aSize * uPR; }",
    fragmentShader:
      "precision mediump float; varying float vA; varying vec3 vC;" +
      "void main(){ float d = length(gl_PointCoord - vec2(0.5));" +
      "  float a = smoothstep(0.5, 0.32, d) * vA;" +
      "  if (a < 0.01) discard;" +
      "  gl_FragColor = vec4(vC, a); }",
    transparent: true, depthTest: false, depthWrite: false
  });
  var lnMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false
  });

  var positions, aSize, aAlpha, aColor, vx, vy, baseSize, baseAlpha, prox, N = 0;
  var maxSeg, linePos, lineCol, geo, pts, lineGeo, lines;
  var halfW = 1, halfH = 1;

  function rnd(s) { var v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function countFor(w, h) { return Math.max(60, Math.min(480, Math.round(w * h / 4300))); }

  // HSL -> RGB (h,s,l in 0..1) written into out[o..o+2]
  function hue2(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  function hsl(h, s, l, out, o) {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    out[o] = hue2(p, q, h + 1 / 3);
    out[o + 1] = hue2(p, q, h);
    out[o + 2] = hue2(p, q, h - 1 / 3);
  }

  function build(w, h) {
    N = countFor(w, h);
    maxSeg = N * 8;

    positions = new Float32Array(N * 3);
    aSize = new Float32Array(N);
    aAlpha = new Float32Array(N);
    aColor = new Float32Array(N * 3);
    vx = new Float32Array(N);
    vy = new Float32Array(N);
    baseSize = new Float32Array(N);
    baseAlpha = new Float32Array(N);
    prox = new Float32Array(N);

    for (var i = 0; i < N; i++) {
      positions[i * 3] = (rnd(i + 1) * 2 - 1) * w / 2;
      positions[i * 3 + 1] = (rnd(i + 99) * 2 - 1) * h / 2;
      positions[i * 3 + 2] = 0;
      baseSize[i] = 1.8 + rnd(i + 33) * 2.4;
      baseAlpha[i] = 0.42 + rnd(i + 57) * 0.4;
      aSize[i] = baseSize[i]; aAlpha[i] = baseAlpha[i];
      aColor[i * 3] = aColor[i * 3 + 1] = aColor[i * 3 + 2] = 0.2;
    }

    if (pts) { scene.remove(pts); geo.dispose(); }
    if (lines) { scene.remove(lines); lineGeo.dispose(); }

    lineGeo = new THREE.BufferGeometry();
    linePos = new Float32Array(maxSeg * 2 * 3);
    lineCol = new Float32Array(maxSeg * 2 * 3);
    lineGeo.setAttribute("position", new THREE.BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
    lineGeo.setAttribute("color", new THREE.BufferAttribute(lineCol, 3).setUsage(THREE.DynamicDrawUsage));
    lines = new THREE.LineSegments(lineGeo, lnMat);
    lines.frustumCulled = false;
    scene.add(lines);

    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aColor", new THREE.BufferAttribute(aColor, 3).setUsage(THREE.DynamicDrawUsage));
    pts = new THREE.Points(geo, ptMat);
    pts.frustumCulled = false;
    scene.add(pts);
  }

  // ---- Pointer (hero-local, centred, y-up) ------------------------------
  var pointer = { x: -99999, y: -99999, active: false };
  function onMove(e) {
    var r = canvas.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) - r.width / 2;
    pointer.y = -((e.clientY - r.top) - r.height / 2);
    pointer.active = true;
  }
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  document.addEventListener("pointerleave", function () { pointer.active = false; });
  window.addEventListener("blur", function () { pointer.active = false; });

  function resize() {
    var hero = canvas.parentElement;
    var w = hero ? hero.clientWidth : window.innerWidth;
    var h = hero ? hero.clientHeight : window.innerHeight;
    var pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.left = -w / 2; camera.right = w / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    ptMat.uniforms.uPR.value = pr;
    halfW = w / 2; halfH = h / 2;
    build(w, h);
  }

  // ---- Loop --------------------------------------------------------------
  var running = true, t = 0, R2 = CURSOR_R * CURSOR_R, LINK2 = LINK * LINK;
  var near = [];

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!reduceMotion) t += FLOW_SPEED;

    var mx = pointer.x, my = pointer.y, active = pointer.active;
    near.length = 0;

    for (var i = 0; i < N; i++) {
      var px = positions[i * 3], py = positions[i * 3 + 1];

      if (!reduceMotion) {
        vx[i] += (Math.cos(py * 0.004 + t) + Math.sin(py * 0.011 - t * 0.7) * 0.5) * FLOW;
        vy[i] += (Math.sin(px * 0.004 - t * 0.8) + Math.cos(px * 0.009 + t * 0.6) * 0.5) * FLOW;
        vx[i] *= DAMP; vy[i] *= DAMP;
        px += vx[i]; py += vy[i];
        if (px > halfW + 20) px = -halfW - 20; else if (px < -halfW - 20) px = halfW + 20;
        if (py > halfH + 20) py = -halfH - 20; else if (py < -halfH - 20) py = halfH + 20;
        positions[i * 3] = px; positions[i * 3 + 1] = py;
      }

      // coherent colour field — clusters share a hue that drifts with time
      var cf = Math.sin(px * COLOR_FREQ + t * COLOR_DRIFT) + Math.cos(py * COLOR_FREQ - t * COLOR_DRIFT * 0.7);
      hsl((cf + 2) / 4, COLOR_SAT, COLOR_LIGHT, aColor, i * 3);

      var p = 0;
      if (active) {
        var dx = px - mx, dy = py - my, dc2 = dx * dx + dy * dy;
        if (dc2 < R2) { p = 1 - Math.sqrt(dc2) / CURSOR_R; near.push(i); }
      }
      prox[i] = p;
      aSize[i] = baseSize[i] + p * CURSOR_GROW;               // a tad larger near cursor
      aAlpha[i] = Math.min(1, baseAlpha[i] + p * 0.55);        // and a little brighter
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
    geo.attributes.aColor.needsUpdate = true;

    // grow lines between particles that are both near the cursor and near
    // each other; colour taken from the clusters, fading to white off-cursor
    var seg = 0;
    for (var a = 0; a < near.length; a++) {
      var ia = near[a], ax = positions[ia * 3], ay = positions[ia * 3 + 1], pa = prox[ia];
      for (var b = a + 1; b < near.length; b++) {
        if (seg >= maxSeg) break;
        var ib = near[b];
        var ddx = ax - positions[ib * 3], ddy = ay - positions[ib * 3 + 1];
        var pd2 = ddx * ddx + ddy * ddy;
        if (pd2 > LINK2) continue;
        var pdf = 1 - Math.sqrt(pd2) / LINK;
        var strength = pdf * (pa + prox[ib]) * 0.5;
        if (strength <= 0.04) continue;
        var s = Math.min(1, strength * 1.5);
        var k = seg * 6, ca = ia * 3, cb = ib * 3;
        linePos[k] = ax; linePos[k + 1] = ay; linePos[k + 2] = 0;
        linePos[k + 3] = positions[ib * 3]; linePos[k + 4] = positions[ib * 3 + 1]; linePos[k + 5] = 0;
        // lerp endpoint colour toward white as the link weakens
        lineCol[k]     = 1 - (1 - aColor[ca]) * s;
        lineCol[k + 1] = 1 - (1 - aColor[ca + 1]) * s;
        lineCol[k + 2] = 1 - (1 - aColor[ca + 2]) * s;
        lineCol[k + 3] = 1 - (1 - aColor[cb]) * s;
        lineCol[k + 4] = 1 - (1 - aColor[cb + 1]) * s;
        lineCol[k + 5] = 1 - (1 - aColor[cb + 2]) * s;
        seg++;
      }
    }
    lineGeo.setDrawRange(0, seg * 2);
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var was = running; running = e.isIntersecting;
        if (running && !was) frame();
      });
    }, { threshold: 0 });
    io.observe(canvas);
  }

  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 160); });

  resize();
  frame();
})();
