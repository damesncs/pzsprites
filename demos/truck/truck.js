import { 
    COLLIDER_DYNAMIC, 
    COLLIDER_STATIC, 
    EVENT_KEY_PRESSED, 
    EVENT_KEY_RELEASED, 
    JOINT_WHEEL, 
    createChainSprite, 
    createCircleSprite, 
    createJoint, 
    getRandom, 
    renderFrame, 
    setupWorld, 
    PLANCK, 
    KEY_ARROW_LEFT, 
    KEY_ARROW_RIGHT, 
    createPolygonSVGSprite,
    drawText,
    addCollisionListenerForSpriteWithTag,
    removeSprite
} from "../../js/pzsprites.js";

window.onload = start;

// terrain generation parameters
const GROUND_SEGMENTS = 200;
const MAX_VERTICAL_CHANGE = 10;
const COIN_COUNT = 40;

let truck;
let frontWheel;
let frontWheelJoint;
let backWheel;
let backWheelJoint;
let ground;

let world;

let cameraScale = 3;
let score = 0;

// floating text effects
let floatingTexts = [];

async function start(){
    world = setupWorld("canvas", 800, 500);
    world.setWorldDimensions(10000, 500);
    world.setGravity({ x: 0, y: 10 });
    world.setCameraScale(cameraScale);

    const halfWidth = world.getWidth() / 2;
    const halfHeight = world.getHeight() / 2;

    // Truck
    truck = await createPolygonSVGSprite(
        COLLIDER_DYNAMIC, 
        halfWidth, 
        halfHeight - 50, 
        "truck.svg", 
        0.1
    );
    truck.setDensity(0.1);

    // Back wheel
    backWheel = createCircleSprite(
        COLLIDER_DYNAMIC, 
        truck.getPosition().x - 10, 
        truck.getPosition().y + 6, 
        3
    );
    backWheel.setFillColor("#00000000");
    backWheel.setStrokeWidth(0.5);
    backWheel.setFriction(10);
    backWheel.createFixture({
        shape: new PLANCK.Box(backWheel.radius, 0.1)
    });

    // Front wheel
    frontWheel = createCircleSprite(
        COLLIDER_DYNAMIC, 
        truck.getPosition().x + 10, 
        truck.getPosition().y + 6, 
        3
    );
    frontWheel.setFillColor("#00000000");
    frontWheel.setStrokeWidth(0.5);
    frontWheel.setFriction(10);
    frontWheel.createFixture({
        shape: new PLANCK.Box(frontWheel.radius, 0.1)
    });

    // Joints
    backWheelJoint = createJoint(
        JOINT_WHEEL, 
        truck, 
        backWheel, 
        { 
            axis: { x: 0, y: 1 }, 
            anchor: backWheel.getPosition(), 
            dampingRatio: 0.9, 
            frequencyHz: 4 
        }
    );

    frontWheelJoint = createJoint(
        JOINT_WHEEL, 
        truck, 
        frontWheel, 
        { 
            axis: { x: 0, y: 1 }, 
            anchor: frontWheel.getPosition(), 
            dampingRatio: 0.9, 
            frequencyHz: 4 
        }
    );

    backWheelJoint.setMaxMotorTorque(3500);

    // === Generate Terrain ===
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
    ground.setFriction(1);

    // === Create Coins ===
    for (let i = 5; i < GROUND_SEGMENTS; i += Math.floor(GROUND_SEGMENTS / COIN_COUNT)) {
        const vx = vertices[i];

        const coin = createCircleSprite(
            COLLIDER_STATIC,
            vx.x,
            vx.y - 10,
            2
        );

        coin.setFillColor("gold");
        coin.setStrokeColor("orange");
        coin.setStrokeWidth(0.5);
        coin.setTags(["coin"]);
    }

    // === Collision ===
    addCollisionListenerForSpriteWithTag(truck, "coin", (truckSprite, coinSprite) => {
        score++;

        const pos = coinSprite.getPosition();
        floatingTexts.push({
            x: pos.x,
            y: pos.y,
            text: "+1 coin",
            life: 60  // frames
        });

        removeSprite(coinSprite);
    });

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    let truckPos = truck.getPosition();

    world.setCameraPosition(truckPos.x, truckPos.y);
    world.setCameraScale(cameraScale);

    renderFrame();

    // === Draw Floating Texts (world space) ===
    floatingTexts.forEach(t => {
        drawText(t.x, t.y, t.text, 12, "green");
        t.y -= 0.5;   // float upward
        t.life--;
    });

    floatingTexts = floatingTexts.filter(t => t.life > 0);

    // === Draw UI (screen space) ===
    world.setCameraScale(1);
    world.setCameraPosition(world.getWidth() / 2, world.getHeight() / 2);

    drawText(650, 20, "Coins: " + score, 18, "black");

    requestAnimationFrame(drawEachFrame);
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