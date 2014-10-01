# Istanbul is magic

If you're using Angular and the Karma tester you've run across the istanbul code coverage tool for JS. This is a pretty popular module for doing coverage in nodejs and nowdays angular as well. Using it in grunt, gulp or angular just seems like magic and just works. While trying to understand what exactly it's doing under the hood probably isn't a priority for most, if you want to bring istanbul to a new set of tools for whatever reason, this blog should serve as a tentative guide. This is a useful exercise if you're trying to integrate istanbul into a custom tool or into a custom container (ie, non-node, non-browser)

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
if (!(__cov_uO9imRK7GElztprJdG52mw['binheap.js'])) {
   __cov_uO9imRK7GElztprJdG52mw['binheap.js'] = {
    "path": "binheap.js",
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

## Great, but uh what the heck is going on in there?

To be continued....
