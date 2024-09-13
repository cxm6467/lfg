/* eslint-disable @typescript-eslint/no-var-requires */
const defaults = require('./jest.config');

module.exports = {
  ...defaults,
  collectCoverageFrom: ['src/**/*.{ts,js}'],
};
