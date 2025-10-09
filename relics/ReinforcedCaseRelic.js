import { Relic } from './RelicBase.js';

export class ReinforcedCaseRelic extends Relic {
    constructor() {
        super({
            id: 'reinforced-case',
            name: 'Reinforced Case',
            description: 'The dice case fortifies you, granting +5 max HP.',
            icon: '🛡️'
        });
    }

    apply(scene) {
        if (scene && typeof scene.increasePlayerMaxHealth === 'function') {
            scene.increasePlayerMaxHealth(5, { heal: true });
        }
    }
}
