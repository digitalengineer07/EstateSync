const prisma = require('../src/config/db');

async function analyzeAllMetrics() {
  console.log('=== Deep Metric Audit Across Database ===\n');

  // 1. Wallets / Allocated Funds
  const teamWallets = await prisma.wallet.findMany({
    where: { user: { role: { name: { not: 'ADMIN' } } } },
    include: { user: { include: { role: true } } }
  });
  console.log('--- Team Wallets ---');
  let sumAllocated = 0, sumBalance = 0, sumSpent = 0;
  for (const w of teamWallets) {
    console.log(`User: ${w.user.name} (${w.user.role.name}) | Allocated: ${w.totalAllocated} | Balance: ${w.availableBalance} | Spent: ${w.totalSpent}`);
    sumAllocated += parseFloat(w.totalAllocated);
    sumBalance += parseFloat(w.availableBalance);
    sumSpent += parseFloat(w.totalSpent);
  }
  console.log(`TOTAL Team Allocated: ${sumAllocated}, Available: ${sumBalance}, Spent: ${sumSpent}\n`);

  // 2. Customers / Customer Revenue
  const customers = await prisma.customer.findMany({
    include: { payments: true }
  });
  console.log('--- Customers ---');
  let totalContract = 0, totalPaid = 0, totalDue = 0;
  for (const c of customers) {
    console.log(`Customer: ${c.customerName} | Plot: ${c.plotNo} | Contract: ${c.totalContractValue} | Paid: ${c.totalPaid} | Due: ${c.balanceDue}`);
    totalContract += parseFloat(c.totalContractValue);
    totalPaid += parseFloat(c.totalPaid);
    totalDue += parseFloat(c.balanceDue);
  }
  console.log(`TOTAL Customer Contracts: ${totalContract}, Paid/Collections: ${totalPaid}, Due: ${totalDue}\n`);

  // 3. Properties / Land Acquisition
  const props = await prisma.propertyAcquisition.findMany({
    include: { payments: true }
  });
  console.log('--- Properties ---');
  let totalLandVal = 0, totalLandPaid = 0, totalLandRemaining = 0;
  for (const p of props) {
    console.log(`Prop: Plot ${p.plotNo}, Khata ${p.khataNo} | Owner: ${p.landOwnerName} | Valuation: ${p.totalLandValue} | Paid: ${p.totalPaidToOwner} | Remaining: ${p.balanceRemaining}`);
    totalLandVal += parseFloat(p.totalLandValue);
    totalLandPaid += parseFloat(p.totalPaidToOwner);
    totalLandRemaining += parseFloat(p.balanceRemaining);
  }
  console.log(`TOTAL Land Valuation: ${totalLandVal}, Paid: ${totalLandPaid}, Remaining Liability: ${totalLandRemaining}\n`);

  process.exit(0);
}
analyzeAllMetrics().catch(console.error);
