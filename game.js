const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const miniMap = document.querySelector("#miniMap");
const mapCtx = miniMap.getContext("2d");

const speedEl = document.querySelector("#speed");
const areaEl = document.querySelector("#area");
const cashEl = document.querySelector("#cash");

const world = { width: 3600, height: 2600 };
const keys = new Set();
const player = {
  x: world.width / 2,
  y: world.height / 2,
  angle: 0,
  speed: 0,
  cash: 250,
  radius: 15,
};

const districts = [
  { name: "Downtown", x: 0, y: 0, w: 1800, h: 1300, color: "#37434a" },
  { name: "Harbor", x: 1800, y: 0, w: 1800, h: 1300, color: "#273f4a" },
  { name: "Midtown", x: 0, y: 1300, w: 1800, h: 1300, color: "#3b4137" },
  { name: "Industrial", x: 1800, y: 1300, w: 1800, h: 1300, color: "#453d35" },
];

const roads = [];
for (let x = 260; x < world.width; x += 420) roads.push({ x, y: 0, w: 82, h: world.height });
for (let y = 240; y < world.height; y += 380) roads.push({ x: 0, y, w: world.width, h: 82 });

const buildings = [];
for (let row = 0; row < 7; row++) {
  for (let col = 0; col < 9; col++) {
    const x = 380 + col * 360 + (row % 2) * 36;
    const y = 360 + row * 300;
    buildings.push({
      x,
      y,
      w: 115 + ((row + col) % 3) * 36,
      h: 95 + ((row * col + 2) % 4) * 24,
      color: ["#59636a", "#665d52", "#4d625a", "#6a514d"][(row + col) % 4],
    });
  }
}

const missions = [
  { x: 620, y: 520, label: "配達", reward: 80, done: false },
  { x: 2350, y: 720, label: "港の仕事", reward: 120, done: false },
  { x: 1080, y: 1980, label: "修理", reward: 90, done: false },
  { x: 2860, y: 1940, label: "回収", reward: 140, done: false },
];

const cars = Array.from({ length: 16 }, (_, i) => ({
  x: 160 + (i * 227) % world.width,
  y: 250 + (i * 311) % world.height,
  dir: i % 2 ? Math.PI / 2 : 0,
  speed: 65 + (i % 5) * 14,
  color: ["#b94747", "#d8b64c", "#4e89b8", "#d7d7d1"][i % 4],
}));

function resize() {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * scale);
  canvas.height = Math.floor(window.innerHeight * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
resize();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  const up = keys.has("w") || keys.has("arrowup");
  const down = keys.has("s") || keys.has("arrowdown");
  const left = keys.has("a") || keys.has("arrowleft");
  const right = keys.has("d") || keys.has("arrowright");
  const boost = keys.has("shift");
  const moveSpeed = boost ? 330 : 210;

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

  const next = {
    x: clamp(player.x + dx * moveSpeed * dt, player.radius, world.width - player.radius),
    y: clamp(player.y + dy * moveSpeed * dt, player.radius, world.height - player.radius),
  };
  const box = { x: next.x - player.radius, y: next.y - player.radius, w: player.radius * 2, h: player.radius * 2 };
  const blocked = buildings.some((building) => rectsOverlap(box, building));

  if (!blocked) {
    player.x = next.x;
    player.y = next.y;
  }
  player.speed = (dx || dy) && !blocked ? Math.round(moveSpeed / 4) : 0;

  for (const car of cars) {
    car.x += Math.cos(car.dir) * car.speed * dt;
    car.y += Math.sin(car.dir) * car.speed * dt;
    if (car.x > world.width + 80) car.x = -80;
    if (car.y > world.height + 80) car.y = -80;
  }

  for (const mission of missions) {
    if (!mission.done && Math.hypot(player.x - mission.x, player.y - mission.y) < 52) {
      mission.done = true;
      player.cash += mission.reward;
    }
  }

  const district = districts.find((item) => (
    player.x >= item.x && player.x < item.x + item.w && player.y >= item.y && player.y < item.y + item.h
  ));
  speedEl.textContent = `${player.speed} km/h`;
  areaEl.textContent = district ? district.name : "City";
  cashEl.textContent = `$${player.cash}`;
}

function drawWorld(camera) {
  for (const district of districts) {
    ctx.fillStyle = district.color;
    ctx.fillRect(district.x - camera.x, district.y - camera.y, district.w, district.h);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= world.width; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, -camera.y);
    ctx.lineTo(x - camera.x, world.height - camera.y);
    ctx.stroke();
  }

  for (const road of roads) {
    ctx.fillStyle = "#24292c";
    ctx.fillRect(road.x - camera.x, road.y - camera.y, road.w, road.h);
    ctx.fillStyle = "rgba(240, 195, 90, 0.65)";
    if (road.h > road.w) {
      for (let y = 20; y < world.height; y += 110) ctx.fillRect(road.x + road.w / 2 - 3 - camera.x, y - camera.y, 6, 44);
    } else {
      for (let x = 20; x < world.width; x += 110) ctx.fillRect(x - camera.x, road.y + road.h / 2 - 3 - camera.y, 44, 6);
    }
  }

  for (const building of buildings) {
    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(building.x + 8 - camera.x, building.y + 10 - camera.y, building.w, building.h);
    ctx.fillStyle = building.color;
    ctx.fillRect(building.x - camera.x, building.y - camera.y, building.w, building.h);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    for (let y = building.y + 18; y < building.y + building.h - 14; y += 26) {
      ctx.fillRect(building.x + 14 - camera.x, y - camera.y, building.w - 28, 6);
    }
  }

  for (const mission of missions) {
    if (mission.done) continue;
    ctx.fillStyle = "rgba(240,195,90,0.25)";
    ctx.beginPath();
    ctx.arc(mission.x - camera.x, mission.y - camera.y, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0c35a";
    ctx.beginPath();
    ctx.arc(mission.x - camera.x, mission.y - camera.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff7d8";
    ctx.font = "700 13px Arial";
    ctx.fillText(mission.label, mission.x + 18 - camera.x, mission.y + 5 - camera.y);
  }

  for (const car of cars) drawCar(car.x - camera.x, car.y - camera.y, car.dir, car.color);
  drawPlayer(window.innerWidth / 2, window.innerHeight / 2);
}

function drawCar(x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-20, -11, 40, 22);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(2, -8, 10, 16);
  ctx.restore();
}

function drawPlayer(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);
  ctx.fillStyle = "#f2f2ec";
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -13);
  ctx.lineTo(-7, 0);
  ctx.lineTo(-12, 13);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawMiniMap() {
  const sx = miniMap.width / world.width;
  const sy = miniMap.height / world.height;
  mapCtx.clearRect(0, 0, miniMap.width, miniMap.height);
  mapCtx.fillStyle = "#1a1f21";
  mapCtx.fillRect(0, 0, miniMap.width, miniMap.height);
  mapCtx.fillStyle = "#343a3d";
  for (const road of roads) mapCtx.fillRect(road.x * sx, road.y * sy, road.w * sx, road.h * sy);
  mapCtx.fillStyle = "#f0c35a";
  for (const mission of missions) {
    if (!mission.done) mapCtx.fillRect(mission.x * sx - 2, mission.y * sy - 2, 4, 4);
  }
  mapCtx.fillStyle = "#ffffff";
  mapCtx.beginPath();
  mapCtx.arc(player.x * sx, player.y * sy, 4, 0, Math.PI * 2);
  mapCtx.fill();
}

let lastTime = performance.now();
function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.033);
  lastTime = time;
  update(dt);

  const camera = {
    x: clamp(player.x - window.innerWidth / 2, 0, world.width - window.innerWidth),
    y: clamp(player.y - window.innerHeight / 2, 0, world.height - window.innerHeight),
  };
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawWorld(camera);
  drawMiniMap();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
