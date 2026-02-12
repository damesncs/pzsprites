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

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 5;

// const vectorRefPoint = { x: 0, y: 0};
const vectorRefPoints = [];
let vectorRefAvgPoint = {x: 0, y: 0};

// sprites
let plane, tailWheel, tailWheelJoint, planeTailWheel, planeNose,
    noseJoint, exhaust,

    ground, display, debugRefPoint,

    obstacles, trees, clouds,
    
    leftBound, rightBound, planeCameraMargin;

let cameraScale = 1;

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
    world.setWorldDimensions(10000, 500);
    world.setGravity({ x: 0, y: 10 });
    world.setCameraScale(cameraScale);

    let eachSegmentLength = world.getWidth() / GROUND_SEGMENTS;                                              
    let vertices = [{ x: 0, y: world.getHeight() / 2 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }
    ground = createChainSprite(COLLIDER_STATIC, vertices);
    ground.setStrokeWidth(0.5);
   
    plane = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() / 2 - 50, "svg/Piper_J3_Cub.svg", 0.1);
    plane.setDebug(true);
   
    tailWheel = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x + 10, plane.getPosition().y + 6, 3);
    tailWheel.setFillColor("#00000000"); // transparent
    tailWheel.setStrokeWidth(0.5);
    tailWheel.createFixture({
        shape: new PLANCK.Box(tailWheel.radius, 0.1)
    });
    tailWheelJoint = createJoint(JOINT_WHEEL, plane, tailWheel, { axis: { x: 0, y: 1 }, anchor: tailWheel.getPosition(), dampingRatio: 0.9, frequencyHz: 4 });

    
    drawEachFrame(0); // begin the animation loop
}

function drawEachFrame(timestamp){
    let planePos = plane.getPosition();
    world.setCameraPosition(planePos.x, planePos.y);
    world.setCameraScale(cameraScale);
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

