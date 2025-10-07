// Polyfills for Node.js modules in browser environment
import { Buffer } from 'buffer';
import process from 'process';

// Make Buffer and process available globally
window.Buffer = Buffer;
window.process = process;

// Additional polyfills if needed
if (typeof global === 'undefined') {
  window.global = window;
}
