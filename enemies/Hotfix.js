import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, healAction } from './EnemyActions.js';

export class HotfixEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Hotfix', maxHealth: 75 });
        this.scalingBurnValue = 3;
        this.moves = [
            {
                key: 'apply_burn',
                label: () => `Burn ${this.scalingBurnValue + 2}`,
                createActions: () => [burnAction(this.scalingBurnValue + 1)]
            },
            {
                key: 'heal_attack',
                label: 'Heal 10 + Attack 5',
                actions: [
                    healAction(10),
                    attackAction(5)
                ]
            },
            {
                key: 'burn_defend_loop',
                label: () => `Burn ${this.scalingBurnValue} + Defend 10`,
                createActions: () => {
                    const burnValue = this.scalingBurnValue;
                    this.scalingBurnValue += 1;
                    return [
                        burnAction(burnValue),
                        defendAction(5)
                    ];
                }
            }
        ];
    }
}
