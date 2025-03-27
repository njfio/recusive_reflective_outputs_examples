// Cosmic Harmony: A Fish Nebula Roguelike
// All variables explicitly defined at the top for robustness
let player;
let nebula;
let predators = [];
let orbs = [];
let gameState;
let defaultFont;
let currentLevel;
let startTime;
let lastFrameTime;
let frameDelta;
let screenShake;
let particles = [];
let upgrades = [];
let unlockedUpgrades = [];
let deathCount = 0;
let highScore = 0;

// Constants
const MAX_PARTICLES = 400;
const PREDATOR_VIEW_DISTANCE = 200;
const BASE_PLAYER_SPEED = 3.5;
const DASH_SPEED_MULTIPLIER = 2.0;
const DASH_DURATION = 10;
const DASH_COOLDOWN = 45;
const SHIELD_DRAIN = 0.5;
const PULSE_COST = 20;
const PULSE_RANGE = 150;
const ORB_VALUE = 10;
const MAX_PREDATORS = 12;

// Game parameters
let playerSpeed;
let pulseCooldown;
let dashActive;
let dashCooldown;
let shieldActive;
let playerEnergy;
let playerMaxEnergy;  
let seedValue;

// Preload function to load font with fallback


// Setup function initializes the game
function setup() {
  try {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 1);
    textAlign(CENTER, CENTER);
    
    // Set font
    if (defaultFont) {
      textFont(defaultFont);
    } else {
      textFont('sans-serif');
    }
    
    // Initialize game state
    gameState = "start";
    screenShake = 0;
    
    // Define available upgrades
    upgrades = [
      { id: "energyCapacity", name: "Energy Capacity +20", description: "Increase max energy", cost: 3, effect: () => { playerMaxEnergy += 20; } },
      { id: "dashPower", name: "Enhanced Dash", description: "Dash further and faster", cost: 5, effect: () => { DASH_SPEED_MULTIPLIER = 2.5; } },
      { id: "pulseRange", name: "Pulse Range +50", description: "Increases energy pulse range", cost: 4, effect: () => { PULSE_RANGE += 50; } },
      { id: "regeneration", name: "Energy Regen", description: "Slowly regenerate energy", cost: 6, acquired: false, effect: () => { } },
      { id: "shieldEfficiency", name: "Shield Efficiency", description: "Shield uses less energy", cost: 5, effect: () => { SHIELD_DRAIN = 0.25; } }
    ];
    
    // Initialize the game
    initializeGame();
  } catch (e) {
    console.error("Setup error:", e);
    displayErrorScreen("Failed to initialize game. Please refresh the page.");
  }
}

// Initialize or reset the game
function initializeGame() {
  try {
    // Generate a random seed for procedural generation
    seedValue = floor(random(10000));
    noiseSeed(seedValue);
    
    // Reset game parameters
    currentLevel = 1;
    playerEnergy = 100;
    playerMaxEnergy = 100;
    playerSpeed = BASE_PLAYER_SPEED;
    pulseCooldown = 0;
    dashActive = false;
    dashCooldown = 0;
    shieldActive = false;
    startTime = millis();
    lastFrameTime = millis();
    
    // Initialize player in center of screen
    player = {
      position: createVector(width/2, height/2),
      velocity: createVector(0, 0),
      size: 20,
      color: color(200, 90, 95),
      trail: [],
      maxTrail: 15
    };
    
    // Initialize nebula
    initializeNebula();
    
    // Initialize level content
    initializeLevel();
    
  } catch (e) {
    console.error("Game initialization error:", e);
    displayErrorScreen("Failed to initialize game data. Please try again.");
  }
}

// Initialize the nebula particle system
function initializeNebula() {
  nebula = {
    particles: [],
    cores: [],
    baseColor: color(random(180, 260), 70, 90),
    accentColor: color(random(0, 60), 80, 95)
  };
  
  // Create nebula particles
  for (let i = 0; i < MAX_PARTICLES; i++) {
    nebula.particles.push({
      position: createVector(random(width), random(height)),
      velocity: createVector(0, 0),
      acceleration: createVector(0, 0),
      size: random(1, 4),
      alpha: random(0.3, 0.8),
      hue: random(-20, 20)
    });
  }
  
  // Create nebula core points that influence particle movement
  for (let i = 0; i < 5; i++) {
    nebula.cores.push({
      position: createVector(random(width), random(height)),
      strength: random(0.1, 0.5),
      polarity: random() > 0.5 ? 1 : -1,
      radius: random(100, 200)
    });
  }
}

// Initialize a new level
function initializeLevel() {
  // Clear arrays
  predators = [];
  orbs = [];
  particles = [];
  
  // Spawn predators based on level
  let predatorCount = min(currentLevel + 2, MAX_PREDATORS);
  for (let i = 0; i < predatorCount; i++) {
    spawnPredator();
  }
  
  // Spawn orbs (more on higher levels)
  let orbCount = currentLevel + 5;
  for (let i = 0; i < orbCount; i++) {
    spawnOrb();
  }
}

// Spawn a predator away from the player
function spawnPredator() {
  let pos;
  let tooClose = true;
  let attempts = 0;
  
  // Find a position not too close to the player
  while (tooClose && attempts < 20) {
    pos = createVector(random(width), random(height));
    let d = dist(pos.x, pos.y, player.position.x, player.position.y);
    if (d > 250) tooClose = false;
    attempts++;
  }
  
  // Determine predator type based on level
  let typeRoll = random();
  let type;
  if (currentLevel >= 5 && typeRoll < 0.3) {
    type = "hunter"; // Fast, aggressive predator
  } else if (currentLevel >= 3 && typeRoll < 0.6) {
    type = "lurker"; // Camouflaged ambush predator
  } else {
    type = "drifter"; // Basic slow predator
  }
  
  // Create the predator
  let predator = {
    position: pos,
    velocity: createVector(random(-1, 1), random(-1, 1)).normalize().mult(random(0.5, 1.0)),
    size: type === "lurker" ? 15 : type === "hunter" ? 22 : 25,
    color: type === "lurker" ? color(210, 30, 40) : 
           type === "hunter" ? color(350, 80, 80) : 
           color(280, 70, 60),
    type: type,
    health: 100,
    state: "wander",
    lastStateChange: millis(),
    patrolTarget: createVector(random(width), random(height))
  };
  
  predators.push(predator);
}

// Spawn an energy orb away from predators
function spawnOrb() {
  let pos;
  let tooClose = true;
  let attempts = 0;
  
  while (tooClose && attempts < 20) {
    pos = createVector(random(width), random(height));
    tooClose = false;
    
    // Check distance from predators
    for (let predator of predators) {
      if (dist(pos.x, pos.y, predator.position.x, predator.position.y) < 100) {
        tooClose = true;
        break;
      }
    }
    attempts++;
  }
  
  // Create the orb with pulsing animation
  orbs.push({
    position: pos,
    size: 15,
    collected: false,
    pulsePhase: random(TWO_PI),
    value: ORB_VALUE + floor(random(-2, 3))
  });
}

// Main draw loop
function draw() {
  try {
    frameDelta = (millis() - lastFrameTime) / 16; // Normalize to ~60fps
    lastFrameTime = millis();
    
    // Cap frameDelta to prevent huge jumps after tab inactivity
    frameDelta = min(frameDelta, 3);
    
    // Handle different game states
    switch (gameState) {
      case "start":
        drawStartScreen();
        break;
      case "playing":
        updateGame();
        drawGame();
        break;
      case "gameover":
        drawGameOverScreen();
        break;
      case "upgrade":
        drawUpgradeScreen();
        break;
      default:
        drawErrorScreen("Invalid game state");
    }
    
  } catch (e) {
    console.error("Runtime error:", e);
    displayErrorScreen("An error occurred during gameplay. Press SPACE to restart.");
    
    // Reset game if space is pressed
    if (keyIsDown(32)) {
      initializeGame();
      gameState = "start";
    }
  }
}

// Update game logic
function updateGame() {
  // Apply screen shake effect
  if (screenShake > 0) {
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    screenShake -= 0.2 * frameDelta;
    if (screenShake < 0) screenShake = 0;
  }
  
  // Update player movement
  updatePlayerMovement();
  
  // Update dash state
  if (dashActive) {
    dashActive = false;
    player.velocity.mult(0.9);
  }
  
  // Update dash cooldown
  if (dashCooldown > 0) {
    dashCooldown -= frameDelta;
  }
  
  // Update pulse cooldown
  if (pulseCooldown > 0) {
    pulseCooldown -= frameDelta;
  }
  
  // Energy regeneration (if upgrade acquired)
  if (hasUpgrade("regeneration") && !shieldActive && playerEnergy < playerMaxEnergy) {
    playerEnergy = min(playerMaxEnergy, playerEnergy + 0.05 * frameDelta);
  }
  
  // Update player trail
  player.trail.unshift({
    position: player.position.copy(),
    size: player.size * 0.7
  });
  
  if (player.trail.length > player.maxTrail) {
    player.trail.pop();
  }
  
  // Update nebula
  updateNebula();
  
  // Update predators
  updatePredators();
  
  // Check orb collection
  checkOrbCollection();
  
  // Update particles
  updateParticles();
  
  // Shield drains energy
  if (shieldActive) {
    playerEnergy -= SHIELD_DRAIN * frameDelta;
    if (playerEnergy <= 0) {
      shieldActive = false;
      playerEnergy = 0;
    }
  }
  
  // Check level completion
  if (orbs.length === 0 || orbs.every(orb => orb.collected)) {
    currentLevel++;
    initializeLevel();
  }
}

// Update player movement based on input
function updatePlayerMovement() {
  // Start with no acceleration
  let acceleration = createVector(0, 0);
  
  // Check keyboard input
  if (keyIsDown(65) || keyIsDown(LEFT_ARROW)) acceleration.x -= 1;
  if (keyIsDown(68) || keyIsDown(RIGHT_ARROW)) acceleration.x += 1;
  if (keyIsDown(87) || keyIsDown(UP_ARROW)) acceleration.y -= 1;
  if (keyIsDown(83) || keyIsDown(DOWN_ARROW)) acceleration.y += 1;
  
  // If there's input, normalize and apply it
  if (acceleration.magSq() > 0) {
    acceleration.normalize();
    
    // Apply dash if active
    let speed = dashActive ? playerSpeed * DASH_SPEED_MULTIPLIER : playerSpeed;
    acceleration.mult(0.3 * speed * frameDelta);
    
    player.velocity.add(acceleration);
    
    // Limit maximum speed
    let maxSpeed = dashActive ? playerSpeed * DASH_SPEED_MULTIPLIER : playerSpeed;
    if (player.velocity.magSq() > maxSpeed * maxSpeed) {
      player.velocity.normalize();
      player.velocity.mult(maxSpeed);
    }
  } else {
    // Apply drag/friction when no input
    player.velocity.mult(0.9);
  }
  
  // Update position
  player.position.add(p5.Vector.mult(player.velocity, frameDelta));
  
  // Screen wrapping
  if (player.position.x < 0) player.position.x = width;
  if (player.position.x > width) player.position.x = 0;
  if (player.position.y < 0) player.position.y = height;
  if (player.position.y > height) player.position.y = 0;
}

// Update nebula particle system
function updateNebula() {
  // Player influence on nebula
  let playerInfluence = {
    position: player.position.copy(),
    strength: 0.05,
    radius: player.size * 8
  };
  
  // Special effect during dash
  if (dashActive) {
    playerInfluence.strength = 0.15;
    playerInfluence.radius *= 1.5;
  }
  
  // Update each nebula particle
  nebula.particles.forEach(particle => {
    // Reset acceleration
    particle.acceleration = createVector(0, 0);
    
    // Apply force from nebula cores
    nebula.cores.forEach(core => {
      let force = calculateForce(particle.position, core.position, core.strength, core.polarity, core.radius);
      particle.acceleration.add(force);
    });
    
    // Apply force from player
    let force = calculateForce(particle.position, playerInfluence.position, 
                               playerInfluence.strength, 1, playerInfluence.radius);
    particle.acceleration.add(force);
    
    // Update velocity and position
    particle.velocity.add(particle.acceleration);
    particle.velocity.mult(0.98); // Damping
    particle.position.add(p5.Vector.mult(particle.velocity, frameDelta));
    
    // Screen wrapping
    if (particle.position.x < 0) particle.position.x = width;
    if (particle.position.x > width) particle.position.x = 0;
    if (particle.position.y < 0) particle.position.y = height;
    if (particle.position.y > height) particle.position.y = 0;
  });
}

// Calculate force between two objects
function calculateForce(pos1, pos2, strength, polarity, radius) {
  let direction = p5.Vector.sub(pos2, pos1);
  let distance = direction.mag();
  
  if (distance < 1) distance = 1;
  if (distance > radius) return createVector(0, 0);
  
  let forceMagnitude = strength * (1 - distance/radius) * polarity;
  direction.normalize();
  direction.mult(forceMagnitude);
  
  return direction;
}

// Update predator behavior
function updatePredators() {
  predators.forEach((predator, index) => {
    // Skip update if predator is too far from player (optimization)
    if (dist(predator.position.x, predator.position.y, player.position.x, player.position.y) > width * 0.7) {
      // Simple physics update
      predator.position.add(p5.Vector.mult(predator.velocity, frameDelta * 0.5));
      return;
    }
    
    // Reset acceleration
    let acceleration = createVector(0, 0);
    
    // Different behavior based on predator type
    switch(predator.type) {
      case "hunter": 
        // Aggressively chase player if detected
        if (canDetectPlayer(predator)) {
          predator.state = "chase";
          let direction = p5.Vector.sub(player.position, predator.position);
          direction.normalize();
          direction.mult(0.15);
          acceleration.add(direction);
        } else {
          // Patrol if player not detected
          patrolBehavior(predator, acceleration);
        }
        break;
        
      case "lurker":
        // Ambush player if very close
        let distToPlayer = dist(predator.position.x, predator.position.y, player.position.x, player.position.y);
        if (distToPlayer < 80 && canDetectPlayer(predator)) {
          predator.state = "ambush";
          let direction = p5.Vector.sub(player.position, predator.position);
          direction.normalize();
          direction.mult(0.4);
          acceleration = direction;
        } else if (predator.state === "ambush" && distToPlayer < 150) {
          // Continue ambush
          let direction = p5.Vector.sub(player.position, predator.position);
          direction.normalize();
          direction.mult(0.3);
          acceleration = direction;
        } else {
          // Otherwise drift slowly and camouflage
          predator.state = "lurk";
          let wander = createVector(random(-1, 1), random(-1, 1));
          wander.normalize();
          wander.mult(0.01);
          acceleration.add(wander);
        }
        break;
        
      case "drifter":
      default:
        // Slow, wandering behavior
        patrolBehavior(predator, acceleration);
        break;
    }
    
    // Apply acceleration
    predator.velocity.add(p5.Vector.mult(acceleration, frameDelta));
    
    // Limit speed based on type
    let maxSpeed = predator.type === "hunter" ? 2.5 : 
                   predator.type === "lurker" && predator.state === "ambush" ? 4 : 1.2;
    
    if (predator.velocity.magSq() > maxSpeed * maxSpeed) {
      predator.velocity.normalize();
      predator.velocity.mult(maxSpeed);
    }
    
    // Update position
    predator.position.add(p5.Vector.mult(predator.velocity, frameDelta));
    
    // Screen wrapping
    if (predator.position.x < 0) predator.position.x = width;
    if (predator.position.x > width) predator.position.x = 0;
    if (predator.position.y < 0) predator.position.y = height;
    if (predator.position.y > height) predator.position.y = 0;
    
    // Check collision with player
    if (dist(predator.position.x, predator.position.y, player.position.x, player.position.y) < 
        (predator.size + player.size) * 0.5) {
      // If shield is active, repel the predator
      if (shieldActive) {
        let repel = p5.Vector.sub(predator.position, player.position);
        repel.normalize();
        repel.mult(5);
        predator.velocity = repel;
        
        // Create particles for collision effect
        createParticleExplosion(
          p5.Vector.add(player.position, p5.Vector.mult(repel, player.size)),
          10, color(200, 90, 95), 3
        );
      } else {
        // Player takes damage
        playerEnergy -= 20;
        screenShake = 10;
        
        // Create particles for damage effect
        createParticleExplosion(player.position, 20, color(0, 100, 100), 3);
        
        // Repel player from predator
        let knockback = p5.Vector.sub(player.position, predator.position);
        knockback.normalize();
        knockback.mult(3);
        player.velocity = knockback;
        
        // Check for game over
        if (playerEnergy <= 0) {
          gameOver();
        }
      }
    }
  });
}

// Patrol behavior for predators
function patrolBehavior(predator, acceleration) {
  // Check if we need a new patrol target
  if (dist(predator.position.x, predator.position.y, predator.patrolTarget.x, predator.patrolTarget.y) < 50 ||
      millis() - predator.lastStateChange > 10000) {
    predator.patrolTarget = createVector(random(width), random(height));
    predator.lastStateChange = millis();
  }
  
  // Move toward patrol target
  let direction = p5.Vector.sub(predator.patrolTarget, predator.position);
  direction.normalize();
  direction.mult(0.03);
  acceleration.add(direction);
  
  // Add some randomness
  let wander = createVector(random(-1, 1), random(-1, 1));
  wander.normalize();
  wander.mult(0.02);
  acceleration.add(wander);
}

// Check if predator can detect player
function canDetectPlayer(predator) {
  // Base detection distance
  let detectionDist = predator.type === "hunter" ? PREDATOR_VIEW_DISTANCE * 1.2 : PREDATOR_VIEW_DISTANCE;
  
  // Reduce detection when player is shielded
  if (shieldActive) {
    detectionDist *= 0.5;
  }
  
  return dist(predator.position.x, predator.position.y, player.position.x, player.position.y) < detectionDist;
}

// Check for orb collection
function checkOrbCollection() {
  for (let i = orbs.length - 1; i >= 0; i--) {
    if (!orbs[i].collected && dist(player.position.x, player.position.y, 
                                 orbs[i].position.x, orbs[i].position.y) < 
                                 (player.size + orbs[i].size) * 0.6) {
      // Collect the orb
      orbs[i].collected = true;
      playerEnergy = min(playerMaxEnergy, playerEnergy + orbs[i].value);
      
      // Create particle effect
      createParticleExplosion(orbs[i].position, 15, color(60, 100, 100), 2);
      
      // Remove collected orb
      orbs.splice(i, 1);
    }
  }
}

// Create a particle explosion effect
function createParticleExplosion(position, count, color, speed) {
  for (let i = 0; i < count; i++) {
    let angle = random(TWO_PI);
    let velocity = createVector(cos(angle), sin(angle));
    velocity.mult(random(0.5, speed));
    
    particles.push({
      position: position.copy(),
      velocity: velocity,
      size: random(2, 6),
      color: color,
      alpha: 1,
      lifetime: 30
    });
  }
}

// Update particles
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    // Update position
    particles[i].position.add(p5.Vector.mult(particles[i].velocity, frameDelta));
    
    // Update alpha
    particles[i].alpha -= 0.02 * frameDelta;
    
    // Update lifetime
    particles[i].lifetime -= frameDelta;
    
    // Remove dead particles
    if (particles[i].alpha <= 0 || particles[i].lifetime <= 0) {
      particles.splice(i, 1);
    }
  }
}

// Draw the game world
function drawGame() {
  // Background
  background(230, 30, 10);
  
  // Draw nebula
  drawNebula();
  
  // Draw orbs
  drawOrbs();
  
  // Draw player
  drawPlayer();
  
  // Draw predators
  drawPredators();
  
  // Draw particles
  drawParticles();
  
  // Draw HUD
  drawHUD();
}

// Draw nebula particle system
function drawNebula() {
  noStroke();
  
  nebula.particles.forEach(particle => {
    // Get distance to player for glow effect
    let distToPlayer = dist(particle.position.x, particle.position.y, player.position.x, player.position.y);
    let glow = map(distToPlayer, 0, 300, 0.5, 0);
    glow = constrain(glow, 0, 0.5);
    
    // Set color based on base nebula color with particle's hue variation
    let c = color(hue(nebula.baseColor) + particle.hue, 
                saturation(nebula.baseColor), 
                brightness(nebula.baseColor));
    
    // Apply glow and alpha
    fill(c, (particle.alpha + glow) * 255);
    
    // Draw particle
    circle(particle.position.x, particle.position.y, particle.size);
  });
}

// Draw energy orbs
function drawOrbs() {
  orbs.forEach(orb => {
    if (!orb.collected) {
      // Pulsing effect
      orb.pulsePhase += 0.05 * frameDelta;
      let pulseFactor = 0.2 * sin(orb.pulsePhase) + 1;
      
      // Outer glow
      noStroke();
      for (let i = 3; i > 0; i--) {
        let alpha = map(i, 3, 0, 50, 200);
        fill(60, 100, 100, alpha/255);
        circle(orb.position.x, orb.position.y, orb.size * pulseFactor * (1 + i * 0.4));
      }
      
      // Inner core
      fill(60, 100, 100);
      circle(orb.position.x, orb.position.y, orb.size * pulseFactor);
    }
  });
}

// Draw the player fish
function drawPlayer() {
  noStroke();
  
  // Draw trail
  for (let i = player.trail.length - 1; i >= 0; i--) {
    let t = player.trail[i];
    let alpha = map(i, 0, player.trail.length - 1, 0, 0.7);
    
    let c = color(hue(player.color), saturation(player.color), brightness(player.color));
    fill(c, alpha * 255);
    
    circle(t.position.x, t.position.y, t.size * (i / player.trail.length));
  }
  
  // Draw shield if active
  if (shieldActive) {
    noFill();
    stroke(210, 80, 90, 150);
    strokeWeight(3);
    circle(player.position.x, player.position.y, player.size * 2.2);
    strokeWeight(1);
  }
  
  // Calculate direction for fish rendering
  let direction = 0;
  if (player.velocity.magSq() > 0.1) {
    direction = player.velocity.heading();
  }
  
  // Draw fish body
  push();
  translate(player.position.x, player.position.y);
  rotate(direction + PI/2);
  
  // Body
  noStroke();
  fill(player.color);
  ellipse(0, 0, player.size, player.size * 1.5);
  
  // Tail
  let tailWag = sin(frameCount * 0.2) * 0.3;
  fill(hue(player.color), saturation(player.color), brightness(player.color) * 0.8);
  triangle(0, player.size * 0.7, 
           -player.size * 0.4, player.size * (1.1 + tailWag), 
           player.size * 0.4, player.size * (1.1 - tailWag));
  
  // Eyes
  fill(255);
  ellipse(-player.size * 0.25, -player.size * 0.3, player.size * 0.2);
  ellipse(player.size * 0.25, -player.size * 0.3, player.size * 0.2);
  
  fill(0);
  ellipse(-player.size * 0.25, -player.size * 0.3, player.size * 0.1);
  ellipse(player.size * 0.25, -player.size * 0.3, player.size * 0.1);
  
  // Fins
  fill(hue(player.color), saturation(player.color) * 0.8, brightness(player.color));
  ellipse(-player.size * 0.5, 0, player.size * 0.4, player.size * 0.2);
  ellipse(player.size * 0.5, 0, player.size * 0.4, player.size * 0.2);
  
  pop();
}

// Draw predators
function drawPredators() {
  predators.forEach(predator => {
    // Get distance to player
    let distToPlayer = dist(predator.position.x, predator.position.y, player.position.x, player.position.y);
    
    // Direction for predator rendering
    let direction = 0;
    if (predator.velocity.magSq() > 0.1) {
      direction = predator.velocity.heading();
    }
    
    push();
    translate(predator.position.x, predator.position.y);
    rotate(direction + PI/2);
    
    // Different rendering based on predator type
    switch(predator.type) {
      case "hunter":
        // Red aggressive predator
        noStroke();
        fill(350, 80, 80);
        ellipse(0, 0, predator.size, predator.size * 1.2);
        
        // Spiky fins
        beginShape();
        for(let i = 0; i < 5; i++) {
          let angle = map(i, 0, 5, -PI/4, PI/4);
          let r1 = predator.size * 0.6;
          let r2 = predator.size * 0.3;
          vertex(cos(angle) * r1, sin(angle) * r1 - predator.size * 0.3);
          vertex(cos(angle + PI/10) * r2, sin(angle + PI/10) * r2 - predator.size * 0.5);
        }
        endShape(CLOSE);
        
        // Eyes
        fill(0);
        ellipse(-predator.size * 0.2, -predator.size * 0.2, predator.size * 0.15);
        ellipse(predator.size * 0.2, -predator.size * 0.2, predator.size * 0.15);
        
        // Teeth
        fill(0, 0, 100);
        triangle(-predator.size * 0.15, predator.size * 0.2, 
                0, predator.size * 0.4, 
                predator.size * 0.15, predator.size * 0.2);
        break;
        
      case "lurker":
        // Semi-transparent camouflaged predator
        noStroke();
        
        // More visible when in ambush mode or close to player
        let alpha = predator.state === "ambush" ? 255 : 
                   map(distToPlayer, 0, 200, 200, 50);
        
        // Body
        fill(210, 30, 40, alpha);
        ellipse(0, 0, predator.size, predator.size * 1.4);
        
        // Tentacles
        for(let i = 0; i < 6; i++) {
          let angle = map(i, 0, 6, 0, TWO_PI);
          let curveAmp = sin(frameCount * 0.1 + i) * 10;
          
          push();
          rotate(angle);
          beginShape();
          for(let j = 0; j < 5; j++) {
            let x = map(j, 0, 4, 0, predator.size);
            let y = sin(j * 0.5 + frameCount * 0.05) * curveAmp;
            vertex(x, y);
          }
          endShape();
          pop();
        }
        
        // Eye (only visible when in ambush or close)
        if (predator.state === "ambush" || distToPlayer < 100) {
          fill(120, 100, 100, alpha);
          ellipse(0, -predator.size * 0.2, predator.size * 0.3, predator.size * 0.1);
        }
        break;
        
      case "drifter":
      default:
        // Basic jellyfish-like predator
        noStroke();
        fill(280, 70, 60);
        ellipse(0, 0, predator.size, predator.size);
        
        // Tentacles
        for(let i = 0; i < 8; i++) {
          let angle = map(i, 0, 8, 0, TWO_PI);
          let length = predator.size * 0.8;
          stroke(280, 70, 60);
          strokeWeight(3);
          line(0, 0, 
              cos(angle) * length, 
              sin(angle) * length);
        }
        
        // Center
        noStroke();
        fill(280, 40, 80);
        ellipse(0, 0, predator.size * 0.6, predator.size * 0.6);
        break;
    }
    
    pop();
  });
}

// Draw particles
function drawParticles() {
  noStroke();
  particles.forEach(particle => {
    fill(hue(particle.color), saturation(particle.color), brightness(particle.color), particle.alpha * 255);
    circle(particle.position.x, particle.position.y, particle.size);
  });
}

// Draw HUD (Heads-Up Display)
function drawHUD() {
  // Energy bar
  noStroke();
  
  // Background
  fill(0, 0, 20, 150);
  rect(20, 20, 200, 25, 5);
  
  // Energy level
  let energyRatio = playerEnergy / playerMaxEnergy;
  fill(map(energyRatio, 0, 1, 0, 120), 100, 90);
  rect(20, 20, 200 * energyRatio, 25, 5);
  
  // Energy text
  fill(0, 0, 100);
  noStroke();
  textSize(16);
  textAlign(CENTER, CENTER);
  text(`Energy: ${floor(playerEnergy)}/${playerMaxEnergy}`, 120, 32);
  
  // Level indicator
  fill(0, 0, 20, 150);
  rect(width - 120, 20, 100, 25, 5);
  
  fill(0, 0, 100);
  text(`Level: ${currentLevel}`, width - 70, 32);
  
  // Cooldown indicators
  if (dashCooldown > 0) {
    fill(0, 0, 20, 150);
    rect(20, 55, 100, 25, 5);
    
    let cooldownRatio = dashCooldown / DASH_COOLDOWN;
    fill(200, 100, 70, 150);
    rect(20, 55, 100 * (1 - cooldownRatio), 25, 5);
    
    fill(0, 0, 100);
    text("Dash", 70, 67);
  }
  
  if (pulseCooldown > 0) {
    fill(0, 0, 20, 150);
    rect(130, 55, 100, 25, 5);
    
    let cooldownRatio = pulseCooldown / 60;
    fill(60, 100, 70, 150);
    rect(130, 55, 100 * (1 - cooldownRatio), 25, 5);
    
    fill(0, 0, 100);
    text("Pulse", 180, 67);
  }
  
  // Controls reminder
  textSize(14);
  fill(0, 0, 100, 100);
  text("WASD/Arrows: Move | SPACE: Dash | SHIFT: Shield | E: Energy Pulse", width/2, height - 20);
}

// Draw start screen
function drawStartScreen() {
  background(230, 30, 5);
  
  // Simplified nebula effect in background
  for (let i = 0; i < 200; i++) {
    let x = random(width);
    let y = random(height);
    let size = random(1, 4);
    
    noStroke();
    fill(random(180, 260), 70, 90, random(50, 150));
    circle(x, y, size);
  }
  
  // Title
  textSize(48);
  fill(200, 90, 95);
  textAlign(CENTER, CENTER);
  text("COSMIC HARMONY", width/2, height/3 - 40);
  
  // Subtitle
  textSize(24);
  fill(200, 70, 95);
  text("A Nebula Fish Roguelike", width/2, height/3 + 20);
  
  // Instructions
  textSize(20);
  fill(0, 0, 100);
  text("Navigate the cosmic depths", width/2, height/2);
  text("Collect energy orbs and avoid predators", width/2, height/2 + 30);
  
  // Game stats if not first time
  if (deathCount > 0) {
    textSize(18);
    fill(60, 80, 90);
    text(`Highest Level: ${highScore}`, width/2, height/2 + 80);
    text(`Deaths: ${deathCount}`, width/2, height/2 + 110);
  }
  
  // Start prompt
  textSize(24);
  fill(0, 0, 100);
  text("Press SPACE to Begin", width/2, height * 3/4);
  
  // Check for start input
  if (keyIsDown(32)) { // Space
    gameState = "playing";
  }
}

// Draw game over screen
function drawGameOverScreen() {
  // Semi-transparent overlay
  fill(230, 80, 5, 200);
  rect(0, 0, width, height);
  
  // Game over text
  textSize(48);
  fill(0, 80, 100);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width/2, height/3);
  
  // Stats
  textSize(24);
  fill(0, 0, 100);
  text(`You reached Level ${currentLevel}`, width/2, height/2);
  
  // High score
  if (currentLevel > highScore) {
    highScore = currentLevel;
    textSize(28);
    fill(60, 100, 90);
    text("New High Score!", width/2, height/2 + 40);
  }
  
  // Upgrade prompt
  textSize(24);
  fill(0, 0, 100);
  text("Press SPACE to Continue", width/2, height * 2/3);
  
  // Check for input
  if (keyIsDown(32)) { // Space
    gameState = "upgrade";
  }
}

// Draw upgrade screen
function drawUpgradeScreen() {
  background(230, 30, 5);
  
  // Title
  textSize(36);
  fill(60, 100, 90);
  textAlign(CENTER, CENTER);
  text("COSMIC UPGRADES", width/2, height/5);
  
  // Death counter
  textSize(20);
  fill(0, 0, 100);
  text(`Deaths: ${deathCount}`, width/2, height/5 + 40);
  
  // Available upgrades
  let availableUpgrades = upgrades.filter(u => !hasUpgrade(u.id));
  let upgradeCount = min(availableUpgrades.length, 3);
  
  if (upgradeCount > 0) {
    textSize(24);
    fill(0, 0, 100);
    text("Choose an Upgrade:", width/2, height/3);
    
    // Display upgrade options
    for (let i = 0; i < upgradeCount; i++) {
      let u = availableUpgrades[i];
      let y = height/2 + i * 80;
      
      // Background
      noStroke();
      fill(200, 40, 30, 150);
      rect(width/2 - 200, y - 30, 400, 60, 10);
      
      // Name and description
      textSize(20);
      fill(0, 0, 100);
      text(u.name, width/2, y - 15);
      
      textSize(16);
      fill(0, 0, 90);
      text(u.description, width/2, y + 15);
      
      // Number key hint
      textSize(24);
      fill(60, 100, 90);
      text(`[${i+1}]`, width/2 - 230, y);
    }
  } else {
    textSize(24);
    fill(0, 0, 100);
    text("No more upgrades available!", width/2, height/2);
  }
  
  // Restart prompt
  textSize(24);
  fill(0, 0, 100);
  text("Press SPACE to Begin New Run", width/2, height * 4/5);
  
  // Handle upgrade selection
  if (keyIsDown(49) && upgradeCount >= 1) { // 1 key
    selectUpgrade(availableUpgrades[0].id);
  } else if (keyIsDown(50) && upgradeCount >= 2) { // 2 key
    selectUpgrade(availableUpgrades[1].id);
  } else if (keyIsDown(51) && upgradeCount >= 3) { // 3 key
    selectUpgrade(availableUpgrades[2].id);
  }
  
  // Restart game
  if (keyIsDown(32)) { // Space
    initializeGame();
    gameState = "playing";
  }
}

// Select an upgrade
function selectUpgrade(upgradeId) {
  // Find the upgrade
  let upgrade = upgrades.find(u => u.id === upgradeId);
  
  if (upgrade) {
    // Add to unlocked upgrades
    unlockedUpgrades.push(upgradeId);
    
    // Apply upgrade effect
    upgrade.effect();
  }
}

// Check if player has a specific upgrade
function hasUpgrade(upgradeId) {
  return unlockedUpgrades.includes(upgradeId);
}

// Handle key presses
function keyPressed() {
  // Dash ability
  if (keyCode === 32 && gameState === "playing") { // Space
    if (dashCooldown <= 0 && playerEnergy >= 20) {
      dashActive = true;
      dashCooldown = DASH_COOLDOWN;
      playerEnergy -= 20;
    }
    return false; // Prevent default space behavior
  }
  
  // Shield ability
  if (keyCode === 16 && gameState === "playing") { // Shift
    if (playerEnergy > 0) {
      shieldActive = true;
    }
    return false; // Prevent default shift behavior
  }
  
  // Energy pulse ability
  if ((keyCode === 69 || keyCode === 101) && gameState === "playing") { // E key
    if (pulseCooldown <= 0 && playerEnergy >= PULSE_COST) {
      // Create pulse effect
      createEnergyPulse();
      pulseCooldown = 60;
      playerEnergy -= PULSE_COST;
    }
  }
}

// Handle key releases
function keyReleased() {
  if (keyCode === 16) { // Shift
    shieldActive = false;
  }
}

// Create energy pulse effect
function createEnergyPulse() {
  // Visual effect
  for (let i = 0; i < 360; i += 10) {
    let angle = radians(i);
    let velocity = createVector(cos(angle), sin(angle));
    velocity.mult(3);
    
    particles.push({
      position: player.position.copy(),
      velocity: velocity,
      size: random(3, 8),
      color: color(60, 100, 100),
      alpha: 1,
      lifetime: 30
    });
  }
  
  // Screen shake
  screenShake = 5;
  
  // Affect nearby predators
  predators.forEach(predator => {
    let d = dist(player.position.x, player.position.y, predator.position.x, predator.position.y);
    if (d < PULSE_RANGE) {
      // Push predator away
      let force = p5.Vector.sub(predator.position, player.position);
      force.normalize();
      force.mult(5);
      predator.velocity.add(force);
      
      // Create particles for hit effect
      createParticleExplosion(predator.position, 10, color(60, 100, 100), 1);
    }
  });
}

// Game over function
function gameOver() {
  gameState = "gameover";
  deathCount++;
}

// Display error screen
function displayErrorScreen(message) {
  // Clear screen
  background(0);
  
  // Display error message
  fill(350, 80, 90);
  textSize(32);
  textAlign(CENTER, CENTER);
  text("Error", width/2, height/3);
  
  textSize(18);
  fill(0, 0, 100);
  text(message, width/2, height/2);
  
  // Reset prompt
  textSize(24);
  fill(0, 0, 80);
  text("Press SPACE to Restart", width/2, height * 2/3);
}

// Window resize handling
function windowResized() {
  // Optionally handle window resizing
  resizeCanvas(windowWidth, windowHeight);
}