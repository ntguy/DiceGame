import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, lockAction, weakenAction } from './EnemyActions.js';

export class LockdownEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Lockdown', maxHealth: 200 });

        this.baseDefensePerReroll = 1;
        this.defensePerReroll = this.baseDefensePerReroll;

        this.moves = [
            {
                key: 'lockdown_guarded_blow',
                label: 'Iron Curtain: Defend 5 + Attack 10',
                actions: [defendAction(5), attackAction(10)]
            },
            {
                key: 'lockdown_suppress',
                label: 'Suppression Protocol: Defend 5 + Lock 2 Dice + Weaken 2 Dice',
                actions: [defendAction(5), lockAction(2), weakenAction(2)]
            },
            {
                key: 'lockdown_heat',
                label: 'Thermal Shield: Defend 5 + Burn 10',
                actions: [defendAction(5), burnAction(10)]
            },
            {
                key: 'lockdown_escalate',
                label: 'Total Control: Defend 10 + Lock 1 Die + Weaken 1 Die',
                createActions: () => {
                    this.defensePerReroll += 1;
                    return [defendAction(10), lockAction(1), weakenAction(1)];
                }
            }
        ];
    }

    onEncounterStart() {
        this.defensePerReroll = this.baseDefensePerReroll;
        this.moveIndex = 0;
    }

    getStatusDescription() {
        const value = Math.max(0, this.defensePerReroll);
        return `Status: Gains ${value} Defense per rerolled die.`;
    }

    onPlayerReroll(count, enemyManager) {
        if (!enemyManager || count <= 0) {
            return;
        }

        const gained = count * Math.max(0, this.defensePerReroll);
        if (gained > 0 && typeof enemyManager.addEnemyBlock === 'function') {
            enemyManager.addEnemyBlock(gained);
        }
    }
}
