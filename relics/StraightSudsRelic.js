import { Relic } from './RelicBase.js';

export class StraightSudsRelic extends Relic {
    constructor() {
        super({
            id: 'unlocked-and-loaded',
            name: 'Straight Suds',
            description: 'Penta and Sex Straight cleanse all dice of curses.',
            icon: '🧼',
            cost: 95
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.cleanseCursesOnLongStraights = true;
        // Straight Suds relic: long straights cleanse every die's curses.
    }
}
