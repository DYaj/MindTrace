module.exports = {
  default: {
    require: ['features/step_definitions/**/*.ts', 'features/support/**/*.ts'],
    requireModule: ['ts-node/register'],
    format: ['progress', 'json:test-results/cucumber-report.json'],
    publishQuiet: true,
  },
};
