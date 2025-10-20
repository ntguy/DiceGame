import { CONSTANTS } from './config.js';
import { createDie } from './objects/Dice.js';
import { setupZones } from './objects/DiceZone.js';
import { setupButtons, setupHealthBar, setupEnemyUI } from './objects/UI.js';
import { setTextButtonEnabled } from './objects/ui/ButtonStyles.js';
import { createMenuUI } from './objects/MenuUI.js';
import { createSettingsUI } from './objects/SettingsUI.js';
import { createHeaderUI } from './objects/HeaderUI.js';
import { InstructionsUI } from './objects/InstructionsUI.js';
import { BackpackUI } from './objects/BackpackUI.js';
import { evaluateCombo, scoreCombo } from './systems/ComboSystem.js';
import { EnemyManager } from './systems/EnemySystem.js';
import { GameOverManager } from './systems/GameOverSystem.js';
import { PathManager, PATH_NODE_TYPES } from './systems/PathManager.js';
import { PathUI } from './objects/PathUI.js';
import { InfirmaryUI } from './objects/InfirmaryUI.js';
import { ShopUI } from './objects/ShopUI.js';
import { TowerOfTenUI } from './objects/TowerOfTenUI.js';
import { RelicUIManager } from './objects/RelicUI.js';
import { BlockbusterRelic } from './relics/BlockbusterRelic.js';
import { BeefyRelic } from './relics/BeefyRelic.js';
import { FamilyRelic } from './relics/FamilyRelic.js';
import { ReRollWithItRelic } from './relics/ReRollWithItRelic.js';
import { WildOneRelic } from './relics/WildOneRelic.js';
import { StraightSudsRelic } from './relics/StraightSudsRelic.js';
import { RainRelic } from './relics/RainRelic.js';
import { PrepperRelic } from './relics/PrepperRelic.js';
import { resolveWildcardCombo } from './systems/WildcardLogic.js';
import { MAP_CONFIGS } from './maps/MapConfigs.js';
import { DiceUpgradeUI } from './objects/DiceUpgradeUI.js';
import { MAX_CUSTOM_DICE, SELECTABLE_CUSTOM_DICE_IDS, createDieBlueprint, getRandomCustomDieOptions, getCustomDieDefinitionById } from './dice/CustomDiceDefinitions.js';
import { computeDieContribution, doesDieActAsWildcardForCombo } from './dice/CustomDiceLogic.js';
import { DiceRewardUI } from './objects/DiceRewardUI.js';
import { playDiceRollSounds } from './utils/SoundHelpers.js';

const SHOP_RELIC_COUNT = 3;

function getRandomIndexExclusive(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        return 0;
    }

    if (typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function') {
        return Phaser.Math.Between(0, maxExclusive - 1);
    }

    return Math.floor(Math.random() * maxExclusive);
}

function shuffleArray(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    if (typeof Phaser !== 'undefined'
        && Phaser.Utils
        && Phaser.Utils.Array
        && typeof Phaser.Utils.Array.Shuffle === 'function') {
        return Phaser.Utils.Array.Shuffle([...items]);
    }

    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }

    return result;
}

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Game state
        this.dice = [];
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingAtTurnStart = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerMaxHealth = 100;
        this.playerHealth = this.playerMaxHealth;
        this.healthBar = null;
        this.enemyManager = null;
        this.enemyHealthBar = null;
        this.enemyIntentText = null;
        this.enemyStatusText = null;
        this.enemyBurnText = null;
        this.enemyBurnGlowTween = null;
        this.upcomingEnemyMove = null;
        this.isResolving = false;
        this.playerBlockValue = 0;
        this.playerBurn = 0;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;
        this.temporarilyDestroyedDice = [];
        this.timeBombStates = new Map();
        this.activeTimeBombResolveBonus = 0;
        this.gameOverManager = null;
        this.muteButton = null;
        this.isMuted = false;
        this.isGameOver = false;
        this.testingModeEnabled = false;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.playerGold = 0;
        this.goldText = null;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.activeFacilityUI = null;
        this.defendPreviewText = null;
        this.attackPreviewText = null;
        this.defendComboText = null;
        this.attackComboText = null;
        this.comboListTexts = [];
        this.pendingPostCombatTransition = false;

        this.customDiceLoadout = [];
        this.diceRewardUI = null;

        this.relicUI = new RelicUIManager(this);

        this.resetRelicState();
        this.resetMenuState();

        this.maps = Array.isArray(MAP_CONFIGS) ? [...MAP_CONFIGS] : [];
        this.currentMapIndex = -1;
        this.currentMapConfig = null;

        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;

        this.mapTitleText = null;
        this.mapSkipButton = null;
        this.isMapViewActive = false;
        this.isFirstCombatTurn = false;
        this.modalInputLockCount = 0;
    }

    acquireModalInputLock() {
        if (!this.input) {
            return;
        }

        if (!Number.isFinite(this.modalInputLockCount)) {
            this.modalInputLockCount = 0;
        }

        this.modalInputLockCount += 1;
        this.input.setTopOnly(true);
    }

    releaseModalInputLock() {
        if (!this.input) {
            return;
        }

        if (!Number.isFinite(this.modalInputLockCount)) {
            this.modalInputLockCount = 0;
        }

        this.modalInputLockCount = Math.max(0, this.modalInputLockCount - 1);

        if (this.modalInputLockCount === 0) {
            this.input.setTopOnly(false);
        }
    }

    resetRelicState() {
        this.relicCatalog = [];
        this.relics = [];
        this.ownedRelicIds = new Set();
        this.currentShopRelics = null;
        this.hasBlockbusterRelic = false;
        this.hasFamilyRelic = false;
        this.familyHealPerFullHouse = 0;
        this.rerollDefensePerDie = 0;
        this.rerollDefenseBonus = 0;
        this.hasWildOneRelic = false;
        this.cleanseCursesOnLongStraights = false;
        this.hasRainRelic = false;
        this.playerBurnReductionPerTurn = 0;
        this.rollCarryoverEnabled = false;
        this.prepperFirstTurnBonusRolls = 0;
        this.prepperCarryoverRolls = 0;
        if (this.relicUI) {
            this.relicUI.reset();
        }
        this.refreshBackpackContents();
    }

    resetMenuState() {
        if (this.instructionsUI && typeof this.instructionsUI.destroy === 'function') {
            this.instructionsUI.destroy();
        }
        if (this.backpackUI && typeof this.backpackUI.destroy === 'function') {
            this.backpackUI.destroy();
        }
        this.menuButton = null;
        this.menuPanel = null;
        this.menuCloseButton = null;
        this.muteButton = null;
        this.testingModeButton = null;
        this.isMenuOpen = false;
        this.settingsButton = null;
        this.settingsPanel = null;
        this.settingsCloseButton = null;
        this.isSettingsOpen = false;
        this.instructionsButton = null;
        this.instructionsUI = null;
        this.isInstructionsOpen = false;
        this.backpackButton = null;
        this.backpackUI = null;
        this.isBackpackOpen = false;
        this.headerContainer = null;
        this.layoutHeaderButtons = null;
    }

    init(data) {
        this.destroyFacilityUI();
        this.isMuted = data && typeof data.isMuted === 'boolean' ? data.isMuted : false;
        this.testingModeEnabled = data && typeof data.testingModeEnabled === 'boolean'
            ? data.testingModeEnabled
            : false;
        this.isGameOver = false;
        this.gameOverManager = null;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.pendingPostCombatTransition = false;
        this.playerGold = 0;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.activeFacilityUI = null;
        this.customDiceLoadout = [];
        this.timeBombStates = new Map();
        this.diceRewardUI = null;
        this.resetRelicState();
        this.resetMenuState();
        this.defendPreviewText = null;
        this.attackPreviewText = null;
        this.defendComboText = null;
        this.attackComboText = null;
        this.comboListTexts = [];

        this.maps = Array.isArray(MAP_CONFIGS) ? [...MAP_CONFIGS] : [];
        this.currentMapIndex = -1;
        this.currentMapConfig = null;

        this.mapTitleText = null;
    }

    preload() {
        this.load.audio('diceRoll', './audio/single-dice-roll.mp3');
        this.load.audio('multiDiceRoll', './audio/multi-dice-roll.mp3');
        this.load.audio('swoosh', './audio/swoosh.mp3');
        this.load.audio('chimeShort', './audio/chime-short.mp3');
        this.load.audio('chimeLong', './audio/chime-long.mp3');
        this.load.audio('tick', './audio/tick.mp3');
        this.load.audio('tock', './audio/tock.mp3');
        this.load.audio('towerOfTenEnter', './audio/ToT-enter.mp3');
        this.load.audio('towerOfTenWin', './audio/ToT-win.mp3');
        this.load.audio('towerOfTenBust', './audio/ToT-lose.mp3');
        this.load.image('path_ladder', './sprites/Ladder-rotting.png');
        this.load.image('path_ladder_clean', './sprites/Ladder-clean.png');
        this.load.image('path_ladder_metal', './sprites/Ladder-metal.png');
        this.load.image('path_background', './sprites/Background.png');
        this.load.image('outside_background_1', './sprites/Clouds 3/1.png');
        this.load.image('outside_background_2', './sprites/Clouds 3/2.png');
        this.load.image('outside_background_3', './sprites/Clouds 3/3.png');
        this.load.image('outside_background_4', './sprites/Clouds 3/4.png');
        this.load.image('map2_outside_background_1', './sprites/Jungle/plx-1.png');
        this.load.image('map2_outside_background_2', './sprites/Jungle/plx-2.png');
        this.load.image('map2_outside_background_3', './sprites/Jungle/plx-3.png');
        this.load.image('map2_outside_background_4', './sprites/Jungle/plx-4.png');
        this.load.image('map2_outside_background_5', './sprites/Jungle/plx-5.png');
        this.load.image('wall', './sprites/Wall.png');
        this.load.image('wall2', './sprites/Wall2.png');
        this.load.image('wall_highlight_center', './sprites/BrightWallCenter.png');
        this.load.spritesheet('wall_torch', './sprites/spr_torch.png', {
            frameWidth: 21,
            frameHeight: 27
        });
    }
    
    create() {
        this.dice = [];
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingAtTurnStart = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerBlockValue = 0;
        this.playerBurn = 0;
        this.playerHealth = this.playerMaxHealth;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.enemyBurnText = null;
        this.enemyBurnGlowTween = null;
        this.playerGold = 0;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.pendingPostCombatTransition = false;
        this.customDiceLoadout = [];
        this.diceRewardUI = null;
        this.resetRelicState();
        this.relicCatalog = [
            new BlockbusterRelic(),
            new BeefyRelic(),
            new FamilyRelic(),
            new ReRollWithItRelic(),
            new WildOneRelic(),
            new StraightSudsRelic(),
            new RainRelic(),
            new PrepperRelic()
        ];
        this.resetMenuState();

        this.cameras.main.setBounds(0, -CONSTANTS.HEADER_HEIGHT, this.scale.width, this.scale.height + CONSTANTS.HEADER_HEIGHT);
        this.cameras.main.setScroll(0, -CONSTANTS.HEADER_HEIGHT);
        createHeaderUI(this);

        // --- Dice arrays for zones ---
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(CONSTANTS.DICE_PER_SET).fill(null);
        this.attackSlots = Array(CONSTANTS.DICE_PER_SET).fill(null);

        // --- Zones ---
        setupZones(this);
        if (!this.zoneVisuals) {
            this.zoneVisuals = [];
        }

        this.createZonePreviewTexts();

        // --- Buttons ---
        setupButtons(this);
        this.updateRollButtonState();
        createMenuUI(this);
        createSettingsUI(this);
        this.instructionsUI = new InstructionsUI(this);
        this.backpackUI = new BackpackUI(this);
        this.refreshBackpackContents();
        this.updateBackpackButtonLabel();
        this.relicUI.createShelf();

        this.applyTestingModeStartingResources();

        // --- Health bar ---
        this.healthBar = setupHealthBar(this);
        this.updateHealthUI();

        this.goldText = this.add.text(20, this.healthBar.text.y + 28, '', {
            fontSize: '20px',
            color: '#f1c40f'
        });
        this.updateGoldUI();

        this.updateMapTitleText();

        this.playerBurnText = this.add.text(0, 0, '', {
            fontSize: '20px',
            color: '#ffb347',
            fontStyle: 'bold'
        }).setVisible(false);
        this.updateBurnUI();

        // --- Enemy ---
        this.enemyManager = new EnemyManager();
        const initialEnemy = this.enemyManager.getCurrentEnemy();
        this.enemyHealthBar = setupEnemyUI(this, initialEnemy ? initialEnemy.name : '???');
        this.enemyIntentText = this.enemyHealthBar.intentText;
        this.enemyStatusText = this.enemyHealthBar.statusText;
        this.enemyBurnText = this.enemyHealthBar.burnText;
        if (this.enemyStatusText) {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
        }
        this.updateEnemyBurnUI();
        const mapLoaded = this.loadMap(0);
        if (!mapLoaded) {
            this.pathManager = new PathManager({
                allowUpgradeNodes: true,
                upgradeNodeMinEnemyIndex: 1
            });
            this.pathUI = new PathUI(
                this,
                this.pathManager,
                node => this.handlePathNodeSelection(node),
                {
                    connectionTextureKey: this.getPathTextureKeyForConfig(null),
                    wallTextureKey: this.getWallTextureKeyForConfig(null),
                    backgroundTextureKey: this.getBackgroundTextureKeyForConfig(null)
                }
            );
            this.updateEnemyHealthUI();
            this.prepareNextEnemyMove();
        }

        this.sound.mute = this.isMuted;
        this.updateMuteButtonState();

        this.gameOverManager = new GameOverManager(this);
        this.gameOverManager.create();

        // --- Roll counter ---
        this.rollsRemainingText = this.add.text(110, CONSTANTS.BUTTONS_Y, `${CONSTANTS.DEFAULT_MAX_ROLLS}`, {
            fontSize: "24px",
            color: "#fff"
        }).setOrigin(0.5);

        this.enterMapState();
    }

    createZonePreviewTexts() {
        const zoneWidth = CONSTANTS.DEFAULT_ZONE_WIDTH + 6;
        const defendLeftX = (this.defendZoneCenter ? this.defendZoneCenter.x : 200) - zoneWidth / 2;
        const attackLeftX = (this.attackZoneCenter ? this.attackZoneCenter.x : 600) - zoneWidth / 2;
        const comboLineOffset = 145;

        if (!this.defendPreviewText) {
            this.defendPreviewText = this.add.text(defendLeftX, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '24px',
                color: '#3498db',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        if (!this.defendComboText) {
            this.defendComboText = this.add.text(defendLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '20px',
                color: '#3498db',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        if (!this.attackPreviewText) {
            this.attackPreviewText = this.add.text(attackLeftX, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '24px',
                color: '#e74c3c',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        if (!this.attackComboText) {
            this.attackComboText = this.add.text(attackLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '20px',
                color: '#e74c3c',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        this.updateZonePreviewText();
    }

    toggleMenu() {
        if (!this.menuPanel) {
            return;
        }

        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (this.isMenuOpen) {
            return;
        }

        this.closeSettings();
        this.closeInstructions();
        this.closeBackpack();
        this.isMenuOpen = true;
        if (this.menuPanel) {
            this.menuPanel.setVisible(true);
            this.menuPanel.setDepth(80);
        }

        this.updateMenuButtonLabel();
    }

    closeMenu() {
        this.isMenuOpen = false;
        if (this.menuPanel) {
            this.menuPanel.setVisible(false);
        }

        this.updateMenuButtonLabel();
    }

    updateMenuButtonLabel() {
        if (!this.menuButton) {
            return;
        }

        const suffix = this.isMenuOpen ? '✕' : '☰';
        this.menuButton.setText(`${suffix}`);
        const targetFontSize = suffix === '✕'
            ? this.menuButton.getData('defaultFontSize') || '24px'
            : this.menuButton.getData('expandedFontSize') || this.menuButton.getData('defaultFontSize') || '24px';
        this.menuButton.setStyle({ fontSize: targetFontSize });
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleSettings() {
        if (!this.settingsPanel) {
            return;
        }

        if (this.isSettingsOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    }

    openSettings() {
        if (this.isSettingsOpen) {
            return;
        }

        this.closeMenu();
        this.closeInstructions();
        this.closeBackpack();
        this.isSettingsOpen = true;
        if (this.settingsPanel) {
            this.settingsPanel.setVisible(true);
            this.settingsPanel.setDepth(80);
        }

        this.updateSettingsButtonLabel();
        this.updateMuteButtonState();
        this.updateTestingModeButtonState();
    }

    closeSettings() {
        this.isSettingsOpen = false;
        if (this.settingsPanel) {
            this.settingsPanel.setVisible(false);
        }

        this.updateSettingsButtonLabel();
    }

    updateSettingsButtonLabel() {
        if (!this.settingsButton) {
            return;
        }

        const suffix = this.isSettingsOpen ? '✕' : '⚙';
        this.settingsButton.setText(`${suffix}`);
        const targetFontSize = suffix === '✕'
            ? this.settingsButton.getData('defaultFontSize') || '24px'
            : this.settingsButton.getData('expandedFontSize') || this.settingsButton.getData('defaultFontSize') || '24px';
        this.settingsButton.setStyle({ fontSize: targetFontSize });
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleInstructions() {
        if (!this.instructionsUI) {
            return;
        }

        if (this.isInstructionsOpen) {
            this.closeInstructions();
        } else {
            this.openInstructions();
        }
    }

    openInstructions() {
        if (this.isInstructionsOpen || !this.instructionsUI) {
            return;
        }

        this.closeMenu();
        this.closeSettings();
        this.closeBackpack();
        this.isInstructionsOpen = true;
        this.instructionsUI.open();
        this.updateInstructionsButtonLabel();
    }

    closeInstructions() {
        this.isInstructionsOpen = false;
        if (this.instructionsUI) {
            this.instructionsUI.close();
        }
        this.updateInstructionsButtonLabel();
    }

    updateInstructionsButtonLabel() {
        if (!this.instructionsButton) {
            return;
        }

        const suffix = this.isInstructionsOpen ? '✕' : '📘';
        this.instructionsButton.setText(`${suffix}`);
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleBackpack() {
        if (!this.backpackUI) {
            return;
        }

        if (this.isBackpackOpen) {
            this.closeBackpack();
        } else {
            this.openBackpack();
        }
    }

    openBackpack() {
        if (this.isBackpackOpen || !this.backpackUI) {
            return;
        }

        this.closeMenu();
        this.closeSettings();
        this.closeInstructions();

        this.isBackpackOpen = true;
        this.backpackUI.open();
        this.updateBackpackButtonLabel();
    }

    closeBackpack() {
        if (this.backpackUI && this.isBackpackOpen) {
            this.backpackUI.close();
        } else if (this.backpackUI) {
            this.backpackUI.setVisible(false);
        }

        this.isBackpackOpen = false;
        this.updateBackpackButtonLabel();
    }

    updateBackpackButtonLabel() {
        if (!this.backpackButton) {
            return;
        }

        const suffix = this.isBackpackOpen ? '✕' : '🎒';
        this.backpackButton.setText(`${suffix}`);
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    refreshBackpackContents() {
        if (this.backpackUI) {
            this.backpackUI.refreshContent();
        }
    }

    update() {
        // Update logic here
    }

    executeZoneEffects(effects, zone, { attackResult, defendResult } = {}) {
        if (!Array.isArray(effects)) {
            return;
        }

        effects.forEach(effect => {
            if (typeof effect === 'function') {
                effect({
                    scene: this,
                    zone,
                    attackResult,
                    defendResult
                });
            }
        });
    }

    computeZoneScore(diceList, { zone } = {}) {
        const diceValues = Array.isArray(diceList)
            ? diceList.map(die => (die && typeof die.value === 'number') ? die.value : 0)
            : [];
        const rerollBonus = zone === 'defend' ? this.rerollDefenseBonus : 0; // Re-Roll with it relic bonus.

        const wildcardFlags = Array.isArray(diceList)
            ? diceList.map(die => {
                const dieWildcard = doesDieActAsWildcardForCombo(die);
                const relicWildcard = this.hasWildOneRelic && die && die.value === 1;
                return dieWildcard || relicWildcard;
            })
            : [];
        const wildcardIndices = wildcardFlags.reduce((indices, isWildcard, index) => {
            if (isWildcard) {
                indices.push(index);
            }
            return indices;
        }, []);
        const evaluateOptions = {
            overrideValues: [...diceValues]
        };
        if (wildcardIndices.length > 0) {
            evaluateOptions.resolveWildcards = (values, evaluator) => resolveWildcardCombo(values, evaluator, { wildcardIndices });
        }
        const comboInfo = evaluateCombo(diceList, evaluateOptions);
        const comboType = comboInfo.type;
        const assignments = Array.isArray(comboInfo.assignments) ? [...comboInfo.assignments] : [...diceValues];
        const contributions = Array.isArray(diceList)
            ? diceList.map(die => computeDieContribution(this, die, { zone, comboType }))
            : [];

        const baseContribution = contributions.reduce((sum, entry) => sum + (entry && entry.faceValueContribution ? entry.faceValueContribution : 0), 0);
        const comboBonusExtra = contributions.reduce((sum, entry) => sum + (entry && entry.comboBonusModifier ? entry.comboBonusModifier : 0), 0);

        const baseSum = baseContribution + rerollBonus;
        const comboBonus = scoreCombo(comboType) + comboBonusExtra;
        const preResolutionEffects = contributions.flatMap(entry => (entry && Array.isArray(entry.preResolutionEffects)) ? entry.preResolutionEffects : []);
        const postResolutionEffects = contributions.flatMap(entry => (entry && Array.isArray(entry.postResolutionEffects)) ? entry.postResolutionEffects : []);

        return {
            baseSum,
            comboBonus,
            comboType,
            total: baseSum + comboBonus,
            assignments,
            wildcardFlags,
            preResolutionEffects,
            postResolutionEffects
        };
    }

    applyRerollDefenseBonus(count) {
        // Re-Roll with it relic: accumulate bonus defense for each reroll.
        if (!this.rerollDefensePerDie || count <= 0) {
            return;
        }

        const gained = count * this.rerollDefensePerDie;
        this.rerollDefenseBonus += gained;
    }

    notifyEnemyOfRerolls(count) {
        if (!this.enemyManager || count <= 0) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (enemy && typeof enemy.onPlayerReroll === 'function') {
            enemy.onPlayerReroll(count, this.enemyManager);
            this.refreshEnemyIntentText();
            this.updateEnemyStatusText();
        }
    }

    updateWildcardDisplays({
        defendAssignments,
        attackAssignments,
        defendWildcardFlags,
        attackWildcardFlags,
        defendComboType,
        attackComboType
    } = {}) {
        // Wild effects: keep dice visuals aligned with wildcard assignments.
        const diceSet = new Set([
            ...(Array.isArray(this.dice) ? this.dice : []),
            ...(Array.isArray(this.defendDice) ? this.defendDice : []),
            ...(Array.isArray(this.attackDice) ? this.attackDice : [])
        ]);

        const getWildcardStatus = (die, index, wildcardFlags) => {
            if (!die) {
                return false;
            }
            if (Array.isArray(wildcardFlags) && typeof wildcardFlags[index] === 'boolean') {
                if (wildcardFlags[index]) {
                    return true;
                }
            }
            const relicWildcard = this.hasWildOneRelic && die.value === 1;
            return relicWildcard || doesDieActAsWildcardForCombo(die);
        };

        const wildcardMap = new Map();

        const registerWildcardFlags = (diceList, wildcardFlags) => {
            if (!Array.isArray(diceList)) {
                return;
            }
            diceList.forEach((die, index) => {
                if (!die) {
                    return;
                }
                const isWildcard = getWildcardStatus(die, index, wildcardFlags);
                if (!wildcardMap.has(die)) {
                    wildcardMap.set(die, isWildcard);
                } else if (isWildcard) {
                    wildcardMap.set(die, true);
                }
            });
        };

        registerWildcardFlags(this.defendDice, defendWildcardFlags);
        registerWildcardFlags(this.attackDice, attackWildcardFlags);

        diceSet.forEach(die => {
            if (!die || typeof die.renderFace !== 'function') {
                return;
            }

            const isWildcard = wildcardMap.has(die)
                ? wildcardMap.get(die)
                : (this.hasWildOneRelic && die.value === 1) || doesDieActAsWildcardForCombo(die);
            const pipColor = isWildcard ? 0x000000 : 0xffffff;
            die.renderFace(die.value, { pipColor, updateValue: false });
            die.wildAssignedValue = null;
            if (typeof die.hideWildBaseValueOverlay === 'function') {
                die.hideWildBaseValueOverlay();
            }
        });

        const applyAssignments = (diceList, assignments, wildcardFlags, comboType) => {
            if (!Array.isArray(diceList) || !Array.isArray(assignments)) {
                return;
            }

            const hasCombo = typeof comboType === 'string' && comboType !== 'No combo';

            diceList.forEach((die, index) => {
                if (!die || typeof die.renderFace !== 'function') {
                    return;
                }

                const isWildcard = getWildcardStatus(die, index, wildcardFlags);
                if (!isWildcard) {
                    return;
                }

                if (!hasCombo) {
                    return;
                }

                const assignedValue = assignments[index];
                if (typeof assignedValue !== 'number') {
                    return;
                }

                const boundedValue = Math.max(1, Math.min(6, assignedValue));
                // Wild visuals: show chosen wildcard value with black pips.
                die.renderFace(boundedValue, { pipColor: 0x000000, updateValue: false });
                die.wildAssignedValue = boundedValue;
                if (boundedValue !== die.value && typeof die.showWildBaseValueOverlay === 'function') {
                    die.showWildBaseValueOverlay(die.value);
                }
            });
        };

        applyAssignments(this.defendDice, defendAssignments, defendWildcardFlags, defendComboType);
        applyAssignments(this.attackDice, attackAssignments, attackWildcardFlags, attackComboType);
    }

    updateZonePreviewText() {
        const defendScore = this.computeZoneScore(this.defendDice || [], { zone: 'defend' });
        const attackScore = this.computeZoneScore(this.attackDice || [], { zone: 'attack' });

        const pendingTimeBombBonus = Number.isFinite(this.activeTimeBombResolveBonus)
            ? this.activeTimeBombResolveBonus
            : 0;
        if (pendingTimeBombBonus > 0) {
            attackScore.baseSum = (attackScore.baseSum || 0) + pendingTimeBombBonus;
            attackScore.total = (attackScore.total || 0) + pendingTimeBombBonus;
            attackScore.timeBombBonus = (attackScore.timeBombBonus || 0) + pendingTimeBombBonus;
        }

        this.updateWildcardDisplays({
            defendAssignments: defendScore.assignments,
            attackAssignments: attackScore.assignments,
            defendWildcardFlags: defendScore.wildcardFlags,
            attackWildcardFlags: attackScore.wildcardFlags,
            defendComboType: defendScore.comboType,
            attackComboType: attackScore.comboType
        });

        if (!this.defendPreviewText || !this.attackPreviewText) {
            return;
        }

        const formatScoreLine = score => {
            const breakdown = [`${score.baseSum}`];
            if (Number.isFinite(score.timeBombBonus) && score.timeBombBonus > 0) {
                breakdown.push(`${score.timeBombBonus}`);
            }
            breakdown.push(`${score.comboBonus}`);
            return `${score.total}: ${breakdown.join('+')}`;
        };
        const formatComboLine = score => `${score.comboType}`;

        this.defendPreviewText.setText(formatScoreLine(defendScore));
        if (this.defendComboText) {
            this.defendComboText.setText(formatComboLine(defendScore));
        }

        this.attackPreviewText.setText(formatScoreLine(attackScore));
        if (this.attackComboText) {
            this.attackComboText.setText(formatComboLine(attackScore));
        }
    }

    rollDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        // Determine which sound to play
        let diceInPlay = this.getDiceInPlay();
        const diceSelectedCount = diceInPlay.filter(d => d.selected).length;
        const isFirstRoll = this.rollsRemaining === this.rollsRemainingAtTurnStart;

        playDiceRollSounds(this, {
            isFirstRoll,
            totalDice: diceInPlay.length,
            selectedCount: diceSelectedCount
        });

        // First roll → create dice
        if (isFirstRoll) {
            this.dice = [];
            const blueprints = this.getActiveDiceBlueprints();
            blueprints.forEach((blueprint, index) => {
                const die = createDie(this, index, blueprint);
                this.dice.push(die);
            });
            diceInPlay = this.getDiceInPlay();
        }

        // Roll dice (first roll = all dice, later rolls = only selected dice)
        let rerolledCount = 0;
        diceInPlay.forEach(d => {
            if (isFirstRoll || d.selected) {
                if (!isFirstRoll && d.selected) {
                    rerolledCount++;
                }
                d.roll();
                d.selected = false;
                d.updateVisualState();
            }
        });

        if (!isFirstRoll && rerolledCount > 0) {
            this.applyRerollDefenseBonus(rerolledCount);
            this.notifyEnemyOfRerolls(rerolledCount);
        }

        if (isFirstRoll) {
            this.applyPendingLocks();
            this.applyPendingWeaken();
            this.applyPendingNullify();
        }



        this.updateZonePreviewText();

        // Decrement rolls remaining
        this.rollsRemaining--;
        this.rollsRemainingText.setText(`${this.rollsRemaining}`);

        this.updateRollButtonState();

        // Enable sort button after the first roll
        setTextButtonEnabled(this.sortButton, true);
    }

    applyTestingModeStartingResources() {
        if (!this.testingModeEnabled) {
            return;
        }

        this.populateTestingModeDiceLoadout();
        this.grantTestingModeRelics(6);
    }

    populateTestingModeDiceLoadout() {
        if (!this.testingModeEnabled) {
            return;
        }

        const pool = Array.isArray(SELECTABLE_CUSTOM_DICE_IDS) ? [...SELECTABLE_CUSTOM_DICE_IDS] : [];
        if (pool.length === 0) {
            return;
        }

        const basePool = [...pool];
        const selections = [];
        let workingPool = [...basePool];

        while (selections.length < MAX_CUSTOM_DICE && workingPool.length > 0) {
            const index = getRandomIndexExclusive(workingPool.length);
            selections.push(workingPool.splice(index, 1)[0]);

            if (workingPool.length === 0 && selections.length < MAX_CUSTOM_DICE && basePool.length > 0) {
                workingPool = [...basePool];
            }
        }

        this.customDiceLoadout = [];
        selections.forEach(id => {
            this.addCustomDieToLoadout(id);
        });
    }

    grantTestingModeRelics(targetCount = 6) {
        if (!this.testingModeEnabled || typeof targetCount !== 'number' || targetCount <= 0) {
            return;
        }

        const unowned = typeof this.getUnownedRelics === 'function' ? this.getUnownedRelics() : [];
        const available = Array.isArray(unowned) ? [...unowned] : [];
        if (available.length === 0) {
            return;
        }

        const pool = [...available];
        const selections = [];

        while (selections.length < targetCount && pool.length > 0) {
            const index = getRandomIndexExclusive(pool.length);
            selections.push(pool.splice(index, 1)[0]);
        }

        let grantedAny = false;
        selections.forEach(relic => {
            if (this.grantRelicDirectly(relic, { skipUiUpdate: true })) {
                grantedAny = true;
            }
        });

        if (grantedAny && this.relicUI) {
            this.relicUI.updateDisplay();
        }
    }

    grantRelicDirectly(relic, { skipUiUpdate = false } = {}) {
        if (!relic || !relic.id || this.ownedRelicIds.has(relic.id)) {
            return false;
        }

        this.ownedRelicIds.add(relic.id);
        this.relics.push(relic);

        if (typeof relic.apply === 'function') {
            relic.apply(this);
        }

        if (!skipUiUpdate && this.relicUI) {
            this.relicUI.updateDisplay();
        }

        this.refreshBackpackContents();
        this.refreshShopInterface();

        return true;
    }

    discardRelicById(relicId) {
        if (!relicId || !this.ownedRelicIds.has(relicId)) {
            return false;
        }

        const ownedIndex = Array.isArray(this.relics)
            ? this.relics.findIndex(relic => relic && relic.id === relicId)
            : -1;

        const relic = ownedIndex !== -1 ? this.relics[ownedIndex] : null;

        if (ownedIndex !== -1) {
            this.relics = this.relics.filter((_, index) => index !== ownedIndex);
        }

        this.ownedRelicIds.delete(relicId);

        this.removeRelicEffects(relic || { id: relicId });

        if (this.relicUI) {
            this.relicUI.updateDisplay();
        }

        this.refreshBackpackContents();
        this.updateZonePreviewText();
        this.refreshShopInterface();

        return true;
    }

    removeRelicEffects(relic) {
        if (!relic || !relic.id) {
            return;
        }

        switch (relic.id) {
            case 'beefy':
                this.decreasePlayerMaxHealth(20);
                break;
            case 'family':
                this.hasFamilyRelic = false;
                this.familyHealPerFullHouse = 0;
                break;
            case 'reroll-with-it':
                this.rerollDefensePerDie = Math.max(0, (this.rerollDefensePerDie || 0) - 1);
                this.rerollDefenseBonus = 0;
                break;
            case 'wild-one':
                this.hasWildOneRelic = false;
                this.refreshActiveDiceVisuals();
                break;
            case 'unlocked-and-loaded':
                this.cleanseCursesOnLongStraights = false;
                break;
            case 'blockbuster':
                this.hasBlockbusterRelic = false;
                break;
            case 'rain':
                this.hasRainRelic = false;
                this.playerBurnReductionPerTurn = 0;
                break;
            case 'prepper':
                this.rollCarryoverEnabled = false;
                this.prepperFirstTurnBonusRolls = 0;
                this.prepperCarryoverRolls = 0;
                break;
            default:
                break;
        }
    }

    addCustomDieToLoadout(id, options = {}) {
        if (!id) {
            return false;
        }

        if (!Array.isArray(this.customDiceLoadout)) {
            this.customDiceLoadout = [];
        }

        if (this.customDiceLoadout.length >= MAX_CUSTOM_DICE) {
            this.updateDiceRewardHandState();
            return false;
        }

        const blueprint = createDieBlueprint(id, { isUpgraded: !!options.isUpgraded });
        this.customDiceLoadout = [...this.customDiceLoadout, blueprint];
        this.refreshBackpackContents();
        this.updateDiceRewardHandState();
        return true;
    }

    upgradeCustomDieById(id) {
        if (!id || !Array.isArray(this.customDiceLoadout)) {
            return false;
        }

        let upgraded = false;
        this.customDiceLoadout = this.customDiceLoadout.map(entry => {
            if (!upgraded && entry.id === id && !entry.isUpgraded) {
                upgraded = true;
                return { ...entry, isUpgraded: true };
            }
            return { ...entry };
        });

        if (upgraded) {
            this.getDiceInPlay().forEach(die => {
                if (die && die.dieBlueprint && die.dieBlueprint.id === id) {
                    die.dieBlueprint = { ...die.dieBlueprint, isUpgraded: true };
                    if (typeof die.updateEmoji === 'function') {
                        die.updateEmoji();
                    }
                }
            });
            this.refreshBackpackContents();
        }

        return upgraded;
    }

    handleCustomDieSelection(id, definition) {
        const added = this.addCustomDieToLoadout(id);
        if (!added) {
            this.updateDiceRewardHandState();
            return false;
        }

        if (definition && (definition.name || definition.emoji)) {
            const label = [definition.emoji || '', definition.name || 'Die'].join(' ').trim();
            this.showNodeMessage(`Added ${label}`, '#f9e79f');
        }

        return true;
    }

    presentCustomDieReward() {
        if (this.diceRewardUI) {
            this.diceRewardUI.destroy();
            this.diceRewardUI = null;
        }

        const options = getRandomCustomDieOptions(this, 3);
        if (!Array.isArray(options) || options.length === 0) {
            this.requestEnterMapStateAfterCombat();
            return;
        }

        const capacityState = this.getDiceRewardCapacityState();
        this.diceRewardUI = new DiceRewardUI(this, {
            options,
            currentCount: capacityState.currentCount,
            maxCount: capacityState.maxCount,
            onSelect: (id, definition) => this.handleCustomDieSelection(id, definition),
            onSkip: () => true,
            onClose: () => {
                this.diceRewardUI = null;
                this.requestEnterMapStateAfterCombat();
            }
        });
        this.updateDiceRewardHandState();
    }

    applyPendingLocks() {
        if (this.pendingLockCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => !die.isLocked);
        if (availableDice.length === 0) {
            return;
        }

        const locksToApply = Math.min(this.pendingLockCount, availableDice.length);
        let remainingLocks = locksToApply;
        const candidates = [...availableDice];

        while (remainingLocks > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.lockDie(die)) {
                remainingLocks--;
            }
        }

        this.pendingLockCount = Math.max(0, this.pendingLockCount - locksToApply);
        this.updateRollButtonState();
    }

    applyPendingWeaken() {
        if (this.pendingWeakenCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => die && !this.weakenedDice.has(die));
        if (availableDice.length === 0) {
            return;
        }

        const weakenToApply = Math.min(this.pendingWeakenCount, availableDice.length);
        let remaining = weakenToApply;
        const candidates = [...availableDice];

        while (remaining > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.weakenDie(die)) {
                remaining--;
            }
        }

        this.pendingWeakenCount = Math.max(0, this.pendingWeakenCount - weakenToApply);
        this.updateZonePreviewText();
    }

    applyPendingNullify() {
        if (this.pendingNullifyCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => die && !this.nullifiedDice.has(die));
        if (availableDice.length === 0) {
            return;
        }

        const nullifyToApply = Math.min(this.pendingNullifyCount, availableDice.length);
        let remaining = nullifyToApply;
        const candidates = [...availableDice];

        while (remaining > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.nullifyDie(die)) {
                remaining--;
            }
        }

        this.pendingNullifyCount = Math.max(0, this.pendingNullifyCount - nullifyToApply);
        this.updateZonePreviewText();
    }

    lockDie(die) {
        if (!die || die.isLocked) {
            return false;
        }

        die.setLocked(true);
        this.lockedDice.add(die);
        return true;
    }

    weakenDie(die) {
        if (!die || die.isWeakened) {
            return false;
        }

        if (typeof die.setWeakened === 'function') {
            die.setWeakened(true);
        } else {
            die.isWeakened = true;
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
        }

        this.weakenedDice.add(die);
        return true;
    }

    nullifyDie(die) {
        if (!die || this.nullifiedDice.has(die)) {
            return false;
        }

        if (typeof die.setNullified === 'function') {
            die.setNullified(true);
        } else {
            die.isNullified = true;
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }
        }

        this.nullifiedDice.add(die);
        return true;
    }

    unlockAllDice() {
        const diceInPlay = this.getDiceInPlay();
        diceInPlay.forEach(die => {
            if (die && die.isLocked) {
                die.setLocked(false);
            }
        });
        this.lockedDice.clear();
    }

    cleanseAllDiceCurses() {
        this.unlockAllDice();
        this.clearAllWeakenedDice();
        this.clearAllNullifiedDice();
    }

    queueEnemyLocks(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingLockCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingLockCount + count);
    }

    clearDieWeaken(die) {
        if (!die || !this.weakenedDice.has(die)) {
            return;
        }

        const canUpdateVisuals = die && die.active && die.scene && die.scene.sys && die.scene.sys.isActive();

        if (typeof die.setWeakened === 'function' && canUpdateVisuals) {
            die.setWeakened(false);
        } else {
            die.isWeakened = false;
            if (typeof die.updateVisualState === 'function' && canUpdateVisuals) {
                die.updateVisualState();
            }
        }

        this.weakenedDice.delete(die);
    }

    clearAllWeakenedDice() {
        const dice = Array.from(this.weakenedDice);
        dice.forEach(die => this.clearDieWeaken(die));
        this.weakenedDice.clear();
        this.updateZonePreviewText();
    }

    queueEnemyWeaken(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingWeakenCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingWeakenCount + count);
    }

    clearDieNullify(die) {
        if (!die || !this.nullifiedDice.has(die)) {
            return;
        }

        const canUpdateVisuals = die && die.active && die.scene && die.scene.sys && die.scene.sys.isActive();

        if (typeof die.setNullified === 'function' && canUpdateVisuals) {
            die.setNullified(false);
        } else {
            die.isNullified = false;
            if (typeof die.updateVisualState === 'function' && canUpdateVisuals) {
                die.updateVisualState();
            }
            if (typeof die.updateFaceValueHighlight === 'function' && canUpdateVisuals) {
                die.updateFaceValueHighlight();
            }
        }

        this.nullifiedDice.delete(die);
    }

    clearAllNullifiedDice() {
        const dice = Array.from(this.nullifiedDice);
        dice.forEach(die => this.clearDieNullify(die));
        this.nullifiedDice.clear();
        this.updateZonePreviewText();
    }

    queueEnemyNullify(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingNullifyCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingNullifyCount + count);
    }

    sortDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        this.sound.play('swoosh', { volume: CONSTANTS.DEFAULT_SFX_VOLUME });
        this.dice.sort((a, b) => a.value - b.value);
        this.dice.forEach((d, i) => {
            d.slotIndex = i;
            this.tweens.add({ 
                targets: d, 
                x: CONSTANTS.SLOT_START_X + i * CONSTANTS.SLOT_SPACING, 
                y: CONSTANTS.GRID_Y, 
                duration: 200, 
                ease: 'Power2' 
            });
        });
    }

    async resolveDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        if (this.isResolving) {
            return;
        }
        this.isResolving = true;

        this.disableAllInputs();

        const usedTimeBombUids = new Set();
        [...(this.defendDice || []), ...(this.attackDice || [])].forEach(die => {
            if (!die || !die.dieBlueprint) {
                return;
            }
            if (die.dieBlueprint.id === 'bomb' && die.dieBlueprint.uid) {
                usedTimeBombUids.add(die.dieBlueprint.uid);
            }
        });

        const nullifiedTimeBombUids = new Set();
        if (this.nullifiedDice && typeof this.nullifiedDice.forEach === 'function') {
            this.nullifiedDice.forEach(die => {
                if (!die || !die.dieBlueprint) {
                    return;
                }
                if (die.dieBlueprint.id === 'bomb' && die.dieBlueprint.uid) {
                    nullifiedTimeBombUids.add(die.dieBlueprint.uid);
                }
            });
        }

        const timeBombResolution = this.resolveTimeBombCountdowns({
            usedBlueprintUids: usedTimeBombUids,
            nullifiedBlueprintUids: nullifiedTimeBombUids
        }) || { totalBonus: 0, detonatedCount: 0 };

        const timeBombBonus = Number.isFinite(timeBombResolution.totalBonus)
            ? timeBombResolution.totalBonus
            : 0;
        this.activeTimeBombResolveBonus = timeBombBonus;

        let bombardAnimationPromise = null;
        if (timeBombBonus > 0) {
            this.updateZonePreviewText();
            bombardAnimationPromise = this.playTimeBombDetonationAnimation({
                detonatedCount: timeBombResolution.detonatedCount
            });
        }

        if (bombardAnimationPromise) {
            await bombardAnimationPromise;
        }

        // Play resolve sound effect
        this.sound.play('chimeShort', { volume: 0.7 });
        this.sound.play('chimeLong', {
            volume: 0.4,
            seek: 1.5,
            duration: 1,
            rate: 3
        });

        // Calculate scores
        const defendResult = this.computeZoneScore(this.defendDice || [], { zone: 'defend' });
        const attackResult = this.computeZoneScore(this.attackDice || [], { zone: 'attack' });

        if (timeBombBonus > 0) {
            attackResult.baseSum = (attackResult.baseSum || 0) + timeBombBonus;
            attackResult.total = (attackResult.total || 0) + timeBombBonus;
            attackResult.timeBombBonus = (attackResult.timeBombBonus || 0) + timeBombBonus;
        }

        const defendScore = defendResult.total;
        const attackScore = attackResult.total;

        this.executeZoneEffects(defendResult.preResolutionEffects, 'defend', { attackResult, defendResult });

        if (this.familyHealPerFullHouse > 0) {
            // Family relic: award healing for Full House combos.
            let healAmount = 0;
            if (defendResult.comboType === 'Full House') {
                healAmount += this.familyHealPerFullHouse;
            }
            if (attackResult.comboType === 'Full House') {
                healAmount += this.familyHealPerFullHouse;
            }
            if (healAmount > 0) {
                this.healPlayer(healAmount);
            }
        }

        if (this.cleanseCursesOnLongStraights) {
            // Straight Suds relic: trigger curse cleansing on long straights.
            const cleanseCombos = ['Straight Penta', 'Straight Sex'];
            if (cleanseCombos.includes(defendResult.comboType) || cleanseCombos.includes(attackResult.comboType)) {
                this.cleanseAllDiceCurses();
            }
        }

        this.updateZonePreviewText();

        const locksToCarryOver = Array.from(this.lockedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;
        const weakenedToCarryOver = Array.from(this.weakenedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;
        const nullifiedToCarryOver = Array.from(this.nullifiedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;

        const diceToResolve = this.getDiceInPlay();
        this.applyEnemyComboDestruction({ attackResult, defendResult });
        const finishResolution = () => {
            this.activeTimeBombResolveBonus = 0;
            if (locksToCarryOver > 0) {
                this.pendingLockCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingLockCount + locksToCarryOver);
            }
            if (weakenedToCarryOver > 0) {
                this.pendingWeakenCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingWeakenCount + weakenedToCarryOver);
            }
            if (nullifiedToCarryOver > 0) {
                this.pendingNullifyCount = Math.min(CONSTANTS.DICE_PER_SET, this.pendingNullifyCount + nullifiedToCarryOver);
            }
            this.lockedDice.clear();
            this.clearAllWeakenedDice();
            this.clearAllNullifiedDice();
            if (this.rollCarryoverEnabled) {
                this.prepperCarryoverRolls = Math.max(0, Math.floor(this.rollsRemaining));
            } else {
                this.prepperCarryoverRolls = 0;
            }
            this.resetGameState({ destroyDice: false });
            if (this.pendingPostCombatTransition) {
                this.disableAllInputs();
            } else {
                this.input.enabled = true;
                if (this.resolveButton) {
                    setTextButtonEnabled(this.resolveButton, true);
                }
            }
            this.isResolving = false;
            this.tryEnterMapStateAfterCombat();
        };

        this.processTurnOutcome({ attackScore, defendScore, attackResult, defendResult });

        this.executeZoneEffects(defendResult.postResolutionEffects, 'defend', { attackResult, defendResult });
        this.executeZoneEffects(attackResult.postResolutionEffects, 'attack', { attackResult, defendResult });

        if (diceToResolve.length === 0) {
            this.time.delayedCall(1000, finishResolution);
            return;
        }

        Promise.all(diceToResolve.map(die => {
            const target = this.getResolutionTarget(die);
            return this.animateDieResolution(die, target);
        })).then(finishResolution);
    }

    disableAllInputs() {
        this.input.enabled = false;

        if (this.rollButton) {
            setTextButtonEnabled(this.rollButton, false);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false);
        }
    }

    getActiveDiceBlueprints() {
        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        let blueprints = loadout.map(entry => ({
            id: entry.id,
            isUpgraded: !!entry.isUpgraded,
            uid: entry.uid
        }));

        while (blueprints.length < CONSTANTS.DICE_PER_SET) {
            blueprints.push(createDieBlueprint('standard'));
        }

        blueprints = blueprints.slice(0, CONSTANTS.DICE_PER_SET);

        return this.applyTemporaryDestructionToBlueprints(blueprints);
    }

    initializeTimeBombStatesForEncounter() {
        if (!this.timeBombStates || typeof this.timeBombStates.clear !== 'function') {
            this.timeBombStates = new Map();
        } else {
            this.timeBombStates.clear();
        }

        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        const activeEntries = loadout.slice(0, CONSTANTS.DICE_PER_SET);
        activeEntries.forEach(entry => {
            if (!entry || entry.id !== 'bomb' || !entry.uid) {
                return;
            }
            this.timeBombStates.set(entry.uid, {
                countdown: 3,
                detonated: false,
                isUpgraded: !!entry.isUpgraded
            });
        });
    }

    getTimeBombStateByUid(uid) {
        if (!uid || !this.timeBombStates) {
            return null;
        }
        return this.timeBombStates.get(uid) || null;
    }

    getDieLeftStatusText(die) {
        if (!die || !die.dieBlueprint) {
            return '';
        }

        const blueprint = die.dieBlueprint;
        if (blueprint.id !== 'bomb') {
            return '';
        }

        const state = this.getTimeBombStateByUid(blueprint.uid);
        if (!state || state.detonated) {
            return '';
        }

        const countdown = Number.isFinite(state.countdown) ? state.countdown : 0;
        if (countdown <= 0) {
            return '';
        }

        return `${countdown}`;
    }

    resolveTimeBombCountdowns({ usedBlueprintUids, nullifiedBlueprintUids } = {}) {
        if (!this.timeBombStates || this.timeBombStates.size === 0) {
            return { totalBonus: 0, detonatedCount: 0, detonatedStates: [] };
        }

        const usedSet = usedBlueprintUids instanceof Set
            ? usedBlueprintUids
            : new Set(Array.isArray(usedBlueprintUids) ? usedBlueprintUids : []);

        const nullifiedSet = nullifiedBlueprintUids instanceof Set
            ? nullifiedBlueprintUids
            : new Set(Array.isArray(nullifiedBlueprintUids) ? nullifiedBlueprintUids : []);

        let totalBonus = 0;
        let stateChanged = false;
        const detonatedStates = [];

        this.timeBombStates.forEach((state, uid) => {
            if (!state || state.detonated) {
                return;
            }

            if (usedSet.has(uid) || nullifiedSet.has(uid)) {
                return;
            }

            const currentCountdown = Number.isFinite(state.countdown) ? state.countdown : 3;
            const updatedCountdown = Math.max(0, currentCountdown - 1);
            if (updatedCountdown !== currentCountdown) {
                stateChanged = true;
            }
            state.countdown = updatedCountdown;

            if (state.countdown === 0 && !state.detonated) {
                state.detonated = true;
                stateChanged = true;
                const bonus = state.isUpgraded ? 35 : 25;
                totalBonus += bonus;
                detonatedStates.push({ uid, bonus });
            }
        });

        if (stateChanged) {
            this.getDiceInPlay().forEach(die => {
                if (!die) {
                    return;
                }
                if (typeof die.updateEmoji === 'function') {
                    die.updateEmoji();
                }
                if (typeof die.updateVisualState === 'function') {
                    die.updateVisualState();
                }
            });
        }

        return { totalBonus, detonatedCount: detonatedStates.length, detonatedStates };
    }

    playTimeBombDetonationAnimation({ detonatedCount = 1 } = {}) {
        if (!this.add || !this.tweens) {
            return Promise.resolve();
        }

        const label = detonatedCount > 1 ? `BOMBARD x${detonatedCount}` : 'BOMBARD';
        const centerX = this.cameras && this.cameras.main ? this.cameras.main.centerX : 0;
        const baseCenterY = this.cameras && this.cameras.main
            ? this.cameras.main.centerY
            : CONSTANTS.RESOLVE_TEXT_Y;
        const centerY = baseCenterY - 200;

        const text = this.add.text(centerX, centerY, label, {
            fontSize: '86px',
            fontStyle: 'bold',
            color: '#ff4d4d',
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5);
        text.setDepth(2000);
        text.setScale(0.25);
        text.setAlpha(0);

        return new Promise(resolve => {
            const finish = () => {
                if (text && typeof text.destroy === 'function' && text.scene) {
                    text.destroy();
                }
                resolve();
            };

            let hasResolved = false;
            const completeOnce = () => {
                if (!hasResolved) {
                    hasResolved = true;
                    finish();
                }
            };

            const makeTimeline = () => {
                if (!this.tweens) {
                    return null;
                }
                if (typeof this.tweens.timeline === 'function') {
                    return this.tweens.timeline.bind(this.tweens);
                }
                if (typeof this.tweens.createTimeline === 'function') {
                    return this.tweens.createTimeline.bind(this.tweens);
                }
                return null;
            };

            const segments = [
                {
                    targets: text,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 0.25, to: 1.15 },
                    duration: 350,
                    ease: 'Back.Out'
                },
                {
                    targets: text,
                    scale: 0.95,
                    duration: 160,
                    ease: 'Sine.InOut',
                    yoyo: true,
                    repeat: 1
                },
                {
                    targets: text,
                    duration: 220,
                    ease: 'Linear'
                },
                {
                    targets: text,
                    alpha: { from: 1, to: 0 },
                    scale: { to: 0.5 },
                    duration: 320,
                    ease: 'Quad.In'
                }
            ];

            const timelineFactory = makeTimeline();
            if (timelineFactory) {
                const timeline = timelineFactory({
                    onComplete: completeOnce
                });

                if (timeline && typeof timeline.add === 'function' && typeof timeline.play === 'function') {
                    segments.forEach(config => timeline.add(config));
                    timeline.play();
                } else {
                    completeOnce();
                }
            } else if (this.tweens && typeof this.tweens.add === 'function') {
                let index = 0;
                const playNext = () => {
                    if (index >= segments.length) {
                        completeOnce();
                        return;
                    }

                    const config = { ...segments[index] };
                    index += 1;
                    const previousComplete = config.onComplete;
                    config.onComplete = () => {
                        if (typeof previousComplete === 'function') {
                            previousComplete();
                        }
                        playNext();
                    };
                    this.tweens.add(config);
                };

                playNext();
            } else {
                completeOnce();
            }

            if (this.time && typeof this.time.delayedCall === 'function') {
                this.time.delayedCall(1800, () => {
                    if (hasResolved) {
                        return;
                    }
                    hasResolved = true;
                    finish();
                });
            }
        });
    }

    applyTemporaryDestructionToBlueprints(blueprints = []) {
        const list = Array.isArray(blueprints)
            ? blueprints.map(entry => ({ ...entry }))
            : [];

        if (!Array.isArray(this.temporarilyDestroyedDice) || this.temporarilyDestroyedDice.length === 0) {
            return list;
        }

        const workingBlueprints = [...list];
        const remainingEntries = [];

        this.temporarilyDestroyedDice.forEach(entry => {
            if (!entry || entry.turnsRemaining <= 0) {
                return;
            }

            const entryUid = entry.uid || (entry.blueprint && entry.blueprint.uid);
            const entryId = entry.blueprint ? entry.blueprint.id : null;
            const entryUpgrade = entry.blueprint ? !!entry.blueprint.isUpgraded : false;

            const matchIndex = workingBlueprints.findIndex(candidate => {
                if (!candidate) {
                    return false;
                }

                if (entryUid && candidate.uid) {
                    return candidate.uid === entryUid;
                }

                const candidateId = candidate.id;
                const candidateUpgrade = !!candidate.isUpgraded;
                return candidateId === entryId && candidateUpgrade === entryUpgrade;
            });

            entry.turnsRemaining = Math.max(0, (entry.turnsRemaining || 0) - 1);

            if (matchIndex !== -1) {
                workingBlueprints.splice(matchIndex, 1);
            }

            if (entry.turnsRemaining > 0 && (matchIndex !== -1 || entryUid)) {
                remainingEntries.push(entry);
            }
        });

        this.temporarilyDestroyedDice = remainingEntries;

        return workingBlueprints;
    }

    queueDiceDestructionForTurn(diceList = []) {
        if (!Array.isArray(diceList) || diceList.length === 0) {
            return;
        }

        if (!Array.isArray(this.temporarilyDestroyedDice)) {
            this.temporarilyDestroyedDice = [];
        }

        const existingByUid = new Map();
        this.temporarilyDestroyedDice.forEach(entry => {
            if (entry && entry.uid) {
                existingByUid.set(entry.uid, entry);
            }
        });

        diceList.forEach(die => {
            if (!die || !die.dieBlueprint) {
                return;
            }

            const blueprint = { ...die.dieBlueprint };
            const uid = blueprint.uid;

            if (uid && existingByUid.has(uid)) {
                const stored = existingByUid.get(uid);
                stored.turnsRemaining = 1;
                stored.blueprint = blueprint;
                return;
            }

            this.temporarilyDestroyedDice.push({
                uid: uid || null,
                blueprint,
                turnsRemaining: 1
            });

            if (uid) {
                existingByUid.set(uid, this.temporarilyDestroyedDice[this.temporarilyDestroyedDice.length - 1]);
            }
        });
    }

    applyEnemyComboDestruction({ attackResult, defendResult } = {}) {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || typeof enemy.shouldDestroyDiceOutsideCombo !== 'function') {
            return;
        }

        const shouldDestroy = enemy.shouldDestroyDiceOutsideCombo({
            scene: this,
            attackResult,
            defendResult
        });

        if (!shouldDestroy) {
            return;
        }

        const diceToDestroy = new Set();

        if (Array.isArray(this.dice)) {
            this.dice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (defendResult && defendResult.comboType === 'No combo' && Array.isArray(this.defendDice)) {
            this.defendDice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (attackResult && attackResult.comboType === 'No combo' && Array.isArray(this.attackDice)) {
            this.attackDice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (diceToDestroy.size === 0) {
            return;
        }

        this.queueDiceDestructionForTurn(Array.from(diceToDestroy));

        if (typeof enemy.onDiceDestroyedOutsideCombo === 'function') {
            enemy.onDiceDestroyedOutsideCombo({
                scene: this,
                destroyedCount: diceToDestroy.size
            });
        }
    }

    refreshActiveDiceVisuals() {
        const diceInPlay = this.getDiceInPlay();
        diceInPlay.forEach(die => {
            if (!die) {
                return;
            }

            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }

            const value = typeof die.displayValue === 'number'
                ? die.displayValue
                : (typeof die.value === 'number' ? die.value : 1);

            if (typeof die.renderFace === 'function') {
                die.renderFace(value, { updateValue: true });
            } else if (typeof value === 'number') {
                die.value = value;
            }

            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }

            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
        });
    }

    applyBlueprintToDie(die, blueprint) {
        if (!die || !blueprint) {
            return false;
        }

        const value = typeof die.displayValue === 'number'
            ? die.displayValue
            : (typeof die.value === 'number' ? die.value : 1);

        die.dieBlueprint = { ...blueprint };

        if (typeof die.renderFace === 'function') {
            die.renderFace(value || 1, { updateValue: true });
        } else {
            die.value = value || 1;
        }

        if (typeof die.updateEmoji === 'function') {
            die.updateEmoji();
        }

        if (typeof die.updateFaceValueHighlight === 'function') {
            die.updateFaceValueHighlight();
        }

        if (typeof die.updateVisualState === 'function') {
            die.updateVisualState();
        }

        return true;
    }

    replaceDiceWithStandard({ uid, blueprint } = {}) {
        const diceInPlay = this.getDiceInPlay();
        if (!Array.isArray(diceInPlay) || diceInPlay.length === 0) {
            return false;
        }

        const replacementBlueprint = createDieBlueprint('standard');
        let replaced = false;

        for (const die of diceInPlay) {
            if (!die || !die.dieBlueprint) {
                continue;
            }

            const matchesUid = uid && die.dieBlueprint.uid === uid;
            const matchesBlueprint = !uid && blueprint
                && die.dieBlueprint.id === blueprint.id
                && !!die.dieBlueprint.isUpgraded === !!blueprint.isUpgraded;

            if (!matchesUid && !matchesBlueprint) {
                continue;
            }

            const previousBlueprint = die.dieBlueprint ? { ...die.dieBlueprint } : null;
            this.applyBlueprintToDie(die, replacementBlueprint);
            if (previousBlueprint
                && previousBlueprint.id === 'bomb'
                && previousBlueprint.uid
                && this.timeBombStates instanceof Map) {
                this.timeBombStates.delete(previousBlueprint.uid);
            }
            replaced = true;
            break;
        }

        return replaced;
    }

    discardCustomDieAtIndex(index) {
        if (!Number.isInteger(index) || index < 0) {
            return false;
        }

        const loadout = Array.isArray(this.customDiceLoadout) ? [...this.customDiceLoadout] : [];
        if (index >= loadout.length) {
            return false;
        }

        const [removedBlueprint] = loadout.splice(index, 1);
        if (!removedBlueprint) {
            return false;
        }

        if (removedBlueprint.uid && this.timeBombStates instanceof Map) {
            this.timeBombStates.delete(removedBlueprint.uid);
        }

        this.customDiceLoadout = loadout;

        this.refreshBackpackContents();

        this.replaceDiceWithStandard({ uid: removedBlueprint.uid, blueprint: removedBlueprint });

        this.updateZonePreviewText();
        this.updateDiceRewardHandState();

        return true;
    }

    getDiceRewardCapacityState() {
        const loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        return {
            currentCount: loadout.length,
            maxCount: MAX_CUSTOM_DICE
        };
    }

    updateDiceRewardHandState() {
        if (!this.diceRewardUI) {
            return;
        }

        const capacity = this.getDiceRewardCapacityState();
        this.diceRewardUI.updateCapacityState({
            currentCount: capacity.currentCount,
            maxCount: capacity.maxCount
        });
    }

    getDiceInPlay() {
        const combined = [...this.defendDice, ...this.attackDice, ...this.dice];
        return Array.from(new Set(combined));
    }

    getResolutionTarget(die) {
        if (this.defendDice.includes(die) && this.defendZoneCenter) {
            return this.defendZoneCenter;
        }

        if (this.attackDice.includes(die) && this.attackZoneCenter) {
            return this.attackZoneCenter;
        }

        if (this.defendZoneCenter && this.attackZoneCenter) {
            const midpoint = (this.defendZoneCenter.x + this.attackZoneCenter.x) / 2;
            return die.x < midpoint ? this.defendZoneCenter : this.attackZoneCenter;
        }

        return { x: die.x, y: die.y - 100 };
    }

    animateDieResolution(die, target) {
        return new Promise(resolve => {
            const upwardOffset = 180;

            die.disableInteractive();
            die.setDepth(10);
            die.setAlpha(die.isWeakened ? 0.5 : 1);

            const inZone = this.defendDice.includes(die) || this.attackDice.includes(die);

            let fadeTween = null;

            const completeResolution = () => {
                if (fadeTween && fadeTween.isPlaying()) {
                    fadeTween.stop();
                }

                if (die.active) {
                    die.destroy();
                }

                resolve();
            };

            if (inZone) {
                // Move (launch) upward then complete
                const moveTarget = {
                    x: target.x,
                    y: target.y - upwardOffset
                };

                this.tweens.add({
                    targets: die,
                    ...moveTarget,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: completeResolution
                });

                // Fade out in parallel
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 400,
                    delay: 100,
                    ease: 'Quad.easeIn'
                });
            } else {
                // Not in a zone — do not move, just fade (then destroy)
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 350,
                    ease: 'Quad.easeIn',
                    onComplete: completeResolution
                });
            }
        });
    }

    applyDamage(amount) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthUI();

        if (this.playerHealth === 0) {
            this.triggerGameOver();
        }
    }

    updateHealthUI() {
        if (!this.healthBar) {
            return;
        }

        this.animateHealthBar(this.healthBar, this.playerHealth, this.playerMaxHealth);
    }

    stopHealthBarTweens(bar) {
        if (!bar) {
            return;
        }

        ['textTween', 'barTween', 'damageTween'].forEach(key => {
            if (bar[key]) {
                bar[key].stop();
                this.tweens.remove(bar[key]);
                bar[key] = null;
            }
        });

        this.tryEnterMapStateAfterCombat();
    }

    animateHealthBar(bar, targetHealth, maxHealth) {
        if (!bar) {
            return;
        }

        const clampedTarget = Phaser.Math.Clamp(targetHealth, 0, maxHealth);
        const previousHealth = typeof bar.displayedHealth === 'number' ? bar.displayedHealth : clampedTarget;
        const duration = 1000;

        const targetRatio = maxHealth > 0 ? Phaser.Math.Clamp(clampedTarget / maxHealth, 0, 1) : 0;
        const previousRatio = maxHealth > 0 ? Phaser.Math.Clamp(previousHealth / maxHealth, 0, 1) : 0;
        const targetWidth = bar.barWidth * targetRatio;
        const previousWidth = bar.barWidth * previousRatio;

        const isDamage = clampedTarget < previousHealth;

        this.stopHealthBarTweens(bar);

        bar.barFill.setFillStyle(bar.fillColor ?? bar.barFill.fillColor);

        if (typeof bar.damageFill !== 'undefined') {
            bar.damageFill.setVisible(false);
            bar.damageFill.displayWidth = 0;
        }

        if (typeof bar.displayedHealth !== 'number') {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (previousHealth === clampedTarget) {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (isDamage && bar.damageFill) {
            const differenceWidth = Math.max(0, previousWidth - targetWidth);
            bar.barFill.displayWidth = targetWidth;

            if (differenceWidth > 0) {
                bar.damageFill.setFillStyle(bar.damageColor ?? bar.damageFill.fillColor);
                bar.damageFill.x = bar.barFill.x + targetWidth;
                bar.damageFill.displayWidth = differenceWidth;
                bar.damageFill.displayHeight = bar.barHeight;
                bar.damageFill.setVisible(true);

                bar.damageTween = this.tweens.add({
                    targets: bar.damageFill,
                    displayWidth: 0,
                    duration,
                    ease: 'Linear',
                    onUpdate: () => {
                        bar.damageFill.x = bar.barFill.x + targetWidth;
                    },
                    onComplete: () => {
                        bar.damageFill.setVisible(false);
                        bar.damageFill.displayWidth = 0;
                        bar.damageTween = null;
                        this.tryEnterMapStateAfterCombat();
                    }
                });
            }
        } else {
            bar.barFill.displayWidth = previousWidth;
            bar.barTween = this.tweens.add({
                targets: bar.barFill,
                displayWidth: targetWidth,
                duration,
                ease: 'Linear',
                onComplete: () => {
                    bar.barTween = null;
                    this.tryEnterMapStateAfterCombat();
                }
            });
        }

        const textCounter = { value: previousHealth };
        bar.textTween = this.tweens.add({
            targets: textCounter,
            value: clampedTarget,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                const displayValue = Math.round(textCounter.value);
                bar.displayedHealth = displayValue;
                bar.text.setText(`HP: ${displayValue}/${maxHealth}`);
                this.updateBurnUI();
            },
            onComplete: () => {
                bar.displayedHealth = clampedTarget;
                bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
                this.updateBurnUI();
                bar.textTween = null;
                this.tryEnterMapStateAfterCombat();
            }
        });
    }

    isHealthBarAnimating(bar) {
        if (!bar) {
            return false;
        }

        const tweenKeys = ['barTween', 'damageTween', 'textTween'];
        return tweenKeys.some(key => {
            const tween = bar[key];
            return tween && tween.isPlaying;
        });
    }

    requestEnterMapStateAfterCombat() {
        this.pendingPostCombatTransition = true;
        this.tryEnterMapStateAfterCombat();
    }

    tryEnterMapStateAfterCombat() {
        if (!this.pendingPostCombatTransition) {
            return;
        }

        const animationsActive = this.isResolving
            || this.isHealthBarAnimating(this.enemyHealthBar)
            || this.isHealthBarAnimating(this.healthBar);

        if (animationsActive) {
            return;
        }

        if (this.diceRewardUI) {
            return;
        }

        this.pendingPostCombatTransition = false;
        this.enterMapState();
    }

    getPathTextureKeyForConfig(config) {
        const defaultKey = 'path_ladder';

        if (!config || !config.pathTextureKey) {
            return defaultKey;
        }

        const textureKey = config.pathTextureKey;
        const textures = this.textures;

        if (textures && typeof textures.exists === 'function' && textures.exists(textureKey)) {
            return textureKey;
        }

        return defaultKey;
    }

    getWallTextureKeyForConfig(config) {
        const textures = this.textures;
        const defaultKey = 'wall';
        const candidates = [];

        if (config && config.wallTextureKey) {
            candidates.push(config.wallTextureKey);
        }

        candidates.push(defaultKey);

        for (const key of candidates) {
            if (!key) {
                continue;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                return key;
            }
        }

        return null;
    }

    getBackgroundTextureKeyForConfig(config) {
        const textures = this.textures;
        const defaultKey = 'path_background';
        const candidates = [];

        if (config && config.backgroundTextureKey) {
            candidates.push(config.backgroundTextureKey);
        }

        candidates.push(defaultKey);

        for (const key of candidates) {
            if (!key) {
                continue;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                return key;
            }
        }

        return null;
    }

    getOutsideBackgroundLayerKeysForConfig(config) {
        const textures = this.textures;
        const result = [];

        const addKeyIfAvailable = key => {
            if (!key) {
                return;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                if (!result.includes(key)) {
                    result.push(key);
                }
            }
        };

        if (config && Array.isArray(config.outsideBackgroundLayerKeys)) {
            config.outsideBackgroundLayerKeys.forEach(addKeyIfAvailable);
        }

        if (result.length === 0) {
            ['outside_background_1', 'outside_background_2', 'outside_background_3', 'outside_background_4']
                .forEach(addKeyIfAvailable);
        }

        return result;
    }

    loadMap(mapIndex = 0) {
        if (!Array.isArray(this.maps) || mapIndex < 0 || mapIndex >= this.maps.length) {
            return false;
        }

        const config = this.maps[mapIndex];
        this.currentMapIndex = mapIndex;
        this.currentMapConfig = config;
        this.updateMapTitleText();

        const enemyFactory = config && typeof config.createEnemies === 'function'
            ? config.createEnemies
            : null;
        const enemies = enemyFactory ? enemyFactory() : [];
        if (this.enemyManager && typeof this.enemyManager.setEnemies === 'function') {
            this.enemyManager.setEnemies(Array.isArray(enemies) ? enemies : []);
        }

        if (this.pathUI) {
            this.pathUI.destroy();
            this.pathUI = null;
        }

        let enemySequence;
        if (config) {
            if (Array.isArray(config.enemySequence)) {
                enemySequence = config.enemySequence.map(entry => ({ ...entry }));
            } else if (typeof config.createEnemySequence === 'function') {
                const generatedSequence = config.createEnemySequence();
                if (Array.isArray(generatedSequence)) {
                    enemySequence = generatedSequence.map(entry => ({ ...entry }));
                }
            }
        }

        const connectionTextureKey = this.getPathTextureKeyForConfig(config);
        const wallTextureKey = this.getWallTextureKeyForConfig(config);
        const backgroundTextureKey = this.getBackgroundTextureKeyForConfig(config);
        const outsideBackgroundLayerKeys = this.getOutsideBackgroundLayerKeysForConfig(config);
        const outsideBackgroundConfig = config && typeof config.outsideBackgroundConfig === 'object'
            ? JSON.parse(JSON.stringify(config.outsideBackgroundConfig))
            : null;

        this.pathManager = new PathManager({
            enemySequence,
            allowUpgradeNodes: true,
            upgradeNodeMinEnemyIndex: 1
        });
        this.pathUI = new PathUI(
            this,
            this.pathManager,
            node => this.handlePathNodeSelection(node),
            {
                connectionTextureKey,
                wallTextureKey,
                backgroundTextureKey,
                outsideBackgroundLayerKeys,
                outsideBackgroundConfig
            }
        );
        this.currentPathNodeId = null;

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            const mapLabel = config && config.displayName ? config.displayName : 'Map';
            this.enemyHealthBar.nameText.setText(`${mapLabel}: Choose a Node`);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();

        this.updateMapSkipButtonState();

        return true;
    }

    updateMapTitleText() {
        if (!this.mapTitleText) {
            return;
        }

        const label = this.currentMapConfig && this.currentMapConfig.displayName
            ? this.currentMapConfig.displayName
            : '';
        const hasLabel = label && label.length > 0;
        this.mapTitleText.setText(hasLabel ? `${label}` : '');
    }

    hasNextMap() {
        if (!Array.isArray(this.maps)) {
            return false;
        }

        const nextIndex = typeof this.currentMapIndex === 'number' ? this.currentMapIndex + 1 : 0;
        return nextIndex >= 0 && nextIndex < this.maps.length;
    }

    advanceToNextMapIfAvailable() {
        if (!this.hasNextMap()) {
            return false;
        }

        const nextIndex = (typeof this.currentMapIndex === 'number' ? this.currentMapIndex + 1 : 0);
        const nextConfig = this.maps[nextIndex];
        const loaded = this.loadMap(nextIndex);
        if (loaded && nextConfig && nextConfig.displayName) {
            this.showNodeMessage(`Entering ${nextConfig.displayName}`, '#ffffff');
        }
        if (loaded) {
            this.updateMapSkipButtonState();
        }
        return loaded;
    }

    handleMapSkipButtonPress() {
        if (!this.testingModeEnabled || !this.isMapViewActive) {
            return;
        }

        const advanced = this.advanceToNextMapIfAvailable();
        if (advanced) {
            this.enterMapState();
        } else {
            this.updateMapSkipButtonState();
        }
    }

    processTurnOutcome({ attackScore, defendScore, attackResult, defendResult }) {
        if (!this.enemyManager) {
            return;
        }

        this.playerBlockValue = defendScore;

        this.applyBurnTickDamage();
        if (this.isGameOver) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy) {
            this.handleAllEnemiesDefeated();
            this.playerBlockValue = 0;
            return;
        }

        if (this.enemyManager.isCurrentEnemyDefeated()) {
            this.playerBlockValue = 0;
            this.handleEnemyDefeat();
            return;
        }

        let effectiveAttackScore = attackScore;
        if (enemy && typeof enemy.modifyIncomingAttack === 'function') {
            const modified = enemy.modifyIncomingAttack({
                attackScore,
                defendScore,
                attackResult,
                defendResult
            });
            if (typeof modified === 'number' && !Number.isNaN(modified)) {
                effectiveAttackScore = Math.max(0, modified);
            }
        }

        let totalDamageThisTurn = 0;
        const notifyEnemyDamageTaken = (amount, { source } = {}) => {
            if (!enemy || amount <= 0) {
                return;
            }

            const previousTotal = totalDamageThisTurn;
            totalDamageThisTurn += amount;

            if (typeof enemy.onPlayerDamageDealt === 'function') {
                enemy.onPlayerDamageDealt({
                    amount,
                    source: source || 'attack',
                    totalDamage: totalDamageThisTurn,
                    previousTotal,
                    scene: this,
                    enemyManager: this.enemyManager
                });
            }
        };

        this.enemyManager.primeUpcomingDefenses();
        this.executeZoneEffects(attackResult ? attackResult.preResolutionEffects : null, 'attack', { attackResult, defendResult });

        const burnResolution = this.applyEnemyBurnTickDamage();
        if (burnResolution && (burnResolution.damageDealt > 0 || burnResolution.blockedAmount > 0)) {
            if (this.enemyManager.isCurrentEnemyDefeated()) {
                this.playerBlockValue = 0;
                this.handleEnemyDefeat();
                return;
            }
            if (burnResolution.damageDealt > 0) {
                notifyEnemyDamageTaken(burnResolution.damageDealt, { source: 'burn' });
            }
        }

        const attackResolution = this.enemyManager.applyPlayerAttack(effectiveAttackScore, {
            applyBlockbuster: this.hasBlockbusterRelic
        });

        if (attackResolution && attackResolution.damageDealt > 0) {
            notifyEnemyDamageTaken(attackResolution.damageDealt, { source: 'attack' });
        }

        if (attackResolution && attackResolution.halvedBlock > 0) {
            this.refreshEnemyIntentText();
            this.updateEnemyStatusText();
        }
        this.updateEnemyHealthUI();
        this.updateEnemyBurnUI();

        if (this.enemyManager.isCurrentEnemyDefeated()) {
            this.playerBlockValue = 0;
            this.handleEnemyDefeat();
            return;
        }

        this.executeEnemyTurn();
    }

    updateEnemyHealthUI() {
        if (!this.enemyHealthBar) {
            return;
        }

        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        if (!enemy) {
            this.stopHealthBarTweens(this.enemyHealthBar);
            this.enemyHealthBar.barFill.displayWidth = 0;
            this.enemyHealthBar.text.setText('HP: 0/0');
            if (this.enemyHealthBar.damageFill) {
                this.enemyHealthBar.damageFill.setVisible(false);
                this.enemyHealthBar.damageFill.displayWidth = 0;
            }
            this.enemyHealthBar.displayedHealth = 0;
            this.updateEnemyBurnUI();
            return;
        }

        this.animateHealthBar(this.enemyHealthBar, enemy.health, enemy.maxHealth);
        this.updateEnemyBurnUI();
    }

    prepareNextEnemyMove() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.upcomingEnemyMove = null;
            if (this.enemyIntentText) {
                const hasPending = this.pathManager ? this.pathManager.hasPendingNodes() : false;
                this.enemyIntentText.setText(hasPending ? 'Select your next node' : 'All enemies defeated');
            }
            this.updateEnemyStatusText();
            return;
        }

        this.upcomingEnemyMove = this.enemyManager.prepareNextMove();
        this.refreshEnemyIntentText();
        this.updateEnemyStatusText();
    }

    getEnemyIntentDescription(enemy, move) {
        if (!move) {
            return '...';
        }

        if (enemy && typeof enemy.getIntentDescription === 'function') {
            const custom = enemy.getIntentDescription(move, {
                enemyManager: this.enemyManager,
                scene: this
            });
            if (typeof custom === 'string' && custom.trim().length > 0) {
                return custom;
            }
        }

        if (move && typeof move.getLabel === 'function') {
            const generated = move.getLabel();
            if (typeof generated === 'string' && generated.trim().length > 0) {
                return generated;
            }
        }

        if (move && typeof move.label === 'string' && move.label.trim().length > 0) {
            return move.label;
        }

        return '...';
    }

    refreshEnemyIntentText() {
        if (!this.enemyIntentText) {
            return;
        }

        const hasEnemyManager = !!this.enemyManager;
        const enemy = hasEnemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const isEnemyActive = hasEnemyManager && enemy && !this.enemyManager.isCurrentEnemyDefeated();

        if (!isEnemyActive) {
            const hasPending = this.pathManager ? this.pathManager.hasPendingNodes() : false;
            this.enemyIntentText.setText(hasPending ? 'Select your next node' : 'All enemies defeated');
            return;
        }

        const description = this.getEnemyIntentDescription(enemy, this.upcomingEnemyMove);
        if (this.upcomingEnemyMove) {
            this.upcomingEnemyMove.label = description;
        }
        this.enemyIntentText.setText(`Next: ${description}`);
    }

    updateEnemyStatusText() {
        if (!this.enemyStatusText) {
            return;
        }

        const hasEnemyManager = !!this.enemyManager;
        const enemy = hasEnemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const isEnemyActive = hasEnemyManager && enemy && !this.enemyManager.isCurrentEnemyDefeated();

        if (!isEnemyActive) {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
            return;
        }

        let statusDescription = '';
        if (enemy && typeof enemy.getStatusDescription === 'function') {
            statusDescription = enemy.getStatusDescription(this.upcomingEnemyMove) || '';
        }

        if (statusDescription) {
            this.enemyStatusText.setText(statusDescription);
            this.enemyStatusText.setVisible(true);
        } else {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
        }
    }

    executeEnemyTurn() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            return;
        }

        const move = this.enemyManager.consumeUpcomingMove();
        this.upcomingEnemyMove = null;

        if (!move) {
            this.prepareNextEnemyMove();
            this.playerBlockValue = 0;
            return;
        }

        for (const action of move.actions) {
            if (action.type === 'attack') {
                this.handleEnemyAttack(action.value);
            } else if (action.type === 'heal') {
                this.enemyManager.healCurrentEnemy(action.value);
                this.updateEnemyHealthUI();
            } else if (action.type === 'defend') {
                if (!action._preApplied) {
                    this.enemyManager.addEnemyBlock(action.value);
                }
            } else if (action.type === 'lock') {
                this.queueEnemyLocks(action.count || 1);
            } else if (action.type === 'weaken') {
                this.queueEnemyWeaken(action.count || 1);
            } else if (action.type === 'nullify') {
                this.queueEnemyNullify(action.count || 1);
            } else if (action.type === 'burn') {
                this.applyPlayerBurn(action.value);
            }

            if (this.isGameOver) {
                break;
            }
        }

        if (this.isGameOver) {
            return;
        }

        if (enemy && typeof enemy.onTurnFinished === 'function' && !this.enemyManager.isCurrentEnemyDefeated()) {
            enemy.onTurnFinished({
                scene: this,
                enemyManager: this.enemyManager
            });
        }

        if (this.isGameOver) {
            return;
        }

        this.playerBlockValue = 0;

        if (!this.enemyManager.isCurrentEnemyDefeated()) {
            this.prepareNextEnemyMove();
        } else {
            this.handleEnemyDefeat();
        }
    }

    applyPlayerBurn(amount) {
        if (amount <= 0) {
            return;
        }

        this.playerBurn += amount;
        this.updateBurnUI();
    }

    applyBurnTickDamage() {
        if (this.playerBurn <= 0) {
            return;
        }

        this.handleEnemyAttack(this.playerBurn);
    }

    updateBurnUI() {
        if (!this.playerBurnText || !this.healthBar || !this.healthBar.text) {
            return;
        }

        const shouldShowBurn = this.playerBurn > 0 && this.inCombat;

        if (shouldShowBurn) {
            const bounds = this.healthBar.text.getBounds();
            const burnX = bounds.x + bounds.width + 20;
            const burnY = bounds.y + bounds.height / 2;
            this.playerBurnText.setPosition(burnX, burnY);
            this.playerBurnText.setOrigin(0, 0.5);
            this.playerBurnText.setText(`Burn ${this.playerBurn}`);
            this.playerBurnText.setVisible(true);

            if (!this.playerBurnGlowTween) {
                this.playerBurnGlowTween = this.tweens.add({
                    targets: this.playerBurnText,
                    alpha: { from: 0.7, to: 1 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.playerBurnText.setVisible(false);
            this.playerBurnText.setText('');

            if (this.playerBurnGlowTween) {
                this.playerBurnGlowTween.stop();
                this.playerBurnGlowTween.remove();
                this.playerBurnGlowTween = null;
            }

            this.playerBurnText.setAlpha(1);
            this.playerBurnText.setScale(1);
        }
    }

    reducePlayerBurn(amount) {
        if (!amount || amount <= 0 || this.playerBurn <= 0) {
            return 0;
        }

        const reduction = Math.min(this.playerBurn, Math.max(0, Math.floor(amount)));
        if (reduction <= 0) {
            return 0;
        }

        this.playerBurn -= reduction;
        this.updateBurnUI();
        return reduction;
    }

    resetPlayerBurn() {
        if (this.playerBurn !== 0) {
            this.playerBurn = 0;
        }
        this.updateBurnUI();
    }

    applyEnemyBurn(amount) {
        if (!this.enemyManager || amount <= 0) {
            return 0;
        }

        const applied = this.enemyManager.applyEnemyBurn(amount) || 0;
        this.updateEnemyBurnUI();
        return applied;
    }

    applyEnemyBurnTickDamage() {
        if (!this.enemyManager) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const result = this.enemyManager.applyEnemyBurnTick();
        if (!result) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        if (result.blockedAmount > 0) {
            if (this.enemyManager && !this.enemyManager.isCurrentEnemyDefeated()) {
                this.refreshEnemyIntentText();
                this.updateEnemyStatusText();
            }
        }

        if (result.damageDealt > 0 || result.blockedAmount > 0) {
            this.updateEnemyHealthUI();
        }
        this.updateEnemyBurnUI();
        return result;
    }

    updateEnemyBurnUI() {
        if (!this.enemyBurnText || !this.enemyHealthBar || !this.enemyHealthBar.text) {
            return;
        }

        const burnValue = this.enemyManager ? this.enemyManager.getEnemyBurn() : 0;
        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const enemyActive = this.inCombat && enemy && this.enemyManager && !this.enemyManager.isCurrentEnemyDefeated();
        const shouldShow = enemyActive && burnValue > 0;

        if (shouldShow) {
            const bounds = this.enemyHealthBar.text.getBounds();
            const burnX = bounds.x - 20;
            const burnY = bounds.y + bounds.height / 2;
            this.enemyBurnText.setPosition(burnX, burnY);
            this.enemyBurnText.setOrigin(1, 0.5);
            this.enemyBurnText.setText(`Burn ${burnValue}`);
            this.enemyBurnText.setVisible(true);

            if (!this.enemyBurnGlowTween) {
                this.enemyBurnGlowTween = this.tweens.add({
                    targets: this.enemyBurnText,
                    alpha: { from: 0.7, to: 1 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.enemyBurnText.setVisible(false);
            this.enemyBurnText.setText('');

            if (this.enemyBurnGlowTween) {
                this.enemyBurnGlowTween.stop();
                this.enemyBurnGlowTween.remove();
                this.enemyBurnGlowTween = null;
            }

            this.enemyBurnText.setAlpha(1);
            this.enemyBurnText.setScale(1);
        }
    }

    resetEnemyBurn() {
        if (this.enemyManager && typeof this.enemyManager.resetEnemyBurn === 'function') {
            this.enemyManager.resetEnemyBurn();
        }
        this.updateEnemyBurnUI();
    }

    handleEnemyAttack(amount) {
        if (amount <= 0) {
            return;
        }

        const mitigated = Math.min(this.playerBlockValue, amount);
        this.playerBlockValue = Math.max(0, this.playerBlockValue - mitigated);
        const damage = Math.max(0, amount - mitigated);

        if (damage > 0) {
            this.applyDamage(damage);
        }
    }

    handlePathNodeSelection(node) {
        if (!node || !this.pathManager || this.inCombat || this.isResolving || this.isGameOver) {
            return;
        }

        this.pathManager.beginNode(node.id);
        this.currentPathNodeId = node.id;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        switch (node.type) {
            case PATH_NODE_TYPES.ENEMY:
                this.startCombatEncounter(node);
                break;
            case PATH_NODE_TYPES.SHOP:
                this.openShop();
                break;
            case PATH_NODE_TYPES.INFIRMARY:
                this.openInfirmary();
                break;
            case PATH_NODE_TYPES.TOWER:
                this.openTowerOfTen();
                break;
            case PATH_NODE_TYPES.UPGRADE:
                this.openDiceUpgrade();
                break;
            default:
                this.pathManager.completeCurrentNode();
                this.currentPathNodeId = null;
                this.enterMapState();
                break;
        }
    }

    startCombatEncounter(node) {
        if (!this.enemyManager) {
            return;
        }

        this.pendingPostCombatTransition = false;
        this.inCombat = true;
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.pendingLockCount = 0;
        this.lockedDice.clear();
        this.pendingWeakenCount = 0;
        this.weakenedDice.clear();
        this.pendingNullifyCount = 0;
        this.nullifiedDice.clear();
        this.isFirstCombatTurn = true;
        this.prepperCarryoverRolls = 0;
        this.resetGameState({ destroyDice: true });
        this.initializeTimeBombStatesForEncounter();
        this.resetEnemyBurn();
        this.setMapMode(false);
        let enemyIndex = node ? node.enemyIndex : -1;
        if (!Number.isFinite(enemyIndex) || enemyIndex < 0) {
            enemyIndex = 0;
        }

        const enemy = this.enemyManager.startEnemyEncounter(enemyIndex);
        if (enemy) {
            if (typeof enemy.onEncounterStart === 'function') {
                enemy.onEncounterStart();
            }
            if (this.testingModeEnabled) {
                this.applyTestingModeToEnemy(enemy);
            } else {
                this.restoreEnemyBaseStats(enemy);
            }
        }
        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            const baseName = enemy ? enemy.name : '???';
            const displayName = node.isBoss ? `${baseName} (Boss)` : baseName;
            this.enemyHealthBar.nameText.setText(displayName);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();
        this.updateEnemyStatusText();
        this.updateRollButtonState();

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, true);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        const messageText = node.isBoss ? 'Boss Encounter!' : 'Battle Start';
        this.showNodeMessage(messageText, node.isBoss ? '#ff8c69' : '#ffffff');
    }

    openShop() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();
        this.currentShopRelics = this.rollShopRelics(SHOP_RELIC_COUNT);

        this.activeFacilityUI = new ShopUI(this, {
            relics: this.getRelicShopState(),
            capacity: this.getRelicCapacityState(),
            onPurchase: relicId => this.handleShopPurchase(relicId),
            onClose: () => this.closeShop()
        });
    }

    getUpgradeableDiceOptions(count = 3) {
        const loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        const candidates = loadout
            .map((entry, index) => ({ ...entry, index }))
            .filter(entry => entry && !entry.isUpgraded);

        if (candidates.length === 0) {
            return [];
        }

        const shuffled = shuffleArray(candidates);
        const selection = shuffled.slice(0, Math.min(count, shuffled.length));

        return selection.map(entry => {
            const definition = getCustomDieDefinitionById(entry.id);
            return {
                uid: `${entry.index}-${entry.id}-${entry.isUpgraded ? 'u' : 'b'}`,
                id: entry.id,
                name: definition.name || entry.id || 'Die',
                emoji: definition.emoji || '',
                description: definition.description || '',
                upgradeDescription: definition.upgradeDescription
                    || definition.description
                    || ''
            };
        });
    }

    openDiceUpgrade() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        const options = this.getUpgradeableDiceOptions(3);
        if (options.length === 0) {
            this.showNodeMessage('All dice are already upgraded.', '#f9e79f');
            this.completeFacilityNode();
            return;
        }

        this.activeFacilityUI = new DiceUpgradeUI(this, {
            dice: options,
            onUpgrade: (selections, cost) => this.handleDiceUpgradeSelection(selections, cost),
            onClose: () => this.completeFacilityNode()
        });
    }

    handleDiceUpgradeSelection(selections = [], cost = 0) {
        if (!Array.isArray(selections) || selections.length === 0) {
            return false;
        }

        const totalCost = Number(cost) || 0;
        if (totalCost > 0 && !this.canAfford(totalCost)) {
            return false;
        }

        let upgradedCount = 0;
        const upgradedNames = [];

        selections.forEach(option => {
            if (!option || !option.id) {
                return;
            }

            const upgraded = this.upgradeCustomDieById(option.id);
            if (upgraded) {
                upgradedCount += 1;
                if (option.name) {
                    upgradedNames.push(option.name);
                } else {
                    const definition = getCustomDieDefinitionById(option.id);
                    if (definition && definition.name) {
                        upgradedNames.push(definition.name);
                    }
                }
            }
        });

        if (upgradedCount !== selections.length) {
            return false;
        }

        if (totalCost > 0) {
            const spent = this.spendGold(totalCost);
            if (spent !== totalCost) {
                return false;
            }
        }

        let message = '';
        if (upgradedNames.length === 1) {
            message = `Upgraded ${upgradedNames[0]}`;
        } else if (upgradedNames.length === 2) {
            message = `Upgraded ${upgradedNames[0]} & ${upgradedNames[1]}`;
        } else if (upgradedNames.length > 2) {
            const last = upgradedNames[upgradedNames.length - 1];
            const rest = upgradedNames.slice(0, -1).join(', ');
            message = `Upgraded ${rest} & ${last}`;
        } else {
            message = `Upgraded ${upgradedCount} dice`;
        }

        this.showNodeMessage(message, '#f1c40f');
        return true;
    }

    handleShopPurchase(relicId) {
        const relic = this.attemptPurchaseRelic(relicId);
        if (relic) {
            this.refreshShopInterface();
            return true;
        }
        return false;
    }

    refreshShopInterface() {
        if (this.activeFacilityUI instanceof ShopUI) {
            this.activeFacilityUI.updateRelics(
                this.getRelicShopState(),
                this.getRelicCapacityState()
            );
        }
    }

    getRelicShopState() {
        if (!Array.isArray(this.currentShopRelics)) {
            this.currentShopRelics = [];
        }

        return this.currentShopRelics.map(relic => ({
            id: relic.id,
            name: relic.name,
            description: relic.description,
            icon: relic.icon,
            cost: relic.cost,
            canAfford: this.playerGold >= relic.cost,
            owned: this.ownedRelicIds.has(relic.id)
        }));
    }

    getRelicCapacityState() {
        const currentCount = this.ownedRelicIds instanceof Set
            ? this.ownedRelicIds.size
            : (Array.isArray(this.relics) ? this.relics.length : 0);
        return {
            currentCount,
            maxCount: CONSTANTS.RELIC_MAX_SLOTS
        };
    }

    rollShopRelics(count = SHOP_RELIC_COUNT) {
        const available = this.getUnownedRelics();
        const pool = available.slice();
        const selections = [];

        while (selections.length < count && pool.length > 0) {
            const index = Phaser.Math.Between(0, pool.length - 1);
            selections.push(pool.splice(index, 1)[0]);
        }

        return selections;
    }

    getUnownedRelics() {
        return this.relicCatalog.filter(relic => !this.ownedRelicIds.has(relic.id));
    }

    closeShop() {
        this.destroyFacilityUI();
        this.currentShopRelics = null;

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    openInfirmary() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        const missing = Math.max(0, this.playerMaxHealth - this.playerHealth);
        const healFullCost = missing * 2; // Heal Full cost
        const canAffordFull = healFullCost > 0 && this.canAfford(healFullCost);

        this.activeFacilityUI = new InfirmaryUI(this, {
            healFullCost,
            canAffordFull,
            onHealHalf: () => this.handleInfirmaryChoice('half'),
            onIncreaseMax: () => this.handleInfirmaryChoice('max'),
            onHealFull: () => this.handleInfirmaryChoice('full')
        });
    }

    openTowerOfTen() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        this.playTowerOfTenEntrySound();

        this.activeFacilityUI = new TowerOfTenUI(this, {
            onComplete: result => this.handleTowerOfTenResult(result)
        });
    }

    playTowerOfTenEntrySound() {
        if (!this.sound || typeof this.sound.play !== 'function') {
            return;
        }
        this.sound.play('towerOfTenEnter', { volume: 0.85 });
    }

    playTowerOfTenExitSound({ outcome, gold = 0 } = {}) {
        if (!this.sound || typeof this.sound.play !== 'function') {
            return;
        }

        if (outcome === 'cashout' && gold > 0) {
            this.sound.play('towerOfTenWin', { volume: 0.9 });
        } else if (outcome === 'bust') {
            this.sound.play('towerOfTenBust', { volume: 0.9 });
        }
    }

    handleInfirmaryChoice(selection) {
        let message = '';
        let color = '#2ecc71';

        if (selection === 'half') {
            const missing = this.playerMaxHealth - this.playerHealth;
            const healAmount = Math.ceil(missing / 2);
            const healed = this.healPlayer(healAmount);
            message = healed > 0 ? `Recovered ${healed} HP` : 'Already at full health';
        } else if (selection === 'max') {
            const increased = this.increasePlayerMaxHealthByPercent(0.1, { heal: false });
            if (increased > 0) {
                message = `Max HP +${increased}`;
            } else {
                message = 'Max HP unchanged';
            }
        } else if (selection === 'full') {
            const missing = this.playerMaxHealth - this.playerHealth;
            if (missing <= 0) {
                message = 'Already at full health';
            } else {
                const cost = missing * 2; // Heal Full cost
                if (cost > 0 && this.canAfford(cost)) {
                    const spent = this.spendGold(cost);
                    if (spent > 0) {
                        this.healPlayer(missing);
                        message = `Fully restored! (-${spent}g)`;
                        color = '#f1c40f';
                    }
                } else {
                    message = 'Not enough gold';
                    color = '#e74c3c';
                }
            }
        }

        this.destroyFacilityUI();

        if (message) {
            this.showNodeMessage(message, color);
        }

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    handleTowerOfTenResult({ gold = 0, penalty = 0, total = 0, outcome = 'leave' } = {}) {
        this.destroyFacilityUI();

        this.playTowerOfTenExitSound({ outcome, gold });

        if (gold > 0) {
            this.addGold(gold);
        }

        if (penalty > 0) {
            this.spendGold(penalty);
        }

        let message = '';
        let color = '#5dade2';

        if (outcome === 'cashout' && gold > 0) {
            message = `Tower of Ten: Total ${total} → +${gold} gold`;
            color = '#f7c873';
        } else if (outcome === 'cashout') {
            message = `Tower of Ten: Total ${total} (0 gold)`;
        } else if (outcome === 'bust') {
            message = penalty > 0
                ? `Tower of Ten: Bust with ${total} (-${penalty} gold)`
                : `Tower of Ten: Bust with ${total}`;
            color = '#e74c3c';
        } else {
            message = 'Tower of Ten: You walk away.';
        }

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }

        if (message) {
            this.showNodeMessage(message, color);
        }

        this.enterMapState();
    }

    completeFacilityNode() {
        this.destroyFacilityUI();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }

        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }

        this.enterMapState();
    }

    destroyFacilityUI() {
        this.closeBackpack();
        if (this.activeFacilityUI && typeof this.activeFacilityUI.destroy === 'function') {
            this.activeFacilityUI.destroy();
        }
        this.activeFacilityUI = null;
    }

    enterMapState() {
        this.pendingPostCombatTransition = false;
        this.input.enabled = true;
        let hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;

        this.destroyFacilityUI();

        this.inCombat = false;
        this.updateRollButtonState();
        this.updateMapTitleText();
        this.updateEnemyBurnUI();

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false, { disabledAlpha: 0.3 });
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false, { disabledAlpha: 0.3 });
        }

        if (!hasPendingNodes) {
            const advanced = this.advanceToNextMapIfAvailable();
            if (advanced) {
                hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;
            }
        }

        if (!hasPendingNodes) {
            if (this.pathUI) {
                this.pathUI.hide();
            }
            this.setMapMode(false);
            this.handleAllEnemiesDefeated();
            return;
        }

        this.setMapMode(true);

        if (this.pathUI) {
            this.pathUI.show();
            this.pathUI.updateState();
        }
    }

    healPlayer(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        const newHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        const healed = newHealth - this.playerHealth;
        if (healed > 0) {
            this.playerHealth = newHealth;
            this.updateHealthUI();
        }
        return healed;
    }

    increasePlayerMaxHealth(amount, { heal = true } = {}) {
        if (!amount || amount <= 0) {
            return 0;
        }

        this.playerMaxHealth += amount;
        if (heal) {
            this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        } else {
            this.playerHealth = Math.min(this.playerHealth, this.playerMaxHealth);
        }
        this.updateHealthUI();
        return amount;
    }

    decreasePlayerMaxHealth(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        const targetMax = Math.max(1, this.playerMaxHealth - amount);
        const reduced = this.playerMaxHealth - targetMax;
        if (reduced <= 0) {
            return 0;
        }

        this.playerMaxHealth = targetMax;
        if (this.playerHealth > this.playerMaxHealth) {
            this.playerHealth = this.playerMaxHealth;
        }
        this.updateHealthUI();
        return reduced;
    }

    increasePlayerMaxHealthByPercent(percent, { heal = false } = {}) {
        if (!percent || typeof percent !== 'number') {
            return 0;
        }

        const increase = Math.max(1, Math.round(this.playerMaxHealth * percent));
        this.increasePlayerMaxHealth(increase, { heal });
        return increase;
    }

    addGold(amount) {
        if (!amount || amount === 0) {
            return 0;
        }

        this.playerGold += amount;
        this.updateGoldUI();
        return amount;
    }

    spendGold(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        if (this.playerGold < amount) {
            return 0;
        }

        this.playerGold -= amount;
        this.updateGoldUI();
        return amount;
    }

    canAfford(amount) {
        return typeof amount === 'number' && amount > 0 && this.playerGold >= amount;
    }

    updateGoldUI() {
        if (!this.goldText) {
            return;
        }

        this.goldText.setText(`Gold: ${this.playerGold}`);
    }

    attemptPurchaseRelic(relicId) {
        const relic = this.relicCatalog.find(item => item.id === relicId);
        if (!relic || this.ownedRelicIds.has(relic.id)) {
            return false;
        }

        if (!this.canAfford(relic.cost)) {
            return false;
        }

        const spent = this.spendGold(relic.cost);
        if (spent <= 0) {
            return false;
        }

        this.ownedRelicIds.add(relic.id);
        this.relics.push(relic);
        if (typeof relic.apply === 'function') {
            relic.apply(this);
        }
        this.relicUI.updateDisplay();
        this.relicUI.showRelicDetails(relic);
        return relic;
    }

    showNodeMessage(message, color = '#ffffff') {
        if (!message) {
            return;
        }

        if (this.nodeMessageTween) {
            this.nodeMessageTween.stop();
            this.tweens.remove(this.nodeMessageTween);
            this.nodeMessageTween = null;
        }

        if (this.nodeMessage) {
            this.nodeMessage.destroy();
            this.nodeMessage = null;
        }

        this.nodeMessage = this.add.text(this.scale.width / 2, 110, message, {
            fontSize: '26px',
            color,
            fontStyle: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(30);

        this.nodeMessageTween = this.tweens.add({
            targets: this.nodeMessage,
            alpha: 0,
            duration: 1000,
            delay: 1200,
            onComplete: () => {
                if (this.nodeMessage) {
                    this.nodeMessage.destroy();
                    this.nodeMessage = null;
                }
                this.nodeMessageTween = null;
            }
        });
    }

    handleEnemyDefeat() {
        if (!this.enemyManager) {
            return;
        }

        const defeatedNodeId = this.currentPathNodeId;
        const defeatedNode = this.pathManager && defeatedNodeId
            ? this.pathManager.getNode(defeatedNodeId)
            : null;

        let totalGoldReward = 0;
        if (defeatedNode && defeatedNode.rewardGold) {
            totalGoldReward += this.addGold(defeatedNode.rewardGold);
        }

        if (this.testingModeEnabled) {
            totalGoldReward += this.addGold(900);
        }

        if (totalGoldReward > 0) {
            this.showNodeMessage(`+${totalGoldReward} Gold`, '#f1c40f');
        }

        if (defeatedNode && defeatedNode.isBoss) {
            const missing = this.playerMaxHealth - this.playerHealth;
            if (missing > 0) {
                const healAmount = Math.ceil(missing / 2);
                const healed = this.healPlayer(healAmount);
                if (healed > 0) {
                    this.showNodeMessage(`Recovered ${healed} HP`, '#2ecc71');
                }
            }
        }

        this.resetPlayerBurn();
        this.resetEnemyBurn();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }

        this.currentPathNodeId = null;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        this.enemyManager.clearCurrentEnemy();
        this.prepareNextEnemyMove();
        this.presentCustomDieReward();
    }

    handleAllEnemiesDefeated() {
        this.upcomingEnemyMove = null;

        this.resetPlayerBurn();
        this.resetEnemyBurn();

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            this.enemyHealthBar.nameText.setText('All Enemies Defeated');
        }

        if (this.enemyIntentText) {
            this.enemyIntentText.setText('All enemies defeated');
        }
        this.updateEnemyStatusText();

        this.updateEnemyHealthUI();

        if (this.pathUI) {
            this.pathUI.hide();
        }
    }

    applyStartOfTurnEffects() {
        if (this.playerBurnReductionPerTurn > 0) {
            this.reducePlayerBurn(this.playerBurnReductionPerTurn);
        }
    }

    resetGameState({ destroyDice = true } = {}) {
        this.clearAllWeakenedDice();
        this.clearAllNullifiedDice();
        if (destroyDice) {
            this.getDiceInPlay().forEach(d => d.destroy());
            this.temporarilyDestroyedDice = [];
        }
        this.activeTimeBombResolveBonus = 0;
        this.dice = [];
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(CONSTANTS.DICE_PER_SET).fill(null);
        this.attackSlots = Array(CONSTANTS.DICE_PER_SET).fill(null);

        this.playerBlockValue = 0;
        this.rerollDefenseBonus = 0;

        this.applyStartOfTurnEffects();

        const baseRolls = CONSTANTS.DEFAULT_MAX_ROLLS;
        let startingRolls = baseRolls;

        if (this.isFirstCombatTurn && this.prepperFirstTurnBonusRolls > 0) {
            startingRolls += this.prepperFirstTurnBonusRolls;
        }

        if (this.rollCarryoverEnabled && this.prepperCarryoverRolls > 0) {
            startingRolls += Math.max(0, Math.floor(this.prepperCarryoverRolls));
        }

        this.prepperCarryoverRolls = 0;
        this.isFirstCombatTurn = false;

        this.rollsRemaining = Math.max(0, Math.floor(startingRolls));
        this.rollsRemainingAtTurnStart = this.rollsRemaining;
        if (this.rollsRemainingText) {
            this.rollsRemainingText.setText(`${this.rollsRemaining}`);
        }

        // Enable roll button, disable sort button
        setTextButtonEnabled(this.rollButton, true);
        setTextButtonEnabled(this.sortButton, false);
        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, true);
        }

        this.lockedDice.clear();
        this.updateZonePreviewText();
    }

    updateMapSkipButtonState() {
        if (!this.mapSkipButton) {
            return;
        }

        const hasNextMap = this.hasNextMap();
        const shouldShow = this.testingModeEnabled && this.isMapViewActive && hasNextMap;

        this.mapSkipButton.setVisible(shouldShow);
        setTextButtonEnabled(this.mapSkipButton, shouldShow);

        if (typeof this.layoutHeaderButtons === 'function') {
            this.layoutHeaderButtons();
        }
    }

    setMapMode(isMapView) {
        this.isMapViewActive = !!isMapView;
        const showCombatUI = !isMapView;
        const setVisibility = (obj, visible) => {
            if (obj && typeof obj.setVisible === 'function') {
                obj.setVisible(visible);
            }
        };

        const applyToArray = (arr, visible) => {
            if (!arr || typeof arr.forEach !== 'function') {
                return;
            }
            arr.forEach(item => setVisibility(item, visible));
        };

        setVisibility(this.rollButton, showCombatUI);
        if (this.rollButton) {
            if (showCombatUI) {
                this.updateRollButtonState();
            } else {
                setTextButtonEnabled(this.rollButton, false);
            }
        }

        setVisibility(this.sortButton, showCombatUI);
        if (this.sortButton && !showCombatUI) {
            setTextButtonEnabled(this.sortButton, false);
        }

        setVisibility(this.resolveButton, showCombatUI);
        if (this.resolveButton && !showCombatUI) {
            setTextButtonEnabled(this.resolveButton, false);
        }

        setVisibility(this.rollsRemainingText, showCombatUI);

        if (this.menuButton) {
            setVisibility(this.menuButton, true);
        }

        if (this.settingsButton) {
            setVisibility(this.settingsButton, true);
        }

        if (this.menuPanel) {
            this.menuPanel.setVisible(this.isMenuOpen);
        }

        setVisibility(this.playerBurnText, showCombatUI && this.playerBurn > 0 && this.inCombat);
        const enemyBurnActive = this.enemyManager && typeof this.enemyManager.getEnemyBurn === 'function'
            ? this.enemyManager.getEnemyBurn() > 0
            : false;
        setVisibility(this.enemyBurnText, showCombatUI && this.inCombat && enemyBurnActive);

        applyToArray(this.zoneVisuals, showCombatUI);

        if (this.defendHighlight) {
            this.defendHighlight.setVisible(false);
        }
        if (this.attackHighlight) {
            this.attackHighlight.setVisible(false);
        }

        if (this.relicUI) {
            this.relicUI.setVisible(showCombatUI);
        }
        setVisibility(this.defendPreviewText, showCombatUI);
        setVisibility(this.attackPreviewText, showCombatUI);
        setVisibility(this.defendComboText, showCombatUI);
        setVisibility(this.attackComboText, showCombatUI);

        if (this.mapTitleText) {
            const hasText = this.mapTitleText.text && this.mapTitleText.text.length > 0;
            this.mapTitleText.setVisible(isMapView && hasText);
        }

        if (this.enemyHealthBar) {
            const elements = ['barBg', 'barFill', 'text', 'nameText', 'intentText', 'statusText', 'burnText'];
            elements.forEach(key => {
                const element = this.enemyHealthBar[key];
                if (element) {
                    setVisibility(element, showCombatUI);
                }
            });
        }

        this.updateMapSkipButtonState();
    }
    
    updateRollButtonState() {
        if (!this.rollButton) {
            return;
        }

        if (!this.inCombat || this.isGameOver) {
            setTextButtonEnabled(this.rollButton, false);
            return;
        }

        // If no rolls left -> disabled
        if (this.rollsRemaining === 0) {
            setTextButtonEnabled(this.rollButton, false);
            return;
        }

        // First roll (before any rolls used) -> always enabled
        if (this.rollsRemaining === this.rollsRemainingAtTurnStart) {
            setTextButtonEnabled(this.rollButton, true);
            return;
        }

        // Otherwise: enable only if at least one die is selected
        const anySelected = this.getDiceInPlay().some(d => d.selected);
        setTextButtonEnabled(this.rollButton, anySelected);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.sound.mute = this.isMuted;
        this.updateMuteButtonState();
    }

    updateMuteButtonState() {
        if (!this.muteButton) {
            return;
        }

        const statusText = this.isMuted ? 'Sound: Off 🔇' : 'Sound: On 🔊';
        this.muteButton.setText(statusText);
    }

    toggleTestingMode() {
        this.testingModeEnabled = !this.testingModeEnabled;
        this.updateTestingModeButtonState();

        if (this.testingModeEnabled) {
            this.applyTestingModeStartingResources();
        }

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        if (enemy) {
            if (this.testingModeEnabled) {
                this.applyTestingModeToEnemy(enemy);
            } else {
                this.restoreEnemyBaseStats(enemy);
            }
            this.updateEnemyHealthUI();
        }

        this.updateMapSkipButtonState();
    }

    updateTestingModeButtonState() {
        if (!this.testingModeButton) {
            return;
        }

        const statusText = this.testingModeEnabled ? 'Testing Mode: On' : 'Testing Mode: Off';
        this.testingModeButton.setText(statusText);
    }

    applyTestingModeToEnemy(enemy) {
        if (!enemy) {
            return;
        }

        const baseMax = typeof enemy.baseMaxHealth === 'number' && enemy.baseMaxHealth > 0
            ? enemy.baseMaxHealth
            : enemy.maxHealth;

        if (!enemy._testingModeApplied) {
            enemy._testingModePreviousHealth = Math.min(enemy.health, baseMax);
        }

        enemy.baseMaxHealth = baseMax;
        enemy.maxHealth = 1;
        enemy.health = Math.min(enemy.health, 1);
        enemy._testingModeApplied = true;
    }

    restoreEnemyBaseStats(enemy) {
        if (!enemy) {
            return;
        }

        const baseMax = typeof enemy.baseMaxHealth === 'number' && enemy.baseMaxHealth > 0
            ? enemy.baseMaxHealth
            : enemy.maxHealth;

        enemy.maxHealth = baseMax;

        if (enemy._testingModeApplied) {
            const previousHealth = typeof enemy._testingModePreviousHealth === 'number'
                ? enemy._testingModePreviousHealth
                : enemy.health;
            const clampedHealth = Math.max(0, Math.min(previousHealth, enemy.maxHealth));
            enemy.health = clampedHealth;
        } else if (this.testingModeEnabled) {
            enemy.health = Math.min(enemy.health, enemy.maxHealth);
        } else {
            enemy.health = enemy.maxHealth;
        }

        enemy._testingModeApplied = false;
        enemy._testingModePreviousHealth = null;
    }

    triggerGameOver() {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;

        if (this.rollButton) {
            setTextButtonEnabled(this.rollButton, false);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false);
        }

        this.getDiceInPlay().forEach(die => die.disableInteractive());

        if (this.gameOverManager) {
            this.gameOverManager.show(() => this.restartGame());
        }
    }

    restartGame() {
        if (this.gameOverManager) {
            this.gameOverManager.hide();
        }

        this.scene.restart({
            isMuted: this.isMuted,
            testingModeEnabled: this.testingModeEnabled
        });
    }
}
