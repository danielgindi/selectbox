/* eslint-disable no-console */

const FsExtra = require('fs-extra');
const Fs = require('fs');
const Path = require('path');

(async () => {

    await FsExtra.emptyDir('./dist');
    await FsExtra.emptyDir('./css');

    const Rollup = require('rollup');

    const rollupTasks = [{
        dest: 'dist/lib.es6.js',
        sourceMap: true,
        outputFormat: 'esm',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.es6.min.js',
        sourceMap: true,
        outputFormat: 'esm',
        minified: true,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.umd.js',
        sourceMap: true,
        outputFormat: 'umd',
        outputName: 'SelectBox',
        babelTargets: '> 0.25%, not dead',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.umd.min.js',
        sourceMap: true,
        outputFormat: 'umd',
        outputName: 'SelectBox',
        babelTargets: '> 0.25%, not dead',
        minified: true,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.cjs.js',
        sourceMap: true,
        outputFormat: 'cjs',
        outputName: 'SelectBox',
        babelTargets: '> 0.25%, not dead',
        minified: false,
        ecmaVersion: 2022,
    }, {
        dest: 'dist/lib.cjs.min.js',
        sourceMap: true,
        outputFormat: 'cjs',
        outputName: 'SelectBox',
        babelTargets: '> 0.25%, not dead',
        minified: true,
        ecmaVersion: 2022,
    }];

    const inputFile = 'lib/index.js';

    for (let task of rollupTasks) {
        console.info('Generating ' + task.dest + '...');

        let plugins = [
            require('rollup-plugin-node-resolve')({
                mainFields: ['module', 'main'],
            }),
            require('rollup-plugin-commonjs')({}),
        ];

        const pkg = require('../package.json');
        const banner = [
            `/*!`,
            ` * ${pkg.name} ${pkg.version}`,
            ` * ${pkg.repository.url}`,
            ' */\n',
        ].join('\n');

        if (task.babelTargets) {
            plugins.push(require('rollup-plugin-babel')({
                sourceMap: !!task.sourceMap,
                presets: [
                    ['@babel/env', {
                        targets: task.babelTargets,
                        useBuiltIns: 'usage',
                        corejs: 3,
                    }],
                ],
                compact: false,
                minified: false,
                comments: true,
                retainLines: true,
                exclude: 'node_modules/**/core-js/**/*',
            }));
        }

        if (task.minified) {
            plugins.push(require('rollup-plugin-terser').terser({
                toplevel: true,
                compress: {
                    ecma: task.ecmaVersion,
                    passes: 2,
                },
            }));
        }

        plugins.push({
            name: 'banner',

            renderChunk(code, chunk, _outputOptions = {}) {

                const magicString = new (require('magic-string'))(code);
                magicString.prepend(banner);

                return {
                    code: magicString.toString(),
                    map: magicString.generateMap({
                        hires: true,
                    }),
                };
            },
        });

        const bundle = await Rollup.rollup({
            preserveSymlinks: true,
            treeshake: false,
            onwarn(warning, warn) {
                if (warning.code === 'THIS_IS_UNDEFINED') return;
                warn(warning);
            },
            input: inputFile,
            plugins: plugins,
            external: [
                /^@danielgindi\/dom-utils(\/|$)/,
                /^@danielgindi\/virtual-list-helper(\/|$)/,
                'keycode-js',
                'parse-css-transition',
            ],
        });

        let generated = await bundle.generate({
            name: task.outputName,
            sourcemap: task.sourceMap,
            format: task.outputFormat,
            exports: task.outputExports,
            globals: {
                '@danielgindi/dom-utils/lib/Dom': 'domUtilsDom',
                '@danielgindi/dom-utils/lib/DomCompat': 'domUtilsDomCompat',
                '@danielgindi/dom-utils/lib/Css': 'domUtilsCss',
                '@danielgindi/dom-utils/lib/DomEventsSink': 'domUtilsDomEventsSink',
                '@danielgindi/virtual-list-helper': 'VirtualListHelper',
                'keycode-js': 'keyCode',
                'parse-css-transition': 'parseCssTransition',
            },
        });

        let code = generated.output[0].code;

        if (task.sourceMap === true && generated.output[0].map) {
            let sourceMapOutPath = task.dest + '.map';
            FsExtra.writeFileSync(sourceMapOutPath, generated.output[0].map.toString());
            code += '\n//# sourceMappingURL=' + Path.basename(sourceMapOutPath);
        }

        FsExtra.writeFileSync(task.dest, code);
    }

    console.info('Generating css files....');

    const Sass = require('sass');
    const renderSass = require('util').promisify(Sass.render.bind(Sass));
    for (let item of [
        { src: './scss/droplist.scss', dest: './css/droplist.css' },
        { src: './scss/selectbox.scss', dest: './css/selectbox.css' },
    ]) {
        let compiledSassData = await renderSass({
            file: item.src,
            outFile: item.dest,
            sourceMap: true,
            outputStyle: 'compressed',
        });
        await Fs.promises.writeFile(item.dest, compiledSassData.css);
        await Fs.promises.writeFile(item.dest + '.map', compiledSassData.map.toString('utf8')
            .replace(/"sources":\["([^"]+)"]/, (m, x) => '"sources":["../scss/' + x.substr(x.lastIndexOf('/') + 1) + '"]'));
    }

    console.info('Done.');

})();
