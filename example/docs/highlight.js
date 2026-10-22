// A tiny syntax highlighter for the code samples (JS, Vue SFCs, shell, SCSS).
// Single-pass and token based, so strings and comments never get mis-highlighted.

const escapeHtml = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const span = (cls, text) => `<span class="tok-${cls}">${escapeHtml(text)}</span>`;

const JS_KEYWORDS = new Set([
    'import', 'from', 'export', 'default', 'const', 'let', 'var', 'function', 'return', 'if', 'else',
    'for', 'of', 'in', 'while', 'new', 'class', 'extends', 'this', 'async', 'await', 'try', 'catch',
    'finally', 'throw', 'typeof', 'instanceof', 'switch', 'case', 'break', 'continue', 'null',
    'undefined', 'true', 'false', 'void', 'delete',
]);

const JS_TOKEN = new RegExp([
    /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/.source, // 1 comment
    /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)/.source, // 2 string
    /(\b\d[\d_]*(?:\.\d+)?\b)/.source, // 3 number
    /([A-Za-z_$][\w$]*)(?=\s*\()/.source, // 4 function call
    /([A-Za-z_$][\w$]*)/.source, // 5 identifier / keyword
].join('|'), 'g');

export function highlightJs(code) {
    let out = '';
    let last = 0;
    for (const m of code.matchAll(JS_TOKEN)) {
        out += escapeHtml(code.slice(last, m.index));
        last = m.index + m[0].length;

        if (m[1]) out += span('comment', m[1]);
        else if (m[2]) out += span('string', m[2]);
        else if (m[3]) out += span('number', m[3]);
        else {
            const word = m[4] ?? m[5];
            if (JS_KEYWORDS.has(word)) out += span('keyword', word);
            else if (m[4]) out += span('fn', word);
            else if (/^[A-Z]/.test(word)) out += span('type', word);
            else out += escapeHtml(word);
        }
    }
    return out + escapeHtml(code.slice(last));
}

const HTML_TOKEN = /(<!--[\s\S]*?-->)|(<\/?)([\w-]+)|([:@#]?[\w.-]+)(=)("[^"]*")|(\/?>)/g;

function highlightHtml(code) {
    let out = '';
    let last = 0;
    for (const m of code.matchAll(HTML_TOKEN)) {
        out += escapeHtml(code.slice(last, m.index));
        last = m.index + m[0].length;

        if (m[1]) out += span('comment', m[1]);
        else if (m[3]) out += escapeHtml(m[2]) + span('tag', m[3]);
        else if (m[4]) out += span('attr', m[4]) + escapeHtml(m[5]) + span('string', m[6]);
        else out += escapeHtml(m[7]);
    }
    return out + escapeHtml(code.slice(last));
}

function highlightVue(code) {
    // Highlight <script> contents as JS, everything else as markup.
    return code.split(/(<script[^>]*>[\s\S]*?<\/script>)/).map(part => {
        const script = part.match(/^(<script[^>]*>)([\s\S]*?)(<\/script>)$/);
        if (!script) return highlightHtml(part);
        return highlightHtml(script[1]) + highlightJs(script[2]) + highlightHtml(script[3]);
    }).join('');
}

function highlightShell(code) {
    return code.split('\n').map(line => line.startsWith('#')
        ? span('comment', line)
        : line.replace(/^(\S+)(.*)$/, (_, cmd, rest) => span('fn', cmd) + escapeHtml(rest)),
    ).join('\n');
}

function highlightScss(code) {
    return code.split('\n').map(line => {
        const m = line.match(/^(\s*)(@\w+)(\s+)(.*?)(;?)$/);
        if (!m) return escapeHtml(line);
        return escapeHtml(m[1]) + span('keyword', m[2]) + m[3] + span('string', m[4]) + m[5];
    }).join('\n');
}

export function highlight(code, lang) {
    switch (lang) {
        case 'vue': return highlightVue(code);
        case 'html': return highlightHtml(code);
        case 'shell': return highlightShell(code);
        case 'scss': return highlightScss(code);
        default: return highlightJs(code);
    }
}
