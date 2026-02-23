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
     EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, JOINT_WHEEL, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSprite, createPolygonSVGSprite, JOINT_WELD, COLLIDER_NONE, drawCircle, drawText, KEY_ARROW_UP, KEY_ARROW_DOWN
} from "../../js/pzsprites.js";

const
    // physics parameters
    AIR_DENSITY = 1.2,
    SPEED_FACTOR = 0.3, // plane speed compensation factor (to reduce lift)
    VECTOR_REF_FRAMES = 10, // number of frames to average for flow reference
    LIFT_LIMIT = 100, // hard limit on lift force (to reduce craziness)
    COL_LIMIT = 2.5, // hard limit on CoL (to reduce craziness)

    // plane parameters
    MAX_THRUST = 2000, // i.e., engine power
    THRUST_INCR = 1, // thrust to add each frame while engine on
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

// sprites
let plane, 
    landingGear, gearJoint,
    planeNose, noseJoint,
    
    exhaust, debugRefPoint,

    ground, display,
     
    obstacles, trees, clouds,
    
    leftBound, rightBound, planeCameraMargin;

let cameraScale = 1;

// physics variables
let 
    speed = {x:0, y:0},
    drag = {x:0, y:0},
    dragArea = 0,
    aoa = 0,
    col = 0,
    lift = 0,
    xForce = 0,
    thrust = 0,
    elevForce = 0,
    elevatorState = "-",
    flowVector = {x: 0, y: 0},
    noseAngle = 0,
    wingToNoseVector = {x: 0, y: 0},
    vectorRefPoints = [],
    vectorRefAvgPoint = {x: 0, y: 0}
    ;

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
   
    const planeBoundingPolygon = [
        { x: -60, y: 7 },
        { x: -60, y: -4 },
        { x: -30, y: -15 },
        { x: -20, y: -15 },
        // { x: 0, y: -15 },
        { x: 45, y: -25 },
        { x: 50, y: -20 },
        { x: 58, y: -3 },
        { x: 50, y: 2 },
        { x: -30, y: 10 }
    ];
    plane = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() / 2 - 50, "svg/plane.svg", 0.1, planeBoundingPolygon, -60, -600);
    plane.setDensity(0.1);
    let planeMass = { center: {}, I: 0, mass: 0};
    plane.getMassData(planeMass);
    planeMass.center = { x: -30, y: 0 }; // set plane CoG
    plane.setMassData(planeMass);
    plane.setDebug(true);
   
    landingGear = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 33, plane.getPosition().y + 18, 4);
    landingGear.setFillColor("#00000000"); // transparent
    landingGear.setStrokeWidth(0.5);
    landingGear.createFixture({
        shape: new PLANCK.Box(landingGear.radius, 0.1)
    });
    gearJoint = createJoint(JOINT_WHEEL, plane, landingGear, { axis: { x: 0, y: 1 }, anchor: landingGear.getPosition(), dampingRatio: 1, frequencyHz: 10 });
    
    planeNose = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 60, plane.getPosition().y, 5);
    planeNose.setFillColor("#00000000"); // transparent
    planeNose.setDensity(0.001);
    
    noseJoint = createJoint(JOINT_WELD, planeNose, plane, { localAnchorB: { x: -60, y: 0 } });

    debugRefPoint = createCircleSprite(COLLIDER_NONE, plane.getPosition().x, plane.getPosition().y, 4);
    debugRefPoint.setFillColor("limegreen");

    vectorRefAvgPoint = plane.getPosition();

    addEventListener(EVENT_KEY_PRESSED, onKeyDown);
    addEventListener(EVENT_KEY_RELEASED, onKeyUp);

    drawEachFrame(0); // begin the animation loop
}

function drawEachFrame(timestamp){
    let planePos = plane.getPosition();
    world.setCameraPosition(planePos.x, planePos.y);
    world.setCameraScale(cameraScale);
    calculatePlaneForces();
    
    renderFrame();
    drawPhysicsVars();

    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function drawPhysicsVars(){
    // const planePos = plane.getPosition();
    const text =
    `Thrust: ${thrust.toFixed(2)}\n` +
    // `xForce: ${xForce.toFixed(2)}\n` +
    `Speed: ${speed.x.toFixed(2)}, ${speed.y.toFixed(2)}\n` +
    // `yVel ${(plane.vel.y).toFixed(1)}\n` +
    `Drag: ${drag.x.toFixed(2)}, ${drag.y.toFixed(2)}\n` +
    // `NoseA: ${noseAngle.toFixed(1)}\n` + 
    `WingToNoseV: ${wingToNoseVector.x.toFixed(2)}, ${wingToNoseVector.y.toFixed(2)}\n` + 
    `AoA: ${Math.trunc(aoa)}\n` +   
    // `AoAR ${aoaRadians.toFixed(2)}\n` + 
    `CoL: ${col.toFixed(2)}\n` +
    // `DragArea ${Math.trunc(dragArea)}\n` +
    `Lift: ${lift.toFixed(2)}\n` +
    // `DX: ${Math.abs(vectorRefAvgPoint.x - plane.x).toFixed(1)}\n` +
    // `DY: ${Math.abs(vectorRefAvgPoint.y - plane.y).toFixed(1)}\n` +
    `FlowV: ${flowVector.x.toFixed(2)}, ${flowVector.y.toFixed(2)}\n` +
    // `Alt: ${Math.trunc(height - planePos.y - (ground[0] ? ground[0].height : 0) - (plane.height / 2))}\n` +
    `Elev: ${elevatorState} ${elevForce.toFixed(1)}\n` 
    ;
    drawText(0, 0, text, 16, "black");
}

function calculatePlaneForces(){
    
    speed = plane.getLinearVelocity(); // at CoG

    // get flow angle relative to plane CoG - averaged over n frames
    vectorRefPoints.push(plane.getPosition());
    if (vectorRefPoints.length === VECTOR_REF_FRAMES){
        vectorRefPoints.shift();
        vectorRefAvgPoint = vectorRefPoints.reduce((acc, cur, i) => {
            return { x: acc.x + cur.x, y: acc.y + cur.y };
        });
        vectorRefAvgPoint.x /= VECTOR_REF_FRAMES - 1;
        vectorRefAvgPoint.y /= VECTOR_REF_FRAMES - 1;
    }
            
    debugRefPoint.setPosition(vectorRefAvgPoint);

    let flowAngle = getOppositeAngle(plane.angleTo(vectorRefAvgPoint.x, vectorRefAvgPoint.y));
    flowVector = vector(vectorRefAvgPoint, plane.getPosition());

    noseAngle = plane.angleTo(planeNose);
    aoa = (flowAngle - noseAngle);


    col = getCoL(aoa, "cubic2", COL_LIMIT);
    lift = getLift(speed.x, col); // TODO speed needs to be speed along flow vector

    // apply lift perpendicularly to air flow
    if (Math.abs(lift) <= LIFT_LIMIT){
       
        plane.applyForceToCenter({
            x: flowVector.y * lift,
            y: flowVector.x * lift
        });
    }

    // apply thrust
    wingToNoseVector = plane.vectorTo(planeNose);
    const thrustVector = {
        x: wingToNoseVector.x * thrust,
        y: wingToNoseVector.y * thrust
    };
    plane.applyForceToCenter(thrustVector);
    
    // apply drag opposite air flow
    drag.x = getDrag(speed.x);
    drag.y = getDrag(speed.y);
    const oppositeFlowVector = vector(plane.getPosition(), vectorRefAvgPoint);
    const dragVector = {
        x: oppositeFlowVector.x * drag.x,
        y: oppositeFlowVector.y * drag.y
    };
    plane.applyForceToCenter(dragVector);
}

function getDrag(speed){
    return (AIR_DENSITY * (speed ** 2) * COD * FRONT_AREA) / 2;
}

function getLift(speed, col){
    return (AIR_DENSITY * ((SPEED_FACTOR * speed) ** 2) * col * WING_PLAN_AREA) / 2;
}

function getOppositeAngle(theta) {
    if(theta < 0){
        return theta + 180;
    } else {
        return -(180 - theta);
    }
}

// lift slope approximation
// aoa in degrees
function getCoL(aoa, liftCurve, limit){
    let c = 0;
    if (Math.abs(aoa) <= 90){
        if(liftCurve === "quartic1"){
            c = -0.00001 * ((aoa) ** 4) + ((aoa * 0.0001) ** 3) + ((aoa * 0.002) ** 2) + (aoa * 0.15);
        }
        else if (liftCurve === "cubic1"){
            // plug this equation into desmos to see it
            // y\ =-0.001x^{3}\ +\ 0.015x^{2}\ +\ 0.3x
            // cubic1
            c = (-0.001 * (aoa ** 3)) + (0.01 * (aoa ** 2)) + (aoa * 0.26) + 1;
        }
        // cubic2
        // y\ =-0.0001x^{3}\ +\ 0.0001x^{2}\ +\ 0.09x
        else c = (-0.0001 * (aoa ** 3)) + (0.0001 * (aoa ** 2)) + (aoa * 0.09) + 0.5;
        
    }
    if(Math.abs(c <= limit)){
        return c;
    } 
    if (c >= limit) return limit;
    if (c <= -limit) return -limit;
    return 0;
}

function vector(a, b){
    return {x: b.x - a.x, y: b.y - a.y};
}

function onKeyDown(e){
    if(e.key === "w"){
        if(thrust < MAX_THRUST) {
            thrust += THRUST_INCR;
        }
    }
    if (e.key === KEY_ARROW_UP){
        // down elevator (stick forward)
        // planeTailWheel.bearing = getOppositeAngle(planeTailWheel.angleTo(plane)) + 90;
        // elevForce = ELEVATOR_AREA * (plane.speed ** 2) * SPEED_FACTOR;
        // planeTailWheel.applyForce(elevForce); 
        elevatorState = "DN";
    }
    if (e.key === KEY_ARROW_DOWN){
        // up elevator (stick back)
        // planeTailWheel.bearing = getOppositeAngle(planeTailWheel.angleTo(plane)) - 90;
        // elevForce = ELEVATOR_AREA * (plane.speed ** 2) * SPEED_FACTOR;
        // planeTailWheel.applyForce(elevForce);
        elevatorState = "UP";
    }
}

function onKeyUp(e){
    if(e.key === "w"){
        thrust = 0;
    }
    if (e.key === KEY_ARROW_UP){
        elevatorState = "-";
    }
    if (e.key === KEY_ARROW_DOWN){
        elevatorState = "-";
    }
}
