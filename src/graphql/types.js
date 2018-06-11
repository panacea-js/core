// @flow
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
const processGraphQLfields = function (fields: EntityTypeFields) {
  const { _ } = Panacea.container

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
const formatRootTypeToOutput = function (rootType: string, definitions: GraphQLRootDefinitions): string {
  const { _ } = Panacea.container

  let output = []

  output.push(`type ${rootType} {`)

  _(definitions).forEach(function (entityTypeDefinitions: GraphQLEntityTypeDefinitions) {
    _(entityTypeDefinitions).forEach(function (definition: GraphQLEntityTypeDefinition) {
      const args = []

      _(definition.arguments).forEach(function (value, key) {
        args.push(`${key}: ${value}`)
      })

      const argsOutput = _(args).isEmpty() ? '' : '(' + args.join(', ') + ')'

      output.push(`# ${definition.comment || ''}`)
      output.push(`  ${definition.name}${argsOutput}: ${definition.returnType}`)
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
const formatTypesToOutput = function (type, definitions: GraphQLAllDefinitionsTypes): string {
  const { _ } = Panacea.container

  let output = []

  // Nested types (objects in fields) are deferred to be concatenated to the final output.
  let nestedTypes = []

  _(definitions).forEach(function (data: GraphQLEntityTypeDefinition, entityType) {
    output.push(`# ${data.comment || ''}`)

    output.push(`${type} ${data.name} {`)

    _(data.fields).forEach((field, fieldName) => {
      if (field.hasOwnProperty('fields')) {
        // This field has nested fields as an object, which needs to be execute recursively
        // to allow for unlimited data nesting.

        // The appropriate reference types should be:
        // models if GraphQL types are being defined
        // and strings for GraphQL inputs.
        const refsType = (type === 'type') ? 'refsAsModels' : 'refsAsStrings'

        // The nested field name is appended with an underscore to ALL parent fields and top level entityType.
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
  const { _ } = Panacea.container

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
  const { entities, _, hooks } = Panacea.container

  const definitions: Promise<string> = new Promise(function (resolve, reject) {
    const output = []
    const types: GraphQLTypeDefinitions = {}
    const queries: GraphQLQueryDefinitions = {}
    const mutations: GraphQLMutationDefinitions = {}
    const inputs: GraphQLInputDefinitions = {}
    const enums: GraphQLEnumsDefinitions = {}

    const entityTypes = entities.getData()

    // Get entity types, inputs, queries and mutations.
    _(entityTypes).forEach((entityTypeData: EntityType, entityTypeName) => {
      const definedFields = processGraphQLfields(entityTypeData.fields)

      const entityTypePascal = entityTypeData._meta.pascal
      const descriptionLowerFirst = entityTypeData._meta.descriptionLowerFirst
      const camel = entityTypeData._meta.camel
      const pluralCamel = entityTypeData._meta.pluralCamel

      types[entityTypePascal] = {
        comment: `${entityTypeData.description} entity`,
        name: entityTypePascal,
        fields: definedFields.refsAsModels
      }

      inputs[`${entityTypePascal}Input`] = {
        comment: `${entityTypeData.description} input type`,
        name: `${entityTypePascal}Input`,
        fields: definedFields.refsAsStrings
      }

      mutations[entityTypePascal] = {
        create: {
          comment: `Create ${descriptionLowerFirst}`,
          name: `create${entityTypePascal}`,
          arguments: {
            params: `${entityTypePascal}Input`
          },
          returnType: `${entityTypePascal}!`
        },
        update: {
          comment: `Update ${descriptionLowerFirst}`,
          name: `update${entityTypePascal}`,
          arguments: {
            id: `String!`,
            params: `${entityTypePascal}Input`
          },
          returnType: `${entityTypePascal}!`
        },
        delete: {
          comment: `Delete ${descriptionLowerFirst}`,
          name: `delete${entityTypePascal}`,
          arguments: {
            id: `String!`
          },
          returnType: 'Boolean'
        }
      }

      queries[entityTypePascal] = {
        all: {
          comment: `Get all ${entityTypeData.plural}`,
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

    // Non-entity related inputs

    // Panacea entity schemas.

    types['ENTITY_TYPE'] = {
      comment: `The panacea entity type`,
      name: 'ENTITY_TYPE',
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

    types['fieldType'] = {
      comment: `The panacea field type`,
      name: 'fieldType',
      fields: {
        type: {
          comment: 'The field type',
          value: 'type: String!'
        },
        label: {
          comment: 'The field label',
          value: 'label: String!'
        },
        description: {
          comment: 'The field description',
          value: 'description: String!'
        }
      }
    }

    queries['ENTITY_TYPES'] = {
      all: {
        comment: 'Get all entity schemas',
        name: 'ENTITY_TYPES',
        returnType: '[ENTITY_TYPE]'
      },
      single: {
        comment: 'Get a single schema',
        name: 'ENTITY_TYPE',
        arguments: {
          name: 'String!'
        },
        returnType: 'ENTITY_TYPE'
      }
    }

    queries['fieldTypes'] = {
      all: {
        comment: 'Get all entity field types',
        name: 'fieldTypes',
        returnType: '[fieldType]'
      }
    }

    mutations['ENTITY_TYPE'] = {
      create: {
        comment: 'Create panacea entity',
        name: 'createENTITY_TYPE',
        arguments: {
          name: 'String!',
          data: 'String!'
        },
        returnType: 'ENTITY_TYPE'
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
    hooks.invoke('core.graphql.definitions.inputs', inputs)
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

  return definitions
}
