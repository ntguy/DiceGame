import { Relic } from './RelicBase.js';

export class UnlockedAndLoadedRelic extends Relic {
    constructor() {
        super({
            id: 'unlocked-and-loaded',
            name: 'Unlocked and Loaded',
            description: 'Penta & Sex Straights unlock all dice.',
            icon: '🔓',
            cost: 80
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.unlocksOnLongStraights = true;
    }
}
