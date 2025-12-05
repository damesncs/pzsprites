// v0.1 - physics provided by planck.js

import { 
    World, 
    Box, 
    Circle,
    Edge
} from "../../js/planck.mjs";

let _canvas;
let _ctx;

let _world;

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

function setupCanvas (cvs, width, height){
    _canvas = cvs;
    _canvas.width = width;
    _canvas.height = height;
    _ctx = _canvas.getContext("2d");
}

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
        // TODO render joints
    }

}

/** creates a rectangular sprite
 * @param {string} colliderType one of: "dynamic", "static", or "kinematic". Use the COLLIDER_* constants.
 * @param {number} initialX the sprite's beginning x position
 * @param {number} initialY the sprite's beginning y position
 * @param {number} height the sprite's beginning height
 * @param {number} width the sprite's beginning width
 * 
 */
export function createRectSprite(colliderType, initialX, initialY, width, height){
    let shape = new Box(width / 2, height / 2);
    let sprite = createSprite(colliderType, initialX, initialY, shape);
    return sprite;
}

export function createCircleSprite(colliderType, initialX, initialY, radius){    
    let shape = new Circle({ x: 0, y: 0 }, radius);
    let sprite = createSprite(colliderType, initialX, initialY, shape);
    return sprite;
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
        fillColor: getRandomColorHexString(),
        strokeColor: "black"
    });
    body.setBounciness = (bounciness) => {
        body.getFixtureList().setRestitution(bounciness);
    };
    body.setFillColor = (color) => {
        let ud = body.getUserData();
        ud.fillColor = color;
        body.setUserData(ud);
    };
    body.setStrokeColor = (color) => {
        let ud = body.getUserData();
        ud.strokeColor = color;
        body.setUserData(ud);
    }
    return body;
}

export function createEdge(x1, y1, x2, y2, strokeColor){
    const points = [{x: x1, y: y1}, {x: x2, y: y2}];
    const body = _world.createBody({ position: points[0], type: COLLIDER_STATIC });
    body.createFixture({
        shape: new Edge(points[0], points[1])
    });
    body.setUserData({
        fillColor: "black",
        strokeColor: strokeColor
    });
    return body;
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
        drawLine(shape.m_vertex1.x, shape.m_vertex1.y, shape.m_vertex2.x, shape.m_vertex2.y, ud.strokeColor);
    } else {
        console.error("unrecognized shape type");
    }
}

function getPolygonAbsoluteVertices(body, shape){
    return shape.m_vertices.map(v => {
        return body.getWorldPoint(v);
    });
}

function drawPolygon(points, fillColor, strokeColor) {
    // h/t planck testbed

    _ctx.beginPath();
    _ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        _ctx.lineTo(points[i].x, points[i].y);
    }
    _ctx.closePath();
    // if(rotationRadians !== 0){
    //     // h/t MDN canvas docs
    //     _ctx.translate(rotateRefX, rotateRefY);
    //     _ctx.rotate(rotationRadians);
    //     _ctx.translate(-rotateRefX, -rotateRefY);
        
    // }
    _ctx.strokeStyle = strokeColor;
    _ctx.stroke();
    _ctx.fillStyle = fillColor;
    _ctx.fill();
    // _ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export function drawLine(x1, y1, x2, y2, color){
    _ctx.beginPath();
    _ctx.moveTo(x1, y1);
    _ctx.lineTo(x2, y2);
    _ctx.strokeStyle = color;
    _ctx.stroke();
}

export function drawBorder (){
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

export function getRandomColorHexString(){
    const r = getRandom8BitIntegerAsHexString();
    const g = getRandom8BitIntegerAsHexString();
    const b = getRandom8BitIntegerAsHexString();
    return `#${r}${g}${b}`;
}

export function getRandom8BitIntegerAsHexString(){
    return Math.trunc(Math.random() * 256).toString(16).padStart(2, 0);
}

// function getRectEdges (rect) {
//     return {
//         leftEdge: rect.x,
//         rightEdge: rect.x + rect.width,
//         topEdge: rect.y,
//         bottomEdge: rect.y + rect.height
//     }
// }

// function getCircleEdges(circle) {
//     return {
//         leftEdge: circle.x - circle.radius,
//         rightEdge: circle.x + circle.radius,
//         topEdge: circle.y - circle.radius,
//         bottomEdge: circle.y + circle.radius
//     }
// }

// export function createRectSprite(x, y, dx, dy, width, height, color, debug = false){
//     const draw = (r) => {
//         drawRect(r.x, r.y, r.width, r.height, r.color);
//         if(r.debug){
//             drawDebugRect(r);
//         }
//     }
//     let sprite = createSprite(x, y, dx, dy, color, draw, getRectEdges);
//     sprite.width = width;
//     sprite.height = height;
//     sprite.debug = debug;
//     return sprite;
// }

// export function createCircleSprite(x, y, dx, dy, radius, color, debug = false){
//     const draw = (c) => {
//         drawCircle(c.x, c.y, c.radius, c.color);
//         if(c.debug){
//             drawDebugCircle(c);
//         }
//     }

//     let sprite = createSprite(x, y, dx, dy, color, draw, getCircleEdges);
//     sprite.radius = radius;
//     sprite.debug = debug;
//     return sprite;
// }


// export async function createSpriteFromSvg(x, y, dx, dy, scale, svgDoc, debug = false) {
//     const draw = (s) => {
//         drawPathArray(s.x, s.y, s.paths, s.scale, debug);
//     }
//     let sprite = createSprite(x, y, dx, dy, null, draw, getRectEdges);
//     sprite.paths = await pathArrayFromSvg(svgDoc);
//     sprite.width = sprite.paths.nativeWidth * scale;
//     sprite.height = sprite.paths.nativeHeight * scale;
//     sprite.scale = scale;
//     return sprite;
// }

// export async function createCircleSpriteFromSvg(x, y, dx, dy, radius, scale, svgDoc, debug = false){
//     const draw = (s) => {
//         _ctx.save();
//         _ctx.beginPath();
//         _ctx.arc(s.x, s.y, s.radius, 0, 2 * Math.PI);
//         _ctx.clip();
//         drawPathArray(s.x - radius, s.y - radius, s.paths, s.scale, false);
//         _ctx.restore();
//         if(s.debug){
//            drawDebugCircle(s);
//         }
//     }
//     let sprite = createSprite(x, y, dx, dy, null, draw, getCircleEdges);
//     sprite.paths = await pathArrayFromSvg(svgDoc);
//     sprite.scale = scale;
//     sprite.radius = radius;
//     sprite.debug = debug;
//     return sprite;
// }


/** applies dx and dy to the x and y of each sprite, draws the sprite, and finds the new edges */
// export function moveAndDrawSprites(){
//     _sprites.forEach(s => {
//         s.x += s.dx;
//         s.y += s.dy;
//         s.draw(s);
//         const edges = s.findEdges(s);
//         s.leftEdge = edges.leftEdge;
//         s.rightEdge = edges.rightEdge;
//         s.topEdge = edges.topEdge;
//         s.bottomEdge = edges.bottomEdge
//     });
// }

export function removeSprite(sprite){
    _sprites.splice(_sprites.indexOf(sprite), 1);
}

export function rectOverlapsRect(r1, r2){
    return rectOverlapsRectX(r1, r2) && rectOverlapsRectY(r1, r2);
}

export function rectOverlapsRectX(r1, r2){
    return r1.rightEdge > r2.leftEdge && r2.rightEdge > r1.leftEdge;
}

export function rectOverlapsRectY(r1, r2){
    return r1.bottomEdge > r2.topEdge && r1.topEdge < r2.bottomEdge;
}

export function circleOverlapsRect(c, r){
    return circleRectangleTopEdgeAreColliding(c, r) ||
    circleRectangleBottomEdgeAreColliding(c, r) ||
    circleRectangleLeftEdgeAreColliding(c, r) ||
    circleRectangleRightEdgeAreColliding(c, r);
}

// returns true if circle sprite is colliding with rectangle sprite's top edge
export function circleRectangleTopEdgeAreColliding(c, r){
    if (c.y <= r.topEdge && c.rightEdge >= r.leftEdge && c.leftEdge <= r.rightEdge){
        return checkDistanceToPointLessThanRadius(c, c.x, r.topEdge);
    }
    return false;
}

export function circleRectangleBottomEdgeAreColliding(c, r){
    if (c.y >= r.bottomEdge && c.rightEdge >= r.leftEdge && c.leftEdge <= r.rightEdge){
        return checkDistanceToPointLessThanRadius(c, c.x, r.bottomEdge);
    }
    return false;
}

export function circleRectangleRightEdgeAreColliding(c, r){
    if (c.x >= r.rightEdge && c.bottomEdge >= r.topEdge && c.topEdge <= r.bottomEdge){
        return checkDistanceToPointLessThanRadius(c, r.rightEdge, c.y);
    }
    return false;
}

export function circleRectangleLeftEdgeAreColliding(c, r){
    if (c.x <= r.leftEdge && c.bottomEdge >= r.topEdge && c.topEdge <= r.bottomEdge){
        return checkDistanceToPointLessThanRadius(c, r.leftEdge, c.y);
    }
    return false;
}

// hat tip https://www.jeffreythompson.org/collision-detection/circle-rect.php
export function checkDistanceToPointLessThanRadius(circle, testX, testY){
    let distX = circle.x - testX;
    let distY = circle.y - testY;
    const distance = Math.sqrt( (distX*distX) + (distY*distY) );
    return distance <= circle.radius;
}

export function drawShapesObj(sObj, originX = 0, originY = 0, scale = 1, debug = false){
    try {
        if(debug){
            _ctx.strokeStyle = "limegreen";
            _ctx.strokeRect(originX, originY, sObj.nativeWidth * scale, sObj.nativeHeight * scale);
        }
        sObj.shapes.forEach((s, i) => {
            if(s.type){
                const shapeX = originX + s.x * scale;
                const shapeY = originY + s.y * scale;
                switch(s.type) {
                    case SHAPE_TYPE_RECT:
                        drawRect(shapeX, shapeY, s.w * scale, s.h * scale, s.constantColor);
                        break;
                    case SHAPE_TYPE_CIRC:
                        drawCircle(shapeX, shapeY, s.r * scale, s.constantColor);
                        break;
                    case SHAPE_TYPE_POINT: // designer only
                        drawCircle(shapeX, shapeY, POINT_RADIUS, POINT_COLOR);
                        break;
                }
            }
            else {
                throw new Error("no shape type for shape at index " + i);
            }
        });
    }
    catch(e) {
        console.error(e);
    }
}

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
