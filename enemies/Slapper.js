export class SlapperEnemy {
    constructor() {
        this.name = 'Slapper';
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.moves = [
            { key: 'attack10', label: 'Attack for 10', actions: [{ type: 'attack', value: 10 }] },
            { key: 'attack15', label: 'Attack for 15', actions: [{ type: 'attack', value: 15 }] },
            { key: 'heal10', label: 'Heal 10', actions: [{ type: 'heal', value: 10 }] }
        ];
    }

    isDefeated() {
        return this.health <= 0;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }

    heal(amount) {
        if (amount <= 0) {
            return;
        }
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getNextMove() {
        if (this.moves.length === 0) {
            return null;
        }
        const index = Math.floor(Math.random() * this.moves.length);
        const selected = this.moves[index];
        return {
            key: selected.key,
            label: selected.label,
            actions: selected.actions.map(action => ({ ...action }))
        };
    }
}
