import { Relic } from './RelicBase.js';

export class PerfectlyBalancedRelic extends Relic {
    constructor() {
        super({
            id: 'perfectly-balanced',
            name: 'Perfectly Balanced',
            description: '+4 to zone totals when they contain an equal number of dice.',
            icon: '☯️',
            cost: 140
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasPerfectlyBalancedRelic = true;
        const currentBonus = typeof scene.perfectlyBalancedZoneBonus === 'number'
            ? scene.perfectlyBalancedZoneBonus
            : 0;
        scene.perfectlyBalancedZoneBonus = Math.max(currentBonus, 4);
    }
}
