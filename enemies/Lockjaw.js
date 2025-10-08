export class LockjawEnemy {
    constructor() {
        this.name = 'Lockjaw';
        this.maxHealth = 80;
        this.health = this.maxHealth;
        this.moveIndex = 0;
        this.moves = [
            {
                key: 'lock_player_die',
                label: 'Clamp: Lock 1 die',
                actions: [
                    { type: 'lock', count: 1 }
                ]
            },
            {
                key: 'defend10_attack20',
                label: 'Guarded Bite: Defend 10 + Attack 20',
                actions: [
                    { type: 'defend', value: 10 },
                    { type: 'attack', value: 20 }
                ]
            },
            {
                key: 'defend20_attack10',
                label: 'Iron Jaw: Defend 20 + Attack 10',
                actions: [
                    { type: 'defend', value: 20 },
                    { type: 'attack', value: 10 }
                ]
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

        return {
            key: `${move.key}_${this.moveIndex}`,
            label: move.label,
            actions: move.actions
        };
    }
}
