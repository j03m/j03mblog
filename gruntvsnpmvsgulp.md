# DRAFT - WORK IN PROGRESS


# Overview of Grunt/Gulp/NPM as Task Runners

I don't like grunt. Really. I think it sucks to read and when I first tried to make use of it I decided I just wanted to write my own scripts. Then I read substacks [post on just using npm tasks[(http://substack.net/task_automation_with_npm_run) and I basically said to myself, "Yea, that pls.". But as I started working on bigger things I started noticing grunt plugins that would help and so I decided to take another plunge. Around this time I found gulp. And I said, wow, gulp is SO readable this is awesome. But then you get into the details and inevitably end up at a point where your brain says: "Dear Joe, I'm pretty sure not every thing we're ever going to do is going to be a stream." 
 
 Here is your tl;dr in advanced (otherwise known as the executive summary):
 
 * npm - is really simple, but outside of setting environment variables and alias-ing commands you aren't getting the much. But, where I seemed to net out is that you don't really need everything else save plugins. But - thats sort of modules are...already? Aren't they?
 * grunt is pretty much everything you want but it's "configuration over code" means you really need to be fluent with the docs before wading in. Grunt is sort of like angular in that when you first look at it, it's like reading Japanese. Which, if you don't yet speak Japanese, is a little daunting.  Once you learn the Japanese language, you realize that okay yea this 14 pages of json minifies my code and copies it to another directory....Afterwards you may be a little pissed you took all that time to learn japanese.
* gulp is beautiful in it's simplicity and has everything you want like grunt. So on the surface you may intiially think "oh the power of grunt in a language I understand (aka no learning japanese). Until you realize gulp wants to end everything you say with "in bed". Which is amusing and neat for about 15 minutes until you're trying to actually have a conversation and find yourself constantly working around having to say "in bed" at the end of every sentence.

Okay so to illustrate these points I'm going to do the same thing 3 times once with npm, once with grunt and once with gulp. Some rules before we start:

* I'm purposely not working on a boiler plate web app. 

* I'm not assuming my code is nodejs code (the why for this is complex but suffice to say, I've worked on enough non-browser, non-node js environments (think - game engines etc that I want to limit myself here), so for example anything that hooks node's underlying require system to modify files and make them look something is actually being streamed is off limits. (looking at you gulp plugins). Don't get me wrong, this is great stuff, I just can't use it. So it's banned.

So what we'll try to accomplish with all 3 of these tools is:

```
    it should:
        define an initial directory
        define a coverage output directory
        define a report direcctory
        define an instrumentation task:
            it should:
                find all *.js files, but not *.t.js file and not a list of specifc files on an ignore list
                instrument all of these .js files with istanbul
                find all files with a *.t.js extension
                find all json files with a specific name
                inject a snippet into the json file in question at a certain location
                decompile a template.js file with esprima
                inject the esprima ast with the list of t.js files (could probably do this with regex, but esprima is the "more" correct way and I'll need to do more later)
                save all of the modified and unmodified files to another directory
                watch all of the files in the initial directory, if any of the .js, .t.js or .json files are modified repeat this process
                watch and tail another file, a log listen for a specific regex on hit, run an extraction process
        define an extraction process 
            it should:
                Pull the data in the regex
                Pass it to istanbul for reporting
                create a report in the report directory
```

So, let's try to do each piece with grunt, npm and gulp. 

## Defining global config vars

So first up, lets start our scripts:

```
 it should:
        define an initial directory
        define an initial directory
        define a coverage output directory
        define a report direcctory
  
```

### npm 

In the first 5 minutes of thinking through my design I *thought* I hit my first hurdle with npm, there is no way to define global configuration variables. If we look at substack's example as a comparison to our own specs, this becomes much more clear:

```
 "scripts": {
    "build-js": "browserify browser/main.js | uglifyjs -mc > static/bundle.js",
    "build-css": "cat static/pages/*.css tabs/*/*.css",
    "build": "npm run build-js && npm run build-css",
    "watch-js": "watchify browser/main.js -o static/bundle.js -dv",
    "watch-css": "catw static/pages/*.css tabs/*/*.css -o static/bundle.css -v",
    "watch": "npm run watch-js & npm run watch-css",
    "start": "node server.js",
    "test": "tap test/*.js"
  }
```

Here, he's constantly repeating his paths, 'browser', 'static' etc. They are short, so it's not big a deal but what if they weren't? What if they were going to change pretty often? Or if I wanted to make this significantly generic enough that someone could come in a configure paths without having to touch a bunch of locations or using find/replace. 

Turns out npm actually has a facility to do this called the *package.json config hash*. From the npm [docs](https://www.npmjs.org/doc/misc/npm-scripts.html) :

```
Special: package.json "config" hash
The package.json "config" keys are overwritten in the environment if there is a config param of <name>[@<version>]:<key>. For example, if the package.json has this:

{ "name" : "foo"
, "config" : { "port" : "8080" }
, "scripts" : { "start" : "node server.js" } }
and the server.js is this:

http.createServer(...).listen(process.env.npm_package_config_port)
then the user could change the behavior by doing:

npm config set foo:port 80
```

So from this perspective we can set up all of our global paths and variables via config in npm. So we can add this to our package.json file:
 
``` 
 {
   "name": "code coverage tool",
   "version": "0.0.1",
   "description": "Do some magic, instrument code, watch for changes, create reports.",
   "main": "myfile.js",
   "dependencies": {
     "bluebird": "~2.3.2",
     "escodegen": "~1.4.1",
     "esprima": "~1.2.2",
     "event-stream": "~3.1.7",
     "glob": "~4.0.6",
     "istanbul": "~0.3.2",
     "mkdirp": "~0.5.0",
     "safe-async": "~0.3.1",
     "shelljs": "~0.3.0",
     "string": "~2.1.0",
     "lodash": "~2.4.1",
     "grep1": "~0.0.5",
     "through": "~2.3.6",
     "split": "~0.3.0",
     "moment": "^2.8.3"
   },
   "devDependencies": {},
   "config":{
       base: '[somepath]/mybase',
       coverage: '[somepath]/mycoverage',
       report: '[somepath]/myreport',
   },
   "scripts": {
   },
   "author": "Joe Mordetsky",
   "license": "None"
 }
```


### Grunt

So moving onto grunt. In grunt setting up some global variables is pretty easy. In fact, if you want you can just use plain old global vars. That feels familiar and more importantly not clever. I can just define a config var somewhere and reference that as I see fit. This explicit, non-proprietary and know anyone who knows js can find it and modify it. This is the inherit beauty of code vs configuration and highlights a nicety in grunt in that in many ways it allows for both. In this case I don't need to know any magical incantation for npm to get what I want, it all just lives in node. 

```javascript
    var coverageConfig = {
        base: '[somepath]/mybase',
            coverage: '[somepath]/mycoverage',
            report: '[somepath]/myreport',
    }
```

That said, grunt is not arcana free. In grunt something like this is generally referenced via the grunt config. So the beautiful variable above is often jacked into grunt config: 

```javascript
    grunt.initConfig({
        paths: coverageConfig
    });
```
Grunt also has the notion of templates. Templates are things in cased in the *<% %>* delimiters. Templates allow you to do a lot of stuff but what it tends to generally be used for is expanding references back to the config. So for example if I want to expand one of my vars I can do:

```javascript
var coverageConfig = {
      base: '[somepath]/mybase',
      coverage: '[somepath]/mycoverage',
      report: '[somepath]/myreport',
    };

grunt.initConfig({
        paths: coverageConfig
        files: [ '<%= paths.base %>/{,*/}*.html',
    });
```
 
[Yeoman](http://yeoman.io/) angular seed templates are rife with this and while it's not the end of the world, it's a bit annoying to try and initially figure what this is. Maybe I'm just dense. Using the raw vars just seems more natural, but I'll defer on this until I finish my review ;).

### Gulp

So gulp is really and truly code over config. In the way we initially defined our paths in code for grunt, your approach in gulp is the same, but you don't have the idea of the magical configuration initialization. So in gulp we go back to the our initial sane world of just defining a js obj which we'll leverage (via code) later.

```javascript
var coverageConfig = {
      base: '[somepath]/mybase',
      coverage: '[somepath]/mycoverage',
      report: '[somepath]/myreport',
    };
```    


So far: Gulp seems like our choice, but let's not get crazy and make calls just yet.

## Locating files to operate on, and operating on them.

So next up from our spec we want to:

```
 it should:
         find all *.js files, but not *.t.js file and not a list of specifc files on an ignore list
         find all *.js files, but not *.t.js file and not a list of specifc files on an ignore list
                         instrument all of these .js files with istanbul
```

Now is when we need to start thinking about tasks. Basically what we want to do here grab some files from base, instrument them, copy them somewhere else. So again, lets walk through how to do this with each tool.

### npm

In npm the way forward here would be to leverage your own scripts. So in this case, I would write a script using glob to iterate over the environment variable for my base directory, instrument the code with istanbul, derive a new path using the coverage directory environment variable and write the instrumented files there.

The upside here is that it's just node (or shell, or node+shell). The downside is it doesn't encourage a tone of modularity. But lets look at package.json:

```javascript
{
  "name": "code coverage tool",
  "version": "0.0.0",
  "description": "Do some magic, instrument code, watch for changes, create reports.",
  "main": "cover.js",
  "dependencies": {
    "bluebird": "~2.3.2",
    "escodegen": "~1.4.1",
    "esprima": "~1.2.2",
    "event-stream": "~3.1.7",
    "glob": "~4.0.6",
    "istanbul": "~0.3.2",
    "mkdirp": "~0.5.0",
    "safe-async": "~0.3.1",
    "shelljs": "~0.3.0",
    "string": "~2.1.0",
    "lodash": "~2.4.1",
    "grep1": "~0.0.5",
    "through": "~2.3.6",
    "split": "~0.3.0",
    "moment": "^2.8.3"
  },
  "devDependencies": {},
  "config":{
      base: '[mybasepath]',
      coverage: '[mybasepath_c]',
      report: '[mybasepath_r]'
  },
  "scripts": {
       "clean":"node clean.js",
       "instrument":"node instrument.js",
       "cleaninst":"node clean.js && node instrument.js"
  },
  "author": "Joe Mordetsky",
  "license": "None"
}
```

Where instrument.js + clean.js are simple proxies to tasks I've created:

instrument.js:
```javascript
require("./tasks/instrumentTask.js").go();
```

clean.js:
```javascript
require('./tasks/cleanTask.js').go();
```

The real work is done in these tasks, which I set up so that they'd be reusable across each environment.

*tasks/pathTask*
```
var path = require('path');
var jsGlob = process.env.npm_package_config_base + "/**/*.js";
var testGlob = process.env.npm_package_config_base + "/**/*.t.js";

exports.pathConfig = {
    srcGlob:jsGlob,
    testGlob:testGlob,
    srcPath:process.env.npm_package_config_base,
    coveragePath:process.env.npm_package_config_coverage,
    reportPath:process.env.npm_package_config_report
};
```

*tasks/instrumentTask.js*
```javascript
var glob = require("glob");
var istanbul = require("istanbul");
var _ = require("lodash");
var fs = require('fs');
var pathConfig = require('pathTask.js')

exports.go = function(){
    //find src files, instrument them and copy
    glob(pathConfig.srcGlob, function(err, files){
        //process file
        _.each(files, function(file){
            console.log("processing:", file);
            console.log("reading:", file);
            var src = fs.readFileSync(file).toString();
            var filename = path.basename(file)

            console.log("instrumenting:", file);
            src = instrument(src, filename);

            var newPath = path.join(pathConfig.coveragePath, file.replace(pathConfig.srcPath, ""));
            makeAndWrite(newPath, src);
        });
    });
}

function makeAndWrite(filePath, data){
    var dirName = path.dirname(filePath);
    mkdirpSync(dirName);
    fs.writeFileSync(filePath, data);
}

function instrument(src, name){
    var instrumenter = new istanbul.Instrumenter({
        debug: true,
        walkDebug: false,
        coverageVariable: '___cat_tracer___',
        codeGenerationOptions: undefined,
        noAutoWrap: true,
        noCompact: true,
        embedSource: true,
        preserveComments: true
    });

    return instrumenter.instrumentSync(src, name);

}

function mkdirpSync(dirname, mode) {
    var sep = path.sep;

    dirname.split(sep).reduce(function(currPath, segment) {
        currPath += sep + segment;
        try {
            currPath = fs.realpathSync(currPath);
        } catch(e) {
            fs.mkdirSync(currPath, mode);
        }
        return currPath;
    });
}
```

* tasks/cleanTask.js
```javascript
var fs = require('fs');
var pathConfig = require('pathTask.js')

exports.go=function(){
    deleteFolderRecursive(pathConfig.coveragePath);
}

function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};
```

Once this is wired up we can instrument our files with npm:

```
$ npm run cleaninst
> code_coverage_tool@0.0.1 cleaninst
> node clean.js && node instrument.js
```

Another benefit to this is that it's very debugger friendly. If I want to debug what is wrong with clean.js or instrument.js I can just run them from debugger. Granted this comes with the pain in the neck of setting those environment variables up.

The downside to this is that it realy feels like the onerous of all the boilerplate scripts (the instrument.js and the clean.js) is on me. But, sure we're forced to break out our scripts because we can't code in line, but as we proceed I get the feeling that this isn't ALL that different from a well architected grunt or gulp script. Here we could have minimized the amount of code we had to write by using istanbuls cli. 

### Grunt

Defining grunt tasks once you've read the documentation immediately provide some great benefits. First and foremost it immediately allows us to decouple our file matching from our task invocation. While you could do this in our npm implementation, you would really have to give it a think. That said, had you stopped to give it a think, you would probably have come up with something much less BYZANTINE then Grunts set up. Allow me to say here, that honestly, until you've sifted through the docs Grunt makes less then an ounce of sense. It sucks. Really. Once you've figured out "the grunt way" you get a lot for free, but it really wasn't free because you had to figure out the rube goldberg machine that is grunt.


Plugins - 
$ grunt clean
Running "clean:js" (clean) task
Warning: Cannot delete files outside the current working directory. Use --force to continue.

(not so) Amazing things:

this stops a task dead:
grunt.registerTask('clean', function(){
        console.log("cleaning...");
        throw new Error("noooooo");
        cleanTask.go(appConfig.coverage);
    });

this happily continues running:
grunt.registerTask('clean', function(){
        console.log("cleaning...");
        throw "noooooo"; 
        cleanTask.go(appConfig.coverage);
    });


also this doesn't do anything:

grunt.registerMultiTask('instrument', ['clean'], function(){
        //grunt.config.requires('instrument');
        var config = grunt.config('instrument');
        var files = grunt.file.expand(config.src);
        instrumentTask.go(files, appConfig.coverage, appConfig.base);
    });

You have to register a new task - which is pretty much like && in npm.

glob.sync is one line? What am I missing....?







