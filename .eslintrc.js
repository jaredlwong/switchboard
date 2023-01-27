module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier", "plugin:react/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  root: true,
  rules: {
    "react/prop-types": [1, {ignore: ['className', 'prefixCls', 'size']}],
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    react: {
      version: "18.0"
    }
  }
};
