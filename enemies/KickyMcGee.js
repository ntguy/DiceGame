export class KickyMcGeeEnemy {
    constructor() {
        this.name = 'Kicky McGee';
        this.maxHealth = 80;
        this.health = this.maxHealth;
        this.moveIndex = 0;
        this.baseMoves = [
            { key: 'defend10_attack20', defend: 10, attack: 20 },
            { key: 'defend20_attack10', defend: 20, attack: 10 }
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
        if (this.baseMoves.length === 0) {
            return null;
        }

        const baseMove = this.baseMoves[this.moveIndex % this.baseMoves.length];
        const increment = Math.floor(this.moveIndex / this.baseMoves.length) * 2;
        this.moveIndex++;

        const defendValue = baseMove.defend + increment;
        const attackValue = baseMove.attack + increment;

        return {
            key: `${baseMove.key}_${this.moveIndex}`,
            label: `Defend ${defendValue} + Attack ${attackValue}`,
            actions: [
                { type: 'defend', value: defendValue },
                { type: 'attack', value: attackValue }
            ]
        };
    }
}
