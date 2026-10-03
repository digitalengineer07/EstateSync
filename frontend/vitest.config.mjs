import { defineConfig } from 'vitest/config';
import ts from 'typescript';
import path from 'node:path';
export default defineConfig({
  plugins: [{ name: 'jsx-in-js', transform(code, id) { if (/src\/.*\.js$/.test(id.replaceAll('\\', '/'))) return { code: ts.transpileModule(code, { fileName: id.replace(/\.js$/, '.jsx'), compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, allowJs: true } }).outputText, map: null }; } }],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: { environment: 'jsdom', include: ['test/documents.test.jsx', 'test/auth.tabs.test.jsx'], globals: true, restoreMocks: true },
});
