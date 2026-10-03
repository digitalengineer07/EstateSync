const BASE = ['document.view', 'document.upload', 'document.download', 'document.replace'];
const FINANCE = [...BASE, 'document.review', 'document.sensitive'];
async function syncDocumentPermissions(db) {
  const codes = [...FINANCE, 'document.archive'];
  for (const code of codes) await db.permission.upsert({ where: { code }, create: { code, description: `Transaction evidence: ${code.split('.')[1]}` }, update: {} });
  const roles = await db.role.findMany();
  const permissions = await db.permission.findMany({ where: { code: { in: codes } } });
  for (const role of roles) {
    const granted = role.name === 'ADMIN' ? codes : role.name === 'ACCOUNTING' ? FINANCE : BASE;
    await db.rolePermission.createMany({ data: permissions.filter(p => granted.includes(p.code)).map(p => ({ roleId: role.id, permissionId: p.id })), skipDuplicates: true });
  }
}
module.exports = { BASE, FINANCE, syncDocumentPermissions };
