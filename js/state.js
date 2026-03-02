/* ==========================================================================
   State Machine & Data Model
   5-Port Milk Testing Device Prototype
   ========================================================================== */

// ---- Constants ----

const STATES = {
    EMPTY: 'EMPTY',
    DETECTED: 'DETECTED',
    ERROR_USED: 'ERROR_USED',
    CONFIGURING: 'CONFIGURING',
    WAITING_TEMP: 'WAITING_TEMP',
    INCUBATING: 'INCUBATING',
    INCUBATION_ALERT: 'INCUBATION_ALERT',
    READING: 'READING',
    RESULT: 'RESULT',
    AWAITING_CONFIRMATION: 'AWAITING_CONFIRMATION',
    WAITING_FOR_SWAP: 'WAITING_FOR_SWAP',
    READY_FOR_TEST_N: 'READY_FOR_TEST_N',
    COMPLETE: 'COMPLETE',
    ERROR: 'ERROR',
    ERROR_TYPE_MISMATCH: 'ERROR_TYPE_MISMATCH',
    ERROR_USED_CONFIRMATION: 'ERROR_USED_CONFIRMATION'
};

const CASSETTE_TYPES = ['2BC', '3BTC', '4BTCS'];

// Prototype stand-in for test type cloud configuration.
const TEST_TYPE_CONFIG = {
    '2BC': { requiredTemperature: 40 },
    '3BTC': { requiredTemperature: 50 },
    '4BTCS': { requiredTemperature: 50 }
};

const SUBSTANCES = {
    '2BC':  ['Beta-lactams', 'Cephalosporins'],
    '3BTC': ['Beta-lactams', 'Tetracyclines', 'Cephalosporins'],
    '4BTCS':['Beta-lactams', 'Tetracyclines', 'Cephalosporins', 'Sulfonamides']
};

// Short labels for cassette graphic lines
const SUBSTANCE_SHORT = {
    'Beta-lactams': 'B',
    'Tetracyclines': 'T',
    'Cephalosporins': 'C',
    'Sulfonamides': 'S'
};

// Prototype timing (accelerated for demo)
const TIMING = {
    TEMP_WAIT: 3,       // seconds to reach temperature
    INCUBATION: 10,     // seconds for incubation (real: ~120)
    READING: 2,         // seconds for reading
    ALERT_TIMEOUT: 20   // legacy: no longer used in primary flow
};

// Recent values for config form
const RECENT_ROUTES = ['Farm A', 'Route 12', 'North Barn', 'South Field'];
const RECENT_OPERATORS = ['OP-001', 'OP-042', 'OP-103'];

// ---- Global State ----

let channels = [];
let activeModal = null;   // {type: 'config'|'decision'|'detail', channelId, data}
let modalQueue = [];       // Queued modal events
let usedCassetteIds = new Set();
let cassetteIdCounter = 1;
let sessionHistory = [];
let deviceSettings = {
    microswitchEnabled: true,
    qrScanningEnabled: true,
    incubationEnabled: true,
    deviceTemperature: 50
};

// ---- Channel Data Factory ----

function createChannel(id) {
    return {
        id: id,
        state: STATES.EMPTY,
        physicalCassettePresent: false, // physical slot occupancy (simulated)
        cassettePresent: false,
        loadedCassetteId: null,   // currently inserted cassette instance
        loadedCassetteType: null, // type read/known for currently inserted cassette
        cassetteType: null,
        scenario: null,         // 'test', 'pos_control', 'animal_control'
        processing: null,       // 'read_only', 'read_incubate'
        route: '',
        operatorId: '',
        currentTestNumber: 0,
        testResults: [],        // [{substances: [{name, result}], overall, testNumber}]
        groupResult: null,      // 'negative', 'positive', 'inconclusive'
        simulatedOutcome: null, // 'positive', 'negative' — set by simulation controls
        incubationTotal: TIMING.INCUBATION,
        incubationRemaining: 0,
        incubationElapsed: 0,   // tracks elapsed time for resume after alert
        alertRemaining: 0,
        errorMessage: '',
        timerId: null
    };
}

function initChannels() {
    channels = [];
    usedCassetteIds = new Set();
    sessionHistory = [];
    cassetteIdCounter = 1;
    for (let i = 1; i <= 5; i++) {
        channels.push(createChannel(i));
    }
}

function getChannel(id) {
    return channels[id - 1];
}

function getRequiredTemperature(testType) {
    return TEST_TYPE_CONFIG[testType]?.requiredTemperature ?? null;
}

function getTemperatureValidation(testType) {
    const requiredTemperature = getRequiredTemperature(testType);

    if (requiredTemperature === null) {
        return {
            ok: true,
            currentTemperature: deviceSettings.deviceTemperature,
            requiredTemperature: null
        };
    }

    return {
        ok: deviceSettings.deviceTemperature === requiredTemperature,
        currentTemperature: deviceSettings.deviceTemperature,
        requiredTemperature
    };
}

// ---- Result Generation ----

function generateSubstanceResults(cassetteType, outcome) {
    const subs = SUBSTANCES[cassetteType];
    if (outcome === 'negative') {
        return subs.map(name => ({ name, result: 'negative' }));
    }
    // Positive: at least one substance positive
    const results = subs.map((name, i) => ({
        name,
        result: i === 0 ? 'positive' : (Math.random() > 0.6 ? 'positive' : 'negative')
    }));
    // Ensure at least one positive
    if (!results.some(r => r.result === 'positive')) {
        results[0].result = 'positive';
    }
    return results;
}

function isTestPositive(substanceResults) {
    return substanceResults.some(r => r.result === 'positive');
}

// ---- Reset Channel to Empty ----

function resetChannel(ch) {
    clearTimer(ch);
    ch.state = STATES.EMPTY;
    ch.cassettePresent = false;
    ch.loadedCassetteId = null;
    ch.loadedCassetteType = null;
    ch.cassetteType = null;
    ch.scenario = null;
    ch.processing = null;
    ch.route = '';
    ch.operatorId = '';
    ch.currentTestNumber = 0;
    ch.testResults = [];
    ch.groupResult = null;
    ch.simulatedOutcome = null;
    ch.incubationRemaining = 0;
    ch.incubationElapsed = 0;
    ch.alertRemaining = 0;
    ch.errorMessage = '';
}

// ---- Timer Management ----

function clearTimer(ch) {
    if (ch.timerId) {
        clearInterval(ch.timerId);
        ch.timerId = null;
    }
}

// ---- State Queries ----

function canInsertCassette(ch) {
    // Physical workflow guard: cannot insert a new cassette while one is still present.
    if (ch.physicalCassettePresent) return false;

    return ch.state === STATES.EMPTY ||
           ch.state === STATES.DETECTED ||
           ch.state === STATES.READY_FOR_TEST_N ||
           ch.state === STATES.ERROR;
}

function canRemoveCassette(ch) {
    return ch.physicalCassettePresent;
}

function canConfigureChannel(ch) {
    return ch.state === STATES.DETECTED ||
           (!deviceSettings.microswitchEnabled && ch.state === STATES.EMPTY);
}

function isRunningState(state) {
    return state === STATES.WAITING_TEMP ||
           state === STATES.INCUBATING ||
           state === STATES.READING;
}

function canClearChannel(ch) {
    if (ch.state === STATES.EMPTY || ch.state === STATES.CONFIGURING) return false;
    return !isRunningState(ch.state);
}

function shouldRecordInconclusiveOnClear(ch) {
    if (ch.state === STATES.COMPLETE) return false;
    if (ch.scenario !== 'test') return false;
    return ch.testResults.length > 0 || ch.currentTestNumber > 0;
}

function archiveSession(ch, reason, forcedGroupResult = null) {
    const hasData = ch.scenario || ch.testResults.length > 0 || ch.groupResult;
    if (!hasData) return;

    const finalResult = forcedGroupResult || ch.groupResult || null;
    sessionHistory.push({
        channelId: ch.id,
        reason,
        scenario: ch.scenario,
        cassetteType: ch.cassetteType,
        route: ch.route,
        operatorId: ch.operatorId,
        result: finalResult,
        testCount: ch.testResults.length,
        tests: ch.testResults.map(tr => ({
            testNumber: tr.testNumber,
            overall: tr.overall,
            cassetteType: tr.cassetteType,
            substances: tr.substances.map(s => ({ name: s.name, result: s.result }))
        })),
        timestamp: new Date().toISOString()
    });
}

function nextCassetteId() {
    return cassetteIdCounter++;
}

function getCardStateClass(ch) {
    switch (ch.state) {
        case STATES.EMPTY:
            return 'state-empty';
        case STATES.DETECTED:
        case STATES.READY_FOR_TEST_N:
            return 'state-detected';
        case STATES.ERROR_USED:
        case STATES.ERROR:
        case STATES.ERROR_USED_CONFIRMATION:
            return 'state-error';
        case STATES.ERROR_TYPE_MISMATCH:
            return 'state-error';
        case STATES.CONFIGURING:
            return 'state-detected';
        case STATES.WAITING_TEMP:
        case STATES.INCUBATING:
        case STATES.READING:
            return 'state-processing';
        case STATES.INCUBATION_ALERT:
            return 'state-alert';
        case STATES.AWAITING_CONFIRMATION:
        case STATES.WAITING_FOR_SWAP:
            return 'state-waiting';
        case STATES.RESULT:
            return isTestPositive(ch.testResults[ch.testResults.length - 1].substances)
                ? 'state-result-positive' : 'state-result-negative';
        case STATES.COMPLETE:
            if (ch.scenario === 'pos_control' || ch.scenario === 'animal_control') {
                return 'state-control';
            }
            switch (ch.groupResult) {
                case 'negative': return 'state-complete-negative';
                case 'positive': return 'state-complete-positive';
                case 'inconclusive': return 'state-complete-inconclusive';
            }
            return '';
        default:
            return '';
    }
}
