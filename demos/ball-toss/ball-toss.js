import {
    setupWorld,
    renderFrame,
    createRectSprite,
    createPolygonSVGSprite,
    KEY_ARROW_LEFT,
    KEY_ARROW_RIGHT,
    KEY_ARROW_UP,
    COLLIDER_DYNAMIC,
    COLLIDER_STATIC,
    pathArrayFromSvg,
    addCollisionListener,
    addCollisionListenerForSpriteWithTag
} from "../../js/pzsprites.js";

/* =========================================================
CONFIG
========================================================= */
const CONFIG = {
    world: {
        width: 800,
        height: 500,
        gravity: { x: 0, y: 20 }
    },

    player: {
        speed: 45,
        jumpForce: 50,
        scale: 0.5
    }
};

/* =========================================================
WORLD INIT
========================================================= */
const world = setupWorld(
    "game",
    CONFIG.world.width,
    CONFIG.world.height,
    { gravity: CONFIG.world.gravity }
);

/* =========================================================
INPUT SYSTEM
========================================================= */
const Input = {
    keys: {},

    init() {
        window.addEventListener("keydown", (e) => (this.keys[e.code] = true));
        window.addEventListener("keyup", (e) => (this.keys[e.code] = false));
    },

    down(key) {
        return !!this.keys[key];
    }
};

Input.init();

/* =========================================================
PLATFORMS
========================================================= */
for (let i = 0; i < 30; i++) {
    const platform = createRectSprite(
        COLLIDER_STATIC,
        i * 250,
        450 - Math.random() * 250,
        180,
        20
    );
    platform.addTag("platform");
}

/* =========================================================
ANIMATION STATES
========================================================= */
const STATE = {
    IDLE: "idle",
    LEFT: "left",
    RIGHT: "right",
    BACK: "back",

    JUMP_FORWARD: "jumpForward",
    JUMP_LEFT: "jumpLeft",
    JUMP_RIGHT: "jumpRight"
};

const STATE_MAP = {};

/* =========================================================
ASSET LOADING
========================================================= */
async function loadStates() {
    STATE_MAP[STATE.IDLE] = await pathArrayFromSvg("./Forward.svg");
    STATE_MAP[STATE.LEFT] = await pathArrayFromSvg("./Left.svg");
    STATE_MAP[STATE.RIGHT] = await pathArrayFromSvg("./Right.svg");
    STATE_MAP[STATE.BACK] = await pathArrayFromSvg("./Backwards.svg");

    STATE_MAP[STATE.JUMP_FORWARD] = await pathArrayFromSvg("./Forward Jump.svg");
    STATE_MAP[STATE.JUMP_LEFT] = await pathArrayFromSvg("./Left Jump.svg");
    STATE_MAP[STATE.JUMP_RIGHT] = await pathArrayFromSvg("./Right Jump.svg");
}

/* =========================================================
PLAYER CONTROLLER (EVENT-DRIVEN)
========================================================= */
function createPlayerController(body) {
    return {
        body,
        groundedCount: 0,
        currentState: STATE.IDLE,

        update() {
            const vel = this.body.getLinearVelocity();

            /* -------------------------
               MOVEMENT
            ------------------------- */
            let x = 0;
            if (Input.down(KEY_ARROW_LEFT)) x = -CONFIG.player.speed;
            if (Input.down(KEY_ARROW_RIGHT)) x = CONFIG.player.speed;

            this.body.setLinearVelocity({ x, y: vel.y });

            /* -------------------------
               JUMP
            ------------------------- */
            const grounded = this.groundedCount > 0;

            if (Input.down(KEY_ARROW_UP) && grounded) {
                this.body.setLinearVelocity({
                    x: vel.x,
                    y: -CONFIG.player.jumpForce
                });
            }

            /* -------------------------
               ANIMATION STATE
            ------------------------- */
            let newState = STATE.IDLE;

            const left = Input.down(KEY_ARROW_LEFT);
            const right = Input.down(KEY_ARROW_RIGHT);

            if (!grounded) {
                if (vel.x > 1) newState = STATE.JUMP_RIGHT;
                else if (vel.x < -1) newState = STATE.JUMP_LEFT;
                else newState = STATE.JUMP_FORWARD;
            } else {
                if (left) newState = STATE.LEFT;
                else if (right) newState = STATE.RIGHT;
                else newState = STATE.IDLE;
            }

            this.setState(newState);
        },

        setState(state) {
            if (state === this.currentState) return;
            this.currentState = state;
            this.body.paths = STATE_MAP[state];
        }
    };
}

/* =========================================================
PLAYER
========================================================= */
let player;

/* =========================================================
GAME LOOP
========================================================= */
function loop() {
    player.update();
    renderFrame();
    requestAnimationFrame(loop);
}

/* =========================================================
BOOT
========================================================= */
async function start() {
    await loadStates();

    const body = await createPolygonSVGSprite(
        COLLIDER_DYNAMIC,
        100,
        100,
        "./Forward.svg",
        CONFIG.player.scale
    );

    body.setFixedRotation(true);
    body.setFriction(0.2);
    body.setDebug(true);

    const controller = createPlayerController(body);
    player = controller;

    /* -------------------------
       COLLISION SYSTEM
    ------------------------- */

    // ENTER PLATFORM CONTACT
    addCollisionListenerForSpriteWithTag(
        body,
        "platform",
        (playerBody, platformBody, contact) => {
            controller.groundedCount++;
        }
    );

    // EXIT PLATFORM CONTACT
    addCollisionListener((a, b) => {
        const playerTouched =
            a === body || b === body;

        if (!playerTouched) return;

        const other = a === body ? b : a;

        if (other.hasTag && other.hasTag("platform")) {
            controller.groundedCount = Math.max(
                0,
                controller.groundedCount - 1
            );
        }
    });

    loop();
}

start();