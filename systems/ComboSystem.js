// Scoring values for different combinations
export const COMBO_POINTS = {
    "YAHTZEE": 25,
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

export function evaluateCombo(diceArray) {
    // Extract values from dice objects
    const values = diceArray.map(d => d.value).sort((a, b) => a - b);
    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0) + 1);

    const numDice = values.length;

    // --- Straight ---
    if (numDice >= 3) {
        if (isStraight(values)) {
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