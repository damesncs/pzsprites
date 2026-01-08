import { COLLIDER_DYNAMIC, COLLIDER_STATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, JOINT_WHEEL, createChainSprite, createCircleSprite, createJoint, createRectSprite, getRandom, renderFrame, setupWorld } from "../../js/pzsprites.js";

window.onload = start;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// terrain generation parameters
const GROUND_SEGMENTS = 15;
const MAX_VERTICAL_CHANGE = 10;

const MAX_SPEED = 10;

let truck;
let frontWheel;
let frontWheelJoint;
let backWheel;
let backWheelJoint;
let ground;

let world;

function start(){
    world = setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);
    world.setGravity({ x: 0, y: 10 });


    truck = createRectSprite(COLLIDER_DYNAMIC, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4, 2.5, 1);

    backWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x - 1, truck.getPosition().y + 1, 2);
    frontWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x + 1, truck.getPosition().y + 1, 2);

    backWheelJoint = createJoint(JOINT_WHEEL, truck, backWheel, { axis: { x: 0, y: 1 }, anchor: backWheel.getPosition(), friction: 0.9 });
    frontWheelJoint = createJoint(JOINT_WHEEL, truck, frontWheel, { axis: { x: 0, y: 1 }, anchor: frontWheel.getPosition(), friction: 0.9 });
    backWheelJoint.setMaxMotorTorque(1000);
   

    let eachSegmentLength = CANVAS_WIDTH / GROUND_SEGMENTS;                                              
    let vertices = [{ x: 0, y: CANVAS_HEIGHT / 2 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }

    ground = createChainSprite(COLLIDER_STATIC, vertices);

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function onKeyPress(e){
    
    if(e.key === "ArrowLeft"){
        backWheelJoint.enableMotor(true);  
        backWheelJoint.setMotorSpeed(0);
    } else if(e.key === "ArrowRight"){ 
        backWheelJoint.enableMotor(true);  
        // let speed = backWheelJoint.getMotorSpeed();
        backWheelJoint.setMotorSpeed(-1000);

        // console.log(speed);     
    } else {
        backWheelJoint.setMotorSpeed(0);
        // backWheelJoint.enableMotor(false);         
    }
    
           
    
}   

function onKeyRelease(e){
    // backWheelJoint.enableMotor(false);  
}