import { COLLIDER_DYNAMIC, COLLIDER_STATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, JOINT_WHEEL, createChainSprite, createCircleSprite, createJoint, createRectSprite, getRandom, renderFrame, setupWorld, PLANCK, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSprite, createPolygonSVGSprite } from "../../js/pzsprites.js";

window.onload = start;

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 10;

let truck;
let frontWheel;
let frontWheelJoint;
let backWheel;
let backWheelJoint;
let ground;

let world;

let cameraScale = 3;

async function start(){
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(10000, 500);
    world.setGravity({ x: 0, y: 10 });
    world.setCameraScale(cameraScale);

    // truck = createRectSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() / 2 - 50, 8, 2);

    const halfWidth = world.getWidth() / 2;
    const halfHeight = world.getHeight() / 2;
    // const truckVerts = [
    //     { x: -5, y: -5 },
    //     { x: 5, y: -5 },
    //     { x: 5, y: 0 },
    //     { x: -5, y: 0 }
    // ];
    // truck = createPolygonSprite(COLLIDER_DYNAMIC, halfWidth, halfHeight - 50, truckVerts);

    truck = await createPolygonSVGSprite(COLLIDER_DYNAMIC, halfWidth, halfHeight - 50, "truck.svg", 0.1);
    truck.setDensity(0.1);
    // truck.setDebug(true);


    backWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x - 10, truck.getPosition().y + 6, 3);  
    backWheel.setFillColor("#00000000"); // transparent
    backWheel.setStrokeWidth(0.5);
    // add another fixture on the back wheel so that we can see it turning.
    backWheel.createFixture({
        shape: new PLANCK.Box(backWheel.radius, 0.1)
    });
    frontWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x + 10, truck.getPosition().y + 6, 3);
    frontWheel.setFillColor("#00000000"); // transparent
    frontWheel.setStrokeWidth(0.5);
    frontWheel.createFixture({
        shape: new PLANCK.Box(frontWheel.radius, 0.1)
    });

    backWheelJoint = createJoint(JOINT_WHEEL, truck, backWheel, { axis: { x: 0, y: 1 }, anchor: backWheel.getPosition(), dampingRatio: 0.9, frequencyHz: 4 });
    frontWheelJoint = createJoint(JOINT_WHEEL, truck, frontWheel, { axis: { x: 0, y: 1 }, anchor: frontWheel.getPosition(), dampingRatio: 0.9, frequencyHz: 4 });

    backWheelJoint.setMaxMotorTorque(1500);

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

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    let truckPos = truck.getPosition();
    world.setCameraPosition(truckPos.x, truckPos.y);
    world.setCameraScale(cameraScale);
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function onKeyPress(e){
    if(e.key === "w"){
        cameraScale -= 0.5;
    }
    if(e.key === "e"){
        cameraScale += 0.5;
    }

    if(e.key === KEY_ARROW_LEFT){
        backWheelJoint.enableMotor(true);  
        backWheelJoint.setMotorSpeed(-20);
    } else if(e.key === KEY_ARROW_RIGHT){ 
        backWheelJoint.enableMotor(true);  
        backWheelJoint.setMotorSpeed(20);
    } else {
        backWheelJoint.setMotorSpeed(0);
        backWheelJoint.enableMotor(false);         
    } 
}   

function onKeyRelease(e){
    backWheelJoint.setMotorSpeed(0);
    backWheelJoint.enableMotor(false);
}