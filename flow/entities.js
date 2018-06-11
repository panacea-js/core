/**
 * Entities Types.
 */
declare type Meta = {
  pascal: string,
  descriptionLowerFirst: string,
  pluralCamel: string,
  camel: string
}

declare type EntityTypeFields = {
  [string]: EntityTypeField
}

declare type EntityTypeField = {
  type: string,
  label: string,
  description?: string,
  many?: boolean,
  references?: string,
  required?: boolean,
  fields?: EntityTypeFields,
  _meta?: Meta
}

declare type EntityType = {
  description: string,
  fields: EntityTypeFields,
  plural: string,
  storage: string,
  _errors?: Array<Error>,
  _meta?: Meta
}

/**
 * Fields.
 */
declare type FieldTypes = {
  [string] : {
    label: string,
    description: string
  }
}