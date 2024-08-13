/**
 * @import * as Sass from 'sass'
 * @import * as ChildProcess from 'node:child_process'
 */

const path = require('path')
const url = require('url')
const childProcess = require('child_process')

const { isPromiseLike, isPlainObject } = require('./util/helpers.cjs')
const { fsResolver, includedPathsResolver } = require('./util/resolvers.cjs')
const exitCodes = require('./transform/exit-codes.cjs')
const transformObjectToSassVariables = require('./transform/js-to-scss.cjs')
const SassJsImporterDataSerializationFailedError = require('./errors/SassJsImporterDataSerializationFailedError.cjs')
const SassJsImporterFileNotFoundError = require('./errors/SassJsImporterFileNotFoundError.cjs')
const SassJsImporterImportFailedError = require('./errors/SassJsImporterImportFailedError.cjs')
const SassJsImporterInvalidPathError = require('./errors/SassJsImporterInvalidPathError.cjs')
const SassJsImporterNoDefaultExportError = require('./errors/SassJsImporterNoDefaultExportError.cjs')
const SassJsImporterDataParsingFailedError = require('./errors/SassJsImporterDataParsingFailedError.cjs')
const SassJsImporterInvalidDataError = require('./errors/SassJsImporterInvalidDataError.cjs')
const SassJsImporterUnknownError = require('./errors/SassJsImporterUnknownError.cjs')

/**
 * Check if the provided URL points to a JS file
 *
 * @param {string} url
 * @returns {boolean}
 */
function isJsFile(url) {
  return /\.[mc]?js$/.test(url)
}

/**
 * Create an importer for Sass' JavaScript API which imports JavaScript files as Sass variables
 *
 * @param {{
 *   resolve: (url: string, previous: string) => string|null|Promise<string|null>
 * }} options
 * @return {Sass.Importer}
 */
function createJsImporter({ resolve }) {
  /**
   * @param {string|null} absoluteFilePath
   * @return {URL|null}
   */
  const makeUrl = absoluteFilePath => {
    if (absoluteFilePath === null) return null

    return url.pathToFileURL(absoluteFilePath)
  }

  return {
    canonicalize(url, context) {
      if (!isJsFile(url)) return null
      if (context.containingUrl === null) return null

      const absoluteFilePath = resolve.call(
        this,
        url,
        context.containingUrl.pathname,
      )
      if (isPromiseLike(absoluteFilePath)) {
        return absoluteFilePath.then(makeUrl)
      } else {
        return makeUrl(absoluteFilePath)
      }
    },
    load(url) {
      const absoluteFilePath = url.pathname

      /**
       * @type {ChildProcess.SpawnSyncReturns<string>}
       */
      let result

      /**
       * @type {number|null}
       */
      let exitCode

      try {
        result = childProcess.spawnSync(
          process.execPath,
          [path.join('transform', 'import-to-json.mjs'), absoluteFilePath],
          {
            cwd: __dirname,
            encoding: 'utf8',
          },
        )
        exitCode = result.status
      } catch {
        throw new SassJsImporterUnknownError()
      }

      switch (exitCode) {
        case 0:
          break

        case exitCodes.INVALID_PATH:
          throw new SassJsImporterInvalidPathError(result.stderr)

        case exitCodes.FILE_NOT_FOUND:
          throw new SassJsImporterFileNotFoundError(result.stderr)

        case exitCodes.IMPORT_FAILED:
          throw new SassJsImporterImportFailedError(result.stderr)

        case exitCodes.NO_DEFAULT_EXPORT:
          throw new SassJsImporterNoDefaultExportError(result.stderr)

        case exitCodes.DATA_SERIALIZATION_FAILED:
          throw new SassJsImporterDataSerializationFailedError(result.stderr)

        default:
          throw new SassJsImporterUnknownError(result.stderr)
      }

      /**
       * @type {Record<string, unknown>}
       */
      let data

      try {
        data = JSON.parse(result.stdout)
      } catch {
        throw new SassJsImporterDataParsingFailedError(
          `Failed to parse JSON data: ${result.stdout}`,
        )
      }

      if (!isPlainObject(data)) {
        throw new SassJsImporterInvalidDataError('Data is not an object')
      }

      return {
        contents: transformObjectToSassVariables(data),
        syntax: 'scss',
      }
    },
  }
}

/**
 * A JavaScript importer for Sass' JavaScript API
 */
const jsImporter = /** @type {Sass.Importer<'sync'>} */ (
  createJsImporter({
    resolve: fsResolver,
  })
)

/**
 * Create a JS importer with the given resolver
 *
 * @param {{
 *   resolve: (this: Sass.LegacyImporterThis, url: string, previous: string) => string|null|Promise<string|null>
 * }} options
 * @return {Sass.LegacyImporter}
 */
function createLegacyJsImporter({ resolve }) {
  const jsImporter = createJsImporter({ resolve })

  /**
   * @param {URL|null} canonicalUrl
   * @return {Sass.LegacyImporterResult}
   */
  const loadJs = canonicalUrl => {
    if (canonicalUrl === null) return null

    let result
    try {
      result = /** @type {Sass.ImporterResult | null} */ (
        jsImporter.load(canonicalUrl)
      )
    } catch (error) {
      return /** @type {Error} */ (error)
    }

    if (result === null) return null

    return { contents: result.contents }
  }

  /**
   * @overload
   * @this {Sass.LegacyImporterThis}
   * @param {string} requestUrl
   * @param {string} previousUrl
   * @param {(result: Sass.LegacyImporterResult) => void} done
   * @returns {void}
   */

  /**
   * @overload
   * @this {Sass.LegacyImporterThis}
   * @param {string} requestUrl
   * @param {string} previousUrl
   * @returns {Sass.LegacyImporterResult}
   */

  /**
   * @this {Sass.LegacyImporterThis}
   * @param {string} requestUrl
   * @param {string} previousUrl
   * @param {undefined|((result: Sass.LegacyImporterResult) => void)} done
   * @returns {void|Sass.LegacyImporterResult}
   */
  return function (requestUrl, previousUrl, done) {
    const containingUrl = url.pathToFileURL(previousUrl)
    const context = /** @type {Sass.CanonicalizeContext} */ ({ containingUrl })
    const canonicalUrl = jsImporter.canonicalize.call(this, requestUrl, context)

    if (isPromiseLike(canonicalUrl)) {
      canonicalUrl
        .then(url => {
          done?.(loadJs(url))
        })
        .catch(error => {
          done?.(error)
        })
    } else {
      return loadJs(canonicalUrl)
    }
  }
}

/**
 * A JavaScript importer for Sass' legacy JavaScript API
 */
const legacyJsImporter = /** @type {Sass.LegacySyncImporter} */ (
  createLegacyJsImporter({
    resolve(url, prev) {
      const fsResult = fsResolver(url, prev)
      if (fsResult !== null) return fsResult

      if (
        typeof this?.options?.includePaths === 'string' &&
        this.options.includePaths.length > 0
      ) {
        const includePaths = this.options.includePaths.split(path.delimiter)
        const includedPathsResult = includedPathsResolver(url, includePaths)
        return includedPathsResult
      }

      return null
    },
  })
)

/**
 * @typedef {(
 *   prev: string,
 *   url: string,
 *   callback: (error: Error, result: string|null) => void
 * ) => void} WebpackResolver
 */

/**
 * Create a JS importer for sass-loader
 *
 * @param {any} loaderContext The loader context object passed to the 'sassOptions' function
 * @returns {Sass.Importer<'async'>}
 */
function createSassLoaderJsImporter(loaderContext) {
  const resolveRequest = /** @type {WebpackResolver} */ (
    loaderContext.getResolve({
      extensions: ['.js', '.mjs', '.cjs'],
      preferRelative: true,
    })
  )

  return createJsImporter({
    resolve: (url, prev) =>
      new Promise((resolve, reject) => {
        const fsResult = fsResolver(url, prev)
        if (fsResult) {
          resolve(fsResult)
          return
        }

        resolveRequest(prev, url, (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        })
      }),
  })
}

/**
 * Create a legacy JS importer for sass-loader
 *
 * @param {any} loaderContext The loader context object passed to the 'sassOptions' function
 * @returns {Sass.LegacyAsyncImporter}
 */
function createSassLoaderLegacyJsImporter(loaderContext) {
  const resolveRequest = /** @type {WebpackResolver} */ (
    loaderContext.getResolve({
      extensions: ['.js', '.mjs', '.cjs'],
      preferRelative: true,
    })
  )

  return createLegacyJsImporter({
    resolve: (url, prev) =>
      new Promise((resolve, reject) => {
        const fsResult = fsResolver(url, prev)
        if (fsResult) {
          resolve(fsResult)
          return
        }

        resolveRequest(prev, url, (error, result) => {
          if (error) {
            reject(error)
          } else {
            resolve(result)
          }
        })
      }),
  })
}

exports.jsImporter = jsImporter
exports.legacyJsImporter = legacyJsImporter
exports.createSassLoaderJsImporter = createSassLoaderJsImporter
exports.createSassLoaderLegacyJsImporter = createSassLoaderLegacyJsImporter
