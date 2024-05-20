#!/usr/bin/env node

'use strict'; /* globals process */

const fs = require('fs'),
      path = require('path'),
      exec = require('child_process').execSync;

const SELF = `fix-nvm-update`,
      TMP = `__TMP_NODE`,
      MV = `mv -v`;

const OPTIONS = { encoding: `utf8` },
      join = path.join.bind(path);

const DEFAULT_NODES = join(process.env.HOME, `.nvm`, `versions`, `node`),
      CONFIG = join(__dirname, `..`, `config.json`),
      PACKAGE = join(__dirname, `..`, `package.json`);

/**
 * Move global package from old Node.js version to new.
 * @param  {string[]} args List of string arguments.
 * @return {boolean} false, if some unexpected happened.
 */
const fixNvmUpdate = module.exports = args => {

  const arg = args[0], len = args.length;

  try {
    fs.accessSync(CONFIG);
  } catch(e) {
    console.log(`Cannot find config ("${CONFIG}"). Create new config file.`);
    writeJSON(CONFIG, { nodes: DEFAULT_NODES });
  }

  if (len === 0 || !arg || arg.includes(`help`) ||
      (arg === `get` && len !== 1) ||
      (arg === `set` && len !== 3) ||
      (arg !== `set` && arg !== `get` && len !== 1)) {
    console.log(
      `usage: ${SELF} <new-version>\n` +
      `       ${SELF} get\n` +
      `       ${SELF} set last v6.6.0\n` +
      `       ${SELF} set nodes /home/user/.nvm/versions/node\n` +
      `${SELF} version ${require(PACKAGE).version}`
    );
    return true;
  }

  const config = readJSON(CONFIG);

  if (!(config instanceof Object)) {
    console.error(`Wrong config format (in "${CONFIG}").`);
    return false;
  }

  if (arg === `get`) {
    console.log(config);
    return true;
  }

  if (arg === `set`) {
    config[args[1]] = args[2];
    console.log(`Set ${args[1]} = "${args[2]}".`);
    writeJSON(CONFIG, config);
    return true;
  }

  const from = config.last, to = arg, nodes = config.nodes;

  if (!isVersion(from)) {
    console.error(`Wrong last Node version format ("${from}").\n` +
      `Set correct last version: ${SELF} set last v6.6.0`);
    return false;
  }

  if (from === to) {
    console.log(`"${to}" already setted as a last version.`);
    return true;
  }

  if (!nodes || typeof nodes !== `string`) {
    console.error(`Wrong nodes format (in "${CONFIG}"): "${nodes}".`);
    return false;
  }

  if (!isVersion(to)) {
    console.error(`Wrong new Node version format ("${to}").`);
    return false;
  }

  const toLib = join(nodes, to, `lib`, `node_modules`),
        toBin = join(nodes, to, `bin`);

  if (!isInstalled(toLib, toBin)) {
    console.log(`New version "${to}" not yet installed (in "${nodes}").`);
    return true;
  }

  const fromLib = join(nodes, from, `lib`, `node_modules`),
        fromBin = join(nodes, from, `bin`);

  if (!isInstalled(fromLib, fromBin)) {
    console.error(`Last version "${from}" not installed (in "${nodes}").`);
    return false;
  }

  const tmp = join(nodes, TMP);

  try {
    fs.accessSync(tmp);
    console.error(`TMP directory already exists ("${tmp}").`);
    return false;
  } catch (e) {}

  const tmpAll  = join(tmp, `*`),
        tmpNpm  = join(tmp, `npm`),
        tmpNode = join(tmp, `node`),
         libAll = join(fromLib, `*`),
         binAll = join(fromBin, `*`);

  const commands = [

    [MV, libAll, tmp],
    [MV, tmpNpm, fromLib],
    [MV, tmpAll, toLib],

    [MV, binAll, tmp],
    [MV, tmpNpm, tmpNode, fromBin],
    [MV, tmpAll, toBin]

  ];

  config.last = to;
  console.log(`Write version "${to}" to config as last installed.`);
  writeJSON(CONFIG, config);

  console.log(`Create TMP directory ("${tmp}").`);
  fs.mkdirSync(tmp);

  for (const command of commands) {

    const run = command.join(` `);

    console.log(`\nExec "${run}".\n`);
    console.log(exec(run, OPTIONS));
  }

  console.log(`Remove TMP directory ("${tmp}").`);
  fs.rmdirSync(tmp);

  return true;
};

/**
 * Throw error, if value is not true.
 * @param  {*} value
 * @param  {string} msg
 * @throws {Error}
 */
const assert = (value, msg) => {
  if (value !== true) throw Error('Assert ' + (msg || ''));
};

/**
 * Sync reading JSON from filesystem.
 * @param  {string}  name Filename.
 * @return {?Object} Parse JSON value (null if no such file).
 */
const readJSON = name => {
  try {
    return JSON.parse(fs.readFileSync(name, 'utf8'));
  } catch(e) { return null; }
};

/**
 * Sync writing JSON to file.
 * @param {string} name Filename.
 * @param {?Object} data JSON value.
 */
const writeJSON = (name, data) => {
  fs.writeFileSync(name, JSON.stringify(data));
};

/**
 * Checks that such Node version installed.
 * @param  {string} lib Path to lib/
 * @param  {string} bin Path to bin/
 * @return {boolean} True, if there is such version.
 */
const isInstalled = (lib, bin) => {
  try {
    assert(fs.statSync(lib).isDirectory());
    assert(fs.statSync(bin).isDirectory());
    assert(fs.statSync(join(lib,  `npm`)).isDirectory());
    assert(fs.statSync(join(bin,  `npm`)).isFile());
    assert(fs.statSync(join(bin, `node`)).isFile());
  } catch (e) {
    return false;
  }
  return true;
};

/**
 * Return true, if ver is correct Node version.
 * @param  {*} ver
 * @return {boolean}
 */
const isVersion = ver => !!ver &&
    typeof ver === `string` && /^[a-z0-9-.]+$/i.test(ver);

/**
 * If called from command line, execute with it args.
 */
if (require.main === module) {
  fixNvmUpdate(process.argv.slice(2));
}