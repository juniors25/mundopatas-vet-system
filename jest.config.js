module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'controllers/**/*.js',
        'routes/**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/tests/**'
    ],
    coverageReporters: ['text', 'lcov'],
    setupFilesAfterEnv: ['./tests/setup.js'],
    testTimeout: 30000 // Aumentar tiempo de espera para las pruebas
};
