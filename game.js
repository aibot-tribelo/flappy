// ── Config ──
const W = 480, H = 640;
const GRAVITY = 0.25;
const FLAP = -5.5;
const PIPE_SPEED = 2.5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 150;
const PIPE_INTERVAL = 90; // frames between pipes
const BIRD_SIZE = 20;

// ── Setup ──
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = W;
canvas.height = H;

let bird, pipes, score, bestScore = 0, frame, state;
let leaves = [], windT = 0; // background particles
// state: 'ready' | 'playing' | 'dead'

function reset() {
  bird = { x: 80, y: H / 2, vy: 0, rotation: 0 };
  pipes = [];
  score = 0;
  frame = 0;
  state = 'ready';
}

reset();

// Initialize drifting leaves once
if (!leaves.length) {
  const LEAF_COUNT = 22;
  leaves = Array.from({ length: LEAF_COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * (H - 140) + 40,
    s: Math.random() * 0.8 + 0.6,
    v: Math.random() * 0.8 + 0.4,
    a: Math.random() * Math.PI * 2,
    hue: Math.random() < 0.6 ? 135 : 90
  }));
}

// ── Input ──
function flap() {
  if (state === 'dead') {
    reset();
    return;
  }
  if (state === 'ready') state = 'playing';
  bird.vy = FLAP;
}

canvas.addEventListener('click', flap);
canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); });
document.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); }
});

// ── Drawing helpers ──
function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);

  // Rotation based on velocity
  bird.rotation += (Math.min(bird.vy * 3, 90) * Math.PI / 180 - bird.rotation) * 0.15;
  ctx.rotate(bird.rotation);

  // Body (blue)
  ctx.fillStyle = '#57a0ff';
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_SIZE, BIRD_SIZE * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2f73d9';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wing (lighter blue)
  const wingFlap = state === 'playing' ? Math.sin(frame * 0.3) * 6 : 0;
  ctx.fillStyle = '#8bc0ff';
  ctx.beginPath();
  ctx.ellipse(-4, 2 + wingFlap, 10, 6, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(8, -5, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(10, -5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Beak
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(16, -1);
  ctx.lineTo(26, 3);
  ctx.lineTo(16, 7);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawPipe(p) {
  const r = 6; // corner rounding for cap
  // Pipe body
  ctx.fillStyle = '#27ae60';
  ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
  ctx.fillRect(p.x, p.top + PIPE_GAP, PIPE_WIDTH, H - p.top - PIPE_GAP);

  // Pipe caps
  ctx.fillStyle = '#229954';
  const capW = PIPE_WIDTH + 10;
  const capH = 24;
  const capX = p.x - 5;

  // Top cap
  ctx.beginPath();
  ctx.roundRect(capX, p.top - capH, capW, capH, [r, r, 0, 0]);
  ctx.fill();

  // Bottom cap
  ctx.beginPath();
  ctx.roundRect(capX, p.top + PIPE_GAP, capW, capH, [0, 0, r, r]);
  ctx.fill();

  // Pipe highlight
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(p.x + 4, 0, 8, p.top);
  ctx.fillRect(p.x + 4, p.top + PIPE_GAP + capH, 8, H - p.top - PIPE_GAP - capH);
}

function drawGround() {
  const groundY = H - 40;
  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, groundY, W, 40);
  ctx.fillStyle = '#7CCD7C';
  ctx.fillRect(0, groundY, W, 8);

  // Scrolling ground texture
  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  const offset = state === 'playing' ? (frame * PIPE_SPEED) % 20 : 0;
  for (let i = -20 + offset; i < W + 20; i += 20) {
    ctx.fillRect(i - offset, groundY + 10, 10, 3);
    ctx.fillRect(i - offset + 5, groundY + 22, 10, 3);
  }
}

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#87CEEB');
  grad.addColorStop(0.6, '#B0E0E6');
  grad.addColorStop(1, '#E0F0E0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  const cloudOffset = state === 'playing' ? frame * 0.3 : 0;
  [[100, 80], [300, 120], [180, 200], [420, 60]].forEach(([cx, cy]) => {
    const x = ((cx - cloudOffset) % (W + 100) + W + 100) % (W + 100) - 50;
    ctx.beginPath();
    ctx.ellipse(x, cy, 40, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 25, cy - 5, 30, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 20, cy + 2, 25, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Wind streaks (subtle)
  windT += state === 'playing' ? 0.015 : 0.006;
  const wSpeed = 1.2 + Math.sin(windT) * 0.6;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const y = ((i * 90 + (frame * wSpeed)) % (H + 60)) - 30;
    ctx.beginPath();
    ctx.moveTo(W - ((frame * wSpeed + i * 40) % (W + 60)), y);
    ctx.lineTo(W - ((frame * wSpeed + i * 40) % (W + 60)) + 40, y);
    ctx.stroke();
  }

  // Leaves (foreground particles)
  for (const L of leaves) {
    // update
    const vx = (PIPE_SPEED + L.v + wSpeed * 0.4);
    L.x -= vx;
    L.y += Math.sin(L.a + frame * 0.02) * 0.15;
    L.a += 0.04;
    if (L.x < -20) {
      L.x = W + Math.random() * 60;
      L.y = Math.random() * (H - 140) + 40;
      L.v = Math.random() * 0.8 + 0.4;
      L.s = Math.random() * 0.8 + 0.6;
      L.hue = Math.random() < 0.6 ? 135 : 90;
    }
    // draw
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(Math.sin(L.a) * 0.6);
    ctx.fillStyle = `hsl(${L.hue} 45% 45% / 0.85)`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * L.s, 3 * L.s, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawScore() {
  // Main score
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 4;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeText(score, W / 2, 70);
  ctx.fillText(score, W / 2, 70);
}

function drawReady() {
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLAPPY', W / 2, H / 2 - 60);

  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText('Tap, click, or press space to fly', W / 2, H / 2);

  // Bouncing bird hint
  bird.y = H / 2 - 80 + Math.sin(frame * 0.05) * 10;
}

function drawDead() {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, H);

  // Score card
  const cardW = 220, cardH = 160;
  const cardX = (W - cardW) / 2, cardY = (H - cardH) / 2 - 20;

  ctx.fillStyle = '#DEB887';
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 10);
  ctx.fill();
  ctx.strokeStyle = '#8B7355';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#553';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', W / 2, cardY + 35);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#665';
  ctx.fillText('Score', W / 2 - 50, cardY + 65);
  ctx.fillText('Best', W / 2 + 50, cardY + 65);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#333';
  ctx.fillText(score, W / 2 - 50, cardY + 100);
  ctx.fillText(bestScore, W / 2 + 50, cardY + 100);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('Tap to restart', W / 2, cardY + cardH + 40);
}

// ── Collision ──
function collides() {
  // Ground / ceiling
  if (bird.y + BIRD_SIZE * 0.75 > H - 40 || bird.y - BIRD_SIZE * 0.75 < 0) return true;

  for (const p of pipes) {
    if (bird.x + BIRD_SIZE > p.x && bird.x - BIRD_SIZE < p.x + PIPE_WIDTH) {
      if (bird.y - BIRD_SIZE * 0.75 < p.top || bird.y + BIRD_SIZE * 0.75 > p.top + PIPE_GAP) {
        return true;
      }
    }
  }
  return false;
}

// ── Game loop ──
function update() {
  if (state === 'playing') {
    // Bird physics
    bird.vy += GRAVITY;
    bird.y += bird.vy;

    // Pipes
    if (frame % PIPE_INTERVAL === 0) {
      const minTop = 60;
      const maxTop = H - 40 - PIPE_GAP - 60;
      const top = Math.random() * (maxTop - minTop) + minTop;
      pipes.push({ x: W, top, scored: false });
    }

    for (const p of pipes) {
      p.x -= PIPE_SPEED;
      if (!p.scored && p.x + PIPE_WIDTH < bird.x) {
        p.scored = true;
        score++;
      }
    }

    // Remove off-screen pipes
    pipes = pipes.filter(p => p.x + PIPE_WIDTH + 10 > 0);

    // Collision
    if (collides()) {
      state = 'dead';
      if (score > bestScore) bestScore = score;
    }

    frame++;
  } else if (state === 'ready') {
    frame++;
  }
}

function draw() {
  drawBackground();

  for (const p of pipes) drawPipe(p);

  drawGround();
  drawBird();

  if (state === 'playing' || state === 'dead') drawScore();
  if (state === 'ready') drawReady();
  if (state === 'dead') drawDead();
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
