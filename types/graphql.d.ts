/**
 * Entity Type Definitions.
 */
interface GraphQLSchemaDefinitions {
  [groupName: string] : {
    [definitionName: string] : GraphQLSchemaDefinition
  }
}

interface GraphQLSchemaDefinition {
  name: string
  arguments?: {}
  returnType: string
  fields: {
    [fieldName: string] : {
      comment: string
      value: string
    }
  },
  comment? : string
}

/**
 * Query Definitions.
 */
interface GraphQLQueryDefinitions {
  [queryGroup: string]: {
    [query: string]: GraphQLQueryDefinition
  }
}

interface GraphQLQueryDefinition  {
  name: string,
  returnType: string,
  comment? : string,
  arguments?: {},
}

/**
 * Mutation Definitions.
 */
interface GraphQLMutationDefinitions {
  [mutationGroup: string]: {
    [mutation: string]: GraphQLMutationDefinition
  }
}

interface GraphQLMutationDefinition {
  name: string
  returnType: string
  arguments: {}
  comment? : string
}

/**
 * Type Definitions.
 */
interface GraphQLTypeDefinitions {
  [typeName: string] : GraphQLTypeDefinition
}

interface GraphQLTypeDefinition {
  comment? : string,
  name: string,
  fields: {
    [fieldName: string] : {
      comment: string,
      value: string
    }
  }
}

/**
 * Input Definitions.
 */
interface GraphQLInputDefinitions {
  [inputParameter: string] : GraphQLInputDefinition
}

interface GraphQLInputDefinition {
  name: string
  comment? : string
  fields: {
    [fieldId: string]: any
  }
}

/**
 * Enums Definitions.
 */
interface GraphQLEnumsDefinitions {
  [enumName: string] : GraphQLEnumsDefinition
}

interface GraphQLEnumsDefinition {
  name: string
  items: Array<
    {
      comment?: string
      value: string
    }
  >,
  comment?: string
}

/**
 * Aggregates.
 */
//type GraphQLRootDefinitions = GraphQLSchemaDefinitions | GraphQLQueryDefinitions | GraphQLMutationDefinitions

//type GraphQLAllDefinitionsTypes = GraphQLRootDefinitions | GraphQLTypeDefinitions | GraphQLInputDefinitions

type SortOrder = 'ASC' | 'DESC';

interface QueryParams {
  limit: number
  sortBy: string
  sortDirection: SortOrder | null
  [arbitraryParam: string]: any
}
