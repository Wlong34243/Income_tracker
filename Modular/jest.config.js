/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  // An empty transform is needed to prevent Jest from trying to use a
  // default transformer that doesn't support ES Modules.
  transform: {},
};

export default config;
