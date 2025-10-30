export class EnemyManager {
    constructor(enemies = []) {
        this.enemies = Array.isArray(enemies) ? enemies : [];
        this.currentEnemyIndex = -1;
        this.currentEnemy = null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
        this.enemyBurnValue = 0;
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
        this.enemyBurnValue = 0;
        return this.currentEnemy;
    }

    clearCurrentEnemy() {
        this.currentEnemyIndex = -1;
        this.currentEnemy = null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
        this.enemyBurnValue = 0;
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

    applyPlayerAttack(amount, { applyBlockbuster = false } = {}) {
        if (!this.currentEnemy || amount <= 0) {
            return {
                damageDealt: 0,
                blockedAmount: Math.min(this.enemyBlockValue, Math.max(0, amount || 0)),
                halvedBlock: 0
            };
        }

        let workingBlock = this.enemyBlockValue;
        let halvedBlock = 0;

        if (applyBlockbuster && workingBlock > 0) {
            const halved = Math.floor(workingBlock / 2);
            halvedBlock = workingBlock - halved;
            workingBlock = halved;
        }

        const blockedAmount = Math.min(workingBlock, amount);
        const remainingBlock = Math.max(0, workingBlock - amount);
        const damageDealt = Math.max(0, amount - workingBlock);

        this.enemyBlockValue = remainingBlock;

        if (damageDealt > 0) {
            this.currentEnemy.takeDamage(damageDealt);
        }

        return { damageDealt, blockedAmount, halvedBlock };
    }

    damageAllEnemies(amount) {
        if (!amount || amount <= 0 || !Array.isArray(this.enemies)) {
            return;
        }

        const damage = Math.max(0, Math.floor(amount));
        if (damage <= 0) {
            return;
        }

        this.enemies.forEach(enemy => {
            if (enemy && typeof enemy.takeDamage === 'function') {
                enemy.takeDamage(damage);
            }
        });
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

    reduceEnemyBlock(amount) {
        if (amount > 0) {
            this.enemyBlockValue = Math.max(0, this.enemyBlockValue - amount);
        }
    }

    destroyEnemyBlock() {
        if (this.enemyBlockValue > 0) {
            this.enemyBlockValue = 0;
        }
    }

    healCurrentEnemy(amount) {
        if (this.currentEnemy && amount > 0) {
            this.currentEnemy.heal(amount);
        }
    }

    getEnemyBurn() {
        return this.enemyBurnValue;
    }

    resetEnemyBurn() {
        if (this.enemyBurnValue !== 0) {
            this.enemyBurnValue = 0;
        }
    }

    applyEnemyBurn(amount) {
        if (!this.currentEnemy || amount <= 0) {
            return 0;
        }

        const burn = Math.max(0, Math.floor(amount));
        if (burn <= 0) {
            return 0;
        }

        this.enemyBurnValue += burn;
        return burn;
    }

    applyEnemyBurnTick() {
        // Cherry Bomb die & other burn sources: burn chips block first, then spills into health.
        if (!this.currentEnemy || this.enemyBurnValue <= 0) {
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const burnAmount = this.enemyBurnValue;
        const blockBefore = this.enemyBlockValue;
        const blockedAmount = Math.min(blockBefore, burnAmount);

        if (blockedAmount > 0) {
            this.enemyBlockValue = Math.max(0, blockBefore - burnAmount);
        }

        const damageDealt = Math.max(0, burnAmount - blockBefore);
        if (damageDealt > 0) {
            this.currentEnemy.takeDamage(damageDealt);
        }

        return {
            damageDealt,
            blockedAmount
        };
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
