import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createRectSprite,
    renderFrame,
    getRandomColor,
    setupWorld,
    destroyJoint,  
    getSpritesByTag,
    createChainSprite,
    createJoint,
    JOINT_DISTANCE,
    JOINT_REVOLUTE,
    drawText,
    removeSprite
} from "../../js/pzsprites.js";

// ---------------- CONFIGURATION ----------------
const CONFIG = {
    projectile: { bounciness: 0.1, radius: 15 },
    weight: { density: 50, width: 20, height: 20 },
    camera: { scaleStart: 0.75, scaleLaunch: 0.35, followProjectile: true },
    cursorForce: 4000,
    debug: { showHUD: false}
};

// ---------------- GLOBAL VARIABLES ----------------
let world, cameraScale = CONFIG.camera.scaleStart;
let ledge, ledge2, ledge3, ledge4, ledge5, ledge6;
let weight, projectile, slingJoint, trebJoint, ancJoint, draggingBall, hangingBall;
let mouseX = 0, mouseY = 0, mouseDragging = false;

// ---------------- START SIMULATION ----------------
window.onload = start;

async function start() {
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(10000, 500);
    world.setGravity({ x: 0, y: 10 });

    createGround();
    createLedgesAndWeight();
    createProjectile();
    createHangingBall();

    // Mouse events
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    // Keyboard: release projectile
    window.addEventListener("keydown", onKeyDown);

    // GUI
    setupGUI();

    drawEachFrame(0);
}

// ---------------- WORLD OBJECTS ----------------
function createGround() {
    const halfWidth = world.getWidth() / 2;
    const groundVertices = [
        { x: -halfWidth, y: world.getHeight() - 20 },
        { x:  halfWidth, y: world.getHeight() - 20 }
    ];
    const ground = createChainSprite(COLLIDER_STATIC, groundVertices);
    ground.setStrokeWidth(2);
}

function createLedgesAndWeight() {
    // Static ledges
    ledge = createRectSprite(COLLIDER_STATIC, 400, 400, 400, 10);
    ledge.addCollisionListener(onLedgeBallCollision, "ball");

    ledge2 = createRectSprite(COLLIDER_STATIC, 400, 200, 10, 10);
    ledge2.addCollisionListener(onLedgeBallCollision, "ball");

    // Dynamic lever
    ledge3 = createRectSprite(COLLIDER_DYNAMIC, 400, 200, 200, 10);
    ledge3.addCollisionListener(onLedgeBallCollision, "ball");
    ledge3.setDensity(1);
    ledge3.setFriction(0.4);
    ledge3.setAngle(-0.8);

    // Lever pivot
  ancJoint =  createJoint(JOINT_REVOLUTE, ledge2, ledge3, {
        collideConnected: false,
        localAnchorB: { x: -ledge3.width * 0.35, y: 0 }
    });

    // Weight
    weight = createRectSprite(COLLIDER_DYNAMIC, 490, 220, CONFIG.weight.width, CONFIG.weight.height);
    weight.addCollisionListener(onLedgeBallCollision, "ball");
    weight.setDensity(CONFIG.weight.density);

    // Connect weight to lever
    trebJoint = createJoint(JOINT_DISTANCE, ledge3, weight, {
        collideConnected: true,
        localAnchorA: { x: -ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: -weight.height / 2 }
    });

    // Additional static/dynamic ledges
    ledge4 = createRectSprite(COLLIDER_DYNAMIC, -1110, 400, 200, 10);
    ledge4.addCollisionListener(onLedgeBallCollision, "ball");
    ledge4.setDensity(1);
    ledge4.setFriction(-10000);
    ledge4.setAngle(1.57);
    ledge4.setBounciness(1.5);

    ledge5 = createRectSprite(COLLIDER_DYNAMIC, -1295, 400, 200, 10);
    ledge5.addCollisionListener(onLedgeBallCollision, "ball");
    ledge5.setDensity(1);
    ledge5.setFriction(-10000);
    ledge5.setAngle(1.57);
    ledge5.setBounciness(1.5);

    ledge6 = createRectSprite(COLLIDER_DYNAMIC, -1200, 290, 200, 10);
    ledge6.addCollisionListener(onLedgeBallCollision, "ball");
    ledge6.setDensity(1);
    ledge6.setFriction(-10000);
    ledge6.setAngle(0);
    ledge6.setBounciness(1.5);
}

function createProjectile() {
    const pos = ledge3.getPosition();
    projectile = createCircleSprite(COLLIDER_DYNAMIC, pos.x + ledge3.width / 2, pos.y, CONFIG.projectile.radius);
    projectile.setBounciness(CONFIG.projectile.bounciness);

    slingJoint = createJoint(JOINT_DISTANCE, ledge3, projectile, {
        collideConnected: true,
        localAnchorA: { x: ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: 0 }
    });
}

function createHangingBall() {
    hangingBall = createCircleSprite(COLLIDER_DYNAMIC, 400, 450, 15);
    createJoint(JOINT_DISTANCE, hangingBall, ledge, { collideConnected: true });
}

// ---------------- ANIMATION LOOP ----------------
function drawEachFrame() {
    applyMouseForceToDraggingBall();

    if (projectile && CONFIG.camera.followProjectile && slingJoint === null) {
        const pos = projectile.getPosition();
        world.setCameraPosition(pos.x, pos.y);
        cameraScale += (CONFIG.camera.scaleLaunch - cameraScale) * 0.05;
    } else {
        cameraScale += (CONFIG.camera.scaleStart - cameraScale) * 0.05;
    }
    world.setCameraScale(cameraScale);

    renderFrame();

    if (CONFIG.debug.showHUD) {
        const ctx = document.getElementById("canvas").getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawText(20, 20, `Projectile Bounciness: ${CONFIG.projectile.bounciness.toFixed(2)}`, 16, "black");
        drawText(20, 40, `Weight Density: ${CONFIG.weight.density}`, 16, "black");
    }

    requestAnimationFrame(drawEachFrame);
}

// ---------------- MOUSE CONTROLS ----------------
function applyMouseForceToDraggingBall() {
    if (mouseDragging && draggingBall) {
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({
            x: (mouseX - center.x) * CONFIG.cursorForce,
            y: (mouseY - center.y) * CONFIG.cursorForce
        });
    }
}

function onMouseMove(e) { if (mouseDragging) { mouseX = e.offsetX; mouseY = e.offsetY; } }
function onMouseUp(e) { mouseDragging = false; if (draggingBall) draggingBall.setStrokeColor("black"); }

function onMouseDown(e) {
    mouseX = e.offsetX; mouseY = e.offsetY;
    if (ledge.containsPoint(mouseX, mouseY)) {
        ledge.setFillColor(getRandomColor());
    } else {
        const balls = getSpritesByTag("ball");
        const touching = balls.filter(b => b.containsPoint(mouseX, mouseY));
        if (touching.length > 0) {
            mouseDragging = true;
            draggingBall = touching[0];
            draggingBall.setStrokeColor("limegreen");
        } else {
            mouseDragging = true;
            createNewBall(mouseDragging);
        }
    }
}

function createNewBall(isDragging) {
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setStrokeColor("limegreen");
    newBall.setBounciness(0.3);
    newBall.setDensity(3);
    newBall.addTag("ball");
    if (isDragging) draggingBall = newBall;
}

// ---------------- COLLISION ----------------
function onLedgeBallCollision(ledge, ball, contact) {
    ball.setFillColor(ledge.getFillColor());
}

// ---------------- KEYBOARD ----------------
function onKeyDown(e) {
    if (e.code === "Space" && slingJoint) {
        destroyJoint(slingJoint);
        slingJoint = null;
    }
}

// ---------------- GUI ----------------
function setupGUI() {
    const bounceSlider = document.getElementById("gui-bounce");
    const bounceValue = document.getElementById("gui-bounce-value");
    const densitySlider = document.getElementById("gui-density");
    const densityValue = document.getElementById("gui-density-value");
    const followCheckbox = document.getElementById("gui-follow");
    const hudCheckbox = document.getElementById("gui-hud");
    const resetButton = document.getElementById("gui-reset");

    bounceSlider.value = CONFIG.projectile.bounciness;
    bounceValue.textContent = CONFIG.projectile.bounciness.toFixed(2);
    densitySlider.value = CONFIG.weight.density;
    densityValue.textContent = CONFIG.weight.density;
    followCheckbox.checked = CONFIG.camera.followProjectile;
    hudCheckbox.checked = CONFIG.debug.showHUD;

    bounceSlider.addEventListener("input", e => {
        CONFIG.projectile.bounciness = parseFloat(e.target.value);
        bounceValue.textContent = CONFIG.projectile.bounciness.toFixed(2);
        if (projectile) projectile.setBounciness(CONFIG.projectile.bounciness);
    });

    densitySlider.addEventListener("input", e => {
        CONFIG.weight.density = parseInt(e.target.value);
        densityValue.textContent = CONFIG.weight.density;
        if (weight) weight.setDensity(CONFIG.weight.density);
    });

    followCheckbox.addEventListener("change", e => { CONFIG.camera.followProjectile = e.target.checked; });
    hudCheckbox.addEventListener("change", e => { CONFIG.debug.showHUD = e.target.checked; });
    resetButton.addEventListener("click", () => {
        if (projectile) {
            removeSprite(projectile);
            projectile = null;
        }
    
        createLever();
        createProjectile();
    
        // ---- RESET CAMERA ----
        cameraScale = CONFIG.camera.scaleStart;
        world.setCameraScale(cameraScale);
    
        // Center camera back to world center
        world.setCameraPosition(400, 200 );
    });
}

function createLever(){
  removeSprite(ledge3);
  removeSprite(weight);
  destroyJoint(ancJoint);
  destroyJoint(trebJoint);
     ledge3 = createRectSprite(COLLIDER_DYNAMIC, 400, 200, 200, 10);
     ledge3.addCollisionListener(onLedgeBallCollision, "ball");
     ledge3.setDensity(1);
     ledge3.setFriction(0.4);
     ledge3.setAngle(-0.8);
    ancJoint =  createJoint(JOINT_REVOLUTE, ledge2, ledge3, {
        collideConnected: false,
        localAnchorB: { x: -ledge3.width * 0.35, y: 0 }
    });
     weight = createRectSprite(COLLIDER_DYNAMIC, 490, 220, CONFIG.weight.width, CONFIG.weight.height);
     weight.addCollisionListener(onLedgeBallCollision, "ball");
     weight.setDensity(CONFIG.weight.density);
     trebJoint = createJoint(JOINT_DISTANCE, ledge3, weight, {
        collideConnected: true,
        localAnchorA: { x: -ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: -weight.height / 2 }
    });
    world.setCameraScale(cameraScale);
}