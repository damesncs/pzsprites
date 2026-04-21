import {
    setupWorld,
    COLLIDER_STATIC,
    createRectSprite,
    createCircleSprite
} from "../../js/pzsprites.js";

// =========================
// GAME STATE
// =========================
let world;
let player;

let keys = {};
let playerAngle = 0;

let bullets = [];

// =========================
// START GAME
// =========================
window.onload = function startGame() {
    world = setupWorld("canvas", 800, 600, {
        gravity: { x: 0, y: 0 }
    });

    player = createCircleSprite(COLLIDER_STATIC, 200, 200, 10);
    player.setFillColor("blue");

    createMap();

    window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);
    window.addEventListener("mousedown", shootBullet);

    gameLoop();
};

// =========================
// MAP
// =========================
function createMap() {
    let width = 1200;
    let height = 900;
    let wallSize = 40;

    createRectSprite(COLLIDER_STATIC, width / 2, 0, width, wallSize);
    createRectSprite(COLLIDER_STATIC, width / 2, height, width, wallSize);
    createRectSprite(COLLIDER_STATIC, 0, height / 2, wallSize, height);
    createRectSprite(COLLIDER_STATIC, width, height / 2, wallSize, height);

    createRectSprite(COLLIDER_STATIC, 600, 300, 400, 20);
    createRectSprite(COLLIDER_STATIC, 600, 600, 400, 20);
}

// =========================
// MAIN LOOP
// =========================
function gameLoop() {
    updatePlayer();
    updateBullets();

    let canvas = document.getElementById("canvas");
    let ctx = canvas.getContext("2d");

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    draw3DRaycast(ctx);

    requestAnimationFrame(gameLoop);
}

// =========================
// PLAYER
// =========================
function updatePlayer() {
    let speed = 2.2;

    let moveX = 0;
    let moveY = 0;

    if (keys["w"]) {
        moveX += Math.cos(playerAngle) * speed;
        moveY += Math.sin(playerAngle) * speed;
    }

    if (keys["s"]) {
        moveX -= Math.cos(playerAngle) * speed;
        moveY -= Math.sin(playerAngle) * speed;
    }

    if (keys["a"]) playerAngle -= 0.03;
    if (keys["d"]) playerAngle += 0.03;

    movePlayer(moveX, moveY);

    let pos = player.getPosition();
    world.setCameraPosition(pos.x, pos.y);
}

function movePlayer(dx, dy) {
    let pos = player.getPosition();

    if (!isWall(pos.x + dx, pos.y)) {
        player.setPosition({ x: pos.x + dx, y: pos.y });
    }

    if (!isWall(pos.x, pos.y + dy)) {
        player.setPosition({ x: pos.x, y: pos.y + dy });
    }
}

// =========================
// BULLETS
// =========================
function shootBullet() {
    let pos = player.getPosition();

    bullets.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(playerAngle) * 10,
        vy: Math.sin(playerAngle) * 10,
        life: 200
    });
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];

        if (isWall(b.x + b.vx, b.y)) b.vx *= -1;
        if (isWall(b.x, b.y + b.vy)) b.vy *= -1;

        b.x += b.vx;
        b.y += b.vy;

        b.life--;

        if (b.life <= 0) bullets.splice(i, 1);
    }
}

// =========================
// 3D RENDER (WALLS + BULLETS)
// =========================
function draw3DRaycast(ctx) {
    let FOV = Math.PI / 3;
    let rays = 200;

    let pos = player.getPosition();

    const screenWidth = rays * 4;
    const screenHeight = 600;

    // =========================
    // WALLS
    // =========================
    for (let i = 0; i < rays; i++) {
        let rayAngle = playerAngle - FOV / 2 + (i / rays) * FOV;

        let hit = castRay(pos.x, pos.y, rayAngle);

        let correctedDist = hit.dist * Math.cos(rayAngle - playerAngle);

        let wallHeight = 6000 / (correctedDist + 0.001);
        let shade = Math.max(0, 255 - correctedDist * 0.8);

        ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
        ctx.fillRect(i * 4, screenHeight / 2 - wallHeight / 2, 4, wallHeight);
    }

    // =========================
    // BULLETS (CIRCLES)
    // =========================
    let sprites = [];

    for (let b of bullets) {
        let dx = b.x - pos.x;
        let dy = b.y - pos.y;

        let dist = Math.hypot(dx, dy);

        let angleToBullet = Math.atan2(dy, dx);
        let relAngle = angleToBullet - playerAngle;

        relAngle = Math.atan2(Math.sin(relAngle), Math.cos(relAngle));

        if (Math.abs(relAngle) > FOV / 2) continue;

        let correctedDist = dist * Math.cos(relAngle);

        let screenX = ((relAngle + FOV / 2) / FOV) * screenWidth;

        let size = 1200 / (correctedDist + 0.001);

        sprites.push({
            x: screenX,
            y: screenHeight / 2,
            size,
            dist: correctedDist
        });
    }

    sprites.sort((a, b) => b.dist - a.dist);

    for (let s of sprites) {
        let shade = Math.max(80, 255 - s.dist * 2);

        let radius = Math.max(1, s.size * 0.25);

        ctx.fillStyle = `rgb(${shade}, 50, 50)`;

        ctx.beginPath();
        ctx.arc(
            s.x + 2,
            s.y,
            radius,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.strokeStyle = "rgba(0,0,0,0.4)";
        ctx.stroke();
    }
}

// =========================
// RAYCAST
// =========================
function castRay(x, y, angle) {
    let step = 2;
    let maxDist = 1000;

    let dx = Math.cos(angle) * step;
    let dy = Math.sin(angle) * step;

    for (let i = 0; i < maxDist; i += step) {
        x += dx;
        y += dy;

        if (isWall(x, y)) {
            return { x, y, dist: i };
        }
    }

    return { x, y, dist: maxDist };
}

// =========================
// COLLISION
// =========================
function isWall(x, y) {
    for (let body = world.getBodyList(); body; body = body.getNext()) {
        for (let f = body.getFixtureList(); f; f = f.getNext()) {
            if (body === player) continue;

            if (f.testPoint({ x, y })) {
                return true;
            }
        }
    }
    return false;
}