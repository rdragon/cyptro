<?php
header("Cache-Control: no-cache, no-store, must-revalidate");
header("Pragma: no-cache");
header("Expires: 0");
error_reporting(E_ALL);
require('config.php');
require('brain.php');
$config = new Config();
ini_set("display_errors", $config->displayErrors);
ini_set("error_log", $config->phpErrorFile);
$response = array();
$brain = new Brain($config, $response);
try {
  $brain->run();
  $response['status'] = 'ok';
} catch (Exception $ex) {
  $response['status'] = 'error';
  $response['message'] = $ex->getMessage();
} finally {
  $brain->finish();
}
echo(json_encode($response));
