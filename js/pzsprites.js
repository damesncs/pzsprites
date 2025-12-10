// v0.1 - physics provided by planck.js

import { 
    World, 
    Box, 
    Circle,
    Edge,
    Chain,
    Vec2
} from "../../js/planck.mjs";

let _canvas;
let _ctx;

let _world;

let _bodiesToRemove = [];

export const TIME_STEP = 1 / 60;

/** planck.js docs - A static body does not move under simulation and behaves as if it has infinite mass. Internally, Planck.js stores zero for the mass and the inverse mass. Static bodies can be moved manually by the user. A static body always has zero velocity. Static bodies do not collide with other static or kinematic bodies. */
export const COLLIDER_STATIC = "static";

/** planck.js docs - A kinematic body is like a static body, but can have velocity. You can set kinematic body velocity or move it manually. However, their velocity is not changed in collision or when you apply force. Kinematic bodies do not collide with other kinematic or static bodies. When a kinematic body collides with a dynamic body it behaves as if it has infinite mass. */
export const COLLIDER_KINEMATIC = "kinematic";

/** planck.js docs - A dynamic body is fully simulated. They can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass. If you try to set the mass of a dynamic body to zero, it will automatically acquire a mass of one kilogram and it won't rotate. */
export const COLLIDER_DYNAMIC = "dynamic";

const SHAPE_TYPE_POLYGON = "polygon";
const SHAPE_TYPE_CIRCLE = "circle";
const SHAPE_TYPE_EDGE = "edge";
const SHAPE_TYPE_CHAIN = "chain";

export const PLANCK = {
    World: World,
    Box: Box
    // TODO will need to export joint types
};

function setupCanvas (cvs, width, height){
    _canvas = cvs;
    _canvas.width = width;
    _canvas.height = height;
    _ctx = _canvas.getContext("2d");
}

/**
 * Performs initial setup of the physics world and the graphics canvas.
 * @param {string} canvasId the id of the canvas element
 * @param {number} width width of the canvas
 * @param {number} height height of the canvas
 * @param {object} worldDef options for the physics world (planck.js World constructor)
 */
export function setupWorld(canvasId, width, height, worldDef){
    setupCanvas(document.getElementById(canvasId), width, height);
    const wd = worldDef === undefined ? { gravity: {x: 0, y: 50}, allowSleep: true } : worldDef;
    _world = new World(wd);

    _world.on('remove-joint', function(joint) {
        // remove all references to joint.  
    });
    _world.on('remove-fixture', function(fixture) {
        // remove all references to fixture.
    });
    _world.on('remove-body', function(body) {
        // bodies are not removed implicitly,
        // but the world publishes this event if a body is removed
    });
}

/** Steps the physics simulation and draws all bodies. Be sure to call this in your animation loop. */
export function renderFrame(){
    clearCanvas();
    drawBorder();
    _world.step(TIME_STEP);

    for (let body = _world.getBodyList(); body; body = body.getNext()) {
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            renderFixture(body, fixture);
        }
    }

    for (let joint = _world.getJointList(); joint; joint = joint.getNext()) {
        // TODO render joints - probably just a line
    }

    _bodiesToRemove.forEach(b => {
        _world.destroyBody(b);
    });
    _bodiesToRemove = [];
}

/** Creates a rectangular sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {number} initialX the sprite's beginning x position
 * @param {number} initialY the sprite's beginning y position
 * @param {number} height the sprite's beginning height
 * @param {number} width the sprite's beginning width
 * @returns a reference to the new sprite (the planck.js Body)
 */
export function createRectSprite(colliderType, initialX, initialY, width, height){
    let shape = new Box(width / 2, height / 2);
    let sprite = createSprite(colliderType, initialX, initialY, shape);
    sprite.width = width;
    sprite.height = height;
    return sprite;
}

/** Creates a circle sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {number} initialX the sprite's beginning x position
 * @param {number} initialY the sprite's beginning y position
 * @param {number} radius the circle sprite's radius
 * @returns a reference to the new sprite (the planck.js Body)
 */
export function createCircleSprite(colliderType, initialX, initialY, radius){    
    let shape = new Circle({ x: 0, y: 0 }, radius);
    let sprite = createSprite(colliderType, initialX, initialY, shape);
    sprite.radius = radius;
    return sprite;
}

/**
 * Creates an edge sprite. Edges are usually walls.
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns a reference to the new sprite (the planck.js Body)
 */
export function createEdgeSprite(colliderType, x1, y1, x2, y2){
    const shape = new Edge({ x: x1, y: y1 }, { x: x2, y: y2 });
    return createSprite(colliderType, 0, 0, shape);
}


/**
 * Creates a new Chain sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {Vec2[]} vertices 
 * @returns {object} the new sprite (planck.js Body)
 */
export function createChainSprite(colliderType, vertices){
    const shape = new Chain(vertices);
    return createSprite(colliderType, 0, 0, shape);
}

function createSprite(colliderType, initialX, initialY, shape){
    const body = _world.createBody({
        position: { x: initialX, y: initialY },
        type: colliderType
    });
    body.createFixture({
        shape: shape,
        density: 1,
        restitution: 0.1
    });
    body.setUserData({
        fillColor: getRandomColor(),
        strokeColor: "black",
        debug: false,
        tags: []
    });
    body.setBounciness = (bounciness) => {
        body.getFixtureList().setRestitution(bounciness);
    };
    body.setUserDataProp = (p, v) => {
        let ud = body.getUserData();
        ud[p] = v;
        body.setUserData(ud);
    };
    body.setTags = (tagArray) => body.setUserDataProp("tags", tagArray);
    body.getTags = () => body.getUserData().tags;
    body.addTag = (tag) => body.getTags().push(tag);
    body.removeTag = (tag) => body.setTags(body.getTags().filter(t => t != tag));
    body.hasTag = (tag) => body.getTags().indexOf(tag) != -1;
    body.setFillColor = (color) => body.setUserDataProp("fillColor", color);
    body.setStrokeColor = (color) => body.setUserDataProp("strokeColor", color);
    body.setDebug = (debug) => body.setUserDataProp("debug", debug);
    return body;
}

export function removeSprite(sprite){
    _bodiesToRemove.push(sprite);
}

export function getSpritesByTag(tag){
    return _world.getBodyList().filter(b => {
        b.getUserData().tags.indexOf(tag) != -1;
    });
}

/**
 * @callback collisionListener 
 * @param {object} spriteA 
 * @param {object} spriteB 
 * @param {object} contact the planck.js Contact object
 */

/**
 * Adds a collision listener function which will be called when any collision occurs.
 * @param {collisionListener} listenerFn
 */
export function addCollisionListener(listenerFn){
    const callback = (contact) => {
        const spriteA = contact.getFixtureA().getBody();
        const spriteB = contact.getFixtureB().getBody();
        listenerFn(spriteA, spriteB, contact);
    }
    _world.on("pre-solve", callback);
}

/**
 * Adds a collision listener function which will be called when a collision occurs which
 * involves a sprite with the given tag. 
 * The sprite with the given tag will be passed as `spriteA` to the callback.
 * @param {string} tag 
 * @param {collisionListener} listenerFn 
  */
export function addCollisionListenerForTag(tag, listenerFn){
    const callback = (contact) => {
        const spriteA = contact.getFixtureA().getBody();
        const spriteB = contact.getFixtureB().getBody();
        if(spriteA.hasTag(tag)) listenerFn(spriteA, spriteB, contact);
        else if(spriteB.hasTag(tag)) listenerFn(spriteB, spriteA, contact);
    }
    _world.on("pre-solve", callback);
}

function renderFixture(b, f){
    const shapeType = f.getType();
    const pos = b.getPosition();
    const ud = b.getUserData();
    const shape = f.getShape();
    if(shapeType === SHAPE_TYPE_POLYGON){
        drawPolygon(getPolygonAbsoluteVertices(b, shape), ud.fillColor, ud.strokeColor);
    } else if(shapeType === SHAPE_TYPE_CIRCLE){
        drawCircle(pos.x, pos.y, shape.m_radius, ud.fillColor, ud.strokeColor);
    } else if(shapeType === SHAPE_TYPE_EDGE){
        drawEdge(shape, ud.strokeColor);
    } else if(shapeType === SHAPE_TYPE_CHAIN){
        drawChain(shape, ud.strokeColor);
    } else {
        console.error("unrecognized shape type");
    }
    if(b.getUserData().debug === true){
        // draw body center
        drawCircle(pos.x, pos.y, 3, "limegreen", "limegreen");
    }
}

function getPolygonAbsoluteVertices(body, shape){
    return shape.m_vertices.map(v => {
        return body.getWorldPoint(v);
    });
}

function drawChain(chain, strokeColor){
    for(let i = 0; i < chain.getChildCount(); i++){
        const edge = new Edge();
        chain.getChildEdge(edge, i);
        drawEdge(edge, );
    }
}

function drawEdge(edge, strokeColor){
    drawLine(edge.m_vertex1.x, edge.m_vertex1.y, edge.m_vertex2.x, edge.m_vertex2.y, strokeColor);
}

function drawPolygon(points, fillColor, strokeColor) {
    // h/t planck testbed
    _ctx.beginPath();
    _ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        _ctx.lineTo(points[i].x, points[i].y);
    }
    _ctx.closePath();
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
    _ctx.fillStyle = fillColor;
    _ctx.fill();
}

export function drawLine(x1, y1, x2, y2, color){
    _ctx.beginPath();
    _ctx.moveTo(x1, y1);
    _ctx.lineTo(x2, y2);
    _ctx.strokeStyle = color;
    _ctx.stroke();
}

export function drawBorder(){
    _ctx.strokeStyle = "black";
    _ctx.strokeRect(0, 0, _canvas.width, _canvas.height);
}

export function drawRect (x, y, width, height, color) {
    _ctx.fillStyle = color;
    _ctx.fillRect(x, y, width, height);
}

function drawDebugRect(r){
    _ctx.strokeStyle = "limegreen";
    _ctx.lineWidth = 1;
    _ctx.strokeRect(r.x, r.y, r.width, r.height);
}

export function drawCircle (x, y, radius, fillColor, strokeColor) {
    _ctx.beginPath();
    // arc(x, y, radius, startAngle, endAngle)
    _ctx.arc(x, y, radius, 0, 2 * Math.PI);
    _ctx.fillStyle = fillColor;
    _ctx.fill();
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
}

function drawDebugCircle(s){
    _ctx.strokeStyle = "limegreen";
    _ctx.lineWidth = 1;
    _ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
    _ctx.stroke();
}

function drawPathArray(x, y, paths, scale, debug){
    paths.forEach(p => {
        _ctx.lineCap = p["stroke-linecap"] ? p["stroke-linecap"] : _ctx.lineCap;
        _ctx.lineJoin = p["stroke-linejoin"] ? p["stroke-linejoin"] : _ctx.lineJoin;
        _ctx.lineWidth = p["stroke-width"] ? p["stroke-width"] : _ctx.lineWidth;
        _ctx.miterLimit = p["stroke-miterlimit"] ? p["stroke-miterlimit"] : _ctx.miterLimit;
        _ctx.translate(x, y);
        _ctx.scale(scale, scale);
        if(p.fill) {
            const fillOpacity = p["fill-opacity"] ? Number.parseFloat(p["fill-opacity"]) : 1;
            if(fillOpacity > 0 ){
                const opAsHex = Math.trunc(fillOpacity * 255).toString(16);
                _ctx.fillStyle = `${p.fill}${opAsHex}`;
                _ctx.fill(p, "evenodd");
            }
            
        }
        if(p.stroke){
            _ctx.strokeStyle = p.stroke;
            _ctx.stroke(p);
        }
        
        _ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    if(debug){
        _ctx.strokeStyle = "limegreen";
        _ctx.lineWidth = 1;
        _ctx.strokeRect(x, y, paths.nativeWidth * scale, paths.nativeHeight * scale)
    }
}

export function drawText (x, y, text, fontSize, color){
    _ctx.fillStyle = color;
    _ctx.font = `${fontSize}px sans-serif`;
    _ctx.fillText(text, x, y + fontSize);
}

export function clearCanvas(){
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);
}

/** Generates a random color hex-code */
export function getRandomColor(){
    const r = getRandomHexByte();
    const g = getRandomHexByte();
    const b = getRandomHexByte();
    return `#${r}${g}${b}`;
}

export function getRandomHexByte(){
    return Math.trunc(Math.random() * 256).toString(16).padStart(2, 0);
}

// h/t MDN
export function getRandom(min, max) {
    return Math.random() * (max - min) + min;
}


// export function drawShapesObj(sObj, originX = 0, originY = 0, scale = 1, debug = false){
//     try {
//         if(debug){
//             _ctx.strokeStyle = "limegreen";
//             _ctx.strokeRect(originX, originY, sObj.nativeWidth * scale, sObj.nativeHeight * scale);
//         }
//         sObj.shapes.forEach((s, i) => {
//             if(s.type){
//                 const shapeX = originX + s.x * scale;
//                 const shapeY = originY + s.y * scale;
//                 switch(s.type) {
//                     case SHAPE_TYPE_RECT:
//                         drawRect(shapeX, shapeY, s.w * scale, s.h * scale, s.constantColor);
//                         break;
//                     case SHAPE_TYPE_CIRC:
//                         drawCircle(shapeX, shapeY, s.r * scale, s.constantColor);
//                         break;
//                     case SHAPE_TYPE_POINT: // designer only
//                         drawCircle(shapeX, shapeY, POINT_RADIUS, POINT_COLOR);
//                         break;
//                 }
//             }
//             else {
//                 throw new Error("no shape type for shape at index " + i);
//             }
//         });
//     }
//     catch(e) {
//         console.error(e);
//     }
// }

export async function pathArrayFromSvg(svgDoc){
    const r = await fetch(svgDoc);
    const s = await r.text();
    
    const svgTempCtr = document.createElement("div");
    svgTempCtr.id = "svg-temp-container";
    svgTempCtr.style.display = "none";
    svgTempCtr.innerHTML = s;
    document.body.appendChild(svgTempCtr);

    const paths = [];
    // TODO apply transform for scaling?
    
    const pathQL = document.querySelectorAll("div#svg-temp-container svg g path");
    pathQL.forEach(pathEl => {
        const p = new Path2D(pathEl.getAttribute("d"));
        for(const attr of pathEl.attributes) {
            p[attr.name] = attr.value;
        }
        paths.push(p);
    });
    const vb = svgTempCtr.firstChild.getAttribute("viewBox").split(" ");
    paths.nativeWidth = vb[2];
    paths.nativeHeight = vb[3];    
    document.body.removeChild(svgTempCtr);
    return paths;
}
