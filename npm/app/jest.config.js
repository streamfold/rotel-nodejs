/** @type {import('jest').Config} */
const config = {
  verbose: true,
  maxConcurrency: 1,
  testMatch: [ "**/__tests__/**/*.[jt]s?(x)" ]
};


module.exports = config;
