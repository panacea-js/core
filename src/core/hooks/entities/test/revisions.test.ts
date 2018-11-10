import test from 'ava'
import { initTasks, graphqlQuery, bootstrap } from '../../../../test/testCommon'
import { Transaction, TransactionHandler } from '../../../../utils/transaction';

initTasks(test)
bootstrap()

const { hooks, dbModels } = Panacea.container

const allCatsQuery = `
{
  cats {
    id,
    name,
    _revisions {
      id,
      name
    }
  }
}
`

const createCatQuery = (name: string) => `
mutation {
  createCat(fields: {
    name: "${name}"
  }) {
    id
  }
}
`

test.serial('Can create a Cat entity with new revision', async t => {
  t.plan(2)

  const createCat = (name: string) => graphqlQuery(createCatQuery(name))

  const allCats = () => graphqlQuery(allCatsQuery)

  return createCat('Cat with revision')
    .then(() => allCats())
    .then((json: any) => {
      const entity = json.data.cats[0]
      const revision = entity._revisions[0]
      t.true(entity.name === revision.name)
      t.true(entity.id !== revision.id)
    })
})

test.serial('Can create a Cat entity which deliberately throws in a spanner into the transaction causing the revision to be deleted', async t => {
  t.plan(3)

  hooks.on('core.entity.createHandlers', ({ transactionHandlers }: { transactionHandlers: Array<TransactionHandler> }) => {
    transactionHandlers.push({
      operation: async function (txn: Transaction) {
        txn.fail(new Error(`Deliberately causing transaction to fail`))
      }
    })
  })

  const createCat = (name: string) => graphqlQuery(createCatQuery(name))

  const allCats = () => graphqlQuery(allCatsQuery)

  return createCat('Failing Cat Revision')
    .then((result: any) => {
      t.true(result.errors[0].message === `Deliberately causing transaction to fail`)
      return allCats()
    })
    .then((json: any) => {
      // Ensure the original source entity fails to be created.
      const entity = json.data.cats.find((cat: { name: string } ) => cat.name === 'Failing Cat Revision')
      t.true(typeof entity === 'undefined')
    })
    .then(async () => {
      // Ensure the revision has been deleted.
      await dbModels().CatRevision.find({ name: 'Failing Cat Revision' }).exec().then((result) => {
        t.true(result.length === 0)
      })
    })
})