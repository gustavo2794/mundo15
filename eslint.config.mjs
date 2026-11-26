import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['.next/**/*', '.next-dev/**/*', 'node_modules/**/*', 'dist/**/*', 'src/**/*']
  },
  firebaseRulesPlugin.configs['flat/recommended']
];
