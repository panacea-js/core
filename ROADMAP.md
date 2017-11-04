# Panaceajs roadmap

## @todos Backend

### GraphQL

* ~~Automatic create`Entity` migrations~~
* ~~Automatic update`Entity` migrations~~
* Automatic delete`Entity` migrations
* Create endpoints for admin controls - e.g. CRUD entities
* ~~Nested object discoverable for types and inputs~~
* Automate resolvers and provide hooks for alteration
  * Respect nesting in Mongo saving of documents
* Separate application level calls to graphql vs admin calls
  * E.g. manipulation of admin entities (users, applications) should be separated from application entities (content).

### Sub-systems

* ~~Allow hookable API for third parties extensions and distributions~~
* Better structure for defining separate applications
* Allow trigger from external application (e.g. cms) to reload the backend configuration (e.g. on saving entity schema changes)

### Users and auth

* Create an authentication mechanism for application access (OAuth2?)

## @todos CMS Admin UI

* Nuxt + Vuetify
* Build bundler (webpack/rollup)
* UI layouts - menus
* Entity Management
* Config Management
  * Storage as YML files via GraphQL endpoints

## @todos Code and misc

* ~~Dependency injection container~~
* ~~Ava or similar testing lib~~
* Test coverage for mocked yml entities
* ~~Move to separate repo away from original AMS system~~
* env file documentation
* Document and test install steps
* Document the APIs (especially hooks and suggested config files)
