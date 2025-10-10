export const attackAction = (value) => ({ type: 'attack', value });
export const defendAction = (value) => ({ type: 'defend', value });
export const healAction = (value) => ({ type: 'heal', value });
export const burnAction = (value) => ({ type: 'burn', value });
export const lockAction = (count = 1) => ({ type: 'lock', count });
export const weakenAction = (count = 1) => ({ type: 'weaken', count });
