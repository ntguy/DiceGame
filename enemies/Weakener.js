import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, defendAction, healAction, weakenAction } from './EnemyActions.js';

export class WeakenerEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Weakener', maxHealth: 140 });

        this.baseAttackValue = 15;
        this.baseDefendValue = 10;
        this.attackValue = this.baseAttackValue;
        this.defendValue = this.baseDefendValue;

        this.moves = [
            {
                key: 'weakener_mass_weaken',
                label: 'Enervating Wave: Weaken 4 Dice',
                actions: [weakenAction(4)]
            },
            {
                key: 'weakener_attack',
                label: () => `Crippling Strike: Attack ${this.attackValue}`,
                createActions: () => [attackAction(this.attackValue)]
            },
            {
                key: 'weakener_weaken_defend',
                label: () => `Sapping Guard: Weaken 2 Dice + Defend ${this.defendValue}`,
                createActions: () => [
                    weakenAction(2),
                    defendAction(this.defendValue)
                ]
            },
            {
                key: 'weakener_heal',
                label: 'Rejuvenate: Heal 20 (+10 Attack/+10 Defend)',
                createActions: () => {
                    this.attackValue += 10;
                    this.defendValue += 10;
                    return [healAction(20)];
                }
            }
        ];
    }

    onEncounterStart() {
        this.attackValue = this.baseAttackValue;
        this.defendValue = this.baseDefendValue;
        this.moveIndex = 0;
    }
}
