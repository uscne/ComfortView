const READER_CONFIG = Object.freeze({
    CHAR_THRESHOLD: 500,
    KEEP_CLASSES: false,
    BOOK_EMOJI: '\uD83D\uDCDA'
});

const TEMPLATE_PLACEHOLDERS = Object.freeze({
    TITLE: '{{TITLE}}',
    BYLINE: '{{BYLINE}}',
    CONTENT: '{{CONTENT}}',
    SITE_NAME: '{{SITE_NAME}}',
    EXCERPT: '{{EXCERPT}}'
});

const ERROR_MESSAGES = Object.freeze({
    NO_ARTICLE: 'Failed to extract article content',
    NO_TEMPLATE: 'Failed to load reader template',
    PARSE_ERROR: 'Error parsing article content'
});

function isReaderModeActive() {
    return document.body.dataset.readerMode === 'active';
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadTemplate() {
    const templateURL = chrome.runtime.getURL('templates/reader-template.html');
    const response = await fetch(templateURL);
    if (!response.ok) {
        throw new Error(`${ERROR_MESSAGES.NO_TEMPLATE}: ${response.status}`);
    }
    return await response.text();
}

function extractArticle() {
    const documentClone = document.cloneNode(true);
    const reader = new Readability(documentClone, {
        charThreshold: READER_CONFIG.CHAR_THRESHOLD,
        keepClasses: READER_CONFIG.KEEP_CLASSES
    });
    return reader.parse();
}

function isValidArticle(article) {
    return article && article.content && article.content.trim().length > 0;
}

function cleanArticleContent(article) {
    if (!article.content) return article;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = article.content;

    tempDiv.querySelectorAll('table, img, picture, figure, video, svg').forEach(el => el.remove());

    article.content = tempDiv.innerHTML;
    return article;
}

function renderArticle(templateHTML, article) {
    const bylineHTML = article.byline
        ? `<div class="reader-byline">${escapeHTML(article.byline)}</div>`
        : '';

    return templateHTML
        .replace(TEMPLATE_PLACEHOLDERS.TITLE, escapeHTML(article.title || 'Untitled'))
        .replace(TEMPLATE_PLACEHOLDERS.BYLINE, bylineHTML)
        .replace(TEMPLATE_PLACEHOLDERS.CONTENT, article.content || '<p>No content available</p>')
        .replace(TEMPLATE_PLACEHOLDERS.SITE_NAME, escapeHTML(article.siteName || ''))
        .replace(TEMPLATE_PLACEHOLDERS.EXCERPT, escapeHTML(article.excerpt || ''));
}

function updateDocument(renderedHTML, title) {
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(renderedHTML, 'text/html');

    document.head.innerHTML = newDoc.head.innerHTML;
    document.body.innerHTML = newDoc.body.innerHTML;

    document.title = `${READER_CONFIG.BOOK_EMOJI} ${title || 'Reader Mode'}`;
    document.body.dataset.readerMode = 'active';
}

function setupCloseButton() {
    const closeBtn = document.getElementById('readerClose');
    closeBtn.addEventListener('click', () => window.location.reload(), { once: true });
}


function showLoading() {
    const loader = document.createElement('div');
    loader.id = 'reader-loading';
    loader.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;
                    background:rgba(255,255,255,0.95);z-index:999999;
                    display:flex;align-items:center;justify-content:center;
                    font-family:system-ui,-apple-system,sans-serif;">
            <div style="text-align:center;">
                <div style="font-size:18px;color:#333;">Loading Reader Mode...</div>
            </div>
        </div>
    `;
    document.body.appendChild(loader);
}

async function activateReaderMode() {
    showLoading();

    let article = extractArticle();

    if (!isValidArticle(article)) {
        throw new Error(ERROR_MESSAGES.NO_ARTICLE);
    }

    article = cleanArticleContent(article);

    const templateHTML = await loadTemplate();
    const renderedHTML = renderArticle(templateHTML, article);

    updateDocument(renderedHTML, article.title);

    setupCloseButton();

    console.log('[Reader Mode] Activated successfully');
}

async function initReaderMode() {
    if (isReaderModeActive()) {
        console.log('[Reader Mode] Already active');
        return;
    }

    try {
        await activateReaderMode();
    } catch (error) {
        console.error('[Reader Mode] Activation failed:', error);
        alert(`Reader Mode could not be activated: ${error.message}`);
    }
}

initReaderMode();