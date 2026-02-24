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


// =====================================================
// ---------------- CONFIGURATION ----------------------
// Centralized gameplay & physics tuning parameters
// =====================================================
const CONFIG = {

    // Projectile physics
    projectile: {
        bounciness: 0.1,   // restitution (elasticity)
        radius: 15
    },

    // Counterweight physics
    weight: {
        density: 50,      // higher density = heavier
        width: 20,
        height: 20
    },

    // Camera behavior
    camera: {
        scaleStart: 0.75,      // zoom before launch
        scaleLaunch: 0.35,     // zoom after launch
        followProjectile: true
    },

    // Force multiplier applied while dragging a ball
    cursorForce: 4000,

    // Debug options
    debug: {
        showHUD: false
    }
};


// =====================================================
// ---------------- GLOBAL VARIABLES -------------------
// =====================================================
let world;
let cameraScale = CONFIG.camera.scaleStart;

let ledge, ledge2, ledge3, ledge4, ledge5, ledge6;
let weight, projectile, slingJoint, trebJoint, ancJoint;
let draggingBall, hangingBall;

let mouseX = 0;
let mouseY = 0;
let mouseDragging = false;


// =====================================================
// ---------------- START SIMULATION -------------------
// =====================================================
window.onload = start;

async function start() {

    // Initialize physics world + canvas
    world = setupWorld("canvas", 800, 500);

    // Expand world width for projectile travel
    world.setWorldDimensions(10000, 500);

    // Gravity acts downward
    world.setGravity({ x: 0, y: 10 });

    createGround();
    createLedgesAndWeight();
    createProjectile();
    createHangingBall();

    // Mouse events
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    // Keyboard events
    window.addEventListener("keydown", onKeyDown);

    setupGUI();

    drawEachFrame();
}


// =====================================================
// ---------------- WORLD CREATION ---------------------
// =====================================================

function createGround() {
    const halfWidth = world.getWidth() / 2;

    const groundVertices = [
        { x: -halfWidth, y: world.getHeight() - 20 },
        { x:  halfWidth, y: world.getHeight() - 20 }
    ];

    const ground = createChainSprite(COLLIDER_STATIC, groundVertices);
    ground.setStrokeWidth(2);
}


// Creates trebuchet platform, pivot, lever, weight and bonus ledges
function createLedgesAndWeight() {

    // Base platform
    ledge = createRectSprite(COLLIDER_STATIC, 400, 400, 400, 10);
    ledge.addCollisionListener(onLedgeBallCollision, "ball");

    // Pivot anchor
    ledge2 = createRectSprite(COLLIDER_STATIC, 400, 200, 10, 10);
    ledge2.addCollisionListener(onLedgeBallCollision, "ball");

    // Lever beam
    ledge3 = createRectSprite(COLLIDER_DYNAMIC, 400, 200, 200, 10);
    ledge3.addCollisionListener(onLedgeBallCollision, "ball");
    ledge3.setDensity(1);
    ledge3.setFriction(0.4);
    ledge3.setAngle(-0.8);

    // Revolute joint acts as pivot
    ancJoint = createJoint(JOINT_REVOLUTE, ledge2, ledge3, {
        collideConnected: false,
        localAnchorB: { x: -ledge3.width * 0.35, y: 0 }
    });

    // Counterweight
    weight = createRectSprite(
        COLLIDER_DYNAMIC,
        490,
        220,
        CONFIG.weight.width,
        CONFIG.weight.height
    );
    weight.addCollisionListener(onLedgeBallCollision, "ball");
    weight.setDensity(CONFIG.weight.density);

    // Distance joint linking weight to lever
    trebJoint = createJoint(JOINT_DISTANCE, ledge3, weight, {
        collideConnected: true,
        localAnchorA: { x: -ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: -weight.height / 2 }
    });

    // Bonus vertical bouncy walls
    ledge4 = createRectSprite(COLLIDER_DYNAMIC, -1110, 400, 200, 10);
    ledge4.setAngle(1.57);
    ledge4.setDensity(1);
    ledge4.setFriction(-10000);
    ledge4.setBounciness(1.5);

    ledge5 = createRectSprite(COLLIDER_DYNAMIC, -1295, 400, 200, 10);
    ledge5.setAngle(1.57);
    ledge5.setDensity(1);
    ledge5.setFriction(-10000);
    ledge5.setBounciness(1.5);

    ledge6 = createRectSprite(COLLIDER_DYNAMIC, -1200, 290, 200, 10);
    ledge6.setDensity(1);
    ledge6.setFriction(-10000);
    ledge6.setBounciness(1.5);
}


// Creates projectile attached to lever tip
function createProjectile() {
    const pos = ledge3.getPosition();

    projectile = createCircleSprite(
        COLLIDER_DYNAMIC,
        pos.x + ledge3.width / 2,
        pos.y,
        CONFIG.projectile.radius
    );

    projectile.setBounciness(CONFIG.projectile.bounciness);

    slingJoint = createJoint(JOINT_DISTANCE, ledge3, projectile, {
        collideConnected: true,
        localAnchorA: { x: ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: 0 }
    });
}


// Decorative hanging ball
function createHangingBall() {
    hangingBall = createCircleSprite(COLLIDER_DYNAMIC, 400, 450, 15);
    createJoint(JOINT_DISTANCE, hangingBall, ledge, { collideConnected: true });
}


// =====================================================
// ---------------- ANIMATION LOOP ---------------------
// =====================================================

function drawEachFrame() {

    applyMouseForceToDraggingBall();

    // Camera follow logic after projectile launch
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

    drawInstructions();

    requestAnimationFrame(drawEachFrame);
}


// =====================================================
// ---------------- IN-GAME INSTRUCTIONS ---------------
// Top-right aligned overlay (screen space)
// =====================================================
function drawInstructions() {

    const ctx = document.getElementById("canvas").getContext("2d");

    // Reset transform so text is not affected by camera
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const padding = 20;
    const lineHeight = 18;

    const lines = [
        "CONTROLS:",
        "• Click empty space → Spawn ball",
        "• Click & drag ball → Apply force",
        "• SPACE → Fire trebuchet",
        "• Sliders → Adjust physics",
        "• RESET → Reset projectile"
    ];

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "black";
    ctx.textAlign = "right";

    // Start drawing from top-right
    let y = padding;

    lines.forEach(line => {
        ctx.fillText(line, ctx.canvas.width - padding, y);
        y += lineHeight;
    });

    // Reset alignment (good practice)
    ctx.textAlign = "start";
}

// =====================================================
// ---------------- MOUSE CONTROLS ---------------------
// =====================================================

function applyMouseForceToDraggingBall() {
    if (mouseDragging && draggingBall) {
        const center = draggingBall.getPosition();

        draggingBall.applyForceToCenter({
            x: (mouseX - center.x) * CONFIG.cursorForce,
            y: (mouseY - center.y) * CONFIG.cursorForce
        });
    }
}

function onMouseMove(e) {
    if (mouseDragging) {
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    }
}

function onMouseUp() {
    mouseDragging = false;
    if (draggingBall) draggingBall.setStrokeColor("black");
}

function onMouseDown(e) {

    mouseX = e.offsetX;
    mouseY = e.offsetY;

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
            createNewBall(true);
        }
    }
}


// Spawn new draggable ball
function createNewBall(isDragging) {
    const newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setStrokeColor("limegreen");
    newBall.setBounciness(0.3);
    newBall.setDensity(3);
    newBall.addTag("ball");

    if (isDragging) draggingBall = newBall;
}


// =====================================================
// ---------------- COLLISION --------------------------
// =====================================================

// When a ball collides with a ledge,
// it inherits the ledge's fill color
function onLedgeBallCollision(ledge, ball) {
    ball.setFillColor(ledge.getFillColor());
}


// =====================================================
// ---------------- KEYBOARD ---------------------------
// =====================================================

// Press SPACE to release projectile
function onKeyDown(e) {
    if (e.code === "Space" && slingJoint) {
        destroyJoint(slingJoint);
        slingJoint = null;
    }
}


// =====================================================
// ---------------- GUI SETUP --------------------------
// =====================================================

function setupGUI() {

    const bounceSlider = document.getElementById("gui-bounce");
    const densitySlider = document.getElementById("gui-density");
    const followCheckbox = document.getElementById("gui-follow");
    const hudCheckbox = document.getElementById("gui-hud");
    const resetButton = document.getElementById("gui-reset");

    bounceSlider.value = CONFIG.projectile.bounciness;
    densitySlider.value = CONFIG.weight.density;

    bounceSlider.addEventListener("input", e => {
        CONFIG.projectile.bounciness = parseFloat(e.target.value);
        if (projectile) projectile.setBounciness(CONFIG.projectile.bounciness);
    });

    densitySlider.addEventListener("input", e => {
        CONFIG.weight.density = parseInt(e.target.value);
        if (weight) weight.setDensity(CONFIG.weight.density);
    });

    followCheckbox.addEventListener("change", e =>
        CONFIG.camera.followProjectile = e.target.checked
    );

    hudCheckbox.addEventListener("change", e =>
        CONFIG.debug.showHUD = e.target.checked
    );

    resetButton.addEventListener("click", () => {

        if (projectile) {
            removeSprite(projectile);
            projectile = null;
        }

        createLever();
        createProjectile();

        cameraScale = CONFIG.camera.scaleStart;
        world.setCameraScale(cameraScale);
        world.setCameraPosition(400, 200);
    });
}


// Rebuilds lever system
function createLever() {

    removeSprite(ledge3);
    removeSprite(weight);

    destroyJoint(ancJoint);
    destroyJoint(trebJoint);

    createLedgesAndWeight();
}