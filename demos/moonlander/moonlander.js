import { COLLIDER_DYNAMIC, COLLIDER_STATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, createChainSprite, getRandom, renderFrame, setupWorld, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSVGSprite, KEY_ARROW_UP, createCircleSprite, COLLIDER_NONE, createJoint, JOINT_WELD } from "../../js/pzsprites.js";

window.onload = start;

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 2;

// lander parameters
const START_FUEL = 1000;
const INITIAL_ALTITUDE = 400;

const EXHAUST_COLOR = "#f5b207";
const MAX_EXHAUST_LIFE = 25; // frames
const LANDER_FILTER_GROUP = -2; // parts of the lander, including exhaust, should not collide (this is mostly for exhaust)

let lander;
let fuel = START_FUEL;
let mainThruster,
    leftThruster,
    rightThruster
    ;

let mainThrusterOn = false,
    leftThrusterOn = false,
    rightThrusterOn = false
    ;
        
let exhaustSprites = [];

let ground;
let world;

let cameraScale = 1;

async function start(){
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(1000, 1000);
    world.setGravity({ x: 0, y: 3 }); // approx 1/3 of earth
    world.setCameraScale(cameraScale);
    world.setBackgroundColor("black");

    lander = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() - INITIAL_ALTITUDE, "rocket.svg", 0.07);
    // lander.setDebug(true);
    lander.setFilterGroupIndex(LANDER_FILTER_GROUP);
    const landerPos = lander.getPosition();
    mainThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x, landerPos.y - 17, 0.1);
    mainThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);
    mainThruster.setDebug(true);
    leftThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x - 3, landerPos.y + 13, 0.1);
    leftThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);
    leftThruster.setDebug(true);
    rightThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x + 3, landerPos.y + 13, 0.1);
    rightThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);
    rightThruster.setDebug(true);
    createJoint(JOINT_WELD, lander, mainThruster, { localAnchorB: { x: 0, y: -17 } });
    createJoint(JOINT_WELD, lander, leftThruster, { localAnchorB: { x: -3, y: 13 } });
    createJoint(JOINT_WELD, lander, rightThruster, { localAnchorB: { x: 3, y: 13 } });
   
    // terrain
    let eachSegmentLength = world.getWidth() / GROUND_SEGMENTS;
    let vertices = [{ x: 0, y: world.getHeight() - world.getHeight() / 4 }];
    for(let i = 1; i < GROUND_SEGMENTS; i++){
        vertices.push({
            x: eachSegmentLength * i,
            y: vertices[i - 1].y + getRandom(-MAX_VERTICAL_CHANGE, MAX_VERTICAL_CHANGE)
        });
    }
    vertices.push({ x: world.getWidth(), y: world.getHeight() - world.getHeight() / 4 });
    vertices.push({ x: world.getWidth(), y: world.getHeight() }); // bottom right corner
    vertices.push({ x: 0, y: world.getHeight() }); // bottom left corner
    
    ground = createChainSprite(COLLIDER_STATIC, vertices, true); // setting loop = true will connect first and last vertices
    ground.setStrokeWidth(0.5);
    ground.setStrokeColor("gray");
    ground.setFillColor("gray");

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    let landerPos = lander.getPosition();
    world.setCameraPosition(landerPos.x, landerPos.y);
    world.setCameraScale(cameraScale);
    updateThrusters();
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function updateThrusters(){
    if(mainThrusterOn){
        const pos = mainThruster.getPosition();
        generateExhaustSprites(pos.x, pos.y, 3, 0, 1000);
        // TODO apply force
        // lander.applyForce({},{})
    }
    if(leftThrusterOn){
        const pos = leftThruster.getPosition();
        generateExhaustSprites(pos.x, pos.y, 1, -100, 0);
        // TODO apply force
    }
    if(rightThrusterOn){
        const pos = leftThruster.getPosition();
        generateExhaustSprites(pos.x, pos.y, 1, 100, 0);
        // TODO apply force
    }
    decayExhaustSprites();
}

function decayExhaustSprites(){
    // the life is already decremented by one each time the sprite is rendered on the canvas.
    // This just sets the fill color to match the remaining life (i.e., they get more transparent as they decay)
    exhaustSprites.forEach((s, i) => {
        s.setFillColor(EXHAUST_COLOR + getOpacityAsHexForLife(s.getLife()));
    });
    exhaustSprites = exhaustSprites.filter(s => s.getLife() > 0);
}

function getHexCode(n){
    return n.toString(16).padStart(2, 0);
}

function getOpacityAsHexForLife(life){
    return getHexCode(Math.trunc(life * 255 / MAX_EXHAUST_LIFE));
}

function generateExhaustSprites(atX, atY, maxRadius, xImpulse, yImpulse){
    const n = getRandom(1, 4);
    for(let i = 0; i < n; i++){
        const r = getRandom(0.1, maxRadius);
        const scatterX = getRandom(-0.5, 0.5);
        const scatterY = getRandom(-0.5, 0.5);
        const cloud = createCircleSprite(COLLIDER_DYNAMIC, atX + scatterX, atY + scatterY, r);
        const life = Math.trunc(getRandom(1, MAX_EXHAUST_LIFE));
        cloud.setLife(life);
        cloud.setFillColor(EXHAUST_COLOR + getOpacityAsHexForLife(life));
        cloud.setStrokeColor("#00000000");
        cloud.setStrokeWidth(0);
        cloud.setFilterGroupIndex(LANDER_FILTER_GROUP); // don't collide with lander
        cloud.setDensity(0.0001); // physics density
        cloud.resetMassData();
        cloud.applyLinearImpulse({ x: xImpulse + scatterX * 4, y: yImpulse + scatterY * 4}, { x: atX, y: atY });
        exhaustSprites.push(cloud);
    }
}

function onKeyPress(e){
    if(e.key === KEY_ARROW_UP){
        // main thruster
        mainThrusterOn = true;
    } else if(e.key === KEY_ARROW_LEFT){
       // right thruster
       rightThrusterOn = true;
    } else if(e.key === KEY_ARROW_RIGHT){ 
       // left thruster
       leftThrusterOn = true;
    }
}   

function onKeyRelease(e){
    if(e.key === KEY_ARROW_UP){
        // main thruster
        mainThrusterOn = false;
    } else if(e.key === KEY_ARROW_LEFT){
       // right thruster
       rightThrusterOn = false;
    } else if(e.key === KEY_ARROW_RIGHT){ 
       // left thruster
       leftThrusterOn = false;
    }
}