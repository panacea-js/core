import { Transaction } from '../transaction.js'

const context = {
  entityTypes: {
    Cat: {}
  }
}
const handlers = [
  {
    prepare: async (txn) => {
      txn.context.entityTypes.Cat._revision = txn.context.Cat
      console.log('Preparing data')
      console.log(txn)
    },
    rollback: async (txn) => {
      console.log('Rolling back')
      console.log(txn)
    }
  },
  {
    operation: async (txn) => {
      // Something went wrong
      // txn.fail(Error(`Not really an error!`))
    },
    complete: async (txn) => {
      console.log('This always runs')
      console.log(txn)
    }
  }
]

new Transaction(handlers, context).execute()
