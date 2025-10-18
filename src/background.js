const READER_STATE = Object.freeze({
    ACTIVE: 'ON',
    INACTIVE: 'OFF'
});

const ACTION_TITLES = Object.freeze({
    ACTIVATE: 'Activate Reader Mode',
    DEACTIVATE: 'Deactivate Reader Mode'
});

const SCRIPT_FILES = Object.freeze({
    READABILITY: 'src/lib/Readability.js',
    READER_MODE: 'src/content/active-reader-mode.js'
});

function toggleState(currentState) {
    return currentState === READER_STATE.ACTIVE
        ? READER_STATE.INACTIVE
        : READER_STATE.ACTIVE;
}

async function getTabState(tabId) {
    try {
        return await chrome.action.getBadgeText({ tabId });
    } catch (error) {
        console.error('[Reader Mode] Failed to get tab state:', error);
        return READER_STATE.INACTIVE;
    }
}

async function setTabState(tabId, state) {
    await chrome.action.setBadgeText({ tabId, text: state });

    const title = state === READER_STATE.ACTIVE
        ? ACTION_TITLES.DEACTIVATE
        : ACTION_TITLES.ACTIVATE;

    await chrome.action.setTitle({ tabId, title });
}

async function activateReaderMode(tabId) {
    await chrome.scripting.executeScript({
        target: { tabId },
        files: [SCRIPT_FILES.READABILITY]
    });

    await chrome.scripting.executeScript({
        target: { tabId },
        files: [SCRIPT_FILES.READER_MODE]
    });
}

async function deactivateReaderMode(tabId) {
    await chrome.tabs.reload(tabId);
}

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) {
        console.error('[Reader Mode] Invalid tab ID');
        return;
    }

    try {
        const currentState = await getTabState(tab.id);
        const nextState = toggleState(currentState);

        await setTabState(tab.id, nextState);

        if (nextState === READER_STATE.ACTIVE) {
            await activateReaderMode(tab.id);
        } else {
            await deactivateReaderMode(tab.id);
        }
    } catch (error) {
        console.error('[Reader Mode] Extension error:', error);
        await setTabState(tab.id, READER_STATE.INACTIVE);
    }
});