let gameCanvas;
let cardImages = {};
let gameState;
let mainFont;
let dragInfo = null;
let animations = [];
let audioSystem;
let lastFrameTime = 0;
let gameStarted = false;
let undoHistory = [];

// Constants
const CARD_WIDTH = 70;
const CARD_HEIGHT = 100;
const CARD_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_SUITS = ['♥', '♦', '♠', '♣'];
const COLORS = {
  RED: '#D40000',
  BLACK: '#000000',
  BACKGROUND: '#276834',
  HIGHLIGHT: '#FFFF00',
  TEXT: '#FFFFFF'
};

// Game initialization
function preload() {
  try {
    mainFont = loadFont('https://cdn.jsdelivr.net/npm/source-sans-pro@3.6.0/TTF/SourceSansPro-Regular.ttf');
  } catch(e) {
    console.warn("Failed to load main font, will use fallback font");
  }
}

function setup() {
  gameCanvas = createCanvas(800, 600);
  // Setup fallback font if primary load failed
  if (!mainFont) {
    try {
      mainFont = loadFont('https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf');
    } catch(e) {
      console.warn("Failed to load fallback font, will use system font");
      textFont('sans-serif');
    }
  } else {
    textFont(mainFont);
  }
  
  initializeAudioSystem();
  createCardGraphics();
  initializeGame();
  
  // Handle window events
  window.addEventListener('resize', windowResizeHandler);
}

function windowResizeHandler() {
  // Adjust layout if needed
  const containerWidth = windowWidth > 800 ? 800 : windowWidth - 20;
  const containerHeight = windowHeight > 600 ? 600 : windowHeight - 20;
  resizeCanvas(containerWidth, containerHeight);
}

function initializeAudioSystem() {
  try {
    audioSystem = {
      enabled: true,
      
      // Synthesize sounds to avoid external dependencies
      playCardPlace: function() {
        if (!this.enabled) return;
        
        const osc = new p5.Oscillator('sine');
        const env = new p5.Envelope();
        env.setADSR(0.001, 0.1, 0.1, 0.1);
        env.setRange(0.3, 0);
        osc.amp(env);
        osc.freq(220);
        osc.start();
        env.play();
        setTimeout(() => osc.stop(), 300);
      },
      
      playCardFlip: function() {
        if (!this.enabled) return;
        
        const osc = new p5.Oscillator('triangle');
        const env = new p5.Envelope();
        env.setADSR(0.001, 0.05, 0, 0.1);
        env.setRange(0.2, 0);
        osc.amp(env);
        osc.freq(440);
        osc.start();
        env.play();
        setTimeout(() => osc.stop(), 200);
      },
      
      playInvalidMove: function() {
        if (!this.enabled) return;
        
        const osc = new p5.Oscillator('square');
        const env = new p5.Envelope();
        env.setADSR(0.001, 0.1, 0, 0.1);
        env.setRange(0.2, 0);
        osc.amp(env);
        osc.freq(110);
        osc.start();
        env.play();
        setTimeout(() => osc.stop(), 300);
      },
      
      playWin: function() {
        if (!this.enabled) return;
        
        const notes = [262, 330, 392, 523];
        
        notes.forEach((note, i) => {
          setTimeout(() => {
            const osc = new p5.Oscillator('sine');
            const env = new p5.Envelope();
            env.setADSR(0.001, 0.1, 0.1, 0.3);
            env.setRange(0.3, 0);
            osc.amp(env);
            osc.freq(note);
            osc.start();
            env.play();
            setTimeout(() => osc.stop(), 500);
          }, i * 150);
        });
      },
      
      toggleSound: function() {
        this.enabled = !this.enabled;
        return this.enabled;
      }
    };
  } catch(e) {
    console.warn("Audio system failed to initialize, continuing without sound", e);
    audioSystem = {
      enabled: false,
      playCardPlace: function() {},
      playCardFlip: function() {},
      playInvalidMove: function() {},
      playWin: function() {},
      toggleSound: function() { return false; }
    };
  }
}

function createCardGraphics() {
  // Generate card graphics procedurally
  const createCardImage = (rank, suit) => {
    let isFaceCard = rank === 'J' || rank === 'Q' || rank === 'K';
    let isRed = suit === '♥' || suit === '♦';
    let cardColor = isRed ? COLORS.RED : COLORS.BLACK;
    
    let cardGraphic = createGraphics(CARD_WIDTH, CARD_HEIGHT);
    cardGraphic.fill(255);
    cardGraphic.stroke(0);
    cardGraphic.strokeWeight(1);
    cardGraphic.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, 5);
    
    cardGraphic.fill(cardColor);
    cardGraphic.textSize(16);
    cardGraphic.textAlign(LEFT, TOP);
    cardGraphic.text(rank + suit, 5, 5);
    
    cardGraphic.textAlign(RIGHT, BOTTOM);
    cardGraphic.text(rank + suit, CARD_WIDTH - 5, CARD_HEIGHT - 5);
    
    // Draw card center design
    cardGraphic.textAlign(CENTER, CENTER);
    cardGraphic.textSize(32);
    
    if (isFaceCard) {
      // Simple face card design
      cardGraphic.textSize(24);
      cardGraphic.text(rank + suit, CARD_WIDTH / 2, CARD_HEIGHT / 2);
    } else if (rank === 'A') {
      // Ace design
      cardGraphic.textSize(36);
      cardGraphic.text(suit, CARD_WIDTH / 2, CARD_HEIGHT / 2);
    } else {
      // Number card pattern
      let value = parseInt(rank);
      if (isNaN(value)) value = 10; // Handle 10, J, Q, K
      
      const positions = getPositionsForRank(value);
      cardGraphic.textSize(16);
      
      positions.forEach(pos => {
        cardGraphic.text(suit, CARD_WIDTH * pos.x, CARD_HEIGHT * pos.y);
      });
    }
    
    return cardGraphic;
  };
  
  // Create card back image
  cardImages.back = createGraphics(CARD_WIDTH, CARD_HEIGHT);
  cardImages.back.fill(255);
  cardImages.back.stroke(0);
  cardImages.back.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, 5);
  cardImages.back.fill(50, 50, 180);
  cardImages.back.rect(5, 5, CARD_WIDTH - 10, CARD_HEIGHT - 10, 3);
  cardImages.back.stroke(255, 255, 255, 120);
  cardImages.back.noFill();
  for (let i = 0; i < 6; i++) {
    cardImages.back.rect(10 + i*2, 10 + i*2, CARD_WIDTH - 20 - i*4, CARD_HEIGHT - 20 - i*4, 2);
  }
  
  // Generate all card images
  CARD_SUITS.forEach(suit => {
    CARD_RANKS.forEach(rank => {
      const key = rank + suit;
      cardImages[key] = createCardImage(rank, suit);
    });
  });
}

function getPositionsForRank(rank) {
  // Return relative positions (0-1) for suit symbols based on card rank
  switch(rank) {
    case 1: return [{x: 0.5, y: 0.5}];
    case 2: return [{x: 0.5, y: 0.25}, {x: 0.5, y: 0.75}];
    case 3: return [{x: 0.5, y: 0.25}, {x: 0.5, y: 0.5}, {x: 0.5, y: 0.75}];
    case 4: return [{x: 0.3, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.3, y: 0.75}, {x: 0.7, y: 0.75}];
    case 5: return [{x: 0.3, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.5, y: 0.5}, {x: 0.3, y: 0.75}, {x: 0.7, y: 0.75}];
    case 6: return [{x: 0.3, y: 0.25}, {x: 0.7, y: 0.25}, {x: 0.3, y: 0.5}, {x: 0.7, y: 0.5}, {x: 0.3, y: 0.75}, {x: 0.7, y: 0.75}];
    case 7: return [{x: 0.3, y: 0.2}, {x: 0.7, y: 0.2}, {x: 0.5, y: 0.35}, {x: 0.3, y: 0.5}, {x: 0.7, y: 0.5}, {x: 0.3, y: 0.8}, {x: 0.7, y: 0.8}];
    case 8: return [{x: 0.3, y: 0.2}, {x: 0.7, y: 0.2}, {x: 0.5, y: 0.35}, {x: 0.3, y: 0.5}, {x: 0.7, y: 0.5}, {x: 0.5, y: 0.65}, {x: 0.3, y: 0.8}, {x: 0.7, y: 0.8}];
    case 9: return [{x: 0.3, y: 0.2}, {x: 0.7, y: 0.2}, {x: 0.3, y: 0.4}, {x: 0.7, y: 0.4}, {x: 0.5, y: 0.5}, {x: 0.3, y: 0.6}, {x: 0.7, y: 0.6}, {x: 0.3, y: 0.8}, {x: 0.7, y: 0.8}];
    case 10: return [{x: 0.3, y: 0.2}, {x: 0.7, y: 0.2}, {x: 0.5, y: 0.3}, {x: 0.3, y: 0.4}, {x: 0.7, y: 0.4}, {x: 0.3, y: 0.6}, {x: 0.7, y: 0.6}, {x: 0.5, y: 0.7}, {x: 0.3, y: 0.8}, {x: 0.7, y: 0.8}];
    default: return [{x: 0.5, y: 0.5}];
  }
}

function initializeGame() {
  try {
    // Create and save initial game state for potential reset
    gameState = createNewGameState();
    saveGameState();
    gameStarted = true;
  } catch(e) {
    console.error("Failed to initialize game, retrying...", e);
    // Retry initialization once
    try {
      gameState = createNewGameState();
      saveGameState();
      gameStarted = true;
    } catch(retryError) {
      console.error("Game initialization failed after retry", retryError);
      gameState = createEmergencyGameState();
    }
  }
}

function createEmergencyGameState() {
  // Minimal game state to prevent complete failure
  return {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    moveCount: 0,
    startTime: millis(),
    gameWon: false,
    errorState: true,
    message: "Game initialization failed. Please refresh the page."
  };
}

function createNewGameState() {
  // Create a new deck of cards
  let deck = [];
  
  for (let suit of CARD_SUITS) {
    for (let i = 0; i < CARD_RANKS.length; i++) {
      const rank = CARD_RANKS[i];
      const value = i + 1;
      const color = (suit === '♥' || suit === '♦') ? 'red' : 'black';
      
      deck.push({
        id: rank + suit,
        rank: rank,
        suit: suit,
        value: value,
        color: color,
        faceUp: false,
        x: 0,
        y: 0
      });
    }
  }
  
  // Shuffle deck
  shuffleDeck(deck);
  
  // Initialize game areas
  let tableau = Array(7).fill().map(() => []);
  
  // Deal cards to tableau
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j <= i; j++) {
      const card = deck.pop();
      card.faceUp = j === i; // Only the top card is face up
      tableau[i].push(card);
    }
  }
  
  return {
    stock: deck,
    waste: [],
    foundations: [[], [], [], []],
    tableau: tableau,
    moveCount: 0,
    startTime: millis(),
    gameWon: false
  };
}

function shuffleDeck(deck) {
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function saveGameState() {
  try {
    // Deep clone current state and add to history
    undoHistory.push(JSON.parse(JSON.stringify(gameState)));
    
    // Limit history size to prevent memory issues
    if (undoHistory.length > 50) {
      undoHistory.shift();
    }
  } catch(e) {
    console.warn("Failed to save game state for undo", e);
  }
}

function undoMove() {
  if (undoHistory.length <= 1) return false;
  
  try {
    // Remove current state
    undoHistory.pop();
    // Restore previous state
    gameState = JSON.parse(JSON.stringify(undoHistory[undoHistory.length - 1]));
    return true;
  } catch(e) {
    console.error("Failed to undo move", e);
    return false;
  }
}

function draw() {
  // Calculate delta time for smooth animations
  const currentTime = millis();
  const deltaTime = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  
  background(COLORS.BACKGROUND);
  
  if (!gameStarted) {
    drawLoadingScreen();
    return;
  }
  
  if (gameState.errorState) {
    drawErrorScreen();
    return;
  }
  
  // Update animations
  updateAnimations(deltaTime);
  
  // Draw game elements
  drawStock();
  drawWaste();
  drawFoundations();
  drawTableau();
  drawUI();
  
  // Draw any cards being dragged
  if (dragInfo) {
    drawDraggedCards();
  }
  
  // Check win condition
  if (checkWinCondition() && !gameState.gameWon) {
    gameState.gameWon = true;
    audioSystem.playWin();
  }
  
  // Draw win overlay if game is won
  if (gameState.gameWon) {
    drawWinScreen();
  }
}

function drawLoadingScreen() {
  fill(COLORS.TEXT);
  textSize(24);
  textAlign(CENTER, CENTER);
  text("Loading Solitaire...", width/2, height/2);
}

function drawErrorScreen() {
  fill(COLORS.TEXT);
  textSize(24);
  textAlign(CENTER, CENTER);
  text(gameState.message || "An error occurred", width/2, height/2);
  
  textSize(16);
  text("Click to restart game", width/2, height/2 + 40);
}

function drawStock() {
  // Draw stock pile outline
  strokeWeight(1);
  stroke(255, 255, 255, 50);
  noFill();
  rect(50, 50, CARD_WIDTH, CARD_HEIGHT, 5);
  
  // Draw stock cards
  if (gameState.stock.length > 0) {
    image(cardImages.back, 50, 50);
    
    // Show count
    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    text(gameState.stock.length, 50 + CARD_WIDTH/2, 50 + CARD_HEIGHT + 15);
  }
}

function drawWaste() {
  // Draw waste pile outline
  strokeWeight(1);
  stroke(255, 255, 255, 50);
  noFill();
  rect(140, 50, CARD_WIDTH, CARD_HEIGHT, 5);
  
  // Draw waste cards (showing up to 3 cards)
  if (gameState.waste.length > 0) {
    const count = gameState.waste.length;
    const maxVisible = 3;
    const startIdx = Math.max(0, count - maxVisible);
    
    for (let i = startIdx; i < count; i++) {
      const card = gameState.waste[i];
      const offset = (i - startIdx) * 20;
      card.x = 140 + offset;
      card.y = 50;
      card.faceUp = true;
      
      image(cardImages[card.id], card.x, card.y);
    }
  }
}

function drawFoundations() {
  // Draw foundation piles
  for (let i = 0; i < 4; i++) {
    const x = 300 + i * (CARD_WIDTH + 20);
    
    // Draw outline
    strokeWeight(1);
    stroke(255, 255, 255, 50);
    noFill();
    rect(x, 50, CARD_WIDTH, CARD_HEIGHT, 5);
    
    // Draw suit indicator for empty foundation
    if (gameState.foundations[i].length === 0) {
      fill(255, 255, 255, 100);
      textAlign(CENTER, CENTER);
      textSize(24);
      text(CARD_SUITS[i], x + CARD_WIDTH/2, 50 + CARD_HEIGHT/2);
    } else {
      // Draw top card
      const card = gameState.foundations[i][gameState.foundations[i].length - 1];
      card.x = x;
      card.y = 50;
      
      image(cardImages[card.id], x, 50);
    }
  }
}

function drawTableau() {
  // Draw tableau piles
  for (let i = 0; i < 7; i++) {
    const x = 50 + i * (CARD_WIDTH + 15);
    let y = 180;
    
    // Draw outline for empty pile
    strokeWeight(1);
    stroke(255, 255, 255, 50);
    noFill();
    rect(x, y, CARD_WIDTH, CARD_HEIGHT, 5);
    
    // Draw cards in pile
    const pile = gameState.tableau[i];
    
    for (let j = 0; j < pile.length; j++) {
      const card = pile[j];
      card.x = x;
      card.y = y;
      
      if (card.faceUp) {
        image(cardImages[card.id], x, y);
      } else {
        image(cardImages.back, x, y);
      }
      
      y += 20; // Vertical offset for next card
    }
  }
}

function drawUI() {
  // Draw move counter
  fill(COLORS.TEXT);
  textAlign(LEFT, CENTER);
  textSize(16);
  text(`Moves: ${gameState.moveCount}`, 50, 30);
  
  // Draw timer
  const elapsedSeconds = Math.floor((millis() - gameState.startTime) / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeText = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  text(timeText, 150, 30);
  
  // Draw buttons
  drawButton("New Game", 650, 30, 100, 30, initializeGame);
  drawButton("Undo", 650, 70, 100, 30, undoMove);
  drawButton(audioSystem.enabled ? "Sound: ON" : "Sound: OFF", 650, 110, 100, 30, toggleSound);
}

function drawButton(label, x, y, w, h, clickHandler) {
  const hover = mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h;
  
  // Store button info for click handling
  if (!window.buttons) window.buttons = [];
  
  const existingButton = window.buttons.find(b => b.label === label);
  if (existingButton) {
    existingButton.x = x;
    existingButton.y = y;
    existingButton.w = w;
    existingButton.h = h;
    existingButton.handler = clickHandler;
  } else {
    window.buttons.push({label, x, y, w, h, handler: clickHandler});
  }
  
  // Draw button
  noStroke();
  fill(hover ? 150 : 100);
  rect(x, y, w, h, 5);
  
  fill(COLORS.TEXT);
  textAlign(CENTER, CENTER);
  textSize(14);
  text(label, x + w/2, y + h/2);
}

function toggleSound() {
  return audioSystem.toggleSound();
}

function drawDraggedCards() {
  // Draw cards being dragged
  const cards = dragInfo.cards;
  
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    image(cardImages[card.id], mouseX - dragInfo.offsetX, mouseY - dragInfo.offsetY + (i * 20));
  }
}

function drawWinScreen() {
  // Semi-transparent overlay
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  // Win message
  fill(255, 255, 100);
  textSize(48);
  textAlign(CENTER, CENTER);
  text("You Win!", width/2, height/2 - 50);
  
  // Stats
  const elapsedSeconds = Math.floor((millis() - gameState.startTime) / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  
  fill(255);
  textSize(24);
  text(`Time: ${minutes}:${seconds.toString().padStart(2, '0')}`, width/2, height/2);
  text(`Moves: ${gameState.moveCount}`, width/2, height/2 + 40);
  
  // Play again button
  drawButton("Play Again", width/2 - 60, height/2 + 100, 120, 40, initializeGame);
}

// Animation system
function updateAnimations(deltaTime) {
  for (let i = animations.length - 1; i >= 0; i--) {
    const anim = animations[i];
    anim.elapsed += deltaTime;
    
    const progress = Math.min(anim.elapsed / anim.duration, 1.0);
    anim.update(progress);
    
    if (progress >= 1.0) {
      anim.complete();
      animations.splice(i, 1);
    }
  }
}

function animateCard(card, targetX, targetY, duration = 200, onComplete) {
  const startX = card.x;
  const startY = card.y;
  
  animations.push({
    elapsed: 0,
    duration: duration,
    update: (progress) => {
      // Easing function for smoother motion
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      card.x = startX + (targetX - startX) * easedProgress;
      card.y = startY + (targetY - startY) * easedProgress;
    },
    complete: () => {
      card.x = targetX;
      card.y = targetY;
      if (onComplete) onComplete();
    }
  });
}

// Game logic
function checkWinCondition() {
  // Game is won when all foundation piles have 13 cards
  return gameState.foundations.every(pile => pile.length === 13);
}

function isValidTableauMove(targetPile, movingCard) {
  if (targetPile.length === 0) {
    // Empty piles can only accept kings
    return movingCard.rank === 'K';
  }
  
  const targetCard = targetPile[targetPile.length - 1];
  
  // Cards must be of alternate colors and descending values
  if (!targetCard.faceUp) return false;
  
  const targetValue = targetCard.value;
  const movingValue = movingCard.value;
  
  return (targetCard.color !== movingCard.color && targetValue === movingValue + 1);
}

function isValidFoundationMove(foundationPile, card) {
  if (foundationPile.length === 0) {
    // Empty foundation can only accept Aces
    return card.rank === 'A';
  }
  
  const topCard = foundationPile[foundationPile.length - 1];
  
  // Cards must be same suit and ascending values
  return (topCard.suit === card.suit && topCard.value === card.value - 1);
}

// Input handling
function mousePressed() {
  // Handle button clicks
  if (window.buttons) {
    for (const button of window.buttons) {
      if (mouseX >= button.x && mouseX <= button.x + button.w && 
          mouseY >= button.y && mouseY <= button.y + button.h) {
        button.handler();
        return;
      }
    }
  }
  
  if (gameState.errorState) {
    initializeGame();
    return;
  }
  
  if (gameState.gameWon) return;
  
  // Check if clicked on stock pile
  if (mouseX >= 50 && mouseX <= 50 + CARD_WIDTH && 
      mouseY >= 50 && mouseY <= 50 + CARD_HEIGHT) {
    drawFromStock();
    return;
  }
  
  // Check if clicked on waste to drag
  if (gameState.waste.length > 0) {
    const topCard = gameState.waste[gameState.waste.length - 1];
    if (mouseX >= topCard.x && mouseX <= topCard.x + CARD_WIDTH && 
        mouseY >= topCard.y && mouseY <= topCard.y + CARD_HEIGHT) {
      startDrag([topCard], 'waste', mouseX - topCard.x, mouseY - topCard.y);
      return;
    }
  }
  
  // Check if clicked on foundation to drag
  for (let i = 0; i < 4; i++) {
    const pile = gameState.foundations[i];
    if (pile.length === 0) continue;
    
    const topCard = pile[pile.length - 1];
    if (mouseX >= topCard.x && mouseX <= topCard.x + CARD_WIDTH && 
        mouseY >= topCard.y && mouseY <= topCard.y + CARD_HEIGHT) {
      startDrag([topCard], {type: 'foundation', index: i}, mouseX - topCard.x, mouseY - topCard.y);
      return;
    }
  }
  
  // Check if clicked on tableau cards
  for (let i = 0; i < 7; i++) {
    const pile = gameState.tableau[i];
    if (pile.length === 0) continue;
    
    for (let j = pile.length - 1; j >= 0; j--) {
      const card = pile[j];
      if (mouseX >= card.x && mouseX <= card.x + CARD_WIDTH && 
          mouseY >= card.y && mouseY <= card.y + CARD_HEIGHT) {
        
        if (card.faceUp) {
          // Drag this card and all cards on top of it
          const cardsToMove = pile.slice(j);
          startDrag(cardsToMove, {type: 'tableau', index: i, cardIndex: j}, 
                   mouseX - card.x, mouseY - card.y);
        } else if (j === pile.length - 1) {
          // Flip the card if it's the top card
          card.faceUp = true;
          audioSystem.playCardFlip();
          gameState.moveCount++;
          saveGameState();
        }
        return;
      }
    }
  }
}

function startDrag(cards, source, offsetX, offsetY) {
  dragInfo = {
    cards: cards,
    source: source,
    offsetX: offsetX,
    offsetY: offsetY
  };
  
  // Remove cards from source
  if (source === 'waste') {
    gameState.waste.pop();
  } else if (source.type === 'foundation') {
    gameState.foundations[source.index].pop();
  } else if (source.type === 'tableau') {
    gameState.tableau[source.index] = gameState.tableau[source.index].slice(0, source.cardIndex);
  }
}

function mouseDragged() {
  // Nothing to do if not dragging
  if (!dragInfo) return;
}

function mouseReleased() {
  if (!dragInfo) return;
  
  let moved = false;
  
  // Check for drop on foundation
  for (let i = 0; i < 4; i++) {
    const x = 300 + i * (CARD_WIDTH + 20);
    
    if (mouseX >= x && mouseX <= x + CARD_WIDTH && 
        mouseY >= 50 && mouseY <= 50 + CARD_HEIGHT) {
      
      // Can only move one card to foundation
      if (dragInfo.cards.length === 1) {
        const card = dragInfo.cards[0];
        
        if (isValidFoundationMove(gameState.foundations[i], card)) {
          gameState.foundations[i].push(card);
          moved = true;
          audioSystem.playCardPlace();
        }
      }
      break;
    }
  }
  
  // Check for drop on tableau
  if (!moved) {
    for (let i = 0; i < 7; i++) {
      const x = 50 + i * (CARD_WIDTH + 15);
      const pile = gameState.tableau[i];
      const y = 180 + (pile.length > 0 ? (pile.length - 1) * 20 : 0);
      
      if (mouseX >= x && mouseX <= x + CARD_WIDTH && 
          mouseY >= y && mouseY <= y + CARD_HEIGHT + 40) {
        
        const card = dragInfo.cards[0];
        
        if (isValidTableauMove(pile, card)) {
          // Add all dragged cards to this pile
          gameState.tableau[i] = gameState.tableau[i].concat(dragInfo.cards);
          moved = true;
          audioSystem.playCardPlace();
        }
        break;
      }
    }
  }
  
  // If no valid move, return cards to source
  if (!moved) {
    returnCardsToPreviousPosition();
    audioSystem.playInvalidMove();
  } else {
    // Increment move counter and save state
    gameState.moveCount++;
    saveGameState();
    
    // Check if any tableau needs to flip a card
    for (let i = 0; i < 7; i++) {
      const pile = gameState.tableau[i];
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        audioSystem.playCardFlip();
      }
    }
  }
  
  // Clear drag info
  dragInfo = null;
}

function returnCardsToPreviousPosition() {
  const cards = dragInfo.cards;
  const source = dragInfo.source;
  
  if (source === 'waste') {
    gameState.waste.push(cards[0]);
  } else if (source.type === 'foundation') {
    gameState.foundations[source.index].push(cards[0]);
  } else if (source.type === 'tableau') {
    gameState.tableau[source.index] = gameState.tableau[source.index].concat(cards);
  }
}

function drawFromStock() {
  // Save state before making a move
  saveGameState();
  
  if (gameState.stock.length > 0) {
    // Draw one card from stock to waste
    const card = gameState.stock.pop();
    card.faceUp = true;
    gameState.waste.push(card);
    audioSystem.playCardFlip();
  } else if (gameState.waste.length > 0) {
    // Reset stock from waste when stock is empty
    while (gameState.waste.length > 0) {
      const card = gameState.waste.pop();
      card.faceUp = false;
      gameState.stock.push(card);
    }
    audioSystem.playCardFlip();
  }
  
  gameState.moveCount++;
}

// Auto-completion for end game (double-click foundation)
function mouseClicked() {
  // Auto-complete if double-clicked on a foundation
  for (let i = 0; i < 4; i++) {
    const x = 300 + i * (CARD_WIDTH + 20);
    
    if (mouseX >= x && mouseX <= x + CARD_WIDTH && 
        mouseY >= 50 && mouseY <= 50 + CARD_HEIGHT) {
      
      if (isAutoCompleteAvailable()) {
        autoCompleteGame();
      }
      break;
    }
  }
}

function isAutoCompleteAvailable() {
  // Auto-complete is available when all cards are face up
  // and no cards remain in the stock
  if (gameState.stock.length > 0 || gameState.waste.length > 0) {
    return false;
  }
  
  for (let i = 0; i < 7; i++) {
    const pile = gameState.tableau[i];
    for (let j = 0; j < pile.length; j++) {
      if (!pile[j].faceUp) {
        return false;
      }
    }
  }
  
  return true;
}

function autoCompleteGame() {
  // Find one valid move to a foundation
  let foundMove = false;
  
  // First check waste pile
  if (gameState.waste.length > 0) {
    const card = gameState.waste[gameState.waste.length - 1];
    
    for (let i = 0; i < 4; i++) {
      if (isValidFoundationMove(gameState.foundations[i], card)) {
        // Animate the move
        animateCardToFoundation(card, 'waste', null, i);
        foundMove = true;
        break;
      }
    }
  }
  
  // Then check tableau piles
  if (!foundMove) {
    for (let i = 0; i < 7; i++) {
      const pile = gameState.tableau[i];
      if (pile.length === 0) continue;
      
      const card = pile[pile.length - 1];
      
      for (let j = 0; j < 4; j++) {
        if (isValidFoundationMove(gameState.foundations[j], card)) {
          // Animate the move
          animateCardToFoundation(card, 'tableau', i, j);
          foundMove = true;
          break;
        }
      }
      
      if (foundMove) break;
    }
  }
  
  if (!foundMove) {
    // No more valid moves to foundation
    return;
  }
}

function animateCardToFoundation(card, sourceType, sourceIndex, targetFoundation) {
  // Remove card from source
  if (sourceType === 'waste') {
    gameState.waste.pop();
  } else {
    gameState.tableau[sourceIndex].pop();
  }
  
  // Animate card to foundation
  const targetX = 300 + targetFoundation * (CARD_WIDTH + 20);
  const targetY = 50;
  
  animateCard(card, targetX, targetY, 300, () => {
    // Add card to foundation
    gameState.foundations[targetFoundation].push(card);
    gameState.moveCount++;
    audioSystem.playCardPlace();
    saveGameState();
    
    // Continue auto-complete if game not won
    if (!checkWinCondition()) {
      setTimeout(autoCompleteGame, 100);
    } else {
      gameState.gameWon = true;
      audioSystem.playWin();
    }
  });
}