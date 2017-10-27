"use strict";

const os = require('os');
const gql = require('./src');
const loaderUtils = require('loader-utils');
const print = require('graphql/language/printer').print;

// Takes `source` (the source GraphQL query string)
// and `doc` (the parsed GraphQL document) and tacks on
// the imported definitions.
function expandImports(source, doc) {
  const lines = source.split(/\r\n|\r|\n/);
  let outputCode = `
    var names = {};
    function unique(defs) {
      return defs.filter(
        function(def) {
          if (def.kind !== 'FragmentDefinition') return true;
          var name = def.name.value
          if (names[name]) {
            return false;
          } else {
            names[name] = true;
            return true;
          }
        }
      )
    }
  `;

  lines.some((line) => {
    if (line[0] === '#' && line.slice(1).split(' ')[0] === 'import') {
      const importFile = line.slice(1).split(' ')[1];
      const parseDocument = `require(${importFile})`;
      const appendDef = `doc.definitions = doc.definitions.concat(unique(${parseDocument}.definitions));`;
      outputCode += appendDef + os.EOL;
    }
    return (line.length !== 0 && line[0] !== '#');
  });

  return outputCode;
}

module.exports = function(source) {
  this.cacheable();

  const options = loaderUtils.getOptions(this) || {};
  const doc = gql`${source}`;
  const importOutputCode = expandImports(source, doc);

  const outputCode = options.outputString
    ? `var doc = \`${print(doc)}\`;`
    : `var doc = ${JSON.stringify(doc)};
       doc.loc.source = ${JSON.stringify(doc.loc.source)};`;

  return outputCode + os.EOL + importOutputCode + os.EOL + `module.exports = doc;`;
};

