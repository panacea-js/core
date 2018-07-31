import { test } from 'ava'
import _ from 'lodash'
import { Transaction } from '../transaction.js'

test('A transaction executes in the expected order', async t => {
  t.plan(1)

  const context = {
    // Stack stores the order in which handlers are executed.
    stack: []
  }
  const handlers = [
    // Main operation
    {
      operation: async (txn) => {
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            txn.context.stack.push('Operation called')
            resolve()
          }, 50)
        })
      }
    },
    // Pre-handler 1
    {
      prepare: async (txn) => {
        // Ensure order of transaction execution waits for the prepare callback
        // to finish. Main operation above is set to 50ms so if the transaction
        // isn't waiting as expected then the order of the stack will be
        // incorrect and the test will fail. Also, it doesn't matter what the
        // time values of this timeout and the main operation timeout are; the
        // order of execution should remain the same and the test should pass.
        await new Promise((resolve, reject) => {
          setTimeout(() => {
            txn.context.stack.push('First prepare handler called')
            resolve()
          }, 100)
        })
      },
      rollback: async (txn) => {
        // Should never be called in this test.
        t.fail()
      }
    },
    // Pre-handler 1
    {
      prepare: async (txn) => {
        txn.context.stack.push('Second prepare handler called')
      }
    },
    // Post-handler 1
    {
      complete: async (txn) => {
        txn.context.stack.push('First complete handler called')
      }
    },
    // Post-handler 2
    {
      complete: async (txn) => {
        txn.context.stack.push('Second complete handler called')
      }
    }
  ]

  await new Transaction(handlers, context).execute().then(txn => {
    const expectedStack = [
      'First prepare handler called',
      'Second prepare handler called',
      'Operation called',
      'First complete handler called',
      'Second complete handler called'
    ]
    t.true(_.isEqual(expectedStack, txn.context.stack))
  })
})

test('A transaction can fail and rollbacks are called', async t => {
  t.plan(3)

  const context = {
    // Stack stores the order in which handlers are executed.
    stack: []
  }
  const handlers = [
    // Pre-handler 1
    {
      prepare: async (txn) => {
        txn.context.stack.push('First prepare handler called')
      },
      rollback: async (txn) => {
        txn.context.stack.push('First prepare handler is rolling back')
      }
    },
    // Pre-handler 2
    {
      prepare: async (txn) => {
        txn.context.stack.push('Second prepare handler called')
      },
      rollback: async (txn) => {
        txn.context.stack.push('Second prepare handler is rolling back')
      }
    },
    // Main operation
    {
      operation: async (txn) => {
        txn.context.stack.push('Attempting to perform an operation that fails')
        txn.fail(Error(`Test failure`))
      },
      rollback: async (txn) => {
        txn.context.stack.push('Main operation is rolling back')
      }
    }
  ]

  await new Transaction(handlers, context).execute().then(txn => {
    t.is(txn._error.message, 'Test failure')
    t.is(txn.status, 'failed')

    const expectedStack = [
      'First prepare handler called',
      'Second prepare handler called',
      'Attempting to perform an operation that fails',
      'First prepare handler is rolling back',
      'Second prepare handler is rolling back',
      'Main operation is rolling back'
    ]
    t.true(_.isEqual(expectedStack, txn.context.stack))
  })
})

test('A transaction can catch unexpected errors when thrown and run fail function to capture it.', async t => {
  t.plan(3)

  const context = {
    // Stack stores the order in which handlers are executed.
    stack: []
  }
  const handlers = [
    // Pre-handler 1
    {
      prepare: async (txn) => {
        txn.context.stack.push('First prepare handler called')
      },
      rollback: async (txn) => {
        txn.context.stack.push('First prepare handler is rolling back')
      }
    },
    // Pre-handler 2
    {
      prepare: async (txn) => {
        txn.context.stack.push('Second prepare handler called')
      },
      rollback: async (txn) => {
        txn.context.stack.push('Second prepare handler is rolling back')
      }
    },
    // Main operation
    {
      operation: async (txn) => {
        txn.context.stack.push('Attempting to perform an operation that fails')
        throw new Error(`Error was thrown`)
      },
      rollback: async (txn) => {
        txn.context.stack.push('Main operation is rolling back')
      }
    }
  ]

  await new Transaction(handlers, context).execute().then(txn => {
    t.is(txn._error.message, 'Error was thrown')
    t.is(txn.status, 'failed')

    const expectedStack = [
      'First prepare handler called',
      'Second prepare handler called',
      'Attempting to perform an operation that fails',
      'First prepare handler is rolling back',
      'Second prepare handler is rolling back',
      'Main operation is rolling back'
    ]
    t.true(_.isEqual(expectedStack, txn.context.stack))
  })
})
