export function resolveDamage({ amount = 0, block = 0 } = {}) {
    const sanitizedAmount = Math.max(0, Number.isFinite(amount) ? amount : 0);
    const sanitizedBlock = Math.max(0, Number.isFinite(block) ? block : 0);

    const blocked = Math.min(sanitizedBlock, sanitizedAmount);
    const damage = sanitizedAmount - blocked;
    const remainingBlock = sanitizedBlock - blocked;

    return {
        damage,
        blocked,
        remainingBlock
    };
}
