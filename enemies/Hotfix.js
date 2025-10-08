export class HotfixEnemy {
    constructor() {
        this.name = 'Hotfix';
        this.maxHealth = 75;
        this.health = this.maxHealth;
        this.moveIndex = 0;
        this.scalingBurnValue = 3;
        this.moves = [
            {
                key: 'apply_burn',
                label: `Burn ${this.scalingBurnValue + 2}`,
                actions: [
                    { type: 'burn', value: this.scalingBurnValue + 1 }
                ]
            },
            {
                key: 'heal_attack',
                label: 'Heal 10 + Attack 5',
                actions: [
                    { type: 'heal', value: 10 },
                    { type: 'attack', value: 5 }
                ]
            },
            {
                key: 'burn_defend_loop',
                label: `Burn ${this.scalingBurnValue} + Defend 10`,
                createActions: () => {
                    const burnValue = this.scalingBurnValue;
                    this.scalingBurnValue += 1;
                    return [
                        { type: 'burn', value: burnValue },
                        { type: 'defend', value: 5 }
                    ];
                }
            }
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

        const move = this.moves[this.moveIndex % this.moves.length];
        this.moveIndex++;

        const actions = typeof move.createActions === 'function' ? move.createActions() : move.actions;

        return {
            key: `${move.key}_${this.moveIndex}`,
            label: move.label,
            actions
        };
    }
}
