#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
    const args = {};
    for (let index = 2; index < argv.length; index += 1) {
        const key = argv[index];
        const next = argv[index + 1];
        if (key.startsWith('--')) {
            args[key.slice(2)] = next && !next.startsWith('--') ? next : true;
            if (args[key.slice(2)] === next) {
                index += 1;
            }
        }
    }
    return args;
}

function isoMinutes(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

function padClip(box, padding = 18) {
    return {
        x: Math.max(0, box.x - padding),
        y: Math.max(0, box.y - padding),
        width: box.width + padding * 2,
        height: box.height + padding * 2
    };
}

async function getCaptureClip(page, capture) {
    if (capture === 'device') {
        const frame = await page.locator('.device-frame').boundingBox();
        const slot = await page.locator('.slot-panel').boundingBox();
        if (!frame || !slot) {
            throw new Error('Unable to resolve device capture bounds.');
        }
        const x = Math.min(frame.x, slot.x);
        const y = Math.min(frame.y, slot.y);
        const right = Math.max(frame.x + frame.width, slot.x + slot.width);
        const bottom = Math.max(frame.y + frame.height, slot.y + slot.height);
        return padClip({
            x,
            y,
            width: right - x,
            height: bottom - y
        });
    }

    const frame = await page.locator('.device-frame').boundingBox();
    if (!frame) {
        throw new Error('Unable to resolve screen capture bounds.');
    }
    return padClip(frame);
}

async function resetPrototype(page) {
    await page.evaluate(() => {
        if (typeof clearPrototypeFullScreenTimer === 'function') {
            clearPrototypeFullScreenTimer();
        }
        if (typeof resetPrototypeToFactoryDefaults === 'function') {
            resetPrototypeToFactoryDefaults();
        }
        if (typeof hideModal === 'function') {
            hideModal();
        }
        if (typeof hideHistoryScreen === 'function') {
            hideHistoryScreen();
        }
        if (typeof hideSettingsPasswordScreen === 'function') {
            hideSettingsPasswordScreen();
        }
        if (typeof hideSettingsDetailScreen === 'function') {
            hideSettingsDetailScreen();
        }
        if (typeof hideSettingsScreen === 'function') {
            hideSettingsScreen();
        }
        if (typeof hideSettingsCurveScreen === 'function') {
            hideSettingsCurveScreen();
        }
        if (typeof hideVerificationScreen === 'function') {
            hideVerificationScreen();
        }
        if (typeof hideOnboardingScreen === 'function') {
            hideOnboardingScreen();
        }

        const nowIso = new Date().toISOString();
        deviceSettings.deviceDateTimeIso = nowIso;
        deviceSettings.dateTimeSetAt = nowIso;

        renderAllCards();
        renderStatusBar();
        renderSimulationButtons();
    });
}

async function applyPreset(page, presetId) {
    await resetPrototype(page);

    await page.evaluate((presetIdValue) => {
        const TIMESTAMP_BASE = Date.parse('2026-03-18T08:56:00.000Z');

        function minutesAgo(minutes) {
            return new Date(TIMESTAMP_BASE - minutes * 60 * 1000).toISOString();
        }

        function refresh() {
            renderAllCards();
            renderStatusBar();
            renderSimulationButtons();
        }

        function resetAndRefresh() {
            resetPrototypeToFactoryDefaults();
            const nowIso = new Date().toISOString();
            deviceSettings.deviceDateTimeIso = nowIso;
            deviceSettings.dateTimeSetAt = nowIso;
            renderAllCards();
            renderStatusBar();
            renderSimulationButtons();
        }

        function selectTestType(testTypeId) {
            const testType = getTestTypeById(testTypeId);
            if (!testType) {
                throw new Error(`Unknown test type: ${testTypeId}`);
            }
            return testType;
        }

        function configureChannel(channelId, {
            testTypeId = 43,
            scenario = 'test',
            sampleId = 'MS-240318-01',
            operatorId = 'OP-204',
            processing = 'read_only'
        } = {}) {
            const ch = getChannel(channelId);
            const testType = selectTestType(testTypeId);
            ch.scenario = scenario;
            ch.testTypeId = testType.id;
            ch.testTypeName = testType.name;
            ch.cassetteType = testType.cassetteType;
            ch.sampleId = sampleId;
            ch.userName = isSignedIn() ? activeAccount.username : '';
            ch.operatorId = operatorId;
            ch.accountMode = isSignedIn() ? 'signed_in' : 'anonymous';
            ch.processing = processing;
            ch.currentTestNumber = Math.max(ch.currentTestNumber, 1);
            return ch;
        }

        function insertCassette(channelId, {
            testTypeId = 43,
            outcome = 'negative'
        } = {}) {
            const ch = getChannel(channelId);
            const testType = selectTestType(testTypeId);
            ch.physicalCassettePresent = true;
            ch.cassettePresent = true;
            ch.loadedCassetteId = nextCassetteId();
            ch.loadedCassetteType = testType.cassetteType;
            ch.loadedTestTypeId = testType.id;
            ch.simulatedOutcome = outcome;
            if (deviceSettings.qrScanningEnabled && testType.qrEnabled) {
                ch.cassetteType = testType.cassetteType;
            }
            return ch;
        }

        function buildTestResult(ch, {
            testNumber,
            overall = 'negative',
            offsetMinutes = 0
        }) {
            const testType = getTestTypeById(ch.testTypeId);
            const substances = generateSubstanceResults(
                ch.testTypeId,
                ch.cassetteType,
                overall === 'invalid' ? 'invalid' : overall
            );
            return {
                substances,
                overall: getOverallResultFromSubstances(substances),
                testNumber,
                annotation: getHistoryAnnotationForTest(ch.scenario, testNumber),
                completedAt: minutesAgo(offsetMinutes),
                cassetteType: ch.cassetteType,
                testTypeId: ch.testTypeId,
                testTypeName: ch.testTypeName,
                lightIntensity: buildLightIntensitySeries({
                    seed: ch.id * 10 + testNumber,
                    positive: overall === 'positive',
                    quantitative: Boolean(testType?.quantitative)
                })
            };
        }

        function addTest(ch, options) {
            ch.testResults.push(buildTestResult(ch, options));
        }

        function setSignedIn(connectivity = 'wifi') {
            applyAccountMode('signed_in', { username: DEFAULT_CLOUD_USERNAME });
            deviceSettings.connectivity = connectivity;
            deviceSettings.wifiNetwork = connectivity === 'wifi' ? getDefaultWifiNetworkName() : '';
            deviceSettings.ethernetConnected = connectivity === 'ethernet';
            prototypeRuntime.onboardingCompleted = true;
        }

        function showHistoryFlow(filter = 'tests') {
            const flow = getHistoryFlows().find(item => filter === 'controls'
                ? item.scenario !== 'test'
                : item.scenario === 'test');
            if (!flow) {
                throw new Error(`No history flow available for filter ${filter}`);
            }
            showHistoryScreen({
                view: 'flow',
                flowKey: flow.historyKey,
                filter
            });
            return flow;
        }

        function showHistoryTest(filter = 'tests') {
            const flow = showHistoryFlow(filter);
            const test = flow.tests[0];
            showHistoryScreen({
                view: 'test',
                flowKey: flow.historyKey,
                testNumber: test.testNumber,
                filter
            });
        }

        function showVerificationDetailRecord() {
            setSignedIn('wifi');
            const record = storeVerificationRecord({
                channelId: 2,
                targetTemperature: 50,
                measuredTemperature: 47.8,
                lightIntensity: 533200,
                lineRatios: buildMockVerificationLineRatios({ seed: 14, failingIndex: 1 }),
                timestamp: minutesAgo(18)
            });
            showVerificationScreen({
                view: 'detail',
                recordKey: record.verificationKey,
                origin: 'history'
            });
        }

        function unlockSettingsSession() {
            prototypeRuntime.settingsAccessUnlocked = true;
        }

        resetAndRefresh();

        switch (presetIdValue) {
            case 'dashboard_empty': {
                break;
            }
            case 'dashboard_detected_qr': {
                const ch = getChannel(1);
                insertCassette(1, { testTypeId: 43, outcome: 'negative' });
                ch.state = STATES.DETECTED;
                break;
            }
            case 'dashboard_config_manual_before_insert': {
                const ch = getChannel(1);
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 37,
                    sampleId: 'MILK-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '4L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'cassette',
                    measurementFilter: 'all',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'form');
                break;
            }
            case 'dashboard_type_picker': {
                const ch = getChannel(1);
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 37,
                    sampleId: 'MILK-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '4L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'all',
                    measurementFilter: 'all',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'type_picker');
                const mixedRow = document.querySelector('[data-test-type-id="8"]');
                if (mixedRow) {
                    mixedRow.scrollIntoView({ block: 'start' });
                }
                break;
            }
            case 'dashboard_type_picker_quantitative': {
                const ch = getChannel(1);
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 20,
                    sampleId: 'AFM-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '1L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'all',
                    measurementFilter: 'quant',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'type_picker');
                break;
            }
            case 'dashboard_config_qr_locked': {
                const ch = getChannel(1);
                insertCassette(1, { testTypeId: 43, outcome: 'negative' });
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch);
                break;
            }
            case 'dashboard_config_microswitch_off': {
                const ch = getChannel(1);
                deviceSettings.microswitchEnabled = false;
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 37,
                    sampleId: 'MILK-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '4L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'cassette',
                    measurementFilter: 'all',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'form');
                break;
            }
            case 'dashboard_config_quant_curve_required': {
                const ch = getChannel(1);
                insertCassette(1, { testTypeId: 20, outcome: 'negative' });
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 20,
                    sampleId: 'AFM-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '1L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'strip',
                    measurementFilter: 'quant',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'form');
                break;
            }
            case 'dashboard_curve_picker': {
                const ch = getChannel(1);
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 20,
                    sampleId: 'AFM-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '1L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'strip',
                    measurementFilter: 'quant',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'curve_picker');
                break;
            }
            case 'dashboard_temperature_mismatch': {
                const ch = getChannel(1);
                deviceSettings.deviceTemperature = 40;
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 18,
                    sampleId: 'MILK-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '4L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'cassette',
                    measurementFilter: 'all',
                    curveId: null,
                    curveLoadSource: 'qr',
                    curveLoadError: ''
                }, 'form');
                break;
            }
            case 'dashboard_incubating': {
                const ch = configureChannel(1, {
                    testTypeId: 43,
                    processing: 'read_incubate'
                });
                insertCassette(1, { testTypeId: 43, outcome: 'negative' });
                ch.state = STATES.INCUBATING;
                ch.incubationTotal = 240;
                ch.incubationRemaining = 125;
                ch.incubationElapsed = 115;
                break;
            }
            case 'dashboard_error_no_cassette': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    processing: 'read_only'
                });
                ch.state = STATES.ERROR;
                ch.errorMessage = 'Cassette could not be read. Insert cassette and retry.';
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'dashboard_decision_t1_positive': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                insertCassette(1, { testTypeId: 18, outcome: 'positive' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 2
                });
                ch.state = STATES.RESULT;
                showDecisionModal(ch, 'a');
                break;
            }
            case 'dashboard_ready_t2_waiting_new_cassette': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 4
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.READY_FOR_TEST_N;
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'dashboard_ready_t2_new_cassette': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 4
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.READY_FOR_TEST_N;
                clearInsertedCassetteForNextStep(ch);
                insertCassette(1, { testTypeId: 18, outcome: 'positive' });
                break;
            }
            case 'dashboard_tiebreaker_t2_negative': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 8
                });
                addTest(ch, {
                    testNumber: 2,
                    overall: 'negative',
                    offsetMinutes: 2
                });
                ch.currentTestNumber = 2;
                ch.state = STATES.RESULT;
                showDecisionModal(ch, 'b');
                break;
            }
            case 'dashboard_error_wrong_cassette': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 4
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.ERROR;
                ch.errorMessage = 'Wrong cassette type. Expected MilkSafe™ FAST 3BTC.';
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'dashboard_complete_negative': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    processing: 'read_only'
                });
                insertCassette(1, { testTypeId: 37, outcome: 'negative' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'negative',
                    offsetMinutes: 2
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'negative';
                break;
            }
            case 'dashboard_complete_positive_after_confirmation': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                insertCassette(1, { testTypeId: 18, outcome: 'positive' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 6
                });
                addTest(ch, {
                    testNumber: 2,
                    overall: 'positive',
                    offsetMinutes: 1
                });
                ch.currentTestNumber = 2;
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'positive';
                break;
            }
            case 'dashboard_complete_inconclusive_after_abort': {
                const ch = configureChannel(1, {
                    testTypeId: 18,
                    processing: 'read_incubate'
                });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 7
                });
                addTest(ch, {
                    testNumber: 2,
                    overall: 'negative',
                    offsetMinutes: 3
                });
                ch.currentTestNumber = 2;
                ch.state = STATES.COMPLETE;
                ch.groupResult = 'inconclusive';
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'history_list_tests': {
                setSignedIn('wifi');
                showHistoryScreen({
                    filter: 'tests',
                    view: 'list',
                    page: 0
                });
                break;
            }
            case 'history_list_controls': {
                setSignedIn('wifi');
                showHistoryScreen({
                    filter: 'controls',
                    view: 'list',
                    page: 0
                });
                break;
            }
            case 'history_flow_detail': {
                setSignedIn('wifi');
                showHistoryFlow('tests');
                break;
            }
            case 'history_test_detail': {
                setSignedIn('wifi');
                showHistoryTest('tests');
                break;
            }
            case 'history_export_modal': {
                setSignedIn('wifi');
                showHistoryScreen({
                    filter: 'tests',
                    view: 'list',
                    page: 0
                });
                showHistoryExportModal({
                    filter: 'tests',
                    view: 'list',
                    page: 0
                });
                break;
            }
            case 'verification_setup': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'setup',
                    channelId: 1,
                    targetTemperature: 40
                });
                break;
            }
            case 'verification_warmup_ready': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'warmup',
                    channelId: 1,
                    targetTemperature: 40,
                    waitStage: 'ready'
                });
                break;
            }
            case 'verification_measure': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'measure',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9'
                });
                break;
            }
            case 'verification_insert_asset': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'insert_asset',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9'
                });
                break;
            }
            case 'verification_reading': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'reading',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9',
                    readingStage: 'analyzing'
                });
                break;
            }
            case 'verification_result_detail': {
                showVerificationDetailRecord();
                break;
            }
            case 'verification_history': {
                showVerificationDetailRecord();
                showVerificationScreen({
                    view: 'history',
                    page: 0,
                    notice: '',
                    error: ''
                });
                break;
            }
            case 'settings_locked': {
                setSignedIn('wifi');
                showSettingsScreen();
                break;
            }
            case 'settings_password_prompt': {
                setSignedIn('wifi');
                showSettingsScreen();
                openSettingsAction('open-test-types');
                break;
            }
            case 'settings_unlocked': {
                setSignedIn('wifi');
                unlockSettingsSession();
                showSettingsScreen();
                break;
            }
            case 'settings_connectivity_wifi_list': {
                setSignedIn('wifi');
                showSettingsDetailScreen('connectivity', {
                    focusSection: 'settings-setup',
                    connectivityDraft: {
                        connectivity: 'wifi',
                        wifiStage: 'wifi_list',
                        wifiNetwork: getDefaultWifiNetworkName(),
                        wifiError: ''
                    }
                });
                break;
            }
            case 'settings_connectivity_wifi_success': {
                setSignedIn('wifi');
                showSettingsDetailScreen('connectivity', {
                    focusSection: 'settings-setup',
                    connectivityDraft: {
                        connectivity: 'wifi',
                        wifiStage: 'wifi_success',
                        wifiNetwork: getDefaultWifiNetworkName(),
                        wifiError: ''
                    }
                });
                break;
            }
            case 'settings_verification_threshold': {
                setSignedIn('wifi');
                showSettingsDetailScreen('verification_threshold', {
                    focusSection: 'settings-verification',
                    thresholdInput: '180'
                });
                break;
            }
            case 'settings_verification_threshold_help': {
                setSignedIn('wifi');
                showSettingsDetailScreen('verification_threshold', {
                    focusSection: 'settings-verification',
                    thresholdInput: '180',
                    showThresholdInfo: true
                });
                break;
            }
            case 'settings_test_types': {
                setSignedIn('wifi');
                unlockSettingsSession();
                showSettingsDetailScreen('test_types', {
                    focusSection: 'settings-setup',
                    testTypeState: {
                        step: 'list',
                        brandFilter: 'MilkSafe',
                        categoryFilter: 'cassette'
                    }
                });
                break;
            }
            case 'settings_curve_loader': {
                setSignedIn('wifi');
                showSettingsCurveScreen();
                break;
            }
            case 'settings_about': {
                setSignedIn('wifi');
                showSettingsDetailScreen('about', {
                    focusSection: 'settings-maintenance'
                });
                break;
            }
            case 'software_home': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'home',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_package_ready': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'package_ready',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_installing': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'installing',
                        progress: 82
                    }
                });
                break;
            }
            case 'software_restart_required': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'restart_required',
                        progress: 100
                    }
                });
                break;
            }
            case 'onboarding_language': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(0);
                break;
            }
            case 'onboarding_timezone': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(3, {
                    ...buildOnboardingDraftFromState(),
                    timezone: 'UTC',
                    timezoneChoiceConfirmed: false
                });
                const input = document.getElementById('onboarding-timezone-search');
                if (input) {
                    input.value = 'Europe';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                break;
            }
            case 'onboarding_internet_wifi_password': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    wifiStage: 'wifi_password',
                    wifiError: ''
                });
                break;
            }
            case 'onboarding_cloud_idle': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    accountMode: 'anonymous',
                    cloudChoiceConfirmed: false,
                    signInState: 'idle',
                    signInError: ''
                });
                break;
            }
            case 'onboarding_cloud_error': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    accountMode: 'signed_in',
                    cloudChoiceConfirmed: false,
                    username: DEFAULT_CLOUD_USERNAME,
                    password: SETTINGS_PASSWORD,
                    signInState: 'idle',
                    signInError: 'Username or password is incorrect.'
                });
                break;
            }
            case 'onboarding_cloud_success': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    accountMode: 'signed_in',
                    cloudChoiceConfirmed: true,
                    username: DEFAULT_CLOUD_USERNAME,
                    password: '',
                    signInState: 'success',
                    signInError: ''
                });
                break;
            }
            case 'onboarding_finish': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(6, {
                    ...buildOnboardingDraftFromState(),
                    language: 'English',
                    screenBrightnessStep: 5,
                    soundEnabled: true,
                    timezone: 'Europe/Prague',
                    timezoneChoiceConfirmed: true,
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    wifiStage: 'wifi_success',
                    accountMode: 'signed_in',
                    cloudChoiceConfirmed: true,
                    username: DEFAULT_CLOUD_USERNAME,
                    password: '',
                    signInState: 'success'
                });
                break;
            }
            default:
                throw new Error(`Unknown preset: ${presetIdValue}`);
        }

        refresh();
    }, presetId);

    await page.waitForTimeout(80);
}

async function main() {
    const args = parseArgs(process.argv);
    const manifestPath = path.resolve(ROOT_DIR, args.manifest || 'handoff/manifest.json');
    const outputDir = path.resolve(ROOT_DIR, args.output || 'handoff/screenshots');

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    await ensureDir(outputDir);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1600, height: 1500 },
        deviceScaleFactor: 2
    });
    const page = await context.newPage();

    await page.goto(`file://${path.join(ROOT_DIR, 'index.html')}`);
    await page.waitForFunction(() => document.querySelector('#card-1')?.children.length > 0);
    await page.addStyleTag({
        content: `
            .prototype-info-panel,
            .simulation-panel {
                display: none !important;
            }
            body {
                min-height: auto !important;
                padding: 24px !important;
                background: #ffffff !important;
            }
            .prototype-layout {
                width: auto !important;
                justify-content: flex-start !important;
            }
            *,
            *::before,
            *::after {
                animation: none !important;
                transition: none !important;
                caret-color: transparent !important;
            }
        `
    });

    const states = manifest.sections.flatMap(section => section.states);
    for (const state of states) {
        await applyPreset(page, state.preset);
        const clip = await getCaptureClip(page, state.capture || 'screen');
        const targetPath = path.join(outputDir, `${state.id}.png`);
        await page.screenshot({
            path: targetPath,
            clip
        });
        process.stdout.write(`Captured ${state.id}\n`);
    }

    await browser.close();
}

main().catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});
