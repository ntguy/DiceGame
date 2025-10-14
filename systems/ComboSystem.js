// Scoring values for different combinations
export const COMBO_POINTS = {
    "YAHTZEE": 25,
    "Triples Pair": 20,
    "Fuller House": 20,
    "Full House": 15,
    "Five of a Kind": 15,
    "Four of a Kind": 10,
    "Three of a Kind": 5,
    "Two Pair": 5,
    "Pair": 2,
    "Straight Sex": 20,
    "Straight Penta": 15,
    "Straight Quad": 10,
    "Straight Tri": 5,
    "No combo": 0
};

function evaluateComboInternal(values) {
    if (!Array.isArray(values) || values.length === 0) {
        return { type: "No combo" };
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const counts = {};
    sortedValues.forEach(v => counts[v] = (counts[v] || 0) + 1);

    const numDice = sortedValues.length;

    // --- Straight ---
    if (numDice >= 3) {
        if (isStraight(sortedValues)) {
            switch (numDice) {
                case 6: return { type: "Straight Sex" };
                case 5: return { type: "Straight Penta" };
                case 4: return { type: "Straight Quad" };
                case 3: return { type: "Straight Tri" };
            }
        }
    }

    // --- of a kind ---
    if (Object.keys(counts).length === 1) { // only one unique value
        switch (numDice) {
            case 6: return { type: "YAHTZEE" };
            case 5: return { type: "Five of a Kind" };
            case 4: return { type: "Four of a Kind" };
            case 3: return { type: "Three of a Kind" };
            case 2: return { type: "Pair" };
        }
    }

    // --- Fuller House / Triples Pair ---
    if (numDice === 6 && Object.keys(counts).length === 2) {
        const sortedCounts = Object.values(counts).sort((a, b) => b - a);
        if (sortedCounts[0] === 4 && sortedCounts[1] === 2) {
            return { type: "Fuller House" };
        }
        if (sortedCounts[0] === 3 && sortedCounts[1] === 3) {
            return { type: "Triples Pair" };
        }
    }

    // --- Full House ---
    if (numDice === 5 && Object.keys(counts).length === 2) {
        const cVals = Object.values(counts);
        if (cVals.includes(3) && cVals.includes(2)) {
            return { type: "Full House" };
        }
    }

    // --- Two Pair ---
    if (numDice === 4 && Object.keys(counts).length === 2) {
        const cVals = Object.values(counts);
        if (cVals[0] === 2 && cVals[1] === 2) {
            return { type: "Two Pair" };
        }
    }

    // --- No combo ---
    return { type: "No combo" };
}

export function evaluateCombo(diceArray, options = {}) {
    const values = Array.isArray(options.overrideValues)
        ? options.overrideValues.map(value => (typeof value === 'number' ? value : 0))
        : (Array.isArray(diceArray)
            ? diceArray.map(d => typeof d.value === 'number' ? d.value : 0)
            : []);

    const resolver = options.resolveWildcards;
    if (typeof resolver === 'function') {
        const resolved = resolver([...values], evaluateComboInternal);
        if (resolved && typeof resolved.type === 'string') {
            if (!Array.isArray(resolved.assignments)) {
                return { ...resolved, assignments: [...values] };
            }
            return resolved;
        }
    }

    const evaluation = evaluateComboInternal(values);
    return { ...evaluation, assignments: [...values] };
}

export function scoreCombo(comboType) {
    return COMBO_POINTS[comboType] || 0;
}

export function isStraight(values) {
    for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) {
            return false;
        }
    }
    return true;
}
