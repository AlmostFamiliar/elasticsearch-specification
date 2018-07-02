import Domain = require("./domain");
import SpecValidator = require("./specification/validator");
import TypeReader = require("./specification/type-reader");

//will be marked as unused but the require is what brings in the global `ts` variable
const typescript = require('ntypescript');

const _: _.LoDashStatic = require('lodash');
const glob = require("glob");

module ApiSpecification
{
  export class Specification
  {
    private specsFolder = __dirname + "/../specs";
    private configPath = this.specsFolder + "/tsconfig.json";
    private readonly program: ts.Program;

    types: Domain.TypeDeclaration[] = [];
    domain_errors: string[] = [];

    endpoints: Domain.Endpoint[] = [];
    endpoint_errors: string[] = [];

    private constructor(validate: boolean)
    {
      const config = ts.readConfigFile(this.configPath, file => ts.sys.readFile(file));
      const commandLine = ts.parseJsonConfigFileContent(config.config, ts.sys, this.specsFolder);
      this.program = ts.createProgram(commandLine.fileNames, commandLine.options);

      if (validate)
      {
        this.domain_errors = new SpecValidator().validate(this.program);
        if (this.domain_errors.length > 0)
        {
          const errorString = _(["The specification contains the following type mapping errors:"])
            .concat(_(this.domain_errors).map(e =>  "  - " + e))
            .join("\n");
          throw Error(errorString);
        }
      }

      const specVisitor = new TypeReader(this.program);
      this.types =  new Array<Domain.TypeDeclaration>().concat(specVisitor.interfaces).concat(specVisitor.enums);

      const endpointReader = new EndpointReader(specVisitor.interfaces);
      this.endpoints = endpointReader.endpoints;
    }
    static load = () => new Specification(false);
    static loadWithValidation = () => new Specification(true);
  }
  export let loadWithValidation = Specification.loadWithValidation;
  export let load = Specification.load;

  export class EndpointReader
  {
    endpoints: Domain.Endpoint[];

    constructor(types: Domain.Interface[])
    {
      this.endpoints = _(glob.sync(__dirname + "/../specs/**/*.json"))
        .filter(f=>!f.match(/tsconfig/))
        .map(f=>new Domain.Endpoint(f))
        .value();
    }
  }
}
export = ApiSpecification
