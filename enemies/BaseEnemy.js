export class BaseEnemy {
    constructor({ name, maxHealth, moves = [] }) {
        this.name = name;
        this.maxHealth = maxHealth;
        this.baseMaxHealth = maxHealth;
        this.health = maxHealth;
        this.moveIndex = 0;
        this.moves = moves;
    }

    isDefeated() {
        return this.health <= 0;
    }

    takeDamage(amount) {
        if (!amount || amount <= 0) {
            return;
        }
        this.health = Math.max(0, this.health - amount);
    }

    heal(amount) {
        if (!amount || amount <= 0) {
            return;
        }
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getNextMove() {
        if (!this.moves.length) {
            return null;
        }

        const move = this.moves[this.moveIndex % this.moves.length];
        this.moveIndex += 1;

        const label = typeof move.label === 'function' ? move.label() : move.label;
        const actions = typeof move.createActions === 'function' ? move.createActions() : (move.actions || []);

        const hydratedActions = Array.isArray(actions)
            ? actions.map(action => ({ ...action }))
            : [];

        return {
            key: `${move.key}_${this.moveIndex}`,
            label: label || '',
            actions: hydratedActions
        };
    }
}
