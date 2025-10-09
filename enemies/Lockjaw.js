import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, defendAction, lockAction } from './EnemyActions.js';

export class LockjawEnemy extends BaseEnemy {
    constructor() {
        super({
            name: 'Lockjaw',
            maxHealth: 80,
            moves: [
                {
                    key: 'lock_player_die',
                    label: 'Clamp: Lock 1 die',
                    actions: [lockAction(1)]
                },
                {
                    key: 'defend10_attack20',
                    label: 'Guarded Bite: Defend 10 + Attack 20',
                    actions: [
                        defendAction(10),
                        attackAction(20)
                    ]
                },
                {
                    key: 'defend20_attack10',
                    label: 'Iron Jaw: Defend 20 + Attack 10',
                    actions: [
                        defendAction(20),
                        attackAction(10)
                    ]
                }
            ]
        });
    }
}
