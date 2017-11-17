/**
 * Converts system field definitions to GraphQL equivalents.
 *
 * @param type String
 * @returns object
 */
const convertSystemFieldToGraphQL = function (type) {
  const map = {
    id: 'String',
    string: 'String',
    password: 'String',
    text: 'String',
    float: 'Float',
    int: 'Int',
    boolean: 'Boolean',
    reference: 'String',
    // objects are for nested data.
    object: '__NestedObject'
  }

  if (!map[type]) {
    throw TypeError(type + ' not found in GraphQL type conversion mapping')
  }

  return map[type]
}

/**
 * Get GraphQL schema for each field and provide two output types for the output object.
 *
 * One key is for where the references should be strings - in the case of Input Types and Mutations.
 * Another key is for where the references should to the models (GraphQL types)- used in types and Query definitions.
 *
 * @private
 *
 * @param fields
 *
 * @returns {{refsAsStrings: object, refsAsModels: object}}
 */
const processGraphQLfields = function (fields) {
  const { _ } = DI.container

  let output = {
    refsAsStrings: {},
    refsAsModels: {}
  }

  _(fields).forEach((field, _fieldName) => {
    Object.keys(output).forEach((refType) => {
      let fieldType

      if (field.type === 'reference') {
        fieldType = (refType === 'refsAsStrings') ? 'String' : field.references
      } else {
        fieldType = convertSystemFieldToGraphQL(field.type)
      }

      field.required && (fieldType = `${fieldType}!`)
      field.many && (fieldType = `[${fieldType}]`)

      output[refType][field._meta.camel] = {
        comment: field.description,
        value: `${field._meta.camel}: ${fieldType}`
      }

      if (field.type === 'object' && field.hasOwnProperty('fields')) {
        // Recurse this function to append output to the fields key.
        // This allows for unlimited nesting of defined fields.
        output[refType][field._meta.camel].fields = processGraphQLfields(field.fields)
      }
    })
  })

  return output
}

/**
 * Transforms structured data for GraphQL root types to an output string.
 *
 * @param rootType String
 *   e.g. 'Mutation', 'Query'
 *
 * @param definitions Object
 *   Nested keys:
 *     - entityType
 *       - comment
 *       - name
 *       - arguments
 *       - returnType
 *
 * @returns String
 */
const formatRootTypeToOutput = function (rootType, definitions) {
  const { _ } = DI.container

  let output = []

  output.push(`type ${rootType} {`)

  _(definitions).forEach(function (entityTypeDefinitions) {
    _(entityTypeDefinitions).forEach(function (definition) {
      let args = []

      _(definition.arguments).forEach(function (value, key) {
        return args.push(`${key}: ${value}`)
      })

      args = _(args).isEmpty() ? '' : '(' + args.join(', ') + ')'

      output.push(`# ${definition.comment}`)
      output.push(`  ${definition.name}${args}: ${definition.returnType}`)
      output.push('')
    })
  })

  output.push('}')

  return output.join('\n')
}

/**
 * Transforms structured data for GraphQL types to an output string.
 *
 * @param type String
 *   e.g. 'Type', 'Input'
 *
 * @param definitions Object
 *   Nested keys:
 *     - entityType
 *       - comment
 *       - name
 *       - returnType
 *       - fields[]
 *         - comment
 *         - value
 *
 * @returns String
 */
const formatTypesToOutput = function (type, definitions) {
  const { _ } = DI.container

  let output = []

  // Nested types (objects in fields) are deferred to be concatenated to the final output.
  let nestedTypes = []

  _(definitions).forEach(function (data, entityType) {
    output.push(`# ${data.comment}`)

    output.push(`${type} ${data.name} {`)

    _(data.fields).forEach((field, fieldName) => {
      if (field.hasOwnProperty('fields')) {
        // This field has nested fields as an object, which needs to be execute recursively
        // to allow for unlimited data nesting.

        // The appropriate reference types should be:
        // models if GraphQL types are being defined
        // and strings for GraphQL inputs.
        const refsType = (type === 'type') ? 'refsAsModels' : 'refsAsStrings'

        // The nested fieldname is appended with an underscore to ALL parent fields and top level entityType.
        // For example: 'User_subField_anotherSubField_yetAnotherSubField'
        const nestedFieldName = `${entityType}_${fieldName}`

        // Mock an object to pass back through this function.
        const nestedDefinition = {}
        nestedDefinition[nestedFieldName] = {
          comment: field.comment,
          name: nestedFieldName,
          fields: field.fields[refsType]
        }

        const nestedType = formatTypesToOutput(type, nestedDefinition)
        // Defer the nested field GraphQL type to be appending to the final output.
        nestedTypes.push(nestedType)

        // Replace placeholder with computed type name as this field still needs to be
        // appended to this entityType which references the nested field.
        field.value = field.value.replace('__NestedObject', nestedFieldName)
      }

      output.push(`  # ${field.comment}`)
      output.push(`  ${field.value}`)
    })

    output.push('}')
  })

  return output.join('\n') + nestedTypes.join('\n')
}

/**
 * Transforms structured data for GraphQL enums to an output string.
 *
 * @param enums Object
 *   Nested keys:
 *     - enumDefinitionName (internal use only)
 *       - comment
 *       - name
 *       - items[]
 *         - comment
 *         - value
 *
 * @returns String
 */
const formatEnumsToOutput = function (enums) {
  const { _ } = DI.container

  let output = []

  _(enums).forEach(function (definition) {
    output.push(`# ${definition.comment}`)

    output.push(`enum ${definition.name} {`)

    definition.items.map(item => {
      output.push(`  # ${item.comment}`)
      output.push(`  ${item.value}`)
    })

    output.push('}')
  })

  return output.join('\n')
}

/**
 * Loads entity types from yml files to define GraphQL type definitions.
 *
 * Allows overrides via core.graphql.definitions.* hooks.
 *
 * @returns Promise
 */
export const graphQLTypeDefinitions = function () {
  const { entities, _, options, hooks } = DI.container

  return new Promise(function (resolve, reject) {
    const output = []
    const types = {}
    const queries = {}
    const mutations = {}
    const inputs = {}
    const enums = {}

    const entityTypes = entities.getData(options.entities)

    // Get entity types, inputs, queries and mutations.
    _(entityTypes).forEach((entityTypeData, entityTypeName) => {
      const definedFields = processGraphQLfields(entityTypeData.fields)

      types[entityTypeData._meta.pascal] = {
        comment: `${entityTypeData.description} entity`,
        name: entityTypeData._meta.pascal,
        fields: definedFields.refsAsModels
      }

      inputs[entityTypeData._meta.pascal + 'Input'] = {
        comment: `${entityTypeData.description} input type`,
        name: `${entityTypeData._meta.pascal}Input`,
        fields: definedFields.refsAsStrings
      }

      mutations[entityTypeData._meta.pascal] = {
        create: {
          comment: `Create ${entityTypeData._meta.descriptionLowerFirst}`,
          name: `create${entityTypeData._meta.pascal}`,
          arguments: {
            params: `${entityTypeData._meta.pascal}Input`
          },
          returnType: `${entityTypeData._meta.pascal}!`
        },
        update: {
          comment: `Update ${entityTypeData._meta.descriptionLowerFirst}`,
          name: `update${entityTypeData._meta.pascal}`,
          arguments: {
            id: `String!`,
            params: `${entityTypeData._meta.pascal}Input`
          },
          returnType: `${entityTypeData._meta.pascal}!`
        },
        delete: {
          comment: `Delete ${entityTypeData._meta.descriptionLowerFirst}`,
          name: `delete${entityTypeData._meta.pascal}`,
          arguments: {
            id: `String!`
          },
          returnType: 'Boolean'
        }
      }

      queries[entityTypeData._meta.pascal] = {
        all: {
          comment: `Get all ${entityTypeData.plural}`,
          name: entityTypeData._meta.pluralCamel,
          arguments: {
            params: `QueryParams`
          },
          returnType: `[${entityTypeData._meta.pascal}!]`
        },
        single: {
          comment: `Get a single ${entityTypeData._meta.pascal}`,
          name: entityTypeData._meta.camel,
          arguments: {
            id: `String!`
          },
          returnType: `${entityTypeData._meta.pascal}`
        }
      }
    })

    // Non-entity related inputs

    // Panacea entity schemas.

    types['ENTITY'] = {
      comment: `The panacea entity`,
      name: 'ENTITY',
      fields: {
        name: {
          comment: 'The entity type name',
          value: 'name: String!'
        },
        data: {
          comment: 'The JSON structure of the entity schema',
          value: 'data: String!'
        }
      }
    }

    queries['ENTITIES'] = {
      all: {
        comment: 'Get all entity schemas',
        name: 'ENTITIES',
        returnType: '[ENTITY]'
      },
      single: {
        comment: 'Get a single schema',
        name: 'ENTITY',
        arguments: {
          id: 'String!'
        },
        returnType: 'ENTITY'
      }
    }

    inputs.QueryParams = {
      comment: 'Limit the number of returned results',
      name: `QueryParams`,
      fields: {
        limit: {
          comment: 'Limit the number of returned results',
          value: 'limit: Int = 100'
        },
        sortBy: {
          comment: 'Sort by field',
          value: 'sortBy: String'
        },
        sortDirection: {
          comment: 'Direction of sort',
          value: 'sortDirection: SORT_DIRECTIONS = ASC'
        }
      }
    }

    enums.SORT_DIRECTIONS = {
      comment: 'Ascending/Descending sort order values',
      name: 'SORT_DIRECTIONS',
      items: [
        { comment: 'Ascending', value: 'ASC' },
        { comment: 'Descending', value: 'DESC' }
      ]
    }

    // Computed types.
    hooks.invoke('core.graphql.definitions.types', types)
    output.push(formatTypesToOutput('type', types))

    // Input types.
    hooks.invoke('core.graphql.definitions.input', inputs)
    output.push(formatTypesToOutput('input', inputs))

    // Computed queries.
    hooks.invoke('core.graphql.definitions.queries', queries)
    output.push(formatRootTypeToOutput('Query', queries))

    // Computed mutations.
    hooks.invoke('core.graphql.definitions.mutations', mutations)
    output.push(formatRootTypeToOutput('Mutation', mutations))

    // Enums.
    hooks.invoke('core.graphql.definitions.enums', enums)
    output.push(formatEnumsToOutput(enums))

    // log.info(output.join('\n\n'))
    resolve(output.join('\n\n'))
  })
}
