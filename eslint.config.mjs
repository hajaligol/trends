import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "drizzle/migrations/**",
      "reference/**",
    ],
  },
];

export default eslintConfig;
