import { scoreCombo } from './ComboSystem.js';

export function resolveWildcardCombo(values, evaluateComboFn, {
    wildcardValue = 1,
    possibleFaces = [1, 2, 3, 4, 5, 6]
} = {}) {
    if (!Array.isArray(values) || typeof evaluateComboFn !== 'function') {
        return { type: 'No combo' };
    }

    const baseValues = [...values];
    const wildcardIndices = baseValues
        .map((value, index) => ({ value, index }))
        .filter(entry => entry.value === wildcardValue)
        .map(entry => entry.index);

    if (wildcardIndices.length === 0) {
        return evaluateComboFn(baseValues);
    }

    let bestResult = null;
    let bestComboScore = -Infinity;
    let bestTotal = -Infinity;

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
            }
            return;
        }

        const index = wildcardIndices[depth];
        possibleFaces.forEach(face => {
            workingValues[index] = face;
            assignValue(depth + 1, workingValues);
        });
    };

    assignValue(0, [...baseValues]);

    return bestResult || { type: 'No combo' };
}
