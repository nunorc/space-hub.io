(() => {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");

  let width, height, stars;
  const STAR_COUNT_DENSITY = 8000; // px^2 per star

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // spacecraft orbit
  const orbit = {
    cx: 0, cy: 0, radiusX: 0, radiusY: 0, tilt: -0.28,
    theta: Math.random() * Math.PI * 2,
    speed: 0.00022, // radians per ms
  };
  let trail = [];
  const TRAIL_LENGTH = 60;
  const SHIP_SCALE = 2.1;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    const count = Math.floor((width * height) / STAR_COUNT_DENSITY);
    stars = Array.from({ length: count }, () => makeStar());

    orbit.cx = width * 0.5;
    orbit.cy = height * 0.44;
    orbit.radiusX = Math.min(width, height) * 0.6;
    orbit.radiusY = orbit.radiusX * 0.38;
    trail = [];
  }

  function orbitPoint(theta) {
    const x0 = orbit.radiusX * Math.cos(theta);
    const y0 = orbit.radiusY * Math.sin(theta);
    const cosT = Math.cos(orbit.tilt);
    const sinT = Math.sin(orbit.tilt);
    return {
      x: orbit.cx + x0 * cosT - y0 * sinT,
      y: orbit.cy + x0 * sinT + y0 * cosT,
    };
  }

  function orbitHeading(theta) {
    const dx0 = -orbit.radiusX * Math.sin(theta);
    const dy0 = orbit.radiusY * Math.cos(theta);
    const cosT = Math.cos(orbit.tilt);
    const sinT = Math.sin(orbit.tilt);
    const dx = dx0 * cosT - dy0 * sinT;
    const dy = dx0 * sinT + dy0 * cosT;
    return Math.atan2(dy, dx);
  }

  function drawOrbitPath() {
    ctx.save();
    ctx.translate(orbit.cx, orbit.cy);
    ctx.rotate(orbit.tilt);
    ctx.beginPath();
    ctx.ellipse(0, 0, orbit.radiusX, orbit.radiusY, 0, 0, Math.PI * 2);
    ctx.setLineDash([2, 10]);
    ctx.strokeStyle = "rgba(123, 220, 255, 0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawTrail() {
    for (let i = trail.length - 1; i >= 0; i--) {
      const p = trail[i];
      const age = i / trail.length;
      ctx.beginPath();
      ctx.fillStyle = `rgba(185, 139, 255, ${0.35 * (1 - age)})`;
      ctx.arc(p.x, p.y, 2.2 * (1 - age) + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawShip(x, y, heading) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    ctx.scale(SHIP_SCALE, SHIP_SCALE);

    // solar panel wings, perpendicular to the direction of travel
    const drawPanel = (yStart, yEnd) => {
      ctx.beginPath();
      ctx.rect(-3, yStart, 6, yEnd - yStart);
      const grad = ctx.createLinearGradient(0, yStart, 0, yEnd);
      grad.addColorStop(0, "#5a4aa8");
      grad.addColorStop(1, "#241f4d");
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = "rgba(123, 220, 255, 0.45)";
      ctx.lineWidth = 0.5;
      ctx.stroke();

      ctx.beginPath();
      const cells = 3;
      for (let i = 1; i < cells; i++) {
        const yy = yStart + ((yEnd - yStart) * i) / cells;
        ctx.moveTo(-3, yy);
        ctx.lineTo(3, yy);
      }
      ctx.moveTo(0, yStart);
      ctx.lineTo(0, yEnd);
      ctx.stroke();
    };
    ctx.shadowBlur = 0;
    drawPanel(3, 9);
    drawPanel(-9, -3);

    // struts connecting the panels to the bus
    ctx.beginPath();
    ctx.strokeStyle = "#9a9cc0";
    ctx.lineWidth = 0.8;
    ctx.moveTo(0, 2.2);
    ctx.lineTo(0, 3);
    ctx.moveTo(0, -2.2);
    ctx.lineTo(0, -3);
    ctx.stroke();

    // central bus
    ctx.beginPath();
    ctx.rect(-2.2, -2.2, 4.4, 4.4);
    ctx.fillStyle = "#e8e9f5";
    ctx.shadowColor = "#7bdcff";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  function makeStar() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.3 + 0.2,
      baseAlpha: Math.random() * 0.6 + 0.3,
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * 0.05 + 0.01,
    };
  }

  let lastTime = 0;

  function draw(time) {
    const dt = lastTime ? time - lastTime : 0;
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    drawOrbitPath();

    if (!prefersReducedMotion) {
      orbit.theta += orbit.speed * dt;
      const pos = orbitPoint(orbit.theta);
      trail.unshift({ x: pos.x, y: pos.y });
      if (trail.length > TRAIL_LENGTH) trail.pop();
      drawTrail();
      drawShip(pos.x, pos.y, orbitHeading(orbit.theta));
    } else {
      const pos = orbitPoint(orbit.theta);
      drawShip(pos.x, pos.y, orbitHeading(orbit.theta));
    }

    for (const s of stars) {
      const alpha = prefersReducedMotion
        ? s.baseAlpha
        : s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.phase) * 0.3;
      ctx.beginPath();
      ctx.fillStyle = `rgba(232, 233, 245, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      if (!prefersReducedMotion) {
        s.y += s.drift;
        if (s.y > height) {
          s.y = 0;
          s.x = Math.random() * width;
        }
      }
    }
    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
