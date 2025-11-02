import { Relic } from './RelicBase.js';

export class PerfectBalanceRelic extends Relic {
    constructor() {
        super({
            id: 'perfect-balance',
            name: 'Perfect Balance',
            description: '+4 to zone totals when they contain an equal number of dice.',
            icon: '☯️',
            cost: 101
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasPerfectBalanceRelic = true;
        const currentBonus = typeof scene.perfectBalanceZoneBonus === 'number'
            ? scene.perfectBalanceZoneBonus
            : 0;
        scene.perfectBalanceZoneBonus = Math.max(currentBonus, 4);
    }
}
