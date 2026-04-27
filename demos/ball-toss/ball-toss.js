import {
    setupWorld,
    COLLIDER_STATIC,
    createRectSprite,
    createCircleSprite
} from "../../js/pzsprites.js";

// =========================
// GAME CORE
// =========================
const Game = {

    canvas: null,
    ctx: null,
    world: null,

    player: null,
    playerAngle: 0,
    playerHealth: 100,
    damageFlash: 0,
    isDead: false,

    keys: {},
    bullets: [],
    enemies: [],

    // =========================
    // INIT
    // =========================
    init() {
        this.canvas = document.getElementById("canvas");
        this.ctx = this.canvas.getContext("2d");

        this.world = setupWorld("canvas", 800, 600, {
            gravity: { x: 0, y: 0 }
        });

        this.player = createCircleSprite(COLLIDER_STATIC, 200, 200, 10);
        this.player.setFillColor("blue");

        this.createMap();
        this.createEnemies();
        this.bindEvents();

        this.loop();
    },

    bindEvents() {
        window.addEventListener("keydown", e => {
            this.keys[e.key.toLowerCase()] = true;

            // restart on death
            if (this.isDead && e.key.toLowerCase() === "r") {
                this.restart();
            }
        });

        window.addEventListener("keyup", e => {
            this.keys[e.key.toLowerCase()] = false;
        });

        window.addEventListener("mousedown", () => {
            if (!this.isDead) this.shoot();
        });
    },

    restart() {
        this.playerHealth = 100;
        this.isDead = false;
        this.bullets = [];
        this.enemies = [];
        this.createEnemies();

        this.player.setPosition({ x: 200, y: 200 });
        this.playerAngle = 0;
    },

    // =========================
    // LOOP
    // =========================
    loop() {
        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    },

    update() {
        if (this.isDead) return;

        this.updatePlayer();
        this.updateBullets();
        this.updateEnemies();
        this.handleBulletEnemyCollision();
    },

    render() {
        const ctx = this.ctx;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.draw3D();
        this.drawHUD();

        if (this.isDead) {
            this.drawDeathScreen();
        }
    },

    // =========================
    // MAP
    // =========================
    createMap() {
        const w = 1200, h = 900, wall = 40;

        createRectSprite(COLLIDER_STATIC, w/2, 0, w, wall);
        createRectSprite(COLLIDER_STATIC, w/2, h, w, wall);
        createRectSprite(COLLIDER_STATIC, 0, h/2, wall, h);
        createRectSprite(COLLIDER_STATIC, w, h/2, wall, h);

        createRectSprite(COLLIDER_STATIC, 600, 300, 400, 20);
        createRectSprite(COLLIDER_STATIC, 600, 600, 400, 20);
    },

    // =========================
    // PLAYER
    // =========================
    updatePlayer() {
        const speed = 2.2;
        let dx = 0, dy = 0;

        if (this.keys["w"]) {
            dx += Math.cos(this.playerAngle) * speed;
            dy += Math.sin(this.playerAngle) * speed;
        }

        if (this.keys["s"]) {
            dx -= Math.cos(this.playerAngle) * speed;
            dy -= Math.sin(this.playerAngle) * speed;
        }

        if (this.keys["a"]) this.playerAngle -= 0.03;
        if (this.keys["d"]) this.playerAngle += 0.03;

        this.movePlayer(dx, dy);

        const pos = this.player.getPosition();
        this.world.setCameraPosition(pos.x, pos.y);
    },

    movePlayer(dx, dy) {
        const pos = this.player.getPosition();

        if (!this.isWall(pos.x + dx, pos.y)) {
            this.player.setPosition({ x: pos.x + dx, y: pos.y });
        }

        if (!this.isWall(pos.x, pos.y + dy)) {
            this.player.setPosition({ x: pos.x, y: pos.y + dy });
        }
    },

    // =========================
    // ENEMIES
    // =========================
    createEnemies() {
        this.enemies.push(this.createEnemy(500, 400));
        this.enemies.push(this.createEnemy(700, 500));
        this.enemies.push(this.createEnemy(300, 700));
    },

    createEnemy(x, y) {
        return {
            x, y,
            spawnX: x, spawnY: y,
            size: 40,
            health: 3,
            attackCooldown: 0,
            damage: 5,
            respawnTimer: 0
        };
    },

    updateEnemies() {
        const p = this.player.getPosition();

        for (let e of this.enemies) {

            if (e.health <= 0) {
                if (--e.respawnTimer <= 0) {
                    Object.assign(e, {
                        x: e.spawnX,
                        y: e.spawnY,
                        health: 3,
                        attackCooldown: 0
                    });
                }
                continue;
            }

            let dx = p.x - e.x;
            let dy = p.y - e.y;
            let dist = Math.hypot(dx, dy);

            if (dist > 0.001) {
                dx /= dist;
                dy /= dist;
            }

            const speed = 0.6;

            if (!this.isWall(e.x + dx * speed, e.y)) e.x += dx * speed;
            if (!this.isWall(e.x, e.y + dy * speed)) e.y += dy * speed;

            e.attackCooldown--;

            if (dist <= e.size/2 + 10 && e.attackCooldown <= 0) {
                this.playerHealth -= e.damage;
                e.attackCooldown = 60;
                this.damageFlash = 10;

                if (this.playerHealth <= 0) {
                    this.triggerDeath();
                }
            }
        }
    },

    triggerDeath() {
        this.isDead = true;
    },

    // =========================
    // BULLETS
    // =========================
    shoot() {
        const pos = this.player.getPosition();

        this.bullets.push({
            x: pos.x,
            y: pos.y,
            vx: Math.cos(this.playerAngle) * 10,
            vy: Math.sin(this.playerAngle) * 10,
            life: 200
        });
    },

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];

            if (this.isWall(b.x + b.vx, b.y)) b.vx *= -1;
            if (this.isWall(b.x, b.y + b.vy)) b.vy *= -1;

            b.x += b.vx;
            b.y += b.vy;

            if (--b.life <= 0) this.bullets.splice(i, 1);
        }
    },

    handleBulletEnemyCollision() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];

            for (let e of this.enemies) {
                if (Math.hypot(b.x - e.x, b.y - e.y) < e.size/2) {
                    e.health--;
                    this.bullets.splice(i, 1);

                    if (e.health <= 0) e.respawnTimer = 300;
                    break;
                }
            }
        }
    },

    // =========================
    // RENDER
    // =========================
    draw3D() {
        const ctx = this.ctx;
        const pos = this.player.getPosition();

        const FOV = Math.PI / 3;
        const rays = 200;
        const screenWidth = rays * 4;
        const screenHeight = 600;

        for (let i = 0; i < rays; i++) {
            let angle = this.playerAngle - FOV/2 + (i/rays)*FOV;
            let hit = this.castRay(pos.x, pos.y, angle);

            let dist = hit.dist * Math.cos(angle - this.playerAngle);
            let h = 6000 / (dist + 0.001);
            let shade = Math.max(0, 255 - dist * 0.8);

            ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
            ctx.fillRect(i*4, screenHeight/2 - h/2, 4, h);
        }

        let sprites = [];

        const pushSprite = (x, y, type, size = 20) => {
            let dx = x - pos.x;
            let dy = y - pos.y;
            let dist = Math.hypot(dx, dy);
            let angle = Math.atan2(dy, dx);

            let rel = angle - this.playerAngle;
            rel = Math.atan2(Math.sin(rel), Math.cos(rel));

            if (Math.abs(rel) > FOV / 2) return;

            sprites.push({
                screenX: ((rel + FOV / 2) / FOV) * screenWidth,
                dist,
                type,
                size
            });
        };

        for (let b of this.bullets) pushSprite(b.x, b.y, "bullet", 6);
        for (let e of this.enemies) if (e.health > 0) pushSprite(e.x, e.y, "enemy", e.size);

        sprites.sort((a, b) => b.dist - a.dist);

        for (let s of sprites) {
            let shade = Math.max(80, 255 - s.dist * 2);
            let scale = 200 / (s.dist + 0.001);
            let size = s.size * scale;
            let x = s.screenX;
            let y = screenHeight / 2;

            if (s.type === "bullet") {
                ctx.fillStyle = `rgb(${shade},50,50)`;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(1, size * 0.3), 0, Math.PI * 2);
                ctx.fill();
            }

            if (s.type === "enemy") {
                ctx.fillStyle = `rgb(${shade},0,0)`;
                ctx.fillRect(x - size/2, y - size/2, size, size);
            }
        }

        if (this.damageFlash > 0) {
            ctx.fillStyle = "rgba(255,0,0,0.2)";
            ctx.fillRect(0,0,this.canvas.width,this.canvas.height);
            this.damageFlash--;
        }
    },

    drawHUD() {
        this.ctx.fillStyle = "white";
        this.ctx.fillText("Health: " + this.playerHealth, 10, 20);
    },

    drawDeathScreen() {
        const ctx = this.ctx;

        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.fillStyle = "red";
        ctx.font = "40px sans-serif";
        ctx.fillText("YOU DIED", 300, 250);

        ctx.font = "20px sans-serif";
        ctx.fillText("Press R to Restart", 300, 300);
    },

    // =========================
    // UTILS
    // =========================
    castRay(x,y,angle){
        const step=2,max=1000;
        let dx=Math.cos(angle)*step;
        let dy=Math.sin(angle)*step;

        for(let i=0;i<max;i+=step){
            x+=dx;y+=dy;
            if(this.isWall(x,y)) return {dist:i};
        }
        return {dist:max};
    },

    isWall(x,y){
        for(let b=this.world.getBodyList(); b; b=b.getNext()){
            for(let f=b.getFixtureList(); f; f=f.getNext()){
                if(b===this.player) continue;
                if(f.testPoint({x,y})) return true;
            }
        }
        return false;
    }
};

window.onload = () => Game.init();