// Polyfill for Node.js 'path' module for browser/Electron compatibility

// Simple path.join implementation
export const join = (...args) => {
  return args
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
};

// Simple path.resolve implementation
export const resolve = (...args) => {
  const resolved = args
    .filter(Boolean)
    .join('/')
    .replace(/\/+/g, '/');
  
  if (resolved.startsWith('/')) {
    return resolved;
  }
  return '/' + resolved;
};

// Simple path.dirname implementation
export const dirname = (path) => {
  const parts = path.split('/');
  parts.pop();
  return parts.join('/') || '/';
};

// Simple path.basename implementation
export const basename = (path, ext = '') => {
  const parts = path.split('/');
  let name = parts[parts.length - 1] || '';
  
  if (ext && name.endsWith(ext)) {
    name = name.slice(0, -ext.length);
  }
  
  return name;
};

// Simple path.extname implementation
export const extname = (path) => {
  const basename = path.split('/').pop() || '';
  const lastDot = basename.lastIndexOf('.');
  return lastDot > 0 ? basename.slice(lastDot) : '';
};

// Simple path.parse implementation
export const parse = (path) => {
  const dir = dirname(path);
  const base = basename(path);
  const ext = extname(path);
  const name = basename(path, ext);
  
  return {
    root: path.startsWith('/') ? '/' : '',
    dir,
    base,
    ext,
    name
  };
};

// Simple path.format implementation
export const format = (pathObject) => {
  const { root, dir, base } = pathObject;
  if (root) {
    return root + (dir ? dir.slice(1) : '') + (base ? '/' + base : '');
  }
  return (dir ? dir + '/' : '') + (base || '');
};

// Simple path.normalize implementation
export const normalize = (path) => {
  return path
    .replace(/\/+/g, '/')
    .replace(/\/$/, '') || '/';
};

// Simple path.isAbsolute implementation
export const isAbsolute = (path) => {
  return path.startsWith('/');
};

// Simple path.relative implementation
export const relative = (from, to) => {
  const fromParts = from.split('/').filter(Boolean);
  const toParts = to.split('/').filter(Boolean);
  
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  const up = fromParts.length - i;
  const down = toParts.slice(i);
  
  return '../'.repeat(up) + down.join('/');
};

// Simple path.sep
export const sep = '/';

// Simple path.delimiter
export const delimiter = ':';

export default {
  join,
  resolve,
  dirname,
  basename,
  extname,
  parse,
  format,
  normalize,
  isAbsolute,
  relative,
  sep,
  delimiter
};
