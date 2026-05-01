import { COLLIDER_DYNAMIC, COLLIDER_STATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, JOINT_WHEEL, createChainSprite, createCircleSprite, createJoint, createRectSprite, getRandom, renderFrame, setupWorld, PLANCK, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSprite, createPolygonSVGSprite } from "../../js/pzsprites.js";

window.onload = start;

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 0;

// lander parameters
const START_FUEL = 1000;
const INITIAL_ALTITUDE = 300;

let lander;
let fuel = START_FUEL;

let ground;

let world;

let cameraScale = 1;

async function start(){
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(800, 900);
    world.setGravity({ x: 0, y: 10 });
    world.setCameraScale(cameraScale);

    lander = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() - INITIAL_ALTITUDE, "rocket.svg", 0.1);
   
    let eachSegmentLength = world.getWidth() / GROUND_SEGMENTS;
    let vertices = [{ x: 0, y: world.getHeight() - world.getHeight() / 4 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }
    vertices.push({ x: world.getWidth(), y: world.getHeight() }); // bottom right corner
    vertices.push({ x: 0, y: world.getHeight() }); // bottom left corner
    
    ground = createChainSprite(COLLIDER_STATIC, vertices, true); // setting loop = true will connect first and last vertices
    ground.setStrokeWidth(0.5);
    ground.setFillColor("gray");

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    let landerPos = lander.getPosition();
    world.setCameraPosition(landerPos.x, landerPos.y);
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
       
    } else if(e.key === KEY_ARROW_RIGHT){ 
       
    } else {
        
    } 
}   

function onKeyRelease(e){
    
}