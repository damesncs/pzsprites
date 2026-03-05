import { 
    COLLIDER_DYNAMIC, 
    EVENT_KEY_PRESSED, 
    EVENT_KEY_RELEASED, 
    createCircleSprite, 
    renderFrame, 
    setupWorld, 
    drawText,
    getRandom,
    removeSprite
} from "../../js/pzsprites.js";

window.onload = start;

// Game variables
let world;
let players = []; // all player halves
let keys = {};
let blobs = [];
let score = 0;

const PLAYER_INITIAL_RADIUS = 10;
const FOOD_COUNT = 25000;
const FOOD_RADIUS = 3;
const BASE_SPEED = 1.5;
const SPLIT_SPEED = 10; // speed of new halves

let playerColor;
let lastDirection = { x: 0, y: -1 }; // default upward

function start() {
    world = setupWorld("canvas", 800, 600);
    world.setWorldDimensions(2000, 2000);
    world.setGravity({ x: 0, y: 0 });

    // === Player color ===
    playerColor = getRandomColor();

    // === Player ===
    const player = createPlayer(1000, 1000, PLAYER_INITIAL_RADIUS, playerColor);
    players.push(player);

    // === Food ===
    for (let i = 0; i < FOOD_COUNT; i++) {
        const color = getRandomColor();
        const food = createCircleSprite(
            COLLIDER_DYNAMIC,
            getRandom(100, 1900),
            getRandom(100, 1900),
            FOOD_RADIUS
        );
        food.radius = FOOD_RADIUS;
        food.setFillColor(color);
        food.setStrokeColor(getDarkerColor(color));
        food.setStrokeWidth(1);
        blobs.push(food);
    }

    // === Input ===
    addEventListener(EVENT_KEY_PRESSED, e => {
        keys[e.key] = true;

        if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
            lastDirection = getDirectionVector(e.key);
        }

        if (e.key === " ") splitPlayers();
    });
    addEventListener(EVENT_KEY_RELEASED, e => keys[e.key] = false);

    requestAnimationFrame(drawEachFrame);
}

// Helper to create a player half
function createPlayer(x, y, radius, color) {
    const p = createCircleSprite(COLLIDER_DYNAMIC, x, y, radius);
    p.radius = radius;
    p.scale = 1;
    p.targetScale = 1;
    p.setFillColor(color);
    p.setStrokeColor(getDarkerColor(color));
    p.setStrokeWidth(1);
    p.setUserDataProp("fixedRotation", true);
    p.vx = 0; // velocity for split motion
    p.vy = 0;
    return p;
}

// Split players, shooting new halves in movement direction
function splitPlayers() {
    const newPlayers = [];
    players.forEach(p => {
        if (p.targetScale <= 0.5) return; // skip tiny halves
        p.targetScale /= 2;

        const offset = p.radius * p.scale + 5;
        const newP = createPlayer(p.getPosition().x + offset, p.getPosition().y, p.radius, p.getFillColor());
        newP.targetScale = p.targetScale;

        newP.vx = lastDirection.x * SPLIT_SPEED;
        newP.vy = lastDirection.y * SPLIT_SPEED;

        newPlayers.push(newP);
    });

    players.push(...newPlayers);
}

// Convert key to normalized direction vector
function getDirectionVector(key) {
    switch(key){
        case "ArrowUp": return { x:0, y:-1 };
        case "ArrowDown": return { x:0, y:1 };
        case "ArrowLeft": return { x:-1, y:0 };
        case "ArrowRight": return { x:1, y:0 };
        default: return { x:0, y:-1 };
    }
}

function drawEachFrame() {
    if (players.length === 0) {
        requestAnimationFrame(drawEachFrame);
        return;
    }

    const canvasWidth = world.getWidth();
    const canvasHeight = world.getHeight();
    const worldWidth = world.getWidth();   // <-- replaced getWorldWidth()
    const worldHeight = world.getHeight(); // <-- replaced getWorldHeight()

    // === Move each player half ===
    players.forEach(player => {
        const speedFactor = Math.max(0.2, 1 / (0.5 + player.scale * 0.5)); 
        const speed = BASE_SPEED * speedFactor;

        let vx = 0, vy = 0;
        if (keys["ArrowUp"]) vy -= speed;
        if (keys["ArrowDown"]) vy += speed;
        if (keys["ArrowLeft"]) vx -= speed;
        if (keys["ArrowRight"]) vx += speed;

        vx += player.vx;
        vy += player.vy;

        if (vx !== 0 || vy !== 0) {
            const pPos = player.getPosition();
            player.setPosition({ x: pPos.x + vx, y: pPos.y + vy });
        }

        // Split velocity decay
        player.vx *= 0.9;
        player.vy *= 0.9;

        // Smooth growth
        player.scale += (player.targetScale - player.scale) * 0.05;
        player.getFixtureList().m_shape.m_radius = player.radius * player.scale;

        // Eat food
        blobs.forEach((food, idx) => {
            const foodPos = food.getPosition();
            const distance = Math.hypot(player.getPosition().x - foodPos.x, player.getPosition().y - foodPos.y);
            if (distance < player.radius * player.scale + food.radius) {
                player.targetScale += 0.05; 
                score++;
                removeSprite(food);
                blobs.splice(idx, 1);
            }
        });
    });

    // === Player eats smaller halves ===
    for (let i = 0; i < players.length; i++) {
        const a = players[i];
        const aRadius = a.radius * a.scale;

        for (let j = players.length - 1; j >= 0; j--) {
            if (i === j) continue;
            const b = players[j];
            const bRadius = b.radius * b.scale;

            if (aRadius > bRadius * 1.2) { 
                const dx = b.getPosition().x - a.getPosition().x;
                const dy = b.getPosition().y - a.getPosition().y;
                const dist = Math.hypot(dx, dy);

                if (dist < aRadius) {
                    a.targetScale += b.scale * 0.5; 
                    removeSprite(b);
                    players.splice(j, 1);
                }
            }
        }
    }

    // === Calculate bounding box for camera ===
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    players.forEach(p => {
        const x = p.getPosition().x;
        const y = p.getPosition().y;
        const r = p.radius * p.scale;
        minX = Math.min(minX, x - r);
        minY = Math.min(minY, y - r);
        maxX = Math.max(maxX, x + r);
        maxY = Math.max(maxY, y + r);
    });

    // Center and scale camera to fit all halves
    let boxWidth = maxX - minX;
    let boxHeight = maxY - minY;
    let scaleX = canvasWidth / (boxWidth + 100);
    let scaleY = canvasHeight / (boxHeight + 100);
    let zoom = Math.min(scaleX, scaleY, 3);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const halfWidth = canvasWidth / (2 * zoom);
    const halfHeight = canvasHeight / (2 * zoom);
    const clampedX = Math.min(Math.max(centerX, halfWidth), worldWidth - halfWidth);
    const clampedY = Math.min(Math.max(centerY, halfHeight), worldHeight - halfHeight);

    world.setCameraScale(zoom);
    world.setCameraPosition(clampedX, clampedY);

    renderFrame();

    // Draw score
    world.setCameraScale(1);
    world.setCameraPosition(canvasWidth / 2, canvasHeight / 2);
    drawText(650, 20, `Score: ${score}`, 18, "black");

    requestAnimationFrame(drawEachFrame);
}

// === Helper: random color ===
function getRandomColor() {
    const r = Math.floor(getRandom(0, 255));
    const g = Math.floor(getRandom(0, 255));
    const b = Math.floor(getRandom(0, 255));
    return `rgb(${r},${g},${b})`;
}

// === Helper: slightly darker shade ===
function getDarkerColor(color) {
    const rgb = color.match(/\d+/g).map(Number);
    const darken = (v) => Math.max(0, Math.floor(v * 0.7));
    return `rgb(${darken(rgb[0])},${darken(rgb[1])},${darken(rgb[2])})`;
}