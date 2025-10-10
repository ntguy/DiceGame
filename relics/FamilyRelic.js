import { Relic } from './RelicBase.js';

export class FamilyRelic extends Relic {
    constructor() {
        super({
            id: 'family',
            name: 'Family',
            description: 'Full Houses heal 10 HP.',
            icon: '👪',
            cost: 130
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasFamilyRelic = true;
        scene.familyHealPerFullHouse = 10;
    }
}
