// Cosmic Depths: A Fish-Nebula Roguelike
// Global game state
let gameState = {
  currentScene: "TITLE",  // TITLE, PLAYING, PAUSED, GAME_OVER
  level: 1,
  score: 0,
  highScore: 0,
  orbsCollected: 0,
  requiredOrbs: 5,
  difficultyMultiplier: 1,
  started: false,
  frameCounter: 0
};

// Entity management
let player;
let enemies = [];
let orbs = [];
let particles = [];
let nebulaClouds = [];
let stars = [];

// Font management
let mainFont;
let fontLoaded = false;
let fontFallback = false;

// Game configuration
const CONFIG = {
  playerMaxHealth: 3,
  playerBaseSpeed: 3.2,
  enemySpawnRate: 0.005,
  enemyBaseSpeed: 0.8,
  orbValue: 10,
  maxParticles: 100,
  starCount: 200,
  nebulaCloudCount: 8,
  skillUnlockLevels: {
    dash: 2,
    shield: 3,
    lure: 4
  }
};


// Setup function
function setup() {
  createCanvas(windowWidth > 800 ? 800 : windowWidth, windowHeight > 600 ? 600 : windowHeight);
  colorMode(HSB, 255);
  
  // Set font
  try {
    if (fontLoaded) {
      textFont(mainFont);
    }
  } catch (e) {
    console.warn("Font application failed:", e);
    fontFallback = true;
  }
  
  // Initialize player
  resetGame();
}

// Create player fish
function createPlayer() {
  return {
    position: createVector(width/2, height/2),
    velocity: createVector(0, 0),
    health: CONFIG.playerMaxHealth,
    maxHealth: CONFIG.playerMaxHealth,
    radius: 15,
    speed: CONFIG.playerBaseSpeed,
    color: color(170, 200, 255),
    tailWag: 0,
    tailWagDir: 0.1,
    invulnerable: 0,
    skills: {
      dash: { level: 0, cooldown: 0, active: false, maxCooldown: 90 },
      shield: { level: 0, cooldown: 0, active: false, maxCooldown: 300 },
      lure: { level: 0, cooldown: 0, active: false, maxCooldown: 600 }
    },
    
    update: function() {
      // Movement based on arrow keys
      let moving = false;
      let direction = createVector(0, 0);
      
      if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) { // Left Arrow or A
        direction.x -= 1;
        moving = true;
      }
      if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) { // Right Arrow or D
        direction.x += 1;
        moving = true;
      }
      if (keyIsDown(UP_ARROW) || keyIsDown(87)) { // Up Arrow or W
        direction.y -= 1;
        moving = true;
      }
      if (keyIsDown(DOWN_ARROW) || keyIsDown(83)) { // Down Arrow or S
        direction.y += 1;
        moving = true;
      }
      
      // Normalize direction and apply speed
      if (moving) {
        direction.normalize();
        direction.mult(this.speed);
        this.velocity.lerp(direction, 0.2);
        
        // Tail wag animation
        this.tailWag += this.tailWagDir;
        if (abs(this.tailWag) > 0.5) {
          this.tailWagDir *= -1;
        }
      } else {
        // Slow down if not moving
        this.velocity.mult(0.9);
        this.tailWag *= 0.9;
      }
      
      // Update position
      this.position.add(this.velocity);
      
      // Contain within boundaries
      this.position.x = constrain(this.position.x, this.radius, width - this.radius);
      this.position.y = constrain(this.position.y, this.radius, height - this.radius);
      
      // Update skill cooldowns
      for (let skill in this.skills) {
        if (this.skills[skill].cooldown > 0) {
          this.skills[skill].cooldown--;
        }
        
        // Handle active skills
        if (skill === 'shield' && this.skills.shield.active) {
          if (this.skills.shield.cooldown <= 0) {
            this.skills.shield.active = false;
          }
        }
      }
      
      // Reduce invulnerability timer
      if (this.invulnerable > 0) {
        this.invulnerable--;
      }
    },
    
    draw: function() {
      push();
      translate(this.position.x, this.position.y);
      
      // Draw shield if active
      if (this.skills.shield.active) {
        noFill();
        stroke(170, 150, 255, 150 + sin(frameCount * 0.1) * 50);
        strokeWeight(3);
        ellipse(0, 0, this.radius * 3);
        noStroke();
      }
      
      // Draw fish body with flashing if invulnerable
      if (this.invulnerable === 0 || frameCount % 5 < 3) {
        // Draw fish body
        fill(this.color);
        ellipse(0, 0, this.radius * 2, this.radius * 1.5);
        
        // Draw tail
        push();
        translate(-this.radius, 0);
        rotate(this.tailWag);
        fill(hue(this.color), saturation(this.color) - 20, brightness(this.color) - 20);
        triangle(0, 0, -this.radius, -this.radius/2, -this.radius, this.radius/2);
        pop();
        
        // Draw eye
        fill(255);
        ellipse(this.radius/2, -this.radius/4, this.radius/3);
        fill(0);
        ellipse(this.radius/2 + 2, -this.radius/4, this.radius/6);
      }
      
      pop();
    },
    
    takeDamage: function() {
      if (this.invulnerable > 0 || this.skills.shield.active) return false;
      
      this.health--;
      this.invulnerable = 60; // 1 second invulnerability
      
      // Create damage particles
      for (let i = 0; i < 10; i++) {
        createParticle(
          this.position.x,
          this.position.y,
          color(0, 200, 255),
          random(1, 3),
          random(60, 90)
        );
      }
      
      if (this.health <= 0) {
        gameState.currentScene = "GAME_OVER";
        
        // Create explosion particles
        for (let i = 0; i < 30; i++) {
          createParticle(
            this.position.x,
            this.position.y,
            color(random(0, 50), 255, 255),
            random(2, 5),
            random(90, 120)
          );
        }
      }
      
      return true;
    },
    
    activateDash: function() {
      if (this.skills.dash.level > 0 && this.skills.dash.cooldown <= 0) {
        let dashDir = this.velocity.copy();
        if (dashDir.mag() < 0.1) {
          // If not moving, dash forward
          dashDir = createVector(1, 0);
        }
        dashDir.normalize();
        dashDir.mult(this.speed * 5);
        this.velocity = dashDir;
        this.skills.dash.cooldown = this.skills.dash.maxCooldown;
        
        // Create dash particles
        for (let i = 0; i < 15; i++) {
          let pos = createVector(
            this.position.x - dashDir.x * random(5, 20),
            this.position.y - dashDir.y * random(5, 20)
          );
          createParticle(
            pos.x, pos.y,
            color(170, 150, 150),
            random(1, 3),
            random(20, 40)
          );
        }
        return true;
      }
      return false;
    },
    
    activateShield: function() {
      if (this.skills.shield.level > 0 && this.skills.shield.cooldown <= 0) {
        this.skills.shield.active = true;
        this.skills.shield.cooldown = this.skills.shield.maxCooldown;
        
        // Create shield activation particles
        for (let i = 0; i < 20; i++) {
          let angle = random(TWO_PI);
          let dist = this.radius * 1.5;
          let pos = createVector(
            this.position.x + cos(angle) * dist,
            this.position.y + sin(angle) * dist
          );
          createParticle(
            pos.x, pos.y,
            color(170, 150, 255),
            random(1, 3),
            random(20, 40)
          );
        }
        return true;
      }
      return false;
    },
    
    activateLure: function() {
      if (this.skills.lure.level > 0 && this.skills.lure.cooldown <= 0) {
        // Create a lure entity
        createLure(this.position.x, this.position.y);
        this.skills.lure.cooldown = this.skills.lure.maxCooldown;
        return true;
      }
      return false;
    },
    
    collectOrb: function() {
      gameState.orbsCollected++;
      gameState.score += CONFIG.orbValue * gameState.level;
      
      // Check if we've collected enough orbs to advance
      if (gameState.orbsCollected >= gameState.requiredOrbs) {
        levelUp();
      }
    }
  };
}

// Create an enemy
function createEnemy(type = "basic") {
  // Spawn enemies from outside the visible area
  let pos;
  let edgeMargin = 50;
  
  // Choose a random edge
  let edge = floor(random(4));
  switch(edge) {
    case 0: // Top
      pos = createVector(random(width), -edgeMargin);
      break;
    case 1: // Right
      pos = createVector(width + edgeMargin, random(height));
      break;
    case 2: // Bottom
      pos = createVector(random(width), height + edgeMargin);
      break;
    case 3: // Left
      pos = createVector(-edgeMargin, random(height));
      break;
  }
  
  let enemyTypes = {
    "basic": {
      color: color(0, 200, 255),
      speed: CONFIG.enemyBaseSpeed,
      radius: 15,
      health: 1,
      behavior: "chase"
    },
    "fast": {
      color: color(30, 200, 255),
      speed: CONFIG.enemyBaseSpeed * 1.5,
      radius: 10,
      health: 1,
      behavior: "chase"
    },
    "large": {
      color: color(200, 200, 230),
      speed: CONFIG.enemyBaseSpeed * 0.7,
      radius: 25,
      health: 3,
      behavior: "chase"
    },
    "hunter": {
      color: color(350, 200, 230),
      speed: CONFIG.enemyBaseSpeed * 1.2,
      radius: 18,
      health: 2,
      behavior: "hunt"
    }
  };
  
  // Start with basic type, upgrade for higher levels
  let availableTypes = ["basic"];
  if (gameState.level >= 3) availableTypes.push("fast");
  if (gameState.level >= 5) availableTypes.push("large");
  if (gameState.level >= 7) availableTypes.push("hunter");
  
  // Choose random type if not specified
  if (type === "random") {
    type = random(availableTypes);
  }
  
  let typeProps = enemyTypes[type];
  
  let enemy = {
    position: pos,
    velocity: createVector(0, 0),
    type: type,
    color: typeProps.color,
    speed: typeProps.speed * gameState.difficultyMultiplier,
    radius: typeProps.radius,
    health: typeProps.health,
    behavior: typeProps.behavior,
    targetPos: null,
    huntCooldown: 0,
    tailWag: 0,
    tailWagDir: 0.1,
    
    update: function() {
      // Movement based on behavior
      let targetPos;
      
      if (this.behavior === "hunt" && this.huntCooldown <= 0) {
        // Hunters predict player movement
        if (player) {
          targetPos = createVector(
            player.position.x + player.velocity.x * 20,
            player.position.y + player.velocity.y * 20
          );
        }
        this.huntCooldown = 30;
      } else {
        // Chase behavior - move toward player
        if (player) {
          targetPos = player.position.copy();
        }
        
        if (this.huntCooldown > 0) this.huntCooldown--;
      }
      
      // Handle lures if present
      for (let i = 0; i < orbs.length; i++) {
        if (orbs[i].type === "lure") {
          // 70% chance that enemies are distracted by lure
          if (random() < 0.7) {
            targetPos = orbs[i].position.copy();
          }
        }
      }
      
      if (targetPos) {
        let direction = p5.Vector.sub(targetPos, this.position);
        direction.normalize();
        direction.mult(this.speed);
        this.velocity.lerp(direction, 0.1);
      }
      
      // Update position
      this.position.add(this.velocity);
      
      // Tail wag animation
      if (this.velocity.mag() > 0.1) {
        this.tailWag += this.tailWagDir;
        if (abs(this.tailWag) > 0.5) {
          this.tailWagDir *= -1;
        }
      }
      
      // Check if out of bounds and should be removed
      let margin = 100;
      if (this.position.x < -margin || this.position.x > width + margin ||
          this.position.y < -margin || this.position.y > height + margin) {
        return true; // Remove this enemy
      }
      
      // Check collision with player
      if (player && !player.takeDamage) return false;
      
      if (player && this.checkCollision(player)) {
        let damaged = player.takeDamage();
        if (damaged) {
          this.health -= 1;
          if (this.health <= 0) {
            // Create explosion particles
            for (let i = 0; i < 10; i++) {
              createParticle(
                this.position.x,
                this.position.y,
                this.color,
                random(1, 3),
                random(30, 60)
              );
            }
            return true; // Remove this enemy
          }
        }
      }
      
      return false; // Keep this enemy
    },
    
    draw: function() {
      push();
      translate(this.position.x, this.position.y);
      
      // Rotate to face direction of movement
      if (this.velocity.mag() > 0.1) {
        let angle = atan2(this.velocity.y, this.velocity.x);
        rotate(angle);
      }
      
      // Draw fish body
      fill(this.color);
      ellipse(0, 0, this.radius * 2, this.radius * 1.5);
      
      // Draw tail
      push();
      translate(-this.radius, 0);
      rotate(this.tailWag);
      fill(hue(this.color), saturation(this.color) - 20, brightness(this.color) - 20);
      triangle(0, 0, -this.radius, -this.radius/2, -this.radius, this.radius/2);
      pop();
      
      // Draw eye
      fill(255);
      ellipse(this.radius/2, -this.radius/4, this.radius/3);
      fill(0);
      ellipse(this.radius/2 + 2, -this.radius/4, this.radius/6);
      
      // Additional visual elements for special types
      if (this.type === "hunter") {
        // Hunter has "teeth"
        fill(350, 100, 255);
        triangle(this.radius, 0, this.radius + 10, -5, this.radius + 10, 5);
      } else if (this.type === "large") {
        // Large enemy has spikes
        fill(200, 150, 200);
        for (let i = 0; i < 3; i++) {
          let angle = PI/6 + i * PI/6;
          triangle(
            cos(angle) * this.radius, sin(angle) * this.radius,
            cos(angle) * (this.radius + 10), sin(angle) * (this.radius + 5),
            cos(angle) * (this.radius + 10), sin(angle) * (this.radius - 5)
          );
        }
      }
      
      pop();
    },
    
    checkCollision: function(other) {
      let distance = dist(
        this.position.x,
        this.position.y,
        other.position.x,
        other.position.y
      );
      return distance < (this.radius + other.radius);
    }
  };
  
  enemies.push(enemy);
  return enemy;
}

// Create orbital particles at position with specific color and size
function createParticle(x, y, particleColor, size, lifespan) {
  // Limit particles to prevent performance issues
  if (particles.length >= CONFIG.maxParticles) {
    // Replace oldest particle
    particles.shift();
  }
  
  let particle = {
    position: createVector(x, y),
    velocity: p5.Vector.random2D().mult(random(0.5, 2)),
    color: particleColor,
    alpha: 255,
    size: size || random(2, 5),
    lifespan: lifespan || random(30, 60),
    maxLifespan: lifespan || random(30, 60),
    
    update: function() {
      this.position.add(this.velocity);
      this.velocity.mult(0.95); // Slow down over time
      this.alpha = map(this.lifespan, 0, this.maxLifespan, 0, 255);
      this.lifespan--;
      
      return this.lifespan <= 0; // Remove when lifespan is over
    },
    
    draw: function() {
      noStroke();
      fill(hue(this.color), saturation(this.color), brightness(this.color), this.alpha);
      ellipse(this.position.x, this.position.y, this.size);
    }
  };
  
  particles.push(particle);
  return particle;
}

// Create an orb
function createOrb(type = "normal") {
  let x, y;
  let minDistance = 100;
  let placementAttempts = 0;
  let maxAttempts = 20;
  
  // Try to place orb away from player and enemies
  do {
    x = random(50, width - 50);
    y = random(50, height - 50);
    
    // Check distance from player
    let tooClose = false;
    if (player) {
      let d = dist(x, y, player.position.x, player.position.y);
      tooClose = d < minDistance;
    }
    
    // Check distance from enemies
    for (let i = 0; i < enemies.length && !tooClose; i++) {
      let d = dist(x, y, enemies[i].position.x, enemies[i].position.y);
      tooClose = d < minDistance;
    }
    
    placementAttempts++;
    
    if (!tooClose || placementAttempts >= maxAttempts) {
      // Either found a good spot or hit max attempts
      break;
    }
  } while (placementAttempts < maxAttempts);
  
  // Orb types
  let orbData = {
    "normal": {
      color: color(210, 200, 255),
      pulseColor: color(210, 150, 255, 150),
      radius: 10
    },
    "health": {
      color: color(350, 200, 255),
      pulseColor: color(350, 150, 255, 150),
      radius: 12
    },
    "skill": {
      color: color(170, 200, 255),
      pulseColor: color(170, 150, 255, 150),
      radius: 12
    },
    "lure": {
      color: color(60, 200, 255),
      pulseColor: color(60, 150, 255, 200),
      radius: 8,
      lifespan: 300
    }
  };
  
  let typeData = orbData[type];
  
  let orb = {
    position: createVector(x, y),
    velocity: createVector(0, 0),
    type: type,
    color: typeData.color,
    pulseColor: typeData.pulseColor,
    radius: typeData.radius,
    pulse: 0,
    pulseDir: 0.02,
    lifespan: typeData.lifespan || -1, // -1 for infinite
    
    update: function() {
      // Pulsing animation
      this.pulse += this.pulseDir;
      if (this.pulse > 1 || this.pulse < 0) {
        this.pulseDir *= -1;
      }
      
      // Apply slight movement
      this.velocity.add(p5.Vector.random2D().mult(0.05));
      this.velocity.mult(0.95); // Dampen
      this.position.add(this.velocity);
      
      // Lures have limited lifespan
      if (this.type === "lure") {
        this.lifespan--;
        if (this.lifespan <= 0) {
          return true; // Remove this orb
        }
      }
      
      // Check if collected by player
      if (player && this.checkCollision(player)) {
        // Different effects based on orb type
        if (this.type === "normal") {
          player.collectOrb();
        } else if (this.type === "health") {
          player.health = min(player.health + 1, player.maxHealth);
        } else if (this.type === "skill") {
          upgradeRandomSkill();
        }
        
        // Lures aren't collected
        if (this.type !== "lure") {
          // Create collection particles
          for (let i = 0; i < 15; i++) {
            createParticle(
              this.position.x,
              this.position.y,
              this.color,
              random(1, 3),
              random(30, 60)
            );
          }
          return true; // Remove this orb
        }
      }
      
      return false; // Keep this orb
    },
    
    draw: function() {
      let pulseSize = this.radius * (1 + this.pulse * 0.3);
      
      // Draw pulse glow
      noStroke();
      fill(this.pulseColor);
      ellipse(this.position.x, this.position.y, pulseSize * 2);
      
      // Draw core
      fill(this.color);
      ellipse(this.position.x, this.position.y, this.radius * 1.5);
      
      // Draw specific details based on type
      if (this.type === "health") {
        // Health cross
        fill(255);
        rectMode(CENTER);
        rect(this.position.x, this.position.y, this.radius * 0.8, this.radius * 0.3);
        rect(this.position.x, this.position.y, this.radius * 0.3, this.radius * 0.8);
        rectMode(CORNER);
      } else if (this.type === "skill") {
        // Skill star
        fill(255);
        push();
        translate(this.position.x, this.position.y);
        rotate(frameCount * 0.02);
        for (let i = 0; i < 5; i++) {
          let angle = TWO_PI / 5 * i - PI/2;
          let x1 = cos(angle) * this.radius * 0.5;
          let y1 = sin(angle) * this.radius * 0.5;
          let x2 = cos(angle + TWO_PI/10) * this.radius * 0.8;
          let y2 = sin(angle + TWO_PI/10) * this.radius * 0.8;
          triangle(0, 0, x1, y1, x2, y2);
        }
        pop();
      } else if (this.type === "lure") {
        // Lure rings
        noFill();
        stroke(60, 200, 255, 150 * (this.lifespan / 300));
        strokeWeight(1);
        let ringSize = map(sin(frameCount * 0.1), -1, 1, this.radius * 3, this.radius * 5);
        ellipse(this.position.x, this.position.y, ringSize);
        noStroke();
      }
    },
    
    checkCollision: function(other) {
      let distance = dist(
        this.position.x,
        this.position.y,
        other.position.x,
        other.position.y
      );
      return distance < (this.radius + other.radius);
    }
  };
  
  orbs.push(orb);
  return orb;
}

// Create a lure (special type of orb)
function createLure(x, y) {
  // Create a lure orb at the position
  let lure = createOrb("lure");
  lure.position.x = x;
  lure.position.y = y;
  return lure;
}

// Create nebula cloud for background
function createNebulaCloud() {
  return {
    position: createVector(random(width), random(height)),
    radius: random(100, 300),
    hue: random(150, 270),
    saturation: random(100, 200),
    brightness: random(20, 50),
    alpha: random(10, 30),
    noiseOffset: random(1000),
    noiseScale: random(0.005, 0.02),
    
    update: function() {
      // Slowly drift
      this.position.x += random(-0.2, 0.2);
      this.position.y += random(-0.2, 0.2);
      
      // Wrap around screen
      if (this.position.x < -this.radius) this.position.x = width + this.radius;
      if (this.position.x > width + this.radius) this.position.x = -this.radius;
      if (this.position.y < -this.radius) this.position.y = height + this.radius;
      if (this.position.y > height + this.radius) this.position.y = -this.radius;
    },
    
    draw: function() {
      noStroke();
      
      // Draw using noise for organic shape
      for (let r = 0; r < this.radius; r += 15) {
        for (let a = 0; a < TWO_PI; a += PI/8) {
          let xoff = cos(a) * r * this.noiseScale + this.noiseOffset;
          let yoff = sin(a) * r * this.noiseScale + this.noiseOffset;
          let n = noise(xoff, yoff, frameCount * 0.001);
          
          if (n > 0.4) {
            let x = this.position.x + cos(a) * r * n;
            let y = this.position.y + sin(a) * r * n;
            
            fill(
              this.hue + random(-10, 10),
              this.saturation,
              this.brightness,
              this.alpha * (1 - r/this.radius)
            );
            
            ellipse(x, y, 20 * (1 - r/this.radius));
          }
        }
      }
    }
  };
}

// Create a background star
function createStar() {
  return {
    position: createVector(random(width), random(height)),
    size: random(1, 3),
    brightness: random(150, 255),
    twinkleRate: random(0.02, 0.1),
    phase: random(TWO_PI),
    
    update: function() {
      this.phase += this.twinkleRate;
    },
    
    draw: function() {
      // Twinkle effect
      let twinkle = map(sin(this.phase), -1, 1, 0.5, 1);
      
      fill(220, 100, this.brightness * twinkle);
      noStroke();
      ellipse(this.position.x, this.position.y, this.size);
    }
  };
}

// Upgrade a random skill
function upgradeRandomSkill() {
  let eligibleSkills = [];
  
  // Check which skills are eligible for upgrade based on level
  for (let skillName in CONFIG.skillUnlockLevels) {
    if (gameState.level >= CONFIG.skillUnlockLevels[skillName]) {
      eligibleSkills.push(skillName);
    }
  }
  
  if (eligibleSkills.length > 0) {
    let skillToUpgrade = random(eligibleSkills);
    player.skills[skillToUpgrade].level++;
    
    // Display upgrade message
    let message = `${skillToUpgrade.toUpperCase()} upgraded to level ${player.skills[skillToUpgrade].level}!`;
    console.log(message);
  }
}

// Level up and increase difficulty
function levelUp() {
  gameState.level++;
  gameState.orbsCollected = 0;
  gameState.requiredOrbs = min(gameState.level + 4, 15); // More orbs required as levels increase
  gameState.difficultyMultiplier = 1 + (gameState.level - 1) * 0.2; // 20% increase per level
  
  // Create level up particles
  for (let i = 0; i < 30; i++) {
    createParticle(
      random(width),
      random(height),
      color(random(150, 270), 200, 255),
      random(2, 5),
      random(60, 120)
    );
  }
  
  // Spawn a special skill orb occasionally
  if (gameState.level % 2 === 0) {
    createOrb("skill");
  }
  
  // Spawn health orb every 3 levels
  if (gameState.level % 3 === 0) {
    createOrb("health");
  }
}

// Reset the game
function resetGame() {
  // Clear all entities
  enemies = [];
  orbs = [];
  particles = [];
  nebulaClouds = [];
  stars = [];
  
  // Create background elements
  for (let i = 0; i < CONFIG.starCount; i++) {
    stars.push(createStar());
  }
  
  for (let i = 0; i < CONFIG.nebulaCloudCount; i++) {
    nebulaClouds.push(createNebulaCloud());
  }
  
  // Reset game state
  gameState.currentScene = "TITLE";
  gameState.level = 1;
  gameState.score = 0;
  gameState.orbsCollected = 0;
  gameState.requiredOrbs = 5;
  gameState.difficultyMultiplier = 1;
  
  // Create player
  player = createPlayer();
  
  // Create initial orbs
  for (let i = 0; i < 3; i++) {
    createOrb("normal");
  }
}

// Draw the title screen
function drawTitleScreen() {
  background(0);
  
  // Draw background elements
  drawBackground();
  
  // Title text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("COSMIC DEPTHS", width/2, height/3);
  
  textSize(18);
  text("A Nebula Roguelike Adventure", width/2, height/3 + 50);
  
  textSize(16);
  text("Arrow Keys to Move, Space to Start", width/2, height/2 + 30);
  text("1: Dash | 2: Shield | 3: Lure", width/2, height/2 + 60);
  
  textSize(14);
  text("Collect orbs to progress. Avoid enemies.", width/2, height/2 + 100);
  
  // If we have a high score, display it
  if (gameState.highScore > 0) {
    textSize(16);
    text(`High Score: ${gameState.highScore}`, width/2, height/2 + 140);
  }
  
  // Animate player fish on title screen
  if (player) {
    player.position.x = width/2 + sin(frameCount * 0.05) * 50;
    player.position.y = height/2 - 50 + cos(frameCount * 0.05) * 20;
    player.update();
    player.draw();
  }
}

// Draw the game over screen
function drawGameOverScreen() {
  // Background is drawn first
  drawBackground();
  
  // Semi-transparent overlay
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Game over text
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(40);
  text("GAME OVER", width/2, height/3);
  
  textSize(24);
  text(`Level: ${gameState.level}`, width/2, height/2 - 30);
  text(`Score: ${gameState.score}`, width/2, height/2);
  
  // Update high score
  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    textSize(20);
    text("New High Score!", width/2, height/2 + 30);
  }
  
  textSize(16);
  text("Press SPACE to play again", width/2, height/2 + 80);
}

// Draw the background with stars and nebula
function drawBackground() {
  background(0);
  
  // Draw stars
  for (let i = 0; i < stars.length; i++) {
    stars[i].update();
    stars[i].draw();
  }
  
  // Draw nebula clouds
  for (let i = 0; i < nebulaClouds.length; i++) {
    nebulaClouds[i].update();
    nebulaClouds[i].draw();
  }
}

// Draw function
function draw() {
  gameState.frameCounter++;
  
  // Scene management
  switch(gameState.currentScene) {
    case "TITLE":
      drawTitleScreen();
      break;
      
    case "PLAYING":
      updateGame();
      drawGame();
      break;
      
    case "GAME_OVER":
      drawGameOverScreen();
      break;
  }
}

// Update game state
function updateGame() {
  // Spawn enemies randomly, with increased probability at higher levels
  if (random() < CONFIG.enemySpawnRate * gameState.difficultyMultiplier) {
    createEnemy("random");
  }
  
  // Ensure there are always a few orbs
  if (orbs.filter(o => o.type === "normal").length < 3) {
    createOrb("normal");
  }
  
  // Update player
  if (player) {
    player.update();
  }
  
  // Update enemies and remove dead ones
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (enemies[i].update()) {
      enemies.splice(i, 1);
    }
  }
  
  // Update orbs and remove collected ones
  for (let i = orbs.length - 1; i >= 0; i--) {
    if (orbs[i].update()) {
      orbs.splice(i, 1);
    }
  }
  
  // Update particles and remove expired ones
  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].update()) {
      particles.splice(i, 1);
    }
  }
}

// Draw the game
function drawGame() {
  // Draw background first
  drawBackground();
  
  // Draw particles behind other elements
  for (let i = 0; i < particles.length; i++) {
    particles[i].draw();
  }
  
  // Draw orbs
  for (let i = 0; i < orbs.length; i++) {
    orbs[i].draw();
  }
  
  // Draw player
  if (player) {
    player.draw();
  }
  
  // Draw enemies
  for (let i = 0; i < enemies.length; i++) {
    enemies[i].draw();
  }
  
  // Draw UI
  drawUI();
}

// Draw the game UI
function drawUI() {
  // Health
  fill(350, 200, 255);
  textAlign(LEFT, TOP);
  textSize(16);
  text(`Health: `, 20, 20);
  
  // Draw health icons
  for (let i = 0; i < player.maxHealth; i++) {
    if (i < player.health) {
      fill(350, 200, 255);
    } else {
      fill(350, 100, 100);
    }
    ellipse(100 + i * 25, 28, 15, 15);
  }
  
  // Level and score
  fill(255);
  textAlign(RIGHT, TOP);
  text(`Level: ${gameState.level}`, width - 20, 20);
  text(`Score: ${gameState.score}`, width - 20, 45);
  
  // Orb collection progress
  textAlign(CENTER, TOP);
  text(`Orbs: ${gameState.orbsCollected}/${gameState.requiredOrbs}`, width/2, 20);
  
  // Skill cooldowns
  textAlign(LEFT, BOTTOM);
  let y = height - 20;
  
  // Only show skills that have been unlocked
  for (let skillName in player.skills) {
    if (player.skills[skillName].level > 0) {
      let skill = player.skills[skillName];
      let readyPercentage = 1 - (skill.cooldown / skill.maxCooldown);
      
      // Background
      noStroke();
      fill(100, 100, 100, 150);
      rect(20, y - 30, 100, 25);
      
      // Cooldown fill
      if (skill.cooldown <= 0) {
        fill(170, 200, 255); // Ready
      } else {
        fill(170, 200, 150); // Cooling down
      }
      rect(20, y - 30, 100 * readyPercentage, 25);
      
      // Skill name and keybind
      fill(255);
      text(`${skillName.toUpperCase()} (${getKeyForSkill(skillName)})`, 25, y - 10);
      
      // Skill level indicators
      for (let i = 0; i < skill.level; i++) {
        fill(255, 255, 0);
        ellipse(85 + i * 12, y - 17, 8, 8);
      }
      
      y -= 35;
    }
  }
}

// Get the key associated with a skill
function getKeyForSkill(skillName) {
  switch(skillName) {
    case "dash": return "1";
    case "shield": return "2";
    case "lure": return "3";
    default: return "";
  }
}

// Handle key presses
function keyPressed() {
  try {
    // Space to start or restart
    if (keyCode === 32) { // SPACE
      if (gameState.currentScene === "TITLE" || gameState.currentScene === "GAME_OVER") {
        resetGame();
        gameState.currentScene = "PLAYING";
      }
    }
    
    // Skill activation
    if (gameState.currentScene === "PLAYING" && player) {
      if (key === '1') {
        player.activateDash();
      } else if (key === '2') {
        player.activateShield();
      } else if (key === '3') {
        player.activateLure();
      }
    }
    
    // Debug reset with R
    if (key === 'r') {
      resetGame();
    }
  } catch (e) {
    console.error("Error in keyPressed:", e);
  }
  
  // Prevent default behavior for arrow keys
  return !(keyCode === UP_ARROW || keyCode === DOWN_ARROW || 
           keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW);
}

// Handle window resizing
function windowResized() {
  resizeCanvas(windowWidth > 800 ? 800 : windowWidth, windowHeight > 600 ? 600 : windowHeight);
}