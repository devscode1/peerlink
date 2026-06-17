module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      '@babel/plugin-proposal-export-namespace-from',
      '@babel/plugin-proposal-numeric-separator',
      [
        '@babel/plugin-proposal-decorators',
        {
          legacy: true,
        },
      ],
      '@babel/plugin-transform-class-properties',
      '@babel/plugin-transform-logical-assignment-operators',
      '@babel/plugin-transform-private-methods',
      [
        '@babel/plugin-transform-private-property-in-object',
        {
          loose: true,
        },
      ],
      [
        '@babel/plugin-transform-runtime',
        {
          helpers: true,
        },
      ],
    ],
  };
};
