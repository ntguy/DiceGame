import { Relic } from './RelicBase.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';

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
        if (!scene) {
            return;
        }
        // Beefy relic: boost max HP and heal immediately.
        callSceneMethod(scene, 'increasePlayerMaxHealth', 20, { heal: true });
    }
}
