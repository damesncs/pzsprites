import { COLLIDER_DYNAMIC, COLLIDER_STATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, createChainSprite, getRandom, renderFrame, setupWorld, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, createPolygonSVGSprite, KEY_ARROW_UP, createCircleSprite, createJoint, JOINT_WELD, getVectorForSprites, drawText, addCollisionListenerForSprite, getLinearSpeedFromVector, addCollisionListenerForSprites, createRectSprite, distanceBetween } from "../../js/pzsprites.js";

window.onload = start;

// terrain generation parameters
const WORLD_WIDTH = 2500;
const WORLD_HEIGHT = 1500;
const GROUND_SEGMENTS = WORLD_WIDTH / 7; 
const MAX_VERTICAL_CHANGE = 4;

// lander parameters
const START_FUEL = 1000;
const INITIAL_ALTITUDE = 600;
const MAIN_THRUSTER_FORCE = 150;
const SIDE_THRUSTER_FORCE = 50;
const MAIN_THRUSTER_FUEL_USE = 1; // per frame
const SIDE_THRUSTER_FUEL_USE = 0.33; // per frame

const EXHAUST_COLOR = "#f5b207";
const MAX_EXHAUST_LIFE = 25; // frames
const LANDER_FILTER_GROUP = -2; // things that should not collide with lander should be in this group (such as exhaust)

const MAX_CAMERA_SCALE = 3;
const MIN_CAMERA_SCALE = 0.5;

let lander;
let fuel = START_FUEL;
let padDistance = 0;
let startingDistance = 0;
let landingPad;
let mainThruster,
    leftThruster,
    rightThruster,
    centerVectorRefPoint
    ;

let mainThrusterOn = false,
    leftThrusterOn = false,
    rightThrusterOn = false
    ;
        
let exhaustSprites = [];

let ground;
let world;

let crashed = false;

async function start(){
    world = setupWorld("canvas", 1000, 600); // i.e., viewport
    world.setWorldDimensions(WORLD_WIDTH, WORLD_HEIGHT);
    world.setGravity({ x: 0, y: 3 }); // approx 1/3 of earth
    world.setCameraScale(MAX_CAMERA_SCALE);
    world.setBackgroundColor("black");

    lander = await createPolygonSVGSprite(COLLIDER_DYNAMIC, world.getWidth() / 2, world.getHeight() - INITIAL_ALTITUDE, "rocket.svg", 0.07);
    // lander.setDebug(true);
    lander.setFilterGroupIndex(LANDER_FILTER_GROUP);
    
    const landerPos = lander.getPosition();
    mainThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x, landerPos.y - 17, 0.1);
    mainThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);
    
    leftThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x - 3, landerPos.y + 13, 0.1);
    leftThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);
    
    rightThruster = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x + 3, landerPos.y + 13, 0.1);
    rightThruster.setFilterGroupIndex(LANDER_FILTER_GROUP);

    centerVectorRefPoint = createCircleSprite(COLLIDER_DYNAMIC, landerPos.x, landerPos.y + 13, 0.1);
    centerVectorRefPoint.setFilterGroupIndex(LANDER_FILTER_GROUP);
    
    createJoint(JOINT_WELD, lander, mainThruster, { localAnchorA: { x: 0, y: 17 } }); // local anchor sets the location of the joint on sprite A relative to sprite A origin
    createJoint(JOINT_WELD, lander, leftThruster, { localAnchorA: { x: -3, y: -13 } });
    createJoint(JOINT_WELD, lander, rightThruster, { localAnchorA: { x: 3, y: -13 } });
    createJoint(JOINT_WELD, lander, centerVectorRefPoint, { localAnchorA: { x: 0, y: -13 } });
   
    // terrain
    const terrainVerts = getTerrainVertices();
    ground = createChainSprite(COLLIDER_STATIC, terrainVerts, true); // setting loop = true will connect first and last vertices
    ground.setStrokeWidth(0.5);
    ground.setStrokeColor("gray");
    ground.setFillColor("gray");

    const buffer = terrainVerts.length / 3;
    const randomGroundSegment = Math.trunc(getRandom(buffer, terrainVerts.length - buffer))
    const landingPadX = randomGroundSegment * (world.getWidth() / GROUND_SEGMENTS);
    const landingPadY = terrainVerts[randomGroundSegment].y;

    landingPad = createRectSprite(COLLIDER_STATIC, landingPadX, landingPadY, 100, 20);
    landingPad.setFillColor("green");

    startingDistance = distanceBetween(lander, landingPad);

    addCollisionListenerForSprites(ground, lander, onGroundCollision);

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    let landerPos = lander.getPosition();
    world.setCameraPosition(landerPos.x, landerPos.y);
    world.setCameraScale(getCameraScale());
    updateThrusters();
    padDistance = distanceBetween(lander, landingPad);
    decayExhaustSprites();
    renderFrame();
    drawHud();
    if(crashed) drawGameOver();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function getTerrainVertices(){
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
    return vertices;
}

function getCameraScale(){
    const scale = (padDistance * MAX_CAMERA_SCALE / world.getWidth());
    if(scale > MAX_CAMERA_SCALE) return MAX_CAMERA_SCALE;
    if(scale < MIN_CAMERA_SCALE) return MIN_CAMERA_SCALE;
    return scale;
}


function drawHud(){
    const textSize = 16;
    const leftMargin = 16;
    const topMargin = 16;
    const hudVars = [];
    hudVars.push(`Fuel: ${fuel.toFixed(1)}`);
    hudVars.push(`Velocity: ${getLinearSpeedFromVector(lander.getLinearVelocity()).toFixed(1)}`);
    hudVars.push(`Distance to pad: ${padDistance.toFixed(1)}`);
    hudVars.push(`Camera Scale: ${getCameraScale().toFixed(1)}`);
    hudVars.forEach((t, i) => {
        drawText(leftMargin, i * textSize + topMargin, t, textSize, "limegreen");
    });
}

function drawGameOver(){
    drawText(400, 150, "Crashed!", 42, "red");
}

function updateThrusters(){
    if(fuel > 0){
        if(mainThrusterOn){
            const pos = mainThruster.getPosition();
            const v = getVectorForSprites(mainThruster, lander);
            generateExhaustSprites(pos.x, pos.y, 3, v.x * -1000, v.y * -1000);
            lander.applyForce({ x: v.x * MAIN_THRUSTER_FORCE, y: v.y * MAIN_THRUSTER_FORCE }, pos);
            fuel -= MAIN_THRUSTER_FUEL_USE;
        }    
        if(leftThrusterOn){
            const pos = leftThruster.getPosition();
            const v = getVectorForSprites(leftThruster, centerVectorRefPoint);
            generateExhaustSprites(pos.x, pos.y, 1, v.x * -1000, v.y * -1000);
            lander.applyForce({ x: v.x * SIDE_THRUSTER_FORCE, y: v.y * SIDE_THRUSTER_FORCE }, pos);
            fuel -= SIDE_THRUSTER_FUEL_USE;
        }
        if(rightThrusterOn){
            const pos = leftThruster.getPosition();
            const v = getVectorForSprites(rightThruster, centerVectorRefPoint);
            generateExhaustSprites(pos.x, pos.y, 1, v.x * -1000, v.y * -1000);
            lander.applyForce({ x: v.x * SIDE_THRUSTER_FORCE, y: v.y * SIDE_THRUSTER_FORCE }, pos);
            fuel -= SIDE_THRUSTER_FUEL_USE;
        }
        if (fuel < 0) fuel = 0; // don't want negative fuel
    }
    
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
        cloud.setStrokeColor("none");
        cloud.setFilterGroupIndex(LANDER_FILTER_GROUP); // don't collide with lander
        cloud.setDensity(0.0001); // physics density
        cloud.resetMassData();
        cloud.applyLinearImpulse({ x: xImpulse + scatterX * 4, y: yImpulse + scatterY * 4}, { x: atX, y: atY });
        exhaustSprites.push(cloud);
    }
}

function onGroundCollision(){
    crashed = true;
}

function onKeyPress(e){
    if(e.key === KEY_ARROW_UP){        
        mainThrusterOn = true;
    } else if(e.key === KEY_ARROW_LEFT){       
       rightThrusterOn = true;
    } else if(e.key === KEY_ARROW_RIGHT){        
       leftThrusterOn = true;
    }
}   

function onKeyRelease(e){
    if(e.key === KEY_ARROW_UP){
        mainThrusterOn = false;
    } else if(e.key === KEY_ARROW_LEFT){
       rightThrusterOn = false;
    } else if(e.key === KEY_ARROW_RIGHT){ 
       leftThrusterOn = false;
    }
}