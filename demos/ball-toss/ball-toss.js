// planck integration prototype

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
    PLANCK,
    getSpritesByTag,
    addCollisionListener,
    addCollisionListenerForTag,
    removeSprite,
    createChainSprite
} from "../../js/pzsprites.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

const BALL_TAG = "ball";
const BIG_BOX_TAG = "bigbox";

window.onload = start;

let box, bigBall, ledge;
let draggingBall;
let cursorForce = 2000; // the force the mouse cursor exerts on the dragging ball
let mouseX = 0, mouseY = 0;
let mouseDragging = false;

async function start() {
    setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    
    box = createRectSprite(COLLIDER_DYNAMIC, 100, 100, 40, 40);
    box.setFillColor("red");
    box.addTag(BIG_BOX_TAG);
    // box.setDebug(true);

    bigBall = createCircleSprite(COLLIDER_DYNAMIC, 200, 100, 20);
    // ball.setDebug(true);
    bigBall.setBounciness(0.5);
    bigBall.setFillColor("#ffffff00"); // transparent
    // add an extra rectangle to this ball to see it rolling
    bigBall.createFixture({
        shape: new PLANCK.Box(bigBall.radius, 1)
    });

    ledge = createRectSprite(COLLIDER_STATIC, 200, 400, 400, 10);
    
    // createEdgeSprite(COLLIDER_STATIC, 0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, CANVAS_HEIGHT - 50);

    const chainVerts = [
        { x: 150, y: 200},
        { x: 230, y: 250},
        { x: 290, y: 300},
        { x: 350, y: 350},
        { x: 390, y: 390}
    ];
    createChainSprite(COLLIDER_STATIC, chainVerts);

    // create a chain which surrounds the canvas (hard walls)
    createChainSprite(COLLIDER_STATIC, [
        { x: 0, y: 0 },
        { x: CANVAS_WIDTH, y: 0 },
        { x: CANVAS_WIDTH, y: CANVAS_HEIGHT },
        { x: 0, y: CANVAS_HEIGHT }
    ]);

    createRandomObstacles(8);

    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);
    
    addCollisionListenerForTag(BIG_BOX_TAG, onBigBoxCollision);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    applyMouseForceToDraggingBall();
    renderFrame();
    window.requestAnimationFrame(drawEachFrame);
}

function applyMouseForceToDraggingBall(){
    if(mouseDragging && draggingBall){
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({ x: (mouseX - center.x) * cursorForce, y: (mouseY - center.y) * cursorForce });
    }
}

function onBigBoxCollision(spriteA, spriteB, contact){
    if(spriteB.hasTag(BALL_TAG)) spriteB.setFillColor("red");
}

function createNewBall(isDragging){
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setBounciness(0.3);
    newBall.addTag(BALL_TAG);
    if(isDragging) draggingBall = newBall;
}

function createRandomObstacles(count){
    for(let i = 0; i < count; i++){
        const width = getRandom(5, 50);
        const height = getRandom(5, 50);
        const x = getRandom(0, CANVAS_WIDTH - width);
        const y = getRandom(0, CANVAS_HEIGHT - height);
        createRectSprite(COLLIDER_STATIC, x, y, width, height);
    }
}

function onMouseMove(e){
    if(mouseDragging){
        mouseX = e.offsetX;
        mouseY = e.offsetY;
    }
}

function onMouseUp(e){
    mouseDragging = false;
}

function onMouseDown(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;
    mouseDragging = true;
    createNewBall(mouseDragging);
}

