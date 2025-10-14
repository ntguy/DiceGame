import { createDieBlueprint, getCustomDieDefinitionById } from './CustomDiceDefinitions.js';
import { callSceneMethod, callSceneManagerMethod } from '../utils/SceneHelpers.js';

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

    if (definition.id === 'demolition') {
        // Demolition die: chips away at enemy block before the attack resolves.
        const maxTriggerValue = isUpgraded ? 3 : 2;
        const shouldTrigger = zone === 'attack'
            && faceValue >= 1
            && faceValue <= maxTriggerValue;

        if (shouldTrigger) {
            return [context => {
                const { scene } = context || {};
                const reduced = callSceneManagerMethod(scene, 'enemyManager', 'reduceEnemyBlock', 10);
                if (reduced > 0) {
                    callSceneMethod(scene, 'updateEnemyStatusText');
                }
            }];
        }
    }

    return [];
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
