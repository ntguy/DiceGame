export function populateContainerWithPoints(scene, container, points = [], {
    bodyWidth = 680,
    bodyPadding = 80,
    bulletIndent = 28,
    lineHeight = 30,
    bulletSpacing = 16,
    bulletColor = '#f7dc6f',
    bodyColor = '#ecf0f1',
    fontSize = '32px'
} = {}) {
    if (!container || !scene) return;

    try { container.removeAll(true); } catch (e) {}

    // helpers (ported from InstructionsUI)
    const ASCII_RANGE_REGEX = /[^\u0000-\u007f]/;
    const WHITESPACE_REGEX = /\s/;
    const WORD_CHAR_REGEX = /[A-Za-z0-9'\-]/;

    function splitByKeywords(text, keywords = [], baseColor = bodyColor) {
        if (!text) return [{ text: '', color: baseColor }];
        const normalizedKeywords = (keywords || []).map((entry, idx) => {
            if (!entry || !entry.phrase) return null;
            const phrase = entry.phrase;
            const index = text.indexOf(phrase);
            if (index === -1) return null;
            return { phrase, index, order: idx, color: entry.color || '#f4d03f' };
        }).filter(Boolean).sort((a, b) => (a.index - b.index) || (a.order - b.order));
        if (normalizedKeywords.length === 0) return [{ text, color: baseColor }];
        const segments = [];
        let cursor = 0;
        normalizedKeywords.forEach((keyword) => {
            const index = text.indexOf(keyword.phrase, cursor);
            if (index === -1) return;
            if (index > cursor) segments.push({ text: text.slice(cursor, index), color: baseColor });
            segments.push({ text: keyword.phrase, color: keyword.color });
            cursor = index + keyword.phrase.length;
        });
        if (cursor < text.length) segments.push({ text: text.slice(cursor), color: baseColor });
        return segments;
    }

    function tokenizeSegment(text) {
        if (!text) return [];
        const tokens = [];
        let buffer = '';
        const flush = () => {
            if (!buffer) return;
            tokens.push({ text: buffer, type: 'word', requiresNormalText: ASCII_RANGE_REGEX.test(buffer) });
            buffer = '';
        };
        for (const ch of text) {
            if (WHITESPACE_REGEX.test(ch)) {
                flush();
                tokens.push({ text: ch, type: 'space', requiresNormalText: ASCII_RANGE_REGEX.test(ch) });
                continue;
            }
            if (WORD_CHAR_REGEX.test(ch)) {
                buffer += ch;
                continue;
            }
            flush();
            tokens.push({ text: ch, type: 'symbol', requiresNormalText: ASCII_RANGE_REGEX.test(ch) });
        }
        flush();
        return tokens;
    }

    function createTokens(point) {
        const baseColor = bodyColor;
        const text = point && point.text ? point.text : '';
        const highlights = Array.isArray(point && point.keywords) ? point.keywords : [];
        const segments = splitByKeywords(text, highlights, baseColor);
        const tokens = [];
        segments.forEach(seg => {
            const color = seg.color || baseColor;
            tokenizeSegment(seg.text).forEach(part => {
                if (!part.text) return;
                tokens.push({ text: part.text, color, type: part.type, requiresNormalText: part.requiresNormalText });
            });
        });
        return tokens;
    }

    function measureTokenWidth(text, style) {
        const measurement = scene.add.text(0, 0, text, style);
        if (measurement && typeof measurement.setVisible === 'function') measurement.setVisible(false);
        const w = measurement ? measurement.width : 0;
        if (measurement && typeof measurement.destroy === 'function') measurement.destroy();
        return w;
    }

    // build bullets
    let cursorY = 0;
    const maxLineWidth = bodyWidth - bodyPadding;
    points = Array.isArray(points) ? points : [];
    points.forEach(point => {
        // bullet
        const bulletX = -bodyWidth / 2;
        const textStartX = bulletX + bulletIndent;
        const bullet = scene.add.text(bulletX, cursorY, '•', { fontSize, color: bulletColor, fontStyle: 'bold' }).setOrigin(0, 0);
        container.add(bullet);

        const tokens = createTokens(point);
        let cx = textStartX;
        let line = 0;
        tokens.forEach(token => {
            if (!token.text) return;
            const isSpace = token.type === 'space';
            const style = { fontSize, color: token.color || bodyColor, wordWrap: { width: maxLineWidth } };
            if (token.requiresNormalText) style.forceNormalText = true;
            const tw = measureTokenWidth(token.text, style);
            if (!isSpace && cx > textStartX && (cx - textStartX + tw) > maxLineWidth) {
                cx = textStartX;
                line += 1;
            }
            if (cx === textStartX && isSpace) return;
            if (isSpace) {
                cx += tw;
                return;
            }
            const t = scene.add.text(cx, cursorY + line * lineHeight, token.text, style).setOrigin(0, 0);
            container.add(t);
            cx += tw;
        });
        cursorY += (line + 1) * lineHeight + bulletSpacing;
    });

    return cursorY;
}