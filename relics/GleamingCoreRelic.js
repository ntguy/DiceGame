import { Relic } from './RelicBase.js';

export class GleamingCoreRelic extends Relic {
    constructor() {
        super({
            id: 'gleaming-core',
            name: 'Gleaming Core',
            description: 'A radiant core that pulses with +5 max HP.',
            icon: '💠'
        });
    }

    apply(scene) {
        if (scene && typeof scene.increasePlayerMaxHealth === 'function') {
            scene.increasePlayerMaxHealth(5, { heal: true });
        }
    }
}
