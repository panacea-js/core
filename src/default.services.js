// Register env variables.
import dotenv from 'dotenv-safe'
dotenv.load();

// Third party sources.
import _ from 'lodash'
import express from 'express'
import bodyParser from 'body-parser'
import { graphiqlExpress, graphqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import fs from 'fs-extra'
import glob from 'glob'
import js_yaml from 'js-yaml'
import mongoose from 'mongoose'
import requireDir from 'require-dir'

// Local sources.
import { dbConnection } from './mongodb/connection'
import { dbModels } from './mongodb/models'
import { graphQLTypeDefinitions } from './graphql/types'
import { graphQLResolvers } from './graphql/resolvers'
import { loadYmlFiles } from './utils/yaml'
import { appConfig } from './utils/appConfig'
import { hooks } from './utils/hooks'
import { Logger } from './utils/logger'
import * as formatters from './utils/formatters'

export default {
  _,
  fs,
  glob,
  js_yaml,
  log: new Logger(),
  requireDir,
  loadYmlFiles,
  appConfig,
  hooks,
  formatters,
  express,
  voyagerMiddleware,
  bodyParser,
  graphqlExpress,
  graphiqlExpress,
  makeExecutableSchema,
  dbConnection,
  dbModels,
  graphQLTypeDefinitions,
  graphQLResolvers,
  mongoose
}