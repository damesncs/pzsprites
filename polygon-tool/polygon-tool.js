import { EVENT_KEY_PRESSED, EVENT_KEY_RELEASED, createPolygonSVGSprite, drawText, getCanvas, removeSprite, renderFrame, setupWorld } from "../js/pzsprites.js";

window.onload = start;

let filePickerEl;
let resetBtn;
let scaleSpinner;
let cameraSpinner;

let world;
let cameraScale = 1;
let cameraX, cameraY;

let mousePanning = false;

let svgSprite;

let halfHeight, halfWidth;

let mouseX = 0, mouseY = 0;

async function start(){
    setupToolElements();
 
    world = setupWorld("canvas", 800, 500);
    // world.setWorldDimensions(10000, 500);
    world.setCameraScale(cameraScale);

    halfWidth = world.getWidth() / 2;
    halfHeight = world.getHeight() / 2;

    cameraX = halfWidth;
    cameraY = halfHeight;

    addEventListener(EVENT_KEY_PRESSED, onKeyPress);
    addEventListener(EVENT_KEY_RELEASED, onKeyRelease);
    
    getCanvas().addEventListener("mousemove", onCanvasMouseMove);
    getCanvas().addEventListener("mousedown", onCanvasMouseDown);
    getCanvas().addEventListener("mouseup", onCanvasMouseUp);

    drawEachFrame(0);
}

function drawEachFrame(timestamp){
    // world.setCameraPosition(truckPos.x, truckPos.y); 
    world.setCameraScale(cameraScale);
    renderFrame();

    drawText(0, 0, `Mouse: (${mouseX}, ${mouseY})`, 16, "black");
    drawText(0, 20, `Camera: (${cameraX}, ${cameraY})`, 16, "black");

    requestAnimationFrame(drawEachFrame); // ask the browser to call this function again when ready
}

function onKeyPress(e){
    if(e.key === "w"){
        cameraScale -= 0.5;
        cameraSpinner.value = cameraScale;
    }
    if(e.key === "e"){
        cameraScale += 0.5;
        cameraSpinner.value = cameraScale;
    }

}   

function onKeyRelease(e){

}

function onCanvasMouseMove(e){
    mouseX = e.offsetX;
    mouseY = e.offsetY;

    if(mousePanning){
        // cameraX = 
    }
}

function onCanvasMouseDown(e){
    mousePanning = true;
}

function onCanvasMouseUp(e){
    mousePanning = false;
}

function setupToolElements(){
    filePickerEl = document.getElementById("svg-file");
    filePickerEl.addEventListener("change", loadSVG);

    // resetBtn = document.getElementById("reset-button");
    // resetBtn.addEventListener("click", loadSVG);

    scaleSpinner = document.getElementById("svg-scale");
    scaleSpinner.addEventListener("change", onSvgScaleChange);

    cameraSpinner = document.getElementById("camera-scale");
    cameraSpinner.addEventListener("click", onCameraScaleChange);
}

async function loadSVG(){
    if(filePickerEl.files.length > 0){
        const b = URL.createObjectURL(filePickerEl.files[0]);
        if(svgSprite) removeSprite(svgSprite);
        svgSprite = await createPolygonSVGSprite("none", halfWidth, halfHeight, b, scaleSpinner.value);
        svgSprite.setDebug(true);
    } else {
        alert("No file selected!");
    }
}

function onSvgScaleChange(){
    svgSprite.setScale(scaleSpinner.value);
}

function onCameraScaleChange(){
    cameraScale = cameraSpinner.value;
}

function resetSVG(){

}