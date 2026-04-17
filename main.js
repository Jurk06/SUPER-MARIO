const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelCompleteScreen = document.getElementById('level-complete-screen');
const scoreDisplay = document.getElementById('score-display');
const finalScore = document.getElementById('final-score');
const controlsHud = document.getElementById('controls-hud');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); 

// --- Asset Loading ---
const playerImg = new Image(); playerImg.src = 'assets/player.svg';
const brickImg = new Image(); brickImg.src = 'assets/brick.png';
let brickPattern = null; brickImg.onload = () => { brickPattern = ctx.createPattern(brickImg, 'repeat'); };
const bgImg = new Image(); bgImg.src = 'assets/background.png';
const eveningBgImg = new Image(); eveningBgImg.src = 'assets/evening_bg.png';
const nightBgImg = new Image(); nightBgImg.src = 'assets/night_bg.png';
const fireImg = new Image(); fireImg.src = 'assets/fire.png';
const castleImg = new Image(); castleImg.src = 'assets/castle.svg';
const gunImg = new Image(); gunImg.src = 'assets/gun.png';

// --- Game Constants & Formulas ---
const GRAVITY = 0.6;
const JUMP_FORCE = 15;
let BASE_SPEED = 7;
let SPEED = 7; 

// --- Game State ---
let gameState = 'START'; 
let score = 0;
let scrollOffset = 0;
let currentLevel = 1;
let playerLives = 3;

let player; let platforms = []; let hazards = []; let goals = []; let items = []; let projectiles = []; let enemies = []; let fireworks = [];

// --- Music Controller ---
class RetroMusicPlayer {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.notes = [261.63, 0, 329.63, 392.00, 523.25, 0, 392.00, 329.63, 261.63, 293.66, 329.63, 0, 196.00, 0, 196.00, 0, 261.63, 0, 329.63, 392.00, 523.25, 659.25, 523.25, 0, 392.00, 329.63, 261.63, 293.66, 261.63, 0, 0, 0];
        this.tempo = 160; this.noteIndex = 0; this.nextNoteTime = 0; this.timerID = null;
    }
    init() { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    scheduleNote() {
        if (!this.isPlaying) return;
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) { this.playNote(this.nextNoteTime); this.nextNote(); }
        this.timerID = requestAnimationFrame(this.scheduleNote.bind(this));
    }
    nextNote() { const s = 60.0 / this.tempo; this.nextNoteTime += 0.25 * s; this.noteIndex++; if (this.noteIndex >= this.notes.length) this.noteIndex = 0; }
    playNote(time) {
        let f = this.notes[this.noteIndex]; if (f === 0) return;
        const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
        osc.type = 'square'; osc.frequency.value = f;
        gain.gain.setValueAtTime(0.04, time); gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(time); osc.stop(time + 0.2);
    }
    play() {
        if (this.isPlaying) return; if (!this.ctx) this.init(); this.ctx.resume(); 
        this.isPlaying = true; this.noteIndex = 0; this.nextNoteTime = this.ctx.currentTime + 0.05; this.scheduleNote();
    }
    stop() { this.isPlaying = false; cancelAnimationFrame(this.timerID); }
    playWinSound() {
        this.stop(); if (!this.ctx) this.init(); this.ctx.resume();
        const winNotes = [523.25, 659.25, 783.99, 1046.50]; let t = this.ctx.currentTime;
        winNotes.forEach((f, idx) => {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = 'square'; osc.frequency.value = f;
            gain.gain.setValueAtTime(0.08, t + idx * 0.1); gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.1 + 0.15);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(t + idx * 0.1); osc.stop(t + idx * 0.1 + 0.2);
        });
    }
}
const musicPlayer = new RetroMusicPlayer();

// --- Input Handling ---
class InputHandler {
    constructor() {
        this.keys = { right: false, left: false, up: false, down: false };
        window.addEventListener('keydown', (e) => {
            switch(e.code) {
                case 'ArrowRight': case 'KeyD': this.keys.right = true; break;
                case 'ArrowLeft': case 'KeyA': this.keys.left = true; break;
                case 'ArrowUp': case 'KeyW': case 'Space':
                    this.keys.up = true;
                    if (gameState === 'PLAYING') player.jump();
                    break;
                case 'KeyF':
                    if (gameState === 'PLAYING' && player.hasGun) {
                        let baseBulletSpeed = currentLevel >= 3 ? 28 : 16; // Level 3 Gun Upgrade
                        let bulletDir = player.facingLeft ? -baseBulletSpeed : baseBulletSpeed;
                        let bulletX = player.facingLeft ? player.position.x : player.position.x + player.width;
                        projectiles.push(new Projectile(bulletX, player.position.y + player.height/2, bulletDir));
                    }
                    break;
                case 'Enter':
                    if (gameState === 'START') {
                        playerLives = 3; currentLevel = 1; initGame(); 
                    } else if (gameState === 'GAMEOVER') {
                        playerLives = 3; currentLevel = 1; initGame(true);
                    } else if (gameState === 'LIFELOST') {
                        initGame(true); // retry current level
                    } else if (gameState === 'LEVEL_COMPLETE') {
                        currentLevel++; initGame();
                    }
                    break;
            }
        });
        window.addEventListener('keyup', (e) => {
            switch(e.code) {
                case 'ArrowRight': case 'KeyD': this.keys.right = false; break;
                case 'ArrowLeft': case 'KeyA': this.keys.left = false; break;
                case 'ArrowUp': case 'KeyW': case 'Space': this.keys.up = false; break;
            }
        });
    }
}

// --- Player Class ---
class Player {
    constructor() {
        this.width = 48; this.height = 48;
        this.position = { x: 100, y: 100 }; this.velocity = { x: 0, y: 0 };
        this.isGrounded = false; this.facingLeft = false; this.hasGun = false;
        this.jumpCount = 0;
    }
    draw() {
        ctx.save();
        if (this.facingLeft) {
            ctx.scale(-1, 1);
            if (playerImg.complete) ctx.drawImage(playerImg, -this.position.x - this.width, this.position.y, this.width, this.height);
            else { ctx.fillStyle = '#e52521'; ctx.fillRect(-this.position.x - this.width, this.position.y, this.width, this.height); }
            if (this.hasGun) {
                if (gunImg.complete) ctx.drawImage(gunImg, -this.position.x - this.width - 15, this.position.y + 15, 24, 24);
                else { ctx.fillStyle = 'silver'; ctx.fillRect(-this.position.x - this.width - 15, this.position.y + 15, 24, 10); }
            }
        } else {
            if (playerImg.complete) ctx.drawImage(playerImg, this.position.x, this.position.y, this.width, this.height);
            else { ctx.fillStyle = '#e52521'; ctx.fillRect(this.position.x, this.position.y, this.width, this.height); }
            if (this.hasGun) {
                if (gunImg.complete) ctx.drawImage(gunImg, this.position.x + this.width - 5, this.position.y + 15, 24, 24);
                else { ctx.fillStyle = 'silver'; ctx.fillRect(this.position.x + this.width - 5, this.position.y + 15, 24, 10); }
            }
        }
        ctx.restore();
    }
    update(input) {
        this.velocity.x = 0;
        if (input.keys.right) { this.velocity.x = SPEED; this.facingLeft = false; } 
        else if (input.keys.left) { this.velocity.x = -SPEED; this.facingLeft = true; }

        this.position.x += this.velocity.x;
        this.velocity.y += GRAVITY;
        this.position.y += this.velocity.y;
        this.isGrounded = false; 
        if (this.position.y > canvas.height) triggerGameOver();
    }
    jump() { 
        if (this.isGrounded) {
             this.velocity.y = -JUMP_FORCE; this.isGrounded = false; this.jumpCount = 1;
        } else if (currentLevel >= 6 && this.jumpCount < 2) {
             // Unlock Double Jump at Level 6
             this.velocity.y = -JUMP_FORCE; this.jumpCount = 2;
        }
    }
}

class Platform {
    constructor(x, y, width, height, type = 'ground') { this.position = { x, y }; this.width = width; this.height = height; this.type = type; }
    draw() {
        if ((this.type === 'ground' || this.type === 'brick') && brickPattern) {
            ctx.save(); ctx.translate(this.position.x, this.position.y); ctx.fillStyle = brickPattern; ctx.fillRect(0, 0, this.width, this.height); ctx.restore();
            if (this.type === 'brick') { ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2; ctx.strokeRect(this.position.x, this.position.y, this.width, this.height); }
        } else {
            ctx.fillStyle = '#C84C0C'; ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
            if(this.type === 'ground') { ctx.fillStyle = '#68D000'; ctx.fillRect(this.position.x, this.position.y, this.width, 15); }
        }
    }
}
class Hazard {
    constructor(x, y, width, height) { this.position = { x, y }; this.width = width; this.height = height; }
    draw() {
        if (fireImg.complete) ctx.drawImage(fireImg, this.position.x, this.position.y, this.width, this.height);
        else { ctx.fillStyle = 'orange'; ctx.beginPath(); ctx.moveTo(this.position.x + this.width/2, this.position.y); ctx.lineTo(this.position.x + this.width, this.position.y + this.height); ctx.lineTo(this.position.x, this.position.y + this.height); ctx.fill(); }
    }
}
class Item {
    constructor(x, y) { this.position = { x, y }; this.width = 32; this.height = 32; this.collected = false; }
    draw() {
        if (this.collected) return;
        if (gunImg.complete) ctx.drawImage(gunImg, this.position.x, this.position.y, this.width, this.height);
        else { ctx.fillStyle = 'silver'; ctx.fillRect(this.position.x, this.position.y, this.width, this.height); }
    }
}
class Projectile {
    constructor(x, y, dx) { this.position = { x, y }; this.velocity = { x: dx, y: 0 }; this.radius = 6; this.markedForDeletion = false; }
    update() { this.position.x += this.velocity.x; }
    draw() { ctx.beginPath(); ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2); ctx.fillStyle = 'yellow'; ctx.fill(); ctx.strokeStyle = '#ffae00'; ctx.lineWidth = 2; ctx.stroke(); }
}
class Enemy {
    constructor(x, y) { 
        this.position = { x, y }; this.width = 70; this.height = 70; this.alive = true; this.patrolStart = x; 
        let baseEnemySpeed = 1.6;
        this.patrolSpeed = baseEnemySpeed * (1 + currentLevel * 0.05); // dynamic scaling
    }
    update() {
        if (!this.alive) return;
        this.position.x += this.patrolSpeed;
        if (this.position.x > this.patrolStart + 150 || this.position.x < this.patrolStart - 100) this.patrolSpeed *= -1;
    }
    draw() {
        if (!this.alive) return;
        ctx.save(); ctx.translate(this.position.x, this.position.y);
        ctx.fillStyle = '#065c19'; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#228B22'; ctx.fillRect(0, this.height - 20, this.width, 20);
        ctx.fillStyle = 'white'; 
        if (this.patrolSpeed < 0) {
             ctx.fillRect(10, 15, 12, 12); ctx.fillStyle = 'red'; ctx.fillRect(10, 15, 6, 6); ctx.fillStyle = 'orange'; ctx.fillRect(-15, 30, 20, 8);
        } else {
             ctx.fillRect(this.width - 22, 15, 12, 12); ctx.fillStyle = 'red'; ctx.fillRect(this.width - 16, 15, 6, 6); ctx.fillStyle = 'orange'; ctx.fillRect(this.width - 5, 30, 20, 8);
        }
        ctx.restore();
    }
}
class Goal {
    constructor(x, y, width, height) { this.position = { x, y }; this.width = width; this.height = height; }
    draw() {
        if (castleImg.complete) ctx.drawImage(castleImg, this.position.x, this.position.y, this.width, this.height);
        else { ctx.fillStyle = 'darkgray'; ctx.fillRect(this.position.x, this.position.y, this.width, this.height); }
    }
}

// --- Fireworks System ---
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const velocity = Math.random() * 5 + 2;
        this.vx = Math.cos(angle) * velocity; this.vy = Math.sin(angle) * velocity;
        this.life = 1.0; this.decay = Math.random() * 0.02 + 0.015;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.05; this.life -= this.decay; }
    draw() { ctx.globalAlpha = this.life; ctx.fillStyle = this.color; ctx.fillRect(this.x, this.y, 4, 4); ctx.globalAlpha = 1.0; }
}
class Firework {
    constructor(x, y) {
        this.x = x; this.y = y; this.particles = [];
        this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
        for (let i = 0; i < 60; i++) this.particles.push(new Particle(this.x, this.y, this.color));
    }
    update() { this.particles.forEach(p => p.update()); this.particles = this.particles.filter(p => p.life > 0); }
    draw() { this.particles.forEach(p => p.draw()); }
}


const input = new InputHandler();

// --- Core Game Functions ---
function initGame(isRestart = false) {
    if (isRestart && currentLevel === 1) {
        // If died on level 1 (tutorial), just restart the level
    } else if (isRestart) {
        // Punishing death drops you to standard state (but for now let's just reset current level distance)
        score = 0;
    }

    gameState = 'PLAYING';
    musicPlayer.play();
    
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelCompleteScreen.classList.add('hidden');
    scoreDisplay.style.display = 'block';
    controlsHud.classList.remove('hidden');
    
    player = new Player();
    platforms = []; hazards = []; goals = []; items = []; projectiles = []; enemies = []; fireworks = [];
    scrollOffset = 0;

    // --- SCALING LOGIC ---
    SPEED = BASE_SPEED * (1 + currentLevel * 0.05);
    let distanceMeters = 100 + (currentLevel * 15);
    let courseLength = distanceMeters * 35; // Canvas pixel conversion
    let currentX = -100;
    
    // Starting Safe Zone
    platforms.push(new Platform(currentX, canvas.height - 100, 1000, 200, 'ground'));
    if (currentLevel >= 2) items.push(new Item(500, canvas.height - 140)); // Gun drops Level 2+
    currentX += 1000;
    
    // --- PROCEDURAL GENERATOR ---
    while (currentX < courseLength) {
        let r = Math.random();
        
        // LEVEL 1: ONLY Ditches
        if (currentLevel === 1) {
             currentX += 150 + Math.random() * 150; // simple gap
             let w = 600 + Math.random() * 500;
             platforms.push(new Platform(currentX, canvas.height - 100, w, 200, 'ground'));
             currentX += w;
             continue;
        }
        
        // LEVEL 2+: Standard Logic 
        if (r < 0.25) {
            // Ditches
            currentX += 150 + Math.random() * 200; 
            if (currentLevel >= 6 && Math.random() > 0.5) { // Level 6+ Double Ditches
                platforms.push(new Platform(currentX, canvas.height - 100, 150, 200, 'ground'));
                currentX += 150 + 150 + Math.random() * 150; // second gap
            }
        } else if (r < 0.50) {
            // Ground with potential Fire (Level 2+)
            let w = 500 + Math.random() * 500;
            platforms.push(new Platform(currentX, canvas.height - 100, w, 200, 'ground'));
            hazards.push(new Hazard(currentX + w/2 - 25, canvas.height - 150, 50, 50)); 
            currentX += w;
        } else if (r < 0.75 && currentLevel >= 6) {
            // Floating challenge blocks (Level 6+)
            let platW = 150 + Math.random() * 150;
            let platY = canvas.height - 250 - Math.random() * 120;
            platforms.push(new Platform(currentX, platY, platW, 40, 'brick'));
            platforms.push(new Platform(currentX, canvas.height - 100, platW, 200, 'ground'));  
            if(Math.random() > 0.3) enemies.push(new Enemy(currentX + 50, canvas.height - 170));
            else hazards.push(new Hazard(currentX + platW/2 - 25, canvas.height - 150, 50, 50)); 
            currentX += platW;              
        } else {
            // Standard Ground segments
            let w = 800 + Math.random() * 1000;
            platforms.push(new Platform(currentX, canvas.height - 100, w, 200, 'ground'));
            // Dragon Spawn (Level 3+)
            if (currentLevel >= 3 && Math.random() > 0.4) {
                 enemies.push(new Enemy(currentX + w/2, canvas.height - 170));
            } else if (Math.random() > 0.8) items.push(new Item(currentX + w/2, canvas.height - 140)); // extra ammo/gun just in case
            currentX += w;
        }
    }
    
    // Final End Zone
    currentX += 150; 
    platforms.push(new Platform(currentX, canvas.height - 100, 2000, 200, 'ground'));
    goals.push(new Goal(currentX + 800, canvas.height - 400, 300, 300));
}

function triggerGameOver() {
    playerLives--;
    musicPlayer.stop();
    
    if (playerLives > 0) {
        gameState = 'LIFELOST';
        finalScore.innerText = `You Died! Level ${currentLevel}\nLives Remaining: ${playerLives}`;
    } else {
        gameState = 'GAMEOVER';
        finalScore.innerText = `GAME OVER!\nDistance: ${Math.floor(score)}m`;
    }
    
    gameOverScreen.classList.remove('hidden'); 
    scoreDisplay.style.display = 'none';
    controlsHud.classList.add('hidden');
}

function triggerLevelComplete() {
    gameState = 'LEVEL_COMPLETE'; musicPlayer.playWinSound();
    levelCompleteScreen.classList.remove('hidden'); 
    scoreDisplay.style.display = 'none';
    controlsHud.classList.add('hidden');
}

function rectIntersect(r1x, r1y, r1w, r1h, r2x, r2y, r2w, r2h) {
    return r1x < r2x + r2w && r1x + r1w > r2x && r1y < r2y + r2h && r1y + r1h > r2y;
}

function checkCollisions() {
    platforms.forEach(pf => {
        if (player.position.y + player.height - player.velocity.y <= pf.position.y && player.position.y + player.height >= pf.position.y && player.position.x + player.width >= pf.position.x + 10 && player.position.x <= pf.position.x + pf.width - 10) {
            player.velocity.y = 0; player.position.y = pf.position.y - player.height; player.isGrounded = true; player.jumpCount = 0;
        }
        if (player.position.x + player.width - player.velocity.x <= pf.position.x && player.position.x + player.width >= pf.position.x && player.position.y + player.height > pf.position.y && player.position.y < pf.position.y + pf.height) { player.velocity.x = 0; player.position.x = pf.position.x - player.width; }
        if (player.position.x - player.velocity.x >= pf.position.x + pf.width && player.position.x <= pf.position.x + pf.width && player.position.y + player.height > pf.position.y && player.position.y < pf.position.y + pf.height) { player.velocity.x = 0; player.position.x = pf.position.x + pf.width; }
        if (player.position.y - player.velocity.y >= pf.position.y + pf.height && player.position.y <= pf.position.y + pf.height && player.position.x + player.width > pf.position.x && player.position.x < pf.position.x + pf.width) { player.velocity.y = 0; player.position.y = pf.position.y + pf.height; }
    });

    hazards.forEach(h => { if(rectIntersect(player.position.x, player.position.y, player.width, player.height, h.position.x + 10, h.position.y + 10, h.width - 20, h.height - 20)) triggerGameOver(); });
    enemies.forEach(e => { if(e.alive && rectIntersect(player.position.x, player.position.y, player.width, player.height, e.position.x, e.position.y, e.width, e.height)) triggerGameOver(); });
    projectiles.forEach(p => { enemies.forEach(e => { if(e.alive && rectIntersect(p.position.x - p.radius, p.position.y - p.radius, p.radius*2, p.radius*2, e.position.x, e.position.y, e.width, e.height)) { e.alive = false; p.markedForDeletion = true; score += 50; } }); });
    items.forEach(i => { if(!i.collected && rectIntersect(player.position.x, player.position.y, player.width, player.height, i.position.x, i.position.y, i.width, i.height)) { i.collected = true; player.hasGun = true; score += 10; } });
    goals.forEach(g => { if(player.position.x + player.width > g.position.x + 150) triggerLevelComplete(); });
    projectiles = projectiles.filter(p => !p.markedForDeletion && p.position.x < player.position.x + canvas.width && p.position.x > player.position.x - canvas.width);
}

function handleCameraScrolling() {
    const thresholdRight = canvas.width * 0.4; const thresholdLeft = canvas.width * 0.2;
    if (player.position.x > thresholdRight && input.keys.right) {
        player.position.x = thresholdRight; let movedX = SPEED; scrollOffset += movedX;
        platforms.forEach(p => p.position.x -= movedX); hazards.forEach(h => h.position.x -= movedX); goals.forEach(g => g.position.x -= movedX); items.forEach(i => i.position.x -= movedX); projectiles.forEach(p => p.position.x -= movedX); enemies.forEach(e => { e.position.x -= movedX; e.patrolStart -= movedX; });
        score += 0.1;
    } else if (player.position.x < thresholdLeft && input.keys.left && scrollOffset > 0) {
        player.position.x = thresholdLeft; let movedX = SPEED; scrollOffset -= movedX;
        platforms.forEach(p => p.position.x += movedX); hazards.forEach(h => h.position.x += movedX); goals.forEach(g => g.position.x += movedX); items.forEach(i => i.position.x += movedX); projectiles.forEach(p => p.position.x += movedX); enemies.forEach(e => { e.position.x += movedX; e.patrolStart += movedX; });
    }
    if (player.position.x < 0) player.position.x = 0;
}

// --- Main Game Loop ---
function animate() {
    requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- THEME ENGINE ---
    let theme = 'DAY';
    if (currentLevel === 3) theme = 'EVENING';
    else if (currentLevel >= 4) theme = 'NIGHT';

    let activeBgImg = bgImg;
    if (theme === 'EVENING' && eveningBgImg.complete && eveningBgImg.width > 0) activeBgImg = eveningBgImg;
    else if (theme === 'NIGHT' && nightBgImg.complete && nightBgImg.width > 0) activeBgImg = nightBgImg;

    if (activeBgImg.complete && activeBgImg.width > 0) {
        const bgRatio = activeBgImg.height / activeBgImg.width;
        let bgWidth = canvas.width; let bgHeight = canvas.width * bgRatio;
        if (bgHeight < canvas.height) { bgHeight = canvas.height; bgWidth = canvas.height / bgRatio; }

        let parallaxX = -((scrollOffset * 0.1) % bgWidth);
        ctx.drawImage(activeBgImg, parallaxX, 0, bgWidth, bgHeight);
        ctx.drawImage(activeBgImg, parallaxX + bgWidth, 0, bgWidth, bgHeight); 

        // Apply visual themes only if we fall back to the default Day background
        if (theme === 'EVENING' && activeBgImg === bgImg) {
            ctx.fillStyle = 'rgba(255, 100, 0, 0.4)'; // Sunset overlay
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (theme === 'NIGHT' && activeBgImg === bgImg) {
            ctx.fillStyle = 'rgba(0, 5, 40, 0.7)'; // Deep night overlay
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        if(theme === 'NIGHT') ctx.fillStyle = '#0c1445';
        else if (theme === 'EVENING') ctx.fillStyle = '#ff7b54';
        else ctx.fillStyle = '#5C94FC';
        ctx.fillRect(0,0, canvas.width, canvas.height);
    }

    if (gameState === 'PLAYING') {
        player.update(input);
        projectiles.forEach(p => p.update());
        enemies.forEach(e => e.update());
        checkCollisions();
        handleCameraScrolling();

        platforms.forEach(p => p.draw()); goals.forEach(g => g.draw()); hazards.forEach(h => h.draw()); items.forEach(i => i.draw()); enemies.forEach(e => e.draw()); projectiles.forEach(p => p.draw());
        player.draw();
        
        let hearts = '❤️'.repeat(playerLives);
        scoreDisplay.innerText = `Lvl: ${currentLevel} (${theme}) | Lives: ${hearts} | Dist: ${Math.floor(score)}`;
        
    } else if (gameState === 'LEVEL_COMPLETE') {
        platforms.forEach(p => p.draw()); goals.forEach(g => g.draw());
        if (player) player.draw();

        if (Math.random() < 0.05) fireworks.push(new Firework(Math.random() * canvas.width, Math.random() * (canvas.height * 0.6)));
        fireworks.forEach(fw => fw.update());
        fireworks = fireworks.filter(fw => fw.particles.length > 0);
        fireworks.forEach(fw => fw.draw());

    } else {
        if (platforms.length === 0) {
             if (brickPattern) { ctx.fillStyle = brickPattern; ctx.fillRect(0, canvas.height - 100, canvas.width, 200); } 
             else { ctx.fillStyle = '#C84C0C'; ctx.fillRect(0, canvas.height - 100, canvas.width, 200); }
             if (playerImg.complete) ctx.drawImage(playerImg, 100, canvas.height - 148, 48, 48);
        } else {
             platforms.forEach(p => p.draw()); goals.forEach(g => g.draw()); hazards.forEach(h => h.draw());
             if (player) player.draw();
        }
    }
}

animate();
