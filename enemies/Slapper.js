export class SlapperEnemy {
    constructor() {
        this.name = 'Slapper';
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.moves = [
            { key: 'attack10', type: 'attack', value: 10, label: 'Attack for 10' },
            { key: 'attack15', type: 'attack', value: 15, label: 'Attack for 15' },
            { key: 'heal10', type: 'heal', value: 10, label: 'Heal 10' }
        ];
    }

    isDefeated() {
        return this.health <= 0;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getRandomMove() {
        if (this.moves.length === 0) {
            return null;
        }
        const index = Math.floor(Math.random() * this.moves.length);
        return this.moves[index];
    }
}
