// Ensure the script runs after the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Define game states
    const GameState = {
        EXPLORATION: 'exploration',
        COMBAT: 'combat'
    };
    let currentState = GameState.EXPLORATION;

    // Declare canvas and context globally
    let canvas;
    let ctx;

    const fightContainer = document.getElementById("fight-container");
    const mapContainer = document.getElementById("map-container");

    // Elements for health bars and ship names
    const playerNameElement = document.getElementById('player-name');
    const playerHealthElement = document.getElementById('player-health');
    const enemyNameElement = document.getElementById('enemy-name');
    const enemyHealthElement = document.getElementById('enemy-health');

    // Map and tile setup
    const mapSize = 5;
    const tileTypes = ["🌊", "🏝️", "💀", "💰"];
    const tiles = []; // To store tile elements and their states
    let playerPosition = { x: 2, y: 2 }; // Start in the middle of the map

    class Tile {
        constructor(x, y, element, tileType) {
            this.x = x;
            this.y = y;
            this.element = element;
            this.tileType = tileType;
            this.revealed = false;
            this.used = false; // To track if the tile has been used
        }
    }

    class Ship {
        constructor(name, health, attackPower, position, color, evasion, specialAbility, emoji) {
            this.name = name;
            this.health = health;
            this.maxHealth = health;
            this.attackPower = attackPower;
            this.position = position;
            this.color = color;
            this.evasion = evasion;
            this.specialAbility = specialAbility;
            this.baseEvasion = evasion; // To reset temporary buffs
            this.baseAttackPower = attackPower; // To reset temporary buffs
            this.flash = false; // For damage flash effect
            this.emoji = emoji; // Ship emoji
        }

        draw() {
            ctx.save();

            // Set font size with minimum and maximum limits
            const fontSize = Math.max(Math.min(Math.floor(canvas.width * 0.1), 100), 40); // Between 40px and 100px
            ctx.font = `${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.flash ? "#ff0000" : this.color;
            ctx.fillText(this.emoji, this.position.x, this.position.y);
            ctx.restore();
        }

        takeDamage(damage, attackerPosition) {
            if (Math.random() * 100 < this.evasion) {
                appendStatus(`${this.name} evades the attack!`);
                return;
            }
            this.health -= damage;
            if (this.health < 0) this.health = 0;
            appendStatus(`${this.name} takes ${damage} damage! Current health: ${this.health}`);
            this.flash = true;
            draw(); // Update the canvas immediately

            // Update health bar
            updateHealthBars();

            // Attack animation
            animateAttack(attackerPosition, this.position);

            setTimeout(() => {
                this.flash = false;
                draw();
            }, 200); // Flash effect
        }

        isDestroyed() {
            return this.health <= 0;
        }

        repair() {
            const repairAmount = Math.min(10, this.maxHealth - this.health);
            this.health += repairAmount;
            appendStatus(`${this.name} repairs for ${repairAmount} health!`);

            // Update health bar
            updateHealthBars();

            return repairAmount;
        }

        resetStats() {
            // Reset evasion and attackPower to base values
            this.evasion = this.baseEvasion;
            this.attackPower = this.baseAttackPower;
        }
    }

    // Enemy ship types with different stats and abilities
    const enemyTypes = [
        { name: "Schooner", health: 50, attackPower: 10, evasion: 30, color: "#ff7f50", specialAbility: "highEvasion", emoji: "⛵" },
        { name: "Frigate", health: 80, attackPower: 15, evasion: 15, color: "#ff6347", specialAbility: "balanced", emoji: "🚤" },
        { name: "Man-of-War", health: 120, attackPower: 25, evasion: 5, color: "#ff4500", specialAbility: "heavyAttack", emoji: "🚢" },
    ];

    function createRandomEnemy() {
        const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
        // Clone enemyType to avoid modifying the original stats
        const enemyStats = { ...enemyType };
        // Apply special abilities without accumulating
        if (enemyStats.specialAbility === "highEvasion") {
            enemyStats.evasion += 10; // Increase evasion by 10
        } else if (enemyStats.specialAbility === "heavyAttack") {
            enemyStats.attackPower += 5; // Increase attack power by 5
        }
        return new Ship(
            enemyStats.name,
            enemyStats.health,
            enemyStats.attackPower,
            { x: 0, y: 0 }, // Position will be set in resizeCanvas()
            enemyStats.color,
            Math.min(enemyStats.evasion, 100), // Cap evasion at 100
            enemyStats.specialAbility,
            enemyStats.emoji
        );
    }

    // Initialize player ship
    const playerShip = new Ship("The Black Pearl", 100, 20, { x: 0, y: 0 }, "#1e90ff", 20, null, "🛥️");
    let enemyShip = null; // No enemy at the start

    function updateStatus(message) {
        document.getElementById("status").innerText = message;
    }

    function appendStatus(message) {
        const statusElement = document.getElementById("status");
        statusElement.innerText += `${message}\n`;
        // Auto-scroll to the bottom
        statusElement.scrollTop = statusElement.scrollHeight;
    }

    // Update health bars and ship names
    function updateHealthBars() {
        // Update player health bar
        const playerHealthPercentage = (playerShip.health / playerShip.maxHealth) * 100;
        playerHealthElement.style.width = `${playerHealthPercentage}%`;

        // Update enemy health bar
        const enemyHealthPercentage = (enemyShip.health / enemyShip.maxHealth) * 100;
        enemyHealthElement.style.width = `${enemyHealthPercentage}%`;
    }

    // Generate and render the map with fog of war
    function generateMap() {
        mapContainer.innerHTML = ""; // Clear previous map if any
        tiles.length = 0; // Clear the tiles array
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                const tileElement = document.createElement("div");
                tileElement.classList.add("tile");
                tileElement.dataset.x = x;
                tileElement.dataset.y = y;

                // Randomly assign a tile type
                const tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];

                const tile = new Tile(x, y, tileElement, tileType);

                tile.element.addEventListener("click", () => handleTileClick(tile));

                // Initially hide the tile content (fog of war)
                tile.element.innerHTML = "<span></span>"; // Empty content
                tile.element.classList.add("hidden");

                tiles.push(tile);
                mapContainer.appendChild(tile.element);
            }
        }

        // Reveal the starting tile and its neighbors
        const startTile = getTileAt(playerPosition.x, playerPosition.y);
        revealTile(startTile);
        getNeighbors(startTile).forEach(revealTile);

        // Start with an encounter on the starting tile
        enemyShip = createRandomEnemy();
        startCombat();
    }

    function getTileAt(x, y) {
        return tiles.find(t => t.x === x && t.y === y);
    }

    function getNeighbors(tile) {
        const neighbors = [];
        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];
        for (const dir of directions) {
            const nx = tile.x + dir.dx;
            const ny = tile.y + dir.dy;
            if (nx >= 0 && nx < mapSize && ny >= 0 && ny < mapSize) {
                neighbors.push(getTileAt(nx, ny));
            }
        }
        return neighbors;
    }

    function revealTile(tile) {
        if (tile.revealed) return;
        tile.revealed = true;
        tile.element.classList.remove("hidden");
        tile.element.classList.add("revealed");
        // Initially no symbol; revealed when clicked
    }

    function handleTileClick(tile) {
        if (currentState === GameState.COMBAT) {
            appendStatus("You are in combat! Finish the fight before moving on.");
            return;
        }

        if (!isNeighboringRevealedTile(tile)) {
            appendStatus("You can only move to neighboring tiles of revealed tiles.");
            return;
        }

        if (tile.used) {
            appendStatus("This tile has already been used.");
            return;
        }

        // Reveal the tile's type when clicked
        tile.element.querySelector('span').innerText = tile.tileType;
        tile.used = true; // Mark the tile as used to prevent reuse
        tile.element.classList.remove("revealed");
        tile.element.classList.add("used"); // Change appearance after use

        playerPosition.x = tile.x;
        playerPosition.y = tile.y;

        if (tile.tileType === "💀") {
            enemyShip = createRandomEnemy();
            startCombat();
        } else if (tile.tileType === "💰") {
            handleRandomEvent(); // Trigger random events on treasure tiles
            // After handling the event, reveal neighbors
            getNeighbors(tile).forEach(revealTile);
        } else if (tile.tileType === "🏝️") {
            appendStatus("You discovered an island.");
            getNeighbors(tile).forEach(revealTile);
        } else {
            appendStatus("Just open sea.");
            getNeighbors(tile).forEach(revealTile);
        }
    }

    function isNeighboringRevealedTile(tile) {
        const neighbors = getNeighbors(tile);
        return neighbors.some(neighbor => neighbor.revealed) || tile.revealed;
    }

    // Random events
    const events = [
        { type: "treasure", message: "You found hidden treasure!" },
        { type: "ambush", message: "Pirates ambush you!" },
        { type: "storm", message: "A storm hits! Visibility is reduced." },
        { type: "trader", message: "You encounter a friendly trader." }
    ];

    // Buffs management
    let temporaryBuffs = {
        player: {},
        enemy: {}
    };

    function handleRandomEvent() {
        const event = events[Math.floor(Math.random() * events.length)];
        let eventMessage = event.message;

        switch (event.type) {
            case "treasure":
                const healed = playerShip.repair();
                eventMessage += ` You gain ${healed} health from the treasure!`;
                break;
            case "ambush":
                enemyShip = createRandomEnemy();
                eventMessage += " An enemy appears! Prepare for battle.";
                startCombat();
                break;
            case "storm":
                // Temporary evasion boost for the player
                if (!temporaryBuffs.player.storm) {
                    playerShip.evasion = Math.min(playerShip.evasion + 10, 100); // Cap at 100
                    temporaryBuffs.player.storm = true;
                    eventMessage += " Your evasion is increased by 10 for this turn.";
                }
                break;
            case "trader":
                const repaired = playerShip.repair();
                eventMessage += ` The trader repairs your ship by ${repaired} health.`;
                break;
            default:
                eventMessage += " Nothing happens.";
        }

        appendStatus(eventMessage);
    }

    // Combat functions
    function startCombat() {
        currentState = GameState.COMBAT;

        // Make fight-container visible
        fightContainer.style.visibility = "visible";
        fightContainer.style.height = "auto";

        // Initialize canvas and context
        canvas = document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");

        // Set canvas dimensions based on container size
        resizeCanvas();

        // Redraw canvas on window resize
        window.addEventListener('resize', resizeCanvas);

        // Update ship names
        playerNameElement.innerText = playerShip.name;
        enemyNameElement.innerText = enemyShip.name;

        // Update health bars
        updateHealthBars();

        draw();
        appendStatus(`An enemy ship approaches: ${enemyShip.name}`);

        // Add special enemy abilities
        if (enemyShip.specialAbility === "highEvasion") {
            appendStatus("This enemy is quick and hard to hit!");
        } else if (enemyShip.specialAbility === "heavyAttack") {
            appendStatus("This enemy has heavy cannons and deals more damage!");
        }
    }

    function endCombat() {
        currentState = GameState.EXPLORATION;

        // Hide fight-container
        fightContainer.style.visibility = "hidden";
        fightContainer.style.height = "0";

        // Remove resize event listener
        window.removeEventListener('resize', resizeCanvas);

        // After combat, reveal neighbors of current position
        const currentTile = getTileAt(playerPosition.x, playerPosition.y);
        getNeighbors(currentTile).forEach(revealTile);
    }

    // Function to resize canvas and update ship positions
    function resizeCanvas() {
        // Get the computed width and height of the canvas element
        const computedStyle = getComputedStyle(canvas);
        canvas.width = Math.max(parseInt(computedStyle.width), 600); // Minimum width 600px
        canvas.height = Math.max(parseInt(computedStyle.height), 300); // Minimum height 300px

        // Update ship positions to prevent overlapping
        const shipSeparation = canvas.width * 0.4; // Increase separation
        playerShip.position.x = (canvas.width - shipSeparation) / 2;
        playerShip.position.y = canvas.height / 2;

        if (enemyShip) {
            enemyShip.position.x = (canvas.width + shipSeparation) / 2;
            enemyShip.position.y = canvas.height / 2;
        }

        draw(); // Redraw the canvas content
    }

    // Draw ships and background on canvas
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        playerShip.draw();
        if (enemyShip) {
            enemyShip.draw();
        }
    }

    // Draw dynamic water background
    function drawBackground() {
        // Create simple wave patterns
        const waveCount = 5;
        ctx.fillStyle = '#0e1a2b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#1a1a3a';
        ctx.globalAlpha = 0.3; // Set transparency for the waves
        for (let i = 0; i < waveCount; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (canvas.height / waveCount) * i);
            ctx.quadraticCurveTo(
                canvas.width / 4, (canvas.height / waveCount) * i + 20,
                canvas.width / 2, (canvas.height / waveCount) * i
            );
            ctx.quadraticCurveTo(
                (3 * canvas.width) / 4, (canvas.height / waveCount) * i - 20,
                canvas.width, (canvas.height / waveCount) * i
            );
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fill();
        }
        ctx.globalAlpha = 1.0; // Reset transparency
    }

    // Animate attacks with a line from attacker to target
    function animateAttack(attackerPosition, targetPosition) {
        ctx.save();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(attackerPosition.x, attackerPosition.y);
        ctx.lineTo(targetPosition.x, targetPosition.y);
        ctx.stroke();
        ctx.restore();

        // Clear the line after a short delay
        setTimeout(() => {
            draw();
        }, 200);
    }

    // Expose `playerAction` to the global scope
    window.playerAction = function(action) {
        if (currentState !== GameState.COMBAT) {
            appendStatus("You are not in combat.");
            return;
        }

        if (playerShip.isDestroyed() || enemyShip.isDestroyed()) {
            appendStatus("Game over! Reload to play again.");
            return;
        }

        let result = "";
        if (action === "attack") {
            const damage = Math.floor(Math.random() * playerShip.attackPower) + 1; // Ensure at least 1 damage
            enemyShip.takeDamage(damage, playerShip.position);
            result += `You attacked and dealt ${damage} damage! `;
        } else if (action === "repair") {
            const repairAmount = playerShip.repair();
            result += `You repaired your ship for ${repairAmount} health! `;
        } else {
            result += "Unknown action. ";
        }

        // Enemy's turn (simple random action)
        if (!enemyShip.isDestroyed()) {
            const enemyAction = Math.random() < 0.5 ? "attack" : "repair";
            if (enemyAction === "attack") {
                const damage = Math.floor(Math.random() * enemyShip.attackPower) + 1; // Ensure at least 1 damage
                playerShip.takeDamage(damage, enemyShip.position);
                result += `The enemy attacked and dealt ${damage} damage!`;
            } else {
                const repairAmount = enemyShip.repair();
                result += `The enemy repaired for ${repairAmount} health!`;
            }
        }

        appendStatus(result);
        draw();

        if (enemyShip.isDestroyed()) {
            appendStatus("You have defeated the enemy!");
            endCombat();
        }
        if (playerShip.isDestroyed()) {
            appendStatus("Your ship has been destroyed!");
            // Handle game over state if needed
        }

        // Process end-of-turn effects, such as removing temporary buffs
        processEndOfTurn();
    };

    // Process end-of-turn effects, such as removing temporary buffs
    function processEndOfTurn() {
        // Remove player's storm evasion boost after one turn
        if (temporaryBuffs.player.storm) {
            playerShip.evasion = Math.max(playerShip.evasion - 10, playerShip.baseEvasion);
            temporaryBuffs.player.storm = false;
            appendStatus("The storm has passed. Your evasion returns to normal.");
        }

        // Add other end-of-turn effects here as needed
    }

    // Generate the initial map and start the game
    generateMap();
});
