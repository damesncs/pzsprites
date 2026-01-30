// lift simulator - work ongoing!

// FOR BEST RESULTS: 
// 1. Click the Layout button at the bottom-left of the code window
// 2. Choose "Fullscreen Graphics Output"
// 3. Click Run

// (the canvas is sized at program start)

// CONTROLS:
// W key to apply thrust (engine power)
// Up and Down arrow keys to control elevator (pitch up and down)

const
    // physics parameters
    AIR_DENSITY = 1.2,
    SPEED_FACTOR = 0.3, // plane speed compensation factor (to reduce lift)
    VECTOR_REF_FRAMES = 10, // number of frames to average for flow reference
    LIFT_LIMIT = 100, // hard limit on lift force (to reduce craziness)
    COL_LIMIT = 2.5, // hard limit on CoL (to reduce craziness)

    // plane parameters
    MAX_THRUST = 20, // i.e., engine power
    THRUST_INCR = 0.1, // thrust to add each frame while engine on
    COD = 0.0378, // coefficient of drag - for Sopwith Camel
    FRONT_AREA = 15, // frontal area for drag
    WINGSPAN = 10,
    WING_LENGTH = 1, // i.e., cross-section length
    WING_PLAN_AREA = WINGSPAN * WING_LENGTH, // wing area for lift
    ELEVATOR_AREA = 0.05,

    // world parameters
    GROUND_HEIGHT = 30,
    GROUND_WIDTH = 10000, // this is the world area to generate, with the plane in the center
    MAX_ALT = 10000, // maximum altitude
    TREES_COUNT = 50, // trees to generate
    CLOUDS_COUNT = 50 // clouds to generate
    ;

// const vectorRefPoint = { x: 0, y: 0};
const vectorRefPoints = [];
let vectorRefAvgPoint = {x: 0, y: 0};

// sprites
let plane, planeWheel, planeTailWheel, planeNose,
    noseJoint, wheelJoint, tailWheelJoint, exhaust,

    ground, display, debugRefPoint,

    obstacles, trees, clouds,
    
    leftBound, rightBound, planeCameraMargin;

let flowAngle = 0, noseAngle = 0;

let elevatorState = "-";

let planeImg;

// physics variables
let drag = 0,
    dragArea = 0,
    aoa = 0,
    col = 0,
    lift = 0,
    xForce = 0,
    thrust = 0,
    elevForce = 0;

// let displayElements;

function preload(){
    planeImg = loadImage("https://codehs.com/uploads/2c3bbf82b8e89f5ed7b541f40ebf3844");
}

function setup() {
    new Canvas('16:9');
    world.gravity.y = 10;
    
    ground = new Sprite();
    ground.amount = 1;
    ground.height = GROUND_HEIGHT;
    ground.width = GROUND_WIDTH - width;
    ground.x = GROUND_WIDTH / 2 ;
    ground.y = height;
    ground.color = 'brown';
    ground.collider = 'static';
    ground.friction = 10;
    
    leftBound = (GROUND_WIDTH / 2) - (width / 2);
    rightBound = (GROUND_WIDTH / 2) + (width / 2);
    planeCameraMargin = height / 4;

    display = new Sprite(0, height / 2, 120, height / 2, 's');
    display.color = 'white';
    display.textSize  = 20;
    display.collider = 'none';
    
    // create the shape of plane sprite bounding box
    // use the `debug` property to see the outline
    let planeWidth = 100;
    let planeHeight = 50;
    let originX = 30;
    let originY = ground.y - planeHeight;
    let pt1 = [originX, originY];
    let pt2 = [originX + planeWidth, originY];
    let pt3 = [originX + planeWidth, originY + 20];
    let pt4 = [originX, originY + 12];
    plane = new Sprite([pt1, pt2, pt3, pt4, pt1]);
    plane.offset.x = -25; // puts the center of rotation and gravity just over the front wheel
    
    planeImg.resize(100, 50);
    plane.img = planeImg;
    plane.bearing = 0;
    plane.layer = 2;
    plane.bounciness = 0;
    // console.log(`plane mass ${plane.mass}`); // mass is calculated by p5play based on sprite dimensions
    
     plane.debug = true; // uncomment to show sprite outline
    
    planeNose = new Sprite(plane.x + 25, plane.y, 1);
    
    noseJoint = new GlueJoint(planeNose, plane);
    
    planeWheel = new Sprite(plane.x + 8, plane.y + 20, 13);
    
    planeWheel.color = 'black';
    planeWheel.rotationDrag = 1;
    
    planeTailWheel = new Sprite(plane.x - 75, plane.y + 4, 3);
    planeTailWheel.color = 'black';
    // planeTailWheel.rotationDrag = 1;
    
    wheelJoint = new WheelJoint(plane, planeWheel);
    wheelJoint.springiness = 0.01;
    wheelJoint.damping = 1;
    
    tailWheelJoint = new WheelJoint(plane, planeTailWheel);
    tailWheelJoint.springiness = 0.01;
    tailWheelJoint.damping = 2;
    tailWheelJoint.angle = 170;

    trees = new Group();
    generateTrees(TREES_COUNT);
    
    clouds = new Group();
    generateClouds(CLOUDS_COUNT);
    
    debugRefPoint = new Sprite(0, 0, 20, 'n');
    debugRefPoint.color = "lightgreen";
    debugRefPoint.visible = false; // set this to `true` to see flow reference point
    
    exhaust = new Group();
    exhaust.diameter = () => random(1, 10);
	exhaust.color = () => color(random(210,255), random(210,255), random(210,255), random(100,255));
	exhaust.speed = () => random(1,3);
	exhaust.life = () => random(5, 25);
	exhaust.collider = 'none';
	exhaust.layer = 80;
	
	// This was an attempt at a different data display... didn't work the way I wanted
// 	displayElements = [
//         { label:'Thrust', data: thrust.toFixed(1) },
//         { label:'xForce', data: xForce.toFixed(1) },
//         { label:'Speed', data: plane.speed.toFixed(1) },
//         { label:'Drag', data: Math.trunc(drag) },
//         { label:'NoseAngle', data: plane.angleTo(planeNose).toFixed(1) },
//         { label:'AoA', data: Math.trunc(aoa) },
//         // AoAR aoaRadians.toFixed(2)  }
//         { label:'CoL', data: col.toFixed(2) },
//         // DragArea Math.trunc(dragArea) 
//         { label:'Lift', data: lift.toFixed(1) } ,
//         { label:'Alt', data: Math.trunc(height - plane.y - ground.height - (plane.height / 2)) },
//         { label:'PlaneD', data: Math.abs(vectorRefPoint.x - plane.x) },
//         { label:'Flow', data: flowAngle.toFixed(1) },
//         { label:'Elev', data: elevatorState },
//     ];
}

function draw() {
    clear();
    background('lightblue');

    ground.x = plane.x;

    camera.off();
    display.x = plane.x - (width / 2 - display.width / 2);
    if (plane.y < planeCameraMargin){
        display.y = plane.y + planeCameraMargin;
    } else {
        display.y = height / 2;
    }
    camera.on();
  
    if (plane.y < planeCameraMargin){
        camera.y = plane.y + planeCameraMargin;
    } else {
        camera.y = height / 2;
    }
    camera.x = plane.x;

    trees.cull(MAX_ALT, MAX_ALT, leftBound, rightBound, (t) => {
        // console.log('tree culled, remaining: ' + trees.length);
        t.remove();
        generateTree();
    });

    clouds.cull(MAX_ALT, MAX_ALT, leftBound, rightBound, (c) => {
        // console.log('cloud culled, remaining: ' + clouds.length);
        c.remove();
        generateCloud();
    });

    // get flow angle relative to plane CoG - averaged over x frames
    vectorRefPoints.push({x: plane.x, y: plane.y});
    if (vectorRefPoints.length === VECTOR_REF_FRAMES){
        vectorRefPoints.shift();
        vectorRefAvgPoint = vectorRefPoints.reduce((acc, cur, i) => {
            acc.x += cur.x;
            acc.y += cur.y;
            if (i === vectorRefPoints.length - 1){
                return { x: acc.x / vectorRefPoints.length, y: acc.y / vectorRefPoints.length };
            } 
            return acc;
        });
    }
            
    debugRefPoint.x = vectorRefAvgPoint.x;
    debugRefPoint.y = vectorRefAvgPoint.y;

    flowAngle = getOppositeAngle(plane.angleTo(vectorRefAvgPoint));
    
    // find drag force
    // TODO apply drag to vertical movement??
    drag = (AIR_DENSITY * (plane.speed ** 2) * COD * FRONT_AREA) / 2;
    xForce = thrust - drag;
    
    // find angle of attack
    noseAngle = plane.angleTo(planeNose);
    aoa = (flowAngle - noseAngle);

    // find coefficient of lift - mimic lift slope using quartic
    col = getCoL(aoa, "cubic2", COL_LIMIT);

    // find lift
    lift = (AIR_DENSITY * ((SPEED_FACTOR * plane.speed) ** 2) * col * WING_PLAN_AREA) / 2;
    
    // apply forces
    // each force must be applied at a "bearing" -
    // that is, the direction in which the sprite would move,
    // if this were the only force acting on it.
    // The bearing is given as an angle relative to the center of mass, 
    // with zero at 3 o'clock.
    // see https://p5play.org/learn/sprite.html?page=10
    
    // apply thrust away from nose (propeller)
    plane.bearing = noseAngle;
    plane.applyForce(thrust);
    
    // apply lift perpendicularly to air flow
    if (Math.abs(lift) <= LIFT_LIMIT){
        plane.bearing = flowAngle - 90;
        plane.applyForce(lift);
    }
    
    // apply drag opposite air flow
    plane.bearing = getOppositeAngle(flowAngle);
    plane.applyForce(drag);
    
    if(kb.pressing('w')){
        // increase thrust to limit
        if(thrust < MAX_THRUST) {
            thrust += THRUST_INCR;
        }
        // generate sprites for exhaust effect
        // note that the exhaust trail helps visualize the air flow
        const e = new exhaust.Sprite(plane.x, plane.y);
        e.direction = plane.angleTo(vectorRefAvgPoint);
    } else {
        thrust = 0;
    }
    
    // apply control force
    if(kb.pressing('arrow-up')){
        // down elevator (stick forward)
        planeTailWheel.bearing = getOppositeAngle(planeTailWheel.angleTo(plane)) + 90;
        elevForce = ELEVATOR_AREA * (plane.speed ** 2) * SPEED_FACTOR;
        planeTailWheel.applyForce(elevForce); 
        elevatorState = "DN";
    }
    else if(kb.pressing('arrow-down')){
        // up elevator (stick back)
        planeTailWheel.bearing = getOppositeAngle(planeTailWheel.angleTo(plane)) - 90;
        elevForce = ELEVATOR_AREA * (plane.speed ** 2) * SPEED_FACTOR;
        planeTailWheel.applyForce(elevForce);
        elevatorState = "UP";
    }
    else{
        elevatorState = "-";
    }
    
    // display.text = createDisplayText(displayElements);
    
    display.text =
        // `x: ${plane.x.toFixed(1)}\n` +
        // `y: ${plane.y.toFixed(1)}\n` +
        // `trees: ${trees.length}\n` +
        // `clouds: ${clouds.length}\n` +
        `Thrust: ${thrust.toFixed(2)}\n` +
        // `xForce: ${xForce.toFixed(2)}\n` +
        `Speed: ${plane.speed.toFixed(2)}\n` +
        // `yVel ${(plane.vel.y).toFixed(1)}\n` +
        `Drag: ${drag.toFixed(2)}\n` +
        // `NoseA: ${noseAngle.toFixed(1)}\n` + 
        `AoA: ${Math.trunc(aoa)}\n` +   
        // `AoAR ${aoaRadians.toFixed(2)}\n` + 
        `CoL: ${col.toFixed(2)}\n` +
        // `DragArea ${Math.trunc(dragArea)}\n` +
        `Lift: ${lift.toFixed(2)}\n` +
        // `DX: ${Math.abs(vectorRefAvgPoint.x - plane.x).toFixed(1)}\n` +
        // `DY: ${Math.abs(vectorRefAvgPoint.y - plane.y).toFixed(1)}\n` +
        // `FlowA: ${flowAngle.toFixed(1)}\n` +
        `Alt: ${Math.trunc(height - plane.y - (ground[0] ? ground[0].height : 0) - (plane.height / 2))}\n` +
        `Elev: ${elevatorState} ${elevForce.toFixed(1)}\n` 
        ;
}

function generateTrees(n){
    for(let i = 0; i < n; i++){
        generateTree(true);
    }
}

function generateTree(withinCameraView = false){
    let tree = new trees.Sprite();
    tree.height = random(5, 100);
    tree.width = random(3, 15);
    tree.color = 'brown';
    tree.layer = 1;
    if (withinCameraView){
        tree.x = random(camera.x - GROUND_WIDTH / 2, camera.x + GROUND_WIDTH / 2);
    } else {
        tree.x = random(camera.x + (width / 2), camera.x + GROUND_WIDTH / 2);
    }
    let treeY = (height - GROUND_HEIGHT / 2) - tree.height / 2;
    
    // generate tree top
    let top = new Sprite(tree.x, treeY - tree.height / 2, random(tree.width * 2, tree.height * 1.5));
    top.color = 'green';
    top.collider = 'none';
    top.layer = 1;

    tree.y = treeY;
    tree.collider = 'none';
    // trees.push(tree);
}

function generateClouds(n){
    for(let i = 0; i < n; i++){
        generateCloud(true);
    }
}

function generateCloud(withinCameraView = false){
    let cloud = new clouds.Sprite();
    cloud.layer = 1;
    cloud.collider = 'none';
    cloud.diameter = random(50, 200);
    cloud.color = 'white';
    if (withinCameraView){
        cloud.x = random(camera.x - GROUND_WIDTH / 2, camera.x + GROUND_WIDTH / 2);
    } 
    else {
        cloud.x = random(camera.x + (width / 2), camera.x + GROUND_WIDTH / 2);
    }
    
    let cloudY = random(-MAX_ALT / 2, 0);
    cloud.y = cloudY;

    // generate extra circles around the main cloud point
    let nCircles = random(5, 30);
    for (let i = 0; i < nCircles; i++){
        let eachCloudCircle = new Sprite(random(cloud.x, cloud.x + cloud.diameter * 1.5),
        random(cloud.y, cloud.y + cloud.diameter), random(cloud.diameter / 4, cloud.diameter / 1.5));
        eachCloudCircle.collider = 'none';
        eachCloudCircle.color = 'white';
        eachCloudCircle.layer = 1;
    }
}

// TODO make this work, data will need to be a callback fn
function createDisplayText(displayElements){
    let t = displayElements.map((e) => {
        `${e.label} ${e.data()}\n`
    });
    return t.join('\n');
}

function getOppositeAngle(theta) {
    if(theta < 0){
        return theta + 180;
    } else {
        return -(180 - theta);
    }
}

// lift slope approximation
function getCoL(aoa, liftCurve, limit){
    let c = 0;
    if (Math.abs(aoa) <= 90){
        if(liftCurve === "quartic1"){
            c = -0.00001 * ((aoa) ** 4) + ((aoa * 0.0001) ** 3) + ((aoa * 0.002) ** 2) + (aoa * 0.15);
        }
        if (liftCurve === "cubic1"){
            // plug this equation into desmos to see it
            // y\ =-0.001x^{3}\ +\ 0.015x^{2}\ +\ 0.3x
            // cubic1
            c = (-0.001 * (aoa ** 3)) + (0.01 * (aoa ** 2)) + (aoa * 0.26) + 1;
        }
        // cubic2
        // y\ =-0.0001x^{3}\ +\ 0.0001x^{2}\ +\ 0.09x
        c = (-0.0001 * (aoa ** 3)) + (0.0001 * (aoa ** 2)) + (aoa * 0.09) + 0.5;
        
    }
    if(Math.abs(c <= limit)){
        return c;
    } 
    if (c >= limit) return limit;
    if (c <= -limit) return -limit;
    return 0;
}