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
const resetButtons = document.querySelectorAll("[data-reset]");

const world = { width: 5400, height: 4000 };
const keys = new Set();
const maxLives = 5;
const enemyVisionRange = 520;
const enemyVisionAngle = Math.PI * 0.62;
const enemyCloseDetectRange = 115;
const maxStamina = 100;
const maxWarpCharges = 2;

const playerStart = { x: 2912, y: 2462 };
const startSafeZone = { x: playerStart.x - 190, y: playerStart.y - 140, w: 380, h: 280 };
const player = {
  ...playerStart,
  angle: 0,
  score: 0,
  lives: maxLives,
  radius: 15,
  stamina: maxStamina,
  invincible: 0,
  speedBoost: 0,
  invisible: 0,
  revealMap: 0,
  deathEffect: 0,
  spottedCooldown: 0,
  spotted: false,
  hiding: false,
  activeTask: null,
  taskProgress: 0,
  warps: 1,
  tasksCompleted: 0,
  catches: 0,
  itemsUsed: 0,
  time: 0,
  lastVisibleX: playerStart.x,
  lastVisibleY: playerStart.y,
  won: false,
  lost: false,
};

let audioContext;
let alertActive = false;
let bgmTimer = null;
let bgmStep = 0;

const zones = [
  { name: "Park", detail: "木が多い広場", x: 0, y: 0, w: 1800, h: 1334, color: "#45664d" },
  { name: "Town", detail: "建物が多い住宅街", x: 1800, y: 0, w: 1800, h: 1334, color: "#4e5961" },
  { name: "Market", detail: "道が広い商店街", x: 3600, y: 0, w: 1800, h: 1334, color: "#5f5748" },
  { name: "School", detail: "校舎と中庭", x: 0, y: 1334, w: 1800, h: 1333, color: "#5b5448" },
  { name: "Station", detail: "中央駅エリア", x: 1800, y: 1334, w: 1800, h: 1333, color: "#51495e" },
  { name: "Harbor", detail: "倉庫と港", x: 3600, y: 1334, w: 1800, h: 1333, color: "#3f5961" },
  { name: "Forest", detail: "暗い外周林", x: 0, y: 2667, w: 1800, h: 1333, color: "#364f42" },
  { name: "Factory", detail: "大きな工場地帯", x: 1800, y: 2667, w: 1800, h: 1333, color: "#57514a" },
  { name: "Docks", detail: "広い埠頭", x: 3600, y: 2667, w: 1800, h: 1333, color: "#405862" },
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
  { x: 4890, y: 2774, w: 88, h: 96, color: "#73585f" },
];

const enemyStarts = [
  { x: 762, y: 3542 },
  { x: 5062, y: 1022 },
  { x: 5062, y: 3542 },
  { x: 3342, y: 1022 },
  { x: 2052, y: 1022 },
  { x: 4632, y: 3542 },
  { x: 2052, y: 3542 },
  { x: 5062, y: 2462 },
];

const enemyProfiles = [
  { name: "Runner", speed: 250, vision: 430, angle: Math.PI * 0.5, color: "#e04f4f" },
  { name: "Watcher", speed: 190, vision: 650, angle: Math.PI * 0.82, color: "#ff6b4a" },
  { name: "Tracker", speed: 220, vision: 520, angle: Math.PI * 0.62, color: "#d93b70", memory: 1.35 },
  { name: "Sentry", speed: 205, vision: 700, angle: Math.PI * 0.48, color: "#c944e0" },
];

const enemies = enemyStarts.map((start, index) => {
  const profile = enemyProfiles[index % enemyProfiles.length];
  return {
    ...start,
    profile,
    speed: profile.speed,
    radius: index === 2 ? 19 : index % 3 === 2 ? 18 : 17,
    color: profile.color,
    roleAngle: [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI * 3 / 4, Math.PI * 3 / 4, -Math.PI / 4][index],
    facing: 0,
    stuckTime: 0,
    stunned: 0,
    escapeTarget: null,
  };
});

function resize() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keys.add(key);
  ensureAudio();
  if (key === "r") useWarp();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
resetButtons.forEach((button) => button.addEventListener("click", resetGame));
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

function currentAlertLevel() {
  const completedRatio = player.tasksCompleted / Math.max(1, tasks.length);
  const zonePressure = currentZone()?.name === "Station" ? 1 : 0;
  return clamp(Math.floor(completedRatio * 4) + (player.spotted ? 1 : 0) + zonePressure, 0, 5);
}

function nearbyHideSpot() {
  return hideSpots.find((spot) => Math.hypot(player.x - spot.x, player.y - spot.y) < spot.radius + 22);
}

function useWarp() {
  if (player.warps <= 0 || player.won || player.lost) return;
  player.warps -= 1;
  player.itemsUsed += 1;
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.invincible = 1.4;
  player.spotted = false;
  stopBgm();
  startBgm();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function createTasks() {
  const generated = [];
  let candidateIndex = 0;
  const blockedPoints = [...enemyStarts, playerStart];
  const verticalRoads = roads.filter((road) => road.h > road.w);
  const horizontalRoads = roads.filter((road) => road.w > road.h);

  for (const verticalRoad of verticalRoads) {
    for (const horizontalRoad of horizontalRoads) {
      const task = {
        x: verticalRoad.x + verticalRoad.w / 2,
        y: horizontalRoad.y + horizontalRoad.h / 2,
        type: candidateIndex % 9 === 4 ? "repair" : candidateIndex % 11 === 6 ? "risk" : "collect",
        value: candidateIndex % 11 === 6 ? 240 : 100,
        duration: candidateIndex % 9 === 4 ? 1.35 : 0,
        taken: false,
      };
      const tooCloseToEdge = task.x < 520 || task.y < 520 || task.x > world.width - 520 || task.y > world.height - 520;
      const tooCloseToBlockedPoint = blockedPoints.some((point) => Math.hypot(point.x - task.x, point.y - task.y) < 210);
      if (!tooCloseToEdge && !tooCloseToBlockedPoint && canMoveTo(task.x, task.y, 16)) {
        const keepSpecial = task.type !== "collect";
        if (keepSpecial || candidateIndex % 2 === 0) generated.push(task);
        candidateIndex += 1;
      }
    }
  }

  return generated;
}

const tasks = createTasks();
const roadNodes = tasks.map((task) => ({ x: task.x, y: task.y }));
const roadGraph = createRoadGraph();

function createPowerUps() {
  const generated = [];
  const taskPoints = tasks.filter((_, index) => index % 4 === 2);
  const types = ["speed", "invisible", "warp", "reveal", "life"];

  for (let i = 0; i < taskPoints.length && generated.length < 14; i++) {
    const point = taskPoints[i];
    const tooCloseToStart = Math.hypot(point.x - playerStart.x, point.y - playerStart.y) < 420;
    const tooCloseToOther = generated.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 560);
    if (!tooCloseToStart && !tooCloseToOther && canMoveTo(point.x, point.y, 16)) {
      generated.push({
        x: point.x,
        y: point.y,
        type: types[generated.length % types.length],
        taken: false,
      });
    }
  }

  return generated;
}

const powerUps = createPowerUps();
const hideSpots = tasks
  .filter((task, index) => index % 10 === 1 && Math.hypot(task.x - playerStart.x, task.y - playerStart.y) > 520)
  .slice(0, 18)
  .map((task, index) => ({
    x: task.x + (index % 2 ? 34 : -34),
    y: task.y + (index % 3 ? -28 : 28),
    radius: 36,
  }))
  .filter((spot) => canMoveTo(spot.x, spot.y, 15));

function inStartSafeZone(x, y) {
  return x >= startSafeZone.x && x <= startSafeZone.x + startSafeZone.w && y >= startSafeZone.y && y <= startSafeZone.y + startSafeZone.h;
}

function currentZone() {
  return zones.find((item) => (
    player.x >= item.x && player.x < item.x + item.w && player.y >= item.y && player.y < item.y + item.h
  ));
}

function clearLineOnRoad(x1, y1, x2, y2, radius) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(distance / 42));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (!canMoveTo(x, y, radius)) return false;
  }
  return true;
}

function angleDifference(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function hasClearSight(x1, y1, x2, y2) {
  const distance = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(distance / 36));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (circleBlocked(x, y, 10)) return false;
  }
  return true;
}

function canEnemySeePlayer(enemy, visible, playerDistance) {
  if (!visible || player.invincible > 0 || player.hiding) return false;
  if (!hasClearSight(enemy.x, enemy.y, player.x, player.y)) return false;
  if (playerDistance < enemyCloseDetectRange) return true;
  const range = enemy.profile?.vision || enemyVisionRange;
  const angle = enemy.profile?.angle || enemyVisionAngle;
  if (playerDistance > range) return false;

  const angleToPlayer = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  return Math.abs(angleDifference(angleToPlayer, enemy.facing || 0)) < angle / 2;
}

function nearestRoadNode(x, y, radius) {
  let best = null;
  let bestDistance = Infinity;
  for (const node of roadNodes) {
    const distance = Math.hypot(node.x - x, node.y - y);
    if (distance < bestDistance && clearLineOnRoad(x, y, node.x, node.y, radius)) {
      best = node;
      bestDistance = distance;
    }
  }
  return best;
}

function createRoadGraph() {
  return roadNodes.map((node) => {
    const neighbors = roadNodes
      .map((other, index) => ({ ...other, index, distance: Math.hypot(other.x - node.x, other.y - node.y) }))
      .filter((other) => other.distance > 0 && other.distance < 470 && clearLineOnRoad(node.x, node.y, other.x, other.y, 17))
      .map((other) => ({ index: other.index, distance: other.distance }));
    return neighbors;
  });
}

function nodeIndex(node) {
  return roadNodes.findIndex((item) => item === node || (Math.abs(item.x - node.x) < 4 && Math.abs(item.y - node.y) < 4));
}

function shortestRoadStep(enemy, targetX, targetY) {
  if (clearLineOnRoad(enemy.x, enemy.y, targetX, targetY, enemy.radius)) {
    return { x: targetX, y: targetY };
  }

  const startNode = nearestRoadNode(enemy.x, enemy.y, enemy.radius);
  const goalNode = nearestRoadNode(targetX, targetY, enemy.radius);
  const start = startNode ? nodeIndex(startNode) : -1;
  const goal = goalNode ? nodeIndex(goalNode) : -1;
  if (start < 0 || goal < 0) return { x: targetX, y: targetY };
  if (start === goal) return goalNode;

  const distances = new Array(roadNodes.length).fill(Infinity);
  const previous = new Array(roadNodes.length).fill(-1);
  const visited = new Set();
  distances[start] = 0;

  while (visited.size < roadNodes.length) {
    let current = -1;
    let bestDistance = Infinity;
    for (let i = 0; i < distances.length; i++) {
      if (!visited.has(i) && distances[i] < bestDistance) {
        current = i;
        bestDistance = distances[i];
      }
    }
    if (current === -1) break;
    if (current === goal) break;
    visited.add(current);
    for (const next of roadGraph[current]) {
      const nextDistance = distances[current] + next.distance;
      if (nextDistance >= distances[next.index]) continue;
      distances[next.index] = nextDistance;
      previous[next.index] = current;
    }
  }

  if (previous[goal] === -1) return startNode;

  let step = goal;
  while (previous[step] !== start) step = previous[step];
  const nextNode = roadNodes[step];
  return clearLineOnRoad(enemy.x, enemy.y, nextNode.x, nextNode.y, enemy.radius) ? nextNode : startNode;
}

function getEnemyTarget(enemy, targetX, targetY) {
  return shortestRoadStep(enemy, targetX, targetY);
}

function chooseEscapeTarget(enemy, targetX, targetY) {
  const candidates = roadNodes
    .filter((node) => {
      const distance = Math.hypot(node.x - enemy.x, node.y - enemy.y);
      return distance > 90 && distance < 620 && clearLineOnRoad(enemy.x, enemy.y, node.x, node.y, enemy.radius);
    })
    .sort((a, b) => {
      const aScore = Math.hypot(a.x - targetX, a.y - targetY) + Math.hypot(a.x - enemy.x, a.y - enemy.y) * 0.35;
      const bScore = Math.hypot(b.x - targetX, b.y - targetY) + Math.hypot(b.x - enemy.x, b.y - enemy.y) * 0.35;
      return aScore - bScore;
    });

  return candidates[0] || nearestRoadNode(enemy.x, enemy.y, enemy.radius);
}

function ensureAudio() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  startBgm();
}

function stopBgm() {
  if (bgmTimer) {
    window.clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function playBgmNote(frequency, start, duration, volume, type = "square") {
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function tickBgm() {
  if (!audioContext || alertActive || player.won || player.lost) return;

  const now = audioContext.currentTime;
  const bass = [110, 110, 146.83, 146.83, 130.81, 130.81, 164.81, 196];
  const melody = [440, 0, 523.25, 587.33, 659.25, 0, 587.33, 523.25, 493.88, 0, 440, 392, 440, 523.25, 587.33, 0];
  const step = bgmStep % melody.length;

  playBgmNote(bass[bgmStep % bass.length], now, 0.16, 0.035, "triangle");
  if (melody[step]) playBgmNote(melody[step], now, 0.11, 0.032, "square");
  if (step % 4 === 2) playBgmNote(880, now, 0.035, 0.014, "sine");

  bgmStep += 1;
}

function startBgm() {
  if (!audioContext || bgmTimer || alertActive || player.won || player.lost) return;
  tickBgm();
  bgmTimer = window.setInterval(tickBgm, 180);
}

function startAlertMusic() {
  if (!audioContext || alertActive || player.won || player.lost) return;
  stopBgm();
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
    startBgm();
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

function resetGame() {
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.angle = 0;
  player.score = 0;
  player.lives = maxLives;
  player.stamina = maxStamina;
  player.invincible = 0;
  player.speedBoost = 0;
  player.invisible = 0;
  player.revealMap = 0;
  player.deathEffect = 0;
  player.spottedCooldown = 0;
  player.spotted = false;
  player.hiding = false;
  player.activeTask = null;
  player.taskProgress = 0;
  player.warps = 1;
  player.tasksCompleted = 0;
  player.catches = 0;
  player.itemsUsed = 0;
  player.time = 0;
  player.lastVisibleX = playerStart.x;
  player.lastVisibleY = playerStart.y;
  player.won = false;
  player.lost = false;

  tasks.forEach((task) => {
    task.taken = false;
  });
  powerUps.forEach((powerUp) => {
    powerUp.taken = false;
  });
  enemies.forEach((enemy, index) => {
    enemy.x = enemyStarts[index].x;
    enemy.y = enemyStarts[index].y;
    enemy.stuckTime = 0;
    enemy.stunned = 0;
    enemy.facing = 0;
    enemy.escapeTarget = null;
  });

  winScreen.hidden = true;
  loseScreen.hidden = true;
  winScreen.querySelector("p").textContent = "すべてのタスクを集めました。";
  loseScreen.querySelector("p").textContent = "残機をすべて使い切りました。";
  startBgm();
}

function resetAfterTag() {
  player.x = playerStart.x;
  player.y = playerStart.y;
  player.invincible = 2.2;
  player.invisible = 0;
  player.hiding = false;
  player.activeTask = null;
  player.taskProgress = 0;
  player.spotted = false;
  player.catches += 1;
  enemies.forEach((enemy, index) => {
    enemy.x = enemyStarts[index].x;
    enemy.y = enemyStarts[index].y;
    enemy.stuckTime = 0;
    enemy.stunned = 0;
    enemy.facing = 0;
    enemy.escapeTarget = null;
  });
}

function updatePlayer(dt) {
  const zoneName = currentZone()?.name || "";
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const moving = up || down || left || right;
  const naturalCover = zoneName === "Park" || zoneName === "Forest";
  player.hiding = keys.has("e") && (nearbyHideSpot() || naturalCover) && !moving;
  if (player.hiding) {
    player.stamina = Math.min(maxStamina, player.stamina + (naturalCover ? 30 : 20) * dt);
    player.activeTask = null;
    player.taskProgress = 0;
    return;
  }

  const boost = keys.has("shift") && player.stamina > 4 && moving;
  const terrainSlow = zoneName === "Docks" || zoneName === "Harbor" ? 0.92 : 1;
  const baseSpeed = (player.speedBoost > 0 ? 285 : 220) * terrainSlow;
  const moveSpeed = boost ? baseSpeed * 1.5 : baseSpeed;
  player.stamina = clamp(player.stamina + (boost ? -34 : 24) * dt, 0, maxStamina);

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

  let touchingTask = null;
  for (const task of tasks) {
    if (!task.taken && Math.hypot(player.x - task.x, player.y - task.y) < 56) {
      touchingTask = task;
      if (task.duration > 0) {
        const requiredDuration = task.duration + (zoneName === "Factory" ? 0.55 : 0);
        if (player.activeTask !== task) {
          player.activeTask = task;
          player.taskProgress = 0;
        }
        player.taskProgress += dt;
        if (player.taskProgress < requiredDuration) break;
      }

      task.taken = true;
      player.activeTask = null;
      player.taskProgress = 0;
      player.tasksCompleted += 1;
      const zoneBonus = zoneName === "Market" ? 25 : zoneName === "Station" ? 45 : 0;
      player.score += task.value + zoneBonus + currentAlertLevel() * (task.type === "risk" ? 35 : 10);
      if (task.type === "risk") player.spottedCooldown = 0;
      playTaskSound();
      break;
    }
  }
  if (!touchingTask) {
    player.activeTask = null;
    player.taskProgress = 0;
  }

  for (const powerUp of powerUps) {
    if (!powerUp.taken && Math.hypot(player.x - powerUp.x, player.y - powerUp.y) < 48) {
      powerUp.taken = true;
      if (powerUp.type === "speed") {
        player.speedBoost = 7.5;
      } else if (powerUp.type === "invisible") {
        player.invisible = 6;
      } else if (powerUp.type === "warp") {
        player.warps = Math.min(maxWarpCharges, player.warps + 1);
      } else if (powerUp.type === "reveal") {
        player.revealMap = 9;
      } else if (powerUp.type === "life") {
        player.lives = Math.min(maxLives, player.lives + 1);
      }
      playTaskSound();
    }
  }
}

function updateEnemies(dt) {
  const safe = inStartSafeZone(player.x, player.y);
  const visible = !safe && player.invisible <= 0 && !player.hiding;
  const alertLevel = currentAlertLevel();
  let spotted = false;

  if (visible) {
    player.lastVisibleX = player.x;
    player.lastVisibleY = player.y;
  }

  for (let index = 0; index < enemies.length; index++) {
    const enemy = enemies[index];
    const patrolAngle = performance.now() / 900 + index * 2;
    if (enemy.stunned > 0) {
      enemy.stunned = Math.max(0, enemy.stunned - dt);
      continue;
    }

    let targetX = player.x;
    let targetY = player.y;

    if (safe) {
      targetX = enemy.x + Math.cos(patrolAngle) * 140;
      targetY = enemy.y + Math.sin(patrolAngle) * 140;
    } else if (!visible) {
      const memory = enemy.profile?.memory || 1;
      targetX = player.lastVisibleX + Math.cos(patrolAngle + enemy.roleAngle) * 260 * memory;
      targetY = player.lastVisibleY + Math.sin(patrolAngle + enemy.roleAngle) * 260 * memory;
    }

    targetX = clamp(targetX, enemy.radius, world.width - enemy.radius);
    targetY = clamp(targetY, enemy.radius, world.height - enemy.radius);
    let target = { x: targetX, y: targetY };
    const directPathOpen = clearLineOnRoad(enemy.x, enemy.y, targetX, targetY, enemy.radius);
    if (!directPathOpen) target = getEnemyTarget(enemy, targetX, targetY);
    if (enemy.escapeTarget) {
      target = enemy.escapeTarget;
      if (Math.hypot(enemy.x - target.x, enemy.y - target.y) < 34 || clearLineOnRoad(enemy.x, enemy.y, targetX, targetY, enemy.radius)) {
        enemy.escapeTarget = null;
        enemy.stuckTime = 0;
        target = getEnemyTarget(enemy, targetX, targetY);
      }
    }

    const chaseSpeed = visible ? enemy.speed + alertLevel * 13 : enemy.speed - 45 + alertLevel * 5;
    const speed = safe ? enemy.speed * 0.32 : chaseSpeed;
    const step = speed * dt;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const xFirst = Math.abs(dx) > Math.abs(dy);
    const beforeX = enemy.x;
    const beforeY = enemy.y;
    const moveX = (direction = Math.sign(dx)) => {
      const nx = clamp(enemy.x + direction * Math.min(Math.abs(dx) || step, step), enemy.radius, world.width - enemy.radius);
      if (canMoveTo(nx, enemy.y, enemy.radius)) {
        enemy.x = nx;
        return true;
      }
      return false;
    };
    const moveY = (direction = Math.sign(dy)) => {
      const ny = clamp(enemy.y + direction * Math.min(Math.abs(dy) || step, step), enemy.radius, world.height - enemy.radius);
      if (canMoveTo(enemy.x, ny, enemy.radius)) {
        enemy.y = ny;
        return true;
      }
      return false;
    };

    if (xFirst) {
      if (!moveX() && !moveY()) {
        if (!moveY(-Math.sign(dy) || 1)) moveX(-Math.sign(dx) || 1);
      }
    } else if (!moveY() && !moveX()) {
      if (!moveX(-Math.sign(dx) || 1)) moveY(-Math.sign(dy) || 1);
    }

    const moved = Math.hypot(enemy.x - beforeX, enemy.y - beforeY);
    if (moved > 1) enemy.facing = Math.atan2(enemy.y - beforeY, enemy.x - beforeX);

    const stillTrying = Math.hypot(enemy.x - targetX, enemy.y - targetY) > 120;
    enemy.stuckTime = moved < 6 && stillTrying ? enemy.stuckTime + dt : Math.max(0, enemy.stuckTime - dt * 2);
    if (enemy.stuckTime > 0.45) {
      enemy.escapeTarget = chooseEscapeTarget(enemy, targetX, targetY);
      enemy.stuckTime = 0;
    }

    const playerDistance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (canEnemySeePlayer(enemy, visible, playerDistance)) spotted = true;

    if (visible && player.invincible <= 0 && playerDistance < player.radius + enemy.radius) {
      player.lives -= 1;
      if (player.lives <= 0) {
        player.lives = 0;
        player.lost = true;
        loseScreen.hidden = false;
        loseScreen.querySelector("p").textContent = `Time ${formatTime(player.time)} / Score ${player.score} / Tasks ${player.tasksCompleted}`;
        stopBgm();
        return;
      }
      player.deathEffect = 1.15;
      resetAfterTag();
    }
  }

  player.spotted = spotted;
  if (spotted) {
    stopBgm();
    if (player.spottedCooldown <= 0) {
      startAlertMusic();
      player.spottedCooldown = 2.4;
    }
  } else if (!alertActive) {
    startBgm();
  }
}

function update(dt) {
  if (player.won || player.lost) return;
  player.time += dt;
  player.invincible = Math.max(0, player.invincible - dt);
  player.speedBoost = Math.max(0, player.speedBoost - dt);
  player.invisible = Math.max(0, player.invisible - dt);
  player.revealMap = Math.max(0, player.revealMap - dt);
  player.deathEffect = Math.max(0, player.deathEffect - dt);
  player.spottedCooldown = Math.max(0, player.spottedCooldown - dt);
  updatePlayer(dt);
  updateEnemies(dt);

  const zone = currentZone();
  const remaining = tasks.filter((task) => !task.taken).length;
  if (remaining === 0) {
    player.won = true;
    winScreen.hidden = false;
    winScreen.querySelector("p").textContent = `Time ${formatTime(player.time)} / Catches ${player.catches} / Items ${player.itemsUsed}`;
    stopBgm();
  }
  scoreEl.textContent = `${player.score} pts`;
  const effects = [
    player.speedBoost > 0 ? `Speed ${Math.ceil(player.speedBoost)}s` : "",
    player.invisible > 0 ? `透明 ${Math.ceil(player.invisible)}s` : "",
    player.revealMap > 0 ? `Map ${Math.ceil(player.revealMap)}s` : "",
    player.hiding ? "Hide" : "",
  ].filter(Boolean);
  statusEl.textContent = effects.join(" / ") || (inStartSafeZone(player.x, player.y) ? "Start Safe" : zone?.name || "Map");
  areaBanner.textContent = zone?.name || "Map";
  lifeEl.textContent = `残機 ${player.lives} / Task ${remaining} / Lv ${currentAlertLevel()} / ST ${Math.round(player.stamina)}`;
}

function drawWorld(camera) {
  const playerScreenX = player.x - camera.x;
  const playerScreenY = player.y - camera.y;

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

  for (const spot of hideSpots) drawHideSpot(spot.x - camera.x, spot.y - camera.y, spot === nearbyHideSpot());
  for (const task of tasks) {
    if (!task.taken) drawTask(task.x - camera.x, task.y - camera.y, task);
  }

  for (const powerUp of powerUps) {
    if (!powerUp.taken) drawPowerUp(powerUp.x - camera.x, powerUp.y - camera.y, powerUp.type);
  }

  for (const enemy of enemies) drawEnemyVision(enemy, camera);
  for (const enemy of enemies) drawEnemy(enemy.x - camera.x, enemy.y - camera.y, enemy.color);
  drawPlayer(playerScreenX, playerScreenY);

  if (player.invincible > 0) {
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(playerScreenX, playerScreenY, 34, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (player.speedBoost > 0 || player.invisible > 0) {
    ctx.save();
    ctx.translate(playerScreenX, playerScreenY);
    ctx.strokeStyle = player.invisible > 0 ? "rgba(120, 235, 255, 0.72)" : "rgba(81, 238, 141, 0.72)";
    ctx.lineWidth = 4;
    ctx.setLineDash([9, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (player.deathEffect > 0) drawDeathEffect(playerScreenX, playerScreenY);
  if (player.spotted) drawSpottedOverlay();
  drawPlayerMeters();
}

function drawTask(x, y, task) {
  const color = task.type === "repair" ? "#ffb14f" : task.type === "risk" ? "#ff4f7a" : "#ffd84f";
  ctx.fillStyle = task.type === "risk" ? "rgba(255,79,122,0.22)" : "rgba(255,216,79,0.2)";
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();
  if (task.type === "repair") drawWrench(x, y, color);
  else drawStar(x, y, 18, color);
  if (player.activeTask === task) {
    const displayDuration = task.duration + (currentZone()?.name === "Factory" ? 0.55 : 0);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, 38, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, player.taskProgress / displayDuration));
    ctx.stroke();
  }
}

function drawDeathEffect(cx, cy) {
  const progress = 1 - player.deathEffect / 1.15;
  ctx.save();
  ctx.fillStyle = `rgba(210, 24, 38, ${0.32 * (1 - progress)})`;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.strokeStyle = `rgba(255, 235, 220, ${0.85 * (1 - progress)})`;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 36 + progress * 96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * (1 - progress)})`;
  ctx.font = "900 42px Arial";
  ctx.textAlign = "center";
  ctx.fillText("HIT", cx, cy - 54);
  ctx.restore();
}

function drawPowerUp(x, y, type) {
  const isSpeed = type === "speed";
  const colors = {
    speed: "#51ee8d",
    invisible: "#78ebff",
    warp: "#b991ff",
    reveal: "#ff8ee2",
    life: "#ff6f8f",
  };
  const color = colors[type] || "#ffffff";
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = `${color}33`;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#101214";
  ctx.lineWidth = 3;
  if (isSpeed) {
    ctx.beginPath();
    ctx.moveTo(-9, -18);
    ctx.lineTo(10, -2);
    ctx.lineTo(1, -2);
    ctx.lineTo(9, 18);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (type === "invisible") {
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#101214";
    ctx.beginPath();
    ctx.arc(-6, -3, 3, 0, Math.PI * 2);
    ctx.arc(6, -3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "warp") {
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 1.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -16);
    ctx.lineTo(20, -7);
    ctx.lineTo(8, -5);
    ctx.fill();
  } else if (type === "reveal") {
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(22, -8, 14, 18, 0, 20);
    ctx.bezierCurveTo(-14, 18, -22, -8, 0, -18);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawHideSpot(x, y, active) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = active ? "rgba(126, 235, 255, 0.34)" : "rgba(45, 92, 60, 0.56)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = active ? "#baf7ff" : "rgba(12, 30, 18, 0.8)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawPlayerMeters() {
  const x = 22;
  const y = window.innerHeight - 70;
  ctx.save();
  ctx.fillStyle = "rgba(8, 12, 14, 0.72)";
  ctx.fillRect(x - 10, y - 16, 330, 58);
  ctx.fillStyle = "#d8dde2";
  ctx.font = "800 12px Arial";
  ctx.fillText(`STAMINA ${Math.round(player.stamina)}`, x, y - 2);
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(x, y + 8, 180, 12);
  ctx.fillStyle = player.stamina < 24 ? "#ff5c65" : "#51ee8d";
  ctx.fillRect(x, y + 8, 180 * (player.stamina / maxStamina), 12);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`R Warp ${player.warps}   E Hide`, x + 195, y + 19);
  if (player.activeTask) ctx.fillText("Hold position to finish repair", x, y + 38);
  ctx.restore();
}

function drawWrench(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.7);
  ctx.strokeStyle = color;
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-14, 12);
  ctx.lineTo(12, -14);
  ctx.stroke();
  ctx.restore();
}

function drawEnemyVision(enemy, camera) {
  if (enemy.stunned > 0) return;
  const x = enemy.x - camera.x;
  const y = enemy.y - camera.y;
  const facing = enemy.facing || 0;
  const range = enemy.profile?.vision || enemyVisionRange;
  const angle = enemy.profile?.angle || enemyVisionAngle;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(facing);
  ctx.fillStyle = player.spotted ? "rgba(255, 62, 72, 0.16)" : "rgba(255, 216, 79, 0.08)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, range, -angle / 2, angle / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSpottedOverlay() {
  ctx.save();
  ctx.fillStyle = "rgba(190, 18, 32, 0.16)";
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.strokeStyle = "rgba(255, 43, 58, 0.55)";
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, window.innerWidth - 12, window.innerHeight - 12);
  ctx.restore();
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
  ctx.globalAlpha = player.invisible > 0 ? 0.42 : 1;
  ctx.fillStyle = player.invincible > 0 ? "#9de6ff" : player.speedBoost > 0 ? "#d8ffd6" : "#f2f2ec";
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
    if (task.taken) continue;
    mapCtx.fillStyle = task.type === "repair" ? "#ffb14f" : task.type === "risk" ? "#ff4f7a" : "#ffd84f";
    mapCtx.fillRect(task.x * sx - 3, task.y * sy - 3, 6, 6);
  }

  for (const powerUp of powerUps) {
    if (powerUp.taken) continue;
    const colors = {
      speed: "#51ee8d",
      invisible: "#78ebff",
      warp: "#b991ff",
      reveal: "#ff8ee2",
      life: "#ff6f8f",
    };
    mapCtx.fillStyle = colors[powerUp.type] || "#ffffff";
    mapCtx.beginPath();
    mapCtx.arc(powerUp.x * sx, powerUp.y * sy, 4, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = "#101214";
    mapCtx.lineWidth = 1;
    mapCtx.stroke();
  }

  mapCtx.fillStyle = "#ff4f58";
  for (const enemy of enemies) {
    mapCtx.beginPath();
    mapCtx.arc(enemy.x * sx, enemy.y * sy, 4.5, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.strokeStyle = "#101214";
    mapCtx.lineWidth = 1;
    mapCtx.stroke();
  }

  mapCtx.fillStyle = "#ffffff";
  mapCtx.beginPath();
  mapCtx.arc(player.x * sx, player.y * sy, 5, 0, Math.PI * 2);
  mapCtx.fill();

  mapCtx.fillStyle = "rgba(0,0,0,0.66)";
  mapCtx.fillRect(8, 8, 112, 74);
  mapCtx.font = "700 10px Arial";
  mapCtx.fillStyle = "#ffffff";
  mapCtx.fillText("white: you", 15, 23);
  mapCtx.fillStyle = "#ff4f58";
  mapCtx.fillText("red: enemy", 15, 39);
  mapCtx.fillStyle = "#ffd84f";
  mapCtx.fillText("yellow: task", 15, 55);
  mapCtx.fillStyle = "#78ebff";
  mapCtx.fillText("color: item", 15, 71);
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
