// planck integration tester

import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createRectSprite,
    renderFrame,
    getRandomColorHexString,
    setupWorld,
    createEdgeSprite
} from "../../js/pzsprites.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

window.onload = start;

let box, ball, ledge;
let draggingBall;
let cursorForce = 2000; // the force the mouse cursor exerts on the dragging ball
let mouseX = 0, mouseY = 0;
let mouseDragging = false;

async function start() {
    setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    
    box = createRectSprite(COLLIDER_DYNAMIC, 100, 100, 40, 40);
    // box.setDebug(true);

    ball = createCircleSprite(COLLIDER_DYNAMIC, 200, 100, 20);
    // ball.setDebug(true);
    ball.setBounciness(0.5);
    ball.setFillColor("#ffffff00");
    ball.createFixture({
        shape: new Box(ball.radius, 1)
    });

    ledge = createRectSprite(COLLIDER_STATIC, 200, 400, 400, 10);
    
    createEdgeSprite(COLLIDER_STATIC, 0, CANVAS_HEIGHT - 50, CANVAS_WIDTH, CANVAS_HEIGHT - 50);

    createRandomObstacles(8);

    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    drawFrame(0);
}

function drawFrame(timestamp){
    if(mouseDragging && draggingBall){
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({ x: (mouseX - center.x) * cursorForce, y: (mouseY - center.y) * cursorForce });
    }
    renderFrame();
    window.requestAnimationFrame(drawFrame);
}

function createNewBall(isDragging){
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setBounciness(0.3);
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

function getRandom(min, max) {
    return Math.random() * (max - min) + min;
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

