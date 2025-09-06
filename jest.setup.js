// Global test setup
process.env.NODE_ENV = 'test';

// Mock Discord.js client for testing
jest.mock('discord.js', () => ({
  Client: jest.fn(() => ({
    login: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    user: { tag: 'TestBot#0000', id: '123456789' },
    guilds: { cache: new Map() },
    channels: { cache: new Map() },
    users: { cache: new Map() },
    isReady: jest.fn(() => true),
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    GuildVoiceStates: 4,
    MessageContent: 8,
  },
  Events: {
    ClientReady: 'ready',
    InteractionCreate: 'interactionCreate',
  },
  ActivityType: {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3,
    Custom: 4,
  },
  PresenceUpdateStatus: {
    Online: 'online',
    Idle: 'idle',
    DoNotDisturb: 'dnd',
    Invisible: 'invisible',
  },
}));

// Mock mongoose for testing
jest.mock('mongoose', () => ({
  connect: jest.fn(() => Promise.resolve()),
  connection: {
    close: jest.fn(() => Promise.resolve()),
  },
  Schema: jest.fn(),
  model: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);

// Console suppression for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

global.beforeEach(() => {
  // Suppress console output during tests unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

global.afterEach(() => {
  // Restore console output
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Clear all mocks
  jest.clearAllMocks();
});