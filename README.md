# Core PanaceaJS framework - In active development - Not production ready!

## What is PanaceaJS?

**For end clients** - Panacea is a framework your developers can use to build you fast, stable and efficient websites. In a world where technology is being used for competitive advantage it's important that your content and data can be used and re-used for different devices and platforms. Panacea provides highly flexible data modeling tools that your developers can use for your website, CRM system, intranet or anything else you can think of.

**For developers** - PanaceaJS (or simply, Panacea) is a headless Content Management System which has been built using the best Node.js components available to make your front-end development a breeze. Have you built a great front-end app, but struggling to find a powerful way to model and persist your data? Then Panacea may be for you. Panacea is opinionated where it makes, but gets out of way for you to integrate it with any front-end framework (or back-end service) of your choosing. By using a combination of GraphQL, MongoDB and express you can model, prototype and MVP your application's persisted data easily from day one while giving a free/libre solution to scale-up with when success kicks in. Panacea's powerful hooks system allows you to interact with data and events in real-time meaning there's no stopping your custom workflows and integrations.

## Prerequisites

The following need to be installed:

* [Node + npm](https://docs.npmjs.com/getting-started/installing-node)
* [MongoDB](https://docs.mongodb.com/manual/installation/)

## Quick start

Install the Panacea cli tool globally:

```sh
npm install -g @Panaceajs/cli
```

Start a project with the started template:

```sh
Panacea init starter-template PROJECT_NAME
```

where `PROJECT_NAME` is the sub-directory you wish to create your application.

Alternatively, you can run `Panacea init starter-template .` in an existing empty directory.

Navigate into your directory created for `PROJECT_NAME`.

Panacea requires a .env environment file to be set up.

If this is your first time using Panacea let Panacea scaffold this file for you:

```sh
Panacea generate-env
```

Finally run:

```sh
npm start
```

That's it! You should see in the final output: "Server listening on port 3000"

To explore you GraphQL schema with [Voyager](https://github.com/APIs-guru/graphql-voyager) go to [http://localhost:3000/voyager](http://localhost:3000/voyager)

To run some test queries (and mutations) against the test `Cat` and `Dog` schemas with [GraphiQL](https://github.com/graphql/graphiql) go to [http://localhost:3000/graphiql](http://localhost:3000/graphiql)

For more information about GraphQL, check out the [Introduction to GraphQL](http://graphql.org/learn/) docs.

## Directory structure
<pre>
/PROJECT_NAME
├ app.config.json  ─  Config file defining directories and hooks locations
├ config           ─  All config for you app lives here
│ ├ entities
│ │ └ schemas      ─  Main entity schemas directly used in your app
│ │   ├ Cat.yml    ─  An example schema for a Cat
│ │   └ Dog.yml    ─  An example schema for a Dog
│ └ hooks
│   └ hooks.js     ─  Example hooks file to interact and override Panacea's behaviors and triggered events
├ data
│ ├ app_log        ─  The default log directory for your application - debugging starts here
│ ├ db             ─  The default Mongo database (dbpath)
│ ├ db_log         ─  The default log directory MongoDB
│ └ sessions       ─  The store of active user sessions
├ index.js         ─  The applications main entry point
├ .env             ─  Application environment variables (per environment - don't commit to version control)
└ .env.example     ─  An example .env file
</pre>

## Key concepts

Panacea has been designed to provide you with comprehensive CMS features using a 'GraphQL-first' API.

* **[Panacea Core](https://github.com/panacea-js/core)** - provides all the API plumbling reading from yml files for your entity schemas and configuration.
* **[Panacea CMS](https://github.com/panacea-js/cms)** - is a first-class application providing functionality you'd expect to find in all good CMSs. Although Panacea Core can be used as a standalone application we strongly recommend using Panacea's official CMS to make the most of the Panacea eco-system.
* **[Panacea CLI](https://github.com/panacea-js/cli)** - is a command line tool (cli) for creating new projects and performing common tasks within your application.
* **Templates** - allow you to create application starter kits and distribute them to your team and the wider world. Templates can be easily installed using the Panacea CLI.
* **Application** - is a term used in Panacea as anything that consumes the GraphQL endpoint.
* **Hooks** - are a publish/subscribe mechanism to add your own behaviors and alter workflow data.
* **Entities** - are the yml files which describe data types in your application. They can reference other types of objects and can have a nested 'object' structure. Entities automatically get converted to GraphQL types and MongoDB collections without you needing to do any of the plumbing. Of course, all of this can be overriden using the hooks system.
* **Config entities** - are a singleton entities which define site-wide configuration. This configuration can be altered directly in the yml files, however we strongly recommend you use Panacea CMS to make any changes.

Points to note:

* **No database configuration** - Panacea embraces version control for configuration management workflows. Other CMSs have complicated methods to get/write and sync config to and from their database. Panacea CMS reads and writes the applications configuration directly to the file system, so you can use your favorite version control system to manage complex workflows leaving your database for, well... data!
* **Front-end agnostic** - Panacea assumes very few things about your front end. The only pre-requisite is that your application can send and receive GraphQL queries. As such, Panacea can be used with any front end framework or backend service (written in any language).
* **No front end provided** - Panacea does not have any public front-end bundled in, so should be considered a [headless-CMS](https://en.wikipedia.org/wiki/Headless_CMS). The maintainers don't rule out bundling optional front-ends in the future, which will make it a more complete end-to-end solution. For now, our focus is building an extremely approachable and flexible solutions for reliably persisting data that comes from your front end application.
* **Batteries included** - The Panacea CMS aims to rival the best Content Management Systems available today by providing an intuitive admin UI that's not just for programmers. End clients expect more-and-more from their website admin experience and we aim to blow them away with speed, simplicity and ease-of-use.

### Server configuration

If you want to except Panacea's defaults, you're index.js can be very terse:

```js
import panacea from '@panaceajs/core'
panacea().then(app => {})
  .catch(error => console.log(`An error occurred: ${error}`))
```

In your index.js file you can pass various options to alter the Panacea's bootstrap process.

The `panacea()` function returns a Promise which resolves to an express application.

You can defer starting the application when calling `panacea()` if you want to add your own middleware. This is the example given in the [starter-template](https://github.com/panacea-js/starter-template).

Available options to pass to `panacea()` are as follows with defaults shown:

```js
  const options = {
    main: {
      endpoint: 'graphql', // Change this to alter the main GraphQL endpoint.
      port: 3000,
      deferListen: false
    },
    graphiql: {
      endpoint: 'graphiql',
      enable: true, // Set to false to disable GraphiQL.
    },
    voyager: {
      endpoint: 'voyager',
      enable: true, // Set to false to disable Voyager.
    },
  }
```