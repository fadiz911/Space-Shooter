const shuttle = document.getElementById('shuttle');
const gameContainer = document.querySelector('.game-container');
const gameOverText = document.getElementById('game-over');
const scoreDisplay = document.getElementById('score');
const menuScreen = document.getElementById('menu-screen');
const startButton = document.getElementById('start-button');

// Game state
const gameState = {
  isGameOver: false,
  gameStarted: false,
  score: 0,
  shuttleSpeed: 10,
  keysPressed: {},
  asteroidInterval: null,
  currentShootSound: 0,
  powerups: {
    rapidFire: false,
    shield: false,
  },
  powerupTimers: {},
  asteroidSpeed: 5,
  powerupSpeed: 5
};

// Audio pool for shooting sounds
const shootSounds = Array(4).fill().map(() => new Audio('Data/shoot.mp3'));

// Initial setup
menuScreen.style.display = 'flex';
gameContainer.style.display = 'none';
startButton.addEventListener('click', startGame);

function startGame() {
  Object.assign(gameState, {
    gameStarted: true,
    isGameOver: false,
    score: 0,
    powerups: {
      rapidFire: false,
      shield: false,
    }
  });
  
  scoreDisplay.textContent = `Score: ${gameState.score}`;
  menuScreen.style.display = 'none';
  gameContainer.style.display = 'flex';

  // Center shuttle
  shuttle.style.left = `${(gameContainer.clientWidth - shuttle.clientWidth) / 2}px`;

  // Cleanup
  document.querySelectorAll('.asteroid, .bullet, .powerup').forEach(el => el.remove());

  // Start game loop
  gameState.asteroidInterval = setInterval(createAsteroid, 1000);
  gameState.powerupInterval = setInterval(createPowerup, 10000);
  requestAnimationFrame(moveShuttle);
}

// Input handling
const handleKeyPress = (pressed) => (e) => {
  if (['ArrowLeft', 'ArrowRight'].includes(e.key) && gameState.gameStarted && !gameState.isGameOver) {
    if (pressed) e.preventDefault();
    gameState.keysPressed[e.key] = pressed;
  }
};

document.addEventListener('keydown', handleKeyPress(true));
document.addEventListener('keyup', handleKeyPress(false));

function moveShuttle() {
  if (!gameState.gameStarted || gameState.isGameOver) return;

  const currentLeft = parseInt(window.getComputedStyle(shuttle).left);
  const movement = (gameState.keysPressed['ArrowRight'] - gameState.keysPressed['ArrowLeft']) * gameState.shuttleSpeed;
  
  // Update position with boundary constraints
  shuttle.style.left = `${Math.max(0, Math.min(currentLeft + movement, gameContainer.clientWidth - shuttle.clientWidth))}px`;
  
  requestAnimationFrame(moveShuttle);
}

// Shooting mechanics
document.addEventListener('keydown', (e) => {
  if (e.key === ' ' && gameState.gameStarted && !gameState.isGameOver) {
    shootBullet();
  }
});

function shootBullet() {
  if (gameState.isGameOver) return;

  // Sound handling
  const sound = shootSounds[gameState.currentShootSound];
  sound.currentTime = 0;
  sound.play();
  gameState.currentShootSound = (gameState.currentShootSound + 1) % shootSounds.length;

  // Create bullet
  const bullet = document.createElement('div');
  bullet.classList.add('bullet');
  bullet.style.left = `${shuttle.offsetLeft - 3}px`;
  bullet.style.bottom = '70px';
  gameContainer.appendChild(bullet);

  const bulletInterval = setInterval(() => {
    const bulletBottom = parseInt(bullet.style.bottom);
    
    if (bulletBottom > window.innerHeight) {
      cleanup();
      return;
    }
    
    bullet.style.bottom = `${bulletBottom + (gameState.powerups.rapidFire ? 8 : 5)}px`;

    // Collision detection
    const asteroids = document.querySelectorAll('.asteroid');
    for (const asteroid of asteroids) {
      if (checkCollision(bullet, asteroid)) {
        asteroid.remove();
        cleanup();
        updateScore(asteroid);
        return;
      }
    }
    
    function cleanup() {
      bullet.remove();
      clearInterval(bulletInterval);
    }
  }, gameState.powerups.rapidFire ? 15 : 20);
}

function updateScore(asteroid) {
  gameState.score += 1;
  scoreDisplay.textContent = `Score: ${gameState.score}`;
  
  const scorePopup = document.createElement('div');
  Object.assign(scorePopup.style, {
    position: 'absolute',
    left: asteroid.style.left,
    top: asteroid.style.top,
    fontSize: '24px',
    fontWeight: 'bold',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
  });
  scorePopup.textContent =  '+1';
  gameContainer.appendChild(scorePopup);

  let opacity = 1;
  let posY = parseInt(scorePopup.style.top);
  
  const fadeInterval = setInterval(() => {
    opacity -= 0.05;
    posY -= 2;
    scorePopup.style.opacity = opacity;
    scorePopup.style.top = `${posY}px`;
    
    if (opacity <= 0) {
      clearInterval(fadeInterval);
      scorePopup.remove();
    }
  }, 50);
}

function createPowerup() {
  if (gameState.isGameOver) return;

  const powerupTypes = ['rapidFire', 'shield'];
  const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
  
  const powerup = document.createElement('div');
  powerup.classList.add('powerup', type);
  powerup.style.left = `${Math.random() * (gameContainer.clientWidth - 30)}px`;
  powerup.style.top = '-30px'; // Start above the screen
  gameContainer.appendChild(powerup);

  let powerupTop = -30; // Initial position
  const powerupInterval = setInterval(() => {
    powerupTop += gameState.powerupSpeed;
    powerup.style.top = `${powerupTop}px`;
    
    if (powerupTop > window.innerHeight) {
      cleanup();
      return;
    }

    if (checkCollision(powerup, shuttle)) {
      activatePowerup(type);
      cleanup();
    }
    
    function cleanup() {
      powerup.remove();
      clearInterval(powerupInterval);
    }
  }, 50);
}

function activatePowerup(type) {
  // Clear existing timer if any
  if (gameState.powerupTimers[type]) {
    clearTimeout(gameState.powerupTimers[type]);
  }

  gameState.powerups[type] = true;
  
  if (type === 'shield') {
    shuttle.classList.add('shielded');
  }

  // Create powerup indicator
  let indicator = document.getElementById(`${type}-indicator`);
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = `${type}-indicator`;
    indicator.classList.add('powerup-indicator');
    gameContainer.appendChild(indicator);
  }
  indicator.textContent = type.replace(/([A-Z])/g, ' $1').toLowerCase();
  indicator.style.display = 'block';

  // Set timer to deactivate
  gameState.powerupTimers[type] = setTimeout(() => {
    gameState.powerups[type] = false;
    if (type === 'shield') {
      shuttle.classList.remove('shielded');
    }
    indicator.style.display = 'none';
  }, 10000);
}

function createAsteroid() {
  if (gameState.isGameOver) return;

  const asteroid = document.createElement('div');
  asteroid.classList.add('asteroid');
  asteroid.style.left = `${Math.random() * (gameContainer.clientWidth - 40)}px`;
  asteroid.style.top = '-40px'; // Start above the screen
  gameContainer.appendChild(asteroid);

  let asteroidTop = -40; // Initial position
  const asteroidInterval = setInterval(() => {
    asteroidTop += gameState.asteroidSpeed;
    asteroid.style.top = `${asteroidTop}px`;
    
    if (asteroidTop > window.innerHeight) {
      cleanup();
      return;
    }

    if (checkCollision(asteroid, shuttle)) {
      if (gameState.powerups.shield) {
        asteroid.remove();
        gameState.powerups.shield = false;
        shuttle.classList.remove('shielded');
        const indicator = document.getElementById('shield-indicator');
        if (indicator) indicator.style.display = 'none';
      } else {
        gameOver();
      }
      cleanup();
    }
    
    function cleanup() {
      asteroid.remove();
      clearInterval(asteroidInterval);
    }
  }, 50);
}

function checkCollision(element1, element2) {
  const rect1 = element1.getBoundingClientRect();
  const rect2 = element2.getBoundingClientRect();
  return !(
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom ||
    rect1.right < rect2.left ||
    rect1.left > rect2.right
  );
}

function gameOver() {
  Object.assign(gameState, {
    isGameOver: true,
    gameStarted: false
  });
  
  gameOverText.style.display = 'none';
  menuScreen.style.display = 'flex';

  window.gameOverCount = (window.gameOverCount || 0) + 1;
  
  // Update final score display
  let finalScore = menuScreen.querySelector('.final-score');
  if (!finalScore) {
    finalScore = document.createElement('div');
    finalScore.classList.add('final-score');
    Object.assign(finalScore.style, {
      color: '#fff',
      fontSize: '32px',
      marginBottom: '20px'
    });
    menuScreen.insertBefore(finalScore, startButton);
  }
  finalScore.textContent = `Final Score: ${gameState.score}`;
  
  clearInterval(gameState.asteroidInterval);
  clearInterval(gameState.powerupInterval);
  
  // Clear all powerup timers
  Object.keys(gameState.powerupTimers).forEach(timer => {
    clearTimeout(gameState.powerupTimers[timer]);
  });
  
  // Remove powerup indicators
  document.querySelectorAll('.powerup-indicator').forEach(el => el.remove());
}
