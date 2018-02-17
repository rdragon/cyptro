<?php
class Config {
  public $displayErrors = 0;
  public $secondsPerTry = 1;
  public $tokenExpirySeconds = 15 * 60;
  public $adminPassword = '1e51eaa781df85bb6f0169e8d8f1f5fef3d86bd28ed87b91a5919086826970ad';
  public $loginPassword = 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb';
  public $fallbackPassword = 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb';
  public $loginPasswordLength = 1;
  public $fallbackPasswordLength = 1;
  public $pageUrl = 'https://link/to/api.php';
  public $lockFile          = 'xyjzrezlugmp/lock';
  public $stateFile         = 'xyjzrezlugmp/state';
  public $phpErrorFile      = 'xyjzrezlugmp/php_errors.txt';
  public $customErrorFile   = 'xyjzrezlugmp/custom_errors.txt';
  public $logFile           = 'xyjzrezlugmp/log.txt';
}
