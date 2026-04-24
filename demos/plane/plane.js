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
    SPEED_FACTOR = 1, // plane speed compensation factor (to reduce lift)
    DRAG_FACTOR = 1, // drag compensation factor (to reduce drag)
    VECTOR_REF_FRAMES = 10, // number of frames to average for flow vector
    // TODO something's wrong with lift limit
    LIFT_LIMIT = 500, // hard limit on lift force (to reduce craziness)
    COL_LIMIT = 2.5, // hard limit on CoL (to reduce craziness)

    // plane parameters
    MAX_THRUST = 3, // i.e., engine power
    THRUST_INCR = 0.5, // thrust to add each frame while engine on
    COD = 0.027, // coefficient of drag - for Cessna 172
    FRONT_AREA = 3, // frontal area for drag, sq meters
    WING_PLAN_AREA = 16.5, // wing area for lift, sq meters
    ELEVATOR_AREA = 1,

    // world parameters
    GROUND_HEIGHT = 30,
    GROUND_WIDTH = 10000, // this is the world area to generate, with the plane in the center
    MAX_ALT = 10000, // maximum altitude
    TREES_COUNT = 50, // trees to generate
    CLOUDS_COUNT = 50 // clouds to generate
    ;

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 3;

// sprites
let plane, 
    landingGear, gearJoint,
    planeNose, noseJoint,
    planeTail, tailJoint,
    
    exhaust, debugRefPoint,

    ground, display,
     
    obstacles, trees, clouds,
    
    leftBound, rightBound, planeCameraMargin;

let cameraScale = 10;

// physics variables
let 
    speed = {x:0, y:0},
    dragVector = {x:0, y:0},
    dragArea = 0,
    aoa = 0,
    col = 0,
    lift = 0,
    liftVector = {x:0, y:0},
    xForce = 0,
    thrust = 0,
    thrustVector = {x:0, y:0},
    elevForceVector = {x:0, y:0},
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
    world.setGravity({ x: 0, y: 9.8 });
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
    plane = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() / 2 - 1, "svg/plane.svg", 0.01, planeBoundingPolygon, -60, -600);
    plane.setDensity(0.1);
    let planeMass = { center: {}, I: 0, mass: 0};
    plane.getMassData(planeMass);
    planeMass.center = { x: -3, y: 0 }; // set plane CoG       
    plane.setMassData(planeMass);
    plane.setDebug(true);
   
    landingGear = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 3.3, plane.getPosition().y + 1.8, 0.4);
    landingGear.setFillColor("#00000000"); // transparent
    landingGear.setStrokeWidth(0.1);
    landingGear.createFixture({
        shape: new PLANCK.Box(landingGear.radius, 0.1)
    });
    gearJoint = createJoint(JOINT_WHEEL, plane, landingGear, { axis: { x: 0, y: 1 }, anchor: landingGear.getPosition(), dampingRatio: 1, frequencyHz: 10 });
    
    planeNose = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x - 6, plane.getPosition().y, 0.5);
    planeNose.setFillColor("#00000000"); // transparent
    planeNose.setStrokeColor("#00000000");
    planeNose.setDensity(0.001);
    
    noseJoint = createJoint(JOINT_WELD, planeNose, plane, { localAnchorB: { x: -6, y: 0 } });

    planeTail = createCircleSprite(COLLIDER_DYNAMIC, plane.getPosition().x + 5.4, plane.getPosition().y - 0.5, 0.2)
    planeTail.setFillColor("red");
    planeTail.setStrokeColor("#00000000");
    planeTail.setDensity(0.001);

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
    let planePos = plane.getPosition();
    world.setCameraPosition(planePos.x, planePos.y);
    world.setCameraScale(cameraScale);
    calculatePlaneForces();
    
    renderFrame();
    drawPhysicsVars();

    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function drawPhysicsVars(){
    const vars = [
        `Thrust: ${thrust.toFixed(2)}\n`,
        `ThrustV: ${thrustVector.x.toFixed(2)}, ${thrustVector.y.toFixed(2)}\n`,
        `FlowV: ${flowVector.x.toFixed(2)}, ${flowVector.y.toFixed(2)}\n`,
        `WingToNoseV: ${wingToNoseVector.x.toFixed(2)}, ${wingToNoseVector.y.toFixed(2)}\n`,
        `AoA: ${aoa.toFixed(2)}\n`,
        `CoL: ${col.toFixed(2)}\n`,
        `Lift: ${lift.toFixed(2)}\n`,
        `LiftV: ${liftVector.x.toFixed(2)}, ${liftVector.y.toFixed(2)}\n`,
        `PlaneV: ${speed.x.toFixed(2)}, ${speed.y.toFixed(2)}\n`,
        `DragV: ${dragVector.x.toFixed(2)}, ${dragVector.y.toFixed(2)}\n`,
        `Elev: ${elevatorState} \n`,
        `ElevV: ${elevForceVector.x.toFixed(2)}, ${elevForceVector.y.toFixed(2)}\n`,
    ];
    const textSize = 16;
    vars.forEach((t, i) => {
        drawText(0, i * textSize, t, textSize, "black");
    });
    
}

function calculatePlaneForces(){
    const planePos = plane.getPosition(); // Tricky!! this is a reference to a Vec22 object whose values will change

    speed = plane.getLinearVelocity(); // at CoG
    
    // get flow angle relative to plane CoG - averaged over n frames
    vectorRefPoints.push({ x: planePos.x, y: planePos.y });
    if (vectorRefPoints.length === VECTOR_REF_FRAMES){
        vectorRefPoints.shift();
        vectorRefAvgPoint = vectorRefPoints.reduce((acc, cur, i) => {
            return { x: acc.x + cur.x, y: acc.y + cur.y };
        });
        vectorRefAvgPoint.x /= (VECTOR_REF_FRAMES - 1);
        vectorRefAvgPoint.y /= (VECTOR_REF_FRAMES - 1);
    }
            
    debugRefPoint.setPosition(vectorRefAvgPoint);

    flowVector = getVector(planePos, vectorRefAvgPoint);

    let flowAngle = plane.angleTo({ x: vectorRefAvgPoint.x, y: vectorRefAvgPoint.y });
    noseAngle = plane.angleTo(planeNose);
    aoa = (flowAngle - noseAngle);

    col = getCoL(aoa, "cubic2", COL_LIMIT);
    lift = getLift(flowVector.x, col); // TODO speed needs to be speed along flow vector??

    // apply lift perpendicularly to air flow
    liftVector.x = flowVector.y * lift;
    liftVector.y = -(flowVector.x * lift);
    plane.applyForceToCenter(liftVector);
    
    // apply thrust
    wingToNoseVector = plane.vectorTo(planeNose);
    thrustVector.x = wingToNoseVector.x * thrust;
    thrustVector.y = wingToNoseVector.y * thrust;
    plane.applyForceToCenter(thrustVector);
    
    // apply drag opposite air flow
    const oppositeFlowVector = getVector(vectorRefAvgPoint, planePos);
    // not sure this makes sense
    const dragForce = getDrag(getLinearVelocity(oppositeFlowVector));
    dragVector.x = oppositeFlowVector.x * dragForce;
    dragVector.y = oppositeFlowVector.y * dragForce;
    plane.applyForceToCenter(dragVector);

    // control forces - elevator
    // apply force perpendicular to flow 
    const elevForce = ELEVATOR_AREA * (getLinearVelocity(flowVector) ** 2) * SPEED_FACTOR;
    if(elevatorState === 'DN'){ // i.e., stick forward
        
        elevForceVector = { x: elevForce * oppositeFlowVector.y, y: elevForce * oppositeFlowVector.x};
    } else if(elevatorState === 'UP'){ // i.e., stick back
        
        elevForceVector = { x: elevForce * oppositeFlowVector.y, y: -(elevForce * oppositeFlowVector.x)};
    } else {
        elevForceVector = { x: 0, y: 0 };
    }
    // planeTail.applyForceToCenter(elevForceVector);
}

function getDrag(speed){
    return (AIR_DENSITY * ((DRAG_FACTOR * speed) ** 2) * COD * FRONT_AREA) / 2;
}

function getLift(speed, col){
    return (AIR_DENSITY * ((SPEED_FACTOR * speed) ** 2) * col * WING_PLAN_AREA) / 2;
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

function getVector(a, b){
    return {x: b.x - a.x, y: b.y - a.y};
}

function addVectors(v1, v2){
    return {x: v1.x + v2.x, y: v1.y + v2.y };
}

function getLinearVelocity(v){
    return Math.abs(v.x) + Math.abs(v.y);
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


