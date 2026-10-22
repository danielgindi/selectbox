import '../scss/droplist.scss';
import '../scss/selectbox.scss';
import './docs/docs.css';

import { createApp } from 'vue';
import pkg from '../package.json';
import { sections } from './docs/sections.js';
import { api } from './docs/api.js';
import { highlight } from './docs/highlight.js';

// Each demo is run from its module, and shown from the very same file's source.
const demoModules = import.meta.glob('./demos/*.{js,vue}', { eager: true, import: 'default' });
const demoSources = import.meta.glob('./demos/*.{js,vue}', { eager: true, query: '?raw', import: 'default' });

const html = (strings, ...values) => strings.reduce((out, s, i) => out + s + (values[i] ?? ''), '');

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'html') node.innerHTML = value;
        else if (key === 'class') node.className = value;
        else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
}

const icons = {
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></svg>',
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l5 5L20 6" /></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" /></svg>',
};

function codeBlock(code, lang, { copyable = true } = {}) {
    const pre = el('pre', { class: 'code' }, el('code', { html: highlight(code.trim(), lang) }));
    if (!copyable) return pre;

    const copy = el('button', { class: 'icon-button copy-button', type: 'button', 'aria-label': 'Copy code', html: icons.copy });
    copy.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(code.trim());
            copy.innerHTML = icons.check;
            setTimeout(() => copy.innerHTML = icons.copy, 1500);
        } catch (ignored) { /* clipboard unavailable */ }
    });

    return el('div', { class: 'code-wrapper' }, pre, copy);
}

function sectionHeading(item) {
    return el('h2', {},
        item.title,
        el('a', { class: 'anchor', href: `#${item.id}`, 'aria-label': `Link to ${item.title}`, html: icons.link }));
}

/** Simple form controls for demos that want them (the playground). */
function createControls(container) {
    const row = (label, input) => {
        container.append(el('label', { class: 'control' }, el('span', {}, label), input));
        return input;
    };

    return {
        toggle(name, initial, onChange) {
            const input = el('input', { type: 'checkbox', role: 'switch' });
            input.checked = initial;
            input.addEventListener('change', () => onChange(input.checked));
            row(name, input);
        },
        select(name, options, onChange) {
            const input = el('select', {}, ...options.map(option => el('option', { value: option }, option)));
            input.addEventListener('change', () => onChange(input.value));
            row(name, input);
        },
        text(name, initial, onChange) {
            const input = el('input', { type: 'text', value: initial });
            input.addEventListener('input', () => onChange(input.value));
            row(name, input);
        },
    };
}

/** Shows the live value of a SelectBox under its demo. */
function attachValueReadout(selectBox, container) {
    const output = el('output');
    const update = () => {
        const value = selectBox.getValue();
        output.textContent = value === undefined ? 'undefined' : JSON.stringify(value);
    };

    // The value settles (e.g. chip sorting) right after the event, so read it on the next tick
    selectBox.on('*', () => setTimeout(update));
    update();

    container.append(el('div', { class: 'value-readout' }, el('span', {}, 'Value'), output));
}

function renderExample(item) {
    const isVue = item.demo.endsWith('.vue');
    const source = demoSources[`./demos/${item.demo}`];
    const demo = demoModules[`./demos/${item.demo}`];

    const stage = el('div', { class: 'demo-stage' });
    const controls = el('div', { class: 'demo-controls' });
    const footer = el('div', { class: 'demo-footer' });

    const codeId = `${item.id}-code`;
    const codeToggle = el('button', {
        class: 'icon-button',
        type: 'button',
        'aria-label': 'Show code',
        'aria-expanded': 'false',
        'aria-controls': codeId,
        title: 'Show code',
        html: icons.code,
    });
    const code = el('div', { class: 'demo-code', id: codeId, hidden: '' },
        el('div', { class: 'code-file' }, `demos/${item.demo}`),
        codeBlock(source, isVue ? 'vue' : 'js'));

    codeToggle.addEventListener('click', () => {
        const show = code.hidden;
        code.hidden = !show;
        codeToggle.setAttribute('aria-expanded', String(show));
        codeToggle.setAttribute('title', show ? 'Hide code' : 'Show code');
    });

    const card = el('div', { class: 'example' },
        el('div', { class: 'example-toolbar' }, el('span', { class: 'example-label' }, isVue ? 'Vue' : 'JavaScript'), codeToggle),
        code,
        el('div', { class: 'demo' }, stage, controls),
        footer);

    let result;
    if (isVue) {
        createApp(demo).mount(stage);
    } else {
        result = demo(stage, createControls(controls));
    }

    if (!controls.childElementCount) controls.remove();
    if (result?.getValue) attachValueReadout(result, footer);
    if (!footer.childElementCount) footer.remove();

    return el('section', { id: item.id, class: 'doc-section' },
        sectionHeading(item),
        el('p', { class: 'section-description', html: item.description }),
        card);
}

function renderInstallation(item) {
    return el('section', { id: item.id, class: 'doc-section' },
        sectionHeading(item),
        codeBlock('npm i @danielgindi/selectbox', 'shell'),
        el('p', { html: 'Import the classes, or the Vue components:' }),
        codeBlock(html`
import { SelectBox, DropList } from '@danielgindi/selectbox';

// or, for Vue:
import { SelectBox, DropList } from '@danielgindi/selectbox/vue';`, 'js'),
        el('p', { html: 'Add the styles (SCSS, or the compiled CSS from <code>@danielgindi/selectbox/css/…</code>):' }),
        codeBlock(html`
@import '@danielgindi/selectbox/scss/droplist';
@import '@danielgindi/selectbox/scss/selectbox'; // depends on the droplist styles`, 'scss'),
        el('p', { html: 'With Vite, pre-bundle the CommonJS dependency in <code>vite.config.js</code>:' }),
        codeBlock(html`
export default {
    optimizeDeps: {
        include: ['fast-deep-equal'],
    },
};`, 'js'));
}

function renderApi(item) {
    const tables = api.map(table => {
        const head = el('tr', {}, ...table.columns.map(c => el('th', { scope: 'col' }, c)));
        const rows = table.rows.map(cells => el('tr', {}, ...cells.map((cell, i) =>
            i === table.columns.length - 1 ? el('td', {}, cell) : el('td', {}, el('code', {}, cell)))));

        return el('div', { class: 'api-block' },
            el('h3', { id: `api-${table.title.toLowerCase().replace(/\W+/g, '-')}` }, table.title),
            el('div', { class: 'table-scroll' }, el('table', {}, el('thead', {}, head), el('tbody', {}, ...rows))));
    });

    return el('section', { id: item.id, class: 'doc-section' }, sectionHeading(item), ...tables);
}

function renderNav() {
    const nav = document.getElementById('nav');
    for (const group of sections) {
        nav.append(
            el('div', { class: 'nav-group' }, group.group),
            el('ul', {}, ...group.items.map(item => el('li', {}, el('a', { href: `#${item.id}`, 'data-id': item.id }, item.title)))));
    }
}

function setupScrollSpy() {
    const links = new Map(Array.from(document.querySelectorAll('.nav a')).map(a => [a.dataset.id, a]));
    const visible = new Set();

    const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id);
            else visible.delete(entry.target.id);
        }

        // Highlight the first section (in document order) that is on screen
        const current = Array.from(links.keys()).find(id => visible.has(id));
        for (const [id, link] of links) {
            if (id === current) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        }
    }, { rootMargin: '-64px 0px -50% 0px' });

    document.querySelectorAll('.doc-section').forEach(section => observer.observe(section));
}

function setupNavDrawer() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('nav');
    const scrim = document.querySelector('.nav-scrim');

    const setOpen = open => {
        document.body.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        scrim.hidden = !open;
    };

    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
    scrim.addEventListener('click', () => setOpen(false));
    nav.addEventListener('click', event => event.target.closest('a') && setOpen(false));
}

function setupThemeToggle() {
    document.getElementById('theme-toggle').addEventListener('click', () => {
        const root = document.documentElement;
        const isDark = root.dataset.theme
            ? root.dataset.theme === 'dark'
            : matchMedia('(prefers-color-scheme: dark)').matches;

        root.dataset.theme = isDark ? 'light' : 'dark';
        try {
            localStorage.setItem('docs-theme', root.dataset.theme);
        } catch (ignored) { /* storage unavailable */ }
    });
}

document.getElementById('version').textContent = `v${pkg.version}`;
document.getElementById('repo-link').href = pkg.homepage.replace(/#.*$/, '');

const content = document.getElementById('content');
for (const group of sections) {
    for (const item of group.items) {
        if (item.kind === 'installation') content.append(renderInstallation(item));
        else if (item.kind === 'api') content.append(renderApi(item));
        else content.append(renderExample(item));
    }
}

renderNav();
setupScrollSpy();
setupNavDrawer();
setupThemeToggle();

// Sections are rendered by script, so jump to the requested one once they exist
if (location.hash)
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
