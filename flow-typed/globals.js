// @flow
declare var DI: {
  container: Object
}

declare type EntityTypeFields = {
  [string] : {
    type: string,
    label: string,
    description?: string,
    many?: boolean,
    references?: string,
    required?: boolean,
    fields?: EntityTypeFields,
    _meta?: {
      pascal: string,
      descriptionLowerFirst: string,
      pluralCamel: string,
      camel: string
    }
  }
}

declare type EntityTypeNoMeta = {
  description: string,
  fields: EntityTypeFields,
  plural: string,
  storage: string,
  _errors?: Array<Error>,
}

declare type EntityType = EntityTypeNoMeta & {
  _meta: {
    pascal: string,
    descriptionLowerFirst: string,
    pluralCamel: string,
    camel: string
  }
}

declare type FieldTypes = {
  [string] : {
    label: string,
    description: string
  }
}

declare type GraphQLRootDefinitions = GraphQLEntityTypeDefinitions | GraphQLQueryDefinitions | GraphQLMutationDefinitions

declare type GraphQLEntityTypeDefinitions = {
  [string] : {
    [string] : GraphQLEntityTypeDefinition
  }
}

declare type GraphQLEntityTypeDefinition = {|
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

declare type GraphQLInputDefinitions = {
  [string] : GraphQLInputDefinition
}

declare type GraphQLInputDefinition = {
  name: string,
  comment? : string,
  fields: {}
}

declare type GraphQLAllDefinitionsTypes = GraphQLRootDefinitions | GraphQLTypeDefinitions | GraphQLInputDefinitions

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