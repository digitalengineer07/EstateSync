
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  roleId: 'roleId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PermissionScalarFieldEnum = {
  id: 'id',
  code: 'code',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  roleId: 'roleId',
  permissionId: 'permissionId'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  totalAllocatedLiquid: 'totalAllocatedLiquid',
  totalAllocatedCash: 'totalAllocatedCash',
  totalSpentLiquid: 'totalSpentLiquid',
  totalSpentCash: 'totalSpentCash',
  availableBalanceLiquid: 'availableBalanceLiquid',
  availableBalanceCash: 'availableBalanceCash',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WalletTransactionScalarFieldEnum = {
  id: 'id',
  type: 'type',
  sourceWalletId: 'sourceWalletId',
  destWalletId: 'destWalletId',
  amount: 'amount',
  fundMode: 'fundMode',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  description: 'description',
  createdBy: 'createdBy',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.FundRequestScalarFieldEnum = {
  id: 'id',
  requesterId: 'requesterId',
  managerId: 'managerId',
  parentRequestId: 'parentRequestId',
  requestedFrom: 'requestedFrom',
  amount: 'amount',
  fundMode: 'fundMode',
  reason: 'reason',
  status: 'status',
  comments: 'comments',
  approvedBy: 'approvedBy',
  rejectedBy: 'rejectedBy',
  approvedAt: 'approvedAt',
  rejectedAt: 'rejectedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  walletId: 'walletId',
  categoryId: 'categoryId',
  amount: 'amount',
  fundMode: 'fundMode',
  description: 'description',
  date: 'date',
  vendorId: 'vendorId',
  reference: 'reference',
  attachment: 'attachment',
  status: 'status',
  reversedAt: 'reversedAt',
  reversedBy: 'reversedBy',
  reversalReason: 'reversalReason',
  createdAt: 'createdAt'
};

exports.Prisma.ExpenseCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description'
};

exports.Prisma.IdempotencyKeyScalarFieldEnum = {
  id: 'id',
  key: 'key',
  userId: 'userId',
  endpoint: 'endpoint',
  responseStatus: 'responseStatus',
  responseBody: 'responseBody',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  description: 'description',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  entryNumber: 'entryNumber',
  date: 'date',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  description: 'description',
  status: 'status',
  createdBy: 'createdBy',
  createdAt: 'createdAt'
};

exports.Prisma.JournalLineScalarFieldEnum = {
  id: 'id',
  journalEntryId: 'journalEntryId',
  accountId: 'accountId',
  debit: 'debit',
  credit: 'credit',
  description: 'description'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  actorEmail: 'actorEmail',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.CustomerScalarFieldEnum = {
  id: 'id',
  salesOwnerId: 'salesOwnerId',
  customerName: 'customerName',
  customerContact: 'customerContact',
  customerAddress: 'customerAddress',
  projectLocation: 'projectLocation',
  plotNo: 'plotNo',
  areaSqft: 'areaSqft',
  khataNo: 'khataNo',
  identityType: 'identityType',
  identityNumber: 'identityNumber',
  kycDocuments: 'kycDocuments',
  status: 'status',
  ratePerSqft: 'ratePerSqft',
  landCost: 'landCost',
  registryCost: 'registryCost',
  otherCharges: 'otherCharges',
  discount: 'discount',
  taxes: 'taxes',
  totalContractValue: 'totalContractValue',
  totalPaid: 'totalPaid',
  balanceDue: 'balanceDue',
  cancellationStatus: 'cancellationStatus',
  cancellationReason: 'cancellationReason',
  cancelledAt: 'cancelledAt',
  cancelledById: 'cancelledById',
  deductionAmount: 'deductionAmount',
  refundAmount: 'refundAmount',
  refundDate: 'refundDate',
  refundMode: 'refundMode',
  refundReferenceNo: 'refundReferenceNo',
  refundNotes: 'refundNotes',
  refundSettledById: 'refundSettledById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CustomerPaymentScalarFieldEnum = {
  id: 'id',
  customerId: 'customerId',
  dateOfPayment: 'dateOfPayment',
  amount: 'amount',
  paymentMode: 'paymentMode',
  sourceAccount: 'sourceAccount',
  destinationAccount: 'destinationAccount',
  referenceNo: 'referenceNo',
  recordedById: 'recordedById',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.PropertyAcquisitionScalarFieldEnum = {
  id: 'id',
  khataNo: 'khataNo',
  plotNo: 'plotNo',
  projectLocation: 'projectLocation',
  landOwnerName: 'landOwnerName',
  landOwnerContact: 'landOwnerContact',
  landOwnerAddress: 'landOwnerAddress',
  areaSqft: 'areaSqft',
  totalLandValue: 'totalLandValue',
  totalPaidToOwner: 'totalPaidToOwner',
  balanceRemaining: 'balanceRemaining',
  status: 'status',
  agreementDate: 'agreementDate',
  documents: 'documents',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PropertyPaymentScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  dateOfPayment: 'dateOfPayment',
  amount: 'amount',
  paymentMode: 'paymentMode',
  paidFromAccount: 'paidFromAccount',
  referenceNo: 'referenceNo',
  notes: 'notes',
  paidById: 'paidById',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.EmployeeScalarFieldEnum = {
  id: 'id',
  employeeCode: 'employeeCode',
  fullName: 'fullName',
  displayName: 'displayName',
  photo: 'photo',
  mobile: 'mobile',
  alternatePhone: 'alternatePhone',
  email: 'email',
  address: 'address',
  department: 'department',
  designation: 'designation',
  employmentType: 'employmentType',
  joiningDate: 'joiningDate',
  confirmationDate: 'confirmationDate',
  reportingManagerId: 'reportingManagerId',
  workLocation: 'workLocation',
  status: 'status',
  exitDate: 'exitDate',
  exitReason: 'exitReason',
  userId: 'userId',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
  archivedAt: 'archivedAt',
  archivedBy: 'archivedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  Role: 'Role',
  Permission: 'Permission',
  RolePermission: 'RolePermission',
  Wallet: 'Wallet',
  WalletTransaction: 'WalletTransaction',
  FundRequest: 'FundRequest',
  Expense: 'Expense',
  ExpenseCategory: 'ExpenseCategory',
  IdempotencyKey: 'IdempotencyKey',
  Account: 'Account',
  JournalEntry: 'JournalEntry',
  JournalLine: 'JournalLine',
  AuditLog: 'AuditLog',
  Customer: 'Customer',
  CustomerPayment: 'CustomerPayment',
  PropertyAcquisition: 'PropertyAcquisition',
  PropertyPayment: 'PropertyPayment',
  Employee: 'Employee'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
