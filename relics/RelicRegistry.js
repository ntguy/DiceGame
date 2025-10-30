import { BlockbusterRelic } from './BlockbusterRelic.js';
import { BeefyRelic } from './BeefyRelic.js';
import { FamilyRelic } from './FamilyRelic.js';
import { ReRollWithItRelic } from './ReRollWithItRelic.js';
import { WildOneRelic } from './WildOneRelic.js';
import { StraightSudsRelic } from './StraightSudsRelic.js';
import { RainRelic } from './RainRelic.js';
import { PrepperRelic } from './PrepperRelic.js';
import { PerfectlyBalancedRelic } from './PerfectlyBalancedRelic.js';

const RELIC_ENTRIES = [
    { create: () => new BlockbusterRelic(), pools: ['general', 'boss'] },
    { create: () => new BeefyRelic(), pools: ['general', 'boss'] },
    { create: () => new FamilyRelic(), pools: ['general', 'boss'] },
    { create: () => new ReRollWithItRelic(), pools: ['general', 'boss'] },
    { create: () => new WildOneRelic(), pools: ['general', 'boss'] },
    { create: () => new StraightSudsRelic(), pools: ['general', 'boss'] },
    { create: () => new RainRelic(), pools: ['general', 'boss'] },
    { create: () => new PrepperRelic(), pools: ['general', 'boss'] },
    { create: () => new PerfectlyBalancedRelic(), pools: ['general', 'boss'] }
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
