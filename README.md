# Core PanaceaJS framework - In active development - Not production ready!

## What is PanaceaJS?

**For clients** - Panacea is a framework your developers can use to build fast, stable and efficient websites. In a world where technology is being used for competitive advantage it's important that your content and data can be used and re-used for different devices and platforms.

Panacea provides highly flexible data modeling tools that your developers can use for your website, CRM system, intranet or anything else you can think of.

Using Panacea is free (as in cost) and also comes with a permissive free-software [license](https://github.com/panacea-js/core/blob/master/LICENSE) allowing you build commercial solutions without supplier lock-in.

**For developers** - PanaceaJS (or simply, Panacea) is a [headless Content Management System](https://en.wikipedia.org/wiki/Headless_CMS) which has been built using the best Node.js components to make your front-end development a breeze.

**Have you built a great front-end app, but struggling to find a powerful way to model and persist your data?**

Panacea may be for you.

Panacea is opinionated where it makes sense, but gets out of way for you to integrate it with any front-end framework (or back-end service) of your choosing.

By using a combination of [GraphQL](https://en.wikipedia.org/wiki/GraphQL), [MongoDB](https://en.wikipedia.org/wiki/MongoDB) and [express](https://en.wikipedia.org/wiki/Express.js) you can model, prototype and MVP your application's persisted data easily from day one while giving a free/libre solution to scale-up with when success kicks in.

Data types (entities) and configration are declarative in nature so you can easily spot changes in your VCS allowing you to work efficiently and avoid merge conflict hell!

Panacea's powerful hooks system allows you to interact with data and events in real-time meaning there's no stopping your custom workflows and integrations.

## Prerequisites

The following need to be installed:

* [Node + npm](https://docs.npmjs.com/getting-started/installing-node)
* [MongoDB](https://docs.mongodb.com/manual/installation/)

## Quick start (5 easy steps)

1. Install the Panacea cli tool globally:

```sh
npm install -g @panaceajs/cli
```

2. Start a project with the started template:

```sh
panacea init starter-template PROJECT_NAME
```

where `PROJECT_NAME` is the sub-directory you wish to create your application.

(Alternatively, you can run `panacea init starter-template .` in an existing empty directory.)

3. Navigate into your directory created for `PROJECT_NAME`.

4. Panacea requires a .env environment file to be set up.

If this is your first time using Panacea let Panacea scaffold this file for you:

```sh
panacea generate-env
```

5. Finally, run:

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
│ │ 
│ └ hooks
│   └ hooks.js     ─  Example hooks file to interact and override Panacea's behaviors and triggered events
│
├ data             ─  Everything in this directory should be git ignored
│ ├ app_log        ─  The default log directory for your application - debugging starts here
│ ├ db             ─  The default Mongo database (dbpath)
│ ├ db_log         ─  The default log directory MongoDB
│ ├ sessions       ─  The store of active user sessions
│ └ files
│   ├ managed      ─  Storage for uploaded files
│   │ ├ private    ─  Managed private files (with special access permissions required)
│   │ └ public     ─  Managed public files (available without authentication)
│   └ static       ─  Storage for any static files not managed or editable via the GraphQL API
│
├ index.js         ─  The application main entry point
├ .env             ─  Application environment variables (per environment - don't commit to version control)
└ .env.example     ─  An example .env file
</pre>

For a more secure production setups, we recommend that you mount your application as read-only with exception of the `data` and `config` directories.

Please note that when using Panacea CMS it's possible that the `config` directory may be changed to reflect changes made in the admin UI. It's important to check for live changes before merging and commit them into version control to maintain a full history of changes.

## Key concepts

Panacea has been designed to provide you with comprehensive CMS features using a 'GraphQL-first' API.

* **[Panacea Core](https://github.com/panacea-js/core)** - provides all the API plumbling reading from yml files for your entity schemas and configuration.
* **[Panacea CMS](https://github.com/panacea-js/cms)** - is a first-class application providing functionality you'd expect to find in all good CMSs. Although Panacea Core can be used as a standalone application we strongly recommend using Panacea's official CMS to make the most of the Panacea eco-system.
* **[Panacea CLI](https://github.com/panacea-js/cli)** - is a command line tool (cli) for creating new projects and performing common tasks within your application.
* **Templates** - allow you to create application starter kits and distribute them to your team and the wider world. Templates can be easily installed using the Panacea CLI.
* **Application** - is a term used in Panacea as any system that consumes the GraphQL endpoint. All applications require setting up in the admin UI.
* **Hooks** - are a publish/subscribe mechanism to add your own behaviors and alter workflow data.
* **Entities** - are the yml files which describe data types in your application. They can reference other types of objects and can have a nested 'object' structure. Entities automatically get converted to GraphQL types and MongoDB collections without you needing to do any of the plumbing. Of course, all of this can be overriden using the hooks system.
* **Config entities** - are a singleton entities which define site-wide configuration. This configuration can be altered directly in the yml files, however we strongly recommend you use Panacea CMS to make any changes.

Points to note:

* **No database configuration** - Panacea embraces version control for configuration management workflows. Other CMSs have complicated methods to get/write and sync config to and from their database. Panacea CMS reads and writes the applications configuration directly to the file system, so you can use your favorite version control system to manage complex workflows leaving your database for, well... data!
* **Front-end agnostic** - Panacea assumes very few things about your front end. The only pre-requisite is that your application can send and receive GraphQL queries. As such, Panacea can be used with any front end framework or backend service (written in any language).
* **No front end provided** - Panacea does not have any public front-end bundled in, so should be considered a [headless-CMS](https://en.wikipedia.org/wiki/Headless_CMS). The maintainers don't rule out bundling optional front-ends in the future, which will make it a more complete end-to-end solution. For now, our focus is building an extremely approachable and flexible solutions for reliably persisting data that comes from your front end application.
* **Batteries included** - The Panacea CMS aims to rival the best Content Management Systems available today by providing an intuitive admin UI that's not just for programmers. End clients expect more-and-more from their website admin experience and we aim to blow them away with speed, simplicity and ease-of-use.

## Configuration details

### Various bootstrap methods

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

### Registering your application

@todo

### Hooks

@todo

### Entity yml documentation

@todo

### Config yml documentation

@todo

### Creating templates

@todo

### Front end examples

@todos

### CMS (admin UI) documentation

Please refer to the [CMS documentation](https://github.com/panacea-js/cms)
@todo - Build a guide on main website

### Securing Panacea

@todo

### Scaling Panacea

@todo

## Contribution, feature requests, support and promotion

Like what you see?

We welcome any interest in contribution to help Panacea be stronger and better. Please create an issue or [send us a message](https://www.reallifedigital.com/contact).

[Github](https://github.com/panacea-js)
Twitter: Coming soon
npm: Coming soon

## Security issues

If you find any security related issues in Panacea, please [contact us](https://www.reallifedigital.com/contact) privately.

## Credits

Panacea development is sponsored by [Real Life Digital](https://www.reallifedigital.com) - a UK web development agency helping clients
Lead developer and maintainer: Barry Fisher