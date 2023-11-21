import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import * as sass from 'sass'
import * as moduleImporter from '../src/importer.module.js'
import * as commonjsImporter from '../src/importer.commonjs.cjs'

const EXPECTATION = 'body {\n  color: #c33;\n}'

for (const { jsImporter, isJsFile, mode } of [
  moduleImporter,
  commonjsImporter
]) {
  describe(`Import tests for type=${mode}`, function () {
    describe('module formats', function () {
      it('supports .cjs files', function () {
        let result = sass.renderSync({
          file: './test/fixtures/module-formats/cjs/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })

      it('supports .mjs files', function () {
        let result = sass.renderSync({
          file: './test/fixtures/module-formats/mjs/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })

      it('supports ESM in .js files', function () {
        let result = sass.renderSync({
          file: './test/fixtures/module-formats/js/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })
    })

    it('imports strings', function () {
      let result = sass.renderSync({
        file: './test/fixtures/strings/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('imports lists', function () {
      let result = sass.renderSync({
        file: './test/fixtures/lists/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('imports maps', function () {
      let result = sass.renderSync({
        file: './test/fixtures/maps/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('imports maps with single-quoted keys', function () {
      let result = sass.renderSync({
        file: './test/fixtures/maps/single-quoted-key/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('imports maps with double-quoted keys', function () {
      let result = sass.renderSync({
        file: './test/fixtures/maps/double-quoted-key/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('finds imports via includePaths', function () {
      let result = sass.renderSync({
        file: './test/fixtures/include-paths/style.scss',
        includePaths: ['./test/fixtures/include-paths/variables'],
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it('finds imports via multiple includePaths', function () {
      let result = sass.renderSync({
        file: './test/fixtures/include-paths/style.scss',
        includePaths: [
          './test/fixtures/include-paths/variables',
          './some/other/path/'
        ],
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    it(`throws when an import doesn't exist`, function () {
      function render() {
        sass.renderSync({
          file: './test/fixtures/include-paths/style.scss',
          includePaths: ['./test/fixtures/include-paths/foo'],
          importer: jsImporter
        })
      }

      expect(render).toThrow(
        'Unable to find "variables.cjs" from the following path(s): ' +
          `${resolve(
            process.cwd(),
            'test/fixtures/include-paths'
          )}, ${process.cwd()}, ./test/fixtures/include-paths/foo. ` +
          'Check includePaths.'
      )
    })

    it('ignores non-js imports', function () {
      let result = sass.renderSync({
        file: './test/fixtures/non-js/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(EXPECTATION)
    })

    describe('@use', function () {
      it('can utilise @use', function () {
        let result = sass.renderSync({
          file: './test/fixtures/use/namespaced/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })

      it('can utilise @use with an alias', function () {
        let result = sass.renderSync({
          file: './test/fixtures/use/aliased/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })

      it('can utilise @use without namespace', function () {
        let result = sass.renderSync({
          file: './test/fixtures/use/unwrapped/style.scss',
          importer: jsImporter
        })

        expect(result.css.toString()).toBe(EXPECTATION)
      })
    })

    // TODO: Added to verify named exports + CommonJS default export hack (see index.js).
    it('provides named exports of internal methods', function () {
      expect(isJsFile('import.js')).toBe(true)
      expect(isJsFile('import.mjs')).toBe(true)
    })

    it('automatically quotes strings where appropriate', function () {
      let result = sass.renderSync({
        file: './test/fixtures/quoting/style.scss',
        importer: jsImporter
      })

      expect(result.css.toString()).toBe(`body {
  color: red;
  color: #f00;
  color: "red";
  color: "really red";
}`)
    })
  })
}
