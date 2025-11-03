import { Relic } from './RelicBase.js';

export class ChainReactorRelic extends Relic {
    constructor() {
        super({
            id: 'chain-reactor',
            name: 'Chain Reactor',
            description: 'Combo bonuses are stronger.',
            icon: '⛓️',
            cost: 200
        });
    }

    apply(scene) {
        if (!scene) {
            return;
        }

        scene.hasChainReactorRelic = true;
        if (typeof scene.updateComboListDisplay === 'function') {
            scene.updateComboListDisplay();
        }
        if (typeof scene.updateZonePreviewText === 'function') {
            scene.updateZonePreviewText();
        }
    }
}
