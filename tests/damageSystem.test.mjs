import assert from 'node:assert/strict';
import { calculateDamageOutcome } from '../systems/DamageSystem.js';

function testCase(description, fn) {
    try {
        fn();
        console.log(`✔ ${description}`);
    } catch (error) {
        console.error(`✘ ${description}`);
        throw error;
    }
}

testCase('No damage when amount is zero', () => {
    const result = calculateDamageOutcome(0, 10);
    assert.equal(result.damageDealt, 0);
    assert.equal(result.blockedAmount, 0);
    assert.equal(result.remainingBlock, 10);
});

testCase('Block absorbs all damage when higher than incoming', () => {
    const result = calculateDamageOutcome(5, 10);
    assert.equal(result.damageDealt, 0);
    assert.equal(result.blockedAmount, 5);
    assert.equal(result.remainingBlock, 5);
});

testCase('Block is fully consumed when lower than incoming', () => {
    const result = calculateDamageOutcome(10, 4);
    assert.equal(result.damageDealt, 6);
    assert.equal(result.blockedAmount, 4);
    assert.equal(result.remainingBlock, 0);
});

testCase('Handles negative and null inputs gracefully', () => {
    const result = calculateDamageOutcome(-5, null);
    assert.equal(result.damageDealt, 0);
    assert.equal(result.blockedAmount, 0);
    assert.equal(result.remainingBlock, 0);
});
