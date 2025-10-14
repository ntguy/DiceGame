export class EnemyManager {
    constructor(enemies = []) {
        this.enemies = Array.isArray(enemies) ? enemies : [];
        this.currentEnemyIndex = -1;
        this.currentEnemy = null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
        this.blockDamageMultiplier = 1;
    }

    setEnemies(enemies = []) {
        this.enemies = Array.isArray(enemies) ? enemies : [];
        this.clearCurrentEnemy();
    }

    getCurrentEnemy() {
        return this.currentEnemy;
    }

    startEnemyEncounter(index) {
        if (typeof index !== 'number' || index < 0 || index >= this.enemies.length) {
            this.clearCurrentEnemy();
            return null;
        }

        this.currentEnemyIndex = index;
        this.currentEnemy = this.enemies[index];
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
        return this.currentEnemy;
    }

    clearCurrentEnemy() {
        this.currentEnemyIndex = -1;
        this.currentEnemy = null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
    }

    getEnemyBlock() {
        return this.enemyBlockValue;
    }

    prepareNextMove() {
        if (!this.currentEnemy) {
            this.upcomingMove = null;
            return null;
        }
        this.upcomingMove = this.currentEnemy.getNextMove();
        return this.upcomingMove;
    }

    consumeUpcomingMove() {
        const move = this.upcomingMove;
        this.upcomingMove = null;
        return move;
    }

    applyPlayerAttack(amount) {
        if (!this.currentEnemy || amount <= 0) {
            return { damageDealt: 0, blockedAmount: Math.min(this.enemyBlockValue, Math.max(0, amount || 0)) };
        }

        const blockMultiplier = Math.max(1, this.blockDamageMultiplier || 1);
        const maxBlockConsumed = amount * blockMultiplier;
        const blockConsumed = Math.min(this.enemyBlockValue, maxBlockConsumed);
        const blockedAmount = Math.min(amount, blockMultiplier === 1
            ? blockConsumed
            : Math.ceil(blockConsumed / blockMultiplier));
        this.enemyBlockValue = Math.max(0, this.enemyBlockValue - blockConsumed);
        const damageDealt = Math.max(0, amount - blockedAmount);

        if (damageDealt > 0) {
            this.currentEnemy.takeDamage(damageDealt);
        }

        return { damageDealt, blockedAmount };
    }

    primeUpcomingDefenses() {
        if (!this.upcomingMove || !Array.isArray(this.upcomingMove.actions)) {
            return;
        }

        for (const action of this.upcomingMove.actions) {
            if (action.type === 'defend' && action.value > 0 && !action._preApplied) {
                this.addEnemyBlock(action.value);
                action._preApplied = true;
            }
        }
    }

    addEnemyBlock(amount) {
        if (amount > 0) {
            this.enemyBlockValue += amount;
        }
    }

    clearEnemyBlock() {
        this.enemyBlockValue = 0;
    }

    setBlockDamageMultiplier(multiplier = 1) {
        const value = typeof multiplier === 'number' && multiplier > 0 ? multiplier : 1;
        this.blockDamageMultiplier = value;
    }

    healCurrentEnemy(amount) {
        if (this.currentEnemy && amount > 0) {
            this.currentEnemy.heal(amount);
        }
    }

    isCurrentEnemyDefeated() {
        return !this.currentEnemy || this.currentEnemy.isDefeated();
    }

    advanceToNextEnemy() {
        const nextIndex = this.currentEnemyIndex + 1;
        if (nextIndex >= this.enemies.length) {
            this.clearCurrentEnemy();
            return false;
        }

        this.startEnemyEncounter(nextIndex);
        return true;
    }
}
