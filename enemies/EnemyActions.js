export const attackAction = (value) => ({ type: 'attack', value });
export const defendAction = (value) => ({ type: 'defend', value });
export const healAction = (value) => ({ type: 'heal', value });
export const burnAction = (value) => ({ type: 'burn', value });
export const lockAction = (count = 1) => ({ type: 'lock', count });
export const weakenAction = (count = 1) => ({ type: 'weaken', count });
export const nullifyAction = (count = 1) => ({ type: 'nullify', count });
export const setMaxDicePerZoneAction = (value) => ({ type: 'set_max_dice_per_zone', value });
export const crowdControlAction = ({ lock = 0, nullify = 0, weaken = 0 } = {}) => ({
    type: 'crowd_control',
    lock,
    nullify,
    weaken
});
