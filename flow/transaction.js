declare type Transaction = {
  context: Object,
  status: transactionStatus,
  created: number,
  completed: ?number,
  error: null | Error
}

declare type transactionHandler = {| // eslint-disable-line no-undef
  prepare?: (txn: Transaction) => Promise<void>, // eslint-disable-line no-use-before-define
  operation?: (txn: Transaction) => Promise<void>, // eslint-disable-line no-use-before-define
  rollback?: (txn: Transaction) => Promise<void>, // eslint-disable-line no-use-before-define
  complete?: (txn: Transaction) => Promise<void>, // eslint-disable-line no-use-before-define
|}

declare type transactionStatus = 'init' | 'prepare' | 'operation' | 'rollback' | 'complete' | 'failed' // eslint-disable-line no-undef