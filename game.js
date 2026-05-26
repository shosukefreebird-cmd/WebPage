const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const miniMap = document.querySelector("#miniMap");
const mapCtx = miniMap.getContext("2d");

const scoreEl = document.querySelector("#speed");
const statusEl = document.querySelector("#area");
const lifeEl = document.querySelector("#cash");
const areaBanner = document.querySelector("#areaBanner");
const winScreen = document.querySelector("#winScreen");
const loseScreen = document.querySelector("#loseScreen");

const world = { width: 5800, height: 4300 };
const keys = new Set();

const playerStart = { x: 2912, y: 2462 };
const startSafeZone = { x: playerStart.x - 190, y: playerStart.y - 140, w: 380, h: 280 };
const player = {
  ...playerStart,
  angle: 0,
  score: 0,
  lives: 3,
  radius: 15,
  invincible: 0,
  spottedCooldown: 0,
  won: false,
  lost: false,
};

let audioContext;
let alertActive = false;

const zones = [
  { name: "Park", detail: "木が多い広場", x: 0, y: 0, w: 1934, h: 1434, color: "#45664d" },
  { name: "Town", detail: "建物が多い住宅街", x: 1934, y: 0, w: 1933, h: 1434, color: "#4e5961" },
  { name: "Market", detail: "道が広い商店街", x: 3867, y: 0, w: 1933, h: 1434, color: "#5f5748" },
  { name: "School", detail: "校舎と中庭", x: 0, y: 1434, w: 1934, h: 1433, color: "#5b5448" },
  { name: "Station", detail: "中央駅エリア", x: 1934, y: 1434, w: 1933, h: 1433, color: "#51495e" },
  { name: "Harbor", detail: "倉庫と港", x: 3867, y: 1434, w: 1933, h: 1433, color: "#3f5961" },
  { name: "Forest", detail: "暗い外周林", x: 0, y: 2867, w: 1934, h: 1433, color: "#364f42" },
  { name: "Factory", detail: "大きな工場地帯", x: 1934, y: 2867, w: 1933, h: 1433, color: "#57514a" },
  { name: "Docks", detail: "広い埠頭", x: 3867, y: 2867, w: 1933, h: 1433, color: "#405862" },
];

const roads = [];
for (let x = 280; x < world.width; x += 430) roads.push({ x, y: 0, w: 104, h: world.height });
for (let y = 250; y < world.height; y += 360) roads.push({ x: 0, y, w: world.width, h: 104 });

const walls = [];
for (let row = 0; row < 14; row++) {
  for (let col = 0; col < 17; col++) {
    if ((row + col) % 3 === 0) continue;
    const wall = {
      x: 430 + col * 340 + (row % 2) * 48,
      y: 380 + row * 270,
      w: 120 + ((row + col) % 3) * 38,
      h: 92 + ((row * 2 + col) % 3) * 28,
      color: ["#67727a", "#6f6255", "#58705e", "#72575b"][(row + col) % 4],
    };
    const clearOfRoads = roads.every((road) => !rectsOverlap(
      { x: wall.x - 28, y: wall.y - 28, w: wall.w + 56, h: wall.h + 56 },
      road,
    ));
    if (clearOfRoads) walls.push(wall);
  }
}

const roadBlocks = [
  { x: 284, y: 905, w: 96, h: 74, color: "#7b4f42" },
  { x: 714, y: 1624, w: 96, h: 80, color: "#63594c" },
  { x: 1144, y: 2706, w: 96, h: 82, color: "#6b5355" },
  { x: 1574, y: 1985, w: 96, h: 80, color: "#775f45" },
  { x: 2004, y: 1265, w: 96, h: 76, color: "#6a6268" },
  { x: 2434, y: 2346, w: 96, h: 82, color: "#724d4d" },
  { x: 2864, y: 905, w: 96, h: 74, color: "#665448" },
  { x: 3294, y: 3065, w: 96, h: 78, color: "#73585f" },
  { x: 3724, y: 1624, w: 96, h: 80, color: "#626053" },
  { x: 4154, y: 2706, w: 96, h: 82, color: "#73554a" },
  { x: 4584, y: 1265, w: 96, h: 76, color: "#665d52" },
  { x: 5014, y: 1985, w: 96, h: 80, color: "#704f58" },
  { x: 1020, y: 254, w: 84, h: 96, color: "#7b4f42" },
  { x: 1880, y: 614, w: 88, h: 96, color: "#63594c" },
  { x: 2740, y: 974, w: 88, h: 96, color: "#6a6268" },
  { x: 3600, y: 1334, w: 88, h: 96, color: "#724d4d" },
  { x: 4460, y: 2054, w: 88, h: 96, color: "#665448" },
  { x: 5320, y: 2774, w: 88, h: 96, color: "#73585f" },
];

const enemyStarts = [
  { x: 762, y: 3542 },
  { x: 5492, y: 1022 },
  { x: 5492, y: 3542 },
  { x: 3342, y: 1022 },
  { x: 2052, y: 1022 },
  { x: 4632, y: 3542 },
  { x: 2052, y: 3542 },
  { x: 5062, y: 2462 },
];

const enemies = [
  { ...enemyStarts[0], speed: 165, radius: 17, color: "#e04f4f" },
  { ...enemyStarts[1], speed: 165, radius: 17, color: "#ff6b4a" },
  { ...enemyStarts[2], speed: 165, radius: 19, color: "#d93b70" },
  { ...enemyStarts[3], speed: 165, radius: 17, color: "#c944e0" },
  { ...enemyStarts[4], speed: 165, radius: 17, color: "#f05a7a" },
  { ...enemyStarts[5], speed: 165, radius: 18, color: "#ff784f" },
  { ...enemyStarts[6], speed: 165, radius: 17, color: "#d84bff" },
  { ...enemyStarts[7], speed: 165, radius: 18, color: "#d73939" },
];

function resize() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  ensureAudio();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
resize();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleBlocked(x, y, radius) {
  const box = { x: x - radius, y: y - radius, w: radius * 2, h: radius * 2 };
  return [...walls, ...roadBlocks].some((wall) => rectsOverlap(box, wall));
}

function onRoad(x, y, radius) {
  return roads.some((road) => (
    x + radius <= road.x + road.w &&
    x - radius >= road.x &&
    y + radius <= road.y + road.h &&
    y - radius >= road.y
  ));
}

function canMoveTo(x, y, radius) {
  return onRoad(x, y, radius) && !circleBlocked(x, y, radius);
}

function createTasks() {
  const generated = [];
  const blockedPoints = [...enemyStarts, playerStart];
  const verticalRoads = roads.filter((road) => road.h > road.w);
  const horizontalRoads = roads.filter((road) => road.w > road.h);

  for (const verticalRoad of verticalRoads) {
    for (const horizontalRoad of horizontalRoads) {
      const task = {
        x: verticalRoad.x + verticalRoad.w / 2,
        y: horizontalRoad.y + horizontalRoad.h / 2,
        taken: false,
      };
      const tooCloseToEdge = task.x < 520 || task.y < 520 || task.x > world.width - 520 || task.y > world.height - 520;
      const tooCloseToBlockedPoint = blockedPoints.some((point) => Math.hypot(point.x - task.x, point.y - task.y) < 210);
      if (!tooCloseToEdge && !tooCloseToBlockedPoint && canMoveTo(task.x, task.y, 16)) {
        generated.push(task);
      }
    }
  }

  return generated;
}

const tasks = createTasks();

function inStartSafeZone(x, y) {
  return x >= startSafeZone.x && x <= startSafeZone.x + startSafeZone.w && y >= startSafeZone.y && y <= startSafeZone.y + startSafeZone.h;
}

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
}

function startAlertMusic() {
  if (!audioContext || alertActive || player.won || player.lost) return;
  alertActive = true;

  const start = audioContext.currentTime;
  const notes = [
    { t: 0, f: 98, d: 0.2 },
    { t: 0.18, f: 147, d: 0.13 },
    { t: 0.34, f: 131, d: 0.16 },
    { t: 0.52, f: 196, d: 0.12 },
    { t: 0.68, f: 92, d: 0.24 },
    { t: 0.94, f: 185, d: 0.18 },
  ];

  for (const note of notes) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(note.f, start + note.t);
    osc.detune.setValueAtTime(-18, start + note.t);
    osc.detune.linearRampToValueAtTime(24, start + note.t + note.d);
    gain.gain.setValueAtTime(0.0001, start + note.t);
    gain.gain.exponentialRampToValueAtTime(0.07, start + note.t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.t + note.d);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start + note.t);
    osc.stop(start + note.t + note.d + 0.02);
  }

  for (const beat of [0, 0.18, 0.36, 0.72, 0.9]) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(80, start + beat);
    osc.frequency.exponentialRampToValueAtTime(45, start + beat + 0.1);
    gain.gain.setValueAtTime(0.0001, start + beat);
    gain.gain.exponentialRampToValueAtTime(0.16, start + beat + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + beat + 0.13);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start + beat);
    osc.stop(start + beat + 0.15);
  }

  const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.45, audioContext.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = audioContext.createBufferSource();
  const noiseGain = audioContext.createGain();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.0001, start + 0.18);
  noiseGain.gain.exponentialRampToValueAtTime(0.06, start + 0.24);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.62);
  noise.connect(noiseGain);
  noiseGain.connect(audioContext.destination);
  noise.start(start + 0.18);

  window.setTimeout(() => {
    alertActive = false;
  }, 1150);
}

function playTaskSound() {
  if (!audioContext) return;

  const start = audioContext.currentTime;
  const notes = [
    { t: 0, f: 880 },
    { t: 0.055, f: 1320 },
    { t: 0.11, f: 1760 },
  ];

  for (const note of notes) {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note.f, start + note.t);
    gain.gain.setValueAtTime(0.0001, start + note.t);
    gain.gain.exponentialRampToValueAtTime(0.07, start + note.t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + note.t + 0.16);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(start + note.t);
    osc.stop(start + note.t + 0.18);
  }
}

function resetAfterTag() {
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.invincible = 2.2;
  enemies.forEach((enemy, index) => {
    enemy.x = enemyStarts[index].x;
    enemy.y = enemyStarts[index].y;
  });
}

function updatePlayer(dt) {
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const boost = keys.has("shift");
  const moveSpeed = boost ? 330 : 220;

  let dx = 0;
  let dy = 0;
  if (up) dy -= 1;
  if (down) dy += 1;
  if (left) dx -= 1;
  if (right) dx += 1;

  if (dx || dy) {
    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;
    player.angle = Math.atan2(dy, dx);
  }

  const nextX = clamp(player.x + dx * moveSpeed * dt, player.radius, world.width - player.radius);
  const nextY = clamp(player.y + dy * moveSpeed * dt, player.radius, world.height - player.radius);
  if (canMoveTo(nextX, player.y, player.radius)) player.x = nextX;
  if (canMoveTo(player.x, nextY, player.radius)) player.y = nextY;

  for (const task of tasks) {
    if (!task.taken && Math.hypot(player.x - task.x, player.y - task.y) < 56) {
      task.taken = true;
      player.score += 100;
      playTaskSound();
    }
  }
}

function updateEnemies(dt) {
  const safe = inStartSafeZone(player.x, player.y);
  let spotted = false;

  for (let index = 0; index < enemies.length; index++) {
    const enemy = enemies[index];
    const patrolAngle = performance.now() / 900 + index * 2;
    const targetX = safe ? enemy.x + Math.cos(patrolAngle) * 140 : player.x;
    const targetY = safe ? enemy.y + Math.sin(patrolAngle) * 140 : player.y;
    const speed = safe ? enemy.speed * 0.32 : enemy.speed + player.score * 0.025;
    const step = speed * dt;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const xFirst = Math.abs(dx) > Math.abs(dy);
    const moveX = () => {
      const nx = clamp(enemy.x + Math.sign(dx) * Math.min(Math.abs(dx), step), enemy.radius, world.width - enemy.radius);
      if (canMoveTo(nx, enemy.y, enemy.radius)) {
        enemy.x = nx;
        return true;
      }
      return false;
    };
    const moveY = () => {
      const ny = clamp(enemy.y + Math.sign(dy) * Math.min(Math.abs(dy), step), enemy.radius, world.height - enemy.radius);
      if (canMoveTo(enemy.x, ny, enemy.radius)) {
        enemy.y = ny;
        return true;
      }
      return false;
    };

    if (xFirst) {
      if (!moveX()) moveY();
    } else if (!moveY()) {
      moveX();
    }

    const playerDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (!safe && playerDistance < 430) spotted = true;

    if (!safe && player.invincible <= 0 && playerDistance < player.radius + enemy.radius) {
      player.lives -= 1;
      if (player.lives <= 0) {
        player.lives = 0;
        player.lost = true;
        loseScreen.hidden = false;
        return;
      }
      resetAfterTag();
    }
  }

  if (spotted && player.spottedCooldown <= 0) {
    startAlertMusic();
    player.spottedCooldown = 2.4;
  }
}

function update(dt) {
  if (player.won || player.lost) return;
  player.invincible = Math.max(0, player.invincible - dt);
  player.spottedCooldown = Math.max(0, player.spottedCooldown - dt);
  updatePlayer(dt);
  updateEnemies(dt);

  const zone = zones.find((item) => (
    player.x >= item.x && player.x < item.x + item.w && player.y >= item.y && player.y < item.y + item.h
  ));
  const remaining = tasks.filter((task) => !task.taken).length;
  if (remaining === 0) {
    player.won = true;
    winScreen.hidden = false;
  }
  scoreEl.textContent = `${player.score} pts`;
  statusEl.textContent = inStartSafeZone(player.x, player.y) ? "Start Safe" : zone?.name || "Map";
  areaBanner.textContent = zone?.name || "Map";
  lifeEl.textContent = `残機 ${player.lives} / Task ${remaining}`;
}

function drawWorld(camera) {
  for (const zone of zones) {
    ctx.fillStyle = zone.color;
    ctx.fillRect(zone.x - camera.x, zone.y - camera.y, zone.w, zone.h);
    ctx.fillStyle = "rgba(255,255,255,0.13)";
    ctx.font = "800 34px Arial";
    ctx.fillText(zone.name, zone.x + 34 - camera.x, zone.y + 58 - camera.y);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "700 15px Arial";
    ctx.fillText(zone.detail, zone.x + 36 - camera.x, zone.y + 84 - camera.y);
  }

  for (const road of roads) {
    ctx.fillStyle = "#20272b";
    ctx.fillRect(road.x - camera.x, road.y - camera.y, road.w, road.h);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    if (road.h > road.w) {
      for (let y = 18; y < world.height; y += 96) ctx.fillRect(road.x + road.w / 2 - 4 - camera.x, y - camera.y, 8, 44);
    } else {
      for (let x = 18; x < world.width; x += 96) ctx.fillRect(x - camera.x, road.y + road.h / 2 - 4 - camera.y, 44, 8);
    }
  }

  ctx.fillStyle = "rgba(126, 199, 255, 0.24)";
  ctx.fillRect(startSafeZone.x - camera.x, startSafeZone.y - camera.y, startSafeZone.w, startSafeZone.h);
  ctx.strokeStyle = "#9de6ff";
  ctx.lineWidth = 4;
  ctx.strokeRect(startSafeZone.x - camera.x, startSafeZone.y - camera.y, startSafeZone.w, startSafeZone.h);
  ctx.fillStyle = "#dcf6ff";
  ctx.font = "800 18px Arial";
  ctx.fillText("START SAFE", startSafeZone.x + 18 - camera.x, startSafeZone.y + 34 - camera.y);

  for (const wall of walls) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(wall.x + 8 - camera.x, wall.y + 10 - camera.y, wall.w, wall.h);
    ctx.fillStyle = wall.color;
    ctx.fillRect(wall.x - camera.x, wall.y - camera.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(255,255,255,0.17)";
    ctx.fillRect(wall.x + 12 - camera.x, wall.y + 16 - camera.y, wall.w - 24, 8);
  }

  for (const block of roadBlocks) {
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(block.x + 6 - camera.x, block.y + 8 - camera.y, block.w, block.h);
    ctx.fillStyle = block.color;
    ctx.fillRect(block.x - camera.x, block.y - camera.y, block.w, block.h);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(block.x + 10 - camera.x, block.y + 12 - camera.y, block.w - 20, 8);
  }

  for (const task of tasks) {
    if (!task.taken) drawTask(task.x - camera.x, task.y - camera.y);
  }

  for (const enemy of enemies) drawEnemy(enemy.x - camera.x, enemy.y - camera.y, enemy.color);
  drawPlayer(window.innerWidth / 2, window.innerHeight / 2);

  if (player.invincible > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(window.innerWidth / 2, window.innerHeight / 2, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTask(x, y) {
  ctx.fillStyle = "rgba(255,216,79,0.2)";
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  drawStar(x, y, 18, "#ffd84f");
}

function drawStar(x, y, radius, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? radius * 0.45 : radius;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawEnemy(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 18, 24, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a0608";
  ctx.beginPath();
  ctx.moveTo(-15, -12);
  ctx.lineTo(-7, -32);
  ctx.lineTo(0, -15);
  ctx.lineTo(8, -32);
  ctx.lineTo(16, -12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#120305";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#fff0d0";
  ctx.beginPath();
  ctx.arc(-7, -5, 4, 0, Math.PI * 2);
  ctx.arc(7, -5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff1f2d";
  ctx.beginPath();
  ctx.arc(-7, -5, 2, 0, Math.PI * 2);
  ctx.arc(7, -5, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1a0305";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-8, 8);
  ctx.lineTo(-3, 12);
  ctx.lineTo(3, 12);
  ctx.lineTo(8, 8);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);
  ctx.fillStyle = player.invincible > 0 ? "#9de6ff" : "#f2f2ec";
  ctx.beginPath();
  ctx.moveTo(21, 0);
  ctx.lineTo(-13, -14);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-13, 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#101214";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMiniMap() {
  const sx = miniMap.width / world.width;
  const sy = miniMap.height / world.height;
  mapCtx.clearRect(0, 0, miniMap.width, miniMap.height);
  mapCtx.fillStyle = "#0f1518";
  mapCtx.fillRect(0, 0, miniMap.width, miniMap.height);

  for (const zone of zones) {
    mapCtx.fillStyle = zone.color;
    mapCtx.fillRect(zone.x * sx, zone.y * sy, zone.w * sx, zone.h * sy);
    mapCtx.fillStyle = "rgba(255,255,255,0.82)";
    mapCtx.font = "700 9px Arial";
    mapCtx.fillText(zone.name, zone.x * sx + 5, zone.y * sy + 13);
  }

  mapCtx.fillStyle = "#d5dde1";
  for (const road of roads) mapCtx.fillRect(road.x * sx, road.y * sy, road.w * sx, road.h * sy);

  mapCtx.fillStyle = "#1d2326";
  for (const wall of walls) mapCtx.fillRect(wall.x * sx, wall.y * sy, wall.w * sx, wall.h * sy);
  mapCtx.fillStyle = "#6f5450";
  for (const block of roadBlocks) mapCtx.fillRect(block.x * sx, block.y * sy, block.w * sx, block.h * sy);

  mapCtx.fillStyle = "#7ec7ff";
  mapCtx.fillRect(startSafeZone.x * sx, startSafeZone.y * sy, startSafeZone.w * sx, startSafeZone.h * sy);

  mapCtx.fillStyle = "#ffd84f";
  for (const task of tasks) {
    if (!task.taken) mapCtx.fillRect(task.x * sx - 3, task.y * sy - 3, 6, 6);
  }

  mapCtx.fillStyle = "#ff4f58";
  for (const enemy of enemies) {
    mapCtx.beginPath();
    mapCtx.arc(enemy.x * sx, enemy.y * sy, 4, 0, Math.PI * 2);
    mapCtx.fill();
  }

  mapCtx.fillStyle = "#ffffff";
  mapCtx.beginPath();
  mapCtx.arc(player.x * sx, player.y * sy, 5, 0, Math.PI * 2);
  mapCtx.fill();

  mapCtx.fillStyle = "rgba(0,0,0,0.62)";
  mapCtx.fillRect(8, 8, 82, 58);
  mapCtx.font = "700 10px Arial";
  mapCtx.fillStyle = "#ffffff";
  mapCtx.fillText("white: you", 15, 23);
  mapCtx.fillStyle = "#ff4f58";
  mapCtx.fillText("red: enemy", 15, 39);
  mapCtx.fillStyle = "#ffd84f";
  mapCtx.fillText("yellow: task", 15, 55);
}

let lastTime = performance.now();
function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);

  const camera = {
    x: clamp(player.x - window.innerWidth / 2, 0, Math.max(0, world.width - window.innerWidth)),
    y: clamp(player.y - window.innerHeight / 2, 0, Math.max(0, world.height - window.innerHeight)),
  };
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawWorld(camera);
  drawMiniMap();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
