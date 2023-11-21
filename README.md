# node-sass-js-importer

[![Tests](https://badgen.net/github/checks/loilo/node-sass-js-importer/master)](https://github.com/loilo/node-sass-js-importer/actions)
[![Version on npm](https://badgen.net/npm/v/node-sass-js-importer)](https://www.npmjs.com/package/node-sass-js-importer)

JavaScript data importer for [sass](https://github.com/sass/sass) (originally for the now deprecated [node-sass](https://github.com/sass/node-sass), hence the package name).

This allows `@import`ing/`@use`ing `.js`/`.mjs`/`.cjs` files in Sass files parsed by `sass`.

This is a fork of the [node-sass-json-importer](https://github.com/Updater/node-sass-json-importer) repository, adjusted for usage with JavaScript files.

## Setup

### [sass](https://github.com/sass/sass)

This module hooks into [sass' importer api](https://sass-lang.com/documentation/js-api#importer).

```javascript
const sass = require('sass')
const { jsImporter } = require('node-sass-js-importer')

// Example 1
sass.render({
  file: scss_filename,
  importer: jsImporter,
  // ...options
}, (err, result) => { /*...*/ })

// Example 2
const result = sass.renderSync({
  data: scss_content
  importer: [jsImporter, someOtherImporter]
  // ...options
})
```

### Webpack / [sass-loader](https://github.com/jtangelder/sass-loader)

#### Webpack v1

```javascript
import { jsImporter } from 'node-sass-js-importer'

// Webpack config
export default {
  module: {
    loaders: [
      {
        test: /\.scss$/,
        loaders: ['style', 'css', 'sass']
      }
    ]
  },
  // Apply the JS importer via sass-loader's options.
  sassLoader: {
    importer: jsImporter
  }
}
```

#### Webpack v2 and upwards

```javascript
import { jsImporter } from 'node-sass-js-importer'

// Webpack config
export default {
  module: {
    rules: [
      test: /\.scss$/,
      use: [
        'style-loader',
        {
          loader: 'css-loader',
          options: {
            importLoaders: 1
          },
        },
        {
          loader: 'sass-loader',
          // Apply the JS importer via sass-loader's options.
          options: {
            importer: jsImporter,
          },
        },
      ],
    ],
  },
}
```

## Usage

Given the following `colors.mjs` file:

```js
export default {
  primary: 'blue',
  secondary: 'red'
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

### Importing strings

As JavaScript values don't map directly to Sass's data types, a common source of confusion is how to handle strings. While [Sass allows strings to be both quoted and unqouted](https://sass-lang.com/documentation/values/strings#unquoted), strings containing spaces, commas and/or other special characters have to be wrapped in quotes.

The importer will automatically add quotes around all strings that are not valid unquoted strings or hex colors (and that are not already quoted, of course):

<!-- prettier-ignore -->
Input | Output | Explanation
-|-|-
`{ color: 'red' }` | `$color: red;` | Valid unquoted string
`{ color: '#f00' }` | `$color: #f00;` | Valid hex color
`{ color: "'red'" }` | `$color: "red";` | Explicitly quoted string
`{ color: "really red" }` | `$color: "really red";` | Valid unquoted string

### Module Formats

The importer supports both CommonJS and ES modules through explicit file extensions (`.cjs`, `.mjs`). If you're using a `.js` extension, the importer will use the same default as the node runtime does (i.e. depending on your `package.json`'s `module` field).

### Map Keys

Map keys are always quoted by the importer:

```js
// colors.mjs
export default {
  colors: {
    red: '#f00'
  }
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

## Credit

The initial implementation of this importer was based on the [node-sass-json-importer](https://github.com/Updater/node-sass-json-importer) package.
