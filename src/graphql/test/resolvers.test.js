import test from 'ava'
import { initTasks } from '../../test/test-common'
initTasks(test)

const {
  graphQLTypeDefinitions,
  graphQLResolvers,
  makeExecutableSchema,
  graphqlExpress,
  express,
  bodyParser,
  dbModels
} = DI.container

test.skip('TODO', t => {
  graphQLTypeDefinitions().then(typeDefs => {
    const resolvers = graphQLResolvers()

    const schema = makeExecutableSchema({
      typeDefs,
      resolvers
    })

    const app = express()

    app.use('/graphql', bodyParser.json(), graphqlExpress({ schema, context: dbModels() }))

    app.listen(9898)
  })

  t.pass()
})
