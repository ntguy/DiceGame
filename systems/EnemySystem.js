import { LockjawEnemy } from '../enemies/Lockjaw.js';
import { HotfixEnemy } from '../enemies/Hotfix.js';
import { InfernoEnemy } from '../enemies/Inferno.js';
import { SlapperEnemy } from '../enemies/Slapper.js';

export class EnemyManager {
    constructor() {
        this.enemies = [new SlapperEnemy(), new LockjawEnemy(), new HotfixEnemy(), new InfernoEnemy()];
        this.currentEnemyIndex = -1;
        this.currentEnemy = null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
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
        return Number.isFinite(this.enemyBlockValue) ? this.enemyBlockValue : 0;
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
        if (!this.currentEnemy) {
            return { damageDealt: 0, blockedAmount: 0 };
        }

        if (!Number.isFinite(this.enemyBlockValue)) {
            this.enemyBlockValue = 0;
        }

        const numericAmount = Number(amount);
        const incomingDamage = Number.isFinite(numericAmount) && numericAmount > 0 ? numericAmount : 0;

        if (incomingDamage <= 0) {
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const blockedAmount = Math.min(this.enemyBlockValue, incomingDamage);
        const damageDealt = incomingDamage - blockedAmount;
        this.enemyBlockValue = Math.max(0, this.enemyBlockValue - blockedAmount);

        if (damageDealt > 0) {
            this.currentEnemy.takeDamage(damageDealt);
        }

        return { damageDealt, blockedAmount };
    }

    addEnemyBlock(amount) {
        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return;
        }

        if (!Number.isFinite(this.enemyBlockValue)) {
            this.enemyBlockValue = 0;
        }

        this.enemyBlockValue += numericAmount;
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
