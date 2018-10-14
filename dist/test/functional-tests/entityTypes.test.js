"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const path = require("path");
const testCommon_1 = require("../testCommon");
testCommon_1.initTasks(ava_1.default);
ava_1.default.serial('_entityTypes graphql query resolves with Cat and Dog entity types', t => {
    t.plan(2);
    return testCommon_1.graphqlQuery('{ _entityTypes { name, data } }')
        .then((json) => {
        // console.log(JSON.parse(json.data._entityTypes[0].data))
        const entityNames = json.data._entityTypes.map((et) => et.name);
        t.true(entityNames.includes('Cat'));
        t.true(entityNames.includes('Dog'));
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('_entityType graphql query resolves with Cat entity type', t => {
    testCommon_1.graphqlQuery('{ _entityType(name: "Cat") { name } }')
        .then((json) => {
        t.true(json.data._entityType.name === 'Cat');
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('_fieldTypes graphql query resolves with basic field types', t => {
    t.plan(4);
    return testCommon_1.graphqlQuery('{ _fieldTypes { type } }')
        .then((json) => {
        const fieldTypes = json.data._fieldTypes.map((ft) => ft.type);
        t.true(fieldTypes.includes('id'));
        t.true(fieldTypes.includes('string'));
        t.true(fieldTypes.includes('int'));
        t.true(fieldTypes.includes('object'));
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('Sending a language cookie sends translated results for _fieldTypes graphql query', async (t) => {
    const fetchOptions = {
        headers: {
            cookie: 'PANACEA-LANGUAGE=es; SOME-OTHER-COOKIE=nothing' // Request Spanish results via cookie
        }
    };
    await testCommon_1.graphqlQuery('{ _fieldTypes { type, label } }', {}, 'default', fetchOptions)
        .then((json) => {
        const fieldTypes = json.data._fieldTypes;
        t.is(fieldTypes.find((x) => x.type === 'string').label, 'Cadena');
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('Sending an invalid language cookie sends translated results for _fieldTypes graphql query fallen back to English', async (t) => {
    // Note: this requires that the testing environment defaults to English.
    const fetchOptions = {
        headers: {
            cookie: 'PANACEA-LANGUAGE=invalid; SOME-OTHER-COOKIE=nothing' // Request Spanish results via cookie
        }
    };
    await testCommon_1.graphqlQuery('{ _fieldTypes { type, label } }', {}, 'default', fetchOptions)
        .then((json) => {
        const fieldTypes = json.data._fieldTypes;
        t.is(fieldTypes.find((x) => x.type === 'string').label, 'String');
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('_entityType graphql query resolves null with unavailable entity type is queried', t => {
    return testCommon_1.graphqlQuery('{ _entityType(name: "Gnome") { name } }')
        .then((json) => {
        t.is(json.data._entityType, null);
    })
        .catch(error => console.error(error));
});
ava_1.default.serial('_createEntityType creates a yml file given the provided entityData (in the correct format)', async (t) => {
    t.plan(2);
    const { loadYmlFiles, fs } = Panacea.container;
    const bearData = {
        storage: 'db',
        description: 'A large animal with big claws',
        plural: 'Bears',
        fields: {
            id: {
                type: 'id',
                label: 'Bear ID'
            },
            name: {
                type: 'string',
                label: 'Bear name'
            }
        }
    };
    await testCommon_1.graphqlQuery(`
    mutation ($name: String!, $data: String!, $locationKey: String!) {
      _createEntityType(name: $name, data: $data, locationKey: $locationKey) {
        name,
        data
      }
    }`, {
        name: 'Bear',
        data: JSON.stringify(bearData),
        locationKey: 'test'
    })
        .then(json => {
        const entityFixtures = loadYmlFiles(path.resolve(__dirname, '../fixtures/entityTypes/schemas'));
        t.is(bearData.plural, entityFixtures.Bear.plural); // 'Bears'
        t.is(bearData.fields.name.label, entityFixtures.Bear.fields.name.label); // 'Bear name'
        fs.removeSync(path.resolve(__dirname, '../fixtures/entityTypes/schemas/Bear.yml'));
    })
        .catch(error => console.error(error));
});
//# sourceMappingURL=entityTypes.test.js.map