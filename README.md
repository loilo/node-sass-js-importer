# node-sass-js-importer

[![Tests](https://img.shields.io/github/actions/workflow/status/loilo/node-sass-js-importer/test.yml?label=tests)](https://github.com/loilo/node-sass-js-importer/actions)
[![Version on npm](https://img.shields.io/npm/v/node-sass-js-importer)](https://www.npmjs.com/package/node-sass-js-importer)

> Run JavaScript and import the result as variables into [Sass](https://sass-lang.com/)

## Motivation

Sharing configuration and other data between all technologies of your stack (and thus, also with Sass) can prove to be a hassle. While basic use cases are coverable through JSON files (see [node-sass-json-importer](https://github.com/pmowrer/node-sass-json-importer)), doing further processing of such data directly in Sass often is suboptimal. Node.js scripts can be the more convenient choice for these kinds of tasks.

This package aims to solve this problem by making the `@import`/`@use` rules in Sass work with JavaScript files through custom importers for the [current](https://sass-lang.com/documentation/js-api/interfaces/importer/) as well as the [legacy](https://sass-lang.com/documentation/js-api/types/legacyimporter/) Sass JavaScript API.

## Usage in SCSS Code

Given the following `colors.mjs` file:

```js
export default {
  primary: 'blue',
  secondary: 'red',
}
```

The importer allows your Sass file in the same folder to do this:

```scss
@import 'colors.mjs';

.some-class {
  background: $primary;
}
```

Note that [`@import` is somewhat deprecated](https://sass-lang.com/documentation/at-rules/import) and you should use `@use` instead:

```scss
@use 'colors.mjs';

.some-class {
  // Data is automatically namespaced:
  background: colors.$primary;
}
```

To achieve the same behavior as with `@import`, you can [change the namespace to `*`](https://sass-lang.com/documentation/at-rules/use#choosing-a-namespace):

```scss
@use 'colors.mjs' as *;

.some-class {
  // Colors are no longer namespaced:
  background: $primary;
}
```

### Importing Strings

As JavaScript values don't map directly to Sass's data types, a common source of confusion is how to handle strings. While [Sass allows strings to be both quoted and unqouted](https://sass-lang.com/documentation/values/strings#unquoted), strings containing spaces, commas and/or other special characters have to be wrapped in quotes.

The importer will automatically add quotes around all strings that are not valid unquoted strings or hex colors (and that are not already quoted, of course):

<!-- prettier-ignore -->
Input | Output | Explanation
-|-|-
`{ color: 'red' }` | `$color: red;` | Valid unquoted string
`{ color: '#f00' }` | `$color: #f00;` | Valid hex color
`{ color: "'red'" }` | `$color: "red";` | Explicitly quoted string
`{ color: "really red" }` | `$color: "really red";` | Invalid (multi-word) unquoted string

### Map Keys

Map keys are always quoted by the importer:

```js
// colors.mjs
export default {
  colors: {
    red: '#f00',
  },
}
```

```scss
@use 'colors.mjs' as *;

:root {
  // This does not work:
  color: map-get($colors, red);

  // Do this instead:
  color: map-get($colors, 'red');
}
```

### Module Formats

The importer supports both CommonJS and ES modules through explicit file extensions (`.cjs`, `.mjs`). If you're using a `.js` extension, the importer will use the same default as the node runtime does (i.e. depending on your `package.json`'s `module` field).

### Resolving Paths

The importer tries to stick to the same path resolution logic as Sass itself. This means that it tries to interpret import requests as (relative) file system paths:

```scss
// In /path/to/some-file.scss
@use 'config/colors.mjs'; // Resolves to /path/to/config/colors.mjs
```

If no according file can be found, further resolving depends on the kind of importer you're using:

- When using the [`sass-loader` factories](#sass-loader-for-webpackrspack), the importer will try to resolve paths the same way webpack does. This means that you can use npm package names or webpack aliases to reference your JavaScript files.
- When using the Sass compiler directly [with the legacy Sass JavaScript API](#sass-with-legacy-javascript-api), the importer will try to find the requested file inside the configured [`includedPaths`](https://sass-lang.com/documentation/js-api/interfaces/legacystringoptions/#includePaths).
- In contrast, using the Sass compiler directly [with the modern Sass JavaScript API](#sass-with-modern-javascript-api) will _not_ consider the [`loadPaths`](https://sass-lang.com/documentation/js-api/interfaces/options/#loadPaths) option, as the modern API purposefully does not share Sass options with importers.

## Setting up the Importer

> [!NOTE]
>
> Some notes on the code samples below:
>
> 1. The examples make use of ES modules, but the importer will work in CommonJS environments just fine.
> 2. Examples are using the [`sass`](https://npmjs.com/package/sass) package. However, the same code should work equally well with [`sass-embedded`](https://npmjs.com/package/sass-embedded). The legacy API examples should even work with [`node-sass`](https://www.npmjs.com/package/node-sass) (although this is no longer tested since Node Sass has been deprecated).

### Sass with Modern JavaScript API

```js
import * as sass from 'sass'
import { jsImporter } from 'node-sass-js-importer'

sass.compile('some-file.scss', {
  importers: [jsImporter],
})
```

### Sass with Legacy JavaScript API

```js
import * as sass from 'sass'
import { legacyJsImporter } from 'node-sass-js-importer'

sass.renderSync({
  file: 'some-file.scss',
  importer: [legacyJsImporter],
})
```

### [sass-loader](https://github.com/webpack-contrib/sass-loader) (for [webpack](https://webpack.js.org/)/[rspack](https://rspack.dev/))

This package exposes the `createSassLoaderJsImporter`/`createSassLoaderLegacyJsImporter` factory functions to create importers that work well with `sass-loader`.

While you could just use the importers directly (as documented in the previous section), the `sass-loader`-specific factory functions enable you to use webpack's request resolution (like pointing to npm packages or aliases) to reference your JavaScript files. Learn more about this in the [Resolving Paths](#resolving-paths) section.

To use the importer factory with `sass-loader`, you need to pass a function to its `sassOptions` option to get access to the `loaderContext` object. This object then needs to be passed to the importer factory:

```js
// webpack.config.js / rspack.config.js

import { createSassLoaderJsImporter } from 'node-sass-js-importer'

export default {
  // ...
  {
    loader: 'sass-loader',
    options: {
      sassOptions: loaderContext => ({
        return {
          importers: [
            createSassLoaderJsImporter(loaderContext)
          ],
        }
      },
    },
  },
  // ...
}
```

> [!NOTE]
>
> While the code above uses the importer for the modern Sass JavaScript API, you can also create a legacy importer through the `createSassLoaderLegacyJsImporter` factory instead. In that case, make sure to also adjust the [`api`](https://github.com/webpack-contrib/sass-loader#api) option accordingly, if needed.

## Credit

The initial implementation of this importer was based on the [node-sass-json-importer](https://github.com/pmowrer/node-sass-json-importer) package.
