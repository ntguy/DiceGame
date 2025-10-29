import { createDieBlueprint, getCustomDieDefinitionById } from './CustomDiceDefinitions.js';
import { callSceneMethod, callSceneManagerMethod } from '../utils/SceneHelpers.js';

const STANDARD_BLUEPRINT = (() => {
    const blueprint = createDieBlueprint('standard');
    return { ...blueprint, uid: `${blueprint.uid}-nullify` };
})();

export function doesDieActAsWildcardForCombo(die) {
    if (die && die.isNullified) {
        return false;
    }

    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = die && typeof die.value === 'number' ? die.value : 0;

    switch (definition.id) {
        case 'wild':
            // Wild die: acts as a combo wildcard, but requires FV<=4 until upgraded.
            if (isUpgraded) {
                return faceValue >= 1;
            }
            return faceValue >= 1 && faceValue <= 4;
        default:
            return false;
    }
}

function getBlueprint(die) {
    if (die && die.isNullified) {
        return STANDARD_BLUEPRINT;
    }
    if (die && die.dieBlueprint) {
        return die.dieBlueprint;
    }
    return STANDARD_BLUEPRINT;
}

export function getDieEmoji(dieOrId) {
    const id = typeof dieOrId === 'string'
        ? dieOrId
        : (dieOrId && dieOrId.dieBlueprint ? dieOrId.dieBlueprint.id : dieOrId?.id);
    const definition = getCustomDieDefinitionById(id);
    if (!definition) {
        return '';
    }

    return typeof definition.emoji === 'string' ? definition.emoji : '';
}

export function doesDieFaceValueTriggerRule(die, { zone } = {}) {
    if (!die) {
        return false;
    }

    if (die.isNullified) {
        return false;
    }

    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = typeof die.displayValue === 'number'
        ? die.displayValue
        : (typeof die.value === 'number' ? die.value : 0);

    switch (definition.id) {
        case 'cherrybomb':
            return faceValue >= 1 && faceValue <= 2;
        case 'medicine':
            return faceValue >= 1 && faceValue <= 3;
        case 'flameout':
            if (faceValue <= 0) {
                return false;
            }
            const flameoutThreshold = isUpgraded ? 5 : 3;
            return faceValue >= 1 && faceValue <= flameoutThreshold;
        case 'demolition': {
            const threshold = isUpgraded ? 3 : 2;
            return faceValue >= 1 && faceValue <= threshold;
        }
        default:
            return false;
    }
}

export function getDieAllowedZones(dieOrBlueprint) {
    if (dieOrBlueprint && dieOrBlueprint.isNullified) {
        return ['attack', 'defend'];
    }
    const id = typeof dieOrBlueprint === 'string'
        ? dieOrBlueprint
        : (dieOrBlueprint && dieOrBlueprint.id);
    const isUpgraded = typeof dieOrBlueprint === 'object' && !!dieOrBlueprint?.isUpgraded;
    const definition = getCustomDieDefinitionById(id);

    if (isUpgraded && (id === 'sword' || id === 'shield')) {
        return ['attack', 'defend'];
    }

    return Array.isArray(definition.allowedZones) ? definition.allowedZones : ['attack', 'defend'];
}

export function isZoneAllowedForDie(die, zone) {
    if (!zone) {
        return true;
    }
    if (die && die.isNullified) {
        return true;
    }
    const blueprint = getBlueprint(die);
    const allowedZones = getDieAllowedZones(blueprint);
    return allowedZones.includes(zone);
}

export function rollCustomDieValue(scene, die) {
    if (die && die.isNullified) {
        return Phaser.Math.Between(1, 6);
    }
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;

    const rollWeighted = weights => {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        if (total <= 0) {
            return Phaser.Math.Between(1, 6);
        }
        const target = Phaser.Math.FloatBetween(0, total);
        let cumulative = 0;
        for (let i = 0; i < weights.length; i += 1) {
            cumulative += weights[i];
            if (target <= cumulative) {
                return i + 1;
            }
        }
        return weights.length;
    };

    switch (definition.id) {
        case 'lucky':
            // Lucky die: skew odds toward higher rolls when upgraded.
            if (isUpgraded) {
                return Phaser.Math.Between(0, 1) === 0 ? 1 : 6;
            }
            return rollWeighted([2, 1, 1, 1, 1, 2]);
        default:
            return Phaser.Math.Between(1, 6);
    }
}

function getBaseFaceContribution({ die, zone, comboType }) {
    if (die && die.isNullified) {
        const baseFace = typeof die.value === 'number' ? die.value : 0;
        return baseFace;
    }
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const baseFace = typeof die.value === 'number' ? die.value : 0;

    switch (definition.id) {
        case 'shield':
            // Shield die: doubles defensive contributions.
            return zone === 'defend' ? baseFace * 2 : baseFace;
        case 'sword':
            // Sword die: doubles offensive contributions.
            return zone === 'attack' ? baseFace * 2 : baseFace;
        case 'bonk':
            // Bonk die: guarantees strong value with no combo.
            if (comboType === 'No combo') {
                return isUpgraded ? 9 : 7;
            }
            return baseFace;
        default:
            return baseFace;
    }
}

function getComboBonusModifier({ die, zone, comboType }) {
    if (die && die.isNullified) {
        return 0;
    }
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;

    switch (definition.id) {
        case 'pear': {
            // Pear die: boosts pair-based combos.
            if (comboType === 'Pair') {
                return isUpgraded ? 6 : 5;
            }
            if (isUpgraded && comboType === 'Two Pair') {
                return 6;
            }
            return 0;
        }
        default:
            return 0;
    }
}

function getPreResolutionEffects({ die, zone }) {
    if (die && die.isNullified) {
        return [];
    }
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = typeof die.value === 'number' ? die.value : 0;

    const effects = [];

    if (definition.id === 'demolition') {
        // Demolition die: chips away at enemy block before the roll resolves.
        const threshold = isUpgraded ? 3 : 2;
        if (faceValue >= 1 && faceValue <= threshold) {
            effects.push(context => {
                const { scene } = context || {};
                callSceneManagerMethod(scene, 'enemyManager', 'reduceEnemyBlock', 10);
                callSceneMethod(scene, 'updateEnemyHealthUI');
                callSceneMethod(scene, 'refreshEnemyIntentText');
                callSceneMethod(scene, 'updateEnemyStatusText');
            });
        }
    }

    if (definition.id === 'cherrybomb') {
        // Cherry Bomb die: applies burn to the enemy before resolution when rolled low.
        const shouldIgnite = faceValue >= 1 && faceValue <= 2;
        if (shouldIgnite) {
            const burnAmount = isUpgraded ? 3 : 2;
            effects.push(context => {
                const { scene } = context || {};
                callSceneMethod(scene, 'applyEnemyBurn', burnAmount);
            });
        }
    }

    return effects;
}

function getPostResolutionEffects({ die, zone }) {
    if (die && die.isNullified) {
        return [];
    }
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = typeof die.value === 'number' ? die.value : 0;

    const effects = [];

    if (definition.id === 'flameout') {
        // Flameout die: cleanses burn when rolled low or upgraded.
        const threshold = isUpgraded ? 5 : 3;
        const shouldCleanse = faceValue >= 1 && faceValue <= threshold;
        if (shouldCleanse) {
            effects.push(context => {
                const { scene } = context || {};
                callSceneMethod(scene, 'reducePlayerBurn', faceValue);
            });
        }
    }

    if (definition.id === 'medicine') {
        // MeDICEne die: heals the player when rolled low.
        const shouldHeal = faceValue >= 1 && faceValue <= 3;
        if (shouldHeal) {
            const healAmount = isUpgraded ? 8 : 5;
            effects.push(context => {
                const { scene } = context || {};
                callSceneMethod(scene, 'healPlayer', healAmount);
            });
        }
    }

    return effects;
}

export function computeDieContribution(scene, die, { zone, comboType }) {
    if (!die) {
        return {
            faceValueContribution: 0,
            comboBonusModifier: 0,
            preResolutionEffects: [],
            postResolutionEffects: [],
            blueprint: createDieBlueprint('standard'),
            zone,
            comboType
        };
    }

    const blueprint = getBlueprint(die);
    const isWeakened = !!die.isWeakened;

    if (isWeakened) {
        return {
            faceValueContribution: 0,
            comboBonusModifier: 0,
            preResolutionEffects: [],
            postResolutionEffects: [],
            blueprint,
            zone,
            comboType
        };
    }

    const faceValueContribution = Math.max(0, getBaseFaceContribution({ die, zone, comboType }));
    const comboBonusModifier = getComboBonusModifier({ die, zone, comboType });
    const preResolutionEffects = getPreResolutionEffects({ die, zone });
    const postResolutionEffects = getPostResolutionEffects({ die, zone });

    return {
        faceValueContribution,
        comboBonusModifier,
        preResolutionEffects,
        postResolutionEffects,
        blueprint,
        zone,
        comboType
    };
}
