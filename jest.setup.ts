import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// Polyfill structuredClone for fake-indexeddb (Node < 17)
if (typeof structuredClone === 'undefined') {
  global.structuredClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));
}

// Mock crypto.randomUUID for tests
if (typeof crypto === 'undefined') {
  global.crypto = {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
  } as Crypto;
} else if (!crypto.randomUUID) {
  Object.defineProperty(crypto, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random().toString(36).substring(2, 9),
  });
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock AudioContext for audio tests
class MockAudioContext {
  sampleRate = 24000;
  createBuffer = jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(1024)),
  }));
  createBufferSource = jest.fn(() => ({
    buffer: null,
    connect: jest.fn(),
    start: jest.fn(),
  }));
  destination = {};
}

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Mock Audio class
class MockAudio {
  src = '';
  onended: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(src?: string) {
    if (src) this.src = src;
  }

  play = jest.fn(() => {
    setTimeout(() => this.onended?.(), 10);
    return Promise.resolve();
  });
}

global.Audio = MockAudio as any;

// Mock navigator.language
Object.defineProperty(navigator, 'language', {
  value: 'en-US',
  configurable: true,
});

// Mock document.cookie
let cookieStore: Record<string, string> = {};

Object.defineProperty(document, 'cookie', {
  get: () => Object.entries(cookieStore).map(([k, v]) => `${k}=${v}`).join('; '),
  set: (value: string) => {
    const [cookiePart] = value.split(';');
    const [key, val] = cookiePart.split('=');
    if (key && val !== undefined) {
      cookieStore[key.trim()] = val.trim();
    }
  },
  configurable: true,
});

// Helper to clear cookies between tests
beforeEach(() => {
  cookieStore = {};
});

// Mock FileReader
class MockFileReader {
  result: string | ArrayBuffer | null = null;
  onloadend: (() => void) | null = null;
  onerror: ((error: any) => void) | null = null;

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = 'data:application/octet-stream;base64,dGVzdGRhdGE=';
      this.onloadend?.();
    }, 0);
  }
}

global.FileReader = MockFileReader as any;

// Silence console errors in tests (optional - comment out to debug)
// jest.spyOn(console, 'error').mockImplementation(() => {});
// jest.spyOn(console, 'warn').mockImplementation(() => {});
