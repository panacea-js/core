/**
 * Entity types.
 */

interface Meta {
  pascal: string
  descriptionLowerFirst: string
  pluralCamel: string
  camel: string
  hookFile?: string
  revisionEntityType?: string
}

interface EntityTypeDefinitions {
  [name: string]: EntityTypeDefinition
}

interface EntityTypeDefinition {
  description: string
  fields: EntityTypeFields
  plural: string
  storage: string
  group?: string
  revisions?: boolean
  _filePath? : string
  _excludeGraphQL?: boolean
  _errors?: Array<Error>
  _meta: Meta
}

/**
 * Field types.
 */
interface FieldTypes {
  [name: string] : {
    label: string
    description: string
  }
}

/**
 * Fields.
 */
interface EntityTypeFields {
  [name: string]: EntityTypeField
}

interface EntityTypeField {
  type: string
  label: string
  description?: string
  many?: boolean
  default?: string
  references?: [string]
  required?: boolean
  index?: boolean
  fields?: EntityTypeFields
  _meta?: FieldMeta
}

interface FieldMeta {
  camel: string
}

type FieldMap = Map<string, string>
