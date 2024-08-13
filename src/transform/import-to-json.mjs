// The code reading data from a JS file, runs as a separate process to be able to run it synchronously

import * as path from 'node:path'
import * as fs from 'node:fs'
import * as url from 'node:url'

import exitCodes from './exit-codes.cjs'

const filePath = process.argv[2] ?? ''

if (!path.isAbsolute(filePath)) {
  console.error(`File path must be absolute: ${filePath}`)
  process.exit(exitCodes.INVALID_PATH)
}

if (!fs.existsSync(filePath)) {
  console.error(`File does not exist: ${filePath}`)
  process.exit(exitCodes.FILE_NOT_FOUND)
}

const fileUrl = url.pathToFileURL(filePath)

/**
 * @type {any}
 */
let importedModule

try {
  importedModule = await import(fileUrl)
} catch {
  console.error(`Could not import module: ${filePath}`)
  process.exit(exitCodes.IMPORT_FAILED)
}

if (!('default' in importedModule)) {
  console.error(`Imported module has no default export: ${filePath}`)
  process.exit(exitCodes.NO_DEFAULT_EXPORT)
}

/**
 * @type {string}
 */
let serializedData

try {
  const data = importedModule.default

  serializedData = JSON.stringify(data)

  if (typeof serializedData !== 'string') {
    throw new Error()
  }
} catch {
  console.error(`Imported module data could not be serialized: ${filePath}`)
  process.exit(exitCodes.DATA_SERIALIZATION_FAILED)
}

process.stdout.write(serializedData)
