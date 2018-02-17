import forge from 'node-forge';
import config from 'config';
import ui from 'ui';
import * as helper from 'helper';
function generateKey(salt, password, callback) {
  ui.info('Generating key...');
  // We support the synchronous version of pbkdf2 because of IE.
  if (ui.query !== null) {
    const key = forge.pkcs5.pbkdf2(password, salt, config.derivationCount, config.keySize);
    withKey(null, key, callback);
    return;
  }
  forge.pkcs5.pbkdf2(password, salt, config.derivationCount, config.keySize, ui.wrap((err, key) => withKey(err, key, callback)));
}
function withKey(err, key, callback) {
  if (err || !key || key.length != config.keySize)
    throw new Error('pbkdf2 failed to generate a valid key' + (err ? `: ${err}` : '.'));
  callback(key);
}
function checkHmac(encrypted, hmac, key) {
  const hmacObj = forge.hmac.create();
  hmacObj.start(config.hasher, key);
  hmacObj.update(encrypted);
  const bytes = hmacObj.digest().getBytes();
  if (bytes !== hmac) {
    ui.log('debug', 'actual: ' + forge.util.encode64(bytes));
    ui.log('debug', 'expected: ' + forge.util.encode64(hmac));
    throw new Error('Computed HMAC is different than given HMAC.');
  }
}
export default function(data, salt, password, callback) {
  const bytes = forge.util.decode64(data);
  const n = bytes.length - config.blockSize - config.hmacSize;
  if (n <= 0)
    throw new Error('Failed to decrypt data. Length is too small.');
  generateKey(salt, password, key => {
    ui.info('Key generated.');
    ui.log('debug', 'key: ' + forge.util.encode64(key));
    const iv = bytes.substr(0, config.blockSize);
    const hmac = bytes.substr(-config.hmacSize);
    ui.log('debug', 'iv: ' + forge.util.encode64(iv));
    checkHmac(bytes.substr(0, config.blockSize + n), hmac, key);
    const decipher = forge.cipher.createDecipher(config.decipher, key);
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(bytes.substr(config.blockSize, n)));
    const output = decipher.finish() ? decipher.output.getBytes() : '';
    if (output.length === 0)
      throw new Error('Failed to decrypt data.');
    const text = forge.util.decodeUtf8(output.substr(1));
    switch (output[0]) {
      case 'i':
        callback('html', `<br>Decrypted image<br>---------------<br><img src="data:image/jpeg;base64,${text}" alt="image" /><br><br>`);
        break;
      case 't':
        callback('html', '<br>Decrypted text<br>--------------<br>' + helper.escapeHtml(text).replace(/\n/, '<br>') + '<br><br>');
        break;
      case 'a':
        callback('accounts', JSON.parse(text));
        break;
      default:
        throw new Error(`Unknown type '${output[0]}'.`);
    }
  });
}
