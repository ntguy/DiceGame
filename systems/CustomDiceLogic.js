const ZONE_ATTACK = 'attack';
const ZONE_DEFEND = 'defend';
const MAX_CUSTOM_DICE_SLOTS = 6;

function weightedRandom(weights) {
    if (!Array.isArray(weights) || weights.length === 0) {
        return Phaser.Math.Between(1, 6);
    }

    const totalWeight = weights.reduce((sum, entry) => sum + (entry.weight || 0), 0);
    if (totalWeight <= 0) {
        return Phaser.Math.Between(1, 6);
    }

    const roll = Phaser.Math.FloatBetween ? Phaser.Math.FloatBetween(0, totalWeight) : Math.random() * totalWeight;
    let cumulative = 0;
    for (const entry of weights) {
        cumulative += entry.weight || 0;
        if (roll <= cumulative) {
            return entry.value;
        }
    }

    return weights[weights.length - 1].value;
}

const CUSTOM_DICE_TYPES = {
    standard: {
        id: 'standard',
        name: 'Standard Die',
        emoji: '🎲',
        description: 'A reliable die with no special abilities.',
        upgradeDescription: 'A reliable die with no special abilities.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    },
    shield: {
        id: 'shield',
        name: 'Bulwark Die',
        emoji: '🛡️',
        description: 'Defend only. Doubles its face value during resolve.',
        upgradeDescription: 'Defend only. Doubles its face value during resolve.',
        allowedZones: [ZONE_DEFEND]
    },
    sword: {
        id: 'sword',
        name: 'Raid Die',
        emoji: '⚔️',
        description: 'Attack only. Doubles its face value during resolve.',
        upgradeDescription: 'Attack only. Doubles its face value during resolve.',
        allowedZones: [ZONE_ATTACK]
    },
    bomb: {
        id: 'bomb',
        name: 'Bombard Die',
        emoji: '💣',
        description: 'Any zone. Deals extra attack damage equal to its face value.',
        upgradeDescription: 'Any zone. Deals extra attack damage equal to face value + 2.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    },
    bone: {
        id: 'bone',
        name: 'Fossil Die',
        emoji: '🦴',
        description: 'Any zone. Counts as 6 when the zone has No Combo.',
        upgradeDescription: 'Any zone. Counts as 8 when the zone has No Combo.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    },
    pear: {
        id: 'pear',
        name: 'Pairing Die',
        emoji: '🍐',
        description: 'Any zone. Grants +5 combo bonus when in a Pair.',
        upgradeDescription: 'Any zone. Grants +6 combo bonus in Pair or Two Pair.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    },
    extinguisher: {
        id: 'extinguisher',
        name: 'Extinguisher Die',
        emoji: '🧯',
        description: 'Any zone. On 1-4 cleanses burn equal to its face value.',
        upgradeDescription: 'Any zone. Cleanses burn equal to its face value.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    },
    lockpick: {
        id: 'lockpick',
        name: 'Breaker Die',
        emoji: '🔓',
        description: 'Attack only. Fixed at 1. Removes enemy block before attacking.',
        upgradeDescription: 'Attack only. Fixed at 1. Removes enemy block before attacking.',
        allowedZones: [ZONE_ATTACK]
    },
    lucky: {
        id: 'lucky',
        name: 'Lucky Die',
        emoji: '🤞',
        description: 'Any zone. Increased chance to roll 1 or 6.',
        upgradeDescription: 'Any zone. Increased chance to roll 3 or 6.',
        allowedZones: [ZONE_ATTACK, ZONE_DEFEND]
    }
};

const NON_STANDARD_IDS = Object.keys(CUSTOM_DICE_TYPES).filter(id => id !== 'standard');

export function getDieType(id) {
    return CUSTOM_DICE_TYPES[id] || CUSTOM_DICE_TYPES.standard;
}

export function createDieState(id, { upgraded = false } = {}) {
    const type = getDieType(id);
    return {
        id: type.id,
        upgraded: Boolean(upgraded)
    };
}

export function cloneDieState(state) {
    if (!state || typeof state !== 'object') {
        return createDieState('standard');
    }
    return createDieState(state.id, { upgraded: !!state.upgraded });
}

export function upgradeDieState(state) {
    if (!state) {
        return createDieState('standard', { upgraded: true });
    }
    if (state.upgraded) {
        return cloneDieState(state);
    }
    return createDieState(state.id, { upgraded: true });
}

export function getDieEmoji(state) {
    const type = getDieType(state && state.id);
    return type.emoji || '';
}

export function getDieName(state) {
    const type = getDieType(state && state.id);
    return type.name;
}

export function getDieDescription(state) {
    const type = getDieType(state && state.id);
    if (state && state.upgraded && type.upgradeDescription) {
        return type.upgradeDescription;
    }
    return type.description;
}

export function getDieUpgradeDescription(state) {
    const type = getDieType(state && state.id);
    return type.upgradeDescription;
}

export function getAllowedZones(state) {
    const type = getDieType(state && state.id);
    return Array.isArray(type.allowedZones)
        ? [...type.allowedZones]
        : [ZONE_ATTACK, ZONE_DEFEND];
}

export function rollValueForDie(state) {
    const type = getDieType(state && state.id);

    if (type.id === 'lockpick') {
        return 1;
    }

    if (type.id === 'lucky') {
        const weights = state && state.upgraded
            ? [
                { value: 1, weight: 1 },
                { value: 2, weight: 1 },
                { value: 3, weight: 2 },
                { value: 4, weight: 1 },
                { value: 5, weight: 1 },
                { value: 6, weight: 2 }
            ]
            : [
                { value: 1, weight: 2 },
                { value: 2, weight: 1 },
                { value: 3, weight: 1 },
                { value: 4, weight: 1 },
                { value: 5, weight: 1 },
                { value: 6, weight: 2 }
            ];
        return weightedRandom(weights);
    }

    return Phaser.Math.Between(1, 6);
}

function getDieBaseValue(die) {
    if (!die) {
        return 0;
    }
    if (die.isWeakened) {
        return 0;
    }
    if (typeof die.wildAssignedValue === 'number') {
        return die.wildAssignedValue;
    }
    if (typeof die.value === 'number') {
        return die.value;
    }
    return 0;
}

export function calculateDieZoneContribution({ die, zone, comboType }) {
    const state = die && die.dieState ? die.dieState : createDieState('standard');
    const type = getDieType(state && state.id);
    const baseValue = getDieBaseValue(die);
    let baseContribution = baseValue;
    let comboBonusAdjustment = 0;
    let bonusAttack = 0;
    let bonusBlock = 0;
    let burnCleansed = 0;
    let removesEnemyBlock = false;

    switch (type.id) {
        case 'shield':
            if (zone === ZONE_DEFEND) {
                baseContribution = baseValue * 2;
            }
            break;
        case 'sword':
            if (zone === ZONE_ATTACK) {
                baseContribution = baseValue * 2;
            }
            break;
        case 'bomb':
            if (baseValue > 0) {
                const extra = baseValue + (state.upgraded ? 2 : 0);
                bonusAttack += Math.max(0, extra);
            }
            break;
        case 'bone':
            if (comboType === 'No Combo' && baseValue > 0) {
                baseContribution = state.upgraded ? 8 : 6;
            }
            break;
        case 'pear':
            if (comboType === 'Pair') {
                comboBonusAdjustment += state.upgraded ? 6 : 5;
            } else if (state.upgraded && comboType === 'Two Pair') {
                comboBonusAdjustment += 6;
            }
            break;
        case 'extinguisher':
            if (baseValue > 0) {
                const cleanseThreshold = state.upgraded ? 6 : 4;
                if (baseValue <= cleanseThreshold) {
                    burnCleansed += baseValue;
                }
            }
            break;
        case 'lockpick':
            baseContribution = die && die.isWeakened ? 0 : 1;
            if (!die || die.isWeakened) {
                break;
            }
            if (zone === ZONE_ATTACK || state.upgraded) {
                removesEnemyBlock = true;
            }
            break;
        default:
            break;
    }

    return {
        baseContribution,
        comboBonusAdjustment,
        bonusAttack,
        bonusBlock,
        burnCleansed,
        removesEnemyBlock
    };
}

export function getRandomDieOptions(count = 3) {
    const options = [];
    if (NON_STANDARD_IDS.length === 0) {
        return options;
    }
    for (let i = 0; i < count; i += 1) {
        const index = Phaser.Math.Between(0, NON_STANDARD_IDS.length - 1);
        const id = NON_STANDARD_IDS[index];
        options.push(createDieState(id));
    }
    return options;
}

export function getMaxCustomDiceSlots() {
    return MAX_CUSTOM_DICE_SLOTS;
}

export const CUSTOM_DICE_ZONE = {
    ATTACK: ZONE_ATTACK,
    DEFEND: ZONE_DEFEND
};
