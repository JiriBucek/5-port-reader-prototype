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
const DEFAULT_QUALITATIVE_THRESHOLDS = {
    positiveMax: 0.9,
    negativeMin: 1.1
};

const TEST_TYPE_DATA = [
    [2, "MilkSafe™ 4BTSC", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Chloramphenicol", "Streptomycin", "Tetracyclines", "Beta-lactams"]],
    [3, "MilkSafe™ 3BTS", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [4, "MilkSafe™ 3BTC", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [5, "MilkSafe™ 2BC", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [8, "MilkSafe™ 4BTSQ", "MilkSafe", "Strip", null, 50, 60, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Quinolones"]],
    [17, "MilkSafe™ FAST 3BTS", "MilkSafe", "Cassette", "03", 40, 240, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [18, "MilkSafe™ FAST 3BTC", "MilkSafe", "Cassette", "02", 50, 180, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [19, "MilkSafe™ FAST 2BC", "MilkSafe", "Cassette", "01", 50, 180, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [20, "MilkSafe™ Afla M1", "MilkSafe", "Strip", null, null, null, "Quantitative", ["Aflatoxin M1 (Concentration)"], { measurableRangeMin: 15, measurableRangeMax: 150, negativeRangeMin: 15, negativeRangeMax: 50 }],
    [21, "MilkSafe™ Afla M1 500", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Aflatoxin M1"]],
    [22, "MilkSafe™ TR Verification", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Test line 1", "Test line 2", "Test line 3", "Test line 4"]],
    [23, "MilkSafe™ FAST 3BTC (ewe/buffalo milk)", "MilkSafe", "Cassette", "02", 50, 300, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [24, "MilkSafe™ Macrolides", "MilkSafe", "Strip", null, null, null, "Qualitative", ["Spiramycin", "Tylosin & Tilmicosin", "Erythromycin", "Lincomycin"]],
    [25, "MilkSafe™ FAST 4BTSQ (2.0)", "MilkSafe", "Cassette", "06", 50, 240, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Quinolones"]],
    [26, "MilkSafe™ FAST 3BTC (2.0)", "MilkSafe", "Cassette", "02", 50, 180, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [27, "MilkSafe™ FAST CM1-3BTS", "MilkSafe", "Cassette", "05", 40, 270, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [28, "MilkSafe™ FAST 2BC - ANZ", "MilkSafe", "Cassette", "01", 50, 210, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [29, "MilkSafe™ FAST 3BTC - ANZ", "MilkSafe", "Cassette", "02", 50, 210, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [31, "MilkSafe™ PR Verification", "MilkSafe", "Strip", null, 40, null, "Qualitative", ["Test line 1"]],
    [35, "MilkSafe™ FAST CM-2 2BC", "MilkSafe", "Cassette", "01", 50, 300, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [37, "MilkSafe™ FAST 3BTC (2.0) Read", "MilkSafe", "Cassette", "02", 0, null, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [39, "MilkSafe™ FAST 2BC (2.0)", "MilkSafe", "Cassette", "01", 50, 180, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [40, "MilkSafe™ FAST 2BC (2.0) Read", "MilkSafe", "Cassette", "01", 0, 0, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [41, "MilkSafe™ FAST 3BTC (2.0) (Ewe/Buffalo)", "MilkSafe", "Cassette", "02", 50, 300, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [42, "FAST 3BTC (2.0) (Ewe/Buffalo)", "MilkSafe", "Cassette", "02", 50, 300, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [43, "MilkSafe™ FAST 3BTS (2.0)", "MilkSafe", "Cassette", "03", 40, 240, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [44, "MilkSafe™ FAST CM-2 3BTC", "MilkSafe", "Cassette", "02", 50, 300, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [45, "MilkSafe™ FAST Cefalonium", "MilkSafe", "Cassette", "12", 50, 300, "Qualitative", ["Cefalonium"]],
    [49, "MilkSafe™ FAST 3BTC Ambient", "MilkSafe", "Cassette", "02", 0, 480, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [51, "FAST 2BC (2.0) Schafsmilch", "MilkSafe", "Cassette", "01", 50, 300, "Qualitative", ["Beta-lactams", "Cephalexin", "Ceftiofur"]],
    [53, "Bioeasy Beta-lactams", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Beta-lactams"]],
    [54, "Bioeasy 2IN1 BT", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Tetracyclines", "Beta-lactams"]],
    [55, "Bioeasy 2IN1 BTCef (EU)", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Tetracyclines", "Beta-lactams", "Cephalexin"]],
    [56, "Bioeasy Beta Ceft Tetra", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [57, "Bioeasy 3IN1 BST", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams"]],
    [58, "Bioeasy 3IN1 Rapid Test", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [59, "Bioeasy 4IN1 BTSQ", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Sulfonamides", "Tetracyclines", "Beta-lactams", "Fluoroquinolones"]],
    [60, "Bioeasy 4IN1 BSCT", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Chloramphenicol", "Streptomycin", "Tetracyclines", "Beta-lactams"]],
    [61, "Bioeasy 4IN1 BCTC", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Chloramphenicol", "Tetracyclines", "Beta-lactams", "Ceftiofur"]],
    [62, "Bioeasy AMINO 3IN1", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Streptomycin", "Gentamicin", "Neomycin"]],
    [63, "Bioeasy MACRO 3IN1", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Tylosin & Tilmicosin", "Erythromycin", "Lincomycin"]],
    [64, "Bioeasy 4IN1 CGSN", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Chloramphenicol", "Streptomycin", "Gentamicin", "Neomycin"]],
    [65, "Bioeasy 2IN1 QS", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Sulfonamides", "Quinolones"]],
    [66, "Bioeasy Florfenicol & Thiamphenicol", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Florfenicol & Thiamphenicol"]],
    [67, "Bioeasy Gentamicin", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Gentamicin"]],
    [68, "Bioeasy Fluoroquinolones", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Fluoroquinolones"]],
    [69, "Bioeasy 4IN1 NKSG", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Gentamicin", "Neomycin", "Kanamycin", "Spectinomycin"]],
    [70, "Bioeasy Chloramphenicol", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Chloramphenicol"]],
    [71, "Bioeasy Whey Adulteration", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Cow Whey"]],
    [72, "Bioeasy Melamine", "Bioeasy", "Strip", null, null, null, "Qualitative", ["Melamine"]]
];

const DEFAULT_RECENT_TEST_TYPE_IDS = [18, 25, 19, 20];

const TEST_TYPES = TEST_TYPE_DATA.map(([
    id,
    name,
    brand,
    category,
    qrIdString,
    temperature,
    incubationTime,
    measurementMethod,
    substances,
    quantitativeRange = null
]) => ({
    id,
    name: name.trim(),
    brand,
    category,
    qrIdString,
    qrEnabled: Boolean(qrIdString),
    temperature,
    requiredTemperature: typeof temperature === 'number' && temperature > 0 ? temperature : null,
    temperatureMode: temperature === 0 ? 'ambient' : (temperature == null ? 'none' : 'fixed'),
    incubationTime: typeof incubationTime === 'number' && incubationTime > 0 ? incubationTime : null,
    measurementMethod,
    quantitative: measurementMethod === 'Quantitative',
    quantitativeRange,
    substances,
    lineCount: substances.length,
    cassetteType: `${substances.length}L`
}));

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
const PRELOADED_QUANT_CURVES = [
    { id: 501, testTypeId: 20, name: '25022811', source: 'qr', createdAt: '2026-02-28T08:15:00.000Z' },
    { id: 502, testTypeId: 20, name: '25022522', source: 'card', createdAt: '2026-02-25T09:40:00.000Z' },
    { id: 503, testTypeId: 20, name: '25022213', source: 'qr', createdAt: '2026-02-22T13:05:00.000Z' },
    { id: 504, testTypeId: 20, name: '25021824', source: 'card', createdAt: '2026-02-18T16:20:00.000Z' },
    { id: 505, testTypeId: 20, name: '25021415', source: 'qr', createdAt: '2026-02-14T07:50:00.000Z' }
];
const SIMULATION_TEST_TYPE_IDS = [43, 37, 8, 20, 57];

// ---- Global State ----

let channels = [];
let activeModal = null;   // {type: 'config'|'decision'|'detail', channelId, data}
let modalQueue = [];       // Queued modal events
let usedCassetteIds = new Set();
let cassetteIdCounter = 1;
let sessionHistory = [];
let recentTestTypeIds = [];
let savedQuantCurves = PRELOADED_QUANT_CURVES.map(curve => ({ ...curve }));
let recentQuantCurveIds = savedQuantCurves.map(curve => curve.id);
let quantCurveIdCounter = Math.max(...savedQuantCurves.map(curve => curve.id)) + 1;
let deviceSettings = {
    microswitchEnabled: true,
    qrScanningEnabled: true,
    deviceTemperature: 50,
    curveScannerConnected: true,
    storageCardMounted: true
};

function normalizeDeviceTemperature(value) {
    if (value === 40 || value === '40') return 40;
    if (value === 50 || value === '50') return 50;
    return 'off';
}

function getDeviceTemperatureValue(value = deviceSettings.deviceTemperature) {
    const normalized = normalizeDeviceTemperature(value);
    return typeof normalized === 'number' ? normalized : null;
}

function isIncubationEnabled() {
    return getDeviceTemperatureValue() != null;
}

function formatDeviceTemperatureLabel(value = deviceSettings.deviceTemperature) {
    const numericValue = getDeviceTemperatureValue(value);
    return numericValue == null ? 'Off' : `${numericValue} C`;
}

function formatStatusBarTemperatureLabel(value = deviceSettings.deviceTemperature) {
    const numericValue = getDeviceTemperatureValue(value);
    return numericValue == null ? 'Off' : `${numericValue}.0&deg;C`;
}

// ---- Channel Data Factory ----

function createChannel(id) {
    return {
        id: id,
        state: STATES.EMPTY,
        physicalCassettePresent: false, // physical slot occupancy (simulated)
        cassettePresent: false,
        loadedCassetteId: null,   // currently inserted cassette instance
        loadedCassetteType: null, // type read/known for currently inserted cassette
        loadedTestTypeId: null,   // exact simulated inserted test type
        testTypeId: null,
        testTypeName: '',
        curveId: null,
        curveName: '',
        curveSource: '',
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
    recentTestTypeIds = DEFAULT_RECENT_TEST_TYPE_IDS.filter(id => TEST_TYPES.some(tt => tt.id === id));
    savedQuantCurves = PRELOADED_QUANT_CURVES.map(curve => ({ ...curve }));
    recentQuantCurveIds = savedQuantCurves.map(curve => curve.id);
    quantCurveIdCounter = Math.max(...savedQuantCurves.map(curve => curve.id)) + 1;
    cassetteIdCounter = 1;
    for (let i = 1; i <= 5; i++) {
        channels.push(createChannel(i));
    }
}

function getChannel(id) {
    return channels[id - 1];
}

function normalizeTestTypeId(testTypeId) {
    if (testTypeId == null || testTypeId === '') return null;
    const normalized = Number(testTypeId);
    return Number.isFinite(normalized) ? normalized : null;
}

function getTestTypeById(testTypeId) {
    const normalizedId = normalizeTestTypeId(testTypeId);
    if (normalizedId == null) return null;
    return TEST_TYPES.find(testType => testType.id === normalizedId) || null;
}

function getDefaultManualTestType() {
    return TEST_TYPES[0] || null;
}

function normalizeLoadedCassetteType(cassetteType) {
    switch (cassetteType) {
        case '2BC':
            return '3L';
        case '3BTC':
            return '4L';
        case '4BTCS':
            return '4L';
        default:
            return cassetteType || null;
    }
}

function getQrPrefillTestType(cassetteTypeHint) {
    if (!cassetteTypeHint) return null;

    const hint = String(cassetteTypeHint).toUpperCase();
    const matchers = {
        '2BC': (name) => name.includes('2BC'),
        '3BTC': (name) => name.includes('3BTC'),
        '4BTCS': (name) => name.includes('4BTS') || name.includes('4BTC')
    };

    const matcher = matchers[hint];
    if (!matcher) return null;

    return TEST_TYPES.find(testType =>
        testType.qrEnabled && matcher(testType.name.toUpperCase())
    ) || null;
}

function getRecentTestTypes() {
    return recentTestTypeIds
        .map(getTestTypeById)
        .filter(Boolean);
}

function rememberRecentTestType(testTypeId) {
    const normalizedId = normalizeTestTypeId(testTypeId);
    if (!getTestTypeById(normalizedId)) return;
    recentTestTypeIds = [normalizedId, ...recentTestTypeIds.filter(id => id !== normalizedId)].slice(0, 6);
}

function getCurveById(curveId) {
    const normalizedId = normalizeTestTypeId(curveId);
    if (normalizedId == null) return null;
    return savedQuantCurves.find(curve => curve.id === normalizedId) || null;
}

function getCurveSourceLabel(source) {
    if (source === 'qr') return 'QR';
    if (source === 'card') return 'Chip';
    return 'Curve';
}

function getRecentQuantCurves(testTypeId = null) {
    const normalizedTestTypeId = normalizeTestTypeId(testTypeId);
    return recentQuantCurveIds
        .map(getCurveById)
        .filter(curve => curve && (normalizedTestTypeId == null || curve.testTypeId === normalizedTestTypeId))
        .slice(0, 5);
}

function rememberQuantCurve(curveId) {
    const normalizedId = normalizeTestTypeId(curveId);
    if (!getCurveById(normalizedId)) return;
    recentQuantCurveIds = [normalizedId, ...recentQuantCurveIds.filter(id => id !== normalizedId)].slice(0, 10);
}

function getSimulationFamilyHint(testType) {
    const upperName = String(testType?.name || '').toUpperCase();

    if (upperName.includes('2BC')) return '2BC';
    if (upperName.includes('3BTC')) return '3BTC';
    if (upperName.includes('4BTS') || upperName.includes('4BTC')) return '4BTCS';
    if (upperName.includes('3BTS')) return '3BTC';

    if (testType?.lineCount <= 3) return '2BC';
    return '3BTC';
}

function getSimulationInsertOptions() {
    return SIMULATION_TEST_TYPE_IDS
        .map(getTestTypeById)
        .filter(Boolean)
        .map(testType => ({
            id: testType.id,
            familyHint: getSimulationFamilyHint(testType),
            testType,
            label: [testType.name, ...getTestTypeMetaParts(testType)].join(' | ')
        }));
}

function getSimulationOptionById(optionId) {
    const normalizedId = normalizeTestTypeId(optionId);
    return getSimulationInsertOptions().find(option => option.id === normalizedId) || null;
}

function getDefaultCurveForTestType(testTypeId, currentCurveId = null) {
    const selectedCurve = getCurveById(currentCurveId);
    if (selectedCurve && selectedCurve.testTypeId === normalizeTestTypeId(testTypeId)) {
        return selectedCurve;
    }

    return getRecentQuantCurves(testTypeId)[0] || null;
}

function saveQuantCurve({ testTypeId, name, source }) {
    const normalizedTestTypeId = normalizeTestTypeId(testTypeId);
    const selectedTestType = getTestTypeById(normalizedTestTypeId);
    if (!selectedTestType || !selectedTestType.quantitative) return null;

    const curve = {
        id: quantCurveIdCounter++,
        testTypeId: normalizedTestTypeId,
        testTypeName: selectedTestType.name,
        name: String(name || '').trim(),
        source,
        createdAt: new Date().toISOString()
    };

    savedQuantCurves = [curve, ...savedQuantCurves].slice(0, 20);
    rememberQuantCurve(curve.id);
    return curve;
}

function getRequiredTemperature(cassetteType) {
    return TEST_TYPE_CONFIG[cassetteType]?.requiredTemperature ?? null;
}

function getRequiredTemperatureForSelection(testTypeId, cassetteType) {
    const selectedTestType = getTestTypeById(testTypeId);
    if (selectedTestType) {
        return selectedTestType.requiredTemperature;
    }

    return getRequiredTemperature(cassetteType);
}

function getDisplayTestType(testTypeId, cassetteType, allowQrPrefill = false) {
    const selectedTestType = getTestTypeById(testTypeId);
    if (selectedTestType) return selectedTestType;

    if (allowQrPrefill) {
        const qrPrefillType = getQrPrefillTestType(cassetteType);
        if (qrPrefillType) return qrPrefillType;
    }

    const recentTestType = getRecentTestTypes()[0];
    if (recentTestType) return recentTestType;

    if (cassetteType) {
        return {
            id: null,
            name: `${cassetteType} cassette`,
            category: 'Cassette',
            qrEnabled: true,
            quantitative: false,
            lineCount: 0,
            temperature: null,
            temperatureMode: 'none',
            incubationTime: null,
            measurementMethod: 'Qualitative',
            substances: [],
            cassetteType: normalizeLoadedCassetteType(cassetteType),
            requiredTemperature: getRequiredTemperature(cassetteType)
        };
    }

    return getDefaultManualTestType();
}

function getSubstancesForTestType(testTypeId, cassetteType) {
    const selectedTestType = getTestTypeById(testTypeId);
    if (selectedTestType?.substances?.length) {
        return selectedTestType.substances;
    }

    if (cassetteType && SUBSTANCES[cassetteType]) {
        return SUBSTANCES[cassetteType];
    }

    return ['Line 1'];
}

function getSubstanceShortLabel(name) {
    if (SUBSTANCE_SHORT[name]) {
        return SUBSTANCE_SHORT[name];
    }

    if (name.startsWith('Test line ')) {
        return `T${name.replace('Test line ', '')}`;
    }

    const initials = name
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map(part => part[0].toUpperCase())
        .join('');

    return (initials || name.slice(0, 2)).slice(0, 2);
}

function formatIncubationTimeShort(seconds) {
    if (seconds == null) return 'Read';
    if (seconds === 0) return 'Read';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (secs === 0) return `${mins}m`;
    return `${mins}m${secs}s`;
}

function formatTemperatureShort(testType) {
    if (!testType) return '';
    if (testType.requiredTemperature != null) return `${testType.requiredTemperature} C`;
    return '';
}

function getTestTypeMetaParts(testType) {
    if (!testType) return [];

    const parts = [
        testType.category,
        testType.qrEnabled ? 'QR On' : 'QR Off'
    ];

    if (testType.quantitative) {
        parts.push('Quant');
    }

    if (testType.incubationTime != null) {
        if (testType.requiredTemperature != null) {
            parts.push(formatTemperatureShort(testType));
        }
        parts.push(formatIncubationTimeShort(testType.incubationTime));
    }

    return parts;
}

function getTemperatureValidation(testTypeId, cassetteType) {
    const requiredTemperature = getRequiredTemperatureForSelection(testTypeId, cassetteType);
    const currentTemperature = getDeviceTemperatureValue();
    const currentTemperatureLabel = formatDeviceTemperatureLabel();
    const bypassed = !isIncubationEnabled();

    if (requiredTemperature === null) {
        return {
            ok: true,
            bypassed: false,
            currentTemperature,
            currentTemperatureLabel,
            requiredTemperature: null
        };
    }

    if (bypassed) {
        return {
            ok: true,
            bypassed: true,
            currentTemperature,
            currentTemperatureLabel,
            requiredTemperature
        };
    }

    return {
        ok: currentTemperature === requiredTemperature,
        bypassed: false,
        currentTemperature,
        currentTemperatureLabel,
        requiredTemperature
    };
}

// ---- Result Generation ----

function randomBetween(min, max) {
    return min + Math.random() * (max - min);
}

function formatQualitativeMeasuredValue(value) {
    return Number(value).toFixed(2);
}

function formatQuantitativeMeasuredValue(value, quantitativeRange) {
    if (!quantitativeRange) return String(Math.round(value));

    if (value < quantitativeRange.measurableRangeMin) {
        return `< ${quantitativeRange.measurableRangeMin}`;
    }

    if (value > quantitativeRange.measurableRangeMax) {
        return `> ${quantitativeRange.measurableRangeMax}`;
    }

    return String(Math.round(value));
}

function getQuantitativeResultForValue(value, quantitativeRange) {
    if (!quantitativeRange) {
        return value > 0 ? 'positive' : 'negative';
    }

    return value > quantitativeRange.negativeRangeMax ? 'positive' : 'negative';
}

function generateQualitativeSubstanceResult(name, forcedResult = null) {
    const result = forcedResult || (Math.random() > 0.5 ? 'positive' : 'negative');
    const measuredValue = result === 'positive'
        ? randomBetween(0.52, DEFAULT_QUALITATIVE_THRESHOLDS.positiveMax - 0.02)
        : randomBetween(DEFAULT_QUALITATIVE_THRESHOLDS.negativeMin + 0.02, 1.55);

    return {
        name,
        result,
        measuredValue,
        displayValue: formatQualitativeMeasuredValue(measuredValue)
    };
}

function generateQuantitativeSubstanceResult(name, selectedTestType, outcome) {
    const quantitativeRange = selectedTestType?.quantitativeRange || null;
    let measuredValue = 0;

    if (outcome === 'positive') {
        measuredValue = Math.random() > 0.35
            ? randomBetween((quantitativeRange?.negativeRangeMax || 50) + 5, (quantitativeRange?.measurableRangeMax || 150) - 5)
            : randomBetween((quantitativeRange?.measurableRangeMax || 150) + 5, (quantitativeRange?.measurableRangeMax || 150) + 35);
    } else {
        measuredValue = Math.random() > 0.35
            ? randomBetween((quantitativeRange?.negativeRangeMin || 15) + 1, (quantitativeRange?.negativeRangeMax || 50) - 3)
            : randomBetween(4, (quantitativeRange?.measurableRangeMin || 15) - 1);
    }

    return {
        name,
        result: getQuantitativeResultForValue(measuredValue, quantitativeRange),
        measuredValue,
        displayValue: formatQuantitativeMeasuredValue(measuredValue, quantitativeRange)
    };
}

function generateSubstanceResults(testTypeId, cassetteType, outcome) {
    const subs = getSubstancesForTestType(testTypeId, cassetteType);
    const selectedTestType = getTestTypeById(testTypeId);

    if (selectedTestType?.quantitative) {
        return subs.map(name => generateQuantitativeSubstanceResult(name, selectedTestType, outcome));
    }

    if (outcome === 'negative') {
        return subs.map(name => generateQualitativeSubstanceResult(name, 'negative'));
    }

    const results = subs.map((name, i) =>
        generateQualitativeSubstanceResult(name, i === 0 ? 'positive' : (Math.random() > 0.6 ? 'positive' : 'negative'))
    );

    // Ensure at least one positive
    if (!results.some(r => r.result === 'positive')) {
        results[0] = generateQualitativeSubstanceResult(results[0].name, 'positive');
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
    ch.loadedTestTypeId = null;
    ch.testTypeId = null;
    ch.testTypeName = '';
    ch.curveId = null;
    ch.curveName = '';
    ch.curveSource = '';
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
        testTypeId: ch.testTypeId,
        testTypeName: ch.testTypeName,
        curveId: ch.curveId,
        curveName: ch.curveName,
        curveSource: ch.curveSource,
        cassetteType: ch.cassetteType,
        route: ch.route,
        operatorId: ch.operatorId,
        result: finalResult,
        testCount: ch.testResults.length,
        tests: ch.testResults.map(tr => ({
            testNumber: tr.testNumber,
            overall: tr.overall,
            cassetteType: tr.cassetteType,
            substances: tr.substances.map(s => ({
                name: s.name,
                result: s.result,
                measuredValue: s.measuredValue,
                displayValue: s.displayValue
            }))
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
