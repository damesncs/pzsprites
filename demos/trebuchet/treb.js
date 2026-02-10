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
    createChainSprite,
    createJoint,
    addCollisionListenerForSprite,
    JOINT_DISTANCE,
    JOINT_REVOLUTE,
    JOINT_WELD,
} from "../../js/pzsprites.js";

  

const BALL_TAG = "ball";
const OBSTACLE_TAG = "obstacle";

window.onload = start;

let world;

let box, bigBall, bigBall2, ledge, ledge2, ledge3;
let draggingBall;
let hangingBall;
let cursorForce = 4000; // the force the mouse cursor exerts on the dragging ball
let mouseX = 0, mouseY = 0;
let mouseDragging = false;

async function start() {
    world = setupWorld("canvas", 800, 500);
    
    
    box = createRectSprite(COLLIDER_DYNAMIC, 100, 100, 40, 40);
    box.setFillColor("red");
    box.setBounciness(50.0);
    box.addCollisionListener(onBigRedBoxBallCollision, BALL_TAG);
    
    bigBall2= createCircleSprite(COLLIDER_DYNAMIC, 200, 100, 30);
    bigBall2.setBounciness(50.0);
    bigBall2.setFillColor("#ffffff00"); // transparent
   
    bigBall = createCircleSprite(COLLIDER_DYNAMIC, 200, 100, 20);
    bigBall.setBounciness(50.0);
    bigBall.setFillColor("#ffffff00"); // transparent
    // add an extra rectangle to this ball to see it rolling
    bigBall.createFixture({
        shape: new PLANCK.Box(bigBall.radius, 1)
    });

    createJoint(JOINT_DISTANCE, box, bigBall, { collideConnected: true });
    createJoint(JOINT_DISTANCE, box, bigBall2, { collideConnected: true });
   
    ledge = createRectSprite(COLLIDER_STATIC, 400, 400, 400, 10);
    ledge.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    
    ledge2 = createRectSprite(COLLIDER_STATIC, 400, 200, 10, 10);
    ledge2.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    
    ledge3 = createRectSprite(COLLIDER_DYNAMIC, 400, 200, 200, 10);
    ledge3.addCollisionListener(onLedgeBallCollision, BALL_TAG);
    
    createJoint(JOINT_REVOLUTE, ledge2, ledge3, { collideConnected: false});
    
    hangingBall = createCircleSprite(COLLIDER_DYNAMIC, 400, 450, 15);
    createJoint(JOINT_DISTANCE, hangingBall, ledge, { collideConnected: true });

  

    // create a chain which surrounds the canvas (hard walls)
    const walls = [
        { x: 0, y: 0 },
        { x: world.getWidth(), y: 0 },
        { x: world.getWidth(), y: world.getHeight() },
        { x: 0, y: world.getHeight() }
    ];
    createChainSprite(COLLIDER_STATIC, walls, true);

    createRandomObstacles(8);
    addCollisionListenerForTag(OBSTACLE_TAG, onObstacleCollision);

    addEventListener("mousedown", onMouseDown);
    addEventListener("mouseup", onMouseUp);
    addEventListener("mousemove", onMouseMove);

    drawEachFrame(0); // begin the animation loop
}

function drawEachFrame(timestamp){
    applyMouseForceToDraggingBall();
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function applyMouseForceToDraggingBall(){
    if(mouseDragging && draggingBall){
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({ x: (mouseX - center.x) * cursorForce, y: (mouseY - center.y) * cursorForce });
    }
}

function onBigRedBoxBallCollision(bigBox, ball, contact){
    ball.setFillColor("red");
}

function onObstacleCollision(obstacle, other, contact){
    other.setFillColor(obstacle.getFillColor());
}

function onLedgeBallCollision(ledge, ball, contact){
    ball.setFillColor(ledge.getFillColor());
}

function createRandomObstacles(count){
    for(let i = 0; i < count; i++){
        const width = getRandom(5, 50);
        const height = getRandom(5, 50);
        const x = getRandom(0, world.getWidth() - width);
        const y = getRandom(0, world.getHeight() - height);
        let obstacle = createRectSprite(COLLIDER_STATIC, x, y, width, height);
        obstacle.addTag(OBSTACLE_TAG);
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
    draggingBall.setStrokeColor("black");
}

function onMouseDown(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    if(ledge.containsPoint(mouseX, mouseY)){
        ledge.setFillColor(getRandomColor());
    } else {
        const balls = getSpritesByTag(BALL_TAG);
        const touching = balls.filter(b => b.containsPoint(mouseX, mouseY));
        if(touching.length > 0) {
            mouseDragging = true;
            draggingBall = touching[0];
            draggingBall.setStrokeColor("limegreen");
        } else {
            mouseDragging = true;
            createNewBall(mouseDragging);
        }  
    }   
}

function createNewBall(isDragging){
    let newBall = createCircleSprite(COLLIDER_DYNAMIC, mouseX, mouseY, 15);
    newBall.setStrokeColor("limegreen");
    newBall.setBounciness(0.3);
    newBall.setDensity(3);
    newBall.addTag(BALL_TAG);
    if(isDragging) draggingBall = newBall;
}
  