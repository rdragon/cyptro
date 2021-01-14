Cyptro
======

Single page web app that can decrypt data and display it to the user. The encrypted data can be served from a static directory or from an API. The decryption takes place on the client. Decryption is done using [Forge](https://github.com/digitalbazaar/forge) (by default using AES-CBC 256 bit, PBKDF2 and HMAC-SHA256). The encrypted data can be generated using for example [InputMaster](https://github.com/rdragon/InputMaster).

Try it out
----------
- Browse to [https://rdragon.github.io/cyptro](https://rdragon.github.io/cyptro) (or follow the build steps)
- Press `Log in` without providing a password. This takes you to the static version of the app
- Select the entry named `test` by clicking on it
- Enter the password `a` and press `Decrypt`
- Click on `pass` to copy a password to your clipboard

Build steps
-----------
- Run `npm install webpack -g`
- Run `npm install webpack-dev-server -g`
- Run `npm install`
- Copy `js/config.sample.js` to `js/config.js`
- Run `webpack-dev-server`
- Browse to [http://localhost:8080](http://localhost:8080)

This allows you to run the static version of the app. If you want to make use of the PHP API you'll need some environment that supports PHP.

To update `bundle.js` run `webpack -p`.

The PHP API
-----------
There is an optional PHP API included that can serve the encrypted data. It supports a single user, a custom delay between login attempts, and the encrypted data can be updated through the API itself ([InputMaster](https://github.com/rdragon/InputMaster) uses this API to automatically upload all passwords of the user).

Libraries used
--------------
- [Forge](https://github.com/digitalbazaar/forge) for the client-side decryption
- [Webpack](https://github.com/webpack/webpack) and [Babel](https://github.com/babel/babel) to transform the ES6 source code into ES5
- [clipboard.js](https://github.com/zenorocha/clipboard.js)
- [jQuery](https://github.com/jquery/jquery)
