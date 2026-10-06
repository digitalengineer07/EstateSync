const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const isWindowsArm = process.platform === 'win32' && process.arch === 'arm64';

if (isWindowsArm) {
  // Windows ARM64 requires binary query engine
  if (!schema.includes('engineType = "binary"')) {
    schema = schema.replace('provider   = "prisma-client-js"', 'provider   = "prisma-client-js"\n  engineType = "binary"');
    fs.writeFileSync(schemaPath, schema);
  }
} else {
  // Linux (Hostinger) and x64 environments use in-process library engine (avoids loopback socket ECONNREFUSED)
  if (schema.includes('engineType = "binary"')) {
    schema = schema.replace(/\n\s*engineType\s*=\s*"binary"/g, '');
    fs.writeFileSync(schemaPath, schema);
  }
}

try {
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (err) {
  process.exit(err.status || 1);
}
