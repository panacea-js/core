/**
 * Entities Types.
 */
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

/**
 * Fields.
 */
declare type FieldTypes = {
  [string] : {
    label: string,
    description: string
  }
}