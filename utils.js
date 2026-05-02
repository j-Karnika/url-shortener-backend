const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Convert ID to short code (base62)
function encodeBase62(num) {
  let code = '';
  while (num > 0) {
    code = BASE62[num % 62] + code;
    num = Math.floor(num / 62);
  }
  return code || '0';
}

// Convert short code back to ID (base62)
function decodeBase62(code) {
  let num = 0;
  for (let char of code) {
    num = num * 62 + BASE62.indexOf(char);
  }
  return num;
}

module.exports = { encodeBase62, decodeBase62 };