// MandalaCreator - An immersive, interactive mandala experience
let mandala = {
  // Core configuration
  config: {
    symmetry: 8,               // Initial symmetry level
    maxParticles: 800,         // Maximum particles for performance management
    backgroundColor: [0, 0, 10], // Deep blue-black background
    colorSchemes: {
      default: [[255, 125, 0], [181, 23, 158], [99, 0, 255], [0, 87, 255]],
      highContrast: [[255, 255, 0], [0, 200, 255], [255, 0, 128], [128, 255, 0]]
    },
    accessibilityMode: false,  // Higher contrast, reduced motion when true
    audioEnabled: true,        // Sound generation for particles
    layerCount: 5,             // Number of concentric mandala layers
    rotationSpeed: 0.0003,     // Base rotation speed
  },
  
  // State management
  state: {
    particles: [],
    flowField: [],
    baseRadius: 0,
    currentRotation: 0,
    lastMousePos: { x: 0, y: 0 },
    mouseVelocity: { x: 0, y: 0 },
    frameCount: 0,
    hueOffset: 0,
    audioContext: null,
    audioNodes: [],
    savedStates: [],
    breathCycle: 0,
  },
  
  // Initialize the mandala
  setup() {
    createCanvas(windowWidth, windowHeight);
    colorMode(HSB, 360, 100, 100, 1);
    this.state.baseRadius = min(width, height) * 0.4;
    
    // Create UI elements
    this.createUI();
    
    // Initialize audio context on first user interaction
    document.addEventListener('click', () => {
      if (this.config.audioEnabled && !this.state.audioContext) {
        this.initAudio();
      }
    }, { once: true });
    
    // Create initial particles
    this.seedParticles(200);
    
    // Generate flow field for particle movement
    this.generateFlowField();
  },
  
  // Generate interactive UI elements
  createUI() {
    // Symmetry control
    let symmetrySlider = createSlider(3, 12, this.config.symmetry, 1);
    symmetrySlider.position(20, height - 50);
    symmetrySlider.style('width', '120px');
    symmetrySlider.input(() => {
      this.config.symmetry = symmetrySlider.value();
    });
    
    let symLabel = createP('Symmetry');
    symLabel.position(20, height - 70);
    symLabel.style('color', 'white');
    symLabel.style('font-family', 'Arial');
    
    // Accessibility toggle
    let a11yButton = createButton('Accessibility Mode');
    a11yButton.position(160, height - 50);
    a11yButton.mousePressed(() => {
      this.config.accessibilityMode = !this.config.accessibilityMode;
      a11yButton.style('background-color', this.config.accessibilityMode ? '#4CAF50' : '#f1f1f1');
    });
    
    // Save button
    let saveBtn = createButton('🔖 Save');
    saveBtn.position(width - 100, height - 50);
    saveBtn.mousePressed(() => {
      saveCanvas('Mandala', 'png');
      
      // Visual feedback
      let msg = createP('Mandala saved!');
      msg.position(width/2 - 50, height/2);
      msg.style('background-color', 'rgba(0,0,0,0.7)');
      msg.style('color', 'white');
      msg.style('padding', '10px');
      msg.style('border-radius', '5px');
      setTimeout(() => msg.remove(), 2000);
    });
    
    // Info button - shows context about mandalas
    let infoBtn = createButton('ℹ️ About Mandalas');
    infoBtn.position(width - 200, 20);
    infoBtn.mousePressed(() => this.showInfo());
  },
  
  showInfo() {
    let infoPanel = createDiv();
    infoPanel.html(`
      <h2>About Mandalas</h2>
      <p>Mandalas are sacred geometric patterns that represent the cosmos metaphysically or symbolically. 
      They originate from Hindu and Buddhist spiritual traditions.</p>
      <p>In various spiritual traditions, mandalas may be employed for focusing attention, as a spiritual 
      guidance tool, for establishing a sacred space, and as an aid to meditation.</p>
      <h3>Controls:</h3>
      <ul>
        <li>Click and drag to create particles</li>
        <li>Press SPACE to clear particles</li>
        <li>Adjust symmetry with the slider</li>
        <li>Toggle Accessibility Mode for reduced motion and higher contrast</li>
        <li>Press 'B' to toggle breathing guide</li>
      </ul>
      <button id="close-info">Close</button>
    `);
    infoPanel.style('position', 'absolute');
    infoPanel.style('top', '50%');
    infoPanel.style('left', '50%');
    infoPanel.style('transform', 'translate(-50%, -50%)');
    infoPanel.style('background-color', 'rgba(0,0,0,0.9)');
    infoPanel.style('color', 'white');
    infoPanel.style('padding', '20px');
    infoPanel.style('border-radius', '10px');
    infoPanel.style('max-width', '500px');
    infoPanel.style('font-family', 'Arial');
    
    let closeBtn = select('#close-info');
    closeBtn.mousePressed(() => infoPanel.remove());
  },
  
  // Generate initial particles
  seedParticles(count) {
    for (let i = 0; i < count; i++) {
      if (this.state.particles.length < this.config.maxParticles) {
        this.addParticle(
          random(-this.state.baseRadius, this.state.baseRadius),
          random(-this.state.baseRadius, this.state.baseRadius)
        );
      }
    }
  },
  
  // Add a new particle at the specified location
  addParticle(x, y) {
    // Calculate distance from center to avoid overcrowding the center
    let d = dist(0, 0, x, y);
    let minDist = this.state.baseRadius * 0.1;
    
    if (d < minDist) {
      // Normalize position to minimum distance
      let angle = atan2(y, x);
      x = cos(angle) * minDist;
      y = sin(angle) * minDist;
    }
    
    this.state.particles.push({
      pos: createVector(x, y),
      vel: p5.Vector.random2D().mult(random(0.2, 1.0)),
      size: random(3, 8),
      hue: random(360),
      life: 1.0,
      decay: random(0.001, 0.003),
      pulsePhase: random(TWO_PI),
      variant: floor(random(5)), // Aesthetic variant
    });
    
    // Create sound if audio is enabled
    if (this.config.audioEnabled && this.state.audioContext) {
      this.createTone(d / this.state.baseRadius);
    }
  },
  
  // Generate flow field for organic particle movement
  generateFlowField() {
    const resolution = 20;
    const cols = ceil(width / resolution);
    const rows = ceil(height / resolution);
    
    this.state.flowField = new Array(cols * rows);
    
    let xoff = 0;
    for (let x = 0; x < cols; x++) {
      let yoff = 0;
      for (let y = 0; y < rows; y++) {
        const angle = noise(xoff, yoff) * TWO_PI * 4;
        const v = p5.Vector.fromAngle(angle);
        v.setMag(0.1);
        this.state.flowField[x + y * cols] = v;
        yoff += 0.1;
      }
      xoff += 0.1;
    }
  },
  
  // Initialize audio system
  initAudio() {
    try {
      this.state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create master gain node
      this.masterGain = this.state.audioContext.createGain();
      this.masterGain.gain.value = 0.2; // Lower volume
      this.masterGain.connect(this.state.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported in this browser.');
      this.config.audioEnabled = false;
    }
  },
  
  // Create sound for a particle based on its position
  createTone(distanceRatio) {
    if (!this.state.audioContext) return;
    
    // Use a pentatonic scale for more harmonious sounds
    const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00]; // C, D, E, G, A
    
    // Create oscillator and gain nodes
    const osc = this.state.audioContext.createOscillator();
    const gainNode = this.state.audioContext.createGain();
    
    // Map distance to note selection
    const noteIndex = floor(map(distanceRatio, 0, 1, 0, pentatonic.length));
    const freq = pentatonic[noteIndex % pentatonic.length];
    
    // Configure oscillator
    osc.type = random() > 0.5 ? 'sine' : 'triangle';
    osc.frequency.value = freq;
    
    // Configure envelope
    const now = this.state.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2 * (1 - distanceRatio), now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1);
    
    // Connect and start
    osc.connect(gainNode);
    gainNode.connect(this.masterGain);
    osc.start();
    osc.stop(now + 1);
    
    // Clean up
    osc.onended = () => {
      gainNode.disconnect();
      osc.disconnect();
    };
  },
  
  // Main draw loop
  draw() {
    // Update state
    this.state.frameCount++;
    this.state.hueOffset = (this.state.hueOffset + 0.2) % 360;
    this.state.currentRotation += this.config.rotationSpeed;
    this.state.breathCycle = (this.state.breathCycle + 0.005) % 1;
    
    // Apply background with subtle fade for trails
    if (this.config.accessibilityMode) {
      // Solid background in accessibility mode
      background(...this.config.backgroundColor);
    } else {
      // Subtle fade effect
      background(...this.config.backgroundColor, 0.1);
    }
    
    // Translate to center
    translate(width / 2, height / 2);
    
    // Draw base mandala structure
    this.drawMandalaBase();
    
    // Draw breathing guide (if enabled with 'B' key)
    if (this.state.showBreathingGuide) {
      this.drawBreathingGuide();
    }
    
    // Update and draw particles
    this.updateParticles();
    
    // Draw UI instructions (if it's first load or recently activated)
    if (this.state.frameCount < 200 || frameCount % 600 === 0) {
      this.drawInstructions();
    }
  },
  
  // Draw the base geometric mandala patterns
  drawMandalaBase() {
    push();
    
    // Apply global rotation
    rotate(this.state.currentRotation);
    
    // Draw concentric layers
    for (let layer = 0; layer < this.config.layerCount; layer++) {
      push();
      
      // Alternate rotation direction by layer
      const layerRotation = (layer % 2 === 0) ? 
                             this.state.currentRotation * (layer + 1) : 
                            -this.state.currentRotation * (layer + 1);
      rotate(layerRotation);
      
      // Layer-specific properties
      const layerRadius = map(layer, 0, this.config.layerCount - 1, 
                             this.state.baseRadius * 0.2, 
                             this.state.baseRadius * 0.8);
      
      // Select colors based on accessibility mode
      const colorScheme = this.config.accessibilityMode ? 
                         this.config.colorSchemes.highContrast : 
                         this.config.colorSchemes.default;
      
      const layerColor = colorScheme[layer % colorScheme.length];
      
      // Draw geometric patterns
      noFill();
      strokeWeight(2);
      
      // Convert RGB to HSB for our color model
      const hsbColor = this.rgbToHsb(layerColor);
      
      // Add offset for animation
      const hue = (hsbColor[0] + this.state.hueOffset) % 360;
      stroke(hue, hsbColor[1], hsbColor[2], 0.6);
      
      // Draw sacred geometry-inspired pattern
      beginShape();
      const segments = this.config.accessibilityMode ? 60 : 120;
      const petalCount = layer * 2 + 3;
      for (let a = 0; a < TWO_PI; a += TWO_PI / segments) {
        // Create flower-like pattern with harmonic modulation
        const r = layerRadius + sin(a * petalCount + this.state.frameCount * 0.02) * (layerRadius * 0.2);
        const x = cos(a) * r;
        const y = sin(a) * r;
        vertex(x, y);
      }
      endShape(CLOSE);
      
      pop();
    }
    
    // Draw center mandala element
    this.drawCenterPattern();
    
    pop();
  },
  
  // Draw the central pattern of the mandala
  drawCenterPattern() {
    const centerSize = this.state.baseRadius * 0.15;
    
    // Draw lotus-inspired center
    push();
    rotate(-this.state.currentRotation * 2);
    
    for (let i = 0; i < this.config.symmetry; i++) {
      push();
      rotate(i * TWO_PI / this.config.symmetry);
      
      // Select color based on position in sequence
      const colorScheme = this.config.accessibilityMode ? 
                         this.config.colorSchemes.highContrast : 
                         this.config.colorSchemes.default;
      
      const petalColor = colorScheme[i % colorScheme.length];
      const hsbColor = this.rgbToHsb(petalColor);
      
      // Draw petal
      noStroke();
      fill(hsbColor[0], hsbColor[1], hsbColor[2], 0.8);
      
      beginShape();
      for (let t = -PI/2; t <= PI/2; t += 0.1) {
        // Create petal shape using polar coordinates
        const r = cos(t) * centerSize;
        const x = cos(t) * r;
        const y = sin(t) * r;
        vertex(x, y);
      }
      endShape(CLOSE);
      
      pop();
    }
    
    // Draw center circle
    noStroke();
    fill(this.state.hueOffset, 80, 90, 0.9);
    circle(0, 0, centerSize * 0.5);
    
    pop();
  },
  
  // Draw breathing guide for meditative experience
  drawBreathingGuide() {
    push();
    noFill();
    strokeWeight(2);
    
    // Map breath cycle to visual size
    // Full cycle: 0-0.5 inhale, 0.5-1 exhale
    let breathSize;
    if (this.state.breathCycle < 0.5) {
      // Inhale - grow
      breathSize = map(this.state.breathCycle, 0, 0.5, 50, 100);
    } else {
      // Exhale - shrink
      breathSize = map(this.state.breathCycle, 0.5, 1, 100, 50);
    }
    
    // Draw multiple concentric circles for the breathing guide
    for (let i = 0; i < 3; i++) {
      const alpha = map(i, 0, 2, 0.7, 0.2);
      stroke(0, 0, 100, alpha); // White with decreasing opacity
      circle(0, 0, breathSize + i * 10);
    }
    
    // Add text prompt
    fill(0, 0, 100, 0.8);
    noStroke();
    textAlign(CENTER);
    textSize(14);
    text(this.state.breathCycle < 0.5 ? "Inhale..." : "Exhale...", 0, breathSize/2 + 30);
    
    pop();
  },
  
  // Update particle positions and properties
  updateParticles() {
    // Create array for updated particles
    let updatedParticles = [];
    
    for (let i = 0; i < this.state.particles.length; i++) {
      let p = this.state.particles[i];
      
      // Update particle life
      p.life -= p.decay;
      
      // Skip dead particles
      if (p.life <= 0) continue;
      
      // Apply flow field influence
      let flowForce = this.getFlowForce(p.pos.x + width/2, p.pos.y + height/2);
      p.vel.add(flowForce);
      
      // Apply center attraction
      let toCenter = createVector(-p.pos.x, -p.pos.y);
      toCenter.setMag(0.01);
      p.vel.add(toCenter);
      
      // Limit velocity
      p.vel.limit(2);
      
      // Update position
      if (!this.config.accessibilityMode) {
        p.pos.add(p.vel);
      }
      
      // Draw particle with symmetry
      this.drawParticleWithSymmetry(p);
      
      // Keep particle for next frame
      updatedParticles.push(p);
    }
    
    // Update particles array
    this.state.particles = updatedParticles;
  },
  
  // Get flow field force at a given position
  getFlowForce(x, y) {
    const resolution = 20;
    const col = floor(constrain(x / resolution, 0, width / resolution - 1));
    const row = floor(constrain(y / resolution, 0, height / resolution - 1));
    const index = col + row * floor(width / resolution);
    
    // Return copy of vector to avoid modifying the original
    return this.state.flowField[index] ? this.state.flowField[index].copy() : createVector(0, 0);
  },
  
  // Draw a particle with radial symmetry
  drawParticleWithSymmetry(p) {
    push();
    
    // Apply global rotation offset
    rotate(this.state.currentRotation);
    
    // Draw all symmetric copies
    for (let i = 0; i < this.config.symmetry; i++) {
      // Rotate to create symmetry
      rotate(TWO_PI / this.config.symmetry);
      
      // Draw the particle
      this.drawSingleParticle(p);
      
      // Draw mirrored copy for more complexity
      push();
      scale(1, -1);
      this.drawSingleParticle(p);
      pop();
    }
    
    pop();
  },
  
  // Draw a single particle
  drawSingleParticle(p) {
    // Calculate pulse effect
    const pulseRate = 0.05;
    const pulseAmount = 0.2 * sin(p.pulsePhase + this.state.frameCount * pulseRate);
    
    // Prepare color and alpha
    const alpha = p.life * 0.8;
    
    // Use direct HSB values
    fill(p.hue, 80, 95, alpha);
    noStroke();
    
    // Draw shape based on variant
    if (p.variant === 0) {
      // Circle
      circle(p.pos.x, p.pos.y, p.size * (1 + pulseAmount));
    } else if (p.variant === 1) {
      // Square
      push();
      translate(p.pos.x, p.pos.y);
      rotate(this.state.frameCount * 0.01);
      rectMode(CENTER);
      rect(0, 0, p.size * (1 + pulseAmount), p.size * (1 + pulseAmount));
      pop();
    } else {
      // Star/flower
      push();
      translate(p.pos.x, p.pos.y);
      rotate(this.state.frameCount * 0.01);
      
      const points = 5;
      beginShape();
      for (let j = 0; j < TWO_PI; j += TWO_PI / points) {
        const r1 = p.size/2 * (1 + pulseAmount);
        const r2 = p.size/4 * (1 + pulseAmount);
        const x1 = cos(j) * r1;
        const y1 = sin(j) * r1;
        vertex(x1, y1);
        
        const x2 = cos(j + TWO_PI / (2 * points)) * r2;
        const y2 = sin(j + TWO_PI / (2 * points)) * r2;
        vertex(x2, y2);
      }
      endShape(CLOSE);
      pop();
    }
  },
  
  // Draw UI instructions
  drawInstructions() {
    push();
    resetMatrix(); // Reset to top-left origin
    
    fill(255, 255, 255, 0.8);
    textSize(16);
    textAlign(CENTER);
    text("Click and drag to create particles", width/2, 40);
    text("Press SPACE to clear, 'B' to toggle breathing guide", width/2, 70);
    
    pop();
  },
  
  // Handle mouse/touch interaction
  interact(x, y, strength) {
    // Convert to mandala coordinate system
    const relX = x - width/2;
    const relY = y - height/2;
    
    // Calculate velocity for more dynamic interaction
    const velX = x - this.state.lastMousePos.x;
    const velY = y - this.state.lastMousePos.y;
    this.state.mouseVelocity = {x: velX, y: velY};
    
    // Add particles based on mouse velocity and strength
    const speed = sqrt(velX*velX + velY*velY);
    const particleCount = map(speed * strength, 0, 50, 1, 5);
    
    for (let i = 0; i < particleCount; i++) {
      // Add some randomness around cursor position
      const offsetX = random(-10, 10);
      const offsetY = random(-10, 10);
      this.addParticle(relX + offsetX, relY + offsetY);
    }
    
    // Update last mouse position
    this.state.lastMousePos = {x, y};
  },
  
  // Convert RGB color to HSB for our color model
  rgbToHsb(rgb) {
    // Simple conversion - not perfect but works for our needs
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    let h, s, v = max;
    
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    
    if (max === min) {
      h = 0;
    } else {
      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else {
        h = (r - g) / d + 4;
      }
      h *= 60;
    }
    
    return [h, s * 100, v * 100];
  },
  
  // Handle window resize
  windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    this.state.baseRadius = min(width, height) * 0.4;
    
    // Regenerate flow field for new dimensions
    this.generateFlowField();
  },
  
  // Handle keyboard input
  keyPressed() {
    if (key === ' ') {
      // Clear all particles on spacebar
      this.state.particles = [];
    } else if (key === 'b' || key === 'B') {
      // Toggle breathing guide
      this.state.showBreathingGuide = !this.state.showBreathingGuide;
    }
  }
};

// p5.js core functions
function setup() {
  mandala.setup();
}

function draw() {
  mandala.draw();
}

function mouseDragged() {
  mandala.interact(mouseX, mouseY, 1.0);
  return false; // Prevents default
}

function touchMoved() {
  mandala.interact(touches[0].x, touches[0].y, 1.0);
  return false; // Prevents default
}

function windowResized() {
  mandala.windowResized();
}

function keyPressed() {
  mandala.keyPressed();
}