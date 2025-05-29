module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['features/step_definitions/**/*.ts'],
    format: ['summary', 'progress-bar'],
    paths: ['features/**/*.feature'],
  },
};
