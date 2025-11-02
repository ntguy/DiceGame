import { Relic } from './RelicBase.js';

export class FamilyRelic extends Relic {
    constructor() {
        super({
            id: 'family',
            name: 'Family',
            description: 'Full Houses heal 10 HP.',
            icon: '👪',
            cost: 120
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasFamilyRelic = true;
        // Family relic: track heal amount for each future Full House.
        scene.familyHealPerFullHouse = 10;
    }
}
