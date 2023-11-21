const { existsSync, readFileSync } = require('fs')
const { resolve, dirname, delimiter } = require('path')
const { isPlainObject } = require('is-plain-object')
const execa = require('execa')

function jsImporter(url, prev) {
  if (!isJsFile(url)) {
    return null
  }

  let includePaths = this.options.includePaths?.split(delimiter) ?? []
  let paths = [dirname(prev), ...includePaths]

  let file = paths
    .map(path => resolve(path, url))
    .filter(existsSync)
    .pop()

  if (!file) {
    return new Error(
      `Unable to find "${url}" from the following path(s): ${paths.join(
        ', '
      )}. Check includePaths.`
    )
  }

  try {
    let json = execa.sync('node', ['transformer.mjs', file], {
      cwd: __dirname
    }).stdout
    let data = JSON.parse(json)

    return {
      contents: transformObjectToSass(data)
    }
  } catch (e) {
    return new Error(
      `node-sass-js-importer: Error transforming JavaScript to SASS. Check if you exported a valid JavaScript object. ${e}`
    )
  }
}

function isJsFile(url) {
  return /\.[mc]?js$/.test(url)
}

function transformObjectToSass(object) {
  return Object.keys(object)
    .map(key => `$${key}: ${parseValue(object[key])};`)
    .join('\n')
}

let hexPattern = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
let unquotedStringPattern = /^(-?([a-z_]|[^ -~])|--)([a-z0-9_-]|[^ -~])*$/i
let quotedStringPattern = /^("([^"\\]|\\.)*"|'([^'\\]|\\.)*')$/gsu

function parseValue(value) {
  if (Array.isArray(value)) {
    return parseList(value)
  } else if (isPlainObject(value)) {
    return parseMap(value)
  } else if (
    typeof value === 'string' &&
    (hexPattern.test(value) ||
      unquotedStringPattern.test(value) ||
      quotedStringPattern.test(value))
  ) {
    return value
  } else {
    return JSON.stringify(value)
  }
}

function parseList(list) {
  return `(${list.map(value => `${parseValue(value)},`).join('')})`
}

function parseMap(map) {
  return `(${Object.keys(map)
    .map(key => `'${key.replace(/'/g, "\\'")}': ${parseValue(map[key])},`)
    .join('')})`
}

exports.jsImporter = jsImporter
exports.isJsFile = isJsFile
exports.transformObjectToSass = transformObjectToSass
exports.parseValue = parseValue
exports.parseList = parseList
exports.parseMap = parseMap
