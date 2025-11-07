export const DIFFICULTY_PRESETS = {
    normal: {
        playerMaxHealth: 100,
        mapRewards: {
            'map-1': [50, 70, 90, 100, 150],
            'map-2': [70, 100, 120, 150, 200],
            'map-3': [80, 110, 150, 180, 300]
        }
    },
    hard: {
        playerMaxHealth: 80,
        mapRewards: {
            'map-1': [50, 60, 80, 100, 120],
            'map-2': [60, 80, 100, 120, 150],
            'map-3': [70, 100, 130, 160, 200]
        }
    }
};

export const DEFAULT_DIFFICULTY = 'normal';
