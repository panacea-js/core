import test from 'ava'
import { initTasks, graphqlQuery, bootstrap } from '../../../../../test/testCommon'

initTasks(test)
bootstrap()

const { hooks } = Panacea.container

const allCatsQuery = `
{
  cats {
    id,
    name,
    stories {
      title,
      body
    }
  }
}
`

const createCatQuery = (name: string, stories: string) => `
mutation {
  createCat(fields: {
    name: "${name}"
    stories: ${stories}
  }) {
    id
  }
}
`

const createCat = (name: string, stories: string) => graphqlQuery(createCatQuery(name, stories))
const allCats = () => graphqlQuery(allCatsQuery)

test.serial('Can create a Cat entity without specifying non-required fields that get flattened in the result', async t => {
  return createCat('Cat with flattened stories', '[{}]')
    .then((json) => {
      return allCats()
    })
    .then((json: any) => {
      const entity = json.data.cats.find(x => x.name === 'Cat with flattened stories')
      t.true(entity.stories === null)
    })
})

test.serial('Can create a Cat entity without specifying non-required fields that later become required are prepopulated with default values from query', async t => {
  t.plan(2)

  await createCat('Cat with story with missing body text', '[{ title: "Here is a title" }]')
  await createCat('Cat with story with missing title text', '[{ body: "Here is a body" }]')

  hooks.on('core.entityTypes.definitions', ({ definitions } : { definitions: EntityTypeDefinitions }) => {
    definitions.Cat.fields.stories.fields.title.required = true
    definitions.Cat.fields.stories.fields.title.default = 'Default title'
    definitions.Cat.fields.stories.fields.body.required = true
    definitions.Cat.fields.stories.fields.body.default = 'Default body'
  })

  const allCatsWithDefaultValues = await allCats()

  const actualDefaultBody = allCatsWithDefaultValues.data.cats.find(x => x.name === 'Cat with story with missing body text').stories[0].body
  const actualDefaultTitle = allCatsWithDefaultValues.data.cats.find(x => x.name === 'Cat with story with missing title text').stories[0].title

  t.is(actualDefaultBody, 'Default body')
  t.is(actualDefaultTitle, 'Default title')
})
