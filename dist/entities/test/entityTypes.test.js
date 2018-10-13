"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ava_1 = require("ava");
const test_common_1 = require("../../test/test-common");
test_common_1.initTasks(ava_1.default);
test_common_1.bootstrap();
const sandboxDir = test_common_1.getSandboxDir();
const { entityTypes, hooks, _, fs } = Panacea.container;
ava_1.default('Clearing entity types cache should remove entityTypes from function cache and getData() should successful repopulate the cache', t => {
    t.plan(3);
    entityTypes.getData();
    t.false(_(entityTypes.definitions).isEmpty());
    entityTypes.clearCache();
    t.true(_(entityTypes.definitions).isEmpty());
    entityTypes.getData();
    t.false(_(entityTypes.definitions).isEmpty());
});
ava_1.default('Stripping entity metadata should remove _filePath and _meta keys', t => {
    t.plan(6);
    const definitions = entityTypes.getData();
    // Metadata should exist.
    t.true(definitions.Dog._filePath !== undefined);
    t.true(definitions.Dog._meta !== undefined);
    const strippedMetadata = entityTypes.stripMeta(definitions);
    // Metadata on entityTypes should still exist.
    t.true(definitions.Dog._filePath !== undefined);
    t.true(definitions.Dog._meta !== undefined);
    // Metadata should be removed from strippedMetadata.
    t.true(strippedMetadata.Dog._filePath === undefined);
    t.true(strippedMetadata.Dog._meta === undefined);
});
ava_1.default('When an entity has no label defined an error should be thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        delete definitions.Cat.plural;
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, `A 'plural' key must be set on entity type: Cat`));
    entityTypes.clearCache();
});
ava_1.default('When an entity has no storage defined an error should be thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        delete definitions.Cat.storage;
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, `A 'storage' key must be set on entity type: Cat`));
    entityTypes.clearCache();
});
ava_1.default('When an entity field has empty definition an error should be thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        // @ts-ignore
        definitions.Cat.fields.breakingField = {};
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, 'Field breakingField configuration is empty'));
});
ava_1.default('When an entity field has no type defined an error should be thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        definitions.Cat.fields.breakingField = {
            // @ts-ignore
            incorrectTypeKey: 'Incorrect Type',
            incorrectLabelKey: 'Incorrect Label'
        };
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, 'Field type not defined for breakingField'));
});
ava_1.default('When an entity field has no label defined an error should be thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        definitions.Cat.fields.breakingField = {
            type: 'string',
            // @ts-ignore
            incorrectLabelKey: 'Incorrect Label'
        };
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, 'Field label not defined for breakingField'));
});
ava_1.default('When field definitions key is empty an error is thrown', t => {
    hooks.once('core.entityTypes.definitions', ({ definitions }) => {
        definitions.Cat.fields = {};
    });
    t.true(test_common_1.entityHasErrorMessage(entityTypes.getData().Cat, 'Fields do not exist on entity type: Cat'));
});
ava_1.default('When validating and EntityType without _errors property, it is added by the call to entityTypes.validate', t => {
    const entityTypeData = {};
    entityTypes.validate(entityTypeData, 'testEmptyArray', 'load');
    t.true(entityTypeData.hasOwnProperty('_errors'));
});
ava_1.default('Saving an EntityType in the correct required format writes a yml file to disk', t => {
    t.plan(2);
    const entityTypeData = {
        storage: 'db',
        fields: {
            id: {
                type: 'id',
                label: 'ID'
            }
        },
        plural: 'Mice',
        description: 'A successful created entity type',
        _meta: {
            camel: 'mouse',
            pascal: 'Mouse',
            pluralCamel: 'mice',
            descriptionLowerFirst: ''
        }
    };
    const saveResult = entityTypes.save('Mouse', entityTypeData, 'sandbox');
    t.true(saveResult.success);
    t.true(fs.existsSync(`${sandboxDir}/Mouse.yml`));
});
//# sourceMappingURL=entityTypes.test.js.map