import { GraphQLTypeResolver } from 'graphql'

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
 * Resolvers
 */
declare type GraphQLResolvers = {|
  [typeName: string] : GraphQLTypeResolver,
  Mutation : {
    [mutationName: string] : GraphQLTypeResolver
  },
  Query : {
    [typeName: string] : GraphQLTypeResolver
  }
|}

/**
 * Query Definitions.
 */
declare type GraphQLQueryDefinitions = {
  [queryGroup: string]: {
    [query: string]: GraphQLQueryDefinition
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
  [mutationGroup: string]: {
    [mutation: string]: GraphQLMutationDefinition
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
  [typeName: string] : GraphQLTypeDefinition
}

declare type GraphQLTypeDefinition = {|
  comment? : string,
  name: string,
  fields: {
    [fieldName: string] : {
      comment: string,
      value: string
    }
  }
|}

/**
 * Input Definitions.
 */
declare type GraphQLInputDefinitions = {
  [inputParameter: string] : GraphQLInputDefinition
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
  [enumName: string] : GraphQLEnumsDefinition
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
  [arbitraryParam: string]: any
}
