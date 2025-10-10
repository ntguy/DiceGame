import { Relic } from './RelicBase.js';

export class BeefyRelic extends Relic {
    constructor() {
        super({
            id: 'beefy',
            name: 'Beefy',
            description: '+20 Max HP and heal 20.',
            icon: '🥩',
            cost: 100
        });
    }

    apply(scene) {
        if (!scene || typeof scene.increasePlayerMaxHealth !== 'function') {
            return;
        }

        scene.increasePlayerMaxHealth(20, { heal: true });
    }
}
