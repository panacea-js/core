import * as path from 'path'
import Bootstrap from '../../../utils/bootstrap';

// Override bootstrap stage 4 so as to statically include core hooks.
// This is required because istanbul doesn't cover dynamic require statements.
Bootstrap.prototype.stage4 = function () {
  const { hooks } = Panacea.container
  require('../entities/dates').default.register(hooks)
  require('../entities/entities').default.register(hooks)
  require('../entities/fields').default.register(hooks)
  require('../entities/revisions').default.register(hooks)
  require('../graphql/resolvers/entities').default.register(hooks)
  require('../graphql/resolvers/entityTypes').default.register(hooks)
  require('../graphql/schema/entities').default.register(hooks)
  require('../graphql/schema/entityTypes').default.register(hooks)
  require('../graphql/schema/filters').default.register(hooks)
}


const bootstrap = function (panaceaFile = 'default', runStages: Array<number> = []) {
  const panaceaConfigFile = path.resolve(__dirname, `../../../test/fixtures/panaceaConfigFiles/${panaceaFile}`)
  if (runStages.length > 0) {
    return new (Bootstrap as any)(panaceaConfigFile).runStages(runStages)
  }
  return new (Bootstrap as any)(panaceaConfigFile).all()
}

export { bootstrap }
