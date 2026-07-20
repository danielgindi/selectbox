/* eslint-disable no-console */

const Fs = require('fs');
const Path = require('path');

const MagicString = require('magic-string').MagicString;
const Sass = require('sass');

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
                    entry: Path.resolve(process.cwd(), 'lib/index.js'),
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
