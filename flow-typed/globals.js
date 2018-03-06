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
    fields?: EntityTypeFields
  }
}

declare type EntityType = {
  description: string,
  fields: EntityTypeFields,
  plural: string,
  storage: string,
  _errors?: Array<Error>
}

declare type FieldTypes = {
  [string] : {
    label: string,
    description: string
  }
}
