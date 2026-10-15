export function readMarkedRead(slug) {
  try {
    return window.localStorage.getItem('tk-read-' + slug) === '1';
  } catch {
    return false;
  }
}

export function writeMarkedRead(slug, markedRead) {
  try {
    window.localStorage.setItem('tk-read-' + slug, markedRead ? '1' : '0');
    return true;
  } catch {
    return false;
  }
}
