// planck integration tester

import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createEdge,
    createRectSprite,
    renderFrame,
    getRandomColorHexString,
    setupWorld
} from "../../js/pzsprites.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

window.onload = start;

const ballSprites = [];
const obstacleSprites = [];

let box;

let mouseX = 0, mouseY = 0;
let mouseDragging = false;

async function start() {
    setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    
    box = createRectSprite(COLLIDER_DYNAMIC, 100, 100, 40, 40);

    let ball = createCircleSprite(COLLIDER_DYNAMIC, 200, 100, 20);
    ball.setBounciness(0.5);
    ball.setFillColor("red");

    let floor = createRectSprite(COLLIDER_STATIC, 0, 400, 400, 10);

    createRandomObstacles(8);

    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    drawFrame(0);
}

function drawFrame(timestamp){

    renderFrame();
    
    window.requestAnimationFrame(drawFrame);
}
function createNewBall(isDragging){
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setBounciness(0.3);
    newBall.dragging = isDragging;
    ballSprites.push(newBall);
}

function createRandomObstacles(count){
    for(let i = 0; i < count; i++){
        const width = getRandom(5, 50);
        const height = getRandom(5, 50);
        const x = getRandom(0, CANVAS_WIDTH - width);
        const y = getRandom(0, CANVAS_HEIGHT - height);
        obstacleSprites.push(createRectSprite(COLLIDER_STATIC, x, y, width, height));
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
    ballSprites.forEach(b => b.dragging = false);
}

function onMouseDown(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;
    mouseDragging = true;
    createNewBall(mouseDragging);
}

