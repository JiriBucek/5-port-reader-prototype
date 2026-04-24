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

async function setCaptureMode(page, capture) {
    await page.evaluate((captureValue) => {
        const root = document.documentElement;
        if (!root) return;

        if (captureValue === 'detail_tall' || captureValue === 'decision_tall' || captureValue === 'history_tall' || captureValue === 'settings_tall' || captureValue === 'onboarding_tall') {
            root.dataset.captureMode = captureValue;
        } else {
            delete root.dataset.captureMode;
        }
    }, capture);
}

async function prepareModalCaptureClone(page, sourceId) {
    await page.evaluate((sourceIdValue) => {
        const existing = document.getElementById('handoff-detail-capture-root');
        if (existing) {
            existing.remove();
        }

        const source = document.getElementById(sourceIdValue);
        if (!source || !source.classList.contains('active')) {
            throw new Error(`Modal ${sourceIdValue} is not active for tall capture.`);
        }

        const root = document.createElement('div');
        root.id = 'handoff-detail-capture-root';
        Object.assign(root.style, {
            display: 'block',
            width: '856px',
            padding: '18px',
            background: '#ffffff',
            position: 'relative'
        });

        const clone = source.cloneNode(true);
        clone.id = 'handoff-detail-capture-modal';
        clone.classList.add('active');
        Object.assign(clone.style, {
            display: 'flex',
            flexDirection: 'column',
            width: '760px',
            maxHeight: 'none',
            overflow: 'visible',
            margin: '0 auto',
            background: '#ffffff'
        });

        const modalBody = clone.querySelector('.modal-body');
        if (modalBody instanceof HTMLElement) {
            Object.assign(modalBody.style, {
                overflow: 'visible',
                maxHeight: 'none',
                padding: '10px 16px'
            });
        }

        const modalHeader = clone.querySelector('.modal-header');
        if (modalHeader instanceof HTMLElement) {
            Object.assign(modalHeader.style, {
                padding: '10px 16px 8px'
            });
        }

        root.appendChild(clone);
        document.body.appendChild(root);
    }, sourceId);
}

async function cleanupModalCaptureClone(page) {
    await page.evaluate(() => {
        document.getElementById('handoff-detail-capture-root')?.remove();
    });
}

async function prepareHistoryCaptureClone(page) {
    await page.evaluate(() => {
        document.getElementById('handoff-history-capture-root')?.remove();

        const source = document.getElementById('history-screen');
        if (!source || !source.classList.contains('active')) {
            throw new Error('History screen is not active for tall capture.');
        }

        const root = document.createElement('div');
        root.id = 'handoff-history-capture-root';
        Object.assign(root.style, {
            display: 'block',
            width: '856px',
            padding: '18px',
            background: '#ffffff',
            position: 'relative'
        });

        const frame = document.createElement('div');
        frame.id = 'handoff-history-capture-frame';
        Object.assign(frame.style, {
            background: 'var(--gray-800)',
            borderRadius: '6px',
            padding: '10px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px var(--gray-900)'
        });

        const clone = source.cloneNode(true);
        clone.id = 'handoff-history-capture-screen';
        clone.classList.add('active');
        Object.assign(clone.style, {
            position: 'relative',
            inset: 'auto',
            display: 'flex',
            width: '800px',
            minHeight: '480px',
            height: 'auto',
            overflow: 'visible',
            padding: '12px'
        });

        const body = clone.querySelector('.history-screen-body');
        if (body instanceof HTMLElement) {
            Object.assign(body.style, {
                flex: 'none',
                minHeight: 'auto',
                overflow: 'visible'
            });
        }

        frame.appendChild(clone);
        root.appendChild(frame);
        document.body.appendChild(root);
    });
}

async function cleanupHistoryCaptureClone(page) {
    await page.evaluate(() => {
        document.getElementById('handoff-history-capture-root')?.remove();
    });
}

async function prepareSettingsCaptureClone(page, sourceId) {
    await page.evaluate((sourceIdValue) => {
        document.getElementById('handoff-settings-capture-root')?.remove();

        const source = document.getElementById(sourceIdValue);
        if (!source || !source.classList.contains('active')) {
            throw new Error(`Settings screen ${sourceIdValue} is not active for tall capture.`);
        }

        const root = document.createElement('div');
        root.id = 'handoff-settings-capture-root';
        Object.assign(root.style, {
            display: 'block',
            width: '856px',
            padding: '18px',
            background: '#ffffff',
            position: 'relative'
        });

        const frame = document.createElement('div');
        frame.id = 'handoff-settings-capture-frame';
        Object.assign(frame.style, {
            background: 'var(--gray-800)',
            borderRadius: '6px',
            padding: '10px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px var(--gray-900)'
        });

        const clone = source.cloneNode(true);
        clone.id = 'handoff-settings-capture-screen';
        clone.classList.add('active');
        Object.assign(clone.style, {
            position: 'relative',
            inset: 'auto',
            display: 'flex',
            width: '800px',
            minHeight: '480px',
            height: 'auto',
            overflow: 'visible',
            padding: '12px'
        });

        const body = clone.querySelector('.settings-detail-screen-body');
        if (body instanceof HTMLElement) {
            Object.assign(body.style, {
                flex: 'none',
                minHeight: 'auto',
                overflow: 'visible'
            });
        }

        clone.querySelectorAll('.type-picker-results').forEach(list => {
            if (list instanceof HTMLElement) {
                Object.assign(list.style, {
                    maxHeight: 'none',
                    overflow: 'visible'
                });
            }
        });

        frame.appendChild(clone);
        root.appendChild(frame);
        document.body.appendChild(root);
    }, sourceId);
}

async function cleanupSettingsCaptureClone(page) {
    await page.evaluate(() => {
        document.getElementById('handoff-settings-capture-root')?.remove();
    });
}

async function prepareOnboardingCaptureClone(page, sourceId) {
    await page.evaluate((sourceIdValue) => {
        document.getElementById('handoff-onboarding-capture-root')?.remove();

        const source = document.getElementById(sourceIdValue);
        if (!source || !source.classList.contains('active')) {
            throw new Error(`Onboarding screen ${sourceIdValue} is not active for tall capture.`);
        }

        const root = document.createElement('div');
        root.id = 'handoff-onboarding-capture-root';
        Object.assign(root.style, {
            display: 'block',
            width: '856px',
            padding: '18px',
            background: '#ffffff',
            position: 'relative'
        });

        const frame = document.createElement('div');
        frame.id = 'handoff-onboarding-capture-frame';
        Object.assign(frame.style, {
            background: 'var(--gray-800)',
            borderRadius: '6px',
            padding: '10px',
            boxShadow: '0 10px 25px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px var(--gray-900)'
        });

        const clone = source.cloneNode(true);
        clone.id = 'handoff-onboarding-capture-screen';
        clone.classList.add('active');
        Object.assign(clone.style, {
            position: 'relative',
            inset: 'auto',
            display: 'flex',
            width: '800px',
            minHeight: '480px',
            height: 'auto',
            overflow: 'visible',
            padding: '12px'
        });

        const body = clone.querySelector('.onboarding-screen-body');
        if (body instanceof HTMLElement) {
            Object.assign(body.style, {
                flex: 'none',
                minHeight: 'auto',
                overflow: 'visible'
            });
        }

        clone.querySelectorAll('.type-picker-results').forEach(list => {
            if (list instanceof HTMLElement) {
                Object.assign(list.style, {
                    maxHeight: 'none',
                    overflow: 'visible'
                });
            }
        });

        frame.appendChild(clone);
        root.appendChild(frame);
        document.body.appendChild(root);
    }, sourceId);
}

async function cleanupOnboardingCaptureClone(page) {
    await page.evaluate(() => {
        document.getElementById('handoff-onboarding-capture-root')?.remove();
    });
}

async function captureStateImage(page, state, targetPath) {
    const capture = state.capture || 'screen';
    await setCaptureMode(page, capture);
    await page.waitForTimeout(40);

    if (capture === 'detail_tall' || capture === 'decision_tall') {
        const sourceId = capture === 'detail_tall' ? 'detail-modal' : 'decision-modal';
        await prepareModalCaptureClone(page, sourceId);
        await page.waitForTimeout(40);
        const clip = await page.evaluate(() => {
            const root = document.getElementById('handoff-detail-capture-root');
            if (!root) return null;
            const rect = root.getBoundingClientRect();
            return {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: rect.width,
                height: rect.height
            };
        });
        if (!clip || clip.width <= 0 || clip.height <= 0) {
            await cleanupModalCaptureClone(page);
            throw new Error(`Modal clone clip could not be resolved for ${state.id}.`);
        }
        await page.screenshot({
            path: targetPath,
            clip
        });
        await cleanupModalCaptureClone(page);
    } else if (capture === 'history_tall') {
        await prepareHistoryCaptureClone(page);
        await page.waitForTimeout(40);
        const clip = await page.evaluate(() => {
            const root = document.getElementById('handoff-history-capture-root');
            if (!root) return null;
            const rect = root.getBoundingClientRect();
            return {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: rect.width,
                height: rect.height
            };
        });
        if (!clip || clip.width <= 0 || clip.height <= 0) {
            await cleanupHistoryCaptureClone(page);
            throw new Error(`History clone clip could not be resolved for ${state.id}.`);
        }
        await page.screenshot({
            path: targetPath,
            clip
        });
        await cleanupHistoryCaptureClone(page);
    } else if (capture === 'settings_tall') {
        await prepareSettingsCaptureClone(page, 'settings-detail-screen');
        await page.waitForTimeout(40);
        const clip = await page.evaluate(() => {
            const root = document.getElementById('handoff-settings-capture-root');
            if (!root) return null;
            const rect = root.getBoundingClientRect();
            return {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: rect.width,
                height: rect.height
            };
        });
        if (!clip || clip.width <= 0 || clip.height <= 0) {
            await cleanupSettingsCaptureClone(page);
            throw new Error(`Settings clone clip could not be resolved for ${state.id}.`);
        }
        await page.screenshot({
            path: targetPath,
            clip
        });
        await cleanupSettingsCaptureClone(page);
    } else if (capture === 'onboarding_tall') {
        await prepareOnboardingCaptureClone(page, 'onboarding-screen');
        await page.waitForTimeout(40);
        const clip = await page.evaluate(() => {
            const root = document.getElementById('handoff-onboarding-capture-root');
            if (!root) return null;
            const rect = root.getBoundingClientRect();
            return {
                x: Math.max(0, rect.x),
                y: Math.max(0, rect.y),
                width: rect.width,
                height: rect.height
            };
        });
        if (!clip || clip.width <= 0 || clip.height <= 0) {
            await cleanupOnboardingCaptureClone(page);
            throw new Error(`Onboarding clone clip could not be resolved for ${state.id}.`);
        }
        await page.screenshot({
            path: targetPath,
            clip
        });
        await cleanupOnboardingCaptureClone(page);
    } else {
        const clip = await getCaptureClip(page, capture);
        await page.screenshot({
            path: targetPath,
            clip
        });
    }

    await setCaptureMode(page, 'screen');
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

        function setHistoryRecords(records) {
            sessionHistory = records;
            historyEntryIdCounter = sessionHistory.reduce((maxId, entry) => Math.max(maxId, Number(entry.historyId) || 0), 0) + 1;
        }

        function getHistoryFlowById(historyId) {
            const flow = getHistoryFlows().find(item => String(item.historyId) === String(historyId));
            if (!flow) {
                throw new Error(`No history flow available for historyId ${historyId}`);
            }
            return flow;
        }

        function showHistoryList(filter = 'tests', page = 0, notice = '') {
            showHistoryScreen({
                view: 'list',
                filter,
                page,
                notice
            });
        }

        function showHistoryFlowById(historyId, filter = 'tests', nextState = {}) {
            const flow = getHistoryFlowById(historyId);
            showHistoryScreen({
                view: 'flow',
                flowKey: flow.historyKey,
                filter,
                ...nextState
            });
            return flow;
        }

        function showHistoryTestById(historyId, testNumber = 1, filter = 'tests', nextState = {}) {
            const flow = getHistoryFlowById(historyId);
            const test = flow.tests.find(item => String(item.testNumber) === String(testNumber));
            if (!test) {
                throw new Error(`No history test ${testNumber} available for historyId ${historyId}`);
            }
            showHistoryScreen({
                view: 'test',
                flowKey: flow.historyKey,
                testNumber: test.testNumber,
                filter,
                ...nextState
            });
            return test;
        }

        function showHistoryExport(filter = 'tests', page = 0, modalState = {}) {
            const historyState = {
                view: 'list',
                filter,
                page
            };
            showHistoryScreen(historyState);
            showHistoryExportModal(historyState, modalState);
        }

        function clearVerificationHistory() {
            verificationHistory = [];
            verificationEntryIdCounter = 1;
        }

        function showVerificationDetailRecord(recordInput = {}, screenState = {}) {
            setSignedIn('wifi');
            const record = storeVerificationRecord({
                channelId: 2,
                targetTemperature: 50,
                measuredTemperature: 47.8,
                lightIntensity: 533200,
                lineRatios: buildMockVerificationLineRatios({ seed: 14, failingIndex: 1 }),
                timestamp: minutesAgo(18),
                ...recordInput
            });
            showVerificationScreen({
                view: 'detail',
                recordKey: record.verificationKey,
                origin: 'history',
                ...screenState
            });
        }

        function unlockSettingsSession() {
            prototypeRuntime.settingsAccessUnlocked = true;
        }

        function openChannelDetail(ch) {
            if (ch.state !== STATES.COMPLETE) {
                throw new Error('Detail modal can only be shown for completed channels.');
            }
            showDetailModal(ch);
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
            case 'dashboard_detected_strip': {
                const ch = getChannel(1);
                insertCassette(1, { testTypeId: 57, outcome: 'negative' });
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
            case 'dashboard_config_qr_disabled_manual': {
                const ch = getChannel(1);
                deviceSettings.qrScanningEnabled = false;
                insertCassette(1, { testTypeId: 43, outcome: 'negative' });
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
                }, 'type_picker');
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
            case 'dashboard_config_test_type_disabled': {
                setSignedIn('wifi');
                const ch = getChannel(1);
                ch.state = STATES.CONFIGURING;
                showConfigModal(ch, {
                    scenario: 'test',
                    testTypeId: 24,
                    sampleId: 'MILK-240318',
                    operatorId: 'OP-204',
                    fallbackCassetteType: '4L',
                    lockedToQr: false,
                    forceQrOnly: false,
                    brandFilter: 'MilkSafe',
                    categoryFilter: 'strip',
                    measurementFilter: 'qual',
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
            case 'dashboard_stop_confirmation': {
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
                ch.state = STATES.READY_FOR_TEST_N;
                clearInsertedCassetteForNextStep(ch);
                showStopConfirmationModal(ch);
                break;
            }
            case 'dashboard_ready_t3_waiting_new_cassette': {
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
                ch.state = STATES.READY_FOR_TEST_N;
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'dashboard_ready_t3_new_cassette': {
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
                ch.state = STATES.READY_FOR_TEST_N;
                clearInsertedCassetteForNextStep(ch);
                insertCassette(1, { testTypeId: 18, outcome: 'positive' });
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
            case 'dashboard_error_used_cassette': {
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
                ch.errorMessage = 'Cassette already used. Insert a new cassette and retry.';
                clearInsertedCassetteForNextStep(ch);
                break;
            }
            case 'dashboard_error_incubation_aborted': {
                const ch = configureChannel(1, {
                    testTypeId: 43,
                    processing: 'read_incubate'
                });
                insertCassette(1, { testTypeId: 43, outcome: 'negative' });
                ch.state = STATES.ERROR;
                ch.errorMessage = 'Incubation interrupted. Retry or abort.';
                break;
            }
            case 'dashboard_reading_cassette': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    processing: 'read_only'
                });
                insertCassette(1, { testTypeId: 37, outcome: 'negative' });
                ch.state = STATES.READING;
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
            case 'dashboard_detail_negative': {
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
                openChannelDetail(ch);
                break;
            }
            case 'dashboard_positive_control_positive': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    scenario: 'pos_control',
                    sampleId: 'POS-CTRL-01',
                    operatorId: 'OP-204',
                    processing: 'read_only'
                });
                insertCassette(1, { testTypeId: 37, outcome: 'positive' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 2
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.COMPLETE;
                break;
            }
            case 'dashboard_detail_positive_control_positive': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    scenario: 'pos_control',
                    sampleId: 'POS-CTRL-01',
                    operatorId: 'OP-204',
                    processing: 'read_only'
                });
                insertCassette(1, { testTypeId: 37, outcome: 'positive' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 2
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.COMPLETE;
                openChannelDetail(ch);
                break;
            }
            case 'dashboard_positive_control_negative': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    scenario: 'pos_control',
                    sampleId: 'POS-CTRL-01',
                    operatorId: 'OP-204',
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
                break;
            }
            case 'dashboard_animal_control_positive': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    scenario: 'animal_control',
                    sampleId: 'ANIMAL-CTRL-01',
                    operatorId: 'OP-204',
                    processing: 'read_only'
                });
                insertCassette(1, { testTypeId: 37, outcome: 'positive' });
                addTest(ch, {
                    testNumber: 1,
                    overall: 'positive',
                    offsetMinutes: 2
                });
                ch.currentTestNumber = 1;
                ch.state = STATES.COMPLETE;
                break;
            }
            case 'dashboard_detail_positive_control_negative': {
                const ch = configureChannel(1, {
                    testTypeId: 37,
                    scenario: 'pos_control',
                    sampleId: 'POS-CTRL-01',
                    operatorId: 'OP-204',
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
                openChannelDetail(ch);
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
            case 'dashboard_detail_positive_confirmed': {
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
                openChannelDetail(ch);
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
            case 'dashboard_detail_inconclusive': {
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
                openChannelDetail(ch);
                break;
            }
            case 'history_list_tests': {
                setSignedIn('wifi');
                showHistoryList('tests', 0);
                break;
            }
            case 'history_list_controls': {
                setSignedIn('wifi');
                showHistoryList('controls', 0);
                break;
            }
            case 'history_list_empty': {
                setSignedIn('wifi');
                setHistoryRecords([]);
                showHistoryList('tests', 0);
                break;
            }
            case 'history_list_controls_empty': {
                setSignedIn('wifi');
                setHistoryRecords(buildMockHistory().filter(item => item.scenario === 'test'));
                showHistoryList('controls', 0);
                break;
            }
            case 'history_flow_detail': {
                setSignedIn('wifi');
                showHistoryFlowById(1, 'tests');
                break;
            }
            case 'history_flow_detail_negative': {
                setSignedIn('wifi');
                showHistoryFlowById(2, 'tests');
                break;
            }
            case 'history_flow_detail_inconclusive': {
                setSignedIn('wifi');
                showHistoryFlowById(6, 'tests');
                break;
            }
            case 'history_flow_detail_control_positive': {
                setSignedIn('wifi');
                showHistoryFlowById(4, 'controls');
                break;
            }
            case 'history_flow_detail_control_negative': {
                setSignedIn('wifi');
                showHistoryFlowById(3, 'controls');
                break;
            }
            case 'history_flow_detail_edit_comment': {
                setSignedIn('wifi');
                const flow = getHistoryFlowById(1);
                showHistoryFlowById(1, 'tests', {
                    editingComment: true,
                    commentDraft: flow.comment
                });
                break;
            }
            case 'history_test_detail': {
                setSignedIn('wifi');
                showHistoryTestById(1, 1, 'tests');
                break;
            }
            case 'history_test_detail_negative': {
                setSignedIn('wifi');
                showHistoryTestById(2, 3, 'tests');
                break;
            }
            case 'history_test_detail_quantitative': {
                setSignedIn('wifi');
                showHistoryTestById(5, 1, 'tests');
                break;
            }
            case 'history_test_detail_rejected': {
                setSignedIn('wifi');
                showHistoryTestById(6, 1, 'tests');
                break;
            }
            case 'history_test_detail_control_positive': {
                setSignedIn('wifi');
                showHistoryTestById(9, 1, 'controls');
                break;
            }
            case 'history_test_detail_control_negative': {
                setSignedIn('wifi');
                showHistoryTestById(3, 1, 'controls');
                break;
            }
            case 'history_export_modal': {
                setSignedIn('wifi');
                showHistoryExport('tests', 0);
                break;
            }
            case 'history_export_modal_invalid_range': {
                setSignedIn('wifi');
                showHistoryExport('tests', 0, {
                    startDate: '2026-03-20',
                    endDate: '2026-03-18'
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
            case 'verification_warmup_heating': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'warmup',
                    channelId: 1,
                    targetTemperature: 50,
                    waitStage: 'heating'
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
            case 'verification_measure_disabled': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'measure',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: ''
                });
                break;
            }
            case 'verification_insert_asset': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'insert_asset',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9',
                    cassetteInserted: false
                });
                break;
            }
            case 'verification_insert_asset_ready': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'insert_asset',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9',
                    cassetteInserted: true
                });
                break;
            }
            case 'verification_insert_asset_read_error': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'insert_asset',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9',
                    cassetteInserted: false,
                    error: 'Cassette could not be read. Reinsert the verification cassette and try again.'
                });
                break;
            }
            case 'verification_reading_scanning': {
                setSignedIn('wifi');
                showVerificationScreen({
                    view: 'reading',
                    channelId: 1,
                    targetTemperature: 40,
                    measuredTemperature: '39.9',
                    cassetteInserted: true,
                    readingStage: 'scanning'
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
                    cassetteInserted: true,
                    readingStage: 'analyzing'
                });
                break;
            }
            case 'verification_result_detail': {
                showVerificationDetailRecord();
                break;
            }
            case 'verification_result_detail_passed_run': {
                showVerificationDetailRecord({
                    channelId: 4,
                    targetTemperature: 50,
                    measuredTemperature: 49.8,
                    lightIntensity: 548920,
                    lineRatios: buildMockVerificationLineRatios({ seed: 9 }),
                    synced: true,
                    timestamp: minutesAgo(6)
                }, {
                    origin: 'run'
                });
                break;
            }
            case 'verification_result_detail_light_fail': {
                showVerificationDetailRecord({
                    channelId: 3,
                    targetTemperature: 40,
                    measuredTemperature: 40.2,
                    lightIntensity: 492400,
                    lineRatios: buildMockVerificationLineRatios({ seed: 11 }),
                    timestamp: minutesAgo(24)
                });
                break;
            }
            case 'verification_result_detail_info': {
                showVerificationDetailRecord({}, {
                    origin: 'history',
                    showInfo: true
                });
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
            case 'verification_history_empty': {
                setSignedIn('wifi');
                clearVerificationHistory();
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
                openSettingsAction('open-cloud');
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
            case 'settings_connectivity_offline': {
                setSignedIn('wifi');
                handleSettingsApply({
                    connectivity: 'offline',
                    wifiNetwork: ''
                });
                showSettingsDetailScreen('connectivity', {
                    focusSection: 'settings-setup',
                    connectivityDraft: {
                        connectivity: 'offline',
                        wifiStage: 'offline',
                        wifiError: ''
                    }
                });
                break;
            }
            case 'settings_connectivity_ethernet': {
                setSignedIn('ethernet');
                showSettingsDetailScreen('connectivity', {
                    focusSection: 'settings-setup',
                    connectivityDraft: {
                        connectivity: 'ethernet',
                        wifiStage: 'ethernet_ready',
                        wifiError: ''
                    }
                });
                break;
            }
            case 'settings_device': {
                setSignedIn('wifi');
                handleSettingsApply({
                    screenBrightnessStep: 6,
                    soundEnabled: false
                });
                showSettingsDetailScreen('brightness', {
                    focusSection: 'settings-setup'
                });
                break;
            }
            case 'settings_language': {
                setSignedIn('wifi');
                showSettingsDetailScreen('language', {
                    focusSection: 'settings-setup'
                });
                break;
            }
            case 'settings_cloud': {
                setSignedIn('wifi');
                showSettingsDetailScreen('cloud', {
                    focusSection: 'settings-setup'
                });
                break;
            }
            case 'settings_cloud_login': {
                applyAccountMode('anonymous');
                deviceSettings.connectivity = 'wifi';
                deviceSettings.wifiNetwork = getDefaultWifiNetworkName();
                deviceSettings.ethernetConnected = false;
                prototypeRuntime.onboardingCompleted = true;
                showSettingsDetailScreen('cloud', {
                    focusSection: 'settings-setup',
                    cloudState: {
                        accountMode: 'anonymous',
                        username: DEFAULT_CLOUD_USERNAME,
                        password: DEFAULT_CLOUD_PASSWORD,
                        signInState: 'idle',
                        signInError: ''
                    }
                });
                break;
            }
            case 'settings_cloud_loading': {
                applyAccountMode('anonymous');
                deviceSettings.connectivity = 'wifi';
                deviceSettings.wifiNetwork = getDefaultWifiNetworkName();
                deviceSettings.ethernetConnected = false;
                prototypeRuntime.onboardingCompleted = true;
                showSettingsDetailScreen('cloud', {
                    focusSection: 'settings-setup',
                    cloudState: {
                        accountMode: 'anonymous',
                        username: DEFAULT_CLOUD_USERNAME,
                        password: DEFAULT_CLOUD_PASSWORD,
                        signInState: 'loading',
                        signInError: ''
                    }
                });
                break;
            }
            case 'settings_cloud_error': {
                applyAccountMode('anonymous');
                deviceSettings.connectivity = 'wifi';
                deviceSettings.wifiNetwork = getDefaultWifiNetworkName();
                deviceSettings.ethernetConnected = false;
                prototypeRuntime.onboardingCompleted = true;
                showSettingsDetailScreen('cloud', {
                    focusSection: 'settings-setup',
                    cloudState: {
                        accountMode: 'anonymous',
                        username: DEFAULT_CLOUD_USERNAME,
                        password: '0000',
                        signInState: 'idle',
                        signInError: 'Username or password is incorrect.'
                    }
                });
                break;
            }
            case 'settings_cloud_success': {
                applyAccountMode('anonymous');
                deviceSettings.connectivity = 'wifi';
                deviceSettings.wifiNetwork = getDefaultWifiNetworkName();
                deviceSettings.ethernetConnected = false;
                prototypeRuntime.onboardingCompleted = true;
                showSettingsDetailScreen('cloud', {
                    focusSection: 'settings-setup',
                    cloudState: {
                        accountMode: 'anonymous',
                        username: DEFAULT_CLOUD_USERNAME,
                        password: '',
                        signInState: 'success_feedback',
                        signInError: ''
                    }
                });
                break;
            }
            case 'settings_date_time': {
                setSignedIn('wifi');
                showSettingsDetailScreen('date_time', {
                    focusSection: 'settings-setup',
                    dateInput: '2026-03-22',
                    timeInput: '09:32'
                });
                break;
            }
            case 'settings_timezone': {
                setSignedIn('wifi');
                showSettingsDetailScreen('timezone', {
                    focusSection: 'settings-setup',
                    dateInput: '2026-03-22',
                    timeInput: '09:32'
                });
                break;
            }
            case 'settings_verification_threshold': {
                setSignedIn('wifi');
                deviceSettings.verificationCount = 286;
                showSettingsDetailScreen('verification_threshold', {
                    focusSection: 'settings-verification',
                    thresholdInput: '250'
                });
                break;
            }
            case 'settings_verification_threshold_under': {
                setSignedIn('wifi');
                deviceSettings.verificationCount = 184;
                showSettingsDetailScreen('verification_threshold', {
                    focusSection: 'settings-verification',
                    thresholdInput: '250'
                });
                break;
            }
            case 'settings_verification_threshold_local_warning': {
                setSignedIn('wifi');
                deviceSettings.verificationCount = 210;
                showSettingsDetailScreen('verification_threshold', {
                    focusSection: 'settings-verification',
                    thresholdInput: '180'
                });
                break;
            }
            case 'settings_verification_threshold_help': {
                setSignedIn('wifi');
                deviceSettings.verificationCount = 210;
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
            case 'settings_test_types_brand': {
                setSignedIn('wifi');
                unlockSettingsSession();
                showSettingsDetailScreen('test_types', {
                    focusSection: 'settings-setup',
                    testTypeState: {
                        step: 'brand',
                        brandFilter: '',
                        categoryFilter: ''
                    }
                });
                break;
            }
            case 'settings_test_types_category': {
                setSignedIn('wifi');
                unlockSettingsSession();
                showSettingsDetailScreen('test_types', {
                    focusSection: 'settings-setup',
                    testTypeState: {
                        step: 'category',
                        brandFilter: 'MilkSafe',
                        categoryFilter: ''
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
            case 'settings_factory_reset': {
                setSignedIn('wifi');
                unlockSettingsSession();
                showSettingsDetailScreen('factory_reset', {
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
            case 'software_checking_cloud': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'checking',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_offline_blocked': {
                setSignedIn('offline');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'offline_blocked',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_up_to_date': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'up_to_date',
                        installedVersion: LATEST_SOFTWARE_VERSION,
                        availableVersion: LATEST_SOFTWARE_VERSION,
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
            case 'software_checking_usb': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'usb',
                        stage: 'detecting_usb',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_package_ready_usb': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'usb',
                        stage: 'package_ready',
                        progress: 0
                    }
                });
                break;
            }
            case 'software_transferring_cloud': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'cloud',
                        stage: 'transferring',
                        progress: 56
                    }
                });
                break;
            }
            case 'software_transferring_usb': {
                setSignedIn('wifi');
                showSettingsDetailScreen('software', {
                    focusSection: 'settings-maintenance',
                    softwareState: {
                        source: 'usb',
                        stage: 'transferring',
                        progress: 64
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
            case 'onboarding_language': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(0);
                break;
            }
            case 'onboarding_display_sound': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(1, {
                    ...buildOnboardingDraftFromState(),
                    screenBrightnessStep: 5,
                    soundEnabled: true
                });
                break;
            }
            case 'onboarding_date_time': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(2, {
                    ...buildOnboardingDraftFromState(),
                    dateInput: '2026-03-22',
                    timeInput: '09:32'
                });
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
            case 'onboarding_timezone_selected': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(3, {
                    ...buildOnboardingDraftFromState(),
                    timezone: 'Europe/Prague',
                    timezoneChoiceConfirmed: true
                });
                const input = document.getElementById('onboarding-timezone-search');
                if (input) {
                    input.value = 'Prague';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                break;
            }
            case 'onboarding_internet_offline': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'offline',
                    wifiNetwork: '',
                    wifiStage: 'offline',
                    wifiError: ''
                });
                break;
            }
            case 'onboarding_internet_wifi_list': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: '',
                    wifiStage: 'wifi_list',
                    wifiError: ''
                });
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
            case 'onboarding_internet_wifi_connecting': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    wifiStage: 'wifi_connecting',
                    wifiError: ''
                });
                break;
            }
            case 'onboarding_internet_wifi_error': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    wifiPassword: '0000',
                    wifiStage: 'wifi_error',
                    wifiError: 'Password incorrect. Re-enter the Wi-Fi password to continue.'
                });
                break;
            }
            case 'onboarding_internet_wifi_success': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    wifiStage: 'wifi_success',
                    wifiError: ''
                });
                break;
            }
            case 'onboarding_internet_ethernet': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(4, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'ethernet',
                    wifiNetwork: '',
                    wifiStage: 'ethernet_ready',
                    wifiError: ''
                });
                break;
            }
            case 'onboarding_cloud_offline': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'offline',
                    wifiNetwork: '',
                    accountMode: 'signed_in',
                    cloudChoiceConfirmed: false,
                    username: DEFAULT_CLOUD_USERNAME,
                    password: DEFAULT_CLOUD_PASSWORD,
                    signInState: 'idle',
                    signInError: ''
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
            case 'onboarding_cloud_loading': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    accountMode: 'signed_in',
                    cloudChoiceConfirmed: false,
                    username: DEFAULT_CLOUD_USERNAME,
                    password: DEFAULT_CLOUD_PASSWORD,
                    signInState: 'loading',
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
                    password: '0000',
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
            case 'onboarding_cloud_anonymous': {
                prototypeRuntime.onboardingCompleted = false;
                showOnboardingScreen(5, {
                    ...buildOnboardingDraftFromState(),
                    connectivity: 'wifi',
                    wifiNetwork: getDefaultWifiNetworkName(),
                    accountMode: 'anonymous',
                    cloudChoiceConfirmed: true,
                    signInState: 'idle',
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
            #handoff-detail-capture-root {
                display: none;
            }
            html[data-capture-mode="detail_tall"] #handoff-detail-capture-root,
            html[data-capture-mode="decision_tall"] #handoff-detail-capture-root {
                display: block !important;
                width: 856px !important;
                padding: 18px !important;
                background: #ffffff !important;
            }
            html[data-capture-mode="detail_tall"] #handoff-detail-capture-modal,
            html[data-capture-mode="decision_tall"] #handoff-detail-capture-modal {
                display: block !important;
                width: 760px !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 auto !important;
                background: #ffffff !important;
            }
            html[data-capture-mode="detail_tall"] #handoff-detail-capture-modal .modal-body,
            html[data-capture-mode="decision_tall"] #handoff-detail-capture-modal .modal-body {
                overflow: visible !important;
                max-height: none !important;
                padding: 10px 16px !important;
            }
            html[data-capture-mode="detail_tall"] #handoff-detail-capture-modal .modal-header,
            html[data-capture-mode="decision_tall"] #handoff-detail-capture-modal .modal-header {
                padding: 10px 16px 8px !important;
            }
        `
    });

    const states = manifest.sections.flatMap(section => section.states);
    for (const state of states) {
        await applyPreset(page, state.preset);
        const targetPath = path.join(outputDir, `${state.id}.png`);
        await captureStateImage(page, state, targetPath);
        process.stdout.write(`Captured ${state.id}\n`);
    }

    await browser.close();
}

main().catch(error => {
    process.stderr.write(`${error.stack || error}\n`);
    process.exitCode = 1;
});
