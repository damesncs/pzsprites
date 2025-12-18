import { COLLIDER_DYNAMIC, COLLIDER_STATIC, JOINT_WHEEL, createChainSprite, createCircleSprite, createJoint, createRectSprite, getRandom, renderFrame, setupWorld } from "../../js/pzsprites.js";

window.onload = start;

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;

// terrain generation parameters
const GROUND_SEGMENTS = 10;
const MAX_VERTICAL_CHANGE = 40;

let truck;
let frontWheel;
let backWheel;
let ground;

function start(){
    setupWorld("canvas", CANVAS_WIDTH, CANVAS_HEIGHT);

    truck = createRectSprite(COLLIDER_DYNAMIC, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 4, 75, 20);
    backWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x - 30, truck.getPosition().y + 20, 10);
    frontWheel = createCircleSprite(COLLIDER_DYNAMIC, truck.getPosition().x + 30, truck.getPosition().y + 20, 10);
    // TODO fix axis (radians) and anchor 
    createJoint(JOINT_WHEEL, truck, backWheel, { axis: 2, anchor: truck.getPosition().x - 30 });
    createJoint(JOINT_WHEEL, truck, frontWheel);


    let eachSegmentLength = CANVAS_WIDTH / GROUND_SEGMENTS;
    let vertices = [{ x: 0, y: CANVAS_HEIGHT / 2 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }

    ground = createChainSprite(COLLIDER_STATIC, vertices);

    drawEachFrame(0);
}


function drawEachFrame(timestamp){
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}