export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/dev/**',
    '!js/**/*.test.js'
  ]
};
