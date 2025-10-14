import { Relic } from './RelicBase.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';

export class ReRollWithItRelic extends Relic {
    constructor() {
        super({
            id: 'reroll-with-it',
            name: 'Re-Roll with it',
            description: 'Gain 1 Defense per dice re-rolled.',
            icon: '🎲',
            cost: 120
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.rerollDefensePerDie = (scene.rerollDefensePerDie || 0) + 1;
        // Re-Roll with it relic: refresh previews to include new defense bonus.
        callSceneMethod(scene, 'updateZonePreviewText');
    }
}
