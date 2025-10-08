import { SlapperEnemy } from '../enemies/Slapper.js';
import { KickyMcGeeEnemy } from '../enemies/KickyMcGee.js';

export class EnemyManager {
    constructor() {
        // this.enemies = [new SlapperEnemy(), new KickyMcGeeEnemy()];
        this.enemies = [new KickyMcGeeEnemy()];
        this.currentEnemyIndex = 0;
        this.currentEnemy = this.enemies[this.currentEnemyIndex] || null;
        this.upcomingMove = null;
        this.enemyBlockValue = 0;
    }

    getCurrentEnemy() {
        return this.currentEnemy;
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

        const blockedAmount = Math.min(this.enemyBlockValue, amount);
        const damageDealt = Math.max(0, amount - this.enemyBlockValue);
        this.enemyBlockValue = Math.max(0, this.enemyBlockValue - amount);

        if (damageDealt > 0) {
            this.currentEnemy.takeDamage(damageDealt);
        }

        return { damageDealt, blockedAmount };
    }

    addEnemyBlock(amount) {
        if (amount > 0) {
            this.enemyBlockValue += amount;
        }
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
        if (this.currentEnemyIndex + 1 >= this.enemies.length) {
            this.currentEnemy = null;
            this.enemyBlockValue = 0;
            this.upcomingMove = null;
            return false;
        }

        this.currentEnemyIndex += 1;
        this.currentEnemy = this.enemies[this.currentEnemyIndex];
        this.enemyBlockValue = 0;
        this.upcomingMove = null;
        return true;
    }
}
