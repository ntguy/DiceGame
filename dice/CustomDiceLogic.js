import { createDieBlueprint, getCustomDieDefinitionById } from './CustomDiceDefinitions.js';
import { callSceneMethod, callSceneManagerMethod } from '../utils/SceneHelpers.js';

export function doesDieActAsWildcardForCombo(die) {
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const faceValue = die && typeof die.value === 'number' ? die.value : 0;

    switch (definition.id) {
        case 'wild':
            // Wild die: always acts as a combo wildcard regardless of current face value.
            return faceValue >= 1;
        default:
            return false;
    }
}

function getBlueprint(die) {
    if (die && die.dieBlueprint) {
        return die.dieBlueprint;
    }
    return createDieBlueprint('standard');
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

    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = typeof die.displayValue === 'number'
        ? die.displayValue
        : (typeof die.value === 'number' ? die.value : 0);

    switch (definition.id) {
        case 'firecracker':
            return faceValue >= 1 && faceValue <= 2;
        case 'medicine':
            return faceValue >= 1 && faceValue <= 3;
        case 'flameout':
            return faceValue > 0 && (isUpgraded || faceValue <= 4);
        case 'demolition': {
            const threshold = isUpgraded ? 3 : 2;
            return faceValue >= 1 && faceValue <= threshold;
        }
        default:
            return false;
    }
}

export function getDieAllowedZones(dieOrBlueprint) {
    const id = typeof dieOrBlueprint === 'string'
        ? dieOrBlueprint
        : (dieOrBlueprint && dieOrBlueprint.id);
    const definition = getCustomDieDefinitionById(id);
    return Array.isArray(definition.allowedZones) ? definition.allowedZones : ['attack', 'defend'];
}

export function isZoneAllowedForDie(die, zone) {
    if (!zone) {
        return true;
    }
    const blueprint = getBlueprint(die);
    const allowedZones = getDieAllowedZones(blueprint);
    return allowedZones.includes(zone);
}

export function rollCustomDieValue(scene, die) {
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
                return rollWeighted([1, 1, 2, 1, 1, 2]);
            }
            return rollWeighted([2, 1, 1, 1, 1, 2]);
        default:
            return Phaser.Math.Between(1, 6);
    }
}

function getBaseFaceContribution({ die, zone, comboType }) {
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
                return isUpgraded ? 8 : 6;
            }
            return baseFace;
        default:
            return baseFace;
    }
}

function getComboBonusModifier({ die, zone, comboType }) {
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

    if (definition.id === 'firecracker') {
        // Firecracker die: applies burn to the enemy before resolution when rolled low.
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
    const blueprint = getBlueprint(die);
    const definition = getCustomDieDefinitionById(blueprint.id);
    const isUpgraded = !!blueprint.isUpgraded;
    const faceValue = typeof die.value === 'number' ? die.value : 0;

    const effects = [];

    if (definition.id === 'bomb') {
        // Bomb die: damages every enemy after resolution.
        const damage = faceValue + (isUpgraded ? 2 : 0);
        if (damage > 0) {
            effects.push(context => {
                const { scene } = context || {};
                const defeatedCurrent = callSceneManagerMethod(scene, 'enemyManager', 'damageAllEnemies', damage) === true;
                callSceneMethod(scene, 'updateEnemyHealthUI');
                if (defeatedCurrent) {
                    callSceneMethod(scene, 'handleEnemyDefeat');
                }
            });
        }
    }

    if (definition.id === 'flameout') {
        // Flameout die: cleanses burn when rolled low or upgraded.
        const shouldCleanse = isUpgraded || (faceValue >= 1 && faceValue <= 4);
        if (shouldCleanse && faceValue > 0) {
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
