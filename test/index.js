/* eslint-env mocha */
const jsImporter = require('../dist/node-sass-js-importer')
const { isJSfile } = jsImporter
const sass = require('node-sass')
const { expect } = require('chai');
const { resolve } = require('path');

const EXPECTATION = 'body {\n  color: #c33; }\n';

describe('Import type test', function() {
  it('imports strings', function() {
    let result = sass.renderSync({
      file: './test/fixtures/strings/style.scss',
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  it('imports lists', function() {
    let result = sass.renderSync({
      file: './test/fixtures/lists/style.scss',
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  it('imports maps', function() {
    let result = sass.renderSync({
      file: './test/fixtures/maps/style.scss',
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  it('finds imports via includePaths', function() {
    let result = sass.renderSync({
      file: './test/fixtures/include-paths/style.scss',
      includePaths: ['./test/fixtures/include-paths/variables'],
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  it('finds imports via multiple includePaths', function() {
    let result = sass.renderSync({
      file: './test/fixtures/include-paths/style.scss',
      includePaths: ['./test/fixtures/include-paths/variables', './some/other/path/'],
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  it(`throws when an import doesn't exist`, function() {
    function render() {
      sass.renderSync({
        file: './test/fixtures/include-paths/style.scss',
        includePaths: ['./test/fixtures/include-paths/foo'],
        importer: jsImporter
      });
    }

    expect(render).to.throw(
      'Unable to find "variables.js" from the following path(s): ' +
      `${resolve(process.cwd(), 'test/fixtures/include-paths')}, ${process.cwd()}, ./test/fixtures/include-paths/foo. ` +
      'Check includePaths.'
    );
  });

  it('ignores non-json imports', function() {
    let result = sass.renderSync({
      file: './test/fixtures/non-json/style.scss',
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  // TODO: Added to verify named exports + CommonJS default export hack (see index.js).
  it('provides the default export when using node require to import', function() {
    let result = sass.renderSync({
      file: './test/fixtures/strings/style.scss',
      importer: jsImporter
    });

    expect(result.css.toString()).to.eql(EXPECTATION);
  });

  // TODO: Added to verify named exports + CommonJS default export hack (see index.js).
  it('provides named exports of internal methods', function() {
    expect(isJSfile('import.js')).to.be.true;
  });
});
