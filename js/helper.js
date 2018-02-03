export function download(ui, message, url, type, callback) {
  const request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.onload = ui.wrap(() => {
    if (request.status != 200)
      throw new Error(`GET '${url}' returned a ${request.status}.`);
    ui.log('debug', 'Received: ' + request.responseText);
    if (type === 'json')
      callback(JSON.parse(request.responseText));
    else if (type === 'text')
      callback(request.responseText);
    else
      throw new Error(`Unknown type '${type}'.`);
  });
  ui.info(message);
  ui.log('debug', 'Sent: ' + url);
  request.send(null);
}
export function escapeHtml(text) {
  return (typeof text === 'string' ? text : text.toString())
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
}
