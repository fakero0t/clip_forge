// Polyfill for Node.js 'os' module for browser/Electron compatibility
const getPlatform = () => {
  if (typeof process !== 'undefined' && process.platform) {
    return process.platform;
  }
  // Fallback detection for browser/Electron
  if (typeof navigator !== 'undefined') {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'win32';
    if (userAgent.includes('mac')) return 'darwin';
    if (userAgent.includes('linux')) return 'linux';
  }
  return 'darwin'; // Default fallback
};

export const platform = getPlatform;
export const arch = () => {
  if (typeof process !== 'undefined' && process.arch) {
    return process.arch;
  }
  return 'x64'; // Default fallback
};
export const cpus = () => [];
export const freemem = () => 0;
export const totalmem = () => 0;
export const uptime = () => 0;
export const hostname = () => 'localhost';
export const type = getPlatform;
export const release = () => '1.0.0';
export const networkInterfaces = () => ({});

export default {
  platform,
  arch,
  cpus,
  freemem,
  totalmem,
  uptime,
  hostname,
  type,
  release,
  networkInterfaces
};
