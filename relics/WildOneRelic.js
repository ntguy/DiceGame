import { Relic } from './RelicBase.js';
import { callSceneMethod } from '../utils/SceneHelpers.js';

export class WildOneRelic extends Relic {
    constructor() {
        super({
            id: 'wild-one',
            name: 'Wild One',
            description: '1s act as wildcards during combo evaluation.',
            icon: '🃏',
            cost: 200
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasWildOneRelic = true;
        // Wild One relic: update UI so wildcard assignments appear immediately.
        callSceneMethod(scene, 'updateZonePreviewText');
        callSceneMethod(scene, 'refreshActiveDiceVisuals');
    }
}
