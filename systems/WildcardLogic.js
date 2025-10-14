import { scoreCombo } from './ComboSystem.js';

const DEFAULT_WILDCARD_FACES = [1, 2, 3, 4, 5, 6];

export function resolveWildcardCombo(values, evaluateComboFn, {
    wildcardValue = 1,
    possibleFaces = DEFAULT_WILDCARD_FACES,
    wildcardIndices: explicitIndices,
    getFacesForIndex
} = {}) {
    if (!Array.isArray(values) || typeof evaluateComboFn !== 'function') {
        return { type: 'No combo' };
    }

    const baseValues = [...values];
    const validFaces = Array.isArray(possibleFaces) && possibleFaces.length > 0
        ? [...possibleFaces]
        : [...DEFAULT_WILDCARD_FACES];

    let wildcardIndices = Array.isArray(explicitIndices)
        ? [...new Set(explicitIndices.filter(index => index >= 0 && index < baseValues.length))]
        : null;

    if (!wildcardIndices || wildcardIndices.length === 0) {
        wildcardIndices = baseValues
            .map((value, index) => ({ value, index }))
            .filter(entry => entry.value === wildcardValue)
            .map(entry => entry.index);
    }

    if (wildcardIndices.length === 0) {
        const evaluation = evaluateComboFn(baseValues);
        return { ...evaluation, assignments: [...baseValues] };
    }

    let bestResult = null;
    let bestComboScore = -Infinity;
    let bestTotal = -Infinity;
    let bestAssignments = null;

    const assignValue = (depth, workingValues) => {
        if (depth === wildcardIndices.length) {
            const evaluation = evaluateComboFn(workingValues);
            const comboScore = scoreCombo(evaluation.type);
            const totalValue = workingValues.reduce((sum, value) => sum + value, 0);

            if (
                comboScore > bestComboScore ||
                (comboScore === bestComboScore && totalValue > bestTotal)
            ) {
                bestComboScore = comboScore;
                bestTotal = totalValue;
                bestResult = evaluation;
                bestAssignments = [...workingValues];
            }
            return;
        }

        const index = wildcardIndices[depth];
        const faces = typeof getFacesForIndex === 'function'
            ? getFacesForIndex(index, depth, baseValues[index])
            : null;
        const candidateFaces = Array.isArray(faces) && faces.length > 0
            ? faces
            : validFaces;

        candidateFaces.forEach(face => {
            workingValues[index] = face;
            assignValue(depth + 1, workingValues);
        });
    };

    assignValue(0, [...baseValues]);

    if (!bestResult) {
        const evaluation = evaluateComboFn(baseValues);
        return { ...evaluation, assignments: [...baseValues] };
    }

    return {
        ...bestResult,
        assignments: bestAssignments ? [...bestAssignments] : [...baseValues]
    };
}

export function buildWildcardConfig(diceList, { hasWildOneRelic = false } = {}) {
    if (!Array.isArray(diceList) || diceList.length === 0) {
        return null;
    }

    const wildcardIndices = [];
    const possibleFacesByIndex = new Map();
    const highlightIndices = new Set();

    diceList.forEach((die, index) => {
        if (!die) {
            return;
        }

        const faceValue = typeof die.value === 'number' ? die.value : 0;
        const blueprint = die.dieBlueprint || null;
        const dieId = blueprint && typeof blueprint.id === 'string' ? blueprint.id : null;
        const isUpgraded = blueprint ? !!blueprint.isUpgraded : false;

        let isWildcard = false;

        if (dieId === 'wild') {
            // Wild die: acts as a wildcard when upgraded or rolled 1-4.
            if (isUpgraded || (faceValue >= 1 && faceValue <= 4)) {
                isWildcard = true;
            }
        }

        if (!isWildcard && hasWildOneRelic && faceValue === 1) {
            isWildcard = true;
        }

        if (!isWildcard) {
            return;
        }

        if (!possibleFacesByIndex.has(index)) {
            possibleFacesByIndex.set(index, DEFAULT_WILDCARD_FACES);
        }

        wildcardIndices.push(index);
        highlightIndices.add(index);
    });

    if (wildcardIndices.length === 0) {
        return null;
    }

    const deduped = [...new Set(wildcardIndices)].sort((a, b) => a - b);

    return {
        wildcardIndices: deduped,
        highlightIndices,
        getFacesForIndex: index => {
            const faces = possibleFacesByIndex.get(index);
            return Array.isArray(faces) && faces.length > 0 ? faces : DEFAULT_WILDCARD_FACES;
        }
    };
}

export function createWildcardResolver(config) {
    if (!config || !Array.isArray(config.wildcardIndices) || config.wildcardIndices.length === 0) {
        return null;
    }

    const { wildcardIndices, getFacesForIndex } = config;
    return (values, evaluator) => resolveWildcardCombo(values, evaluator, {
        wildcardIndices,
        getFacesForIndex
    });
}
