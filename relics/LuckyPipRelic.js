import { Relic } from './RelicBase.js';

export class LuckyPipRelic extends Relic {
    constructor() {
        super({
            id: 'lucky-pip',
            name: 'Lucky Pip',
            description: 'A shimmering pip that adds +5 max HP.',
            icon: '🎲'
        });
    }

    apply(scene) {
        if (scene && typeof scene.increasePlayerMaxHealth === 'function') {
            scene.increasePlayerMaxHealth(5, { heal: true });
        }
    }
}
