/**
 * Entity Type Definitions.
 */
declare type GraphQLSchemaDefinitions = {
  [string] : {
    [string] : GraphQLSchemaDefinition
  }
}

declare type GraphQLSchemaDefinition = {|
  name: string,
  arguments?: {},
  returnType: string,
  fields: {
    [string] : {
      comment: string,
      value: string
    }
  },
  comment? : string
|}

/**
 * Query Definitions.
 */
declare type GraphQLQueryDefinitions = {
  [string]: {
    [string]: GraphQLQueryDefinition
  }
}

declare type GraphQLQueryDefinition = {|
  name: string,
  returnType: string,
  comment? : string,
  arguments?: {},
|}

/**
 * Mutation Definitions.
 */
declare type GraphQLMutationDefinitions = {
  [string]: {
    [string]: GraphQLMutationDefinition
  }
}

declare type GraphQLMutationDefinition = {|
  name: string,
  returnType: string,
  arguments: {},
  comment? : string,
|}

/**
 * Type Definitions.
 */
declare type GraphQLTypeDefinitions = {
  [string] : GraphQLTypeDefinition
}

declare type GraphQLTypeDefinition = {|
  comment? : string,
  name: string,
  fields: {
    [string] : {
      comment: string,
      value: string
    }
  }
|}

/**
 * Input Definitions.
 */
declare type GraphQLInputDefinitions = {
  [string] : GraphQLInputDefinition
}

declare type GraphQLInputDefinition = {
  name: string,
  comment? : string,
  fields: {}
}

/**
 * Enums Definitions.
 */
declare type GraphQLEnumsDefinitions = {
  [string] : GraphQLEnumsDefinition
}

declare type GraphQLEnumsDefinition = {
  name: string,
  items: Array<
    {
      comment?: string,
      value: string
    }
  >,
  comment?: string
}

/**
 * Aggregates.
 */
declare type GraphQLRootDefinitions = GraphQLSchemaDefinitions | GraphQLQueryDefinitions | GraphQLMutationDefinitions
declare type GraphQLAllDefinitionsTypes = GraphQLRootDefinitions | GraphQLTypeDefinitions | GraphQLInputDefinitions

declare type SortOrder = 'ASC' | 'DESC';

declare type QueryParams = {
  limit: number,
  sortBy: string,
  sortDirection: SortOrder | null,
  [string]: any
}
