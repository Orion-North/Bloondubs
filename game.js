// Ensure the script runs after the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    // Define game states
    const GameState = {
        EXPLORATION: 'exploration',
        COMBAT: 'combat'
    };
    let currentState = GameState.EXPLORATION;

    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    const fightContainer = document.getElementById("fight-container");
    const mapContainer = document.getElementById("map-container");

    // Set canvas width and height directly to avoid CSS scaling issues
    canvas.width = 800;
    canvas.height = 400;

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
        }
    }

    class Ship {
        constructor(name, health, attackPower, position, color, evasion, specialAbility) {
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
        }

        draw() {
            // Draw ship as a more complex shape
            ctx.save();
            ctx.translate(this.position.x + 20, this.position.y + 10); // Center the ship
            ctx.fillStyle = this.flash ? "#ff0000" : this.color; // Flash red if damaged
            ctx.beginPath();

            if (this.name === "The Black Pearl") {
                // Player ship as a triangle pointing right
                ctx.moveTo(0, -10);
                ctx.lineTo(40, 0);
                ctx.lineTo(0, 10);
            } else {
                // Enemy ships as different shapes based on type
                if (this.specialAbility === "highEvasion") {
                    // High evasion ship as a pentagon
                    ctx.moveTo(20, -10);
                    ctx.lineTo(30, -5);
                    ctx.lineTo(25, 10);
                    ctx.lineTo(15, 10);
                    ctx.lineTo(10, -5);
                } else if (this.specialAbility === "heavyAttack") {
                    // Heavy attack ship as a hexagon
                    ctx.moveTo(20, -10);
                    ctx.lineTo(30, -5);
                    ctx.lineTo(30, 5);
                    ctx.lineTo(20, 10);
                    ctx.lineTo(10, 5);
                    ctx.lineTo(10, -5);
                } else {
                    // Balanced ship as a rectangle
                    ctx.rect(-20, -10, 40, 20);
                }
            }

            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Draw ship's name and health above the ship
            ctx.fillStyle = "#ffffff";
            ctx.font = "14px 'Press Start 2P', monospace";
            ctx.fillText(`${this.name} (HP: ${this.health})`, this.position.x - 10, this.position.y - 15);
        }

        takeDamage(damage) {
            if (Math.random() * 100 < this.evasion) {
                appendStatus(`${this.name} evades the attack!`);
                return;
            }
            this.health -= damage;
            if (this.health < 0) this.health = 0;
            appendStatus(`${this.name} takes ${damage} damage! Current health: ${this.health}`);
            this.flash = true;
            setTimeout(() => { this.flash = false; draw(); }, 200); // Flash effect
        }

        isDestroyed() {
            return this.health <= 0;
        }

        repair() {
            const repairAmount = Math.min(10, this.maxHealth - this.health);
            this.health += repairAmount;
            appendStatus(`${this.name} repairs for ${repairAmount} health!`);
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
        { name: "Schooner", health: 50, attackPower: 10, evasion: 30, color: "#ff7f50", specialAbility: "highEvasion" },
        { name: "Frigate", health: 80, attackPower: 15, evasion: 15, color: "#ff6347", specialAbility: "balanced" },
        { name: "Man-of-War", health: 120, attackPower: 25, evasion: 5, color: "#ff4500", specialAbility: "heavyAttack" },
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
            { x: 600, y: 200 },
            enemyStats.color,
            Math.min(enemyStats.evasion, 100), // Cap evasion at 100
            enemyStats.specialAbility
        );
    }

    // Initialize player and enemy ships
    const playerShip = new Ship("The Black Pearl", 100, 20, { x: 50, y: 200 }, "#1e90ff", 20, null);
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

                tileElement.addEventListener("click", () => handleTileClick(tile));

                // Initially hide the tile content (fog of war)
                tileElement.innerText = "";
                tileElement.classList.add("hidden");

                tiles.push(tile);
                mapContainer.appendChild(tileElement);
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
        tile.element.innerText = tile.tileType;
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

        revealTile(tile);
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

    // Combat function updated
    function startCombat() {
        currentState = GameState.COMBAT;
        fightContainer.style.display = "block";
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
        fightContainer.style.display = "none";
        // After combat, reveal neighbors of current position
        const currentTile = getTileAt(playerPosition.x, playerPosition.y);
        getNeighbors(currentTile).forEach(revealTile);
    }

    // Draw ships and background on canvas
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        playerShip.draw();
        enemyShip.draw();
    }

    // Draw dynamic water background
    function drawBackground() {
        // Create simple wave patterns
        const waveCount = 5;
        ctx.fillStyle = '#0e1a2b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#1a1a3a';
        for (let i = 0; i < waveCount; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 80 + i * 40);
            ctx.quadraticCurveTo(canvas.width / 4, 80 + i * 40 + 20, canvas.width / 2, 80 + i * 40);
            ctx.quadraticCurveTo(3 * canvas.width / 4, 80 + i * 40 - 20, canvas.width, 80 + i * 40);
            ctx.lineTo(canvas.width, canvas.height);
            ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 0.3;
        }
        ctx.globalAlpha = 1.0;
    }

    // Expose playerAction to the global scope
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
            enemyShip.takeDamage(damage);
            result += `You attacked and dealt ${damage} damage! `;
        } else if (action === "move") {
            playerShip.position.x = Math.min(playerShip.position.x + 20, canvas.width - 40); // Prevent moving off-canvas
            result += "You moved closer to the enemy. ";
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
                playerShip.takeDamage(damage);
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
