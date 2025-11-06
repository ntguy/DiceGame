export const MAX_CUSTOM_DICE = 6;

const DEFINITIONS = [
    {
        id: 'standard',
        name: 'Standard',
        emoji: '',
        description: 'A reliable die with no special properties.',
        upgradeDescription: 'You wasted an upgrade!',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'shield',
        name: 'Shield',
        emoji: '🛡️',
        description: 'Can only defend. 2X FV.',
        upgradeDescription: 'In defend zone: 2X FV.',
        allowedZones: ['defend']
    },
    {
        id: 'sword',
        name: 'Sword',
        emoji: '⚔️',
        description: 'Can only attack. 2X FV.',
        upgradeDescription: 'In attack zone: 2X FV.',
        allowedZones: ['attack']
    },
    {
        id: 'bonk',
        name: 'Bonk',
        emoji: '🦴',
        description: 'In No Combo: FV of 7.',
        upgradeDescription: 'In No Combo: FV of 9.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'pear',
        name: 'PearPair',
        emoji: '🍐',
        description: '+4 combo bonus in a Pair or Two Pair.',
        upgradeDescription: '+6 combo bonus in a Pair or Two Pair.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'flameout',
        name: 'Flame-Out',
        emoji: '🧯',
        description: 'FV=1-3: cleanse burn by FV.',
        upgradeDescription: 'FV=1-5: cleanse burn by FV.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'cherrybomb',
        name: 'Cherry Bomb',
        emoji: '🧨',
        description: 'FV=1-2: Burn enemy 2.',
        upgradeDescription: 'FV=1-2: Burn enemy 3.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'medicine',
        name: 'MeDICEne',
        emoji: '💊',
        description: 'FV=1-3: Heal 5. 3 effect uses per battle.',
        upgradeDescription: 'FV=1-3: Heal 8. 3 effect uses per battle.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'wild',
        name: 'Wild',
        emoji: '🤪',
        description: 'FV=1-4: Acts as wild for combo.',
        upgradeDescription: 'Acts as wild for combo.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'demolition',
        name: 'Demolition',
        emoji: '⚒️',
        description: 'FV=1-2: before attack, reduce enemy block by 10.',
        upgradeDescription: 'FV=1-3: before attack, reduce enemy block by 10.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'lucky',
        name: 'Call me Biased',
        emoji: '⚖️',
        description: 'Double chance to roll a 1 or a 6.',
        upgradeDescription: 'Always rolls a 1 or 6.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'bomb',
        name: 'Time Bomb',
        emoji: '💣',
        description: 'Unused turn: countdown -1. At 0: +20 attack once.',
        upgradeDescription: 'Unused turn: countdown -1. At 0: +30 attack once.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'comet',
        name: 'Comet',
        emoji: '☄️',
        description: 'FV=6: Burn 6. Take 3 Burn. One trigger per battle.',
        upgradeDescription: 'FV=6: Burn 8. Take 4 Burn. One trigger per battle.',
        allowedZones: ['attack', 'defend']
    },
    {
        id: 'charger',
        name: 'Charger',
        emoji: '🔌',
        description: 'If unused, +1 zone totals this battle. 3 triggers per battle.',
        upgradeDescription: 'If unused, +1 zone totals this battle. 5 triggers per battle.',
        allowedZones: ['attack', 'defend']
    }
];

const IN_DEVELOPMENT_DEFINITIONS = [];

const ALL_DEFINITIONS = [...DEFINITIONS, ...IN_DEVELOPMENT_DEFINITIONS];

export const CUSTOM_DICE_DEFINITIONS = ALL_DEFINITIONS.reduce((acc, def) => {
    acc[def.id] = def;
    return acc;
}, {});

export const SELECTABLE_CUSTOM_DICE_IDS = DEFINITIONS
    .filter(def => def.id !== 'standard')
    .map(def => def.id);

export const IN_DEVELOPMENT_CUSTOM_DICE_IDS = IN_DEVELOPMENT_DEFINITIONS.map(def => def.id);

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

let nextBlueprintUid = 1;

function generateBlueprintUid() {
    const uid = `bp-${nextBlueprintUid}`;
    nextBlueprintUid += 1;
    return uid;
}

export function createDieBlueprint(id, { isUpgraded = false } = {}) {
    const definition = getCustomDieDefinitionById(id);
    return {
        id: definition.id,
        isUpgraded: !!isUpgraded,
        uid: generateBlueprintUid()
    };
}
