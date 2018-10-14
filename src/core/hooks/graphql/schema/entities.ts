import { IHooks } from '../../../../utils/hooks'

const { _, entityTypes } = Panacea.container

interface IEntityTypeRefsDefinitions {
  refsAsStrings: {
    [fieldName: string]: {
      comment?: string
      value: string
      fields?: IEntityTypeRefsDefinitions
    }
  },
  refsAsModels: {
    [fieldName: string]: {
      comment?: string
      value: string
      fields?: IEntityTypeRefsDefinitions
    }
  }
}

type EntityTypeRefTypes = keyof IEntityTypeRefsDefinitions

/**
 * Get GraphQL schema for each field and provide two output types for the output object.
 *
 * One key is for where the references should be strings - in the case of Input Types and Mutations.
 * Another key is for where the references should to the models (GraphQL types)- used in types and Query definitions.
 */
const translateEntityTypeFields = function (fields: EntityTypeFields) {

  let output: IEntityTypeRefsDefinitions = {
    refsAsStrings: {},
    refsAsModels: {}
  }

  _(fields).forEach((field, _fieldName) => {
    Object.keys(output).forEach((refType) => {

      if (!field._meta) {
        // All field meta should exist on EntityTypeFields.
        return
      }

      let fieldType

      if (field.type === 'reference') {
        fieldType = (refType === 'refsAsStrings') ? 'String' : field.references
      } else {
        fieldType = entityTypes.convertFieldTypeToGraphQL(field.type)
      }

      field.required && (fieldType = `${fieldType}!`)
      field.many && (fieldType = `[${fieldType}]`)

      output[refType as EntityTypeRefTypes][field._meta.camel] = {
        comment: field.description,
        value: `${field._meta.camel}: ${fieldType}`
      }

      if (field.type === 'object' && field.fields) {
        // Recurse this function to append output to the fields key.
        // This allows for unlimited nesting of defined fields.
        output[refType as EntityTypeRefTypes][field._meta.camel].fields = translateEntityTypeFields(field.fields)
      }
    })
  })

  return output
}

interface IEntityTypeSchemaDefinitions {
  types: {
    [entityTypeName: string]: {
      comment: string
      name: string
      fields: IEntityTypeRefsDefinitions['refsAsModels']
    }
  },
  inputs: {
    [entityTypeName: string]: {
      comment: string
      name: string
      fields: IEntityTypeRefsDefinitions['refsAsStrings']
    }
  }
  queries: {
    [entityTypeName: string]: {
      [mutationName: string]: {
        comment: string
        name: string
        arguments: {
          [argumentKey: string]: string
        }
        returnType: string
      }
    }
  }
  mutations: {
    [entityTypeName: string]: {
      [mutationName: string]: {
        comment: string
        name: string
        arguments: {
          [argumentKey: string]: string
        }
        returnType: string
      }
    }
  }
}

const getDefinitions = function () {

  const entityTypeDefinitions: EntityTypeDefinitions = entityTypes.getData()

  const definitions: IEntityTypeSchemaDefinitions = {
    types: {},
    inputs: {},
    queries: {},
    mutations: {}
  }

  // Get entity types, inputs, queries and mutations.
  _(entityTypeDefinitions).forEach((entityTypeData) => {
    const definedFields = translateEntityTypeFields(entityTypeData.fields)

    const entityTypePascal = entityTypeData._meta.pascal
    const camel = entityTypeData._meta.camel
    const pluralCamel = entityTypeData._meta.pluralCamel

    definitions.types[entityTypePascal] = {
      comment: `${entityTypePascal} entity type. ${entityTypeData.description}`,
      name: entityTypePascal,
      fields: definedFields.refsAsModels
    }

    // If exclude flag is set on entity, still provide a type to allow
    // references from other entity types.
    if (entityTypeData._excludeGraphQL) {
      return
    }

    const inputFields = definedFields.refsAsStrings
    delete inputFields.id

    const countFields = Object.keys(inputFields).length

    if (countFields > 0) {
      definitions.inputs[`${entityTypePascal}Input`] = {
        comment: `Input type for ${entityTypePascal}`,
        name: `${entityTypePascal}Input`,
        fields: inputFields
      }

      definitions.mutations[entityTypePascal] = {
        create: {
          comment: `Create a ${entityTypePascal} entity`,
          name: `create${entityTypePascal}`,
          arguments: {
            fields: `${entityTypePascal}Input`
          },
          returnType: `${entityTypePascal}!`
        },
        update: {
          comment: `Partially update selected fields on a ${entityTypePascal}`,
          name: `update${entityTypePascal}`,
          arguments: {
            id: `String!`,
            fields: `${entityTypePascal}Input`
          },
          returnType: `${entityTypePascal}!`
        },
        replace: {
          comment: `Replace a ${entityTypePascal} entity with the defined fields - existing data will be overwritten or deleted`,
          name: `replace${entityTypePascal}`,
          arguments: {
            id: `String!`,
            fields: `${entityTypePascal}Input`
          },
          returnType: `${entityTypePascal}!`
        },
        delete: {
          comment: `Delete a ${entityTypePascal} entity`,
          name: `delete${entityTypePascal}`,
          arguments: {
            id: `String!`
          },
          returnType: `String`
        }
      }
    }

    definitions.queries[entityTypePascal] = {
      all: {
        comment: `Get all ${entityTypeData.plural}.`,
        name: pluralCamel,
        arguments: {
          params: `QueryParams`
        },
        returnType: `[${entityTypePascal}!]`
      },
      single: {
        comment: `Get a single ${entityTypePascal}`,
        name: camel,
        arguments: {
          id: `String!`
        },
        returnType: `${entityTypePascal}`
      }
    }
  })

  return definitions
}

export default {
  register (hooks: IHooks) {
    hooks.on('core.graphql.definitions.types', ({ types }: { types: GraphQLTypeDefinitions}) => {
      const definitions = getDefinitions()
      _.merge(types, definitions.types)
    })
    hooks.on('core.graphql.definitions.inputs', ({ inputs }: { inputs: GraphQLInputDefinitions}) => {
      const definitions = getDefinitions()
      _.merge(inputs, definitions.inputs)
    })
    hooks.on('core.graphql.definitions.queries', ({ queries }: { queries: GraphQLQueryDefinitions}) => {
      const definitions = getDefinitions()
      _.merge(queries, definitions.queries)
    })
    hooks.on('core.graphql.definitions.mutations', ({ mutations }: { mutations: GraphQLMutationDefinitions}) => {
      const definitions = getDefinitions()
      _.merge(mutations, definitions.mutations)
    })
  }
}
