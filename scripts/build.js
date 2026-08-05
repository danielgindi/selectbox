/* eslint-disable no-console */

const Fs = require('fs');
const Path = require('path');

const MagicString = require('magic-string').MagicString;
const Sass = require('sass');
const { stripTypeScriptTypes } = require('node:module');

// --- Compat build: publishes plain JS/SFC files at the *historical* `lib/` and
// `vue/` paths (e.g. `@danielgindi/selectbox/vue/DropList.vue`,
// `@danielgindi/selectbox/lib/DropList`), now that the real source lives in
// src/lib and src/vue (TypeScript). Before the TS migration those paths were
// plain JS/SFC source, consumed directly by downstream bundlers with no
// TS-aware tooling required - this keeps that contract intact.
//
// `lib/*` is just re-export shims onto `dist/lib.es6.js` (see libReexportShims
// below) rather than a second compiled copy of the classes - see the comment
// above libReexportShims. `vue/*` is a real per-file type-strip of the SFCs
// (not a bundle), so relative imports between them keep resolving exactly like
// they did pre-migration.
//
// Uses Node's built-in `stripTypeScriptTypes` (not the `typescript` package's
// `transpileModule`) so this keeps working regardless of the installed
// `typescript` version - as of TypeScript 7, `require('typescript')` no longer
// exposes a callable compiler API at all (it's a native Go binary now; a JS API
// is expected back in 7.1, but there's no need to depend on it for a plain
// type-erasure step like this one). `mode: 'transform'` (rather than 'strip')
// matches the old transpileModule behaviour, also downleveling enums/namespaces/
// parameter properties if any creep into these files, not just erasing type
// annotations in place.
const stripTypes = (source) => stripTypeScriptTypes(source, { mode: 'transform' });

const walk = (dir) => {
    let out = [];
    for (let entry of Fs.readdirSync(dir, { withFileTypes: true })) {
        const full = Path.join(dir, entry.name);
        if (entry.isDirectory()) out = out.concat(walk(full));
        else out.push(full);
    }
    return out;
};

const ensureDirFor = (filePath) => Fs.mkdirSync(Path.dirname(filePath), { recursive: true });

// Compiles a `.vue` SFC's `<script lang="ts">` block to plain `<script>`,
// leaving `<template>` (and any other blocks) untouched.
const compileVueFile = (srcFile, destFile) => {
    const source = Fs.readFileSync(srcFile, 'utf8');

    const scriptMatch = source.match(/<script[^>]*\blang=["']ts["'][^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        throw new Error(`Could not find a <script lang="ts"> block in ${srcFile}`);
    }

    const compiled = stripTypes(scriptMatch[1]).trimEnd();
    const output = source.slice(0, scriptMatch.index) +
        `<script>\n${compiled}\n</script>` +
        source.slice(scriptMatch.index + scriptMatch[0].length);

    ensureDirFor(destFile);
    Fs.writeFileSync(destFile, output);
};

const compileVueDir = (srcDir, destDir) => {
    for (let file of walk(srcDir)) {
        const destFile = Path.join(destDir, Path.relative(srcDir, file));

        if (file.endsWith('.vue')) {
            compileVueFile(file, destFile);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            const jsDestFile = destFile.replace(/\.ts$/, '.js');
            ensureDirFor(jsDestFile);
            Fs.writeFileSync(jsDestFile, stripTypes(Fs.readFileSync(file, 'utf8')));
        }
    }
};

// Hand-authored Vue component types (there's no vue-tsc in this toolchain to derive
// them from the SFCs) - see src/vue/component-types.d.ts for the real source. Published
// as: `vue/component-types.d.ts` itself (for consumers who want the named types
// directly), plus a `<Component>.vue.d.ts` sibling next to each compiled SFC so that
// `import DropList from '.../vue/DropList.vue'` is typed with no consumer setup -
// TS resolves a relative `./DropList.vue` specifier to a `./DropList.vue.d.ts` sibling
// declaration file automatically under `moduleResolution: "bundler"`/`"node16"`.
const vueComponentDts = {
    'DropList.vue.d.ts': [
        "import type { DropListVueComponent } from './component-types.js';",
        '',
        'declare const DropList: DropListVueComponent;',
        'export default DropList;',
        '',
    ].join('\n'),
    'SelectBox.vue.d.ts': [
        "import type { SelectBoxVueComponent } from './component-types.js';",
        '',
        'declare const SelectBox: SelectBoxVueComponent;',
        'export default SelectBox;',
        '',
    ].join('\n'),
    'index.d.ts': [
        "import DropList from './DropList.vue';",
        "import SelectBox from './SelectBox.vue';",
        '',
        'export { DropList, SelectBox };',
        '',
    ].join('\n'),
};

const writeVueComponentDts = (srcDir, destDir) => {
    // src/vue/component-types.d.ts imports its lib types via '../lib/...', which
    // resolves (within the source tree) to src/lib. Published from vue/, that same
    // relative path would resolve to the *shim* lib/ directory, which has no .d.ts
    // of its own - point it at the real, already-built type declarations instead.
    const componentTypesSrc = Fs.readFileSync(Path.join(srcDir, 'component-types.d.ts'), 'utf8')
        .replace(/(['"])\.\.\/lib\//g, '$1../dist/types/');
    Fs.writeFileSync(Path.join(destDir, 'component-types.d.ts'), componentTypesSrc);

    for (let [name, content] of Object.entries(vueComponentDts)) {
        Fs.writeFileSync(Path.join(destDir, name), content);
    }
};

// `lib/` publishes nothing but re-exports of the already-built `dist/lib.es6.js`
// bundle - there's no reason to also ship (and instantiate) a second,
// independently-compiled copy of the classes or their internal utils. This keeps
// `instanceof` checks and Symbol identities (ItemSymbol etc.) consistent whether
// a consumer imports from the package root, a `lib/*` deep import, or -
// transitively, since it imports via `../lib/...` too - the `vue/*` wrapper
// components.
const libReexportShims = {
    'DropList.js': "export { DropList as default, DropListDefaultOptions as DefaultOptions, ItemSymbol } from '../dist/lib.es6.js';\n",
    'SelectBox.js': "export { SelectBox as default, SelectBoxDefaultOptions as DefaultOptions } from '../dist/lib.es6.js';\n",
    'index.js': "export { DropList, SelectBox, DropListDefaultOptions, SelectBoxDefaultOptions, ItemSymbol } from '../dist/lib.es6.js';\n",
};

const buildCompat = () => {
    const repoRoot = Path.resolve(__dirname, '..');
    const destLib = Path.join(repoRoot, 'lib');
    const destVue = Path.join(repoRoot, 'vue');

    Fs.rmSync(destLib, { recursive: true, force: true });
    Fs.rmSync(destVue, { recursive: true, force: true });
    Fs.mkdirSync(destLib, { recursive: true });

    for (let [name, content] of Object.entries(libReexportShims)) {
        Fs.writeFileSync(Path.join(destLib, name), content);
    }

    compileVueDir(Path.join(repoRoot, 'src/vue'), destVue);
    writeVueComponentDts(Path.join(repoRoot, 'src/vue'), destVue);
};

(async () => {

    const { build } = await import('vite');

    await Fs.promises.rm('./dist', { recursive: true, force: true });
    await Fs.promises.rm('./css', { recursive: true, force: true });
    await Fs.promises.mkdir('./dist', { recursive: true });
    await Fs.promises.mkdir('./css', { recursive: true });

    const pkg = require('../package.json');
    const banner = [
        `/*!`,
        ` * ${pkg.name} ${pkg.version}`,
        ` * ${pkg.repository.url}`,
        ' */\n',
    ].join('\n');

    const globals = {
        '@danielgindi/dom-utils/lib/Dom': 'domUtilsDom',
        '@danielgindi/dom-utils/lib/DomCompat': 'domUtilsDomCompat',
        '@danielgindi/dom-utils/lib/Css': 'domUtilsCss',
        '@danielgindi/dom-utils/lib/DomEventsSink': 'domUtilsDomEventsSink',
        '@danielgindi/virtual-list-helper': 'VirtualListHelper',
        'keycode-js': 'keyCode',
        'mitt': 'mitt',
    };

    const external = (id) => {
        return id === 'keycode-js' ||
            id === 'mitt' ||
            id.startsWith('@danielgindi/dom-utils') ||
            id.startsWith('@danielgindi/virtual-list-helper');
    };

    const bannerPlugin = {
        name: 'selectbox-banner',

        renderChunk(code) {
            const magicString = new MagicString(code);
            magicString.prepend(banner);

            return {
                code: magicString.toString(),
                map: magicString.generateMap({
                    hires: true,
                }),
            };
        },
    };

    const buildTasks = [{
        dest: 'dist/lib.es6.js',
        sourceMap: true,
        outputFormat: 'es',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.es6.min.js',
        sourceMap: true,
        outputFormat: 'es',
        minified: true,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.umd.js',
        sourceMap: true,
        outputFormat: 'umd',
        outputName: 'SelectBox',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.umd.min.js',
        sourceMap: true,
        outputFormat: 'umd',
        outputName: 'SelectBox',
        minified: true,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.cjs.js',
        sourceMap: true,
        outputFormat: 'cjs',
        outputName: 'SelectBox',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.cjs.min.js',
        sourceMap: true,
        outputFormat: 'cjs',
        outputName: 'SelectBox',
        minified: true,
        ecmaVersion: 2022,
    }];

    for (let task of buildTasks) {
        console.info('Generating ' + task.dest + '...');

        const plugins = [bannerPlugin];


        await build({
            configFile: false,
            publicDir: false,
            root: process.cwd(),
            plugins: plugins,
            resolve: {
                mainFields: ['module', 'main'],
                preserveSymlinks: true,
            },
            build: {
                emptyOutDir: false,
                lib: {
                    entry: Path.resolve(process.cwd(), 'src/lib/index.ts'),
                    name: task.outputName,
                    formats: [task.outputFormat],
                    fileName: () => Path.basename(task.dest),
                },
                minify: task.minified ? 'terser' : false,
                outDir: Path.dirname(task.dest),
                sourcemap: task.sourceMap,
                target: 'es2022',
                terserOptions: {
                    toplevel: true,
                    compress: {
                        ecma: task.ecmaVersion,
                        passes: 2,
                    },
                },
                rolldownOptions: {
                    external: external,
                    treeshake: false,
                    output: {
                        globals: globals,
                        codeSplitting: false,
                    },
                },
            },
        });
    }

    console.info('Generating compat lib/ and vue/ output (re-exports dist/lib.es6.js so class identities stay unified)...');
    buildCompat();

    console.info('Generating css files....');

    for (let item of [
        { src: './scss/droplist.scss', dest: './css/droplist.css' },
        { src: './scss/selectbox.scss', dest: './css/selectbox.css' },
    ]) {
        let compiledSassData = await Sass.compileAsync(item.src, {
            sourceMap: true,
            style: 'compressed',
        });
        await Fs.promises.writeFile(item.dest, compiledSassData.css + `\n\n/*# sourceMappingURL=${Path.basename(item.dest)}.map */`);
        await Fs.promises.writeFile(item.dest + '.map', JSON.stringify(compiledSassData.sourceMap)
            .replace(/"sources":\["([^"]+)"]/,
                (_m, x) => '"sources":["../scss/' + x.substr(x.lastIndexOf('/') + 1) + '"]'));
    }

    console.info('Done.');

})();
