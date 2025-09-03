// --- GAME CONFIGURATION ---
const GAME_CONFIG = {
    BOARD_ROWS: 10,
    BOARD_COLS: 10,
    TILE_COUNT: 100, // BOARD_ROWS * BOARD_COLS
    DICE_SIDES: 6
};
// Game Mode configuration (Normal / Spicy)
const GAME_MODES = {
    normal: {
        flyingSquadProb: 0.12,
        malpracticePenalty: -2.5,
        bigSnakeProb: 0.001
    },
    spicy: {
        flyingSquadProb: 0.25,
        malpracticePenalty: -4.0,
        bigSnakeProb: 0.005
    }
};
const PROBABILITIES = {
    CHANCE_TILE_COUNT: 17, // count of chance tiles (logic-defined)
    REL_PROB: 0.22, // probability to enter relationship on eligible tiles (non-chance, non-sem-end)
    CHIT_PROB: 0.15, // probability to find a chit on any non-chance tile
    INTERNSHIP_PROB: 0.3 // random chance to secure internship when eligible (>=63, GPA>=8.5, not already having one)
};

const SPECIAL_TILES = {
    GPA_BOOST_TILES: [25, 50, 75, 100], // apply +0.5 silently on landing
    semesterEndTiles: [13, 25, 38, 50, 63, 75, 88, 100],
    placementTiles: [40, 60, 80, 100],
    playerColors: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7']
};
// Generate serpentine coordinates for a 7x8 path (rows x cols)
const pathCoords = (() => {
    const coords = [];
    for (let r = 0; r < GAME_CONFIG.BOARD_ROWS; r++) {
        if (r % 2 === 0) {
            for (let c = 0; c < GAME_CONFIG.BOARD_COLS; c++) coords.push([r, c]);
        } else {
            for (let c = GAME_CONFIG.BOARD_COLS - 1; c >= 0; c--) coords.push([r, c]);
        }
    }
    return coords;
})();
// References are now in SPECIAL_TILES object above
// 30+ arcade-styled (16-bit vibe) emoji set
const emojiList = [
    { emoji: '🧑‍💻', keywords: ['coder', 'dev', 'tech', 'hacker', 'arcade'] },
    { emoji: '🤖', keywords: ['robot', 'bot', 'android', 'pixel'] },
    { emoji: '👾', keywords: ['alien', 'invader', 'space', 'retro'] },
    { emoji: '🕹️', keywords: ['joystick', 'game', 'arcade', 'retro'] },
    { emoji: '🎮', keywords: ['controller', 'game', 'console'] },
    { emoji: '🧟', keywords: ['zombie', 'undead', 'monster'] },
    { emoji: '🧙', keywords: ['wizard', 'mage', 'magic'] },
    { emoji: '🦸', keywords: ['superhero', 'hero', 'power'] },
    { emoji: '🐉', keywords: ['dragon', 'boss', 'fantasy'] },
    { emoji: '👨‍🚀', keywords: ['astronaut', 'space', 'explorer'] },
    { emoji: '🛰️', keywords: ['satellite', 'space'] },
    { emoji: '🚀', keywords: ['rocket', 'launch', 'space'] },
    { emoji: '🪙', keywords: ['coin', 'gold', 'collect', 'mario'] },
    { emoji: '💾', keywords: ['disk', 'save', 'retro'] },
    { emoji: '🧨', keywords: ['dynamite', 'boom', 'explosion'] },
    { emoji: '💣', keywords: ['bomb', 'boom', 'mine'] },
    { emoji: '🛡️', keywords: ['shield', 'defense', 'guard'] },
    { emoji: '⚔️', keywords: ['sword', 'attack', 'blade'] },
    { emoji: '🏆', keywords: ['trophy', 'win', 'victory'] },
    { emoji: '💎', keywords: ['gem', 'crystal', 'loot'] },
    { emoji: '👑', keywords: ['crown', 'king', 'queen'] },
    { emoji: '🧩', keywords: ['puzzle', 'piece', 'brain'] },
    { emoji: '🧪', keywords: ['potion', 'lab', 'chemistry'] },
    { emoji: '🛸', keywords: ['ufo', 'alien', 'space'] },
    { emoji: '🦾', keywords: ['cyber', 'arm', 'mech'] },
    { emoji: '🔮', keywords: ['crystal ball', 'magic', 'future'] },
    { emoji: '🧯', keywords: ['extinguisher', 'fire', 'safety'] },
    { emoji: '🔥', keywords: ['fire', 'flames', 'hot', 'spicy'] },
    { emoji: '🌶️', keywords: ['chilli', 'spicy', 'hot'] },
    { emoji: '👹', keywords: ['ogre', 'demon', 'monster'] },
    { emoji: '🐱‍👤', keywords: ['ninja', 'cat', 'stealth'] },
    { emoji: '🧑‍🎨', keywords: ['artist', 'paint', 'creative'] },
    { emoji: '🧑‍🔬', keywords: ['scientist', 'lab'] },
    { emoji: '🎯', keywords: ['target', 'bullseye', 'focus'] },
    { emoji: '🧠', keywords: ['brain', 'smart', 'think'] },
];




class Player {
    constructor({ id, name, color, icon, type }) {
        this.id = id;
        this.name = name;
        this.position = 1;
        this.gpa = 10.0;
        this.pawnId = `player${id}-pawn`;
        this.color = color;
        this.icon = icon;
        this.type = type || "hosteler"; // "dayScholar" or "hosteler"
        this.hearts = 0; // number of relationship hearts
        this.inRelationship = false; // activated only when player enters one
        this.skipTurns = 0; // turns to skip due to events
        this.chits = 0; // malpractice chits carried within a semester

        this.internshipState = { hasInternship: false, ppoCountdown: 0 };
        this.hasPPO = false;
        this.__ppoFinishTurns = 0;
    }
}

let players = [];
let currentPlayerIndex = 0;
let gameActive = true;
let spicyMode = false;
let chanceTiles = [];

// Timer management for cleanup
let activeTimers = new Set();

function clearAllTimers() {
    activeTimers.forEach(timerId => {
        clearTimeout(timerId);
        clearInterval(timerId);
    });
    activeTimers.clear();
}

function addTimer(timerId) {
    activeTimers.add(timerId);
}

function removeTimer(timerId) {
    activeTimers.delete(timerId);
}

// --- EVENT DEFINITIONS with EMOJIS ---
// v2 Event System
const generalEvents = {
    common: [
        { title: 'Club Drama!', desc: 'Too much drama in your club activities.', gpa: { normal: -0.3, spicy: -0.45 }, emoji: '🎭' },
        { title: 'Club Success!', desc: 'Your club project was a hit!', gpa: { normal: 0.3, spicy: 0.15 }, emoji: '🏆' },
        { title: 'Bunked Lectures!', desc: 'You missed important lectures.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '😴' },
        { title: 'Last Minute Assignment!', desc: 'You pulled an all-nighter for an assignment.', effect: { type: 'diceBased', even: { gpa: { normal: 0.2, spicy: 0.1 } }, odd: { gpa: { normal: -0.2, spicy: -0.3 } } }, emoji: '📝' },
        { title: 'Called by Proctor!', desc: 'You have to meet the proctor.', skipTurns: 1, emoji: '👨‍🏫' },
        { title: "Friend's Breakup!", desc: "Your friend's breakup is affecting you.", gpa: { normal: -0.2, spicy: -0.3 }, emoji: '💔' },
        { title: 'Lift Not Working!', desc: 'You have to take the stairs.', skipTurns: 1, emoji: '🛗' },
        { title: 'ID Confiscated!', desc: "You can't enter the campus without ID.", skipTurns: 1, emoji: '🆔' },
        { title: 'Vibrance Festival!', desc: 'You are busy with the Vibrance festival.', skipTurns: 1, emoji: '🎉' },
        { title: 'TechnoVIT Event!', desc: 'You are participating in TechnoVIT.', skipTurns: 1, emoji: '🤖' }
    ],
    dayScholar: [
        { title: 'Slept in MTC Bus!', desc: 'You overslept and missed your class.', skipTurns: 1, emoji: '🚌' },
        { title: 'Powercut!', desc: 'Power outage at home, couldn\'t study.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '💡' },
        { title: 'Mom\'s Special Meal!', desc: 'Ate a delicious meal, feeling energized.', gpa: { normal: 0.2, spicy: 0.1 }, emoji: '🍲' },
        { title: 'Forgot ID!', desc: 'Couldn\'t enter the campus, missed classes.', gpa: { normal: -0.2, spicy: -0.3 }, skipTurns: 1, emoji: '🆔' },
        { title: 'Faked Sick Day!', desc: 'Took a day off, outcome depends on luck.', effect: { type: 'diceBased', even: { gpa: { normal: 0.2, spicy: 0.1 } }, odd: { gpa: { normal: -0.2, spicy: -0.3 } } }, emoji: '🤒' },
        { title: 'Traffic Jam!', desc: 'Stuck in traffic, can\'t make it to class.', skipTurns: 1, emoji: '🚗' },
        { title: 'Family Function!', desc: 'Had to attend a family function, missed study time.', gpa: { normal: -0.3, spicy: -0.45 }, emoji: '👨‍👩‍👧‍👦' },
        { title: 'Late Night Out at ECR!', desc: 'Partied late, too tired for class.', skipTurns: 1, emoji: '🌃' },
        { title: 'Late Night Out before CAT!', desc: 'Partied before the CAT exam, performed poorly.', gpa: { normal: -0.4, spicy: -0.6 }, emoji: '📉' },
        { title: 'Chennai Flood!', desc: 'Flooding in Chennai, can\'t go to college.', skipTurns: 2, emoji: '🌊' },
        { title: 'Rash Driving!', desc: 'Got into an accident, need to recover.', gpa: { normal: -0.3, spicy: -0.45 }, skipTurns: 1, emoji: '🏍️' }
    ],
    hosteler: [
        { title: 'Mess Food Sick!', desc: 'Ate something bad, feeling sick.', skipTurns: 1, emoji: '🤢' },
        { title: 'Laundry Crisis!', desc: 'No clean clothes, can\'t go to class.', skipTurns: 1, emoji: '👕' },
        { title: 'Hostel Raid!', desc: 'Caught with a kettle during raid.', gpa: { normal: -0.3, spicy: -0.45 }, emoji: '🚨' },
        { title: 'Hostel Monkey Chase!', desc: 'Chased by monkeys, missed class.', skipTurns: 1, emoji: '🐒' },
        { title: 'Roommate Drama!', desc: 'Arguments with roommate affecting studies.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '😡' },
        { title: 'Hostel Birthday!', desc: 'Celebrated a birthday, boosted morale.', gpa: { normal: 0.2, spicy: 0.1 }, emoji: '🎂' },
        { title: 'Gossip Sesh!', desc: 'Spent time gossiping instead of studying.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '🗣️' },
        { title: 'Group Study!', desc: 'Productive group study session.', gpa: { normal: 0.3, spicy: 0.15 }, emoji: '📚' },
        { title: 'Dengue!', desc: 'Contracted dengue, need medical attention.', gpa: { normal: -0.4, spicy: -0.6 }, emoji: '🦟' },
        { title: 'ReFAT!', desc: 'Had to take a ReFAT exam.', effect: { type: 'diceBased', even: { gpa: { normal: -0.3, spicy: -0.45 } }, odd: { gpa: { normal: 0.3, spicy: 0.15 } } }, emoji: '📝' },
        { title: 'Club Marketing!', desc: 'Spent time on club promotions, less time for studies.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '📢' },
        { title: 'VC with Parents!', desc: 'Video call with parents, motivated to study.', gpa: { normal: 0.2, spicy: 0.1 }, emoji: '📞' },
        { title: 'VC with Partner!', desc: 'Spent too much time on call, neglected studies.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '💑' },
        { title: 'Watched Movie!', desc: 'Watched a movie instead of studying.', gpa: { normal: -0.2, spicy: -0.3 }, emoji: '🎬' },
        { title: 'Hostel Outing!', desc: 'Went out with hostel mates.', effect: { type: 'diceBased', even: { skipTurns: 1 }, odd: {} }, emoji: '🚶‍♂️' }
    ]
};

const relationshipEvents = [
    {
        title: 'Relationship Fight!',
        desc: 'Had a fight with your partner before an exam.',
        emoji: '💥',
        choices: [
            { label: 'Fix fight', gpa: { normal: -1.0, spicy: -1.5 }, hearts: 1 },
            { label: 'Focus on exam', gpa: { normal: 1.0, spicy: 0.5 }, hearts: -1 }
        ]
    },
    {
        title: 'Partner Motivates You',
        desc: 'Study or scroll?',
        emoji: '🌟',
        choices: [
            { label: 'Study Alone', gpa: { normal: 1.0, spicy: 0.5 }, hearts: -1 },
            { label: 'Watch reels with hiim/her', gpa: { normal: -1.0, spicy: -1.5 }, hearts: 1 }
        ]
    },
    {
        title: 'Date',
        desc: 'Going out of campus with your partner!',
        emoji: '🌹',
        choices: [
            { label: 'Go for date', skipTurns: 1, hearts: 1 },
            { label: 'Decline', hearts: -1 }
        ]
    },
    {
        title: 'Anniversary Plan',
        desc: 'Remembered?',
        emoji: '💞',
        choices: [
            { label: 'Plan something special', gpa: { normal: -0.5, spicy: -0.75 }, hearts: 2 },
            { label: 'Forget', hearts: -2 }
        ]
    }
];

// --- DOM ELEMENTS ---
const DOM = {
    setup: {
        playerCountSelect: document.getElementById('player-count'),
        playerInputsContainer: document.getElementById('player-inputs'),
        setupForm: document.getElementById('setup-form'),
        playerSetup: document.getElementById('player-setup')
    },
    game: {
        gameArea: document.getElementById('game-area'),
        board: document.getElementById('game-board'),
        rollDiceBtn: document.getElementById('roll-dice-btn'),
        turnIndicator: document.getElementById('turn-indicator'),
        playerInfoCardsContainer: document.getElementById('player-info-cards')
    },
    modal: {
        backdrop: document.getElementById('modal-backdrop'),
        content: document.getElementById('modal-content'),
        emoji: document.getElementById('modal-emoji'),
        title: document.getElementById('modal-title'),
        description: document.getElementById('modal-description'),
        gpaChange: document.getElementById('modal-gpa-change'),
        button: document.getElementById('modal-button')
    },
    ui: {
        spicyModeBtn: document.getElementById('spicy-mode-btn'),
        howToPlayBtn: document.getElementById('how-to-play-btn'),
        howToPlayModal: document.getElementById('how-to-play-modal'),
        closeHowToPlayModalBtn: document.getElementById('close-how-to-play-modal')
    }
};

// DOM elements initialized above
// Additional validation to ensure modal elements exist
function validateModalElements() {
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.warn('Some modal elements were not found during initialization. This may cause errors later.');
        console.log('Modal elements status:', {
            emoji: !!DOM.modal.emoji,
            title: !!DOM.modal.title,
            description: !!DOM.modal.description,
            gpaChange: !!DOM.modal.gpaChange,
            button: !!DOM.modal.button
        });
        return false;
    }
    return true;
}

// Helper function to safely access modal-event-emoji element
function getModalEventEmoji() {
    let element = document.getElementById('modal-event-emoji');

    // If not found, try to wait a bit for DOM to be ready
    if (!element) {
        // Check if modal content exists but element isn't found yet
        const modalContent = document.getElementById('modal-content');
        if (modalContent) {
            element = modalContent.querySelector('#modal-event-emoji');
        }

        // If still not found, create a fallback (only log once to avoid spam)
        if (!element) {
            if (!window.modalEmojiWarningShown) {
                console.warn('modal-event-emoji element not found - creating fallback');
                window.modalEmojiWarningShown = true;
            }
            // Create a proper DOM element as fallback
            const fallbackElement = document.createElement('span');
            fallbackElement.id = 'modal-event-emoji-fallback';
            fallbackElement.textContent = '';
            fallbackElement.style.display = 'none';

            // Try to append it to modal content if available
            if (modalContent) {
                modalContent.appendChild(fallbackElement);
            }
            return fallbackElement;
        }
    }

    return element;
}

// Check modal elements after a short delay to ensure DOM is fully loaded
setTimeout(validateModalElements, 100);

// --- ICONS ---
const hostelerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><path d="M2 8v11"/><path d="M2 19h12"/><path d="M14 4v15"/><path d="M20 4v15"/><path d="M2 11h20"/><path d="M2 4h20"/></svg>`;
const dayScholarIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full"><circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M12 6V5a2 2 0 0 0-2-2H7.8a2 2 0 0 0-1.8 1.2L5 6h14Z"/><path d="M5 15h.5a2 2 0 0 0 2-2V9h8v4a2 2 0 0 0 2 2h.5"/></svg>`;


// --- SETUP LOGIC ---
DOM.ui.spicyModeBtn.addEventListener('click', () => {
    spicyMode = !spicyMode;
    DOM.ui.spicyModeBtn.textContent = `Spicy Mode: ${spicyMode ? 'ON' : 'OFF'}`;
    DOM.ui.spicyModeBtn.classList.toggle('bg-red-700', spicyMode);
    DOM.ui.spicyModeBtn.classList.toggle('border-red-900', spicyMode);
    DOM.ui.spicyModeBtn.classList.toggle('bg-gray-700', !spicyMode);
    DOM.ui.spicyModeBtn.classList.toggle('border-gray-900', !spicyMode);
    document.body.classList.toggle('spicy-mode', spicyMode);
});

DOM.ui.howToPlayBtn.addEventListener('click', () => {
    DOM.ui.howToPlayModal.classList.remove('hidden');
    setTimeout(() => {
        DOM.ui.howToPlayModal.querySelector('div').classList.remove('scale-95', 'opacity-0');
    }, 10);
});

DOM.ui.closeHowToPlayModalBtn.addEventListener('click', () => {
    DOM.ui.howToPlayModal.querySelector('div').classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        DOM.ui.howToPlayModal.classList.add('hidden');
    }, 300);
});

DOM.setup.playerCountSelect.addEventListener('change', (e) => {
    generatePlayerInputs(parseInt(e.target.value));
});

function generatePlayerInputs(count) {
    if (!DOM.setup.playerInputsContainer) {
        console.error('playerInputsContainer not found!');
        return;
    }

    DOM.setup.playerInputsContainer.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const color = SPECIAL_TILES.playerColors[i - 1] || '#ef4444'; // fallback color
        const emoji = emojiList[i - 1] ? emojiList[i - 1].emoji : '👤'; // fallback emoji
        // Check for emoji support and provide text fallback if needed
        const hasEmojiSupport = (() => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.fillText('👤', 0, 10);
            return ctx.getImageData(0, 0, 1, 1).data[3] > 0;
        })();
        const playerInputHTML = `
            <div class="space-y-3 p-4 border rounded-lg bg-slate-900/30" style="border-color: ${color};">
                <h3 class="text-xl font-bold" style="color: ${color};">Player ${i}</h3>
                <input type="text" id="player${i}-name" value="Player ${i}" placeholder="Name" class="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" aria-label="Player ${i} Name">
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="player${i}-emoji-btn" class="w-full text-4xl py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm">
                        ${emoji}
                    </button>
                    <button type="button" id="player${i}-type-btn" class="w-full text-sm arcade-font py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm">
                        Hosteler
                    </button>
                </div>
                <input type="hidden" id="player${i}-emoji" value="${emoji}">
                <input type="hidden" id="player${i}-type" value="hosteler">
            </div>
        `;
        DOM.setup.playerInputsContainer.innerHTML += playerInputHTML;
    }

    for (let i = 1; i <= count; i++) {
        document.getElementById(`player${i}-emoji-btn`).addEventListener('click', () => {
            openEmojiPicker(i);
        });
        const typeBtn = document.getElementById(`player${i}-type-btn`);
        typeBtn.addEventListener('click', () => {
            const hidden = document.getElementById(`player${i}-type`);
            const isHosteler = hidden.value === "hosteler";
            hidden.value = isHosteler ? "dayScholar" : "hosteler";
            typeBtn.textContent = isHosteler ? 'Day Scholar' : 'Hosteler';
        });
    }
}



DOM.setup.setupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    startGame();
});

// --- GAME LOGIC ---
function startGame() {
    // Clear any existing timers from previous games
    clearAllTimers();

    const playerCount = parseInt(DOM.setup.playerCountSelect.value);
    players = [];
    for (let i = 1; i <= playerCount; i++) {
        const nameEl = document.getElementById(`player${i}-name`);
        const emojiEl = document.getElementById(`player${i}-emoji`);
        const typeEl = document.getElementById(`player${i}-type`);

        players.push(new Player({
            id: i,
            name: nameEl ? nameEl.value : `Player ${i}`,
            color: SPECIAL_TILES.playerColors[i - 1] || '#ef4444',
            icon: emojiEl ? emojiEl.value : '👤',
            type: typeEl ? typeEl.value : "hosteler"
        }));
    }

    currentPlayerIndex = 0;
    gameActive = true;

    DOM.setup.playerSetup.classList.add('hidden');
    DOM.game.gameArea.classList.remove('hidden');
    // Back button appears once game starts
    ensureBackButton();

    // Pick random chance tiles spread roughly evenly across the board
    const indices = Array.from({ length: GAME_CONFIG.TILE_COUNT - 1 }, (_, k) => k + 2);
    const bucketSize = Math.floor((GAME_CONFIG.TILE_COUNT - 1) / PROBABILITIES.CHANCE_TILE_COUNT);
    const chosen = [];
    for (let b = 0; b < PROBABILITIES.CHANCE_TILE_COUNT; b++) {
        const start = b * bucketSize + 2;
        const end = b === PROBABILITIES.CHANCE_TILE_COUNT - 1 ? GAME_CONFIG.TILE_COUNT : start + bucketSize;
        const r = Math.floor(Math.random() * Math.max(1, (end - start)));
        chosen.push(Math.min(GAME_CONFIG.TILE_COUNT, start + r));
    }
    chanceTiles = [...new Set(chosen)].slice(0, PROBABILITIES.CHANCE_TILE_COUNT);

    createBoardAndPawns();
    createPlayerInfoCards();
    updateAllPlayerInfo();
    updateTurnIndicator();
    displayDice(0);
    // initialize round tracking for finish-line tie-break
    roundStartIndex = 0;
    pendingFinishers = [];
    roundFinishing = false;
}

function createBoardAndPawns() {
    let boardHtml = '';
    pathCoords.forEach((coord, i) => {
        const tileNum = i + 1;
        let tileClass = 'tile-year1';
        if (tileNum > 25) tileClass = 'tile-year2';
        if (tileNum > 50) tileClass = 'tile-year3';
        if (tileNum > 75) tileClass = 'tile-year4';
        if (tileNum === 1) tileClass = 'tile-start';

        let specialClasses = '';
        if (SPECIAL_TILES.placementTiles.includes(tileNum)) specialClasses += ' tile-placement';
        if (SPECIAL_TILES.semesterEndTiles.includes(tileNum)) specialClasses += ' tile-semester-end';
        if (chanceTiles.includes(tileNum)) specialClasses += ' tile-chance';

        // Simple flat colors (no gradient) for a clean path look
        const label = SPECIAL_TILES.semesterEndTiles.includes(tileNum) ? 'SEM' : tileNum;
        boardHtml += `<div id="tile-${tileNum}" class="tile ${tileClass} ${specialClasses}" style="grid-row: ${coord[0] + 1}; grid-column: ${coord[1] + 1};">${label}</div>`;
    });
    // Render tiles first so we can measure size for responsive pawn scaling
    DOM.game.board.innerHTML = boardHtml;

    const sampleTile = document.getElementById('tile-1');
    if (!sampleTile) {
        console.error('Sample tile not found for pawn sizing');
        return;
    }
    const tileSize = Math.min(sampleTile.clientWidth, sampleTile.clientHeight);
    const dynamicCap = window.innerWidth < 640 ? 52 : 64;
    const basePawnSize = Math.max(24, Math.min(Math.floor(tileSize * 0.7), dynamicCap));

    let pawnsHtml = '';
    players.forEach(p => {
        pawnsHtml += `<div id="${p.pawnId}" class="player-pawn flex items-center justify-center text-4xl" style="--pawn-size:${basePawnSize}px;">${p.icon}</div>`;
    });
    DOM.game.board.innerHTML = DOM.game.board.innerHTML + pawnsHtml;
    updateAllPawnPositions();
}

function createPlayerInfoCards() {
    DOM.game.playerInfoCardsContainer.innerHTML = '';
    players.forEach(p => {
        const yearInfo = getYearSemester(p.position);
        const yearColor = yearInfo.year <= 1 ? '#6ee7b7' : yearInfo.year === 2 ? '#34d399' : yearInfo.year === 3 ? '#10b981' : '#059669';
        const cardHtml = `
            <div id="player${p.id}-info" class="card-flip bg-slate-800 rounded-lg shadow-md border-2 transition-all min-h-[150px] md:min-h-[180px]" style="border-color: ${p.color};">
                <div class="card-inner">
                    <div class="card-front p-2 md:p-3 flex flex-col gap-1.5 md:gap-2">
                        <div class="flex items-center justify-between">
                            <h3 id="player${p.id}-info-name" class="font-bold text-sm md:text-base truncate" style="color: ${p.color};">${p.name}</h3>
                            <span class="arcade-font text-[9px] md:text-[11px] px-1.5 md:px-2 py-0.5 md:py-1 rounded" style="background:${yearColor}; color:#0f172a;">Y${yearInfo.year} S${yearInfo.semester}</span>
                        </div>
                        <div class="player-card-stack mt-1">
                            <div class="player-card-emoji select-none">${p.icon}</div>
                            <div class="flex items-baseline min-w-0">
                                <span class="text-sm md:text-lg font-bold text-slate-300 mr-2">GPA:</span>
                                <span id="player${p.id}-gpa" class="player-gpa-value font-extrabold text-slate-100 tracking-wide">${p.gpa.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="mt-auto flex justify-center items-end gap-6 md:gap-10 min-h-[22px] md:min-h-[28px] pb-1" id="player${p.id}-meta">
                            <div class="flex items-center gap-1">
                                <span class="text-red-500 meta-emoji">❤️</span>
                                <span id="player${p.id}-hearts-count" class="arcade-font text-slate-200 meta-num">0</span>
                            </div>
                            <div class="flex items-center gap-1">
                                <span class="text-slate-200 meta-emoji">📝</span>
                                <span id="player${p.id}-chits-count" class="arcade-font text-slate-200 meta-num">0</span>
                            </div>
                        </div>
                        <div id="player${p.id}-gpa-change-indicator" class="relative h-4"></div>
                    </div>
                    <div class="card-back p-3 bg-slate-800">
                        <button class="arcade-font bg-rose-600 hover:bg-rose-700 text-white py-3 px-6 rounded-lg border-b-4 border-rose-800" onclick="confirmDropout(${p.id})">Dropout</button>
                    </div>
                </div>
            </div>
        `;
        DOM.game.playerInfoCardsContainer.innerHTML += cardHtml;
    });

    // Attach right-click flip handlers
    players.forEach(p => {
        const card = document.getElementById(`player${p.id}-info`);
        if (!card) return;
        card.addEventListener('contextmenu', (ev) => {
            ev.preventDefault();
            card.classList.toggle('flipped');
        });
    });
}

function handlePlayerTurn() {
    if (!gameActive) return;
    // v2: If player has skip turns, decrement and end turn immediately
    const current = players[currentPlayerIndex];
    if (current && current.skipTurns > 0) {
        current.skipTurns -= 1;
        updatePlayerInfo(current);
        switchPlayer();
        return;
    }
    DOM.game.rollDiceBtn.disabled = true;
    const diceDisplay = document.getElementById('dice-display');
    if (diceDisplay) {
        diceDisplay.innerHTML = '<div class="dice-spin"><span></span><span></span><span></span></div>';
    }

    setTimeout(() => {
        const roll = Math.floor(Math.random() * GAME_CONFIG.DICE_SIDES) + 1;
        displayDice(roll);
        const player = players[currentPlayerIndex];
        const startPos = player.position;
        const remaining = GAME_CONFIG.TILE_COUNT - startPos;
        if (roll > remaining) {
            // Require exact roll to finish; no move this turn
            showInfoOnlyModal('Exact Roll Needed', `You need a ${remaining} to finish!`, '🎲', () => switchPlayer());
            return;
        }
        const endPos = startPos + roll;
        movePawn(player, startPos, endPos);
    }, 500);
}

function displayDice(roll) {
    const diceDisplay = document.getElementById('dice-display');
    if (!diceDisplay) return;
    if (roll === 0) {
        diceDisplay.innerHTML = '';
        return;
    }
    diceDisplay.innerHTML = `<span class="arcade-font text-xs sm:text-sm md:text-lg text-black">${roll}</span>`;
}

function movePawn(player, start, end) {
    if (start >= end) {
        player.position = end;
        processLandedTile(player);
        return;
    }
    let current = start + 1;
    const interval = setInterval(() => {
        player.position = current;
        updatePawnPosition(player);
        // v2.1: Passing over semester-end resets chits immediately
        if (SPECIAL_TILES.semesterEndTiles.includes(current) && current < end) {
            player.chits = 0;
            updatePlayerInfo(player);
        }
        if (current >= end) {
            clearInterval(interval);
            removeTimer(interval);
            processLandedTile(player);
        }
        current++;
    }, 300);
    addTimer(interval);
}

function processLandedTile(player) {
    // Finish-line reached: mark as finisher and continue this round to check tie-breakers
    if (player.position >= GAME_CONFIG.TILE_COUNT && player.gpa > 0) {
        handleFinishLine(player);
        // still allow semester end processing if tile 100 is a semester end tile
    }

    const continueLogic = () => {
        if (SPECIAL_TILES.semesterEndTiles.includes(player.position)) {
            handleSemesterEnd(player, () => {
                endOfTurnProcessing(player);
                switchPlayer();
            });
        } else {
            endOfTurnProcessing(player);
            switchPlayer();
        }
    };

    // a) Chance tile + in relationship → relationship event
    if (chanceTiles.includes(player.position) && player.hearts > 0) {
        const relEvent = relationshipEvents[Math.floor(Math.random() * relationshipEvents.length)];
        showChoiceEventModal(relEvent, player, continueLogic);
        return;
    }

    // c) Big Snake (position >= 63, random by mode)
    if (player.position >= 63) {
        const mode = spicyMode ? 'spicy' : 'normal';
        const prob = GAME_MODES[mode].bigSnakeProb;
        if (Math.random() < prob) {
            // Apply Big Snake
            player.position = 63;
            if (player.gpa > 8.5) player.gpa = 8.5;
            player.internshipState = { hasInternship: false, ppoCountdown: 0 };
            player.hasPPO = false;
            updatePlayerInfo(player);
            updatePawnPosition(player);
            showInfoOnlyModal('Big Snake!', 'Random Academic Violation sends you back to 63. Internship/PPO progress lost.', '🐍', continueLogic);
            return;
        }
    }

    // d) GPA Boost tile → +0.5 silently
    if (SPECIAL_TILES.GPA_BOOST_TILES.includes(player.position)) {
        updateGpa(player, 0.5);
    }

    // e) Offer chit on non-chance tiles (15%)
    if (!chanceTiles.includes(player.position) && Math.random() < PROBABILITIES.CHIT_PROB) {
        showChitPromptModal(player, continueLogic);
        return;
    }

    // f) Flying Squad after tile 10 (mode-based). Affects ALL players; sets their semester flag.
    if (player.position > 10) {
        const mode = spicyMode ? 'spicy' : 'normal';
        if (Math.random() < GAME_MODES[mode].flyingSquadProb) {
            // Flying squad triggered for all players
            // Show search modal
            DOM.modal.emoji.innerHTML = player.icon || '';
            const modalEventEmoji = getModalEventEmoji();
            if (modalEventEmoji && typeof modalEventEmoji.textContent !== 'undefined') {
                modalEventEmoji.textContent = '🔍';
            }
            DOM.modal.title.textContent = 'Flying Squad Triggered';
            DOM.modal.description.innerHTML = 'Search underway...';
            DOM.modal.gpaChange.textContent = '';
            DOM.modal.button.classList.add('hidden');
            const wrapper = document.createElement('div');
            const bar = document.createElement('div');
            bar.className = 'w-full h-2 bg-slate-700 rounded mt-2 overflow-hidden';
            const fill = document.createElement('div');
            fill.className = 'h-full bg-pink-500';
            fill.style.width = '0%';
            bar.appendChild(fill);
            const magnify = document.createElement('div');
            magnify.className = 'magnify-scan';
            magnify.innerHTML = '<span class="glass">🔎</span><span class="text-slate-300 text-sm arcade-font">Scanning</span>';
            wrapper.appendChild(bar);
            wrapper.appendChild(magnify);
            document.getElementById('modal-content').appendChild(wrapper);
            openModal();
            let prog = 0;
            const id = setInterval(() => {
                prog += 10;
                fill.style.width = prog + '%';
                if (prog >= 100) {
                    clearInterval(id);
                    removeTimer(id);
                    const activePlayers = players.filter(p => p.gpa > 0);
                    const caught = [];
                    const penalty = Math.abs(GAME_MODES[mode].malpracticePenalty);
                    players.forEach(pl => {
                        if (pl.gpa > 0 && pl.chits > 0) {
                            updateGpa(pl, -penalty);
                            pl.chits = 0; // ensure chits are reset when caught
                            updatePlayerInfo(pl);
                            caught.push(pl.name);
                        }
                    });
                    // Safely remove wrapper element if it still exists as a child
                    const modalContent = document.getElementById('modal-content');
                    if (modalContent && modalContent.contains(wrapper)) {
                        modalContent.removeChild(wrapper);
                    }
                    if (caught.length > 0) {
                        DOM.modal.emoji.innerHTML = player.icon || '';
                        const modalEventEmojiCaught = getModalEventEmoji();
                        if (modalEventEmojiCaught && typeof modalEventEmojiCaught.textContent !== 'undefined') {
                            modalEventEmojiCaught.textContent = '🚨';
                        }
                        DOM.modal.title.textContent = 'Cheating Caught!';
                        DOM.modal.description.innerHTML = `Caught: <strong>${caught.join(', ')}</strong>`;
                        DOM.modal.gpaChange.textContent = `-${penalty.toFixed(1)} GPA`;
                        caught.forEach(name => { const p = players.find(pl => pl.name === name); if (p) logEvent(p, `Caught by Flying Squad 🚨 (-${penalty.toFixed(1)} GPA)`); });
                        // If all active were caught, VIT wins
                        if (caught.length === activePlayers.length && activePlayers.length > 0) {
                            DOM.modal.emoji.innerHTML = player.icon || '';
                            const modalEventEmojiVit = getModalEventEmoji();
                            if (modalEventEmojiVit && typeof modalEventEmojiVit.textContent !== 'undefined') {
                                modalEventEmojiVit.textContent = '🏛️';
                            }
                            DOM.modal.title.textContent = 'VIT Wins!';
                            DOM.modal.description.textContent = 'All active players were caught with chits. Game over.';
                            gameActive = false;
                            DOM.modal.button.classList.remove('hidden');
                            DOM.modal.button.onclick = () => window.location.reload();
                            openModal();
                            return;
                        }
                    } else {
                        DOM.modal.emoji.innerHTML = player.icon || '';
                        const modalEventEmojiClear = getModalEventEmoji();
                        if (modalEventEmojiClear && typeof modalEventEmojiClear.textContent !== 'undefined') {
                            modalEventEmojiClear.textContent = '✅';
                        }
                        DOM.modal.title.textContent = 'All Clear!';
                        DOM.modal.description.textContent = 'No one was caught with chits this time.';
                        DOM.modal.gpaChange.textContent = '';
                    }
                    DOM.modal.button.classList.remove('hidden');
                    DOM.modal.button.onclick = () => closeModal(continueLogic);
                    openModal();
                }
            }, 300);
            return;
        }
    }

    // g) Enter relationship randomly (non-chance, non-semester) if single
    if (!player.inRelationship && !SPECIAL_TILES.semesterEndTiles.includes(player.position) && !chanceTiles.includes(player.position)) {
        if (Math.random() < PROBABILITIES.REL_PROB) {
            player.inRelationship = true;
            adjustHearts(player, +1);
            showRelationshipStartModal(player, continueLogic);
            return;
        }
    }

    // h) Summer Internship chance (>=63, GPA>=8.5, not already)
    if (player.position >= 63 && player.gpa >= 8.5 && !player.internshipState.hasInternship) {
        if (Math.random() < PROBABILITIES.INTERNSHIP_PROB) {
            player.internshipState.hasInternship = true;
            player.internshipState.ppoCountdown = 4;
            updatePlayerInfo(player);
            showInfoOnlyModal('Internship Secured!', `${player.name} — Summer internship secured. PPO countdown started (4 turns).`, '💼', () => { logEvent(player, 'Internship secured 💼'); continueLogic(); });
            return;
        }
    }

    // i) General event (common + type-specific)
    if (!SPECIAL_TILES.semesterEndTiles.includes(player.position)) {
        const pool = [...generalEvents.common, ...generalEvents[player.type || "hosteler"]];
        // Ensure 'VC with Partner!' only applies to players in relationship
        const filtered = pool.filter(e => !(e.title === 'VC with Partner!' && !player.inRelationship));
        const ev = filtered[Math.floor(Math.random() * filtered.length)];
        applyAndShowGeneralEvent(ev, player, continueLogic);
        return;
    }

    continueLogic();
}

function handleSemesterEnd(player, onDone) {
    const roll = Math.floor(Math.random() * GAME_CONFIG.DICE_SIDES) + 1;
    let gpaBoost = 0;
    if (!spicyMode) {
        if (roll <= 2) gpaBoost = 0.2; else if (roll <= 4) gpaBoost = 0.5; else gpaBoost = 0.8;
    } // spicy mode → 0 boost

    const event = { title: 'Semester Over!', desc: `${player.name} — You survived another semester. You rolled a ${roll}.`, gpa: gpaBoost, emoji: '🥳' };
    // Landing on semester end with chits: convert to GPA, show modal, then continue with semester event
    const carried = player.chits || 0;
    if (carried > 0) {
        const incPerChit = spicyMode ? 0.5 : 1.0;
        const totalInc = carried * incPerChit;
        // Show chit conversion modal first
        showInfoOnlyModal('Cheat Success!', `${player.name} — You cashed in ${carried} chit(s) for GPA +${totalInc.toFixed(1)}.`, '📝', () => {
            updateGpa(player, totalInc);
            player.chits = 0;
            logEvent(player, `Cashed ${carried} chit(s) 📝 (+${totalInc.toFixed(1)} GPA)`);
            // Now show the semester summary event
            showEventModal(event, player, () => {
                player.chits = 0;
                if (onDone) onDone();
            });
        });
    } else {
        // No chits carried, proceed with semester summary only
        showEventModal(event, player, () => {
            player.chits = 0;
            if (onDone) onDone();
        });
    }
}

function updateGpa(player, change) {
    player.gpa = Math.max(0, Math.min(10, player.gpa + change));
    updatePlayerInfo(player);
    // Audio SFX removed - no audio elements in HTML
    // Elimination if GPA hits 0
    if (player.gpa <= 0 && gameActive) {
        // Mark lost visually
        const infoCard = document.getElementById(`player${player.id}-info`);
        if (infoCard) infoCard.classList.add('lost-card');
        const pawn = document.getElementById(player.pawnId);
        if (pawn) pawn.classList.add('pawn-lost');
        // Remove player from turn order
        const activePlayers = players.filter(p => p.gpa > 0);
        if (activePlayers.length >= 2) {
            // Continue with remaining players
            if (players[currentPlayerIndex].id === player.id) switchPlayer();
        } else {
            const last = players.find(p => p.gpa > 0);
            if (last) {
                endGame(last, 'Last player standing!');
            }
        }
    }
}

function dropOut(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player || player.gpa <= 0) return;
    showConfirmationModal('Dropout?', `Are you sure you want to drop out, ${player.name}? This can't be undone.`, '😢', () => {
        player.gpa = 0;
        updateGpa(player, 0); // triggers elimination visuals
    });
}

function confirmDropout(playerId) {
    const card = document.getElementById(`player${playerId}-info`);
    if (card) card.classList.remove('flipped');
    dropOut(playerId);
}

function adjustHearts(player, delta) {
    const prev = player.hearts || 0;
    player.hearts = Math.max(0, prev + delta);
    player.inRelationship = player.hearts > 0; // if zero, allow re-entering later
    updatePlayerInfo(player);
    // Floating +1/-1 heart animation over the hearts counter only
    const container = document.querySelector(`#player${player.id}-meta div span#player${player.id}-hearts-count`);
    if (container && delta !== 0) {
        const bubble = document.createElement('div');
        bubble.className = `indicator-pop font-bold ${delta > 0 ? 'text-red-400' : 'text-red-300'}`;
        bubble.textContent = `${delta > 0 ? '+' : ''}${delta} ${delta > 0 ? '❤️' : '💔'}`;
        const host = document.getElementById(`player${player.id}-info`);
        host.style.position = 'relative';
        bubble.style.position = 'absolute';
        bubble.style.left = '50%';
        bubble.style.top = '10px';
        bubble.style.transform = 'translateX(-50%)';
        host.appendChild(bubble);
        setTimeout(() => bubble.remove(), 700);
    }
}

function showGpaChangeIndicator(player, change) {
    // No on-card GPA animation per request (sound still plays).
}

function showEventModal(event, player, callback) {
    updateGpa(player, event.gpa || 0);

    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showEventModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    DOM.modal.emoji.innerHTML = player ? (player.icon || '') : '';
    modalEventEmoji.textContent = event.emoji || '';
    DOM.modal.title.textContent = `${player ? player.name + ' — ' : ''}${event.title}`;
    DOM.modal.description.textContent = event.desc || '';
    const delta = event.gpa || 0;
    DOM.modal.gpaChange.textContent = delta !== 0 ? `GPA ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}` : '';
    DOM.modal.gpaChange.className = `text-5xl arcade-font mb-8 ${delta >= 0 ? 'text-green-400' : 'text-red-400'}`;
    DOM.modal.button.onclick = () => closeModal(callback);

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

// Internship/PPO end-of-turn processing
function endOfTurnProcessing(player) {
    if (player.internshipState && player.internshipState.hasInternship && player.internshipState.ppoCountdown > 0) {
        player.internshipState.ppoCountdown -= 1;
        if (player.internshipState.ppoCountdown === 0 && player.gpa >= 7.0) {
            player.hasPPO = true;
            updateGpa(player, 1.5);
            // Start PPO finish countdown: 4 of this player's own turns
            player.__ppoFinishTurns = 4;
            logEvent(player, 'PPO secured ✅ (+1.50 GPA)');
        }
        updatePlayerInfo(player);
    }
    // If PPO is active, process violation chance and finish countdown
    if (player.hasPPO) {
        const violationProb = spicyMode ? 0.05 : 0.01;
        if (Math.random() < violationProb) {
            // PPO cancelled
            player.hasPPO = false;
            player.internshipState = { hasInternship: false, ppoCountdown: 0 };
            player.__ppoFinishTurns = 0;
            showInfoOnlyModal('PPO Cancelled!', `${player.name} — Random Academic Violation cancelled your PPO. Keep playing!`, '⚠️', () => { });
            logEvent(player, 'PPO cancelled ⚠️');
        } else {
            if (typeof player.__ppoFinishTurns === 'number' && player.__ppoFinishTurns > 0) {
                player.__ppoFinishTurns -= 1;
                if (player.__ppoFinishTurns === 0) {
                    // Game ends with winner screen
                    logEvent(player, 'PPO tenure completed 🏁');
                    endGame(player, 'PPO secured and tenure completed!');
                }
            }
        }
    }
}

function showConfirmationModal(title, desc, emoji, onConfirm) {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showConfirmationModal');
        return;
    }

    DOM.modal.emoji.innerHTML = emoji || '';
    DOM.modal.title.textContent = title;
    DOM.modal.description.textContent = desc;
    DOM.modal.gpaChange.textContent = '';
    DOM.modal.button.classList.add('hidden');

    const actionContainer = document.createElement('div');
    actionContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-4';

    const yesBtn = document.createElement('button');
    yesBtn.className = 'arcade-font bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg w-full border-b-4 border-emerald-700 hover:border-emerald-800';
    yesBtn.textContent = 'Yes';
    yesBtn.onclick = () => {
        onConfirm();
        document.getElementById('modal-content').removeChild(actionContainer);
        DOM.modal.button.classList.remove('hidden');
        closeModal();
    };

    const noBtn = document.createElement('button');
    noBtn.className = 'arcade-font bg-rose-500 hover:bg-rose-600 text-white py-3 px-4 rounded-lg w-full border-b-4 border-rose-700 hover:border-rose-800';
    noBtn.textContent = 'No';
    noBtn.onclick = () => {
        document.getElementById('modal-content').removeChild(actionContainer);
        DOM.modal.button.classList.remove('hidden');
        closeModal();
    };

    actionContainer.appendChild(yesBtn);
    actionContainer.appendChild(noBtn);
    document.getElementById('modal-content').appendChild(actionContainer);
    openModal();
}

function showInfoOnlyModal(title, desc, emoji, callback) {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showInfoOnlyModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    DOM.modal.emoji.innerHTML = emoji || '';
    DOM.modal.title.textContent = title;
    modalEventEmoji.textContent = '';
    DOM.modal.description.textContent = desc;
    DOM.modal.gpaChange.textContent = '';
    DOM.modal.button.onclick = () => closeModal(callback);

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

function showRelationshipStartModal(player, callback) {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showRelationshipStartModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    DOM.modal.emoji.innerHTML = player.icon || '';
    modalEventEmoji.textContent = '💞';
    DOM.modal.title.textContent = `${player.name} — You're in a Relationship!`;
    DOM.modal.description.textContent = `${player.name} just entered a relationship. Heart meter unlocked!`;
    DOM.modal.gpaChange.textContent = '❤️ +1';
    DOM.modal.gpaChange.className = 'text-5xl arcade-font mb-8 text-red-400';
    DOM.modal.button.onclick = () => { logEvent(player, 'Entered a relationship ❤️'); closeModal(callback); };

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

// Relationship choice modal (A/B)
function showChoiceEventModal(relEvent, player, callback) {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showChoiceEventModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    DOM.modal.emoji.innerHTML = player.icon || '';
    modalEventEmoji.textContent = relEvent.emoji || '';
    DOM.modal.title.textContent = `${player.name} — ${relEvent.title}`;
    DOM.modal.description.textContent = relEvent.desc;
    DOM.modal.gpaChange.textContent = '';
    // Build two buttons for choices A and B
    const [A, B] = relEvent.choices;
    DOM.modal.button.classList.add('hidden');
    const actionContainer = document.createElement('div');
    actionContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-3 mt-4';

    const makeBtn = (choice) => {
        const btn = document.createElement('button');
        btn.className = 'arcade-font bg-pink-600 hover:bg-pink-700 text-white py-3 px-4 rounded-lg w-full border-b-4 border-pink-800 hover:border-pink-900';
        btn.textContent = choice.label;
        btn.onclick = () => {
            const mode = spicyMode ? 'spicy' : 'normal';
            const gpaDelta = typeof choice.gpa === 'object' ? (choice.gpa[mode] || 0) : (choice.gpa || 0);
            if (gpaDelta) updateGpa(player, gpaDelta);
            if (typeof choice.hearts === 'number') adjustHearts(player, choice.hearts);
            if (choice.skip) player.skipTurns += choice.skip;
            document.getElementById('modal-content').removeChild(actionContainer);
            DOM.modal.button.classList.remove('hidden');
            logEvent(player, `${relEvent.title} → ${choice.label}${gpaDelta ? ` (${gpaDelta > 0 ? '+' : ''}${gpaDelta.toFixed(2)} GPA)` : ''}${choice.hearts ? ` ❤️${choice.hearts > 0 ? '+' : ''}${choice.hearts}` : ''}${choice.skip ? ` ⏭️x${choice.skip}` : ''}`);
            closeModal(callback);
        };
        return btn;
    };

    actionContainer.appendChild(makeBtn(A));
    actionContainer.appendChild(makeBtn(B));
    document.getElementById('modal-content').appendChild(actionContainer);

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

// Chit prompt modal with arcade buttons
function showChitPromptModal(player, callback) {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in showChitPromptModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    DOM.modal.emoji.innerHTML = player.icon || '';
    DOM.modal.title.textContent = `${player.name} — You found a chit!`;
    modalEventEmoji.textContent = '📝';
    DOM.modal.description.textContent = 'A well-prepared chit with answers for the upcoming FAT. If you take it and evade the Flying Squad, your GPA gets reset to 10.0 at semester end. But if caught, the penalty is severe.';
    DOM.modal.gpaChange.textContent = '';
    DOM.modal.button.classList.add('hidden');
    const container = document.createElement('div');
    container.className = 'grid grid-cols-2 gap-3 mt-4';
    const yes = document.createElement('button');
    yes.className = 'arcade-font bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg border-b-4 border-emerald-700';
    yes.innerHTML = '✅ Take the Chit';
    const no = document.createElement('button');
    no.className = 'arcade-font bg-rose-500 hover:bg-rose-600 text-white py-3 px-4 rounded-lg border-b-4 border-rose-700';
    no.innerHTML = '❌ Leave it';
    yes.onclick = () => { player.chits = (player.chits || 0) + 1; updatePlayerInfo(player); logEvent(player, 'Took a chit 📝'); closePrompt(); };
    no.onclick = () => { logEvent(player, 'Left the chit'); closePrompt(); };
    const closePrompt = () => {
        // Safely remove container element if it still exists as a child
        const modalContent = document.getElementById('modal-content');
        if (modalContent && modalContent.contains(container)) {
            modalContent.removeChild(container);
        }
        DOM.modal.button.classList.remove('hidden');
        closeModal(callback);
    };
    container.appendChild(yes); container.appendChild(no);
    document.getElementById('modal-content').appendChild(container);

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

function endGame(winner, message) {
    gameActive = false;
    let finalWinner = winner;
    // Enforce win condition: must reach tile 100 with GPA > 0
    if (!winner) {
        finalWinner = players.find(p => p.position >= GAME_CONFIG.TILE_COUNT && p.gpa > 0) || null;
    }

    if (finalWinner) {
        DOM.modal.emoji.innerHTML = '🎉';
        DOM.modal.title.textContent = `Winner!`;
        const bestGpa = players.reduce((a, b) => a.gpa > b.gpa ? a : b);
        const worstGpa = players.reduce((a, b) => a.gpa < b.gpa ? a : b);
        const bestRel = players.reduce((a, b) => (a.hearts || 0) > (b.hearts || 0) ? a : b);
        const worstRel = players.reduce((a, b) => (a.hearts || 0) < (b.hearts || 0) ? a : b);
        const lines = [
            `🏆 <strong>${finalWinner.name}</strong> won the game`,
            `💖 Best Relationship: <strong>${bestRel.name}</strong> (${bestRel.hearts || 0} ❤)`,
            `📈 Best GPA: <strong>${bestGpa.name}</strong> (${bestGpa.gpa.toFixed(2)})`,
            `💔 Worst Relationship: <strong>${worstRel.name}</strong> (${worstRel.hearts || 0} ❤)`,
            `📉 Worst GPA: <strong>${worstGpa.name}</strong> (${worstGpa.gpa.toFixed(2)})`
        ];
        DOM.modal.description.innerHTML = lines.join('<br/>');
        DOM.modal.gpaChange.textContent = '';
        launchConfetti();
    } else {
        DOM.modal.emoji.innerHTML = '🤝';
        DOM.modal.title.textContent = "It's a Tie!";
        DOM.modal.description.textContent = "A truly shared struggle!";
        DOM.modal.gpaChange.textContent = '';
    }

    DOM.modal.button.textContent = "Play Again";
    DOM.modal.button.onclick = () => {
        closeModal(() => {
            DOM.game.gameArea.classList.add('hidden');
            DOM.setup.playerSetup.classList.remove('hidden');
            const backBtn = document.getElementById('back-button');
            if (backBtn) backBtn.remove();
        });
    };
    openModal();
}

// --- General Event Application (mode-aware) ---
function applyAndShowGeneralEvent(ev, player, callback) {
    const mode = spicyMode ? 'spicy' : 'normal';
    let appliedGpa = 0;
    let appliedSkip = 0;
    if (ev.effect && ev.effect.type === 'diceBased') {
        const roll = Math.floor(Math.random() * GAME_CONFIG.DICE_SIDES) + 1;
        const branch = roll % 2 === 0 ? ev.effect.even : ev.effect.odd;
        if (branch) {
            if (branch.gpa) {
                appliedGpa = branch.gpa[mode] || 0;
            }
            if (typeof branch.skipTurns === 'number') {
                appliedSkip = branch.skipTurns;
                player.skipTurns += appliedSkip;
            }
        }
        const desc = `${ev.desc} (Rolled ${roll})`;
        const withSkip = appliedSkip > 0 ? `${desc} (Skip ${appliedSkip} turn${appliedSkip > 1 ? 's' : ''})` : desc;
        showEventModal({ title: ev.title, desc: withSkip, gpa: appliedGpa, emoji: ev.emoji }, player, () => {
            logEvent(player, `${ev.title}${appliedGpa ? ` (${appliedGpa > 0 ? '+' : ''}${appliedGpa.toFixed(2)} GPA)` : ''}${appliedSkip ? ` ⏭️x${appliedSkip}` : ''}`);
            if (callback) callback();
        });
        return;
    }
    if (ev.gpa) {
        appliedGpa = typeof ev.gpa === 'object' ? (ev.gpa[mode] || 0) : ev.gpa;
    }
    if (typeof ev.skipTurns === 'number') {
        appliedSkip = ev.skipTurns;
        player.skipTurns += appliedSkip;
    }
    // Inject skip info into description if applicable
    const finalDesc = appliedSkip > 0 ? `${ev.desc || ''} (Skip ${appliedSkip} turn${appliedSkip > 1 ? 's' : ''})` : (ev.desc || '');
    showEventModal({ title: ev.title, desc: finalDesc, gpa: appliedGpa, emoji: ev.emoji }, player, () => {
        logEvent(player, `${ev.title}${appliedGpa ? ` (${appliedGpa > 0 ? '+' : ''}${appliedGpa.toFixed(2)} GPA)` : ''}${appliedSkip ? ` ⏭️x${appliedSkip}` : ''}`);
        if (callback) callback();
    });
}

function openModal() {
    if (!DOM.modal.backdrop) {
        console.error('Modal backdrop not found');
        return;
    }

    if (DOM.modal.backdrop.classList.contains('hidden')) {
        DOM.modal.backdrop.classList.remove('hidden');
        // Remove aria-hidden when opening modal
        DOM.modal.backdrop.setAttribute('aria-hidden', 'false');

        // Add escape key handler for keyboard navigation
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);

        setTimeout(() => {
            if (!DOM.modal.backdrop.classList.contains('hidden')) {
                DOM.modal.backdrop.classList.remove('opacity-0');
                if (DOM.modal.content) {
                    DOM.modal.content.classList.remove('scale-90', 'opacity-0');
                }
                // Focus the modal button for keyboard navigation
                if (DOM.modal.button && !DOM.modal.button.classList.contains('hidden')) {
                    DOM.modal.button.focus();
                }
            }
        }, 10);
    }
}

function closeModal(callback) {
    if (!DOM.modal.backdrop) {
        console.error('Modal backdrop not found');
        if (callback) callback();
        return;
    }

    if (!DOM.modal.backdrop.classList.contains('hidden')) {
        DOM.modal.backdrop.classList.add('opacity-0');
        if (DOM.modal.content) {
            DOM.modal.content.classList.add('scale-90', 'opacity-0');
        }

        // Handle focus properly - move focus away from modal button before hiding
        if (document.activeElement && DOM.modal.backdrop.contains(document.activeElement)) {
            document.activeElement.blur();
        }

        // Remove aria-hidden first, then set it after animation completes
        setTimeout(() => {
            if (DOM.modal.backdrop.classList.contains('opacity-0')) {
                DOM.modal.backdrop.classList.add('hidden');
                DOM.modal.backdrop.setAttribute('aria-hidden', 'true');
                // Clean up any orphaned modal content
                cleanupModalContent();
                if (callback) callback();
            }
        }, 400);
    } else if (callback) {
        callback();
    }
}

function cleanupModalContent() {
    // Remove any dynamically added content from previous modals
    if (!DOM.modal.content) {
        console.warn('Modal content not found during cleanup');
        return;
    }

    const modalContent = DOM.modal.content;
    const children = Array.from(modalContent.children);
    children.forEach(child => {
        if (!child.classList.contains('modal-emoji') &&
            !child.classList.contains('modal-event-emoji') &&
            child.id !== 'modal-title' &&
            child.id !== 'modal-description' &&
            child.id !== 'modal-gpa-change' &&
            child.id !== 'modal-button') {
            try {
                modalContent.removeChild(child);
            } catch (e) {
                console.warn('Error removing modal child element:', e);
            }
        }
    });
}

// Confetti element pool for better performance
let confettiPool = [];
const CONFETTI_POOL_SIZE = 120;

function initConfettiPool() {
    for (let i = 0; i < CONFETTI_POOL_SIZE; i++) {
        const piece = document.createElement('div');
        piece.style.position = 'fixed';
        piece.style.width = '8px';
        piece.style.height = '14px';
        piece.style.zIndex = '60';
        piece.style.display = 'none';
        document.body.appendChild(piece);
        confettiPool.push(piece);
    }
}

function launchConfetti() {
    // Initialize pool if not done yet
    if (confettiPool.length === 0) {
        initConfettiPool();
    }

    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7'];
    let poolIndex = 0;

    for (let i = 0; i < Math.min(CONFETTI_POOL_SIZE, 120); i++) {
        const piece = confettiPool[poolIndex++];
        if (!piece) continue;

        // Reset and configure piece
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.top = '-10vh';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.opacity = '0.9';
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        piece.style.animation = `confetti-fall ${3 + Math.random() * 2}s linear forwards`;
        piece.style.display = 'block';

        // Clean up after animation
        setTimeout(() => {
            piece.style.display = 'none';
            piece.style.animation = 'none';
        }, 6000);
    }
}

// Controls: audio toggle, fullscreen, back button, beforeunload
function ensureBackButton() {
    if (document.getElementById('back-button')) return;
    const btn = document.createElement('button');
    btn.id = 'back-button';
    btn.className = 'fixed top-3 left-3 arcade-font bg-slate-700 text-slate-100 rounded-lg border-b-4 border-slate-900 z-50 hover:bg-slate-600';
    btn.setAttribute('aria-label', 'Back');
    btn.innerHTML = '<span style="font-size:clamp(14px,2.8vw,18px);line-height:1;">←</span>';
    btn.onclick = () => {
        showConfirmationModal('Go back?', 'Are you sure you want to go back to setup? Progress will be lost.', '😢', () => {
            location.reload();
        });
    };
    document.body.appendChild(btn);

    // Create a fullscreen toggle button at top-right
    if (!document.getElementById('fullscreen-floating')) {
        const fs = document.createElement('button');
        fs.id = 'fullscreen-floating';
        fs.className = 'fixed top-3 right-3 arcade-font bg-slate-700 text-slate-100 rounded-lg border-b-4 border-slate-900 z-50 hover:bg-slate-600';
        fs.setAttribute('aria-label', 'Fullscreen');
        fs.innerHTML = '<span style="font-size:clamp(12px,2.6vw,16px);line-height:1;">⛶</span>';
        fs.onclick = () => {
            const root = document.documentElement;
            const isMobile = /Mobi|Android/i.test(navigator.userAgent);
            const applyMobileLayout = (on) => document.body.classList.toggle('mobile-fullscreen', on);
            if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.mozFullScreenElement && !document.msFullscreenElement) {
                // Try modern fullscreen API first
                if (root.requestFullscreen) {
                    root.requestFullscreen();
                } else if (root.webkitRequestFullscreen) { // Safari
                    root.webkitRequestFullscreen();
                } else if (root.mozRequestFullScreen) { // Firefox
                    root.mozRequestFullScreen();
                } else if (root.msRequestFullscreen) { // IE/Edge
                    root.msRequestFullscreen();
                }
                applyMobileLayout(isMobile);
                document.body.classList.toggle('desktop-fullscreen', !isMobile);
            } else {
                // Try modern exit fullscreen API first
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) { // Safari
                    document.webkitExitFullscreen();
                } else if (document.mozCancelFullScreen) { // Firefox
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) { // IE/Edge
                    document.msExitFullscreen();
                }
                applyMobileLayout(false);
                document.body.classList.remove('desktop-fullscreen');
            }
        };
        document.body.appendChild(fs);
    }
}

// --- GAME LOG ---
function logEvent(player, text) {
    const list = document.getElementById('game-log-list');
    if (!list || !text) return;

    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    const li = document.createElement('li');
    const arrow = '➜';
    const name = player ? player.name : 'System';
    li.innerHTML = `<span class="text-slate-400">${arrow}</span> <span class="font-semibold" style="color:${player ? player.color : '#94a3b8'}">${name}</span> <span class="ml-1">${text}</span>`;
    fragment.appendChild(li);

    // Batch DOM operations
    list.insertBefore(fragment, list.firstChild);

    // Auto-animate insertion
    li.style.opacity = '0';
    li.style.transform = 'translateY(-6px)';
    setTimeout(() => {
        li.style.transition = 'opacity .25s ease, transform .25s ease';
        li.style.opacity = '1';
        li.style.transform = 'translateY(0)';
    }, 10);

    // Limit to recent ~100 items in memory (optimize by removing multiple at once)
    if (list.children.length > 100) {
        const toRemove = list.children.length - 100;
        for (let i = 0; i < toRemove; i++) {
            list.removeChild(list.lastChild);
        }
    }
}

window.addEventListener('beforeunload', (e) => {
    // Ask confirmation only on refresh/close when a game is active
    const hasGame = !document.getElementById('game-area').classList.contains('hidden');
    if (hasGame) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Setup UI handlers after DOM ready
document.addEventListener('click', (e) => {
    const id = (e.target && e.target.id) || '';
    if (id === 'fullscreen-toggle') {
        const root = document.documentElement;
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        const applyMobileLayout = (on) => {
            document.body.classList.toggle('mobile-fullscreen', on);
        };
        if (!document.fullscreenElement) {
            if (root.requestFullscreen) root.requestFullscreen();
            applyMobileLayout(isMobile);
            document.body.classList.toggle('desktop-fullscreen', !isMobile);
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
            applyMobileLayout(false);
            document.body.classList.remove('desktop-fullscreen');
        }
    }
    if (id === 'roll-dice-btn') {
        // Audio removed - no audio elements in HTML
    }
    if (id === 'game-log-title') {
        openLogModal();
    }
});

// Expose helper for realtime setup name updates before cards exist
window.updateSetupName = (idx, value) => {
    const el = document.getElementById(`player${idx}-info-name`);
    if (el) el.textContent = value || `Player ${idx}`;
};

function openEmojiPicker(playerIndex) {
    const emojiModal = document.getElementById('emoji-modal');
    const emojiGrid = document.getElementById('emoji-grid');
    const emojiSearch = document.getElementById('emoji-search');
    const closeBtn = document.getElementById('emoji-close');

    const populateEmojis = (filter = '') => {
        emojiGrid.innerHTML = '';
        if (!emojiList || emojiList.length === 0) return;
        const q = filter.toLowerCase();
        const filteredEmojis = emojiList.filter(e => e && e.keywords && (!q || e.keywords.some(k => k && k.includes(q))));
        filteredEmojis.forEach(({ emoji, keywords }) => {
            const btn = document.createElement('button');
            btn.className = 'text-3xl p-2 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400';
            btn.textContent = emoji;
            btn.setAttribute('aria-label', `Select emoji: ${keywords ? keywords.join(', ') : emoji}`);
            btn.onclick = () => {
                document.getElementById(`player${playerIndex}-emoji-btn`).textContent = emoji;
                document.getElementById(`player${playerIndex}-emoji`).value = emoji;
                emojiModal.classList.add('hidden');
                emojiModal.style.display = 'none';
            };
            emojiGrid.appendChild(btn);
        });
    };

    // Debounced emoji search for performance
    let searchTimeout;
    emojiSearch.oninput = (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            populateEmojis(e.target.value);
        }, 150);
    };
    closeBtn.onclick = () => { emojiModal.classList.add('hidden'); emojiModal.style.display = 'none'; };
    populateEmojis();
    emojiModal.classList.remove('hidden');
    emojiModal.style.display = 'flex'; // Make it a flex container to center content
}



function getToast() {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'toast';
        document.body.appendChild(t);
    }
    return t;
}

// Full game log modal
function openLogModal() {
    // Check if modal elements exist before accessing them
    if (!DOM.modal.emoji || !DOM.modal.title || !DOM.modal.description || !DOM.modal.gpaChange || !DOM.modal.button) {
        console.error('Modal elements not found in openLogModal');
        return;
    }

    const modalEventEmoji = getModalEventEmoji();

    const items = Array.from(document.getElementById('game-log-list')?.children || []);
    const history = items.map(li => li.outerHTML).join('');
    DOM.modal.emoji.innerHTML = '';
    modalEventEmoji.textContent = '📜';
    DOM.modal.title.textContent = 'Full Game Log';
    DOM.modal.description.innerHTML = `<div class="text-left bg-slate-900/50 border border-slate-700 rounded p-3" style="max-height: 60vh; overflow:auto;"><ul class="space-y-1 text-slate-300 text-xs">${history}</ul></div>`;
    DOM.modal.gpaChange.textContent = '';
    DOM.modal.button.onclick = () => closeModal();

    // Only open modal after ensuring elements are ready
    setTimeout(() => {
        openModal();
    }, 50);
}

let roundStartIndex = 0;
let pendingFinishers = [];
let roundFinishing = false;

function handleFinishLine(player) {
    if (!pendingFinishers.find(p => p.id === player.id)) pendingFinishers.push(player);
    roundFinishing = true;
}

function finalizeRoundIfNeeded() {
    if (!roundFinishing) return false;
    if (pendingFinishers.length === 0) return false;
    // Highest GPA wins among finishers
    let best = pendingFinishers[0];
    for (let i = 1; i < pendingFinishers.length; i++) {
        if (pendingFinishers[i].gpa > best.gpa) best = pendingFinishers[i];
    }
    endGame(best, 'Finishers evaluated');
    return true;
}

function switchPlayer() {
    if (!gameActive || !players || players.length === 0) return;
    const alive = players.filter(p => p && p.gpa > 0);
    if (alive.length === 0) return;
    if (alive.length === 1) {
        endGame(alive[0], 'Last player standing!');
        return;
    }
    // Move to next alive player
    let next = currentPlayerIndex;
    do {
        next = (next + 1) % players.length;
    } while (players[next].gpa <= 0 && next !== currentPlayerIndex);
    // Starting a new round?
    const startingNewRound = next === roundStartIndex;
    if (startingNewRound) {
        // If any finishers this round, finalize winner now
        if (finalizeRoundIfNeeded()) return;
    }
    currentPlayerIndex = next;
    if (startingNewRound) {
        // reset round tracking for next cycle
        roundStartIndex = currentPlayerIndex;
        pendingFinishers = [];
        roundFinishing = false;
    }
    updateTurnIndicator();
}

function updateTurnIndicator() {
    const player = players[currentPlayerIndex];
    DOM.game.turnIndicator.textContent = `${player.name}'s Turn!`;
    DOM.game.rollDiceBtn.disabled = false; // Always enable the button for the next player

    players.forEach(p => {
        const infoCard = document.getElementById(`player${p.id}-info`);
        infoCard.classList.toggle('active-card', p.id === player.id);
        // Subtly tint the active card border and background
        if (p.id === player.id) {
            infoCard.style.borderColor = p.color;
            // Auto-scroll active card into view
            infoCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            infoCard.style.borderColor = 'rgba(100,116,139,0.6)';
        }
    });
}

function updatePlayerInfo(player) {
    const gpaEl = document.getElementById(`player${player.id}-gpa`);
    if (gpaEl) gpaEl.textContent = player.gpa.toFixed(2);
    const yearInfo = getYearSemester(player.position);
    const badge = document.querySelector(`#player${player.id}-info span.arcade-font`);
    if (badge) {
        const yearColor = yearInfo.year <= 1 ? '#6ee7b7' : yearInfo.year === 2 ? '#34d399' : yearInfo.year === 3 ? '#10b981' : '#059669';
        badge.textContent = `Y${yearInfo.year} S${yearInfo.semester}`;
        badge.style.background = yearColor;
    }
    const heartsNum = document.getElementById(`player${player.id}-hearts-count`);
    const chitsNum = document.getElementById(`player${player.id}-chits-count`);
    if (heartsNum) heartsNum.textContent = String(player.hearts || 0);
    if (chitsNum) chitsNum.textContent = String(player.chits || 0);
}

function updateAllPlayerInfo() {
    players.forEach(p => {
        updatePlayerInfo(p);
        // ensure meta counters render initial zeros
        const heartsNum = document.getElementById(`player${p.id}-hearts-count`);
        const chitsNum = document.getElementById(`player${p.id}-chits-count`);
        if (heartsNum) heartsNum.textContent = String(p.hearts || 0);
        if (chitsNum) chitsNum.textContent = String(p.chits || 0);
    });
}

function getYearSemester(position) {
    if (position < 1) position = 1;
    let year = Math.ceil(position / 14);
    if (year > 4) year = 4;
    const within = ((position - 1) % 14) + 1; // 1..14
    const semester = within <= 8 ? 1 : 2; // first 8 tiles fall, next 6 winter
    return { year, semester };
}

// Cache board rectangle to avoid repeated calculations
let cachedBoardRect = null;
let boardRectTimestamp = 0;
const BOARD_RECT_CACHE_TIME = 100; // ms

function getBoardRect() {
    const now = Date.now();
    if (!cachedBoardRect || (now - boardRectTimestamp) > BOARD_RECT_CACHE_TIME) {
        cachedBoardRect = DOM.game.board.getBoundingClientRect();
        boardRectTimestamp = now;
    }
    return cachedBoardRect;
}

function updatePawnPosition(player) {
    if (!player || !player.pawnId) return;
    const pawn = document.getElementById(player.pawnId);
    const tile = document.getElementById(`tile-${player.position}`);
    if (!tile || !pawn) return;
    const tileRect = tile.getBoundingClientRect();
    const boardRect = getBoardRect();

    const playersOnTile = players.filter(p => p.position === player.position);
    const playerIndexOnTile = playersOnTile.findIndex(p => p.id === player.id);

    let offsetX = 0;
    let offsetY = 0;
    if (playersOnTile.length > 1) {
        const angle = (360 / playersOnTile.length) * playerIndexOnTile;
        const pawnSize = pawn.offsetWidth || 36;
        // Reduce radius on small tiles to prevent clipping
        const maxRadius = Math.min(tile.offsetWidth, tile.offsetHeight) * 0.2;
        const radius = Math.max(4, Math.min(Math.floor(pawnSize * 0.25), maxRadius));
        offsetX = Math.cos(angle * Math.PI / 180) * radius;
        offsetY = Math.sin(angle * Math.PI / 180) * radius;
    }

    pawn.style.left = `${tileRect.left - boardRect.left + tile.offsetWidth / 2 - pawn.offsetWidth / 2 + offsetX}px`;
    pawn.style.top = `${tileRect.top - boardRect.top + tile.offsetHeight / 2 - pawn.offsetHeight / 2 + offsetY}px`;
}

function resizePawnsToTile() {
    const sampleTile = document.getElementById('tile-1');
    if (!sampleTile) return;
    const tileSize = Math.min(sampleTile.clientWidth, sampleTile.clientHeight);
    const dynamicCap = window.innerWidth < 640 ? 52 : 64;
    const basePawnSize = Math.max(24, Math.min(Math.floor(tileSize * 0.7), dynamicCap));
    players.forEach(p => {
        const pawn = document.getElementById(p.pawnId);
        if (pawn) pawn.style.setProperty('--pawn-size', `${basePawnSize}px`);
    });
}

function updateAllPawnPositions() {
    if (players.length > 0) {
        resizePawnsToTile();
        // Update positions for all players, especially for overlapping pawns
        const positions = new Set(players.map(p => p.position));
        positions.forEach(pos => {
            players.filter(p => p.position === pos).forEach(p => updatePawnPosition(p));
        });
    }
}

// Debounced resize handler for performance
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        updateAllPawnPositions();
    }, 100);
});

// Initial setup
generatePlayerInputs(2);