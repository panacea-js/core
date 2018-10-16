"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dbConnection = function (options) {
    const { host, dbName, port } = options;
    const { mongoose } = Panacea.container;
    mongoose.Promise = Promise;
    return mongoose.createConnection(`mongodb://${host}:${port}/${dbName}`, { useNewUrlParser: true });
};
exports.dbConnection = dbConnection;
//# sourceMappingURL=connection.js.map