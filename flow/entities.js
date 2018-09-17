/**
 * Entity types.
 */
declare type Meta = {|
  pascal: string,
  descriptionLowerFirst: string,
  pluralCamel: string,
  camel: string,
  hookFile?: string,
  revisionEntityType?: string
|}

declare type EntityTypeFields = {
  [string]: EntityTypeField
}

declare type EntityTypeField = {|
  type: string,
  label: string,
  description?: string,
  many?: boolean,
  references?: string,
  required?: boolean,
  index?: boolean,
  fields?: EntityTypeFields,
  _meta?: Meta
|}

declare type EntityTypes = {
  [string]: EntityType
}

declare type EntityType = {|
  description: string,
  fields: EntityTypeFields,
  plural: string,
  storage: string,
  group?: string,
  revisions?: boolean,
  _excludeGraphQL?: boolean,
  _errors?: Array<Error>,
  _meta: Meta
|}

declare type EntityTypesPublic = {
  [string]: EntityTypePublic
}

// Public interface for saving entity types.
declare type EntityTypePublic = EntityType | {
  // Metadata is not required as its generated on load and not persisted as part
  // of the entity type storage.
  _meta?: Meta
}

/**
 * Fields.
 */
declare type FieldTypes = {
  [string] : {|
    label: string,
    description: string
  |}
}

declare type FieldMap = Map<string, string>