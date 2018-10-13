"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const test_common_1 = require("../../test/test-common");
test_common_1.initTasks(ava_1.default);
test_common_1.bootstrap();
const { graphQLTypeDefinitions, hooks, entityTypes } = Panacea.container;
ava_1.default.serial('Cat entity should resolve to GraphQL type, input and query', t => {
    t.plan(4);
    return graphQLTypeDefinitions().then(data => {
        const catTypeFound = data.indexOf('type Cat {') !== -1;
        const catInputTypeFound = data.indexOf('input CatInput {') !== -1;
        const catsQueryFound = data.indexOf('cats(params: QueryParams): [Cat!]') !== -1;
        const catStories = data.indexOf('type Cat_stories') !== -1;
        t.true(catTypeFound);
        t.true(catInputTypeFound);
        t.true(catsQueryFound);
        t.true(catStories);
    });
});
ava_1.default.serial('When an entity field defines an invalid type an error is thrown', async (t) => {
    // Append via a hook.
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        definitions.Cat.fields.breakingField = {
            type: 'FakeTypeNoExist',
            label: 'A valid label'
        };
    });
    const error = await t.throws(graphQLTypeDefinitions(), TypeError);
    t.is(error.message, `FakeTypeNoExist not found in GraphQL type conversion mapping`);
});
ava_1.default.serial('When an convertSystemFieldToGraphQL() does not have a field mapping related to an entity field type an error is thrown from entityTypes.js', async (t) => {
    entityTypes.getData();
    entityTypes.definitions.Cat.fields.name.type = 'notValid';
    entityTypes.fieldTypes.notValid = {
        label: 'Broken field',
        description: 'Setting an known invalid type to test whether convertSystemFieldToGraphQL() throws an error'
    };
    const error = await t.throws(graphQLTypeDefinitions(), TypeError);
    t.is(error.message, `notValid not found in GraphQL type conversion mapping`);
});
ava_1.default.beforeEach(t => entityTypes.clearCache());
//# sourceMappingURL=types.test.js.map