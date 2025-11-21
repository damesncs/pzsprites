// planck integration tester

import {
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    createCircleSprite,
    createEdge,
    createRectSprite,
    renderFrame,
    setupWorld
} from "../../js/pzsprites.js";

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// const BALL_MOUSE_FOLLOW_SPEED = 2;
// const BALL_BOUNCE_SPEED_LOSS = 2; // higher number => less bouncy
// const BALL_GRAVITY = 0.4;

window.onload = start;

const ballSprites = [];
const obstacleSprites = [];

let mouseX = 0, mouseY = 0;
let mouseDragging = false;

async function start() {
    setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    
    let box = createRectSprite({
        position: { x: 100, y: 150 },
        type: COLLIDER_DYNAMIC,
    }, 100, 100, "red", "black");

    let ball = createCircleSprite({
        position: { x: 200, y: 300 },
        type: COLLIDER_DYNAMIC,
    }, 20, "green", "black");

    // let floor = createEdge(0, CANVAS_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, "black");

    let floor = createRectSprite({
        position: { x: 0, y: 400 },
        type: COLLIDER_STATIC
    }, 500, 10, "orange", "black");

    // createRandomObstacles(8);

    // addEventListener("mousedown", onMouseDown);
    // addEventListener("mouseup", onMouseUp);
    // addEventListener("mousemove", onMouseMove);

    drawFrame(0);
}

function drawFrame(timestamp){

    renderFrame();
    
    window.requestAnimationFrame(drawFrame);
}

function updateBallMovement(){
    ballSprites.forEach(eachBall => {

        if(eachBall.dragging){
            // ball is being dragged by the user with the mouse
            // ball moves faster the further it is away from mouse in each dimension
            const xDist = Math.abs(eachBall.x - mouseX);
            const yDist = Math.abs(eachBall.y - mouseY);
            const speedFactor = 0.01;
            const xSpeed = BALL_MOUSE_FOLLOW_SPEED * xDist * speedFactor;
            const ySpeed = BALL_MOUSE_FOLLOW_SPEED * yDist * speedFactor;
    
            if(mouseX < eachBall.x) eachBall.dx = -xSpeed;
            else if(mouseX > eachBall.x) eachBall.dx = xSpeed;
            else eachBall.dx = 0;
    
            if(mouseY < eachBall.y) eachBall.dy = -ySpeed;
            else if(mouseY > eachBall.y) eachBall.dy = ySpeed;
            else eachBall.dy = 0;
    
        } else {
            // this ball is not being dragged by the mouse, so apply physics rules
       
            // check for collisions with obstacles
            obstacleSprites.forEach(o => {
                let topOrBottomColliding = false;

                if(circleRectangleLeftEdgeAreColliding(eachBall, o)){
                    eachBall.dx = -(getSpeedFromCollision(eachBall.dx));
                    eachBall.x = o.leftEdge - eachBall.radius;
                }
                else if(circleRectangleRightEdgeAreColliding(eachBall, o)){
                    eachBall.dx = getSpeedFromCollision(eachBall.dx);
                    eachBall.x = o.rightEdge + eachBall.radius;
                } 

                if(circleRectangleBottomEdgeAreColliding(eachBall, o)){            
                    eachBall.dy = getSpeedFromCollision(eachBall.dy);
                    eachBall.y = o.bottomEdge + eachBall.radius;
                    topOrBottomColliding = true;
                }
                else if(circleRectangleTopEdgeAreColliding(eachBall, o)){                    
                    eachBall.dy = -(getSpeedFromCollision(eachBall.dy));
                    eachBall.y = o.topEdge - eachBall.radius;
                    topOrBottomColliding = true;
                }
                
                if(topOrBottomColliding){
                    if(eachBall.x >= o.rightEdge && eachBall.leftEdge <= o.rightEdge){
                        eachBall.dx += BALL_BOUNCE_SPEED_LOSS / 4;
                    } else if(eachBall.x <= o.leftEdge && eachBall.rightEdge >= o.leftEdge){
                        eachBall.dx -= BALL_BOUNCE_SPEED_LOSS / 4;
                    } 
                }
                
            });

             // bounce on right wall
            if(eachBall.rightEdge >= CANVAS_WIDTH){
                eachBall.dx = -(getSpeedFromCollision(eachBall.dx));
                eachBall.x = CANVAS_WIDTH - eachBall.radius;
            }
            // bounce on left wall
            else if(eachBall.leftEdge <= 0){
                eachBall.dx = getSpeedFromCollision(eachBall.dx);
                eachBall.x = eachBall.radius;
            }

            // bounce on top wall
            if(eachBall.topEdge <= 0){
                eachBall.dy = getSpeedFromCollision(eachBall.dy);
                eachBall.y = eachBall.radius;
            }
            // bounce on bottom wall
            else if(eachBall.bottomEdge >= CANVAS_HEIGHT){
                eachBall.dy = -(getSpeedFromCollision(eachBall.dy));
                eachBall.y = CANVAS_HEIGHT - eachBall.radius;
            }
        }

         // apply gravity
         if(eachBall.bottomEdge <= CANVAS_HEIGHT){
            eachBall.dy += BALL_GRAVITY;
        } else {
            // come back to rest on bottom edge since ball has gone beyond it
            eachBall.y = CANVAS_HEIGHT - eachBall.radius;
        }
    
       
    });
}

function getSpeedFromCollision(d){
    const absSpeed = Math.abs(d);
    if(absSpeed >= BALL_BOUNCE_SPEED_LOSS){
        return absSpeed - BALL_BOUNCE_SPEED_LOSS;
    }
    return 0;
}

function createNewBall(isDragging){
    let newBall = createCircleSprite(mouseX, mouseY, 0, 0, 15, getRandomColorHexString());
    newBall.dragging = isDragging;
    ballSprites.push(newBall);
}

function createRandomObstacles(count){
    for(let i = 0; i < count; i++){
        const width = getRandom(5, 50);
        const height = getRandom(5, 50);
        const x = getRandom(0, CANVAS_WIDTH - width);
        const y = getRandom(0, CANVAS_HEIGHT - height);
        obstacleSprites.push(createRectSprite(x, y, 0, 0, width, height, getRandomColorHexString()));
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

