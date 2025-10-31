import { BlockbusterRelic } from './BlockbusterRelic.js';
import { BeefyRelic } from './BeefyRelic.js';
import { FamilyRelic } from './FamilyRelic.js';
import { ReRollWithItRelic } from './ReRollWithItRelic.js';
import { WildOneRelic } from './WildOneRelic.js';
import { StraightSudsRelic } from './StraightSudsRelic.js';
import { RainRelic } from './RainRelic.js';
import { PrepperRelic } from './PrepperRelic.js';
import { PerfectBalanceRelic } from './PerfectBalance.js';
import { ChainReactorRelic } from './ChainReactorRelic.js';
import { BatteryIncludedRelic } from './BatteryIncludedRelic.js';

const RELIC_ENTRIES = [
    { create: () => new ChainReactorRelic(), pools: ['boss'] },
    { create: () => new BatteryIncludedRelic(), pools: ['boss'] },
    { create: () => new BlockbusterRelic(), pools: ['general'] },
    { create: () => new BeefyRelic(), pools: ['general'] },
    { create: () => new FamilyRelic(), pools: ['general'] },
    { create: () => new ReRollWithItRelic(), pools: ['general'] },
    { create: () => new WildOneRelic(), pools: ['boss'] },
    { create: () => new StraightSudsRelic(), pools: ['general'] },
    { create: () => new RainRelic(), pools: ['general'] },
    { create: () => new PrepperRelic(), pools: ['boss'] },
    { create: () => new PerfectBalanceRelic(), pools: ['general'] }
];

function toPool(records, poolKey) {
    return records
        .filter(record => Array.isArray(record.pools) && record.pools.includes(poolKey))
        .map(record => record.relic);
}

export function buildRelicRegistry() {
    const relicRecords = [];

    RELIC_ENTRIES.forEach(entry => {
        if (typeof entry.create !== 'function') {
            return;
        }

        const relic = entry.create();
        if (!relic || !relic.id || relicRecords.some(record => record.id === relic.id)) {
            return;
        }

        relicRecords.push({
            id: relic.id,
            relic,
            pools: Array.isArray(entry.pools) ? [...entry.pools] : []
        });
    });

    const all = relicRecords.map(record => record.relic);
    const pools = {
        general: toPool(relicRecords, 'general'),
        boss: toPool(relicRecords, 'boss')
    };

    return { all, pools };
}
