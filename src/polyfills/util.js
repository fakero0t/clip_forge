// Polyfill for Node.js 'util' module for browser/Electron compatibility

// util.inherits polyfill
export const inherits = (constructor, superConstructor) => {
  if (superConstructor) {
    constructor.super_ = superConstructor;
    constructor.prototype = Object.create(superConstructor.prototype, {
      constructor: {
        value: constructor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }
};

// util.inspect polyfill
export const inspect = (obj, options = {}) => {
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number') return obj.toString();
  if (typeof obj === 'boolean') return obj.toString();
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (Array.isArray(obj)) return `[${obj.map(inspect).join(', ')}]`;
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return `{ ${keys.map(key => `${key}: ${inspect(obj[key])}`).join(', ')} }`;
  }
  return String(obj);
};

// util.format polyfill
export const format = (format, ...args) => {
  if (typeof format !== 'string') {
    return format;
  }
  
  let index = 0;
  return format.replace(/%[sdj%]/g, (match) => {
    if (match === '%%') return '%';
    if (index >= args.length) return match;
    
    const arg = args[index++];
    switch (match) {
      case '%s': return String(arg);
      case '%d': return Number(arg);
      case '%j': return JSON.stringify(arg);
      default: return match;
    }
  });
};

// util.promisify polyfill
export const promisify = (fn) => {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
};

// util.callbackify polyfill
export const callbackify = (fn) => {
  return function(...args) {
    const callback = args.pop();
    if (typeof callback !== 'function') {
      throw new TypeError('The last argument must be a function.');
    }
    
    Promise.resolve(fn.apply(this, args))
      .then(result => callback(null, result))
      .catch(err => callback(err));
  };
};

// util.isArray polyfill
export const isArray = Array.isArray;

// util.isDate polyfill
export const isDate = (obj) => obj instanceof Date;

// util.isRegExp polyfill
export const isRegExp = (obj) => obj instanceof RegExp;

// util.isError polyfill
export const isError = (obj) => obj instanceof Error;

// util.isFunction polyfill
export const isFunction = (obj) => typeof obj === 'function';

// util.isNull polyfill
export const isNull = (obj) => obj === null;

// util.isNullOrUndefined polyfill
export const isNullOrUndefined = (obj) => obj === null || obj === undefined;

// util.isNumber polyfill
export const isNumber = (obj) => typeof obj === 'number' && !isNaN(obj);

// util.isObject polyfill
export const isObject = (obj) => obj !== null && typeof obj === 'object';

// util.isPrimitive polyfill
export const isPrimitive = (obj) => obj === null || (typeof obj !== 'object' && typeof obj !== 'function');

// util.isString polyfill
export const isString = (obj) => typeof obj === 'string';

// util.isSymbol polyfill
export const isSymbol = (obj) => typeof obj === 'symbol';

// util.isUndefined polyfill
export const isUndefined = (obj) => obj === undefined;

// util.log polyfill
export const log = (...args) => {
  console.log(new Date().toISOString(), ...args);
};

// util.debug polyfill
export const debug = (...args) => {
  console.debug(...args);
};

// util.error polyfill
export const error = (...args) => {
  console.error(...args);
};

// util.puts polyfill
export const puts = (...args) => {
  console.log(...args);
};

// util.print polyfill
export const print = (...args) => {
  console.log(...args);
};

// util.deprecate polyfill
export const deprecate = (fn, message) => {
  let warned = false;
  return function(...args) {
    if (!warned) {
      console.warn(`DeprecationWarning: ${message}`);
      warned = true;
    }
    return fn.apply(this, args);
  };
};

export default {
  inherits,
  inspect,
  format,
  promisify,
  callbackify,
  isArray,
  isDate,
  isRegExp,
  isError,
  isFunction,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isPrimitive,
  isString,
  isSymbol,
  isUndefined,
  log,
  debug,
  error,
  puts,
  print,
  deprecate
};
