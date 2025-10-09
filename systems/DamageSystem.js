export function calculateDamageOutcome(amount, blockValue) {
    const incoming = Math.max(0, amount || 0);
    const currentBlock = Math.max(0, blockValue || 0);

    const blockedAmount = Math.min(currentBlock, incoming);
    const damageDealt = incoming - blockedAmount;
    const remainingBlock = currentBlock - blockedAmount;

    return {
        damageDealt,
        blockedAmount,
        remainingBlock
    };
}

export function resolveDamage(amount, blockValue, onDamage) {
    const { damageDealt, blockedAmount, remainingBlock } = calculateDamageOutcome(amount, blockValue);

    if (damageDealt > 0 && typeof onDamage === 'function') {
        onDamage(damageDealt);
    }

    return {
        damageDealt,
        blockedAmount,
        remainingBlock
    };
}
