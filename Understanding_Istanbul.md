# Istanbul is magic

If you're using Angular and the Karma tester you've run across the istanbul code coverage tool for JS. This is a pretty popular module for doing coverage in nodejs and nowdays angular as well. Using it in grunt, gulp or angular just seems like magic and just works. While trying to understand what exactly it's doing under the hood probably isn't a priority for most, if you want to bring istanbul to a new set of tools for whatever reason, this blog should serve as a tentative guide. This is a useful exercise if you're trying to integrate istanbul into a custom tool or into a custom container (ie, non-node, non-browser)

This will also be interesting if you're just generally interested in how istanbul instruments code so you understand the approach and create your own utilities.

If you're not using istanbul's cli, then you should probably be aware that you're dealing with 3 macro components:

* Instrumenter - used to instrument a source file
* Collector - takes data collected when instrumented code is run and does some magic to it
* Reporter - takes data from the collector and uses it to generate a number of different reports formats, the snazziest of which is the html one.

So given this the absolute simplest workflow you can follow is:

* Load your code files and instrument them with the Instrumenter (or use the istanbul cli)
* Run the instrumented files, capture output from some global object (more on this later)
* Get the information contained in your global object into an istanbul Collector
* Get your istanbul Collector to the istanbul Reporter and write a report.

## The instrumenter

If you look at istanbul instrumented files you can see it basically turns your beautiful javascript into hieroglyphics. But, it's not as bad as it looks. Here is a break down:

First the page gets a reference to 'global'. In node this is cross module global, in a browser it will get you window. In a custom container (like a game engine) it will depend on how the engine bundles context. For an explanation of Function('return this) see: [this](http://stackoverflow.com/questions/26015436/why-does-functionreturn-this-return-global)

```
var __cov_uO9imRK7GElztprJdG52mw = (Function('return this'))();
```

From here we define a object on global, give it an index for the filename in question and then define a bunch of counters which are based on the functions, branches and statements in your file. (f,b,s counters)

```javascript
if (!__cov_uO9imRK7GElztprJdG52mw.__your_variable__) { __cov_uO9imRK7GElztprJdG52mw.__your_variable__ = {}; }
__cov_uO9imRK7GElztprJdG52mw = __cov_uO9imRK7GElztprJdG52mw.__your_variable__;
if (!(__cov_uO9imRK7GElztprJdG52mw['urfile.js'])) {
   __cov_uO9imRK7GElztprJdG52mw['urfile.js'] = {
    "path": "urfile.js",
    "s": {
        "1": 0,
        "2": 0,
```

Then istanbul increments these counters at points in your code:

```javascript
    init: function (somevar) {
            __cov_uO9imRK7GElztprJdG52mw.f['2']++;
            __cov_uO9imRK7GElztprJdG52mw.s['3']++;
            if ((__cov_uO9imRK7GElztprJdG52mw.b['2'][0]++, somevar) && (__cov_uO9imRK7GElztprJdG52mw.b['2'][1]++, typeof somevar !== 'function')) {
                __cov_uO9imRK7GElztprJdG52mw.b['1'][0]++;
                __cov_uO9imRK7GElztprJdG52mw.s['4']++;
                throw new Error('MyThing(somevar): somevar: must be a function!');             
```

## Running

Once your code is instrumented, it needs to be executed. For example, maybe now is a good time to run your unit tests. When the tests are done running you need to somehow, someway get access to the data that has been placed in global. For node, this is easy, because global is...well...global as in across all modules. In the browser, you're pretty much your own module and every script is evaluated within that module, so just grabbing window will suffice. Outside of that it's again - very much dependent on how your scripts are being loaded. In either case, you can again get access to global by creating a new function. From here, we can serialize the contents and dump to disk:

```javascript
var data = (Function('return this'))();
var dataString = JSON.stringify(data.__your_variable__, null, '\t');
//write this somewhere or pass pre-stringified obj to collector 
```

## Collecting and reporting

Once you've generated coverage data by running your instrumented scripts and somehow captured that data, you can pass the data to istanbul's collector. From there, istanbul does some magic which we'll cover (ahem no pun intended) down below. From here, collectors are passed to a reports and reporters generate awesomeness.

For example given some data read from disk you could:

```javascript
var ist = require("istanbul");
var collector =  new ist.Collector();
var reporter = new ist.Reporter();

var obj = fs.readFileAsync('coverage.json'); //the stuff you wrote to disk (or multiple files, if you so desire)

//add the data
collector.add(obj);

//generate file coverage from the data
collector.files().forEach(function(file) {
    var fileCoverage = collector.fileCoverageFor(file);
    console.log('Covered file ' + file);
});

//generate a report
reporter.addAll(['html']);
reporter.write(collector, true, function () {
    console.log("Done, yay.");
    //open the report in chrome because we're awesome like that
    child = exec('chrome coverage/index.html',
        function (error, stdout, stderr) {
            console.log('chrome says - stdout: ' + stdout);
            console.log('chrome says - stderr: ' + stderr);
        });

});
```

## Okay, but how does instanbul instrument files

To get to the bottom of this we can start in instrumenter.js in the instrumentSync method.

The first big thing that happens is esprima is used to create an ast with:

```javascript
     program = ESP.parse(code, {
                    loc: true,
                    range: true,
                    tokens: this.opts.preserveComments,
                    comment: true
                });
```

From here, we then descend into instrumentASTSync. Here I suspect istanbul will traverse the AST and inject statements based on what it encounters.

 In instrumentASTSync, istanbul will lop off a use strict if it finds one:

 ```javascript
 if (program.body && program.body.length > 0 && this.isUseStrictExpression(program.body[0])) {
                 //nuke it
                 program.body.shift();
                 //and add it back at code generation time
                 usingStrict = true;
             }
 ```

 The it will invoke this.walker.startWalk on your AST.

 The walker is VERY interesting. I keep coming back to how incredibly modular and well architected instanbul is and this is one aspect. The walker class is initialized earlier.

 The init code looks like this:

 ```javascript
  this.walker = new Walker({
             ExpressionStatement: this.coverStatement,
             BreakStatement: this.coverStatement,
             ContinueStatement: this.coverStatement,
             DebuggerStatement: this.coverStatement,
             ReturnStatement: this.coverStatement,
             ThrowStatement: this.coverStatement,
             TryStatement: this.coverStatement,
             VariableDeclaration: this.coverStatement,
             IfStatement: [ this.ifBlockConverter, this.coverStatement, this.ifBranchInjector ],
             ForStatement: [ this.skipInit, this.loopBlockConverter, this.coverStatement ],
             ForInStatement: [ this.skipLeft, this.loopBlockConverter, this.coverStatement ],
             WhileStatement: [ this.loopBlockConverter, this.coverStatement ],
             DoWhileStatement: [ this.loopBlockConverter, this.coverStatement ],
             SwitchStatement: [ this.coverStatement, this.switchBranchInjector ],
             SwitchCase: [ this.switchCaseInjector ],
             WithStatement: [ this.withBlockConverter, this.coverStatement ],
             FunctionDeclaration: [ this.coverFunction, this.coverStatement ],
             FunctionExpression: this.coverFunction,
             LabeledStatement: this.coverStatement,
             ConditionalExpression: this.conditionalBranchInjector,
             LogicalExpression: this.logicalExpressionBranchInjector,
             ObjectExpression: this.maybeAddType
         }, this.extractCurrentHint, this, this.opts.walkDebug);
 ```

 This is very useful as the walker is essentially injected with a statement to handler mapping. In theory, if you wanted to customize istanbul instrumentation strategy or create your own brand of instrumentation you could do this here.

 Lets look at the different methods and at the implementation of the walker. The bulk of work in the Walker is done in startWalk which calls 'apply'.

 The apply method accepts a node and walkFn and a pathElement. Our initial call from instrumentASTSync will call it only with the first param which is your program body. As such, apply will use the internally defined defaultWalker function for walkFn. The pathelement seems to be used for capturing a path stack of AST elements, but im not sure about this yet.

 After doing some stuff if debug is enabled for tracing, pathElement gets captured and walkFn is invoked.

 The default walkFn does some init, followed by a check for infinite recursion. I think the most notable part of the init is the initialization of its own walkerFn (same name) from the walkMap.

  ```javascript
  applyCustomWalker = !!node.loc || node.type === SYNTAX.Program.name,
  walkerFn = applyCustomWalker ? walker.walkMap[type] : null,
  ```
  Note that depending on what you supplied via walkMap walkerFn can be an array of walker functions.

 Also of interest for later is how the variable 'children' is initialized:

 ```javascript
    children = SYNTAX[type].children
 ```

 This leverages a structure SYNTAX which is defined as:

  ```javascript
   SYNTAX = {
          ArrayExpression: [ 'elements' ],
          AssignmentExpression: ['left', 'right'],
          BinaryExpression: ['left', 'right' ],
          BlockStatement: [ 'body' ],
          BreakStatement: [ 'label' ],
          CallExpression: [ 'callee', 'arguments'],
          CatchClause: ['param', 'body'],
          ConditionalExpression: [ 'test', 'consequent', 'alternate' ],
          ContinueStatement: [ 'label' ],
          DebuggerStatement: [ ],
          DoWhileStatement: [ 'body', 'test' ],
          EmptyStatement: [],
          ExpressionStatement: [ 'expression'],
          ForInStatement: [ 'left', 'right', 'body' ],
          ForStatement: ['init', 'test', 'update', 'body' ],
          FunctionDeclaration: ['id', 'params', 'body'],
          FunctionExpression: ['id', 'params', 'defaults', 'body'],
          Identifier: [],
          IfStatement: ['test', 'consequent', 'alternate'],
          LabeledStatement: ['label', 'body'],
          Literal: [],
          LogicalExpression: [ 'left', 'right' ],
          MemberExpression: ['object', 'property'],
          NewExpression: ['callee', 'arguments'],
          ObjectExpression: [ 'properties' ],
          Program: [ 'body' ],
          Property: [ 'key', 'value'],
          ReturnStatement: ['argument'],
          SequenceExpression: ['expressions'],
          SwitchCase: [ 'test', 'consequent' ],
          SwitchStatement: ['discriminant', 'cases' ],
          ThisExpression: [],
          ThrowStatement: ['argument'],
          TryStatement: [ 'block', 'handlers', 'finalizer' ],
          UnaryExpression: ['argument'],
          UpdateExpression: [ 'argument' ],
          VariableDeclaration: [ 'declarations' ],
          VariableDeclarator: [ 'id', 'init' ],
          WhileStatement: [ 'test', 'body' ],
          WithStatement: [ 'object', 'body' ]

      };
   ```

   This seems to indicate properties of interest for a given node type in the AST.

  Before we get here a preprocessor is called via walker.apply. Not sure what this does yet. This seems to potentially get called again if it's return value has a preprocessor as well.


  Then a check if we're looking at an array. If it is an array, we loop through and call apply on its members. Using our walkerFun and an index.

 Otherwise we simply invoke the walkerFn and capture a variable called ret.

```
 if (isArray(walkerFn)) {
            for (walkFnIndex = 0; walkFnIndex < walkerFn.length; walkFnIndex += 1) {
                isLast = walkFnIndex === walkerFn.length - 1;
                ret = walker.apply(ret, walkerFn[walkFnIndex]);
                /*istanbul ignore next: paranoid check */
                if (ret.type !== type && !isLast) {
                    throw new Error('Only the last walker is allowed to change the node type: [type was: ' + type + ' ]');
                }
            }
        } else {
            if (walkerFn) {
                ret = walker.apply(node, walkerFn);
            }
        }
```

At this point we check the node for children (via the children var initialized earlier). We check if the child is defined and/or should be skipped. If its an array we look through its members calling walker.apply with null for walkFn causing us to call the default on it.

Otherwise we do the same on the node itself.

Note: Something else non-trivial happens around the return value and a prepend property, but I'm not fully sure what this is yet.

Lets look at some of the node specific walk functions. The one used for most of the nodes is called coverStatement.

## coverstatement

Coverstatement checks if the node should be skipped. I haven't studied this mechanism, so skipping that for now.

This is followed by a check for "use strict". If this is true something special happens involving an ancestor check. I'm going to gloss over this for now.

Then there is a check if the node is a function declaration. Whether it is or not, statementName is called. Using the nodes location.

The Statementname method is interesting in that it seems to increment a currentstate.statement counter and then associates that statements location (from .loc property in the ast) to the statement number in statementMap. It also does something else with the property 's'. But I'm not sure what that is for yet.

After getting the statement name (or number as it may be) we finally see the generation of code that istanbul will use to keep track of calls.

Here we see:

```javascript
incrStatementCount = astgen.statement(
                    astgen.postIncrement(
                        astgen.subscript(
                            astgen.dot(astgen.variable(this.currentState.trackerVar), astgen.variable('s')),
                            astgen.stringLiteral(sName)
                        )
                    )
                );
```

Where astgen is a utility designed to generate the AST that will eventually become istanbuls statement generation. Let's look at astgen because it's very cool (worthy of refactoring out for use elsewhere).


```
astgen = {
        variable: function (name) { return { type: SYNTAX.Identifier.name, name: name }; },
        stringLiteral: function (str) { return { type: SYNTAX.Literal.name, value: String(str) }; },
        numericLiteral: function (num) { return { type: SYNTAX.Literal.name, value: Number(num) }; },
        statement: function (contents) { return { type: SYNTAX.ExpressionStatement.name, expression: contents }; },
        dot: function (obj, field) { return { type: SYNTAX.MemberExpression.name, computed: false, object: obj, property: field }; },
        subscript: function (obj, sub) { return { type: SYNTAX.MemberExpression.name, computed: true, object: obj, property: sub }; },
        postIncrement: function (obj) { return { type: SYNTAX.UpdateExpression.name, operator: '++', prefix: false, argument: obj }; },
        sequence: function (one, two) { return { type: SYNTAX.SequenceExpression.name, expressions: [one, two] }; }
    };
```

We can see here astgen can be nested to create ast the looks something like:

 ```javascript
{
	"type": "ExpressionStatement",
	"expression": {
		"type": "UpdateExpression",
		"operator": "++",
		"prefix": false,
		"argument": {
			"type": "MemberExpression",
			"computed": true,
			"object": {
				"type": "MemberExpression",
				"computed": false,
				"object": {
					"type": "Identifier",
					"name": "__cov_9mQb7jlc5lis6__WiBmImg"
				},
				"property": {
					"type": "Identifier",
					"name": "s"
				}
			},
			"property": {
				"type": "Literal",
				"value": "1"
			}
		}
	}
}

 ```
This AST chunk creates a javascript line that increments a statement call count. For example:

```javascript
__cov_as0ifk8G1HMjnL50x2mrgg.s['1']++
```

Where '__cov_as0ifk8G1HMjnL50x2mrgg' is the unique coverage storage variable (generated earlier, and stored in currentState.trackerVar), 's' is our statement tracking count property, '1' is the incremented location we stored in statementMap.

From here, our other functions from walkMap follow a similar pattern, but have slightly different logic when it comes to traversal and statement generation. For example, lets look at FunctionExpression which calls both coverFunction + coverStatement.

CoverFunction is meant to give us a counter on overall function coverge (vs say statement + branch coverage). Here we see a similar pattern to coverStatement in that a function name is detected or generated, referenced in a map (fnMap) and then tracked via an increment that is added to the top of the function. After that coverStatement is called and a matching statement counter is placed as well:

For example:

```javascript
function findCommandPosition(args){
    __cov_as0ifk8G1HMjnL50x2mrgg.f['1']++;
    __cov_as0ifk8G1HMjnL50x2mrgg.s['4']++
// [ removed ]
```

To be continued...




