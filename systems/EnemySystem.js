import { LockjawEnemy } from '../enemies/Lockjaw.js';
import { HotfixEnemy } from '../enemies/Hotfix.js';
import { InfernoEnemy } from '../enemies/Inferno.js';
import { SlapperEnemy } from '../enemies/Slapper.js';
import { resolveDamage } from './CombatMath.js';

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
        const { damage, blocked, remainingBlock } = resolveDamage({
            amount,
            block: this.enemyBlockValue
        });

        this.enemyBlockValue = remainingBlock;

        if (!this.currentEnemy) {
            return { damageDealt: 0, blockedAmount: blocked };
        }

        if (damage > 0) {
            this.currentEnemy.takeDamage(damage);
        }

        return { damageDealt: damage, blockedAmount: blocked };
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
        const nextIndex = this.currentEnemyIndex + 1;
        if (nextIndex >= this.enemies.length) {
            this.clearCurrentEnemy();
            return false;
        }

        this.startEnemyEncounter(nextIndex);
        return true;
    }
}
