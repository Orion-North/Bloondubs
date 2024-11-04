import random

class Ship:
    def __init__(self, name, health, attack_power, speed, evasion, range):
        self.name = name
        self.health = health
        self.max_health = health
        self.attack_power = attack_power
        self.speed = speed
        self.evasion = evasion
        self.range = range
        self.position = 0
        self.cooldown = {"attack": 0, "repair": 0}

    def take_damage(self, damage):
        if random.randint(1, 100) <= self.evasion:
            print(f"{self.name} evades the attack!")
            return
        self.health -= damage
        if self.health < 0:
            self.health = 0
        print(f"{self.name} takes {damage} damage! Current health: {self.health}")

    def is_destroyed(self):
        return self.health <= 0
    
    def repair(self):
        repair_amount = random.randint(5, 15)
        self.health += repair_amount
        if self.health > self.max_health:
            self.health = self.max_health
        print(f"{self.name} repairs for {repair_amount}! Current health: {self.health}")
        self.cooldown["repair"] = 2

    def move(self, distance):
        self.position += distance * self.speed
        print(f"{self.name} moves to position {self.position} on the grid.")

    def within_range(self, enemy):
        return abs(self.position - enemy.position) <= self.range
    
    def reduce_cooldowns(self):
        for action in self.cooldown:
            if self.cooldown[action] > 0:
                self.cooldown[action] -= 1

class PlayerShip(Ship):
    def take_turn(self, enemy):
        action = input("Choose your action (attack/move/repair): ").lower()
        self.reduce_cooldowns()

        if action == "attack":
            if not self.within_range(enemy):
                print("Enemy out of range! Move closer to attack.")
                return
            if self.cooldown["attack"] > 0:
                print(f"Attack is on cooldown for {self.cooldown['attack']} more turns.")
                return
            damage = random.randint(10, self.attack_power)
            enemy.take_damage(damage)
            print(f"You attack and deal {damage} damage!")
            self.cooldown["attack"] = 1  # Set a cooldown for the attack

        elif action == "repair":
            if self.cooldown["repair"] == 0:
                self.repair()
            else:
                print(f"Repair is on cooldown for {self.cooldown['repair']} more turns.")

        elif action == "move":
            distance = int(input("Move by how many units? "))
            self.move(distance)

        else:
            print("Invalid action. You lose your turn.")

class EnemyShip(Ship):
    def take_turn(self, player):
        self.reduce_cooldowns()
        action = random.choice(["attack", "repair", "move"])

        if action == "attack" and self.within_range(player):
            if self.cooldown["attack"] > 0:
                return
            damage = random.randint(5, self.attack_power)
            player.take_damage(damage)
            print(f"The enemy attacks and deals {damage} damage!")
            self.cooldown["attack"] = 1

        elif action == "repair" and self.cooldown["repair"] == 0:
            self.repair()

        elif action == "move":
            distance = random.choice([-1, 1])
            self.move(distance)

# Initialize player and enemy ships
player_ship = PlayerShip("The Black Pearl", 100, 20, speed=2, evasion=20, range=3)
enemy_ship = EnemyShip("Dread Pirate's Ship", 80, 15, speed=1, evasion=10, range=3)

# Main game loop
while not player_ship.is_destroyed() and not enemy_ship.is_destroyed():
    player_ship.take_turn(enemy_ship)
    if enemy_ship.is_destroyed():
        print("You have defeated the enemy!")
        break
    enemy_ship.take_turn(player_ship)
    if player_ship.is_destroyed():
        print("Your ship has been destroyed!")
