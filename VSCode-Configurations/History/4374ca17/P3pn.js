#!/usr/bin/env node

'use strict';

const shell = require('shelljs');
const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');
const css = require('./cssCompile');
const js = require('./jsCompile');
const createCartridge = require('./createCartridge');
const chalk = require('chalk');
const chokidar = require('chokidar');
const os = require('os');

const cwd = process.cwd();
const pwd = __dirname;
const TEMP_DIR = path.resolve(cwd, './tmp');

const optionator = require('optionator')({
    options: [{
        option: 'help',
        type: 'Boolean',
        description: 'Generate help message'
    }, {
        option: 'upload',
        type: '[path::String]',
        description: 'Upload a file to a sandbox. Requires dw.json file at the root directory.'
    }, {
        option: 'uploadCartridge',
        type: '[String]',
        description: 'Upload a cartridge. Requires dw.json file at the root directory.'
    }, {
        option: 'test',
        type: '[path::String]',
        description: 'Run unittests on specified files/directories.'
    }, {
        option: 'cover',
        type: 'Boolean',
        description: 'Run all unittests with coverage report.'
    }, {
        option: 'include',
        type: 'String',
        description: 'Include paths.'
    }, {
        option: 'exclude',
        type: 'String',
        description: 'Exclude paths.'
    }, {
        option: 'compile',
        type: 'String',
        description: 'Compile css/js files.',
        enum: ['css', 'js']
    }, {
        option: 'lint',
        type: 'String',
        description: 'Lint scss/js files.',
        enum: ['js', 'css']
    }, {
        option: 'createCartridge',
        type: 'String',
        description: 'Create new cartridge structure'
    }, {
        option: 'watch',
        type: 'Boolean',
        description: 'Watch and upload files'
    }, {
        option: 'onlycompile',
        type: 'Boolean',
        description: 'Only compile during the watch option.'
    }]
});

function checkForDwJson() {
    return fs.existsSync(path.join(cwd, 'dw.json'));
}

function clearTmp() {
    shell.rm('-rf', TEMP_DIR);
}

function dwuploadModule() {
    let dwupload = fs.existsSync(path.resolve(cwd, './node_modules/.bin/dwupload')) ?
        path.resolve(cwd, './node_modules/.bin/dwupload') :
        path.resolve(pwd, './node_modules/.bin/dwupload');

    if (os.platform() === 'win32') {
        dwupload += '.cmd';
    }
    return dwupload;
}

function shellCommands(param, fileOrCartridge) {
    const dwupload = dwuploadModule();
    if (os.platform() === 'win32') {
        return `cd ./cartridges && ${dwupload} ${param} ${fileOrCartridge} && cd ..`;
    }
    return `cd ./cartridges && node ${dwupload} ${param} ${fileOrCartridge} && cd ..`;
}

function uploadFiles(files) {
    shell.cp('dw.json', './cartridges/'); // copy dw.json file into cartridges directory temporarily

    files.forEach(file => {
        const relativePath = path.relative(path.join(cwd, './cartridges/'), file);
        shell.exec(shellCommands('--file', relativePath));
    });

    shell.rm('./cartridges/dw.json'); // remove dw.json file from cartridges directory
}

function deleteFiles(files) {
    shell.cp('dw.json', './cartridges/'); // copy dw.json file into cartridges directory temporarily

    files.forEach(file => {
        const relativePath = path.relative(path.join(cwd, './cartridges/'), file);
        shell.exec(shellCommands('delete --file', relativePath));
    });

    shell.rm('./cartridges/dw.json'); // remove dw.json file from cartridges directory
}

function createIstanbulParameter(option, command) {
    let commandLine = ' ';

    if (option) {
        commandLine = option.split(',')
            .map(commandPath => ' -' + command + ' ' + commandPath).join(' ') + ' ';
    }

    return commandLine;
}

const options = optionator.parse(process.argv);

if (options.help) {
    console.log(optionator.generateHelp());
    process.exit(0);
}


// upload a file
if (options.upload) {
    if (!checkForDwJson) {
        console.error(chalk.red('Could not find dw.json file at the root of the project.'));
        process.exit(1);
    }

    uploadFiles(options.upload);

    process.exit(0);
}

// upload cartridge
if (options.uploadCartridge) {
    if (!checkForDwJson) {
        console.error(chalk.red('Could not find dw.json file at the root of the project.'));
        process.exit(1);
    }

    shell.cp(path.join(cwd, 'dw.json'), path.join(cwd, './cartridges/'));

    const cartridges = options.uploadCartridge;
    cartridges.forEach(cartridge => {
        shell.exec(shellCommands('--cartridge', cartridge));
    });

    shell.rm(path.join(cwd, './cartridges/dw.json'));
    process.exit(0);
}

// run unittests
if (options.test) {
    const mocha = fs.existsSync(path.resolve(cwd, './node_modules/.bin/_mocha')) ?
        path.resolve(cwd, './node_modules/.bin/_mocha') :
        path.resolve(pwd, './node_modules/.bin/_mocha');
    const subprocess = spawn(
        mocha +
        ' --reporter spec ' +
        options.test.join(' '), { stdio: 'inherit', shell: true, cwd });

    subprocess.on('exit', code => {
        process.exit(code);
    });
}

// run unittest coverage
if (options.cover) {
    const istanbul = fs.existsSync(path.resolve(cwd, './node_modules/.bin/istanbul')) ?
        path.resolve(cwd, './node_modules/.bin/istanbul') :
        path.resolve(pwd, './node_modules/.bin/istanbul');
    const mocha = fs.existsSync(path.resolve(cwd, './node_modules/.bin/_mocha')) ?
        path.resolve(cwd, './node_modules/mocha/bin/_mocha') :
        path.resolve(pwd, './node_modules/mocha/bin/_mocha');

    const subprocess = spawn(
        istanbul +
        ' cover ' +
        createIstanbulParameter(options.exclude, 'x') +
        createIstanbulParameter(options.include, 'i') +
        mocha +
        ' -- -R spec test/unit/**/*.js', { stdio: 'inherit', shell: true, cwd });

    subprocess.on('exit', code => {
        process.exit(code);
    });
}

// compile static assetts
if (options.compile) {
    const packageFile = require(path.join(cwd, './package.json'));
    if (options.compile === 'js') {
        js(packageFile, pwd, code => {
            process.exit(code);
        });
    }
    if (options.compile === 'css') {
        css(packageFile).then(() => {
            clearTmp();
            console.log(chalk.green('SCSS files compiled.'));
        }).catch(error => {
            clearTmp();
            console.error(chalk.red('Could not compile css files.'), error);
        });
    }
}

if (options.lint) {
    if (options.lint === 'js') {
        const subprocess = spawn(
            path.resolve(cwd, './node_modules/.bin/eslint') +
            ' .', { stdio: 'inherit', shell: true, cwd });

        subprocess.on('exit', code => {
            process.exit(code);
        });
    }
    if (options.lint === 'css') {
        const subprocess = spawn(
            path.resolve(cwd, './node_modules/.bin/stylelint') +
            ' --syntax scss "**/*.scss"', { stdio: 'inherit', shell: true, cwd });

        subprocess.on('exit', code => {
            process.exit(code);
        });
    }
}

if (options.createCartridge) {
    const cartridgeName = options.createCartridge;
    console.log('Created folders and files for cartridge ' + cartridgeName);
    createCartridge(cartridgeName, cwd);
}

if (options.watch) {
    const packageFile = require(path.join(cwd, './package.json'));
    const cartridgesPath = path.join(cwd, 'cartridges');


    const scssWatcher = chokidar.watch(
        cartridgesPath + '/**/*.scss', {
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            }
        });

    const clientJSWatcher = chokidar.watch(
        cartridgesPath + '/**/client/**/*.js', {
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            }
        });

    if (!options.onlycompile) {
        const watcher = chokidar.watch(cartridgesPath, {
            ignored: [
                '**/cartridge/js/**',
                '**/cartridge/client/**',
                '**/*.scss'
            ],
            persistent: true,
            ignoreInitial: true,
            followSymlinks: false,
            awaitWriteFinish: {
                stabilityThreshold: 300,
                pollInterval: 100
            }
        });

        watcher.on('change', filename => {
            console.log('Detected change in file:', filename);
            uploadFiles([filename]);
        });

        watcher.on('add', filename => {
            console.log('Detected added file:', filename);
            uploadFiles([filename]);
        });

        watcher.on('unlink', filename => {
            console.log('Detected deleted file:', filename);
            deleteFiles([filename]);
        });
    }

    let jsCompilingInProgress = false;
    clientJSWatcher.on('change', filename => {
        console.log('Detected change in client JS file:', filename);
        if (!jsCompilingInProgress) {
            jsCompilingInProgress = true;
            js(packageFile, pwd, () => { jsCompilingInProgress = false; });
        } else {
            console.log('Compiling already in progress.');
        }
    });

    let cssCompilingInProgress = false;
    scssWatcher.on('change', filename => {
        console.log('Detected change in SCSS file:', filename);

        if (!cssCompilingInProgress) {
            cssCompilingInProgress = true;
            css(packageFile).then(() => {
                clearTmp();
                console.log(chalk.green('SCSS files compiled.'));
                cssCompilingInProgress = false;
            }).catch(error => {
                clearTmp();
                console.error(chalk.red('Could not compile css files.'), error);
                cssCompilingInProgress = false;
            });
        } else {
            console.log('Compiling already in progress.');
        }
    });
}
