const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mapSize = 5;
const tileTypes = ["🌊", "🏝️", "💀", "💰"]; // Water, Island, Enemy, Treasure
const mapContainer = document.getElementById("map-container");

class Ship {
    constructor(name, health, attackPower, position, color) {
        this.name = name;
        this.health = health;
        this.maxHealth = health;
        this.attackPower = attackPower;
        this.position = position;
        this.color = color;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, 50, 20);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(`${this.name} (HP: ${this.health})`, this.position.x, this.position.y - 5);
    }

    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }

    isDestroyed() {
        return this.health <= 0;
    }

    repair() {
        const repairAmount = Math.min(10, this.maxHealth - this.health);
        this.health += repairAmount;
        return repairAmount;
    }
}

// Initialize ships
const playerShip = new Ship("The Black Pearl", 100, 20, { x: 150, y: 300 }, "#1e90ff");
const enemyShip = new Ship("Dread Pirate's Ship", 80, 15, { x: 600, y: 100 }, "#ff4500");

function updateStatus(message) {
    document.getElementById("status").innerText = message;
}

// Generate and render the map
function generateMap() {
    mapContainer.innerHTML = ""; // Clear previous map if any
    for (let i = 0; i < mapSize * mapSize; i++) {
        const tile = document.createElement("div");
        tile.classList.add("tile");

        // Randomly assign a tile type
        const tileType = tileTypes[Math.floor(Math.random() * tileTypes.length)];
        tile.innerText = tileType;

        // Set tile actions based on tile type
        tile.addEventListener("click", () => handleTileClick(tileType));

        mapContainer.appendChild(tile);
    }
}

function handleTileClick(tileType) {
    if (tileType === "💀") {
        startCombat();
    } else if (tileType === "💰") {
        alert("You found treasure!");
        // Add treasure collection logic here
    } else if (tileType === "🏝️") {
        alert("You discovered an island.");
        // Add island exploration logic here
    } else {
        alert("Just open sea.");
    }
}

function startCombat() {
    updateStatus("Enemy encountered! Prepare for battle.");
    draw();
}

// Draw ships on canvas
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    playerShip.draw();
    enemyShip.draw();
}

function playerAction(action) {
    if (playerShip.isDestroyed() || enemyShip.isDestroyed()) {
        updateStatus("Game over! Reload to play again.");
        return;
    }

    let result = "";
    if (action === "attack") {
        const damage = Math.floor(Math.random() * playerShip.attackPower);
        enemyShip.takeDamage(damage);
        result = `You attacked and dealt ${damage} damage!`;

    } else if (action === "move") {
        playerShip.position.x += 20;
        result = "You moved closer to the enemy.";

    } else if (action === "repair") {
        const repairAmount = playerShip.repair();
        result = `You repaired your ship for ${repairAmount} health!`;
    }

    // Enemy's turn (simple random action)
    if (!enemyShip.isDestroyed()) {
        const enemyAction = Math.random() < 0.5 ? "attack" : "repair";
        if (enemyAction === "attack") {
            const damage = Math.floor(Math.random() * enemyShip.attackPower);
            playerShip.takeDamage(damage);
            result += ` The enemy attacked and dealt ${damage} damage!`;
        } else {
            const repairAmount = enemyShip.repair();
            result += ` The enemy repaired for ${repairAmount} health!`;
        }
    }

    draw();
    updateStatus(result);

    if (enemyShip.isDestroyed()) {
        updateStatus("You have defeated the enemy!");
    } else if (playerShip.isDestroyed()) {
        updateStatus("Your ship has been destroyed!");
    }
}

// Generate the initial map
generateMap();

// Initial draw call to display ships at the start
draw();
