<?php
function requireGet($key) {
  if (!isset($_GET[$key]))
    throw new Exception("Query parameter '$key' not found.");
  $str = trim($_GET[$key]);
  if (strlen($str) === 0)
    throw new Exception("Query parameter '$key' is empty.");
  return $str;
}
function requirePost($key) {
  if (!isset($_POST[$key]))
    throw new Exception("Post parameter '$key' not found.");
  $str = trim($_POST[$key]);
  if (strlen($str) === 0)
    throw new Exception("Post parameter '$key' is empty.");
  return $str;
}
function appendLog($file, $text) {
  $text = date('Y-m-d H:i:s') . ' ' . $text . ' IP = ' . $_SERVER['REMOTE_ADDR'];
  file_put_contents($file, $text . '. UA = ' . $_SERVER['HTTP_USER_AGENT'] . PHP_EOL,
    FILE_APPEND | LOCK_EX);
}
function isValidEntry($entry) {
  return is_array($entry) && isset($entry['title'], $entry['encrypted']) && count($entry) === 2;
}
class Brain {
  private $config = null;
  private $response = null;
  private $lockHandle = null;
  private $state = array();
  private $initialized = false;
  public function __construct($config, &$response) {
    $this->config = $config;
    $this->response = &$response;
  }
  public function run() {
    $this->initialize();
    $action = requireGet('action');
    if ($action === 'updateEntries')
      $this->runUpdate(requirePost('entries'));
    else if ($action === 'checkAlarm')
      $this->runCheckAlarm();
    else if ($action === 'clearAlarm')
      $this->runClearAlarm();
    else if ($action === 'logIn')
      $this->runLogIn();
    else if ($action === 'logOut')
      $this->runLogOut();
    else if ($action === 'getEntry')
      $this->runGetEntry(requireGet('id'));
    else
      throw new Exception('Unknown action: ' . $action);
  }
  public function finish() {
    if ($this->initialized)
      $this->saveState();
    if (false !== $this->lockHandle)
      $this->releaseLock();
  }
  private function initialize() {
    $this->obtainLock();
    $this->loadState();
    $this->fixState();
    $this->initialized = true;
  }
  private function obtainLock() {
    $this->lockHandle = fopen($this->config->lockFile, 'w');
    if (false === $this->lockHandle)
      throw new Exception('Could not obtain lock. The function \'fopen\' failed.');
    if (false === flock($this->lockHandle, LOCK_EX))
      throw new Exception('Could not obtain lock. The function \'flock\' failed.');
  }
  private function releaseLock() {
    if (false === flock($this->lockHandle, LOCK_UN))
      $this->logError('Could not release state file.');
  }
  private function loadState() {
    if (!file_exists($this->config->stateFile))
      return;
    $str = file_get_contents($this->config->stateFile);
    $state = json_decode($str, true);
    if (!is_array($state))
      $this->logError('Could not decode state file.');
    else
      $this->state = $state;
  }
  private function saveState() {
    $str = json_encode($this->state);
    if (false === $str)
      $this->logError('Failed to save state. Could not convert state to json.');
    else if (false === file_put_contents($this->config->stateFile, $str))
      $this->logError('Failed to save state. Could not write to state file.');
  }
  private function fixState() {
    $this->forceArray('entries');
    $this->forceArray('loginIds');
    $this->forceBool('alarm');
    $this->forceInt('lastFailTime');
    $this->forceString('token');
    $this->forceInt('tokenExpiryTime');
    $entries = $this->state['entries'];
    foreach ($entries as $id => $entry)
      if (!isValidEntry($entry))
        unset($this->state['entries'][$id]);
  }
  private function forceArray($key) {
    if (!isset($this->state[$key]) || !is_array($this->state[$key]))
      $this->state[$key] = array();
  }
  private function forceBool($key) {
    if (!isset($this->state[$key]) || !is_bool($this->state[$key]))
      $this->state[$key] = false;
  }
  private function forceInt($key) {
    if (!isset($this->state[$key]) || !is_int($this->state[$key]))
      $this->state[$key] = 0;
  }
  private function forceString($key) {
    if (!isset($this->state[$key]) || !is_string($this->state[$key]))
      $this->state[$key] = '';
  }
  private function requireAdmin() {
    if (requireGet('password') != $this->config->adminPassword)
      throw new Exception('Password is invalid.');
  }
  private function runUpdate($str) {
    $this->requireAdmin();
    $entries = json_decode($str, true);
    if (!is_array($entries))
      $this->fail('Input is invalid.');
    $count = 0;
    if (count($entries) === 0)
      $this->fail('No entries found.');
    foreach ($entries as $id => $entry) {
      if (!isValidEntry($entry)) {
        $this->appendLog("Entry '$id' is invalid: " . json_encode($entry));
        continue;
      }
      $this->state['entries'][$id] = $entry;
      $count++;
    }
    if (0 < $count)
      $this->log("$count entries updated.");
    $this->response['count'] = $count;
  }
  private function runCheckAlarm() {
    $this->response['alarm'] = $this->state['alarm'];
  }
  private function runClearAlarm() {
    $this->requireAdmin();
    $this->state['alarm'] = false;
  }
  private function handleSuccessfulLogin() {
    $this->log('Got a successful login.');
    $token = bin2hex(random_bytes(10));
    $this->state['token'] = $token;
    $this->response['token'] = $token;
    $this->updateTokenExpiryTime();
    $array = array();
    foreach ($this->state['entries'] as $id => $entry)
      $array[$id] = $entry['title'];
    $this->response['entries'] = &$array;
  }
  private function runLogIn() {
    $str = requireGet('password');
    if ($str === $this->config->adminPassword) {
      $this->handleSuccessfulLogin();
      return;
    }
    if (time() - $this->state['lastFailTime'] < $this->config->secondsPerTry)
      throw new Exception('The system is locked.');
    $password = $this->config->loginPassword;
    if (substr($str, 0, strlen($password)) === $password && $this->addLoginId(substr($str, strlen($password))))
    {
      $this->handleSuccessfulLogin();
      return;
    }
    $this->state['lastFailTime'] = time();
    $this->setAlarm('Got a failed login.');
    throw new Exception('Password is invalid.');
  }
  private function addLoginId($id) {
    if (in_array($id, $this->state['loginIds'])) {
      $this->log('Encountered a duplicate login id.');
      return false;
    }
    array_push($this->state['loginIds'], $id);
    return true;
  }
  private function runLogOut() {
    $this->checkToken();
    $this->state['token'] = '';
  }
  private function runGetEntry($id) {
    $this->checkToken();
    if (!isset($this->state['entries'][$id]))
      throw new Exception("Entry '$id' not found.");
    $entry = $this->state['entries'][$id];
    $this->response['encrypted'] = $entry['encrypted'];
  }
  private function checkToken() {
    if ($this->state['tokenExpiryTime'] < time())
      $this->state['token'] = '';
    $actual = requireGet('token');
    $expected = $this->state['token'];
    if (strlen($expected) === 0 || $actual !== $expected)
      throw new Exception('Invalid session, possibly expired.');
    $this->updateTokenExpiryTime();
  }
  private function updateTokenExpiryTime() {
    $this->state['tokenExpiryTime'] = time() + $this->config->tokenExpirySeconds;
  }
  private function log($text) {
    appendLog($this->config->logFile, $text);
  }
  private function logError($text) {
    appendLog($this->config->customErrorFile, $text);
  }
  private function setAlarm($message) {
    $this->state['alarm'] = true;
    $this->log($message);
  }
}
