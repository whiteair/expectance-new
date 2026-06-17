/* =========================================================
   EXPECTANCE — Three.js ambient particles (CLOSING zone)
   A light field of soft glowing dots drifting slowly upward
   behind the whole dark closing zone (CTA + footer), so the
   "Start a project" section shares the footer's atmosphere.
   The footer wave itself is rendered separately (footer.js)
   and is unchanged. Orthographic, world units = pixels.
   ========================================================= */
(function () {
  "use strict";

  var canvas = document.getElementById("closingParticles");
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

  var mat = new THREE.ShaderMaterial({
    uniforms: { uPR: { value: 1 } },
    vertexShader:
      "attribute float aSize; attribute float aAlpha; varying float vA;" +
      "uniform float uPR;" +
      "void main(){ vA = aAlpha;" +
      "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);" +
      "  gl_PointSize = aSize * uPR; }",
    fragmentShader:
      "precision mediump float; varying float vA;" +
      "void main(){ float d = length(gl_PointCoord - vec2(0.5));" +
      "  float a = smoothstep(0.5, 0.1, d) * vA;" +
      "  if (a < 0.01) discard;" +
      "  gl_FragColor = vec4(1.0, 1.0, 1.0, a); }",
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  var positions, vel, aSize, aAlpha, geo, pts, N = 0, halfW = 1, halfH = 1;

  function rnd(s) { var v = Math.sin(s * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
  function countFor(w, h) { return Math.max(50, Math.min(360, Math.round(w * h / 7000))); }

  function build(w, h) {
    N = countFor(w, h);
    positions = new Float32Array(N * 3);
    vel = new Float32Array(N);
    aSize = new Float32Array(N);
    aAlpha = new Float32Array(N);

    for (var i = 0; i < N; i++) {
      positions[i * 3] = (rnd(i + 1) * 2 - 1) * w / 2;
      positions[i * 3 + 1] = (rnd(i + 99) * 2 - 1) * h / 2;
      positions[i * 3 + 2] = 0;
      aSize[i] = 1.4 + rnd(i + 33) * 3.0;
      aAlpha[i] = 0.22 + rnd(i + 57) * 0.55;
      vel[i] = 0.12 + rnd(i + 77) * 0.5;       // slow upward drift
    }

    if (pts) { scene.remove(pts); geo.dispose(); }
    geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("aSize", new THREE.BufferAttribute(aSize, 1));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(aAlpha, 1));
    pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
  }

  function resize() {
    var parent = canvas.parentElement;
    var w = parent ? parent.clientWidth : window.innerWidth;
    var h = parent ? parent.clientHeight : window.innerHeight;
    if (!w || !h) return;
    var pr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.left = -w / 2; camera.right = w / 2;
    camera.top = h / 2; camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    mat.uniforms.uPR.value = pr;
    halfW = w / 2; halfH = h / 2;
    build(w, h);
  }

  var running = true;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!reduceMotion) {
      for (var i = 0; i < N; i++) {
        positions[i * 3 + 1] += vel[i];
        if (positions[i * 3 + 1] > halfH + 12) positions[i * 3 + 1] = -halfH - 12;
      }
      geo.attributes.position.needsUpdate = true;
    }
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
