import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createRectSprite,
    renderFrame,
    setupWorld,
    createChainSprite,
    removeSprite,
    EVENT_KEY_PRESSED,
    EVENT_KEY_RELEASED
} from "../../js/pzsprites.js";

window.onload = start;

let world;
let player;

// grapple
let grappleAnchor = null;
let grappleLength = 0;

// input
let mouseX = 0, mouseY = 0;
let keys = {};

// camera
let camera = {
    x: 0,
    y: 0,
    zoom: 1
};

// tuning
const moveForce = 1400;
const maxGrappleDistance = 600;
const reelSpeed = 0.5;
const cameraLerp = 0.08;

// optional smoothing
let smoothedSpeed = 0;

function start(){
    world = setupWorld("canvas", 800, 500, {
        gravity: { x: 0, y: 25 }
    });

    // player
    player = createCircleSprite(COLLIDER_DYNAMIC, 200, 200, 15);
    player.setFillColor("blue");
    player.setBounciness(0.2);
    player.setDensity(2);

    // platforms
    for (let i = 0; i < 30; i++){
        createRectSprite(
            COLLIDER_STATIC,
            i * 250,
            450 - Math.random() * 250,
            180,
            20
        );
    }

    createRectSprite(COLLIDER_STATIC, 3000, 480, 6000, 40);

    const walls = [
        { x: 0, y: 0 },
        { x: 6000, y: 0 },
        { x: 6000, y: 500 },
        { x: 0, y: 500 }
    ];
    createChainSprite(COLLIDER_STATIC, walls, true);

    // input
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    addEventListener(EVENT_KEY_PRESSED, (e) => {
        keys[e.key.toLowerCase()] = true;
    });

    addEventListener(EVENT_KEY_RELEASED, (e) => {
        keys[e.key.toLowerCase()] = false;
    });

    loop();
}

// =========================
// Main loop
// =========================
function loop(){
    applyMovement();
    applyReel();
    enforceRopeConstraint();
    updateCamera();

    renderFrame();
    drawGrappleLine();
    drawSpeed();

    requestAnimationFrame(loop);
}

// =========================
// Movement (WASD)
// =========================
function applyMovement(){
    const force = { x: 0, y: 0 };

    if (keys["a"]) force.x -= moveForce;
    if (keys["d"]) force.x += moveForce;

    if (keys["w"]) force.y -= moveForce * 0.5;
    if (keys["s"]) force.y += moveForce * 0.5;

    player.applyForceToCenter(force);
}

// =========================
// Mouse handling
// =========================
function onMouseDown(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;
    fireGrapple();
}

function onMouseUp(){
    releaseGrapple();
}

function onMouseMove(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;
}

// =========================
// Mouse → world
// =========================
function getWorldMouse(){
    const worldX = camera.x + (mouseX / camera.zoom);
    const worldY = camera.y + (mouseY / camera.zoom);

    return { x: worldX, y: worldY };
}

// =========================
// Grapple
// =========================
function fireGrapple(){
    if (grappleAnchor) return;

    const p = player.getPosition();
    const m = getWorldMouse();

    const dx = m.x - p.x;
    const dy = m.y - p.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxGrappleDistance) return;

    const steps = 20;
    let hitX = m.x;
    let hitY = m.y;

    for (let i = 1; i <= steps; i++){
        const t = i / steps;
        const testX = p.x + dx * t;
        const testY = p.y + dy * t;

        if (Math.hypot(testX - p.x, testY - p.y) > maxGrappleDistance){
            break;
        }

        hitX = testX;
        hitY = testY;
    }

    grappleAnchor = createCircleSprite(
        COLLIDER_STATIC,
        hitX,
        hitY,
        3
    );

    grappleLength = Math.hypot(hitX - p.x, hitY - p.y);
}

function releaseGrapple(){
    if (grappleAnchor){
        removeSprite(grappleAnchor);
        grappleAnchor = null;
    }
}

// =========================
// Rope constraint
// =========================
function enforceRopeConstraint(){
    if (!grappleAnchor) return;

    const p = player.getPosition();
    const a = grappleAnchor.getPosition();

    let dx = p.x - a.x;
    let dy = p.y - a.y;

    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > grappleLength){
        const nx = dx / dist;
        const ny = dy / dist;

        const excess = dist - grappleLength;

        player.setPosition({
            x: p.x - nx * excess,
            y: p.y - ny * excess
        });

        const vel = player.getLinearVelocity();
        const dot = vel.x * nx + vel.y * ny;

        player.setLinearVelocity({
            x: vel.x - dot * nx,
            y: vel.y - dot * ny
        });
    }
}

// =========================
// Reeling
// =========================
function applyReel(){
    if (!grappleAnchor) return;

    if (keys["q"]) {
        grappleLength = Math.max(20, grappleLength - reelSpeed);

        player.applyForceToCenter({
            x: (grappleAnchor.getPosition().x - player.getPosition().x) * 5,
            y: (grappleAnchor.getPosition().y - player.getPosition().y) * 5
        });
    }

    if (keys["e"]) {
        grappleLength += reelSpeed;
    }
}

// =========================
// Camera
// =========================
function updateCamera(){
    const p = player.getPosition();

    const targetX = p.x - 400;
    const targetY = p.y - 250;

    camera.x += (targetX - camera.x) * cameraLerp;
    camera.y += (targetY - camera.y) * cameraLerp;

    world.setCameraPosition(p.x, p.y);

    if (world.setCameraScale) {
        world.setCameraScale(camera.zoom);
    }
}

// =========================
// Rope rendering
// =========================
function drawGrappleLine(){
    if (!grappleAnchor) return;

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const p = player.getPosition();
    const a = grappleAnchor.getPosition();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(a.x, a.y);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// =========================
// Speed HUD
// =========================
function drawSpeed(){
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    const vel = player.getLinearVelocity();

    // smooth value
    smoothedSpeed += (vel.x - smoothedSpeed) * 0.1;

    ctx.save();

    // reset transform so UI stays fixed
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = "black";
    ctx.font = "16px monospace";

    ctx.fillText(`Speed (Pixels per Second): ${smoothedSpeed.toFixed(2)}`, 10, 20);

    ctx.restore();
}