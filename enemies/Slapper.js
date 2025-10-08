export class SlapperEnemy {
    constructor() {
        this.name = 'Slapper';
        this.maxHealth = 50;
        this.health = this.maxHealth;

        // Sequence: attack10 -> heal -> attack15 -> heal -> loop
        this._sequence = [
            { type: 'attack', value: 10 },
            { type: 'heal' },
            { type: 'attack', value: 15 },
            { type: 'heal' }
        ];
        this._seqIndex = 0;

        // Starting heal amount, increases by 2 after each heal
        this._healAmount = 10;
    }

    isDefeated() {
        return this.health <= 0;
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }

    heal(amount) {
        if (amount <= 0) return;
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    getNextMove() {
        const entry = this._sequence[this._seqIndex];

        let move;
        if (entry.type === 'attack') {
            move = {
                key: `attack${entry.value}`,
                label: `Attack for ${entry.value}`,
                actions: [{ type: 'attack', value: entry.value }]
            };
        } else { // heal entry
            move = {
                key: `heal${this._healAmount}`,
                label: `Heal ${this._healAmount}`,
                actions: [{ type: 'heal', value: this._healAmount }]
            };
            // increment heal amount for next heal
            this._healAmount += 2;
        }

        // advance sequence index (wrap)
        this._seqIndex = (this._seqIndex + 1) % this._sequence.length;

        // return a fresh copy
        return {
            key: move.key,
            label: move.label,
            actions: move.actions.map(a => ({ ...a }))
        };
    }
}