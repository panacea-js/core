const { _, hooks } = Panacea.container

/**
 * Transforms structured data for GraphQL root types to an output string.
 */
const formatRootTypeToOutput = function (rootType: 'Mutation' | 'Query', definitions: GraphQLMutationDefinitions | GraphQLQueryDefinitions): string {
  let output: Array<string> = []

  output.push(`type ${rootType} {\n`)

  _(definitions).forEach(function (schemaDefinitions) {
    _(schemaDefinitions).forEach(function (definition) {
      const args: Array<string> = []

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
 */
const formatTypesToOutput = function (type: 'type' | 'input', definitions: GraphQLTypeDefinitions | GraphQLInputDefinitions): string {
  let output: Array<string> = []

  // Nested types (objects in fields) are deferred to be concatenated to the final output.
  let nestedTypes: Array<string> = []

  _(definitions).forEach(function (data, schemaName) {
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

        // The nested field name is appended with an underscore to ALL parent fields and top level schemas.
        // For example: 'User_subField_anotherSubField_yetAnotherSubField'
        const nestedFieldName = `${schemaName}_${fieldName}`

        // Mock an object to pass back through this function.
        const nestedDefinition: any = {}
        nestedDefinition[nestedFieldName] = {
          comment: `Nested object on ${schemaName}. ${field.comment}`,
          name: nestedFieldName,
          fields: field.fields[refsType]
        }

        const nestedType = formatTypesToOutput(type, nestedDefinition)
        // Defer the nested field GraphQL type to be appending to the final output.
        nestedTypes.push(nestedType)

        // Replace placeholder with computed type name as this field still needs to be
        // appended to this schema which references the nested field.
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
 */
const formatEnumsToOutput = function (enums: GraphQLEnumsDefinitions) {
  const output: Array<string> = []

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
 * Loads schema types from hook implementations to define GraphQL type definitions.
 *
 * Allows overrides via core.graphql.definitions.* hooks.
 */
export const graphQLTypeDefinitions = function (): Promise<string> {
  return new Promise(function (resolve, reject) {
    try {
      const output = []
      const types: GraphQLTypeDefinitions = {}
      const queries: GraphQLQueryDefinitions = {}
      const mutations: GraphQLMutationDefinitions = {}
      const inputs: GraphQLInputDefinitions = {}
      const enums: GraphQLEnumsDefinitions = {}
      const scalars: Array<string> = []

      // Types.
      hooks.invoke('core.graphql.definitions.types', { types })
      output.push(formatTypesToOutput('type', types))

      // Inputs.
      hooks.invoke('core.graphql.definitions.inputs', { inputs })
      output.push(formatTypesToOutput('input', inputs))

      // Queries.
      hooks.invoke('core.graphql.definitions.queries', { queries })
      output.push(formatRootTypeToOutput('Query', queries))

      // Mutations.
      hooks.invoke('core.graphql.definitions.mutations', { mutations })
      output.push(formatRootTypeToOutput('Mutation', mutations))

      // Enums.
      hooks.invoke('core.graphql.definitions.enums', { enums })
      output.push(formatEnumsToOutput(enums))

      // Scalars.
      hooks.invoke('core.graphql.definitions.scalars', { scalars })
      output.push('\n' + scalars.map(s => `scalar ${s}`).join('\n'))

      const tidyDefinitionEndings = function (input: string) {
        return input.replace(/\n\n\}/g, '\n}')
      }

      resolve(tidyDefinitionEndings(output.join('\n')))
    } catch (error) {
      reject(error)
    }
  })
}
