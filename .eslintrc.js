module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb',
    'plugin:react/recommended',
    'plugin:react-native/all',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 13,
    sourceType: 'module',
  },
  plugins: ['react', 'react-native'],
  rules: {
    // Matikan linebreak-style untuk Windows
    'linebreak-style': 0,

    // Matikan requirement import React di file JSX (React 18+)
    'react/react-in-jsx-scope': 0,

    // Style dan preferensi lain
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.tsx'] }],
    'react-native/no-inline-styles': 0,
    'import/prefer-default-export': 0,
    'no-console': 1,
    'global-require': 0,
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};
