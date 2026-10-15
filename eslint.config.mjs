import next from "eslint-config-next";

const eslintConfig = [
  ...next,
  {
    ignores: ["node_modules/**", ".next/**", "coverage/**", "prisma/migrations/**"]
  }
];

export default eslintConfig;
