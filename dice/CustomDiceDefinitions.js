export const MAX_CUSTOM_DICE = 6;

const DEFINITIONS = [
    {
        id: 'standard',
        name: 'Standard',
        emoji: '',
        description: 'A reliable die with no special properties.',
        upgradeDescription: 'Upgrade TBD.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'shield',
        name: 'Bulwark',
        emoji: '🛡️',
        description: 'Can only defend. 2× face value while resolving Defend.',
        upgradeDescription: 'Upgrade: 2× face value while in Defend.',
        allowedZones: ['defend']
    },
    {
        id: 'sword',
        name: 'Warrior',
        emoji: '⚔️',
        description: 'Can only attack. 2× face value while resolving Attack.',
        upgradeDescription: 'Upgrade: 2× face value while in Attack.',
        allowedZones: ['attack']
    },
    {
        id: 'bomb',
        name: 'Bombard',
        emoji: '💣',
        description: 'Deal damage to all enemies equal to face value.',
        upgradeDescription: 'Upgrade: Damage equals face value + 2.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'bone',
        name: 'Wishbone',
        emoji: '🦴',
        description: 'Counts as 6 face value if the zone has no combo.',
        upgradeDescription: 'Upgrade: Counts as 8 face value in No combo.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'pear',
        name: 'Pear Pair',
        emoji: '🍐',
        description: '+5 combo bonus when part of a Pair.',
        upgradeDescription: 'Upgrade: +6 combo bonus in Pair or Two Pair.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'extinguisher',
        name: 'Extinguisher',
        emoji: '🧯',
        description: 'If rolling 1-4, cleanse burn equal to face value.',
        upgradeDescription: 'Upgrade: Cleanse burn equal to face value.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'unlock',
        name: 'Unlocked',
        emoji: '🔓',
        description: 'If attacking with a 1, destroy all enemy block.',
        upgradeDescription: 'Upgrade: Any 1 destroys all enemy block.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'lucky',
        name: 'Lucky',
        emoji: '🤞',
        description: 'Double chance to roll a 1 or a 6.',
        upgradeDescription: 'Upgrade: Double chance to roll a 3 or 6.',
        allowedZones: ['attack', 'defend']
    }
];

export const CUSTOM_DICE_DEFINITIONS = DEFINITIONS.reduce((acc, def) => {
    acc[def.id] = def;
    return acc;
}, {});

export const SELECTABLE_CUSTOM_DICE_IDS = DEFINITIONS
    .filter(def => def.id !== 'standard')
    .map(def => def.id);

export function getCustomDieDefinitionById(id) {
    if (!id || !CUSTOM_DICE_DEFINITIONS[id]) {
        return CUSTOM_DICE_DEFINITIONS.standard;
    }
    return CUSTOM_DICE_DEFINITIONS[id];
}

export function getRandomCustomDieOptions(scene, count = 3, { excludeIds = [] } = {}) {
    const pool = SELECTABLE_CUSTOM_DICE_IDS.filter(id => !excludeIds.includes(id));
    if (pool.length === 0) {
        return [];
    }

    const shuffled = scene && Phaser && Phaser.Utils && Phaser.Utils.Array && typeof Phaser.Utils.Array.Shuffle === 'function'
        ? Phaser.Utils.Array.Shuffle([...pool])
        : [...pool];

    const slice = shuffled.slice(0, Math.min(count, shuffled.length));
    return slice.map(id => getCustomDieDefinitionById(id));
}

export function createDieBlueprint(id, { isUpgraded = false } = {}) {
    const definition = getCustomDieDefinitionById(id);
    return {
        id: definition.id,
        isUpgraded: !!isUpgraded
    };
}
