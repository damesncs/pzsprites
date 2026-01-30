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
    createChainSprite,
    createJoint,
    addCollisionListenerForSprite,
    JOINT_DISTANCE,
     EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, JOINT_WHEEL, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSprite, createPolygonSVGSprite
} from "../../js/pzsprites.js";

const
    // physics parameters
    AIR_DENSITY = 1.2,
    SPEED_FACTOR = 0.3, // plane speed compensation factor (to reduce lift)
    VECTOR_REF_FRAMES = 10, // number of frames to average for flow reference
    LIFT_LIMIT = 100, // hard limit on lift force (to reduce craziness)
    COL_LIMIT = 2.5, // hard limit on CoL (to reduce craziness)

    // plane parameters
    MAX_THRUST = 20, // i.e., engine power
    THRUST_INCR = 0.1, // thrust to add each frame while engine on
    COD = 0.0378, // coefficient of drag - for Sopwith Camel
    FRONT_AREA = 15, // frontal area for drag
    WINGSPAN = 10,
    WING_LENGTH = 1, // i.e., cross-section length
    WING_PLAN_AREA = WINGSPAN * WING_LENGTH, // wing area for lift
    ELEVATOR_AREA = 0.05,

    // world parameters
    GROUND_HEIGHT = 30,
    GROUND_WIDTH = 10000, // this is the world area to generate, with the plane in the center
    MAX_ALT = 10000, // maximum altitude
    TREES_COUNT = 50, // trees to generate
    CLOUDS_COUNT = 50 // clouds to generate
    ;

// const vectorRefPoint = { x: 0, y: 0};
const vectorRefPoints = [];
let vectorRefAvgPoint = {x: 0, y: 0};

// sprites
let plane, frontWheel, frontWheelJoint, planeTailWheel, planeNose,
    noseJoint, wheelJoint, tailWheelJoint, exhaust,

    ground, display, debugRefPoint,

    obstacles, trees, clouds,
    
    leftBound, rightBound, planeCameraMargin;

let flowAngle = 0, noseAngle = 0;

let elevatorState = "-";

let planeImg;

// physics variables
let drag = 0,
    dragArea = 0,
    aoa = 0,
    col = 0,
    lift = 0,
    xForce = 0,
    thrust = 0,
    elevForce = 0;

window.onload = start;

let world;

 async function start() {
    world = setupWorld("canvas", 800, 500);
    world.setGravity({ x: 0, y: 10 });

    ground = createRectSprite("static", GROUND_WIDTH / 2 , world.getHeight() - GROUND_HEIGHT, GROUND_WIDTH, GROUND_HEIGHT);
    ground.setFillColor("#964B00");
    ground.setFriction(10);
    //let truck;
    //truck = await createPolygonSVGSprite(COLLIDER_DYNAMIC, 100, 50, "truck.svg", 0.1);
    plane = await createPolygonSprite("COLLIDER_DYNAMIC", world.getWidth() / 2, world.getHeight() / 2 - 50, 0.1)
   // frontWheel = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x + 10, plane.getPosition().y + 6, 3);
    //frontWheel.setFillColor("#00000000"); // transparent
    //frontWheel.setStrokeWidth(0.5);
    frontWheel.createFixture({
        shape: new PLANCK.Box(frontWheel.radius, 0.1)
    });
    frontWheelJoint = createJoint(JOINT_WHEEL, plane, frontWheel, { axis: { x: 0, y: 1 }, anchor: frontWheel.getPosition(), dampingRatio: 0.9, frequencyHz: 4 });

    
    drawEachFrame(0); // begin the animation loop
}

function drawEachFrame(timestamp){
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

/*function applyMouseForceToDraggingBall(){
    if(mouseDragging && draggingBall){
        const center = draggingBall.getPosition();
        draggingBall.applyForceToCenter({ x: (mouseX - center.x) * cursorForce, y: (mouseY - center.y) * cursorForce });
    }
}*/

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