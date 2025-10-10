import { Relic } from './RelicBase.js';

export class BeefyRelic extends Relic {
    constructor() {
        super({
            id: 'beefy',
            name: 'Beefy',
            description: '+20 max HP and heal the same amount.',
            icon: '🥩'
        });
    }

    apply(scene) {
        if (!scene || typeof scene.increasePlayerMaxHealth !== 'function') {
            return;
        }

        scene.increasePlayerMaxHealth(20, { heal: true });
    }
}
