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
const RECENT_SAMPLE_IDS = ['S-1042', 'BULK-17', 'LOT-883', 'SHIFT-B'];
const RECENT_OPERATORS = ['OP-001', 'OP-042', 'OP-103'];
const PRELOADED_QUANT_CURVES = [
    { id: 501, testTypeId: 20, name: '25022811', source: 'qr', createdAt: '2026-02-28T08:15:00.000Z' },
    { id: 502, testTypeId: 20, name: '25022522', source: 'card', createdAt: '2026-02-25T09:40:00.000Z' },
    { id: 503, testTypeId: 20, name: '25022213', source: 'qr', createdAt: '2026-02-22T13:05:00.000Z' },
    { id: 504, testTypeId: 20, name: '25021824', source: 'card', createdAt: '2026-02-18T16:20:00.000Z' },
    { id: 505, testTypeId: 20, name: '25021415', source: 'qr', createdAt: '2026-02-14T07:50:00.000Z' }
];
const SIMULATION_TEST_TYPE_IDS = [43, 37, 8, 20, 57];
const HISTORY_ANNOTATION_LABELS = {
    original: 'Original',
    rejected: 'Rejected',
    first_confirmation: 'First Confirmation',
    second_confirmation: 'Second Confirmation',
    animal_control: 'Animal Control',
    positive_control: 'Positive Control'
};
const SETTINGS_PASSWORD = '2026';
const DEFAULT_SITE_TEST_TYPE_IDS = [8, 17, 18, 19, 20, 23, 25, 37, 40, 43, 45, 53, 57];
const DEFAULT_LANGUAGE_OPTIONS = [
    'English',
    'French (France)',
    'German (Germany)',
    'Spanish (Spain)',
    'Portuguese (Portugal)',
    'Russian',
    'Hungarian',
    'Italian',
    'Slovak',
    'Ukrainian',
    'Polish',
    'Danish',
    'Estonian',
    'Lithuanian',
    'Greek',
    'Finnish'
];
const DEFAULT_TIMEZONE_OPTIONS = (
    typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('timeZone')
        : [
            'UTC',
            'Europe/Prague',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'America/New_York',
            'America/Chicago',
            'America/Denver',
            'America/Los_Angeles',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Australia/Sydney'
        ]
).slice().sort((left, right) => left.localeCompare(right));
const DEFAULT_CLOUD_USERNAME = 'milk_tester';
const DEFAULT_CLOUD_PASSWORD = '2026';
const CURRENT_SOFTWARE_VERSION = '1.5.677';
const LATEST_SOFTWARE_VERSION = '1.6.102';
const DEVICE_SERIAL_NUMBER = 'MS5P-260323-0142';
const LAN_MAC_ADDRESS = '00:1B:44:11:3A:B7';
const WLAN_MAC_ADDRESS = '3C:52:82:4F:91:2D';
const SCREEN_BRIGHTNESS_FILTERS = [0.55, 0.65, 0.75, 0.85, 0.95, 1.05, 1.15];
const VERIFICATION_TEMPERATURE_TOLERANCE = 2;
const VERIFICATION_LIGHT_INTENSITY_MIN = 500000;
const VERIFICATION_RATIO_RANGE = {
    min: 0.9,
    max: 1.1
};
const VERIFICATION_LINE_NAMES = [
    'Control line',
    'Test line 1',
    'Test line 2',
    'Test line 3'
];
const DEFAULT_WIFI_NETWORKS = [
    { ssid: 'MilkSafe Factory', security: 'WPA2', signal: 'Excellent', password: '2026' },
    { ssid: 'MilkSafe QA Lab', security: 'WPA2', signal: 'Excellent', password: '2026' },
    { ssid: 'Office Wi-Fi', security: 'WPA2', signal: 'Good', password: '2026' },
    { ssid: 'Packaging Hall', security: 'WPA2', signal: 'Good', password: '2026' },
    { ssid: 'Warehouse Mesh', security: 'WPA2', signal: 'Fair', password: '2026' },
    { ssid: 'Service Reader', security: 'WPA2', signal: 'Excellent', password: '2026' },
    { ssid: 'Maintenance AP', security: 'WPA2', signal: 'Fair', password: '2026' },
    { ssid: 'Milk Collection', security: 'WPA2', signal: 'Good', password: '2026' },
    { ssid: 'Quality Floor 1', security: 'WPA2', signal: 'Good', password: '2026' },
    { ssid: 'Quality Floor 2', security: 'WPA2', signal: 'Fair', password: '2026' },
    { ssid: 'Reader Backup', security: 'WPA2', signal: 'Weak', password: '2026' },
    { ssid: 'Lab Guest', security: 'WPA2', signal: 'Weak', password: '2026' }
];
const DEFAULT_CHANNEL_VERIFICATION_COUNTS = {
    1: 184,
    2: 251,
    3: 96,
    4: 228,
    5: 61
};

function createDefaultAccountState() {
    return {
        signedIn: false,
        name: DEFAULT_CLOUD_USERNAME,
        username: DEFAULT_CLOUD_USERNAME,
        siteName: 'Prague Dairy',
        anonymousBacklog: 2
    };
}

function createDefaultDeviceSettings() {
    return {
        microswitchEnabled: true,
        qrScanningEnabled: true,
        deviceTemperature: 40,
        curveScannerConnected: true,
        storageCardMounted: true,
        printerEnabled: true,
        printerName: 'Thermal Printer',
        commentsEnabled: true,
        sampleIdEnabled: true,
        operatorIdEnabled: true,
        limsEnabled: true,
        soundEnabled: true,
        language: 'English',
        timezone: 'UTC',
        connectivity: 'offline',
        wifiNetwork: '',
        ethernetConnected: false,
        verificationThreshold: 250,
        verificationCounts: { ...DEFAULT_CHANNEL_VERIFICATION_COUNTS },
        testSelectionMode: 'all',
        softwareVersion: CURRENT_SOFTWARE_VERSION,
        screenBrightnessStep: 5,
        deviceDateTimeIso: new Date().toISOString(),
        dateTimeSetAt: new Date().toISOString()
    };
}

function createDefaultPrototypeRuntime() {
    return {
        onboardingCompleted: false,
        lastHistoryActionMessage: '',
        pendingSettingsFocus: '',
        settingsAccessUnlocked: false,
        pendingProtectedSettingsTarget: null,
        settingsPasswordReturnModal: null
    };
}

const PASSWORD_FREE_SETTINGS_ITEM_IDS = new Set([
    'set-temperature',
    'open-verification',
    'open-verification-history',
    'open-connectivity',
    'open-brightness',
    'open-curve-loader',
    'open-about'
]);

function isSettingsItemPasswordProtected(itemId) {
    return !PASSWORD_FREE_SETTINGS_ITEM_IDS.has(String(itemId || ''));
}

function isSettingsAccessUnlocked() {
    return Boolean(prototypeRuntime.settingsAccessUnlocked);
}

function canAccessSettingsItem(itemId) {
    return !isSettingsItemPasswordProtected(itemId) || isSettingsAccessUnlocked();
}

function resetSettingsAccessSession() {
    prototypeRuntime.settingsAccessUnlocked = false;
    prototypeRuntime.pendingProtectedSettingsTarget = null;
    prototypeRuntime.settingsPasswordReturnModal = null;
}

// ---- Global State ----

let channels = [];
let activeModal = null;   // {type: 'config'|'decision'|'detail', channelId, data}
let historyScreenState = null;
let modalQueue = [];       // Queued modal events
let usedCassetteIds = new Set();
let cassetteIdCounter = 1;
let sessionHistory = [];
let historyEntryIdCounter = 1;
let verificationHistory = [];
let verificationEntryIdCounter = 1;
let recentTestTypeIds = [];
let savedQuantCurves = PRELOADED_QUANT_CURVES.map(curve => ({ ...curve }));
let recentQuantCurveIds = savedQuantCurves.map(curve => curve.id);
let quantCurveIdCounter = Math.max(...savedQuantCurves.map(curve => curve.id)) + 1;
let activeAccount = createDefaultAccountState();
let deviceSettings = createDefaultDeviceSettings();
let prototypeRuntime = createDefaultPrototypeRuntime();
let siteEnabledTestTypeIds = DEFAULT_SITE_TEST_TYPE_IDS.slice();
let anonymousEnabledTestTypeIds = TEST_TYPES.map(testType => testType.id);

function isSignedIn() {
    return activeAccount.signedIn;
}

function isAnonymousSession() {
    return !isSignedIn();
}

function getActiveAccountLabel() {
    return isSignedIn() ? activeAccount.username : 'Anonymous';
}

function getCurrentEnabledTestTypeIds() {
    return isSignedIn() ? siteEnabledTestTypeIds : anonymousEnabledTestTypeIds;
}

function isTestTypeEnabledForCurrentUser(testTypeId) {
    const normalizedId = normalizeTestTypeId(testTypeId);
    if (normalizedId == null) return false;
    return getCurrentEnabledTestTypeIds().includes(normalizedId);
}

function isFastQrOnlyMode() {
    return deviceSettings.testSelectionMode === 'fast_qr_only';
}

function getConnectivityLabel(connection = deviceSettings.connectivity) {
    if (connection === 'wifi') {
        return deviceSettings.wifiNetwork ? `Wi-Fi ${deviceSettings.wifiNetwork}` : 'Wi-Fi';
    }
    if (connection === 'ethernet') return 'Ethernet';
    return 'Offline';
}

function getDefaultWifiNetworkName() {
    return DEFAULT_WIFI_NETWORKS[0]?.ssid || '';
}

function getWifiNetworkBySsid(ssid) {
    return DEFAULT_WIFI_NETWORKS.find(network => network.ssid === ssid) || null;
}

function getCloudCredentialHint() {
    return `${DEFAULT_CLOUD_USERNAME} / ${DEFAULT_CLOUD_PASSWORD}`;
}

function isCloudCredentialValid(username, password) {
    return String(username || '').trim() === DEFAULT_CLOUD_USERNAME &&
        String(password || '').trim() === DEFAULT_CLOUD_PASSWORD;
}

function compareSoftwareVersions(left, right) {
    const leftParts = String(left || '').split('.').map(part => Number(part) || 0);
    const rightParts = String(right || '').split('.').map(part => Number(part) || 0);
    const maxLength = Math.max(leftParts.length, rightParts.length);

    for (let index = 0; index < maxLength; index += 1) {
        const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
        if (delta > 0) return 1;
        if (delta < 0) return -1;
    }

    return 0;
}

function getVerificationCountForChannel(channelId) {
    return Number(deviceSettings.verificationCounts?.[channelId] || 0);
}

function incrementVerificationCount(channelId) {
    deviceSettings.verificationCounts[channelId] = getVerificationCountForChannel(channelId) + 1;
}

function resetVerificationCount(channelId) {
    deviceSettings.verificationCounts[channelId] = 0;
}

function getVerificationWarningChannels(thresholdValue = deviceSettings.verificationThreshold) {
    const threshold = Number(thresholdValue || 250);
    return channels
        .map(channel => ({
            id: channel.id,
            count: getVerificationCountForChannel(channel.id),
            threshold
        }))
        .filter(item => item.count > item.threshold);
}

function getVerificationOutstandingCount(thresholdValue = deviceSettings.verificationThreshold) {
    return getVerificationWarningChannels(thresholdValue).length;
}

function getVerificationSummaryLabel(thresholdValue = deviceSettings.verificationThreshold) {
    const outstandingCount = getVerificationOutstandingCount(thresholdValue);
    return outstandingCount > 0 ? `${outstandingCount} / ${channels.length} Outstanding` : 'All Clear';
}

function getSelectedTimezone() {
    return deviceSettings.timezone || 'UTC';
}

function normalizeScreenBrightnessStep(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return 5;
    return Math.min(7, Math.max(1, Math.round(parsedValue)));
}

function getScreenBrightnessStep(value = deviceSettings.screenBrightnessStep) {
    return normalizeScreenBrightnessStep(value);
}

function getScreenBrightnessFilterValue(step = deviceSettings.screenBrightnessStep) {
    const normalizedStep = getScreenBrightnessStep(step);
    return SCREEN_BRIGHTNESS_FILTERS[normalizedStep - 1] || 1;
}

function getScreenBrightnessLabel(step = deviceSettings.screenBrightnessStep) {
    return `${getScreenBrightnessStep(step)} / 7`;
}

function getTimeZoneDateParts(date, timeZone = getSelectedTimezone()) {
    const safeDate = date instanceof Date ? date : new Date(date);
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });
    const parts = formatter.formatToParts(safeDate).reduce((accumulator, part) => {
        if (part.type !== 'literal') {
            accumulator[part.type] = part.value;
        }
        return accumulator;
    }, {});

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute)
    };
}

function getDeviceNow() {
    const baseIso = deviceSettings.deviceDateTimeIso || new Date().toISOString();
    const setAtIso = deviceSettings.dateTimeSetAt || baseIso;
    const baseMs = Date.parse(baseIso);
    const setAtMs = Date.parse(setAtIso);
    const elapsedMs = Number.isFinite(baseMs) && Number.isFinite(setAtMs)
        ? Math.max(Date.now() - setAtMs, 0)
        : 0;
    return new Date((Number.isFinite(baseMs) ? baseMs : Date.now()) + elapsedMs);
}

function formatDeviceDateInputValue(date = getDeviceNow(), timeZone = getSelectedTimezone()) {
    const parts = getTimeZoneDateParts(date, timeZone);
    return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function formatDeviceTimeInputValue(date = getDeviceNow(), timeZone = getSelectedTimezone()) {
    const parts = getTimeZoneDateParts(date, timeZone);
    return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
}

function formatDeviceDateLabel(date = getDeviceNow(), timeZone = getSelectedTimezone()) {
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone
    });
}

function formatDeviceTimeLabel(date = getDeviceNow(), timeZone = getSelectedTimezone()) {
    return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZone
    });
}

function buildDeviceDateTimeIso(dateValue, timeValue, timeZone = getSelectedTimezone()) {
    const [year, month, day] = String(dateValue || '').split('-').map(Number);
    const [hour, minute] = String(timeValue || '').split(':').map(Number);
    if ([year, month, day, hour, minute].some(value => !Number.isFinite(value))) {
        return new Date().toISOString();
    }

    const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    const actual = getTimeZoneDateParts(utcGuess, timeZone);
    const desiredMs = Date.UTC(year, month - 1, day, hour, minute, 0);
    const actualMs = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, 0);
    return new Date(utcGuess.getTime() + (desiredMs - actualMs)).toISOString();
}

function buildOnboardingDraftFromState() {
    const onboardingCompleted = Boolean(prototypeRuntime.onboardingCompleted);
    const defaultWifiNetwork = deviceSettings.wifiNetwork || getDefaultWifiNetworkName();
    const defaultWifiPassword = getWifiNetworkBySsid(defaultWifiNetwork)?.password || SETTINGS_PASSWORD;
    return {
        language: deviceSettings.language,
        screenBrightnessStep: getScreenBrightnessStep(),
        soundEnabled: deviceSettings.soundEnabled,
        timezone: getSelectedTimezone(),
        dateInput: formatDeviceDateInputValue(),
        timeInput: formatDeviceTimeInputValue(),
        connectivity: deviceSettings.connectivity,
        wifiNetwork: deviceSettings.wifiNetwork,
        wifiPassword: defaultWifiPassword,
        wifiStage: deviceSettings.connectivity === 'wifi' && deviceSettings.wifiNetwork ? 'wifi_success' : 'mode',
        wifiError: '',
        accountMode: onboardingCompleted ? (isSignedIn() ? 'signed_in' : 'anonymous') : 'anonymous',
        username: activeAccount.username,
        password: DEFAULT_CLOUD_PASSWORD,
        signInState: onboardingCompleted && isSignedIn() ? 'success' : 'idle',
        signInError: ''
    };
}

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

function isCassetteInsertionCheckEnabled() {
    return deviceSettings.microswitchEnabled;
}

function isCassetteInsertionBypassed() {
    return !isCassetteInsertionCheckEnabled();
}

function hasInsertedCassette(ch) {
    return Boolean(ch && ch.physicalCassettePresent && ch.loadedCassetteId !== null);
}

function hasFreshConfirmationCassette(ch) {
    return hasInsertedCassette(ch) &&
           ch.currentTestNumber > 0 &&
           !usedCassetteIds.has(ch.loadedCassetteId);
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
        accountMode: 'signed_in',
        sampleId: '',
        userName: '',
        operatorId: '',
        comment: '',
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
    sessionHistory = buildMockHistory();
    historyEntryIdCounter = sessionHistory.reduce((maxId, entry) => Math.max(maxId, entry.historyId || 0), 0) + 1;
    verificationHistory = buildMockVerificationHistory();
    verificationEntryIdCounter = verificationHistory.reduce((maxId, entry) => Math.max(maxId, entry.verificationId || 0), 0) + 1;
    recentTestTypeIds = DEFAULT_RECENT_TEST_TYPE_IDS.filter(id => TEST_TYPES.some(tt => tt.id === id));
    savedQuantCurves = PRELOADED_QUANT_CURVES.map(curve => ({ ...curve }));
    recentQuantCurveIds = savedQuantCurves.map(curve => curve.id);
    quantCurveIdCounter = Math.max(...savedQuantCurves.map(curve => curve.id)) + 1;
    cassetteIdCounter = 1;
    for (let i = 1; i <= 5; i++) {
        channels.push(createChannel(i));
    }
}

function getActiveUserName() {
    return isSignedIn() ? activeAccount.username : '';
}

function nextHistoryEntryId() {
    return historyEntryIdCounter++;
}

function nextVerificationEntryId() {
    return verificationEntryIdCounter++;
}

function getScenarioLabel(scenario) {
    switch (scenario) {
        case 'pos_control':
            return 'Positive Control';
        case 'animal_control':
            return 'Animal Control';
        default:
            return 'Test Flow';
    }
}

function getHistoryAnnotationForTest(scenario, testNumber) {
    if (scenario === 'pos_control') return 'positive_control';
    if (scenario === 'animal_control') return 'animal_control';
    if (testNumber === 2) return 'first_confirmation';
    if (testNumber === 3) return 'second_confirmation';
    return 'original';
}

function getHistoryAnnotationLabel(annotation) {
    return HISTORY_ANNOTATION_LABELS[annotation] || 'Original';
}

function buildLightIntensitySeries({ seed = 0, positive = false, quantitative = false } = {}) {
    const points = [];
    const totalPoints = 32;
    const baseAmplitude = positive ? 13.5 : 9.5;
    const amplitude = quantitative ? baseAmplitude + 2.5 : baseAmplitude;
    const baseline = quantitative ? 46 : 48;
    const phase = seed * 0.37;

    for (let index = 0; index < totalPoints; index++) {
        const angle = (index / (totalPoints - 1)) * Math.PI * 2.2;
        const envelope = 0.84 + Math.sin((index / (totalPoints - 1)) * Math.PI) * 0.16;
        const ripple = Math.sin(angle * 2.4 + phase) * (positive ? 1.6 : 1.1);
        const value = baseline + Math.sin(angle + phase) * amplitude * envelope + ripple;
        points.push(Number(value.toFixed(2)));
    }

    return points;
}

function formatVerificationTemperature(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return '--';
    return `${parsedValue.toFixed(1)} C`;
}

function formatVerificationLightIntensity(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return '--';
    return parsedValue.toLocaleString('en-GB');
}

function formatVerificationRatioValue(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return '--';
    return parsedValue.toFixed(2);
}

function isVerificationTemperaturePass(targetTemperature, measuredTemperature) {
    const target = Number(targetTemperature);
    const measured = Number(measuredTemperature);
    if (!Number.isFinite(target) || !Number.isFinite(measured)) return false;
    return Math.abs(measured - target) <= VERIFICATION_TEMPERATURE_TOLERANCE;
}

function isVerificationRatioPass(value) {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return false;
    return parsedValue >= VERIFICATION_RATIO_RANGE.min && parsedValue <= VERIFICATION_RATIO_RANGE.max;
}

function buildMockVerificationLineRatios({ seed = 0, failingIndex = -1 } = {}) {
    return VERIFICATION_LINE_NAMES.map((name, index) => {
        const baseOffset = (((seed + index) % 5) - 2) * 0.02;
        const value = index === failingIndex
            ? (index % 2 === 0 ? 1.14 : 0.86)
            : (1 + baseOffset);
        const normalizedValue = Number(value.toFixed(2));
        return {
            name,
            value: normalizedValue,
            pass: isVerificationRatioPass(normalizedValue)
        };
    });
}

function createVerificationRecord({
    verificationId = nextVerificationEntryId(),
    verificationSource = 'archive',
    channelId = 1,
    targetTemperature = 40,
    measuredTemperature = 40,
    lightIntensity = 548320,
    lightIntensitySeries = [],
    lineRatios = [],
    accountMode = isSignedIn() ? 'signed_in' : 'anonymous',
    userName = getActiveUserName(),
    siteName = activeAccount.siteName,
    synced = false,
    timestamp = new Date().toISOString()
} = {}) {
    const resolvedTargetTemperature = Number(targetTemperature) === 50 ? 50 : 40;
    const resolvedMeasuredTemperature = Number.isFinite(Number(measuredTemperature))
        ? Number(Number(measuredTemperature).toFixed(1))
        : resolvedTargetTemperature;
    const resolvedLightIntensity = Number.isFinite(Number(lightIntensity))
        ? Math.round(Number(lightIntensity))
        : VERIFICATION_LIGHT_INTENSITY_MIN;
    const normalizedLineRatios = (Array.isArray(lineRatios) && lineRatios.length > 0
        ? lineRatios
        : buildMockVerificationLineRatios({ seed: Number(verificationId) || channelId || 0 }))
        .map(line => {
            const value = Number.isFinite(Number(line.value)) ? Number(Number(line.value).toFixed(2)) : 1;
            return {
                name: line.name || 'Line',
                value,
                pass: isVerificationRatioPass(value)
            };
        });
    const resolvedAccountMode = accountMode === 'anonymous' ? 'anonymous' : 'signed_in';
    const resolvedUserName = resolvedAccountMode === 'anonymous'
        ? ''
        : (String(userName || activeAccount.username || DEFAULT_CLOUD_USERNAME).trim() || DEFAULT_CLOUD_USERNAME);
    const resolvedSiteName = resolvedAccountMode === 'anonymous'
        ? 'Anonymous Data site'
        : (String(siteName || activeAccount.siteName || 'Prague Dairy').trim() || 'Prague Dairy');
    const canUseSyncedState = resolvedAccountMode === 'signed_in' && Boolean(synced);
    const temperaturePass = isVerificationTemperaturePass(resolvedTargetTemperature, resolvedMeasuredTemperature);
    const lightIntensityPass = resolvedLightIntensity >= VERIFICATION_LIGHT_INTENSITY_MIN;
    const ratioPass = normalizedLineRatios.every(line => line.pass);
    const overallPass = temperaturePass && lightIntensityPass && ratioPass;
    const numericVerificationId = Number(verificationId);
    const seedBase = Number.isFinite(numericVerificationId)
        ? numericVerificationId
        : (Number(channelId) || 0) + 310;

    return {
        verificationId,
        verificationKey: `${verificationSource === 'live' ? 'verification-live' : 'verification'}-${verificationId}`,
        verificationSource,
        channelId: Number(channelId) || 1,
        targetTemperature: resolvedTargetTemperature,
        measuredTemperature: resolvedMeasuredTemperature,
        temperatureDelta: Number(Math.abs(resolvedMeasuredTemperature - resolvedTargetTemperature).toFixed(1)),
        temperaturePass,
        lightIntensity: resolvedLightIntensity,
        lightIntensityMinimum: VERIFICATION_LIGHT_INTENSITY_MIN,
        lightIntensityPass,
        lightIntensitySeries: Array.isArray(lightIntensitySeries) && lightIntensitySeries.length > 1
            ? [...lightIntensitySeries]
            : buildLightIntensitySeries({
                seed: seedBase * 5,
                positive: !overallPass,
                quantitative: false
            }).map(point => Number((resolvedLightIntensity / 10000 + point * 1800).toFixed(0))),
        lineRatios: normalizedLineRatios,
        ratioPass,
        overallPass,
        status: overallPass ? 'passed' : 'failed',
        accountMode: resolvedAccountMode,
        userName: resolvedUserName,
        siteName: resolvedSiteName,
        synced: canUseSyncedState,
        uploadStatus: canUseSyncedState ? 'synced' : 'not_synced',
        timestamp
    };
}

function buildMockSubstancesForTestType(testTypeId, cassetteType, outcome, variantIndex = 0) {
    const selectedTestType = getTestTypeById(testTypeId);
    const substances = getSubstancesForTestType(testTypeId, cassetteType);
    const positiveIndex = variantIndex % Math.max(substances.length, 1);

    if (outcome === 'invalid') {
        return substances.map(name => ({
            name,
            result: 'invalid',
            measuredValue: null,
            displayValue: '--'
        }));
    }

    if (selectedTestType?.quantitative) {
        const quantitativeRange = selectedTestType.quantitativeRange || null;
        const baseValue = outcome === 'positive'
            ? (quantitativeRange?.negativeRangeMax || 50) + 18 + variantIndex * 4
            : (quantitativeRange?.negativeRangeMin || 15) + 10 + variantIndex * 3;

        return substances.map((name, index) => {
            const measuredValue = baseValue + index * 4;
            return {
                name,
                result: getQuantitativeResultForValue(measuredValue, quantitativeRange),
                measuredValue,
                displayValue: formatQuantitativeMeasuredValue(measuredValue, quantitativeRange)
            };
        });
    }

    return substances.map((name, index) => {
        const result = outcome === 'positive' && (index === positiveIndex || index === 0)
            ? 'positive'
            : 'negative';
        const measuredValue = result === 'positive'
            ? 0.72 + index * 0.04 + variantIndex * 0.02
            : 1.17 + index * 0.08 + variantIndex * 0.03;

        return {
            name,
            result,
            measuredValue,
            displayValue: formatQualitativeMeasuredValue(measuredValue)
        };
    });
}

function getOverallResultFromSubstances(substanceResults = []) {
    if (!Array.isArray(substanceResults) || substanceResults.length === 0) {
        return 'invalid';
    }

    if (substanceResults.some(result => result?.result === 'invalid')) {
        return 'invalid';
    }

    return substanceResults.some(result => result?.result === 'positive')
        ? 'positive'
        : 'negative';
}

function getRecordedTestOverall(testResult) {
    if (!testResult) return null;
    if (typeof testResult === 'string') return testResult;
    return testResult.overall || getOverallResultFromSubstances(testResult.substances);
}

function createHistoryFlowRecord({
    historyId = nextHistoryEntryId(),
    historySource = 'archive',
    channelId = null,
    reason = 'seed',
    scenario = 'test',
    testTypeId = null,
    testTypeName = '',
    curveId = null,
    curveName = '',
    curveSource = '',
    cassetteType = null,
    sampleId = '',
    userName = '',
    operatorId = '',
    accountMode = userName ? 'signed_in' : 'anonymous',
    comment = '',
    commentUpdatedAt = '',
    processing = 'read_only',
    result = null,
    synced = false,
    flowId = null,
    timestamp = new Date().toISOString(),
    tests = []
} = {}) {
    const resolvedAccountMode = accountMode === 'anonymous' ? 'anonymous' : 'signed_in';
    const numericHistoryId = Number(historyId);
    const seedBase = Number.isFinite(numericHistoryId)
        ? numericHistoryId
        : (Number(channelId) || 0) + 90;
    const normalizedTests = tests.map((test, index) => {
        const testNumber = test.testNumber || index + 1;
        const resolvedTestTypeId = normalizeTestTypeId(test.testTypeId ?? testTypeId);
        const resolvedTestType = getTestTypeById(resolvedTestTypeId);
        const resolvedCassetteType = test.cassetteType || cassetteType || resolvedTestType?.cassetteType || null;
        const substances = (test.substances && test.substances.length > 0)
            ? test.substances.map(substance => ({ ...substance }))
            : buildMockSubstancesForTestType(
                resolvedTestTypeId,
                resolvedCassetteType,
                test.overall || 'negative',
                testNumber - 1
            );
        const overall = getRecordedTestOverall({
            overall: test.overall || null,
            substances
        }) || 'negative';

        return {
            testNumber,
            overall,
            annotation: test.annotation || getHistoryAnnotationForTest(scenario, testNumber),
            timestamp: test.timestamp || timestamp,
            cassetteType: resolvedCassetteType,
            testTypeId: resolvedTestTypeId,
            testTypeName: test.testTypeName || testTypeName || resolvedTestType?.name || '',
            lightIntensity: Array.isArray(test.lightIntensity) && test.lightIntensity.length > 0
                ? [...test.lightIntensity]
                : buildLightIntensitySeries({
                    seed: seedBase * 10 + testNumber,
                    positive: overall === 'positive',
                    quantitative: Boolean(resolvedTestType?.quantitative)
                }),
            substances
        };
    });

    const lastTimestamp = normalizedTests[normalizedTests.length - 1]?.timestamp || timestamp;
    const resolvedResult = result || normalizedTests[normalizedTests.length - 1]?.overall || null;
    const canUseBackendFlowId = resolvedAccountMode === 'signed_in' && Boolean(synced);

    return {
        historyId,
        historyKey: historySource === 'live' ? `live-${channelId}` : `history-${historyId}`,
        historySource,
        channelId,
        reason,
        scenario,
        scenarioLabel: getScenarioLabel(scenario),
        testTypeId: normalizeTestTypeId(testTypeId),
        testTypeName,
        curveId,
        curveName,
        curveSource,
        cassetteType,
        sampleId,
        userName,
        operatorId,
        accountMode: resolvedAccountMode,
        comment: String(comment || '').trim(),
        commentUpdatedAt: commentUpdatedAt || '',
        processing,
        result: resolvedResult,
        synced: canUseBackendFlowId,
        uploadStatus: canUseBackendFlowId ? 'synced' : 'not_synced',
        flowId: canUseBackendFlowId ? flowId : null,
        testCount: normalizedTests.length,
        tests: normalizedTests,
        timestamp: lastTimestamp
    };
}

function buildMockHistory() {
    return [
        createHistoryFlowRecord({
            historyId: 1,
            scenario: 'test',
            channelId: 4,
            testTypeId: 43,
            testTypeName: 'MilkSafe™ FAST 3BTS (2.0)',
            cassetteType: '4L',
            sampleId: 'S-1048',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-042',
            processing: 'read_incubate',
            result: 'positive',
            synced: true,
            flowId: 144577,
            comment: 'Repeat confirmation flow kept because T3 returned positive again.',
            commentUpdatedAt: '2026-03-18T09:02:00.000Z',
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-18T08:42:00.000Z' },
                { testNumber: 2, overall: 'negative', timestamp: '2026-03-18T08:49:00.000Z' },
                { testNumber: 3, overall: 'positive', timestamp: '2026-03-18T08:56:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 2,
            scenario: 'test',
            channelId: 2,
            testTypeId: 37,
            testTypeName: 'MilkSafe™ FAST 3BTC (2.0) Read',
            cassetteType: '4L',
            sampleId: 'S-1047',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-001',
            processing: 'read_only',
            result: 'negative',
            synced: true,
            flowId: 144576,
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-18T07:14:00.000Z' },
                { testNumber: 2, overall: 'negative', timestamp: '2026-03-18T07:21:00.000Z' },
                { testNumber: 3, overall: 'negative', timestamp: '2026-03-18T07:28:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 3,
            scenario: 'animal_control',
            channelId: 5,
            testTypeId: 57,
            testTypeName: 'Bioeasy 3IN1 BST',
            cassetteType: '3L',
            sampleId: 'AN-023',
            userName: '',
            operatorId: 'OP-103',
            accountMode: 'anonymous',
            processing: 'read_only',
            result: 'negative',
            synced: false,
            tests: [
                { testNumber: 1, overall: 'negative', timestamp: '2026-03-18T06:33:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 9,
            scenario: 'pos_control',
            channelId: 3,
            testTypeId: 37,
            testTypeName: 'MilkSafe™ FAST 3BTC (2.0) Read',
            cassetteType: '4L',
            sampleId: 'PC-224',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-001',
            processing: 'read_only',
            result: 'positive',
            synced: false,
            comment: 'Control strip stored for review before the next production shift.',
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-18T05:48:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 4,
            scenario: 'pos_control',
            channelId: 1,
            testTypeId: 43,
            testTypeName: 'MilkSafe™ FAST 3BTS (2.0)',
            cassetteType: '4L',
            sampleId: 'PC-221',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-042',
            processing: 'read_incubate',
            result: 'positive',
            synced: true,
            flowId: 144575,
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-17T14:20:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 10,
            scenario: 'animal_control',
            channelId: 4,
            testTypeId: 43,
            testTypeName: 'MilkSafe™ FAST 3BTS (2.0)',
            cassetteType: '4L',
            sampleId: 'AN-024',
            userName: '',
            operatorId: 'OP-042',
            processing: 'read_incubate',
            result: 'negative',
            synced: true,
            flowId: 144574,
            tests: [
                { testNumber: 1, overall: 'negative', timestamp: '2026-03-17T16:42:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 5,
            scenario: 'test',
            channelId: 3,
            testTypeId: 20,
            testTypeName: 'MilkSafe™ Afla M1',
            cassetteType: '1L',
            sampleId: 'AF-022',
            userName: '',
            operatorId: 'OP-001',
            accountMode: 'anonymous',
            processing: 'read_only',
            result: 'negative',
            synced: false,
            tests: [
                { testNumber: 1, overall: 'negative', timestamp: '2026-03-17T11:08:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 6,
            scenario: 'test',
            channelId: 2,
            testTypeId: 43,
            testTypeName: 'MilkSafe™ FAST 3BTS (2.0)',
            cassetteType: '4L',
            sampleId: 'S-1043',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-103',
            processing: 'read_incubate',
            result: 'inconclusive',
            synced: false,
            comment: 'Cassette changed after first positive. Record left pending for supervisor review.',
            tests: [
                {
                    testNumber: 1,
                    overall: 'positive',
                    annotation: 'rejected',
                    timestamp: '2026-03-17T09:16:00.000Z'
                }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 7,
            scenario: 'test',
            channelId: 4,
            testTypeId: 37,
            testTypeName: 'MilkSafe™ FAST 3BTC (2.0) Read',
            cassetteType: '4L',
            sampleId: 'S-1038',
            userName: '',
            operatorId: 'OP-042',
            accountMode: 'anonymous',
            processing: 'read_only',
            result: 'positive',
            synced: true,
            flowId: 144572,
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-16T15:05:00.000Z' },
                { testNumber: 2, overall: 'positive', timestamp: '2026-03-16T15:11:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 8,
            scenario: 'test',
            channelId: 1,
            testTypeId: 57,
            testTypeName: 'Bioeasy 3IN1 BST',
            cassetteType: '3L',
            sampleId: 'BULK-14',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-001',
            processing: 'read_only',
            result: 'negative',
            synced: true,
            flowId: 144568,
            tests: [
                { testNumber: 1, overall: 'negative', timestamp: '2026-03-16T09:47:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 11,
            scenario: 'pos_control',
            channelId: 5,
            testTypeId: 57,
            testTypeName: 'Bioeasy 3IN1 BST',
            cassetteType: '3L',
            sampleId: 'PC-218',
            userName: DEFAULT_CLOUD_USERNAME,
            operatorId: 'OP-103',
            processing: 'read_only',
            result: 'positive',
            synced: true,
            flowId: 144569,
            tests: [
                { testNumber: 1, overall: 'positive', timestamp: '2026-03-16T12:03:00.000Z' }
            ]
        }),
        createHistoryFlowRecord({
            historyId: 12,
            scenario: 'animal_control',
            channelId: 2,
            testTypeId: 37,
            testTypeName: 'MilkSafe™ FAST 3BTC (2.0) Read',
            cassetteType: '4L',
            sampleId: 'AN-021',
            userName: '',
            operatorId: 'OP-001',
            processing: 'read_only',
            result: 'negative',
            synced: false,
            tests: [
                { testNumber: 1, overall: 'negative', timestamp: '2026-03-15T18:22:00.000Z' }
            ]
        })
    ];
}

function buildMockVerificationHistory() {
    return [
        createVerificationRecord({
            verificationId: 1,
            channelId: 4,
            targetTemperature: 50,
            measuredTemperature: 49.6,
            lightIntensity: 548320,
            lineRatios: buildMockVerificationLineRatios({ seed: 1 }),
            accountMode: 'signed_in',
            userName: DEFAULT_CLOUD_USERNAME,
            siteName: 'Prague Dairy',
            synced: true,
            timestamp: '2026-03-22T10:12:00.000Z'
        }),
        createVerificationRecord({
            verificationId: 2,
            channelId: 2,
            targetTemperature: 40,
            measuredTemperature: 42.4,
            lightIntensity: 537940,
            lineRatios: buildMockVerificationLineRatios({ seed: 2 }),
            accountMode: 'signed_in',
            userName: DEFAULT_CLOUD_USERNAME,
            siteName: 'Prague Dairy',
            synced: false,
            timestamp: '2026-03-21T13:28:00.000Z'
        }),
        createVerificationRecord({
            verificationId: 3,
            channelId: 1,
            targetTemperature: 50,
            measuredTemperature: 50.3,
            lightIntensity: 552410,
            lineRatios: buildMockVerificationLineRatios({ seed: 3, failingIndex: 2 }),
            accountMode: 'signed_in',
            userName: DEFAULT_CLOUD_USERNAME,
            siteName: 'Prague Dairy',
            synced: true,
            timestamp: '2026-03-20T08:46:00.000Z'
        }),
        createVerificationRecord({
            verificationId: 4,
            channelId: 5,
            targetTemperature: 40,
            measuredTemperature: 39.2,
            lightIntensity: 544110,
            lineRatios: buildMockVerificationLineRatios({ seed: 4 }),
            accountMode: 'anonymous',
            synced: false,
            timestamp: '2026-03-19T16:04:00.000Z'
        }),
        createVerificationRecord({
            verificationId: 5,
            channelId: 3,
            targetTemperature: 50,
            measuredTemperature: 49.1,
            lightIntensity: 541870,
            lineRatios: buildMockVerificationLineRatios({ seed: 5 }),
            accountMode: 'signed_in',
            userName: DEFAULT_CLOUD_USERNAME,
            siteName: 'Prague Dairy',
            synced: true,
            timestamp: '2026-03-18T14:15:00.000Z'
        }),
        createVerificationRecord({
            verificationId: 6,
            channelId: 2,
            targetTemperature: 40,
            measuredTemperature: 40.5,
            lightIntensity: 546780,
            lineRatios: buildMockVerificationLineRatios({ seed: 6 }),
            accountMode: 'signed_in',
            userName: DEFAULT_CLOUD_USERNAME,
            siteName: 'Prague Dairy',
            synced: false,
            timestamp: '2026-03-17T09:32:00.000Z'
        })
    ];
}

function buildHistoryFlowFromChannel(ch) {
    if (!ch || ch.state !== STATES.COMPLETE || ch.testResults.length === 0) return null;

    return createHistoryFlowRecord({
        historyId: `live-${ch.id}`,
        historySource: 'live',
        channelId: ch.id,
        reason: 'live',
        scenario: ch.scenario || 'test',
        testTypeId: ch.testTypeId,
        testTypeName: ch.testTypeName,
        curveId: ch.curveId,
        curveName: ch.curveName,
        curveSource: ch.curveSource,
        cassetteType: ch.cassetteType,
        sampleId: ch.sampleId,
        userName: ch.userName || getActiveUserName(),
        operatorId: ch.operatorId,
        accountMode: ch.accountMode || (ch.userName ? 'signed_in' : 'anonymous'),
        comment: ch.comment || '',
        processing: ch.processing,
        result: ch.groupResult || ch.testResults[ch.testResults.length - 1]?.overall || null,
        synced: false,
        tests: ch.testResults.map((testResult, index) => ({
            testNumber: testResult.testNumber || index + 1,
            overall: getRecordedTestOverall(testResult) || 'negative',
            annotation: testResult.annotation || getHistoryAnnotationForTest(ch.scenario, testResult.testNumber || index + 1),
            timestamp: testResult.completedAt || new Date().toISOString(),
            cassetteType: testResult.cassetteType || ch.cassetteType,
            testTypeId: testResult.testTypeId || ch.testTypeId,
            testTypeName: testResult.testTypeName || ch.testTypeName,
            lightIntensity: Array.isArray(testResult.lightIntensity) && testResult.lightIntensity.length > 0
                ? [...testResult.lightIntensity]
                : buildLightIntensitySeries({
                    seed: ch.id * 10 + index + 1,
                    positive: (testResult.overall || '').toLowerCase() === 'positive',
                    quantitative: Boolean(getTestTypeById(testResult.testTypeId || ch.testTypeId)?.quantitative)
                }),
            substances: testResult.substances.map(substance => ({ ...substance }))
        }))
    });
}

function getHistoryFlows() {
    return [
        ...sessionHistory,
        ...channels.map(ch => buildHistoryFlowFromChannel(ch)).filter(Boolean)
    ].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

function getVerificationRecords() {
    return [...verificationHistory].sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

function findVerificationRecordByKey(verificationKey) {
    return getVerificationRecords().find(record => record.verificationKey === verificationKey) || null;
}

function storeVerificationRecord(recordInput = {}) {
    const resolvedAccountMode = recordInput.accountMode || (isSignedIn() ? 'signed_in' : 'anonymous');
    const shouldSync = resolvedAccountMode !== 'anonymous' &&
        Boolean(recordInput.synced) &&
        deviceSettings.connectivity !== 'offline';
    const record = createVerificationRecord({
        verificationId: nextVerificationEntryId(),
        verificationSource: 'archive',
        accountMode: resolvedAccountMode,
        userName: getActiveUserName(),
        siteName: activeAccount.siteName,
        synced: shouldSync,
        ...recordInput
    });

    verificationHistory.push(record);
    if (record.overallPass) {
        resetVerificationCount(record.channelId);
    }
    return record;
}

function findHistoryFlowByKey(historyKey) {
    return getHistoryFlows().find(flow => flow.historyKey === historyKey) || null;
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

function getEnabledTestTypesForCurrentUser() {
    return TEST_TYPES.filter(testType => isTestTypeEnabledForCurrentUser(testType.id));
}

function getDefaultManualTestType() {
    return getEnabledTestTypesForCurrentUser()[0] || TEST_TYPES[0] || null;
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
        .filter(testType => Boolean(testType) && isTestTypeEnabledForCurrentUser(testType.id));
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
    if (selectedTestType && isTestTypeEnabledForCurrentUser(selectedTestType.id)) return selectedTestType;

    if (allowQrPrefill) {
        const qrPrefillType = getQrPrefillTestType(cassetteType);
        if (qrPrefillType && isTestTypeEnabledForCurrentUser(qrPrefillType.id)) return qrPrefillType;
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

    if (outcome === 'invalid') {
        return subs.map(name => ({
            name,
            result: 'invalid',
            measuredValue: null,
            displayValue: '--'
        }));
    }

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
    return getOverallResultFromSubstances(substanceResults) === 'positive';
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
    ch.accountMode = 'signed_in';
    ch.sampleId = '';
    ch.userName = '';
    ch.operatorId = '';
    ch.comment = '';
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
           ch.state === STATES.CONFIGURING ||
           ch.state === STATES.DETECTED ||
           ch.state === STATES.READY_FOR_TEST_N ||
           ch.state === STATES.ERROR;
}

function isChannelAvailableForVerification(channelId) {
    const channel = getChannel(channelId);
    if (!channel) return false;
    return channel.state === STATES.EMPTY && !channel.physicalCassettePresent;
}

function canRemoveCassette(ch) {
    return ch.physicalCassettePresent;
}

function canConfigureChannel(ch) {
    return ch.state === STATES.EMPTY ||
           ch.state === STATES.DETECTED;
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
    sessionHistory.push(createHistoryFlowRecord({
        historyId: nextHistoryEntryId(),
        historySource: 'archive',
        channelId: ch.id,
        reason,
        scenario: ch.scenario,
        testTypeId: ch.testTypeId,
        testTypeName: ch.testTypeName,
        curveId: ch.curveId,
        curveName: ch.curveName,
        curveSource: ch.curveSource,
        cassetteType: ch.cassetteType,
        sampleId: ch.sampleId,
        userName: ch.userName || getActiveUserName(),
        operatorId: ch.operatorId,
        accountMode: ch.accountMode || (ch.userName ? 'signed_in' : 'anonymous'),
        comment: ch.comment || '',
        processing: ch.processing,
        result: finalResult,
        synced: false,
        timestamp: ch.testResults[ch.testResults.length - 1]?.completedAt || new Date().toISOString(),
        tests: ch.testResults.map(tr => ({
            testNumber: tr.testNumber,
            overall: tr.overall,
            annotation: tr.annotation,
            timestamp: tr.completedAt,
            cassetteType: tr.cassetteType,
            testTypeId: tr.testTypeId,
            testTypeName: tr.testTypeName,
            lightIntensity: tr.lightIntensity,
            substances: tr.substances.map(s => ({
                name: s.name,
                result: s.result,
                measuredValue: s.measuredValue,
                displayValue: s.displayValue
            }))
        }))
    }));
}

function updateHistoryFlowComment(historyKey, comment) {
    const nextComment = String(comment || '').trim();

    if (String(historyKey).startsWith('live-')) {
        const channelId = Number(String(historyKey).replace('live-', ''));
        const channel = getChannel(channelId);
        if (channel) {
            channel.comment = nextComment;
        }
        return;
    }

    const historyId = Number(String(historyKey).replace('history-', ''));
    const targetRecord = sessionHistory.find(entry => Number(entry.historyId) === historyId);
    if (targetRecord) {
        targetRecord.comment = nextComment;
        targetRecord.commentUpdatedAt = nextComment ? new Date().toISOString() : '';
    }
}

function setAnonymousTestTypeEnabled(testTypeId, enabled) {
    const normalizedId = normalizeTestTypeId(testTypeId);
    if (normalizedId == null) return;

    if (enabled) {
        anonymousEnabledTestTypeIds = [...new Set([...anonymousEnabledTestTypeIds, normalizedId])].sort((left, right) => left - right);
        return;
    }

    anonymousEnabledTestTypeIds = anonymousEnabledTestTypeIds.filter(id => id !== normalizedId);
}

function applyAccountMode(accountMode, details = {}) {
    if (accountMode === 'anonymous') {
        activeAccount = {
            ...activeAccount,
            signedIn: false
        };
        return;
    }

    activeAccount = {
        ...activeAccount,
        signedIn: true,
        name: String(details.username || activeAccount.username || DEFAULT_CLOUD_USERNAME).trim() || DEFAULT_CLOUD_USERNAME,
        username: String(details.username || activeAccount.username || DEFAULT_CLOUD_USERNAME).trim() || DEFAULT_CLOUD_USERNAME
    };
}

function applyOnboardingDraft(draft) {
    deviceSettings.language = draft.language || deviceSettings.language;
    deviceSettings.screenBrightnessStep = normalizeScreenBrightnessStep(draft.screenBrightnessStep);
    deviceSettings.soundEnabled = Boolean(draft.soundEnabled);
    deviceSettings.timezone = draft.timezone || deviceSettings.timezone;
    deviceSettings.deviceDateTimeIso = buildDeviceDateTimeIso(draft.dateInput, draft.timeInput, draft.timezone || deviceSettings.timezone);
    deviceSettings.dateTimeSetAt = new Date().toISOString();
    deviceSettings.printerEnabled = true;
    deviceSettings.commentsEnabled = true;
    deviceSettings.limsEnabled = true;
    deviceSettings.connectivity = draft.connectivity || deviceSettings.connectivity;
    deviceSettings.wifiNetwork = draft.connectivity === 'wifi' ? (draft.wifiNetwork || getDefaultWifiNetworkName()) : '';
    deviceSettings.ethernetConnected = draft.connectivity === 'ethernet';
    applyAccountMode(draft.connectivity === 'offline' ? 'anonymous' : draft.accountMode, {
        username: draft.username
    });
    prototypeRuntime.onboardingCompleted = true;
}

function resetPrototypeToFactoryDefaults() {
    activeAccount = createDefaultAccountState();
    deviceSettings = createDefaultDeviceSettings();
    prototypeRuntime = createDefaultPrototypeRuntime();
    siteEnabledTestTypeIds = DEFAULT_SITE_TEST_TYPE_IDS.slice();
    anonymousEnabledTestTypeIds = TEST_TYPES.map(testType => testType.id);
    initChannels();
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
            return getRecordedTestOverall(ch.testResults[ch.testResults.length - 1]) === 'positive'
                ? 'state-result-positive' : 'state-result-negative';
        case STATES.COMPLETE:
            if (ch.scenario === 'pos_control' || ch.scenario === 'animal_control') {
                return 'state-control';
            }
            switch (ch.groupResult) {
                case 'negative': return 'state-complete-negative';
                case 'positive': return 'state-complete-positive';
                case 'invalid': return 'state-complete-inconclusive';
                case 'inconclusive': return 'state-complete-inconclusive';
            }
            return '';
        default:
            return '';
    }
}
