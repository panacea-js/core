// @flow
const { _, hooks, entities } = Panacea.container

const GenerateFieldMap = function () {
  const map = new Map([
    ['id', 'String'],
    ['string', 'String'],
    ['password', 'String'],
    ['text', 'String'],
    ['float', 'Float'],
    ['int', 'Int'],
    ['boolean', 'Boolean'],
    ['reference', 'String'],
    // objects are for nested data.
    ['object', '__NestedObject']
  ])

  hooks.invoke('core.graphql.fieldsMap', { map })

  return map
}

const fieldMap = new GenerateFieldMap()

/**
 * Converts system field definitions to GraphQL equivalents.
 *
 * @param type String
 * @returns String
 */
const convertPanaceaFieldToGraphQL = function (type : string) : string {
  if (typeof type !== 'string' || type === '') {
    throw TypeError('No type specified in GraphQL field types conversion mapping')
  }

  if (!fieldMap.has(type)) {
    throw TypeError(type + ' not found in GraphQL type conversion mapping')
  }

  return fieldMap.get(type) || ''
}

/**
 * Get GraphQL schema for each field and provide two output types for the output object.
 *
 * One key is for where the references should be strings - in the case of Input Types and Mutations.
 * Another key is for where the references should to the models (GraphQL types)- used in types and Query definitions.
 *
 * @param fields
 *
 * @returns {{refsAsStrings: object, refsAsModels: object}}
 */
const translateEntityTypeFields = function (fields: EntityTypeFields) {
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
        fieldType = convertPanaceaFieldToGraphQL(field.type)
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
        output[refType][field._meta.camel].fields = translateEntityTypeFields(field.fields)
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
  let output = []

  output.push(`type ${rootType} {\n`)

  _(definitions).forEach(function (entityTypeDefinitions: GraphQLEntityTypeDefinitions) {
    _(entityTypeDefinitions).forEach(function (definition: GraphQLEntityTypeDefinition) {
      const args = []

      _(definition.arguments).forEach(function (value, key) {
        args.push(`${key}: ${value}`)
      })

      const argsOutput = _(args).isEmpty() ? '' : '(' + args.join(', ') + ')'

      output.push(`  # ${definition.comment || 'No description'}\n`)
      output.push(`  ${definition.name}${argsOutput}: ${definition.returnType}\n`)
    })
  })

  output.push('}\n')

  return output.join('')
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
  let output = []

  // Nested types (objects in fields) are deferred to be concatenated to the final output.
  let nestedTypes = []

  _(definitions).forEach(function (data: GraphQLEntityTypeDefinition, entityType) {
    output.push(`\n# ${data.comment || 'No description'}\n`)

    output.push(`${type} ${data.name} {\n`)

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
          comment: `Nested object on ${entityType}. ${field.comment}`,
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

      output.push(`  # ${field.comment || 'No description'}\n`)
      output.push(`  ${field.value}\n`)
      output.push('\n')
    })
    output.push(`}\n`)
  })

  return output.join('') + nestedTypes.join('')
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
  let output = []

  _(enums).forEach(function (definition) {
    output.push(`\n# ${definition.comment || 'No description'}\n`)

    output.push(`enum ${definition.name} {\n`)

    definition.items.map(item => {
      output.push(`  # ${item.comment || 'No description'}\n`)
      output.push(`  ${item.value}\n\n`)
    })

    output.push(`}`)
  })

  return output.join('')
}

/**
 * Loads entity types from yml files to define GraphQL type definitions.
 *
 * Allows overrides via core.graphql.definitions.* hooks.
 *
 * @returns Promise
 */
export const graphQLTypeDefinitions = function () {
  const entityTypes = entities.getData()

  const definitions: Promise<string> = new Promise(function (resolve, reject) {
    try {
      const output = []
      const types: GraphQLTypeDefinitions = {}
      const queries: GraphQLQueryDefinitions = {}
      const mutations: GraphQLMutationDefinitions = {}
      const inputs: GraphQLInputDefinitions = {}
      const enums: GraphQLEnumsDefinitions = {}
      const scalars: Array<string> = []

      // Computed types.
      hooks.invoke('core.graphql.definitions.types', { types, translateEntityTypeFields, entityTypes })
      output.push(formatTypesToOutput('type', types))

      // Input types.
      hooks.invoke('core.graphql.definitions.inputs', { inputs, translateEntityTypeFields, entityTypes })
      output.push(formatTypesToOutput('input', inputs))

      // Computed queries.
      hooks.invoke('core.graphql.definitions.queries', { queries, translateEntityTypeFields, entityTypes })
      output.push(formatRootTypeToOutput('Query', queries))

      // Computed mutations.
      hooks.invoke('core.graphql.definitions.mutations', { mutations, translateEntityTypeFields, entityTypes })
      output.push(formatRootTypeToOutput('Mutation', mutations))

      // Enums.
      hooks.invoke('core.graphql.definitions.enums', { enums, translateEntityTypeFields, entityTypes })
      output.push(formatEnumsToOutput(enums))

      // Scalars.
      hooks.invoke('core.graphql.definitions.scalars', { scalars })
      output.push('\n' + scalars.map(s => `scalar ${s}`).join('\n'))

      const tidyDefinitionEndings = function (input) {
        return input.replace(/\n\n\}/g, '\n}')
      }

      resolve(tidyDefinitionEndings(output.join('\n')))
    }
    catch (error) {
      reject(error)
    }
  })

  return definitions
}
