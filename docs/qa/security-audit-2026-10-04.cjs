// Read-only local audit. Database access is replaced by a rejecting stub.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/qa/security-audit-2026-10-04');
fs.mkdirSync(out, { recursive: true });
const ts = require(path.join(root, 'frontend/node_modules/typescript'));
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const files = [...walk(path.join(root, 'backend/src')), ...walk(path.join(root, 'frontend/src'))].filter(f => /\.[cm]?[jt]sx?$/.test(f) && !/[\\/](generated|prisma-client)[\\/]/.test(f));
const rel = f => path.relative(root, f).replaceAll('\\', '/');
const functions = [], imports = [], loops = [], queries = [], empty = [];
for (const f of files) {
  const source = fs.readFileSync(f, 'utf8');
  const sf = ts.createSourceFile(f, source, ts.ScriptTarget.Latest, true, /x$/.test(f) ? ts.ScriptKind.TSX : ts.ScriptKind.JS);
  const line = n => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  if (sf.statements.length === 0) empty.push(rel(f));
  const visit = n => {
    if (ts.isFunctionDeclaration(n) || ts.isArrowFunction(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n)) {
      const text = n.getText(sf);
      functions.push({ file: rel(f), line: line(n), name: n.name?.getText(sf) || n.parent?.name?.getText(sf) || (ts.isBinaryExpression(n.parent) ? n.parent.left.getText(sf) : '(callback)'), async: !!n.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword), tryCatch: /\bcatch\b/.test(text), throws: /\bthrow\b/.test(text), lines: text.split('\n').length });
    }
    if (ts.isImportDeclaration(n)) imports.push({ file: rel(f), specifier: n.moduleSpecifier.text });
    if (ts.isCallExpression(n) && n.expression.getText(sf) === 'require' && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) imports.push({ file: rel(f), specifier: n.arguments[0].text });
    if (ts.isForStatement(n) || ts.isForOfStatement(n) || ts.isForInStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) loops.push({ file: rel(f), line: line(n), header: n.getText(sf).split('\n')[0].slice(0, 200) });
    if (ts.isCallExpression(n) && /\.findMany$/.test(n.expression.getText(sf))) queries.push({ file: rel(f), line: line(n), bounded: /\btake\s*[:,]/.test(n.getText(sf)), call: n.expression.getText(sf) });
    ts.forEachChild(n, visit);
  };
  visit(sf);
}
const resolved = imports.map(i => {
  let base = i.specifier.startsWith('.') ? path.resolve(root, path.dirname(i.file), i.specifier) : i.specifier.startsWith('@/') ? path.join(root, 'frontend/src', i.specifier.slice(2)) : null;
  return { ...i, target: base && [base, ...['.js','.ts','.tsx','.jsx','/index.js','/index.ts'].map(x => base+x)].find(x => fs.existsSync(x) && fs.statSync(x).isFile()) };
});
const referenced = new Set(resolved.filter(i => i.target).map(i => rel(i.target)));
const unreferenced = files.map(rel).filter(f => !referenced.has(f) && !f.startsWith('frontend/src/app/') && f !== 'backend/src/app.js');
fs.writeFileSync(path.join(out, 'static-inventory.json'), JSON.stringify({ fileCount: files.length, functions, loops, queries, empty, unreferenced, imports: resolved.map(i => ({...i, target: i.target && rel(i.target)})) }, null, 2));
async function main() {
  const { ESLint } = require(path.join(root, 'frontend/node_modules/eslint'));
  const react = require(path.join(root, 'frontend/node_modules/eslint-plugin-react'));
  const eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: [{ files: ['**/*.js','**/*.cjs','**/*.jsx'], plugins: { react }, languageOptions: { ecmaVersion: 'latest', sourceType: 'module', parserOptions: { ecmaFeatures: { jsx: true } } }, rules: { 'react/jsx-uses-vars': 'error', 'react/jsx-uses-react': 'error', 'no-unused-vars': ['warn', { vars: 'all', args: 'all', caughtErrors: 'all', ignoreRestSiblings: true }] } }] });
  const lint = await eslint.lintFiles(files.filter(f => /\.[cj]sx?$/.test(f)));
  fs.writeFileSync(path.join(out, 'unused-bindings.json'), JSON.stringify(lint.filter(r => r.messages.length).map(r => ({ file: rel(r.filePath), messages: r.messages })), null, 2));
  // Include project lint for TS/TSX and JSX-aware unused imports.
  const nextLint = new ESLint({ cwd: path.join(root, 'frontend') });
  const frontendLint = await nextLint.lintFiles(['src']);
  fs.writeFileSync(path.join(out, 'frontend-lint.json'), JSON.stringify(frontendLint.filter(r => r.messages.length).map(r => ({ file: rel(r.filePath), messages: r.messages })), null, 2));
  console.log(JSON.stringify({ files: files.length, functions: functions.length, loops: loops.length, unboundedQueryCandidates: queries.filter(q=>!q.bounded).length, empty, unreferenced, unusedWarnings: lint.reduce((s,r)=>s+r.messages.length,0), frontendLintMessages: frontendLint.reduce((s,r)=>s+r.messages.length,0) }));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
