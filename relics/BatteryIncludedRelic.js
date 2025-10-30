import { Relic } from './RelicBase.js';

export class BatteryIncludedRelic extends Relic {
    constructor() {
        super({
            id: 'battery-included',
            name: 'Battery Included',
            description: '+1 standard die that can be resolved three times per battle.',
            icon: '🔋',
            cost: 130
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasBatteryIncludedRelic = true;
        if (scene.inCombat && typeof scene.initializeBatteryDieStateForEncounter === 'function') {
            scene.initializeBatteryDieStateForEncounter();
        } else if (typeof scene.refreshHandSlotCount === 'function') {
            scene.refreshHandSlotCount();
        }

        if (typeof scene.updateZonePreviewText === 'function') {
            scene.updateZonePreviewText();
        }
    }
}
