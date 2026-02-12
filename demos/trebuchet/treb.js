import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createRectSprite,
    renderFrame,
    getRandomColor,
    getRandom,
    setupWorld,
    createEdgeSprite,
    destroyJoint,  
    PLANCK,
    getSpritesByTag,
    addCollisionListener,
    addCollisionListenerForTag,
    removeSprite,
    createChainSprite,
    createJoint,
    addCollisionListenerForSprite,
    JOINT_DISTANCE,
    JOINT_REVOLUTE,
    JOINT_WELD,
    COLLIDER_KINEMATIC,
} from "../../js/pzsprites.js";

const BALL_TAG = "ball";
const OBSTACLE_TAG = "obstacle";
window.onload = start;

let world;
let cameraScale = 0.75;          // starting zoom (close)
const launchZoomScale = 0.35;    // zoomed-out scale after launch
const zoomLerp = 0.05;           // smooth zoom speed
let ledge4;


let startAngle;
let ledge, ledge2, ledge3;
let draggingBall;
let hangingBall;
let cursorForce = 4000; // the force the mouse cursor exerts on the dragging ball
let mouseX = 0, mouseY = 0;
let mouseDragging = false;
let weight;
let slingJoint = null;
let projectile = null; // your ball

async function start() {
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(10000, 500);
    world.setGravity({ x: 0, y: 10});

    // ----- GROUND -----
    const groundHeight = world.getHeight() - 20;

    const halfWidth = world.getWidth() / 2;
    
    const groundVertices = [
        { x: -halfWidth, y: groundHeight },
        { x:  halfWidth, y: groundHeight }
    ];
    
    const ground = createChainSprite(COLLIDER_STATIC, groundVertices);
    ground.setStrokeWidth(2);
    
  
    ledge = createRectSprite(COLLIDER_STATIC, 400, 400, 400, 10);
    ledge.addCollisionListener(onLedgeBallCollision, BALL_TAG);

    ledge2 = createRectSprite(COLLIDER_STATIC, 400, 200, 10, 10);
    ledge2.addCollisionListener(onLedgeBallCollision, BALL_TAG);


    ledge3 = createRectSprite(COLLIDER_DYNAMIC, 400, 200, 200, 10);
    ledge3.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    ledge3.setDensity(1);
    ledge3.setFriction(0.4);
    ledge3.setAngle(-0.8);
   
    
    ledge4 = createRectSprite(COLLIDER_KINEMATIC, -1100, 460, 200, 10);
    ledge4.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    ledge4.setDensity(1);
    ledge4.setFriction(-10000);
    ledge4.setAngle(0.8);
    ledge4.setBounciness(10);
 


    weight = createRectSprite(COLLIDER_DYNAMIC,  490, 220, 20, 20);
    weight.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    weight.setDensity(50);

    // Revolute joint for lever pivot
    createJoint(JOINT_REVOLUTE, ledge2, ledge3, {
        collideConnected: false,
        localAnchorB: { x: -ledge3.width * 0.35, y: 0 }
    });

    // Distance joint connecting lever to weight
    createJoint(JOINT_DISTANCE, ledge3, weight, {
        collideConnected: true,
        localAnchorA: { x: -ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: -weight.height / 2 }
    });

    // Projectile attached to right edge of lever
    projectile = createCircleSprite(COLLIDER_DYNAMIC, ledge3.getPosition().x + ledge3.width / 2, ledge3.getPosition().y, 15);
    projectile.setBounciness(1);
    slingJoint = createJoint(JOINT_DISTANCE, ledge3, projectile, {
        collideConnected: true,
        localAnchorA: { x: ledge3.width / 2, y: 0 },
        localAnchorB: { x: 0, y: 0 }
    });

    // Hanging ball
    hangingBall = createCircleSprite(COLLIDER_DYNAMIC, 400, 450, 15);
    createJoint(JOINT_DISTANCE, hangingBall, ledge, { collideConnected: true });

    // Walls around canvas
    

    // Mouse events
    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    // Keyboard event: release projectile on space
    window.addEventListener("keydown", onKeyDown);

    drawEachFrame(0); // start animation loop
}

// Animation loop
function drawEachFrame(timestamp) {
    applyMouseForceToDraggingBall();

    if (projectile) {

        let targetScale = 0.75; // default zoom (before launch)

        if (slingJoint === null) {
            // 🚀 After launch → follow projectile
            const pos = projectile.getPosition();
            world.setCameraPosition(pos.x, pos.y);

            // Zoom out
            targetScale = launchZoomScale;
        }

        // Smooth zoom transition
        cameraScale += (targetScale - cameraScale) * zoomLerp;
        world.setCameraScale(cameraScale);
    }

    renderFrame();
    requestAnimationFrame(drawEachFrame);
}



// Apply mouse dragging force
function applyMouseForceToDraggingBall() {
    if (mouseDragging && draggingBall) {
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({
            x: (mouseX - center.x) * cursorForce,
            y: (mouseY - center.y) * cursorForce
        });
    }
}

// Collision callbacks
function onBigRedBoxBallCollision(bigBox, ball, contact) {
    ball.setFillColor("red");
}

function onObstacleCollision(obstacle, other, contact) {
    other.setFillColor(obstacle.getFillColor());
}

function onLedgeBallCollision(ledge, ball, contact) {
    ball.setFillColor(ledge.getFillColor());
}

// Mouse event handlers
function onMouseMove(e) {
    if (mouseDragging) {
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    }
}

function onMouseUp(e) {
    mouseDragging = false;
    if (draggingBall) draggingBall.setStrokeColor("black");
}

function onMouseDown(e) {
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    if (ledge.containsPoint(mouseX, mouseY)) {
        ledge.setFillColor(getRandomColor());
    } else {
        const balls = getSpritesByTag(BALL_TAG);
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

// Create new ball on click
function createNewBall(isDragging) {
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setStrokeColor("limegreen");
    newBall.setBounciness(0.3);
    newBall.setDensity(3);
    newBall.addTag(BALL_TAG);
    if (isDragging) draggingBall = newBall;
}

// Keyboard handler for space bar
function onKeyDown(e) {
    if (e.code === "Space" && slingJoint) {
        destroyJoint(slingJoint); // release projectile
        slingJoint = null;
    }
}
