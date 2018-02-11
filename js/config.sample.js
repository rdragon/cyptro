export default {
  keySize: 256 / 8,
  blockSize: 128 / 8,
  hmacSize: 256 / 8,
  derivationCount: 10000,
  saltSuffix: '96tNpQYEsaE427PRNlOc7N3WK',
  decipher: 'AES-CBC',
  hasher: 'sha256',
  entriesFile: 'entries.json',
  entrySuffix: '.txt',
  loginButtonText: 'Log in',
  decodeButtonText: 'Decode',
  staticDataUrl: 'data',
  apiUrl: 'api/api.php',
  logLevel: 'error'
};
