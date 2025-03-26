// Global variables
let gameState;
let defaultFont;
let fontLoaded = false;
let score;
let highScore = 0;
let frameCountTracker = 0;
let deltaTime = 1;
let obstacles = [];
let powerUps = [];
let particles = [];
let backgrounds = [];
let obstacleTimer = 0;
let powerUpTimer = 0;
let parallaxLayers = [];
let currentTheme = 0;
let themeCycleDistance = 1000;
let nextThemeChangeDistance = themeCycleDistance;

// Color themes - will cycle through these as player progresses
const colorThemes = [
  { // Day theme
    sky: [135, 206, 250],
    ground: [34, 139, 34],
    obstacle: [139, 69, 19],
    stickman: [0, 0, 0],
    accent: [255, 215, 0]
  },
  { // Sunset theme
    sky: [255, 128, 0],
    ground: [46, 120, 50],
    obstacle: [120, 60, 0],
    stickman: [20, 20, 20],
    accent: [255, 50, 50]
  },
  { // Night theme
    sky: [25, 25, 112],
    ground: [0, 80, 0],
    obstacle: [80, 40, 0],
    stickman: [230, 230, 230],
    accent: [200, 200, 255]
  },
  { // Snowy theme
    sky: [200, 225, 255],
    ground: [240, 240, 250],
    obstacle: [150, 150, 160],
    stickman: [50, 50, 50],
    accent: [180, 180, 255]
  }
];

// Stickman object
let stickman = {
  x: 80,
  y: 0,
  width: 20,
  height: 50,
  vy: 0,
  gravity: 0.6,
  jumpForce: -15,
  state: "running", // running, jumping, ducking, stumbling
  animationFrame: 0,
  invincible: false,
  invincibilityTimer: 0,
  
  // Reset stickman to initial state
  reset: function(groundY) {
    this.y = groundY;
    this.vy = 0;
    this.state = "running";
    this.invincible = false;
    this.invincibilityTimer = 0;
  },
  
  // Update stickman physics and animation
  update: function(groundY) {
    this.vy += this.gravity * deltaTime;
    this.y += this.vy * deltaTime;
    
    // Ground collision
    if (this.y >= groundY) {
      this.y = groundY;
      if (this.state === "jumping" || this.state === "stumbling") {
        this.state = "running";
      }
      this.vy = 0;
    }
    
    // Update invincibility timer
    if (this.invincible) {
      this.invincibilityTimer -= deltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
      }
    }
    
    // Increment animation frame
    this.animationFrame = (this.animationFrame + deltaTime * 0.5) % 12;
  },
  
  // Draw the stickman
  draw: function() {
    push();
    translate(this.x, this.y);
    
    // Get current theme colors
    let stickmanColor = colorThemes[currentTheme].stickman;
    
    // Invincibility effect
    if (this.invincible && Math.floor(frameCount / 4) % 2 === 0) {
      stroke(colorThemes[currentTheme].accent);
    } else {
      stroke(stickmanColor);
    }
    
    strokeWeight(3);
    noFill();
    
    // Draw based on state
    if (this.state === "running") {
      this.drawRunning();
    } else if (this.state === "jumping") {
      this.drawJumping();
    } else if (this.state === "ducking") {
      this.drawDucking();
    } else if (this.state === "stumbling") {
      this.drawStumbling();
    }
    
    pop();
  },
  
  // Running animation
  drawRunning: function() {
    // Animation variables
    let legSwing = sin(this.animationFrame) * 30;
    let armSwing = sin(this.animationFrame + PI) * 30;
    let bounce = sin(this.animationFrame * 2) * 2;
    
    // Head
    ellipse(0, -this.height + bounce, 16, 16);
    
    // Body
    line(0, -this.height + 10 + bounce, 0, -15 + bounce/2);
    
    // Arms
    line(0, -this.height + 20 + bounce, 
         cos(radians(armSwing)) * 12, -this.height + 20 + bounce + sin(radians(armSwing)) * 5);
    line(0, -this.height + 20 + bounce, 
         cos(radians(armSwing + 180)) * 12, -this.height + 20 + bounce + sin(radians(armSwing + 180)) * 5);
    
    // Legs
    line(0, -15 + bounce/2, 
         cos(radians(legSwing)) * 15, -5 + sin(radians(legSwing)) * 10);
    line(0, -15 + bounce/2, 
         cos(radians(legSwing + 180)) * 15, -5 + sin(radians(legSwing + 180)) * 10);
  },
  
  // Jumping pose
  drawJumping: function() {
    // Head
    ellipse(0, -this.height, 16, 16);
    
    // Body
    line(0, -this.height + 10, 0, -15);
    
    // Arms outstretched
    line(0, -this.height + 20, -15, -this.height + 15);
    line(0, -this.height + 20, 15, -this.height + 15);
    
    // Legs tucked
    line(0, -15, -8, -5);
    line(0, -15, 8, -5);
  },
  
  // Ducking pose
  drawDucking: function() {
    let duckHeight = this.height * 0.6;
    
    // Head
    ellipse(0, -duckHeight, 16, 16);
    
    // Body - shorter
    line(0, -duckHeight + 10, 0, -10);
    
    // Arms tucked
    line(0, -duckHeight + 15, -10, -duckHeight + 10);
    line(0, -duckHeight + 15, 10, -duckHeight + 10);
    
    // Legs wide
    line(0, -10, -15, 0);
    line(0, -10, 15, 0);
  },
  
  // Stumbling animation
  drawStumbling: function() {
    let wobble = sin(frameCount * 0.4) * 15;
    
    push();
    rotate(radians(wobble));
    
    // Head
    ellipse(0, -this.height, 16, 16);
    
    // Body leaning
    line(0, -this.height + 10, 5, -15);
    
    // Arms flailing
    line(0, -this.height + 20, -15, -this.height + 10);
    line(0, -this.height + 20, 15, -this.height + 10);
    
    // Legs stumbling
    line(5, -15, -10, 0);
    line(5, -15, 15, 0);
    
    pop();
  },
  
  // Make the stickman jump
  jump: function() {
    if (this.state !== "jumping" && this.state !== "stumbling" && this.y >= world.groundY - 1) {
      this.vy = this.jumpForce;
      this.state = "jumping";
      
      // Create dust particles for visual feedback
      createParticles(this.x, this.y, 5, [150, 150, 150], 1);
    }
  },
  
  // Make the stickman duck
  duck: function() {
    if (this.state !== "jumping" && this.state !== "stumbling") {
      this.state = "ducking";
    }
  },
  
  // Stop ducking
  standUp: function() {
    if (this.state === "ducking") {
      this.state = "running";
    }
  },
  
  // Activate invincibility power-up
  activateInvincibility: function(duration) {
    this.invincible = true;
    this.invincibilityTimer = duration;
  },
  
  // Calculate bounding box for collision detection
  getBounds: function() {
    let adjustedHeight = this.state === "ducking" ? this.height * 0.6 : this.height;
    return {
      x: this.x - 10,
      y: this.y - adjustedHeight,
      width: 20,
      height: adjustedHeight
    };
  }
};

// World settings and environment
let world = {
  groundY: 0,
  speed: 6,
  baseSpeed: 6,
  maxSpeed: 15,
  obstacleFrequency: 100,
  powerUpFrequency: 500,
  distanceTraveled: 0,
  
  // Initialize world
  setup: function(canvasHeight) {
    this.groundY = canvasHeight * 0.8;
    stickman.reset(this.groundY);
    
    // Create parallax layers
    this.createParallaxLayers();
  },
  
  // Create background parallax layers
  createParallaxLayers: function() {
    parallaxLayers = [];
    
    // Far mountains
    let mountains = [];
    for (let i = 0; i < 5; i++) {
      mountains.push({
        x: random(width),
        width: random(120, 200),
        height: random(50, 100)
      });
    }
    parallaxLayers.push({
      elements: mountains,
      speed: 0.2,
      drawFunc: function(x, y, w, h, color) {
        fill(color);
        noStroke();
        triangle(x, world.groundY, x + w/2, world.groundY - h, x + w, world.groundY);
      }
    });
    
    // Mid hills
    let hills = [];
    for (let i = 0; i < 7; i++) {
      hills.push({
        x: random(width),
        width: random(80, 150),
        height: random(30, 60)
      });
    }
    parallaxLayers.push({
      elements: hills,
      speed: 0.5,
      drawFunc: function(x, y, w, h, color) {
        fill(color);
        noStroke();
        arc(x + w/2, world.groundY, w, h*2, PI, TWO_PI);
      }
    });
    
    // Near bushes
    let bushes = [];
    for (let i = 0; i < 9; i++) {
      bushes.push({
        x: random(width),
        width: random(30, 60),
        height: random(15, 30)
      });
    }
    parallaxLayers.push({
      elements: bushes,
      speed: 0.8,
      drawFunc: function(x, y, w, h, color) {
        fill(color);
        noStroke();
        arc(x + w/2, world.groundY, w, h*2, PI, TWO_PI);
      }
    });
  }
};


// Setup function
function setup() {
  createCanvas(800, 400);
  
  // Set font if loaded successfully
  try {
    if (defaultFont) {
      textFont(defaultFont);
      fontLoaded = true;
    }
  } catch(e) {
    console.error("Error setting font:", e);
    fontLoaded = false;
  }
  
  // Initialize world
  world.setup(height);
  
  // Start at title screen
  gameState = "TITLE";
  resetGame();
}

// Draw function - main game loop
function draw() {
  // Calculate delta time for smooth animation regardless of frame rate
  let prevFrameCount = frameCountTracker;
  frameCountTracker = frameCount;
  deltaTime = constrain(frameCountTracker - prevFrameCount, 0.1, 3);
  
  // State machine
  switch(gameState) {
    case "TITLE":
      drawTitleScreen();
      break;
    case "PLAYING":
      updateGame();
      drawGame();
      break;
    case "GAME_OVER":
      updateGame();
      drawGame();
      drawGameOverScreen();
      break;
  }
}

// Update game state
function updateGame() {
  // Update stickman
  stickman.update(world.groundY);
  
  // Update world speed based on score
  world.speed = min(world.baseSpeed + (score / 1000), world.maxSpeed);
  
  // Update distance traveled
  world.distanceTraveled += world.speed * deltaTime * 0.1;
  
  // Check for theme change
  if (world.distanceTraveled >= nextThemeChangeDistance) {
    currentTheme = (currentTheme + 1) % colorThemes.length;
    nextThemeChangeDistance += themeCycleDistance;
    
    // Create new particles for transition effect
    createParticles(width/2, height/2, 20, colorThemes[currentTheme].accent, 3);
  }
  
  // Generate obstacles
  obstacleTimer -= deltaTime;
  if (obstacleTimer <= 0 && gameState === "PLAYING") {
    spawnObstacle();
    // Adjust timer based on speed - faster game, more frequent obstacles
    obstacleTimer = world.obstacleFrequency - min(score/20, 40);
  }
  
  // Generate power-ups
  powerUpTimer -= deltaTime;
  if (powerUpTimer <= 0 && gameState === "PLAYING") {
    spawnPowerUp();
    powerUpTimer = world.powerUpFrequency;
  }
  
  // Update obstacles
  updateObstacles();
  
  // Update power-ups
  updatePowerUps();
  
  // Update particles
  updateParticles();
  
  // Update score if game is active
  if (gameState === "PLAYING") {
    score += 0.1 * deltaTime;
  }
}

// Spawn a new obstacle
function spawnObstacle() {
  // Different obstacle types
  let types = ["standard", "tall", "low", "multiple"];
  let type = random(types);
  
  if (type === "standard") {
    obstacles.push({
      x: width + 20,
      y: world.groundY,
      width: random(20, 35),
      height: random(30, 50),
      type: type
    });
  } else if (type === "tall") {
    obstacles.push({
      x: width + 20,
      y: world.groundY,
      width: random(15, 30),
      height: random(60, 80),
      type: type
    });
  } else if (type === "low") {
    obstacles.push({
      x: width + 20,
      y: world.groundY,
      width: random(40, 70),
      height: random(15, 25),
      type: type
    });
  } else if (type === "multiple") {
    // Generate 2-3 smaller obstacles in sequence
    let count = floor(random(2, 4));
    let spacing = random(60, 100);
    
    for (let i = 0; i < count; i++) {
      obstacles.push({
        x: width + 20 + (spacing * i),
        y: world.groundY,
        width: random(15, 25),
        height: random(25, 40),
        type: "standard"
      });
    }
  }
}

// Spawn a power-up
function spawnPowerUp() {
  let types = ["invincibility", "points", "slowdown"];
  let type = random(types);
  
  powerUps.push({
    x: width + 20,
    y: world.groundY - random(50, 100),
    width: 20,
    height: 20,
    type: type,
    rotation: 0
  });
}

// Create particles (for effects)
function createParticles(x, y, count, color, size) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + random(-10, 10),
      y: y + random(-10, 10),
      vx: random(-2, 2),
      vy: random(-3, -1),
      size: random(2, 5) * size,
      color: color,
      alpha: 255,
      life: random(20, 40)
    });
  }
}

// Update obstacles
function updateObstacles() {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obstacle = obstacles[i];
    
    // Move obstacle based on game speed
    obstacle.x -= world.speed * deltaTime;
    
    // Check for collision
    if (gameState === "PLAYING" && !stickman.invincible && checkCollision(stickman.getBounds(), obstacle)) {
      // Handle collision
      gameState = "GAME_OVER";
      
      // Update high score
      if (score > highScore) {
        highScore = score;
      }
      
      // Create particles for impact
      createParticles(stickman.x, stickman.y - stickman.height/2, 15, [255, 50, 50], 2);
    }
    
    // Remove if off screen
    if (obstacle.x + obstacle.width < 0) {
      obstacles.splice(i, 1);
    }
  }
}

// Update power-ups
function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    let powerUp = powerUps[i];
    
    // Move power-up
    powerUp.x -= world.speed * deltaTime;
    
    // Animation
    powerUp.y += sin(frameCount * 0.1) * 0.5;
    powerUp.rotation += 0.05 * deltaTime;
    
    // Check for collection
    if (gameState === "PLAYING" && checkCollision(stickman.getBounds(), powerUp)) {
      // Apply power-up effect
      if (powerUp.type === "invincibility") {
        stickman.activateInvincibility(180); // 3 seconds at 60fps
        createParticles(stickman.x, stickman.y - stickman.height/2, 10, colorThemes[currentTheme].accent, 2);
      } else if (powerUp.type === "points") {
        score += 50;
        createParticles(stickman.x, stickman.y - stickman.height/2, 10, [255, 215, 0], 2);
      } else if (powerUp.type === "slowdown") {
        world.speed = world.baseSpeed * 0.6;
        createParticles(stickman.x, stickman.y - stickman.height/2, 10, [0, 191, 255], 2);
      }
      
      // Remove the power-up
      powerUps.splice(i, 1);
    }
    
    // Remove if off screen
    if (powerUp.x + powerUp.width < 0) {
      powerUps.splice(i, 1);
    }
  }
}

// Update particles
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    
    // Move particle
    p.x += p.vx * deltaTime;
    p.y += p.vy * deltaTime;
    
    // Apply gravity
    p.vy += 0.1 * deltaTime;
    
    // Fade out
    p.alpha -= 255 / p.life * deltaTime;
    
    // Remove if faded out
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// Collision detection
function checkCollision(obj1, obj2) {
  return (
    obj1.x < obj2.x + obj2.width &&
    obj1.x + obj1.width > obj2.x &&
    obj1.y < obj2.y &&
    obj1.y + obj1.height > obj2.y - obj2.height
  );
}

// Draw title screen
function drawTitleScreen() {
  // Background
  drawBackground();
  
  // Title
  fill(255);
  stroke(0);
  strokeWeight(5);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("STICKMAN RUNNER", width/2, height/3);
  
  // Instructions
  textSize(24);
  strokeWeight(3);
  text("Press SPACE to start", width/2, height/2);
  
  textSize(16);
  text("SPACE = Jump, DOWN = Duck", width/2, height/2 + 40);
  
  // High score if exists
  if (highScore > 0) {
    textSize(18);
    text("High Score: " + floor(highScore), width/2, height/2 + 80);
  }
  
  // Animated stickman on title screen
  push();
  translate(width/3, world.groundY);
  stickman.animationFrame = (stickman.animationFrame + 0.1) % 12;
  stickman.drawRunning();
  pop();
}

// Draw game
function drawGame() {
  // Background with parallax effect
  drawBackground();
  
  // Draw obstacles
  drawObstacles();
  
  // Draw power-ups
  drawPowerUps();
  
  // Draw stickman
  stickman.draw();
  
  // Draw particles
  drawParticles();
  
  // Draw score
  drawScore();
}

// Draw background with parallax effect
function drawBackground() {
  // Sky gradient based on current theme
  let skyColor = colorThemes[currentTheme].sky;
  background(skyColor);
  
  // Draw parallax layers
  for (let layer of parallaxLayers) {
    // Calculate color based on layer depth and theme
    let layerBrightness = map(layer.speed, 0.2, 0.8, 0.4, 0.8);
    let layerColor = lerpColor(
      color(skyColor),
      color(colorThemes[currentTheme].ground),
      layerBrightness
    );
    
    for (let element of layer.elements) {
      let xPos = (element.x - world.distanceTraveled * layer.speed * 5) % (width + element.width);
      if (xPos < -element.width) xPos += width + element.width;
      
      layer.drawFunc(xPos, world.groundY, element.width, element.height, layerColor);
    }
  }
  
  // Ground
  fill(colorThemes[currentTheme].ground);
  noStroke();
  rect(0, world.groundY, width, height - world.groundY);
  
  // Ground detail lines
  stroke(lerpColor(
    color(colorThemes[currentTheme].ground),
    color(0, 0, 0),
    0.2
  ));
  strokeWeight(1);
  
  for (let i = 0; i < width; i += 20) {
    let xPos = (i - world.distanceTraveled * 2) % width;
    line(xPos, world.groundY, xPos + random(5, 10), world.groundY + random(1, 3));
  }
}

// Draw obstacles
function drawObstacles() {
  fill(colorThemes[currentTheme].obstacle);
  noStroke();
  
  for (let obstacle of obstacles) {
    rect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
    
    // Add details based on obstacle type
    if (obstacle.type === "tall") {
      // Darker band near top
      fill(lerpColor(
        color(colorThemes[currentTheme].obstacle),
        color(0, 0, 0),
        0.3
      ));
      rect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height * 0.2);
    } else if (obstacle.type === "low") {
      // Texture lines
      stroke(lerpColor(
        color(colorThemes[currentTheme].obstacle),
        color(0, 0, 0),
        0.3
      ));
      strokeWeight(1);
      for (let i = 0; i < obstacle.width; i += 5) {
        line(
          obstacle.x + i, 
          obstacle.y - obstacle.height,
          obstacle.x + i,
          obstacle.y
        );
      }
      noStroke();
    }
    
    // Reset fill color
    fill(colorThemes[currentTheme].obstacle);
  }
}

// Draw power-ups
function drawPowerUps() {
  for (let powerUp of powerUps) {
    push();
    translate(powerUp.x + powerUp.width/2, powerUp.y - powerUp.height/2);
    rotate(powerUp.rotation);
    
    // Different visuals for each power-up type
    if (powerUp.type === "invincibility") {
      fill(colorThemes[currentTheme].accent);
      stroke(255);
      strokeWeight(2);
      star(0, 0, 7, 15, 5);
    } else if (powerUp.type === "points") {
      fill(255, 215, 0); // Gold
      stroke(0);
      strokeWeight(2);
      ellipse(0, 0, 20, 20);
      fill(0);
      noStroke();
      textSize(16);
      textAlign(CENTER, CENTER);
      text("+", 0, 0);
    } else if (powerUp.type === "slowdown") {
      fill(0, 191, 255); // Deep sky blue
      stroke(255);
      strokeWeight(2);
      ellipse(0, 0, 20, 20);
      
      // Hourglass symbol
      noStroke();
      fill(255);
      triangle(-5, -5, 5, -5, 0, 0);
      triangle(-5, 5, 5, 5, 0, 0);
    }
    
    pop();
  }
}

// Draw particles
function drawParticles() {
  noStroke();
  for (let p of particles) {
    fill(p.color[0], p.color[1], p.color[2], p.alpha);
    ellipse(p.x, p.y, p.size, p.size);
  }
}

// Draw score
function drawScore() {
  fill(255);
  stroke(0);
  strokeWeight(3);
  textSize(20);
  textAlign(LEFT, TOP);
  text("Score: " + floor(score), 20, 20);
  
  // Show invincibility timer if active
  if (stickman.invincible) {
    fill(colorThemes[currentTheme].accent);
    text("INVINCIBLE!", width - 150, 20);
  }
}

// Draw game over screen
function drawGameOverScreen() {
  // Semi-transparent overlay
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Game over message
  fill(255);
  stroke(0);
  strokeWeight(4);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("GAME OVER", width/2, height/3);
  
  // Final score
  textSize(32);
  strokeWeight(3);
  text("Score: " + floor(score), width/2, height/2);
  
  // High score
  textSize(24);
  text("High Score: " + floor(highScore), width/2, height/2 + 50);
  
  // Restart instructions
  textSize(20);
  text("Press SPACE to restart", width/2, height*2/3 + 20);
}

// Draw star shape for power-ups
function star(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle/2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a+halfAngle) * radius1;
    sy = y + sin(a+halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// Key press events
function keyPressed() {
  if (keyCode === 32) { // Space
    if (gameState === "TITLE") {
      // Start game from title
      gameState = "PLAYING";
    } else if (gameState === "PLAYING") {
      // Jump during gameplay
      stickman.jump();
    } else if (gameState === "GAME_OVER") {
      // Restart from game over
      resetGame();
      gameState = "PLAYING";
    }
  } else if (keyCode === DOWN_ARROW && gameState === "PLAYING") {
    // Duck
    stickman.duck();
  }
}

// Key release events
function keyReleased() {
  if (keyCode === DOWN_ARROW) {
    stickman.standUp();
  }
}

// Reset game state
function resetGame() {
  score = 0;
  obstacles = [];
  powerUps = [];
  particles = [];
  
  stickman.reset(world.groundY);
  
  world.speed = world.baseSpeed;
  world.distanceTraveled = 0;
  
  obstacleTimer = 60;
  powerUpTimer = 300;
  
  // Reset theme cycle
  currentTheme = 0;
  nextThemeChangeDistance = themeCycleDistance;
}