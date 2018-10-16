import test from 'ava'
import { initTasks, graphqlQuery } from '../../../../test/testCommon'
import { bootstrap } from '../../test/staticRequireCoreHooks';

initTasks(test)

test.serial('Can create an entity automatically saving the created date', t => {
  t.plan(3)

  const beforeTestTime = new Date()

  const createLizardQuery = (name: string) => `
    mutation {
      createLizard(fields: {
        name: "${name}"
      }) {
        id
      }
    }
  `
  const createLizard = (name: string) => graphqlQuery(createLizardQuery(name), {}, 'default', {}, bootstrap)

  const allLizardsQuery = `
    {
      lizards {
        id,
        name,
        _created,
        _updated,
        _deleted
      }
    }
  `
  const allLizards = () => graphqlQuery(allLizardsQuery, {}, 'default', {}, bootstrap)

  return createLizard('ScaleyLizardWithDate')
    .then(() => allLizards())
    .then((json: any) => {
      const now = new Date()
      const hasCreatedDate = !!json.data.lizards[0]._created
      const savedCreatedDate = new Date(json.data.lizards[0]._created)

      t.true(hasCreatedDate)
      t.true(savedCreatedDate > beforeTestTime)
      t.true(savedCreatedDate < now)
    })
})