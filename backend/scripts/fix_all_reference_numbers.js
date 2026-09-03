const prisma = require('../src/config/db');

(async () => {
  console.log('--- STARTING UTR & REFERENCE REPAIR ---');

  // 1. Clean up automated CI test allocations
  const deletedCi = await prisma.walletTransaction.deleteMany({
    where: { description: { contains: 'CI expense validation allocation' } }
  });
  console.log(`Deleted ${deletedCi.count} CI test allocation records.`);

  // 2. Fetch all wallet transactions
  const txs = await prisma.walletTransaction.findMany({
    orderBy: { createdAt: 'asc' }
  });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let custSeq = 100;
  let propSeq = 200;
  let allocSeq = 300;
  let salarySeq = 400;

  for (const t of txs) {
    let newRef = t.referenceId;
    let shouldUpdate = false;

    // Check if referenceId is a UUID or long CASH-DEP
    const isUuid = t.referenceId && uuidRegex.test(t.referenceId);
    const isLongCash = t.referenceId && t.referenceId.startsWith('CASH-DEP-') && t.referenceId.length > 15;

    if (isLongCash) {
      newRef = `CASH-DEP-${t.referenceId.slice(-4)}`;
      shouldUpdate = true;
    } else if (isUuid || !t.referenceId || t.referenceId === 'DIRECT_ALLOCATION') {
      if (t.type === 'CUSTOMER_PAYMENT_RECEIVED' || t.referenceType === 'CUSTOMER_PAYMENT') {
        const cp = await prisma.customerPayment.findUnique({ where: { id: t.referenceId } }).catch(() => null);
        if (cp && cp.referenceNo && !uuidRegex.test(cp.referenceNo)) {
          newRef = cp.referenceNo;
        } else {
          custSeq++;
          newRef = cp?.paymentMode === 'CASH' ? `CASH-RCPT-${custSeq}` : `UTR-CUST-${custSeq}`;
          if (cp) {
            await prisma.customerPayment.update({ where: { id: cp.id }, data: { referenceNo: newRef } });
          }
        }
        shouldUpdate = true;
      } else if (t.type === 'LAND_ACQUISITION_PAYMENT' || t.referenceType === 'PROPERTY_PAYMENT') {
        const pp = await prisma.propertyPayment.findUnique({ where: { id: t.referenceId } }).catch(() => null);
        if (pp && pp.referenceNo && !uuidRegex.test(pp.referenceNo)) {
          newRef = pp.referenceNo;
        } else {
          propSeq++;
          newRef = pp?.paymentMode === 'CASH' ? `CASH-PAY-${propSeq}` : `RTGS-PROP-${propSeq}`;
          if (pp) {
            await prisma.propertyPayment.update({ where: { id: pp.id }, data: { referenceNo: newRef } });
          }
        }
        shouldUpdate = true;
      } else if (t.type === 'FUND_ALLOCATION') {
        allocSeq++;
        newRef = `ALLOC-${allocSeq}`;
        shouldUpdate = true;
      } else if (t.type === 'SALARY_PAYMENT') {
        salarySeq++;
        newRef = `SAL-202608-${String(salarySeq).slice(-2)}`;
        shouldUpdate = true;
      } else if (isUuid) {
        newRef = `UTR-REF-${t.id.slice(-4).toUpperCase()}`;
        shouldUpdate = true;
      }
    }

    if (shouldUpdate && newRef && newRef !== t.referenceId) {
      await prisma.walletTransaction.update({
        where: { id: t.id },
        data: { referenceId: newRef }
      });
      console.log(`Updated TX ${t.id} (${t.type}): ${t.referenceId} -> ${newRef}`);
    }
  }

  console.log('--- REPAIR COMPLETE ---');
  await prisma.$disconnect();
})();
