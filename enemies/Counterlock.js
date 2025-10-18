import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, defendAction, healAction } from './EnemyActions.js';

const DAMAGE_LOCK_THRESHOLD = 20;
const LOCK_COUNT = 2;
const BASE_HEAL_AMOUNT = 5;
const HEAL_INCREMENT = 5;

export class CounterlockEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Counterlock', maxHealth: 50 });

        this.healAmount = BASE_HEAL_AMOUNT;

        this.moves = [
            {
                key: 'counterlock_strike',
                label: 'Heavy Riposte: Attack 15',
                actions: [attackAction(15)]
            },
            {
                key: 'counterlock_recover',
                label: () => `Guarded Recovery: Heal ${this.healAmount} + Defend 5`,
                createActions: () => {
                    const heal = this.healAmount;
                    this.healAmount += HEAL_INCREMENT;
                    return [healAction(heal), defendAction(5)];
                }
            },
            {
                key: 'counterlock_counterstance',
                label: 'Counterstance: Attack 10 + Defend 10',
                actions: [attackAction(10), defendAction(10)]
            }
        ];
    }

    onEncounterStart() {
        this.healAmount = BASE_HEAL_AMOUNT;
        this.moveIndex = 0;
    }

    getStatusDescription() {
        return 'Status: If it takes 20+ damage in a turn, locks 2 of your dice next turn.';
    }

    onPlayerDamageDealt({ totalDamage, previousTotal, scene }) {
        if (!scene || typeof scene.queueEnemyLocks !== 'function') {
            return;
        }

        const crossedThreshold = previousTotal < DAMAGE_LOCK_THRESHOLD && totalDamage >= DAMAGE_LOCK_THRESHOLD;
        if (!crossedThreshold || this.isDefeated()) {
            return;
        }

        scene.queueEnemyLocks(LOCK_COUNT);
    }
}
