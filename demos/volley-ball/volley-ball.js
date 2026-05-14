import { setupWorld, createRectSprite, COLLIDER_STATIC, COLLIDER_DYNAMIC, 
    renderFrame, COLLIDER_KINEMATIC, EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, 
    createCircleSprite, getRandom, createPolygonSprite, 
    PLANCK,  } from "../../js/pzsprites.js";


window.onload = start;

let world;

let net, rightWall, leftWall, ground, ball, roof;

let leftHitter, rightHitter;

async function start() {
    world = setupWorld("canvas", 800, 500);
    
    net = createRectSprite(COLLIDER_STATIC, 400, 500, 20, 300);
    net.setFillColor("black");
    // addEventListener("mousedown", onMouseDown);
    // addEventListener("mouseup", onMouseUp);
    // addEventListener("mousemove", onMouseMove);
    
    roof = createRectSprite(COLLIDER_STATIC, world.getWidth()/2, 0, world.getWidth(), 10);
    roof.setFillColor("black");

    rightWall = createRectSprite(COLLIDER_STATIC, 0, 0, 10, 1000);
    rightWall.setFillColor("black");

    leftWall = createRectSprite(COLLIDER_STATIC, 800, 0, 10, 1000);
    leftWall.setFillColor("black");

    ground = createRectSprite(COLLIDER_STATIC, 0, 500, 1600, 10);
    ground.setFillColor("red");

   const leftVertices = [
        {x: 0, y: 0},
        {x: 100, y: 0},
        {x: 0, y: -100}
      ];
      
    //  let polygon = new Polygon(vertices);
    leftHitter = createPolygonSprite(COLLIDER_KINEMATIC, 200, 500, leftVertices);
    leftHitter.setFillColor("green");
    //leftHitter.setLinearVelocity()
    
    const rightVertices = [
        {x: 100, y:0},
        {x: 100, y: -100},
        {x: 0, y:0}

    ]

    rightHitter = createPolygonSprite(COLLIDER_KINEMATIC, 600, 500, rightVertices);
    rightHitter.setFillColor("blue");
    ball = createCircleSprite(COLLIDER_DYNAMIC,getRandom(0,world.getWidth()), 0, 10 );
    ball.setFillColor("yellow");
    ball.setBounciness(1);
    

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);
 //   addEventListener(EVENT_KEY_RELEASED, onKeyRelease);
    drawEachFrame(0); // begin the animation loop


}

function drawEachFrame(timestamp){
    if(leftHitter.getPosition().x > (world.getWidth()/2)-(leftHitter.width/2)){
        leftHitter.setPosition({x:world.getWidth()/2-leftHitter.width, y:490});
        console.log("over");
    }else if(leftHitter.getPosition().x < 0 + (leftHitter.width/2)){
        leftHitter.setPosition({x:leftHitter.width/2, y:490});
    }

    if(rightHitter.getPosition().x < (world.getWidth()/2)+(rightHitter.width/2)){
        rightHitter.setPosition({x:world.getWidth()/2+rightHitter.width, y:490});
    }else if(rightHitter.getPosition().x > world.getWidth() - (rightHitter.width/2)){
        rightHitter.setPosition({x:world.getWidth()-rightHitter.width/2, y:490});
    }
    renderFrame();
    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function onKeyPress(e){
    if(e.code === "KeyA"){
        leftHitter.setLinearVelocity({x:-250, y:0});
    } 

    if(e.code === "KeyD"){
        leftHitter.setLinearVelocity({x:250, y:0});
    }

    if(e.code === "KeyJ"){
        rightHitter.setLinearVelocity({x:-250, y:0});
    } 

    if(e.code === "KeyL"){
        rightHitter.setLinearVelocity({x:250, y:0});
    }
    
}

function onKeyRelease(e){
    if(e.code ==="KeyA"){
        leftHitter.setLinearVelocity({x:0, y:0});
    }

    if(e.code === "KeyD"){
        leftHitter.setLinearVelocity({x:0, y:0});
    }

    if(e.code ==="KeyJ"){
        rightHitter.setLinearVelocity({x:0, y:0});
    }

    if(e.code === "KeyL"){
        rightHitter.setLinearVelocity({x:0, y:0});
    }
    
}



