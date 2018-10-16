"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { _, hooks } = Panacea.container;
const formatRootTypeToOutput = function (rootType, definitions) {
    let output = [];
    output.push(`type ${rootType} {\n`);
    _(definitions).forEach(function (schemaDefinitions) {
        _(schemaDefinitions).forEach(function (definition) {
            const args = [];
            _(definition.arguments).forEach(function (value, key) {
                args.push(`${key}: ${value}`);
            });
            const argsOutput = _(args).isEmpty() ? '' : '(' + args.join(', ') + ')';
            output.push(`  # ${definition.comment || 'No description'}\n`);
            output.push(`  ${definition.name}${argsOutput}: ${definition.returnType}\n`);
        });
    });
    output.push('}\n');
    return output.join('');
};
const formatTypesToOutput = function (type, definitions) {
    let output = [];
    let nestedTypes = [];
    _(definitions).forEach(function (data, schemaName) {
        output.push(`\n# ${data.comment || 'No description'}\n`);
        output.push(`${type} ${data.name} {\n`);
        _(data.fields).forEach((field, fieldName) => {
            if (field.hasOwnProperty('fields')) {
                const refsType = (type === 'type') ? 'refsAsModels' : 'refsAsStrings';
                const nestedFieldName = `${schemaName}_${fieldName}`;
                const nestedDefinition = {};
                nestedDefinition[nestedFieldName] = {
                    comment: `Nested object on ${schemaName}. ${field.comment}`,
                    name: nestedFieldName,
                    fields: field.fields[refsType]
                };
                const nestedType = formatTypesToOutput(type, nestedDefinition);
                nestedTypes.push(nestedType);
                field.value = field.value.replace('__NestedObject', nestedFieldName);
            }
            output.push(`  # ${field.comment || 'No description'}\n`);
            output.push(`  ${field.value}\n`);
            output.push('\n');
        });
        output.push(`}\n`);
    });
    return output.join('') + nestedTypes.join('');
};
const formatEnumsToOutput = function (enums) {
    const output = [];
    _(enums).forEach(function (definition) {
        output.push(`\n# ${definition.comment || 'No description'}\n`);
        output.push(`enum ${definition.name} {\n`);
        definition.items.map(item => {
            output.push(`  # ${item.comment || 'No description'}\n`);
            output.push(`  ${item.value}\n\n`);
        });
        output.push(`}`);
    });
    return output.join('');
};
exports.graphQLTypeDefinitions = function () {
    return new Promise(function (resolve, reject) {
        try {
            const output = [];
            const types = {};
            const queries = {};
            const mutations = {};
            const inputs = {};
            const enums = {};
            const scalars = [];
            hooks.invoke('core.graphql.definitions.types', { types });
            output.push(formatTypesToOutput('type', types));
            hooks.invoke('core.graphql.definitions.inputs', { inputs });
            output.push(formatTypesToOutput('input', inputs));
            hooks.invoke('core.graphql.definitions.queries', { queries });
            output.push(formatRootTypeToOutput('Query', queries));
            hooks.invoke('core.graphql.definitions.mutations', { mutations });
            output.push(formatRootTypeToOutput('Mutation', mutations));
            hooks.invoke('core.graphql.definitions.enums', { enums });
            output.push(formatEnumsToOutput(enums));
            hooks.invoke('core.graphql.definitions.scalars', { scalars });
            output.push('\n' + scalars.map(s => `scalar ${s}`).join('\n'));
            const tidyDefinitionEndings = function (input) {
                return input.replace(/\n\n\}/g, '\n}');
            };
            resolve(tidyDefinitionEndings(output.join('\n')));
        }
        catch (error) {
            reject(error);
        }
    });
};
//# sourceMappingURL=types.js.map