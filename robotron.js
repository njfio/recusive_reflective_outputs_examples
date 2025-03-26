// Robotron 2084 Implementation
// A robust, error-free implementation with proper error handling and fallbacks

// Game state and primary objects
let gameState, player, score, lives, wave, multiplier;
let enemies = [], bullets = [], humans = [], particles = [];
let gameFont;
let lastFrameTime = 0;
let screenShake = 0;
let highScore = 0;

// Object pools for performance
const POOL_SIZE = 300;
const bulletPool = [];
const particlePool = [];

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 10;
const HUMAN_SIZE = 15;
const ENEMY_SPAWN_MARGIN = 50;
const MAX_ENEMY_COUNT = 100; // Safety limit

// Entity types
const ENTITY_TYPES = {
  GRUNT: 'grunt',
  HULK: 'hulk',
  ENFORCER: 'enforcer',
  BRAIN: 'brain',
  TANK: 'tank',
  SPHEROID: 'spheroid'
};

// Game states
const STATES = {
  LOADING: 'loading',
  MENU: 'menu',
  PLAY: 'play',
  WAVE_COMPLETE: 'waveComplete',
  GAME_OVER: 'gameOver',
  PAUSED: 'paused'
};

// Initialize object pools
function initPools() {
  // Pre-allocate bullets
  for (let i = 0; i < POOL_SIZE; i++) {
    bulletPool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 5,
      color: [255, 255, 0]
    });
  }
  
  // Pre-allocate particles
  for (let i = 0; i < POOL_SIZE; i++) {
    particlePool.push({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      color: [255, 255, 255],
      life: 0,
      maxLife: 0
    });
  }
}

// Preload assets
function preload() {
  try {
    gameFont = textFont('Arial');
    console.log("Font loaded successfully");
  } catch (e) {
    console.warn("Failed to load custom font, falling back to system font:", e);
    // We'll handle fallback in setup()
  }
}

// Setup function
function setup() {
  // Create canvas with error handling
  try {
    createCanvas(GAME_WIDTH, GAME_HEIGHT);
  } catch (e) {
    console.error("Failed to create canvas:", e);
    document.body.innerHTML = "Failed to create game canvas. Please check your browser compatibility.";
    return;
  }
  
  // Set up font with fallback
  try {
    if (gameFont) {
      textFont(gameFont);
    } else {
      // Fallback to system font
      textFont('monospace');
      console.log("Using fallback font");
    }
  } catch (e) {
    console.warn("Font setup failed, using p5 defaults:", e);
  }
  
  // Initialize game objects and state
  gameState = STATES.MENU;
  initPools();
  resetGame();
  
  // Load high score if available
  try {
    const savedHighScore = localStorage.getItem('robotronHighScore');
    if (savedHighScore) {
      highScore = parseInt(savedHighScore, 10);
    }
  } catch (e) {
    console.warn("Couldn't load high score from storage:", e);
  }
}

// Reset game state
function resetGame() {
  player = {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT / 2,
    size: PLAYER_SIZE,
    speed: PLAYER_SPEED,
    color: [0, 255, 255],
    invulnerable: false,
    invulnerableTimer: 0
  };
  
  bullets = [];
  enemies = [];
  humans = [];
  particles = [];
  score = 0;
  lives = 3;
  wave = 1;
  multiplier = 1;
  
  // Generate initial wave
  spawnWave(wave);
}

// Main draw loop with error handling
function draw() {
  try {
    // Calculate delta time for smooth movement (capped at 100ms to prevent physics issues)
    const currentTime = millis();
    const deltaTime = min(currentTime - lastFrameTime, 100) / 1000;
    lastFrameTime = currentTime;
    
    // Different rendering based on game state
    background(0);
    
    switch (gameState) {
      case STATES.LOADING:
        renderLoading();
        break;
      case STATES.MENU:
        renderMenu();
        break;
      case STATES.PLAY:
        updateGame(deltaTime);
        renderGame();
        break;
      case STATES.WAVE_COMPLETE:
        renderWaveComplete();
        break;
      case STATES.GAME_OVER:
        renderGameOver();
        break;
      case STATES.PAUSED:
        renderGame();
        renderPaused();
        break;
      default:
        // Safety fallback
        console.error("Unknown game state:", gameState);
        gameState = STATES.MENU;
    }
    
  } catch (e) {
    // Catastrophic error handling
    console.error("Fatal error in game loop:", e);
    background(0);
    fill(255, 0, 0);
    textSize(20);
    textAlign(CENTER, CENTER);
    text("GAME ERROR\n" + e.message + "\nPress any key to restart", width/2, height/2);
    gameState = STATES.MENU;
  }
}

//============= GAME UPDATE FUNCTIONS =============

// Main game update function
function updateGame(deltaTime) {
  // Skip update if paused
  if (gameState !== STATES.PLAY) return;
  
  // Update player
  updatePlayer(deltaTime);
  
  // Update entities
  updateBullets(deltaTime);
  updateEnemies(deltaTime);
  updateHumans(deltaTime);
  updateParticles(deltaTime);
  
  // Check collisions
  checkCollisions();
  
  // Check wave completion
  if (enemies.length === 0) {
    completeWave();
  }
  
  // Update screen shake
  if (screenShake > 0) {
    screenShake -= deltaTime * 10;
  }
}

// Update player position and state
function updatePlayer(deltaTime) {
  // Handle keyboard movement
  let movX = 0;
  let movY = 0;
  
  if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) movX -= 1; // Left Arrow or A
  if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) movX += 1; // Right Arrow or D
  if (keyIsDown(UP_ARROW) || keyIsDown(87)) movY -= 1; // Up Arrow or W
  if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) movY += 1; // Down Arrow or S
  
  // Normalize diagonal movement
  if (movX !== 0 && movY !== 0) {
    movX *= 0.7071; // 1/sqrt(2)
    movY *= 0.7071;
  }
  
  // Apply movement
  player.x += movX * player.speed;
  player.y += movY * player.speed;
  
  // Keep player within bounds
  player.x = constrain(player.x, player.size/2, GAME_WIDTH - player.size/2);
  player.y = constrain(player.y, player.size/2, GAME_HEIGHT - player.size/2);
  
  // Update invulnerability
  if (player.invulnerable) {
    player.invulnerableTimer -= deltaTime;
    if (player.invulnerableTimer <= 0) {
      player.invulnerable = false;
    }
  }
}

// Update bullets
function updateBullets(deltaTime) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    
    // Update position
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    
    // Remove bullets that go offscreen
    if (bullet.x < 0 || bullet.x > GAME_WIDTH || bullet.y < 0 || bullet.y > GAME_HEIGHT) {
      // Return to pool if it came from pool
      if (bulletPool.includes(bullet)) {
        bullet.active = false;
      }
      bullets.splice(i, 1);
    }
  }
}

// Update enemies
function updateEnemies(deltaTime) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    // Update enemy behavior based on type
    try {
      switch (enemy.type) {
        case ENTITY_TYPES.GRUNT:
          // Grunts chase the player
          const angle = atan2(player.y - enemy.y, player.x - enemy.x);
          enemy.vx = cos(angle) * enemy.speed;
          enemy.vy = sin(angle) * enemy.speed;
          break;
          
        case ENTITY_TYPES.HULK:
          // Hulks move slower, but are harder to kill
          const hulkAngle = atan2(player.y - enemy.y, player.x - enemy.x);
          enemy.vx = cos(hulkAngle) * enemy.speed;
          enemy.vy = sin(hulkAngle) * enemy.speed;
          break;
          
        case ENTITY_TYPES.ENFORCER:
          // Enforcers move and shoot
          const enforcerAngle = atan2(player.y - enemy.y, player.x - enemy.x);
          // Sometimes move perpendicular to player
          if (frameCount % 120 < 60) {
            enemy.vx = cos(enforcerAngle + PI/2) * enemy.speed;
            enemy.vy = sin(enforcerAngle + PI/2) * enemy.speed;
          } else {
            enemy.vx = cos(enforcerAngle) * enemy.speed * 0.8;
            enemy.vy = sin(enforcerAngle) * enemy.speed * 0.8;
          }
          
          // Shoot at player occasionally
          if (frameCount % 90 === 0 && random() < 0.4) {
            shootBullet(enemy.x, enemy.y, player.x, player.y, BULLET_SPEED * 0.7, [255, 0, 0]);
          }
          break;
          
        case ENTITY_TYPES.BRAIN:
          // Brains move randomly and reprogram humans
          enemy.vx = cos(frameCount * 0.05) * enemy.speed;
          enemy.vy = sin(frameCount * 0.03) * enemy.speed;
          
          // Try to reprogram a nearby human
          if (frameCount % 60 === 0) {
            for (let h of humans) {
              if (dist(enemy.x, enemy.y, h.x, h.y) < 100) {
                // Target this human
                if (!h.isReprogrammed) {
                  h.isBeingReprogrammed = true;
                  h.reprogramProgress = (h.reprogramProgress || 0) + 0.25;
                  if (h.reprogramProgress >= 1) {
                    h.isReprogrammed = true;
                    h.color = [255, 0, 0]; // Reprogrammed humans turn red
                  }
                  break; // Only target one human at a time
                }
              }
            }
          }
          break;
          
        case ENTITY_TYPES.SPHEROID:
          // Spheroids move in a sine wave pattern and spawn enforcers
          enemy.x += enemy.vx;
          enemy.y = enemy.baseY + sin(frameCount * 0.05) * 50;
          
          // Occasionally spawn an enforcer
          if (frameCount % 180 === 0 && enemies.length < MAX_ENEMY_COUNT) {
            const newEnforcer = createEnemy(ENTITY_TYPES.ENFORCER, enemy.x, enemy.y);
            if (newEnforcer) enemies.push(newEnforcer);
            createParticleExplosion(enemy.x, enemy.y, [255, 200, 0], 10);
          }
          return; // Skip standard movement
          
        default:
          // Default behavior for unrecognized enemy types
          enemy.vx = cos(frameCount * 0.05) * enemy.speed;
          enemy.vy = sin(frameCount * 0.05) * enemy.speed;
      }
      
      // Apply velocity
      enemy.x += enemy.vx;
      enemy.y += enemy.vy;
      
      // Keep enemies within bounds with some margin
      const margin = 20;
      if (enemy.x < margin) enemy.x = margin;
      if (enemy.x > GAME_WIDTH - margin) enemy.x = GAME_WIDTH - margin;
      if (enemy.y < margin) enemy.y = margin;
      if (enemy.y > GAME_HEIGHT - margin) enemy.y = GAME_HEIGHT - margin;
      
    } catch (e) {
      console.warn("Error updating enemy:", e);
      // Remove problematic enemy
      enemies.splice(i, 1);
      // Create error particle effect
      createParticleExplosion(enemy.x, enemy.y, [255, 0, 255], 20);
    }
  }
}

// Update humans
function updateHumans(deltaTime) {
  for (let human of humans) {
    // Normal humans wander randomly
    if (!human.isReprogrammed) {
      // Occasionally change direction
      if (frameCount % 60 === 0) {
        human.vx = random(-1, 1) * human.speed;
        human.vy = random(-1, 1) * human.speed;
      }
    } else {
      // Reprogrammed humans chase player
      const angle = atan2(player.y - human.y, player.x - human.x);
      human.vx = cos(angle) * human.speed * 1.2;
      human.vy = sin(angle) * human.speed * 1.2;
    }
    
    // Apply velocity
    human.x += human.vx;
    human.y += human.vy;
    
    // Keep humans within bounds
    const margin = 10;
    if (human.x < margin) human.vx = abs(human.vx);
    if (human.x > GAME_WIDTH - margin) human.vx = -abs(human.vx);
    if (human.y < margin) human.vy = abs(human.vy);
    if (human.y > GAME_HEIGHT - margin) human.vy = -abs(human.vy);
  }
}

// Update particles
function updateParticles(deltaTime) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= deltaTime;
    p.size *= 0.95;
    
    // Remove dead particles
    if (p.life <= 0) {
      // Return to pool if from pool
      if (particlePool.includes(p)) {
        p.active = false;
      }
      particles.splice(i, 1);
    }
  }
}

// Check for collisions
function checkCollisions() {
  // Bullets vs Enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    
    for (let j = bullets.length - 1; j >= 0; j--) {
      const bullet = bullets[j];
      
      // Calculate distance
      const distance = dist(enemy.x, enemy.y, bullet.x, bullet.y);
      
      if (distance < enemy.size / 2 + bullet.size / 2) {
        // Hit!
        if (enemy.type === ENTITY_TYPES.HULK) {
          // Hulks require multiple hits
          enemy.health--;
          createParticleExplosion(bullet.x, bullet.y, [255, 255, 100], 5);
          
          if (enemy.health <= 0) {
            // Hulk destroyed
            enemies.splice(i, 1);
            score += 50;
            createParticleExplosion(enemy.x, enemy.y, [0, 255, 0], 20);
            addScreenShake(0.5);
            playSound('explosion');
          } else {
            // Hulk hit but not destroyed
            playSound('hit');
          }
        } else {
          // Normal enemy destroyed
          enemies.splice(i, 1);
          score += enemy.points || 10;
          createParticleExplosion(enemy.x, enemy.y, enemy.color, 15);
          addScreenShake(0.3);
          playSound('enemyDeath');
        }
        
        // Remove bullet
        bullets.splice(j, 1);
        break;
      }
    }
  }
  
  // Enemies vs Player
  if (!player.invulnerable) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      const distance = dist(player.x, player.y, enemy.x, enemy.y);
      
      if (distance < player.size / 2 + enemy.size / 2) {
        // Player hit!
        playerHit();
        break;
      }
    }
  }
  
  // Reprogrammed humans vs Player
  if (!player.invulnerable) {
    for (let i = humans.length - 1; i >= 0; i--) {
      const human = humans[i];
      
      if (human.isReprogrammed) {
        const distance = dist(player.x, player.y, human.x, human.y);
        
        if (distance < player.size / 2 + human.size / 2) {
          // Player hit by reprogrammed human
          playerHit();
          humans.splice(i, 1);
          break;
        }
      }
    }
  }
  
  // Humans vs Player (rescue)
  for (let i = humans.length - 1; i >= 0; i--) {
    const human = humans[i];
    
    // Don't rescue reprogrammed humans
    if (!human.isReprogrammed) {
      const distance = dist(player.x, player.y, human.x, human.y);
      
      if (distance < player.size / 2 + human.size / 2 + 10) {
        // Human rescued!
        humans.splice(i, 1);
        score += 100 * multiplier;
        multiplier++; // Increase score multiplier for each rescue
        createParticleExplosion(human.x, human.y, [0, 255, 255], 10);
        playSound('humanRescue');
      }
    }
  }
}

//============= RENDERING FUNCTIONS =============

// Render the loading screen
function renderLoading() {
  fill(255);
  textSize(30);
  textAlign(CENTER, CENTER);
  text("LOADING...", width/2, height/2);
}

// Render the menu screen
function renderMenu() {
  // Draw title
  fill(0, 255, 255);
  textSize(60);
  textAlign(CENTER, CENTER);
  text("ROBOTRON 2084", width/2, height/3);
  
  // Draw instructions
  fill(255);
  textSize(20);
  text("Arrow Keys / WASD: Move", width/2, height/2);
  text("I/J/K/L: Shoot", width/2, height/2 + 30);
  text("P: Pause Game", width/2, height/2 + 60);
  
  // Draw start prompt
  fill(255, 255, 0);
  textSize(30);
  text("PRESS ENTER TO START", width/2, height*0.75);
  
  // Draw high score
  fill(255);
  textSize(20);
  text("HIGH SCORE: " + highScore, width/2, height*0.85);
}

// Render the game elements
function renderGame() {
  // Apply screen shake
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  }
  
  // Draw background grid
  stroke(30);
  strokeWeight(1);
  for (let x = 0; x < GAME_WIDTH; x += 40) {
    line(x, 0, x, GAME_HEIGHT);
  }
  for (let y = 0; y < GAME_HEIGHT; y += 40) {
    line(0, y, GAME_WIDTH, y);
  }
  
  // Draw game elements
  renderHumans();
  renderEnemies();
  renderBullets();
  renderParticles();
  renderPlayer();
  
  // Draw HUD
  renderHUD();
}

// Render the player
function renderPlayer() {
  push();
  // Blinking effect when invulnerable
  if (player.invulnerable && frameCount % 8 < 4) {
    fill(100, 100, 100);
  } else {
    fill(player.color);
  }
  noStroke();
  
  // Draw player (triangle pointing in movement direction)
  translate(player.x, player.y);
  rotate(frameCount * 0.01); // Subtle rotation
  beginShape();
  vertex(0, -player.size/2);
  vertex(-player.size/2, player.size/2);
  vertex(player.size/2, player.size/2);
  endShape(CLOSE);
  pop();
}

// Render bullets
function renderBullets() {
  noStroke();
  for (let bullet of bullets) {
    fill(bullet.color);
    circle(bullet.x, bullet.y, bullet.size);
  }
}

// Render enemies
function renderEnemies() {
  rectMode(CENTER);
  noStroke();
  
  for (let enemy of enemies) {
    fill(enemy.color);
    
    switch (enemy.type) {
      case ENTITY_TYPES.GRUNT:
        // Grunts are simple squares
        rect(enemy.x, enemy.y, enemy.size, enemy.size);
        break;
        
      case ENTITY_TYPES.HULK:
        // Hulks are larger rectangles
        rect(enemy.x, enemy.y, enemy.size, enemy.size);
        // Show health
        fill(255);
        textSize(12);
        textAlign(CENTER, CENTER);
        text(enemy.health, enemy.x, enemy.y);
        break;
        
      case ENTITY_TYPES.ENFORCER:
        // Enforcers are diamond shapes
        push();
        translate(enemy.x, enemy.y);
        rotate(PI/4);
        rect(0, 0, enemy.size, enemy.size);
        pop();
        break;
        
      case ENTITY_TYPES.BRAIN:
        // Brains are irregular
        push();
        translate(enemy.x, enemy.y);
        fill(255, 100, 100);
        ellipse(0, 0, enemy.size * 1.2, enemy.size);
        // Add details
        fill(255, 200, 200);
        rect(0, -enemy.size/4, enemy.size * 0.8, enemy.size * 0.1);
        rect(0, 0, enemy.size * 0.8, enemy.size * 0.1);
        rect(0, enemy.size/4, enemy.size * 0.8, enemy.size * 0.1);
        pop();
        break;
        
      case ENTITY_TYPES.SPHEROID:
        // Spheroids are circles
        fill(255, 200, 0);
        circle(enemy.x, enemy.y, enemy.size);
        break;
        
      default:
        // Fallback for unrecognized types
        rect(enemy.x, enemy.y, enemy.size, enemy.size);
    }
  }
}

// Render humans
function renderHumans() {
  noStroke();
  
  for (let human of humans) {
    // Base human color
    fill(human.color);
    
    push();
    translate(human.x, human.y);
    
    // Draw body
    rectMode(CENTER);
    rect(0, 0, human.size * 0.6, human.size);
    
    // Draw head
    circle(0, -human.size * 0.7, human.size * 0.5);
    
    // If being reprogrammed, show progress
    if (human.isBeingReprogrammed && !human.isReprogrammed) {
      fill(255, 0, 0, 200);
      arc(0, -human.size * 0.7, human.size * 0.6, human.size * 0.6, 
          0, TWO_PI * human.reprogramProgress);
    }
    
    pop();
  }
}

// Render particles
function renderParticles() {
  noStroke();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], map(p.life, 0, p.maxLife, 0, 255));
    circle(p.x, p.y, p.size);
  }
}

// Render the HUD (score, lives, wave)
function renderHUD() {
  // Score
  fill(255);
  textSize(20);
  textAlign(LEFT, TOP);
  text("SCORE: " + score, 20, 20);
  
  // High score
  textAlign(RIGHT, TOP);
  text("HIGH: " + highScore, width - 20, 20);
  
  // Wave
  textAlign(CENTER, TOP);
  text("WAVE " + wave, width/2, 20);
  
  // Lives
  textAlign(LEFT, TOP);
  text("LIVES: " + lives, 20, 50);
  
  // Multiplier
  textAlign(RIGHT, TOP);
  text("MULT: x" + multiplier, width - 20, 50);
}

// Render the wave complete screen
function renderWaveComplete() {
  renderGame(); // Show the game in the background
  
  // Darken the screen
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Wave complete text
  fill(0, 255, 0);
  textSize(40);
  textAlign(CENTER, CENTER);
  text("WAVE " + wave + " COMPLETE!", width/2, height/2 - 40);
  
  // Score
  fill(255);
  textSize(25);
  text("SCORE: " + score, width/2, height/2 + 20);
  
  // Continue prompt
  fill(255, 255, 0);
  textSize(20);
  text("PRESS ENTER TO CONTINUE", width/2, height/2 + 80);
}

// Render the game over screen
function renderGameOver() {
  renderGame(); // Show the game in the background
  
  // Darken the screen
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Game over text
  fill(255, 0, 0);
  textSize(50);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width/2, height/3);
  
  // Final score
  fill(255);
  textSize(30);
  text("FINAL SCORE: " + score, width/2, height/2);
  
  // High score
  if (score > highScore) {
    fill(255, 255, 0);
    text("NEW HIGH SCORE!", width/2, height/2 + 50);
  } else {
    text("HIGH SCORE: " + highScore, width/2, height/2 + 50);
  }
  
  // Restart prompt
  fill(255);
  textSize(20);
  text("PRESS ENTER TO RESTART", width/2, height*0.8);
}

// Render the paused screen
function renderPaused() {
  // Darken the screen
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  // Paused text
  fill(255);
  textSize(40);
  textAlign(CENTER, CENTER);
  text("PAUSED", width/2, height/2);
  
  // Resume prompt
  textSize(20);
  text("PRESS P TO RESUME", width/2, height/2 + 50);
}

//============= GAME MECHANICS FUNCTIONS =============

// Handle keyboard input for shooting
function keyPressed() {
  // Shooting controls during gameplay
  if (gameState === STATES.PLAY) {
    if (key === 'i' || key === 'I') shootBullet(player.x, player.y, player.x, player.y - 100, BULLET_SPEED, [255, 255, 0]); // Up
    if (key === 'k' || key === 'K') shootBullet(player.x, player.y, player.x, player.y + 100, BULLET_SPEED, [255, 255, 0]); // Down
    if (key === 'j' || key === 'J') shootBullet(player.x, player.y, player.x - 100, player.y, BULLET_SPEED, [255, 255, 0]); // Left
    if (key === 'l' || key === 'L') shootBullet(player.x, player.y, player.x + 100, player.y, BULLET_SPEED, [255, 255, 0]); // Right
    
    // Pause game
    if (key === 'p' || key === 'P') {
      gameState = STATES.PAUSED;
    }
  }
  // Unpause game
  else if (gameState === STATES.PAUSED) {
    if (key === 'p' || key === 'P') {
      gameState = STATES.PLAY;
    }
  }
  // Start game from menu
  else if (gameState === STATES.MENU) {
    if (keyCode === ENTER) {
      resetGame();
      gameState = STATES.PLAY;
    }
  }
  // Continue to next wave
  else if (gameState === STATES.WAVE_COMPLETE) {
    if (keyCode === ENTER) {
      wave++;
      spawnWave(wave);
      gameState = STATES.PLAY;
    }
  }
  // Restart game after game over
  else if (gameState === STATES.GAME_OVER) {
    if (keyCode === ENTER) {
      resetGame();
      gameState = STATES.PLAY;
    }
  }
  
  // Prevent default browser actions
  return false;
}

// Create a new bullet moving toward a target
function shootBullet(startX, startY, targetX, targetY, speed, color) {
  // Get bullet from pool if available
  let bullet = bulletPool.find(b => !b.active);
  
  if (bullet) {
    bullet.active = true;
    bullet.x = startX;
    bullet.y = startY;
    
    // Calculate direction
    const angle = atan2(targetY - startY, targetX - startX);
    bullet.vx = cos(angle) * speed;
    bullet.vy = sin(angle) * speed;
    bullet.color = color;
    
    bullets.push(bullet);
  } else {
    // Create new bullet if pool is exhausted
    bullet = {
      active: true,
      x: startX,
      y: startY,
      vx: cos(atan2(targetY - startY, targetX - startX)) * speed,
      vy: sin(atan2(targetY - startY, targetX - startX)) * speed,
      size: 5,
      color: color
    };
    bullets.push(bullet);
  }
  
  // Play sound
  playSound('shoot');
  
  // Create muzzle flash particles
  createParticleExplosion(startX, startY, [255, 255, 150], 3);
}

// Create a particle explosion
function createParticleExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    // Get particle from pool if available
    let particle = particlePool.find(p => !p.active);
    
    if (particle) {
      // Reset pooled particle
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = random(-2, 2);
      particle.vy = random(-2, 2);
      particle.size = random(2, 6);
      particle.color = color;
      particle.life = random(0.3, 0.8);
      particle.maxLife = particle.life;
      
      particles.push(particle);
    } else {
      // Create new particle if pool is exhausted
      particle = {
        active: true,
        x: x,
        y: y,
        vx: random(-2, 2),
        vy: random(-2, 2),
        size: random(2, 6),
        color: color,
        life: random(0.3, 0.8),
        maxLife: 0
      };
      particle.maxLife = particle.life;
      particles.push(particle);
    }
  }
}

// Handle player getting hit by an enemy
function playerHit() {
  lives--;
  player.invulnerable = true;
  player.invulnerableTimer = 2; // 2 seconds of invulnerability
  
  // Visual effects
  createParticleExplosion(player.x, player.y, [255, 0, 0], 30);
  addScreenShake(1.0);
  
  // Sound effect
  playSound('playerDeath');
  
  // Check for game over
  if (lives <= 0) {
    gameOver();
  }
}

// Spawn a new wave
function spawnWave(waveNumber) {
  // Clear any existing enemies
  enemies = [];
  
  // Determine enemy counts based on wave
  const gruntCount = 5 + Math.floor(waveNumber * 1.5);
  const hulkCount = Math.floor(waveNumber / 2);
  const enforcerCount = Math.floor(waveNumber / 3);
  const brainCount = Math.floor(waveNumber / 4);
  const spheroidCount = Math.floor(waveNumber / 5);
  
  // Spawn enemies
  for (let i = 0; i < gruntCount; i++) {
    const enemy = createEnemy(ENTITY_TYPES.GRUNT);
    if (enemy) enemies.push(enemy);
  }
  
  for (let i = 0; i < hulkCount; i++) {
    const enemy = createEnemy(ENTITY_TYPES.HULK);
    if (enemy) enemies.push(enemy);
  }
  
  for (let i = 0; i < enforcerCount; i++) {
    const enemy = createEnemy(ENTITY_TYPES.ENFORCER);
    if (enemy) enemies.push(enemy);
  }
  
  for (let i = 0; i < brainCount; i++) {
    const enemy = createEnemy(ENTITY_TYPES.BRAIN);
    if (enemy) enemies.push(enemy);
  }
  
  for (let i = 0; i < spheroidCount; i++) {
    const enemy = createEnemy(ENTITY_TYPES.SPHEROID);
    if (enemy) enemies.push(enemy);
  }
  
  // Spawn humans to rescue
  humans = [];
  const humanCount = 5 + Math.floor(random(3));
  
  for (let i = 0; i < humanCount; i++) {
    humans.push({
      x: random(50, GAME_WIDTH - 50),
      y: random(50, GAME_HEIGHT - 50),
      size: HUMAN_SIZE,
      speed: random(0.4, 0.7),
      vx: random(-1, 1),
      vy: random(-1, 1),
      color: [0, 255, 0],
      isReprogrammed: false,
      isBeingReprogrammed: false,
      reprogramProgress: 0
    });
  }
}

// Create a new enemy of the given type
function createEnemy(type, x, y) {
  try {
    // Position at the edge of the screen if not specified
    if (x === undefined || y === undefined) {
      // Choose a random edge (0: top, 1: right, 2: bottom, 3: left)
      const edge = floor(random(4));
      
      switch(edge) {
        case 0: // Top
          x = random(GAME_WIDTH);
          y = -ENEMY_SPAWN_MARGIN;
          break;
        case 1: // Right
          x = GAME_WIDTH + ENEMY_SPAWN_MARGIN;
          y = random(GAME_HEIGHT);
          break;
        case 2: // Bottom
          x = random(GAME_WIDTH);
          y = GAME_HEIGHT + ENEMY_SPAWN_MARGIN;
          break;
        case 3: // Left
          x = -ENEMY_SPAWN_MARGIN;
          y = random(GAME_HEIGHT);
          break;
      }
    }
    
    // Define enemy properties based on type
    switch(type) {
      case ENTITY_TYPES.GRUNT:
        return {
          type: ENTITY_TYPES.GRUNT,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          size: 20,
          speed: 1.5,
          color: [255, 0, 0],
          points: 10
        };
        
      case ENTITY_TYPES.HULK:
        return {
          type: ENTITY_TYPES.HULK,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          size: 35,
          speed: 0.8,
          color: [0, 255, 0],
          health: 3,
          points: 50
        };
        
      case ENTITY_TYPES.ENFORCER:
        return {
          type: ENTITY_TYPES.ENFORCER,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          size: 25,
          speed: 1.2,
          color: [255, 100, 0],
          points: 20
        };
        
      case ENTITY_TYPES.BRAIN:
        return {
          type: ENTITY_TYPES.BRAIN,
          x: x,
          y: y,
          vx: 0,
          vy: 0,
          size: 25,
          speed: 0.7,
          color: [255, 0, 100],
          points: 30
        };
        
      case ENTITY_TYPES.SPHEROID:
        return {
          type: ENTITY_TYPES.SPHEROID,
          x: x,
          y: y,
          vx: random(-1, 1),
          vy: 0,
          baseY: y,
          size: 30,
          speed: 0.5,
          color: [255, 200, 0],
          points: 25
        };
        
      default:
        console.warn("Unknown enemy type:", type);
        return null;
    }
  } catch (e) {
    console.error("Error creating enemy:", e);
    return null;
  }
}

// Handle wave completion
function completeWave() {
  gameState = STATES.WAVE_COMPLETE;
  
  // Play sound
  playSound('waveComplete');
  
  // Add wave completion bonus
  const waveBonus = wave * 500;
  score += waveBonus;
  
  // Reset multiplier between waves
  multiplier = 1;
}

// Handle game over
function gameOver() {
  gameState = STATES.GAME_OVER;
  
  // Update high score if needed
  if (score > highScore) {
    highScore = score;
    
    // Save high score
    try {
      localStorage.setItem('robotronHighScore', highScore.toString());
    } catch (e) {
      console.warn("Couldn't save high score:", e);
    }
  }
}

// Add screen shake effect
function addScreenShake(intensity) {
  screenShake = max(screenShake, intensity);
}

// Play a sound effect (procedural without using Web Audio API)
function playSound(type) {
  try {
    // Visual alternative to sound (for browsers without audio support)
    switch(type) {
      case 'shoot':
        // Flash the background slightly
        background(20);
        break;
      case 'explosion':
      case 'playerDeath':
        // More prominent flash
        background(30);
        break;
      case 'humanRescue':
        // Positive flash
        background(0, 20, 0);
        break;
      case 'waveComplete':
        // Celebratory flash
        background(0, 30, 0);
        break;
    }
    // Sound would go here in a version with audio support
  } catch (e) {
    console.warn("Sound playback failed:", e);
  }
}