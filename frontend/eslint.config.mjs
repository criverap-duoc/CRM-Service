import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Reglas bajadas a warn temporalmente: hay deuda técnica aceptada
      // de ~63 `any` y ~25 react-hooks/immutability. Se reportan pero
      // no rompen el CI. Objetivo: subirlas a error en una futura iteración.
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
