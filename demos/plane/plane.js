// planck integration prototype

import { angleTo, getLinearSpeedFromVector, getVector } from "../../js/pzsprites.js";
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
    SPEED_FACTOR = 1, // plane speed compensation factor (to reduce lift)
    DRAG_FACTOR = 1, // drag compensation factor (to reduce drag)
    VECTOR_REF_FRAMES = 10, // number of frames to average for flow vector
    LIFT_LIMIT = 500, // hard limit on lift force (to reduce craziness)
    COL_LIMIT = 2.5, // hard limit on CoL (to reduce craziness)

    // plane parameters
    PLANE_MASS = 900, // in kg
    MAX_THRUST = 15, // i.e., engine power
    THRUST_INCR = 0.1, // thrust to add each frame while engine on
    COD = 0.027, // coefficient of drag - for Cessna 172
    FRONT_AREA = 3, // frontal area for drag, sq meters
    WING_PLAN_AREA = 16.5, // wing area for lift, sq meters
    ELEVATOR_INCR = 0.05, // elevator increment each frame key is pressed
    MAX_ELEVATOR = 1,
    ELEVATOR_AREA = 0.9
    ;

// terrain generation parameters
const GROUND_SEGMENTS = 2000;
const MAX_VERTICAL_CHANGE = 0;

// sprites
let plane, 
    landingGear, gearJoint,
    planeNose, noseJoint,
    planeTail, tailJoint,
    
    exhaust, debugRefPoint,

    ground;

let maxCameraScale = 9;
let currentCameraScale = maxCameraScale;

let framecount = 0;
let elapsedTime = 0;
let framerate = 0;
let lastTimestamp = 0;

// physics variables
let 
    cogPos = {x:0, y:0}, // position of center of gravity, not body origin
    linearSpeed = 0,
    dragVector = {x:0, y:0},
    aoa = 0,
    aoaDeg = 0,
    col = 0,
    lift = 0,
    liftVector = {x:0, y:0},
    thrust = 0,
    thrustVector = {x:0, y:0},
    elevForceVector = {x:0, y:0},
    elevatorAmount = 0,
    elevatorState = "-",
    flowVector = {x: 0, y: 0},
    noseAngle = 0,
    bodyOriginToNoseVector = {x: 0, y: 0},
    vectorRefPoints = [],
    vectorRefAvgPoint = {x: 0, y: 0}
    ;

window.onload = start;

let world;

 async function start() {
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(100000, 500);
    world.setGravity({ x: 0, y: 9.8 });
    world.setCameraScale(maxCameraScale);

    let eachSegmentLength = world.getWidth() / GROUND_SEGMENTS;                                              
    let vertices = [{ x: 0, y: world.getHeight() / 2 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }
    ground = createChainSprite(COLLIDER_STATIC, vertices);
    ground.setBounciness(0);
    ground.setStrokeWidth(0.1);
   
    const planeBoundingPolygon = [
        { x: -6, y: 0.7 },
        { x: -6, y: -0.4 },
        { x: -3, y: -1.5 },
        { x: -2, y: -1.5 },
        // { x: 0, y: -15 },
        { x: 4.5, y: -2.5 },
        { x: 5, y: -2 },
        { x: 5.8, y: -0.3 },
        { x: 5, y: 0.2 },
        { x: -3.0, y: 1 }
    ];
    plane = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() / 2 - 5, "svg/plane.svg", 0.01, planeBoundingPolygon, -60, -600);
    let planeMass = { center: {}, I: 0, mass: 0};
    plane.getMassData(planeMass);
    // planeMass.center = { x: 0, y: 0 }; // set plane CoG    
    planeMass.center = { x: -2, y: 0 }; // set plane CoG    
    // planeMass.mass = PLANE_MASS; // setting the mass to 900 seems to break things
    plane.setMassData(planeMass);
    plane.setBounciness(0);
    plane.setAngularDamping(0.1);
    plane.setDebug(true);
   
    landingGear = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 3.3, plane.getPosition().y + 1.8, 0.4);
    landingGear.setFillColor("#00000000"); // transparent
    landingGear.setStrokeWidth(0.1);
    landingGear.setBounciness(0);
    landingGear.createFixture({
        shape: new PLANCK.Box(landingGear.radius, 0.1)
    });
    gearJoint = createJoint(JOINT_WHEEL, plane, landingGear, { axis: { x: 0, y: 1 }, anchor: landingGear.getPosition(), dampingRatio: 1 , frequencyHz: 10 });
    // gearJoint = createJoint(JOINT_WELD, plane, landingGear);
    
    planeNose = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 6, plane.getPosition().y, 0.5);
    planeNose.setFillColor("#00000000"); // transparent
    planeNose.setStrokeColor("#00000000");
    planeNose.setDensity(0.001);
    
    noseJoint = createJoint(JOINT_WELD, planeNose, plane, { localAnchorB: { x: -6, y: 0 } });

    planeTail = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x + 5.4, plane.getPosition().y - 0.5, 0.2)
    planeTail.setFillColor("red");
    planeTail.setStrokeColor("#00000000");
    planeTail.setDensity(0.001);
    planeTail.setBounciness(0);

    tailJoint = createJoint(JOINT_WELD, planeTail, plane, { localAnchorB: { x: 5.4, y: -0.5 } });

    debugRefPoint = createCircleSprite(COLLIDER_NONE, plane.getPosition().x, plane.getPosition().y, 0.4);
    debugRefPoint.setStrokeColor("#00000000");
    debugRefPoint.setFillColor("limegreen");

    vectorRefAvgPoint = plane.getPosition();

    addEventListener(EVENT_KEY_PRESSED, onKeyDown);
    addEventListener(EVENT_KEY_RELEASED, onKeyUp);

    drawEachFrame(0); // begin the animation loop
}

function drawEachFrame(timestamp){
    updateFrameCount(timestamp);
    getPlanePositionAndSpeed();
    setCameraPositionAndScale();
    calculatePlaneForces();
    renderFrame();
    drawPhysicsVars();
    requestAnimationFrame(drawEachFrame); // this asks the browser to call this function again when ready
}

function updateFrameCount(timestamp){
    framecount++;
    elapsedTime += timestamp - lastTimestamp;
    framerate = framecount / (elapsedTime / 1000);
    lastTimestamp = timestamp;
}

function getPlanePositionAndSpeed(){
    // at body origin
    // const planePos = plane.getPosition(); // Tricky!! this is a reference to a Vec22 object whose values will change

    const cog = plane.getWorldCenter(); // at center of gravity
    cogPos = { x: cog.x, y: cog.y };
    linearSpeed = getLinearSpeedFromVector(plane.getLinearVelocity()); 
}

function setCameraPositionAndScale(){
    world.setCameraPosition(cogPos.x, cogPos.y);
    currentCameraScale = maxCameraScale / linearSpeed ** 0.0    7;
    if(currentCameraScale < 1 || currentCameraScale > maxCameraScale)
        currentCameraScale = maxCameraScale;
    world.setCameraScale(currentCameraScale);
}

function drawPhysicsVars(){
    const vars = [
        `Frame rate: ${framerate.toFixed(2)} fps\n`,
        `Frame count: ${framecount} \n`,
        `Elapsed: ${(elapsedTime / 1000).toFixed(2) } sec\n`,
        `Cam Scale: ${currentCameraScale.toFixed(2)} \n`,
        `CoG Position: ${cogPos.x.toFixed(2)}, ${cogPos.y.toFixed(2)}\n`,
        `LinearSpeed: ${linearSpeed.toFixed(2)}\n`,
        `Thrust: ${thrust.toFixed(2)}\n`,
        `ThrustV: ${thrustVector.x.toFixed(2)}, ${thrustVector.y.toFixed(2)}\n`,
        // `FlowV: ${flowVector.x.toFixed(2)}, ${flowVector.y.toFixed(2)}\n`,
        // `WingToNoseV: ${wingToNoseVector.x.toFixed(2)}, ${wingToNoseVector.y.toFixed(2)}\n`,
        `Nose angle deg: ${noseAngle.toFixed(2)}\n`,
        `AoA deg: ${-aoaDeg.toFixed(2)}\n`,
        `CoL: ${col.toFixed(2)}\n`,
        `Lift: ${lift.toFixed(2)}\n`,
        `LiftV: ${liftVector.x.toFixed(2)}, ${liftVector.y.toFixed(2)}\n`,
        `DragV: ${dragVector.x.toFixed(2)}, ${dragVector.y.toFixed(2)}\n`,
        `Elev: ${elevatorState} ${elevatorAmount.toFixed(2)} \n`,
        `ElevV: ${elevForceVector.x.toFixed(2)}, ${elevForceVector.y.toFixed(2)}\n`
    ];
    const textSize = 16;
    vars.forEach((t, i) => {
        drawText(0, i * textSize, t, textSize, "black");
    });
    
}

function calculatePlaneForces(){
    // get flow angle relative to plane CoG - averaged over n frames
    vectorRefPoints.push({ x: cogPos.x, y: cogPos.y });
    if (vectorRefPoints.length === VECTOR_REF_FRAMES){
        vectorRefPoints.shift();
        vectorRefAvgPoint = vectorRefPoints.reduce((acc, cur, i) => {
            return { x: acc.x + cur.x, y: acc.y + cur.y };
        });
        vectorRefAvgPoint.x /= (VECTOR_REF_FRAMES - 1);
        vectorRefAvgPoint.y /= (VECTOR_REF_FRAMES - 1);
    }

    debugRefPoint.setPosition(vectorRefAvgPoint);

    flowVector = getVector(cogPos, vectorRefAvgPoint);

    // angle from body origin to vector ref
    let flowAngle = angleTo(cogPos, { x: vectorRefAvgPoint.x, y: vectorRefAvgPoint.y });
    noseAngle = angleTo(cogPos, planeNose.getPosition());
    aoa = (flowAngle - noseAngle);
    aoaDeg = 180 - (aoa * (180 / Math.PI));

    col = getCoL(-aoaDeg, "cubic2", COL_LIMIT);
    lift = getLift(getLinearSpeedFromVector(flowVector), col);

    // apply lift perpendicularly to air flow
    liftVector.x = flowVector.y * lift;
    liftVector.y = -(flowVector.x * lift);
    plane.applyForceToCenter(liftVector);
    
    // apply thrust
    bodyOriginToNoseVector = plane.vectorTo(planeNose);
    thrustVector.x = bodyOriginToNoseVector.x * thrust;
    thrustVector.y = bodyOriginToNoseVector.y * thrust;
    plane.applyForceToCenter(thrustVector);
    
    // apply drag opposite air flow
    const oppositeFlowVector = getVector(vectorRefAvgPoint, cogPos);
    const dragForce = getDrag(getLinearSpeedFromVector(oppositeFlowVector));
    dragVector.x = oppositeFlowVector.x * dragForce;
    dragVector.y = oppositeFlowVector.y * dragForce;
    plane.applyForceToCenter(dragVector);

    // control forces - elevator

    // apply force perpendicular to flow 
    const elevForce = ELEVATOR_AREA * (getLinearSpeedFromVector(flowVector) ** 2) * SPEED_FACTOR * elevatorAmount;
    if(elevatorState === 'DN'){ // i.e., stick forward
        // apply force from below plane (perpendicular to flow)
        elevForceVector = { x: elevForce * flowVector.y, y: -(elevForce * flowVector.x) };
        if(elevatorAmount < MAX_ELEVATOR) elevatorAmount += ELEVATOR_INCR;
    } else if(elevatorState === 'UP'){ // i.e., stick back
        // apply force from above plane (perpendicular to flow)
        elevForceVector = { x: elevForce * flowVector.y, y: elevForce * flowVector.x };
        if(elevatorAmount < MAX_ELEVATOR) elevatorAmount += ELEVATOR_INCR;
    } else {
        elevatorAmount = 0;
        elevForceVector = { x: 0, y: 0 };
    }
    planeTail.applyForceToCenter(elevForceVector);
}

function getDrag(speed){
    return (AIR_DENSITY * ((DRAG_FACTOR * speed) ** 2) * COD * FRONT_AREA) / 2;
}

function getLift(speed, col){
    return (AIR_DENSITY * ((SPEED_FACTOR * speed) ** 2) * col * WING_PLAN_AREA) / 2;
}

// lift slope approximation
// aoa in degrees, as a positive angle of wing from flow
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

function onKeyDown(e){
    if(e.key === "w"){
        if(thrust < MAX_THRUST) {
            thrust += THRUST_INCR;
        }
    }
    if (e.key === KEY_ARROW_UP){ // i.e., stick forward
        elevatorState = "DN";
    }
    if (e.key === KEY_ARROW_DOWN){ // i.e., stick back
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


