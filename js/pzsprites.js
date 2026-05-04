/* 
    pzsprites.js v0.2

    Copyright (C) 2026  David Ames

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// TODO - 
// - collision listener for two specific sprites
// - test removing sprites
// - fixture z-index 

import { 
    World,
    Body,
    Fixture,
    Polygon,
    Box, 
    Circle,
    Edge,
    Chain,
    Vec2,
    DistanceJoint,
    WeldJoint,
    WheelJoint,
    RevoluteJoint
} from "./planck.mjs";
// import { FrictionJoint, GearJoint, MotorJoint, PrismaticJoint, PulleyJoint, RevoluteJoint, RopeJoint, WheelJoint } from "./planck.mjs";

let _canvas;
let _ctx;

let _world;

let _worldWidth;
let _worldHeight;

let _camera = {
    scale: 1,
    x: 0,
    y: 0
};

let _bodiesToRemove = [];

export const EVENT_KEY_RELEASED = "keyup";
export const EVENT_KEY_PRESSED = "keydown";
export const EVENT_MOUSE_MOVE = "mousemove";

export const KEY_ARROW_UP = "ArrowUp";
export const KEY_ARROW_DOWN = "ArrowDown";
export const KEY_ARROW_LEFT = "ArrowLeft";
export const KEY_ARROW_RIGHT = "ArrowRight";

export const TIME_STEP = 1 / 60;

/** planck.js docs - A static body does not move under simulation and behaves as if it has infinite mass. Internally, Planck.js stores zero for the mass and the inverse mass. Static bodies can be moved manually by the user. A static body always has zero velocity. Static bodies do not collide with other static or kinematic bodies. */
export const COLLIDER_STATIC = "static";

/** planck.js docs - A kinematic body is like a static body, but can have velocity. You can set kinematic body velocity or move it manually. However, their velocity is not changed in collision or when you apply force. Kinematic bodies do not collide with other kinematic or static bodies. When a kinematic body collides with a dynamic body it behaves as if it has infinite mass. */
export const COLLIDER_KINEMATIC = "kinematic";

/** planck.js docs - A dynamic body is fully simulated. They can be moved manually by the user, but normally they move according to forces. A dynamic body can collide with all body types. A dynamic body always has finite, non-zero mass. If you try to set the mass of a dynamic body to zero, it will automatically acquire a mass of one kilogram and it won't rotate. */
export const COLLIDER_DYNAMIC = "dynamic";

/** don't collide */
export const COLLIDER_NONE = "none";

/**
 * a rigid rod between the two sprites
 */
export const JOINT_DISTANCE = "DistanceJoint";
/**
 * for top-down friction
 */
export const JOINT_FRICTION = "FrictionJoint";

/**
 * planck.js docs: A gear joint is used to connect two joints together. Either joint can be a revolute or prismatic joint
 */
export const JOINT_GEAR = "GearJoint";

/**
 * planck.js docs: A motor joint is used to control the relative motion between two bodies. 
 */
export const JOINT_MOTOR = "MotorJoint";
/**
 * planck.js docs: A mouse joint is used to make a point on a body track a specified world point. 
 */
export const JOINT_MOUSE = "MouseJoint";
/**
 * planck.js docs: This joint provides one degree of freedom: translation along an axis fixed in bodyA. Relative rotation is prevented. You can use a joint limit to restrict the range of motion and a joint motor to drive the motion or to model joint friction.
 */
export const JOINT_PRISMATIC = "PrismaticJoint";

/**
 * planck.js docs: The pulley joint is connected to two bodies and two fixed ground points.
 */
export const JOINT_PULLEY = "PulleyJoint";

/**
 * planck.js docs: A revolute joint constrains two bodies to share a common point while they are free to rotate about the point. The relative rotation about the shared point is the joint angle. You can limit the relative rotation with a joint limit that specifies a lower and upper angle. You can use a motor to drive the relative rotation about the shared point. A maximum motor torque is provided so that infinite forces are not generated.
 */
export const JOINT_REVOLUTE = "RevoluteJoint";

/**
 * planck.js docs: A rope joint enforces a maximum distance between two points on two bodies. It has no other effect.
 */
export const JOINT_ROPE = "RopeJoint";
/**
 * "glues" the two sprites together at the anchor point
 */
export const JOINT_WELD = "WeldJoint";
/**
 * planck.js docs: This joint provides two degrees of freedom: translation along an axis fixed in bodyA and rotation in the plane. In other words, it is a point to line constraint with a rotational motor and a linear spring/damper. 
 */
export const JOINT_WHEEL = "WheelJoint";

const SHAPE_TYPE_POLYGON = "polygon";
const SHAPE_TYPE_CIRCLE = "circle";
const SHAPE_TYPE_EDGE = "edge";
const SHAPE_TYPE_CHAIN = "chain";

export const PLANCK = {
    // World: World,
    Box: Box,
    Body: Body,
    Fixture: Fixture
};

function setupCanvas (cvs, width, height){
    _canvas = cvs;
    _canvas.width = width;
    _canvas.height = height;
    _ctx = _canvas.getContext("2d");
}

/** 
 * @typedef {object} World
 * @property {function} setWorldDimensions  
 */

/**
 * Performs initial setup of the physics world and the graphics canvas.
 * @param {string} canvasId the id of the canvas element
 * @param {number} width width of the canvas
 * @param {number} height height of the canvas
 * @param {object} worldDef options for the physics world (planck.js World constructor)
 * @param {number} worldWidth width of the world, if different from the canvas width 
 * @param {number} worldHeight height of the world, if different from the canvas height
 * @returns {World} an object with some functions to access or modify the world
 */
export function setupWorld(canvasId, width, height, worldDef, worldWidth, worldHeight){
    setupCanvas(document.getElementById(canvasId), width, height);
    const wd = worldDef === undefined ? { gravity: {x: 0, y: 10}, allowSleep: true } : worldDef;
    _world = new World(wd);
    _worldWidth = worldWidth ? worldWidth : width;
    _worldHeight = worldHeight ? worldHeight: height;

    _world.on('remove-joint', function(joint) {
        // TODO remove all references to joint.  
    });
    _world.on('remove-fixture', function(fixture) {
        // TODO remove all references to fixture.
    });
    _world.on('remove-body', function(body) {
        // bodies are not removed implicitly,
        // but the world publishes this event if a body is removed
    });
    _world.setWorldDimensions = (width, height) => {
        _worldHeight = height;
        _worldWidth = width;
    };
    _world.getHeight = () => _worldHeight;
    _world.getWidth = () => _worldWidth;
    _world.setCameraScale = (scale) => {
        _camera.scale = scale;
    };
    _world.setCameraPosition = (x, y) => {
        _camera.x = x;
        _camera.y = y;
    };
    _world.setBackgroundColor = (color) => {
        _world.bkgdColor = color;
    };
    _world.setBackgroundColor("#ffffff");
    // set camera to center by default
    _world.setCameraPosition(_worldWidth / 2, _worldHeight / 2);

    return _world;
}

/** Steps the physics simulation and draws all bodies. Be sure to call this in your animation loop. */
export function renderFrame(){
    _world.step(TIME_STEP);

    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    clearCanvas();
    drawWorldBackground();
    drawBorder();
    _ctx.scale(_camera.scale, _camera.scale);
    const viewableHeight = _canvas.height / _camera.scale;
    const viewableWidth = _canvas.width / _camera.scale;
    _ctx.translate((-_camera.x) + viewableWidth / 2, -_camera.y + viewableHeight / 2);

    for (let body = _world.getBodyList(); body; body = body.getNext()) {
        for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
            renderFixture(body, fixture);
        }
        const life = body.getLife();
        if(life !== null && life !== undefined) { // null life means sprite never expires
            if (life <= 0) _bodiesToRemove.push(body);
            else body.setUserDataProp("life", life - 1);
        }
        
    }

    for (let joint = _world.getJointList(); joint; joint = joint.getNext()) {
        const a = joint.getAnchorA();
        const b = joint.getAnchorB();
        drawLine(a.x, a.y, b.x, b.y, "black", 0.1);
    }
    _ctx.setTransform(1, 0, 0, 1, 0, 0);

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
 * @returns {Sprite} a reference to the new sprite (the planck.js Body)
 */
export function createRectSprite(colliderType, initialX, initialY, width, height){
    const shape = new Box(width / 2, height / 2);
    const sprite = createSprite(colliderType, initialX, initialY, shape);
    sprite.width = width;
    sprite.height = height;
    return sprite;
}

/** Creates a circle sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {number} initialX the sprite's beginning x position
 * @param {number} initialY the sprite's beginning y position
 * @param {number} radius the circle sprite's radius
 * @returns {Sprite} a reference to the new sprite (the planck.js Body)
 */
export function createCircleSprite(colliderType, initialX, initialY, radius){    
    const shape = new Circle({ x: 0, y: 0 }, radius);
    const sprite = createSprite(colliderType, initialX, initialY, shape);
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
 * @returns {Sprite} a reference to the new sprite (the planck.js Body)
 */
export function createEdgeSprite(colliderType, x1, y1, x2, y2){
    const shape = new Edge({ x: x1, y: y1 }, { x: x2, y: y2 });
    return createSprite(colliderType, 0, 0, shape);
}

/**
 * Creates a new Chain sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {Vec2[]} vertices a list of points (vertices)
 * @param {boolean} [loop=false] connect the last and first points
 * @returns {Sprite} the new sprite (planck.js Body)
 */
export function createChainSprite(colliderType, vertices, loop = false){
    const shape = new Chain(vertices, loop);
    return createSprite(colliderType, 0, 0, shape);
}

/**
 * Create a polygon sprite 
 * @param {string} colliderType 
 * @param {number} initialX 
 * @param {number} initialY 
 * @param {Vec2[]} vertices 
 * @returns 
 */
export function createPolygonSprite(colliderType, initialX, initialY, vertices){
    const shape = new Polygon(vertices);
    const sprite = createSprite(colliderType, initialX, initialY, shape);
    return sprite;
}

/**
 * Create a polygon sprite rendered as an SVG path array.
 * @param {string} colliderType one of: `dynamic`, `static`, or `kinematic`. Use the `COLLIDER_*` constants.
 * @param {number} initialX the sprite's initial x position (body origin)
 * @param {number} initialY the sprite's initial y position (body origin)
 * @param {Vec2[]} vertices optionally, an array of vertex objects giving points relative to body center (i.e., `initialX`, `initialY`).
 *  These form the fixture used by the physics simulation.
 *  If none is provided, a box is created by applying the scale factor to the native SVG view box.
 * @param {string} svgFilePath the path to the .svg document (relative to main game file)
 * @param {number} scale scale factor to apply to SVG path array
 * @param {number} [svgVBOffsetX=0] additional origin X offset to apply
 * @param {number} [svgVBOffsetY=0] additional origin Y offset to apply
 * @returns {Sprite} the new sprite
 */
export async function createPolygonSVGSprite(colliderType, initialX, initialY, svgFilePath, scale = 1, vertices = [], svgVBOffsetX = 0, svgVBOffsetY = 0){
    const paths = await pathArrayFromSvg(svgFilePath);
    let shape;
    // the SVG viewbox is always rectangular, so this is the offset of the paths' origin from the body center
    const pathsOriginXOffset = (paths.nativeWidth * scale / 2);
    const pathsOriginYOffset = (paths.nativeHeight * scale / 2);
    if(vertices.length > 0){
        shape = new Polygon(vertices);
    }
    else {
        shape = new Box(pathsOriginXOffset, pathsOriginYOffset);
    }
    const sprite = createSprite(colliderType, initialX, initialY, shape);
    sprite.paths = paths;
    sprite.scale = scale;
    sprite.pathsOriginXOffset = pathsOriginXOffset;
    sprite.pathsOriginYOffset = pathsOriginYOffset;
    sprite.svgVBOffsetX = svgVBOffsetX * scale;
    sprite.svgVBOffsetY = svgVBOffsetY * scale;
    return sprite;
}

/**
 * @typedef {Object} Sprite
 * @property {function} getTags
 * @property {function} setTags set the tags
 * @method setBounciness 
 *  @param {number} bounciness
 */

/**
 * Create a new sprite
 * @param {string} colliderType 
 * @param {number} initialX 
 * @param {number} initialY 
 * @param {object} shape 
 * @returns {Sprite} the new sprite
 */
function createSprite(colliderType, initialX, initialY, shape){
    const body = _world.createBody({
        position: { x: initialX, y: initialY },
        type: colliderType
    });
    body.createFixture({
        shape: shape,
        density: 1,
        friction: 0.9,
        restitution: 0.1
    });
    if(colliderType === COLLIDER_NONE){
        body.setActive(false);
    }
    body.setUserData({
        fillColor: getRandomColor(),
        strokeColor: "black",
        strokeWidth: 1,
        debug: false,
        life: null,
        tags: []
    });
   
    // Note these physics-changing functions only operate on the first fixture.
    // Can use the planck Fixture to change properties of individual fixtures 
    // within game code
    body.setBounciness = (bounciness) => body.getFixtureList().setRestitution(bounciness);
    body.setDensity = (density) => {
        body.getFixtureList().setDensity(density);
        body.resetMassData();
    };
    body.setFriction = (friction) => {
        body.getFixtureList().setFriction(friction);
    };
    body.setFilterGroupIndex = (index) => {
        body.getFixtureList().setFilterGroupIndex(index);
    };
    body.setUserDataProp = (p, v) => {
        let ud = body.getUserData();
        ud[p] = v;
        body.setUserData(ud);
    };
    body.setLife = (nFrames) => {
        body.setUserDataProp("life", nFrames);  
    };
    body.getLife = () => body.getUserData().life;
    body.setTags = (tagArray) => body.setUserDataProp("tags", tagArray);
    body.getTags = () => body.getUserData().tags;
    body.addTag = (tag) => body.getTags().push(tag);
    body.removeTag = (tag) => body.setTags(body.getTags().filter(t => t !== tag));
    body.hasTag = (tag) => body.getTags().indexOf(tag) != -1;
    body.getFillColor = () => body.getUserData().fillColor;
    body.setFillColor = (color) => body.setUserDataProp("fillColor", color);
    body.getStrokeColor = () => body.getUserData().strokeColor;
    body.setStrokeColor = (color) => body.setUserDataProp("strokeColor", color);
    body.setStrokeWidth = (width) => body.setUserDataProp("strokeWidth", width);
    body.setDebug = (debug) => body.setUserDataProp("debug", debug);
    body.addCollisionListener = (fn, tag) => {
        if(tag) addCollisionListenerForSpriteWithTag(body, tag, fn);
        else addCollisionListenerForSprite(body, fn);
    };
    body.containsPoint = (x, y) => {
        let contains = false;
        for(let f = body.getFixtureList(); f; f = f.getNext()){
            if(f.testPoint({ x: x, y: y })){
                contains = true;
                break;
            }
        };
        return contains;
    };
    body.angleTo = (sprite) => {
        const bodyPos = body.getPosition();
        const otherPos = sprite.getPosition ?  sprite.getPosition() : sprite;
        return Math.atan2(otherPos.x - bodyPos.x, otherPos.y - bodyPos.y);
    };
    body.vectorTo = (sprite) => {
        const bodyPos = body.getPosition();
        const otherPos = sprite.getPosition ?  sprite.getPosition() : sprite;
        return {x: otherPos.x - bodyPos.x, y: otherPos.y - bodyPos.y};
    };
    // body.createJoint = (jointDef, other) => {
    //     jointDef.bodyA = body;
    //     jointDef.bodyB = other;
    //     return _world.createJoint(jointDef)
    // };
    return body;
}

/**
 * Removes the given sprite from the canvas and from the physics simulation
 * @param {object} sprite 
 */
export function removeSprite(sprite){
    _bodiesToRemove.push(sprite);
}

/**
 * Creates a new joint
 * @param {object} jointType one of the JOINT_* constants
 * @param {Body} spriteA 
 * @param {Body} spriteB 
 * @param {object} opts optional parameters for joint
 * @returns a reference to the new joint
 */
export function createJoint(jointType, spriteA, spriteB, opts = {}){
    let jointDef = {};
    switch(jointType){
        case JOINT_DISTANCE: 
            jointDef = new DistanceJoint(opts, spriteA, spriteB);
            break;
        case JOINT_REVOLUTE:
            jointDef = new RevoluteJoint(opts, spriteA, spriteB);
            break;
        case JOINT_WELD:
            jointDef = new WeldJoint(opts, spriteA, spriteB);
            break;
        case JOINT_WHEEL:
            jointDef = new WheelJoint(opts, spriteA, spriteB, opts.anchor, opts.axis);
            break;
        default:
            console.error("invalid or unimplemented joint type: " + jointType);
    }
    return _world.createJoint(jointDef);
};

/**
 * Find sprites with the given tag.
 * @param {string} tag 
 * @returns {object[]} an array of sprites with the given tag
 */
export function getSpritesByTag(tag){
    let spritesWithTag = [];
    for(let b = _world.getBodyList(); b; b = b.getNext()){
        if(b.getUserData().tags.includes(tag)){
            spritesWithTag.push(b);
        }
    }
    return spritesWithTag;
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
    };
    _world.on("pre-solve", callback);
}

/**
 * Add a collision listener function which will be called when a collision occurs
 * which involves the given sprite.
 * The given sprite will be passed to the listener as the first parameter (spriteA).
 * @param {object} sprite 
 * @param {collisionListener} listenerFn 
 */
export function addCollisionListenerForSprite(sprite, listenerFn){
    const callback = (contact) => {
        const spriteA = contact.getFixtureA().getBody();
        const spriteB = contact.getFixtureB().getBody();
        if(spriteA === sprite) listenerFn(spriteA, spriteB, contact);
        else if(spriteB === sprite) listenerFn(spriteB, spriteA, contact);
    };
    _world.on("pre-solve", callback);
}

/**
 * Add a collision listener function which will be called when a collision occurs
 * which involves the given sprite with a sprite with the given tag.
 * The given sprite will be passed to the listener as the first parameter (spriteA).
 * @param {object} sprite 
 * @param {string} tag 
 * @param {collisionListener} listenerFn 
 * @returns {function} A reference to the listener which can be used to remove it later.
 */
export function addCollisionListenerForSpriteWithTag(sprite, tag, listenerFn){
    const callback = (contact) => {
        const spriteA = contact.getFixtureA().getBody();
        const spriteB = contact.getFixtureB().getBody();
        if(spriteA === sprite && spriteB.hasTag(tag)) listenerFn(spriteA, spriteB, contact);
        else if(spriteB === sprite && spriteA.hasTag(tag)) listenerFn(spriteB, spriteA, contact);
    };
    _world.on("pre-solve", callback);
    return callback;
}

/**
 * Removes the given collision listener
 * @param {function} callback the reference to the listener which was returned by `addCollisionListener...`
 */
export function removeCollisionListener(callback){
    _world.off("pre-solve", callback);
}

/** Draws the given fixture on the canvas */
function renderFixture(b, f){
    const shapeType = f.getType();
    const pos = b.getPosition();
    const massCenter = b.getWorldCenter();
    const ud = b.getUserData();
    const shape = f.getShape();
    if(b.paths){
        // draw SVG path array
        // NOTE: the SVG document will always be rectangular, but the sprite can be a circle or polygon.
        // The SVG view box is drawn centered on the body position, plus any offset (for SVG documents with translation for which we want to compensate).
        drawPathArray(pos.x, pos.y, b.pathsOriginXOffset, b.pathsOriginYOffset, b.svgVBOffsetX, b.svgVBOffsetY, b.paths, b.scale, b.getAngle());
        if(ud.debug){
            drawPolygon(getPolygonAbsoluteVertices(b, shape), "#00000000", "limegreen", 0.1);
        }               
    } else {
        // draw simple shape
        if(shapeType === SHAPE_TYPE_POLYGON || (shapeType === SHAPE_TYPE_CHAIN && shape.m_isLoop === true)){
            drawPolygon(getPolygonAbsoluteVertices(b, shape), ud.fillColor, ud.strokeColor, ud.strokeWidth);
        } else if(shapeType === SHAPE_TYPE_CIRCLE){
            drawCircle(pos.x, pos.y, shape.m_radius, ud.fillColor, ud.strokeColor, ud.strokeWidth);
        } else if(shapeType === SHAPE_TYPE_EDGE){
            drawEdge(shape, ud.strokeColor, ud.strokeWidth);
        } else if(shapeType === SHAPE_TYPE_CHAIN){
            drawChain(shape, ud.strokeColor, ud.strokeWidth);
        } else {
            console.error("unrecognized shape type");
        }
    }
    
    if(ud.debug === true){
        drawCircle(pos.x, pos.y, 0.1, "limegreen", "limegreen"); // body origin
        drawCircle(massCenter.x, massCenter.y, 0.1, "red", "red"); // center of mass
    }
}

function getPolygonAbsoluteVertices(body, shape){
    return shape.m_vertices.map(v => {
        return body.getWorldPoint(v);
    });
}

/**
 * Creates an array of Path2D objects from an SVG document. 
 * Designed to work with Google-Drawing-created .svg documents
 * @param {string} svgDoc file path relative to main game file
 * @returns {Path2D[]} paths
 */
export async function pathArrayFromSvg(svgDoc){
    const r = await fetch(svgDoc);
    const s = await r.text();
    
    const svgTempCtr = document.createElement("div");
    svgTempCtr.id = "svg-temp-container";
    svgTempCtr.style.display = "none";
    svgTempCtr.innerHTML = s;
    document.body.appendChild(svgTempCtr);

    const paths = [];
    
    const pathQL = document.querySelectorAll("div#svg-temp-container svg g path");
    pathQL.forEach(pathEl => {
        const p = new Path2D(pathEl.getAttribute("d"));
        for(const attr of pathEl.attributes) {
            p[attr.name] = attr.value;
        }
        if(p["style"]){
            const splitStyles = p.style.split(";");
            splitStyles.forEach(s => {
                const split = s.indexOf(":");
                const propKey = s.substring(0, split);
                const propVal = s.substring(split + 1);
                p[propKey] = propVal;
            });
        }
        paths.push(p);
    });
    const vb = svgTempCtr.querySelector("svg").getAttribute("viewBox").split(" ");
    paths.nativeWidth = vb[2];
    paths.nativeHeight = vb[3];
    document.body.removeChild(svgTempCtr);
    return paths;
}

function drawChain(chain, strokeColor, strokeWidth){
    for(let i = 0; i < chain.getChildCount(); i++){
        const edge = new Edge();
        chain.getChildEdge(edge, i);
        drawEdge(edge, strokeColor, strokeWidth);
    }
    
}

function drawEdge(edge, strokeColor, strokeWidth){
    drawLine(edge.m_vertex1.x, edge.m_vertex1.y, edge.m_vertex2.x, edge.m_vertex2.y, strokeColor, strokeWidth);
}

function drawPolygon(points, fillColor, strokeColor = "black", strokeWidth = 1) {
    // h/t planck testbed
    _ctx.beginPath();
    _ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        _ctx.lineTo(points[i].x, points[i].y);
    }
    _ctx.closePath();
    _ctx.lineWidth = strokeWidth;
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
    _ctx.fillStyle = fillColor;
    _ctx.fill();
}

export function drawLine(x1, y1, x2, y2, strokeColor = "black", strokeWidth = 1){
    _ctx.beginPath();
    _ctx.moveTo(x1, y1);
    _ctx.lineTo(x2, y2);
    _ctx.lineWidth = strokeWidth;
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
}

export function drawBorder( strokeColor = "black", strokeWidth = 1){
    _ctx.lineWidth = strokeWidth;
    _ctx.strokeStyle = strokeColor;
    _ctx.strokeRect(0, 0, _canvas.width, _canvas.height);
}

export function drawWorldBackground(){
    drawRect(0, 0, _canvas.width, _canvas.height, _world.bkgdColor);
}

export function drawRect (x, y, width, height, fillColor, strokeColor = "black", strokeWidth = 1) {
    _ctx.fillStyle = fillColor;
    _ctx.lineWidth = strokeWidth;
    _ctx.strokeStyle = strokeColor;
    _ctx.fillRect(x, y, width, height);
}

export function drawCircle (x, y, radius, fillColor, strokeColor = "black", strokeWidth = 1) {
    _ctx.beginPath();
    // arc(x, y, radius, startAngle, endAngle)
    _ctx.arc(x, y, radius, 0, 2 * Math.PI);
    _ctx.fillStyle = fillColor;
    _ctx.fill();
    _ctx.lineWidth = strokeWidth;
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
}

/**
 * Draw an array of Path2D objects.
 * Paths are drawn relative to the rectangular view box of the source SVG document. 
 * @param {number} centerX x of the center of the view box
 * @param {number} centerY y of the center of the view box
 * @param {number} originOffsetX x offset of origin from center
 * @param {number} originOffsetY y offset of origin from center
 * @param {Path2D[]} paths the paths to draw (as created by pathArrayFromSvg)
 * @param {number} scale scale factor
 * @param {number} angle rotation in radians (around the center)
 */
function drawPathArray(centerX, centerY, originOffsetX, originOffsetY, vbOffsetX, vbOffsetY, paths, scale, angle){
    _ctx.save();
    _ctx.translate(centerX, centerY);
    _ctx.rotate(angle);
    _ctx.translate(-originOffsetX, -originOffsetY);
    _ctx.translate(-vbOffsetX, -vbOffsetY);
    _ctx.scale(scale, scale);
    paths.forEach(p => {
        _ctx.lineCap = p["stroke-linecap"] ? p["stroke-linecap"] : _ctx.lineCap;
        _ctx.lineJoin = p["stroke-linejoin"] ? p["stroke-linejoin"] : _ctx.lineJoin;
        _ctx.lineWidth = p["stroke-width"] ? p["stroke-width"] : _ctx.lineWidth;
        _ctx.miterLimit = p["stroke-miterlimit"] ? p["stroke-miterlimit"] : _ctx.miterLimit;
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
    });
    _ctx.scale(-scale, -scale);
    _ctx.rotate(angle);
    _ctx.restore();
}

export function drawText (x, y, text, fontSize, color){
    _ctx.fillStyle = color;
    _ctx.font = `${fontSize}px sans-serif`;
    _ctx.fillText(text, x, y + fontSize);
}

export function clearCanvas(){
    _ctx.clearRect(0, 0, _worldWidth, _worldHeight);
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

export function destroyJoint(joint) {
    _world.destroyJoint(joint);
}

export function getVector(a, b) {
    return { x: b.x - a.x, y: b.y - a.y };
}

export function addVectors(v1, v2) {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
}

export function getLinearSpeedFromVector(v) {
    return Math.abs(v.x) + Math.abs(v.y);
}

/**
 * return the angle in radians from p1 to p2
 * @param {Vec2} p1 
 * @param {Vec2} p2 
 * @returns angle in radians
 */
export function angleTo(p1, p2) {
    return Math.atan2(p2.x - p1.x, p2.y - p1.y);
}


