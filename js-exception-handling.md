# Exception + Error handling in javascript

The following will walk through the basics of exceptions and errors in javascript. Most of the article will go over the basics of structuring your code for errors in a sync/async world and go over some patterns and anti-patterns you should be aware of while writing js. I'm purposely NOT going to go into domains in this article as they're currently only available in node and I'd like this guide to be as generic as possible.

## I suppose the first thing you need to understand are basic problems with stack traces in js.

Look at this scenario:

This block of code:
```javascript
function a(){
    b();
}

function b(){
    c();
}

function c(){
    throw new Error("oh noes!");
}

a()
```

Will yield you a clear stack trace. You can see where things started (a) and where things went wrong (c). If you run this in node you will get:

```
Error: oh noes!
    at c (/Users/jmordetsky/j03mblog/js-exception-handling/syncstack.js:10:11)
    at b (/Users/jmordetsky/j03mblog/js-exception-handling/syncstack.js:6:5)
    at a (/Users/jmordetsky/j03mblog/js-exception-handling/syncstack.js:2:5)
    at Object.<anonymous> (/Users/jmordetsky/j03mblog/js-exception-handling/syncstack.js:13:1)
    at Module._compile (module.js:456:26)
    at Object.Module._extensions..js (module.js:474:10)
    at Module.load (module.js:356:32)
    at Function.Module._load (module.js:312:12)
    at Module.runMain [as _onTimeout] (module.js:497:10)
    at Timer.listOnTimeout [as ontimeout] (timers.js:110:15)
```

If this ends up in your log or console, you are a happy programmer. But, what happens when things get more complex and there are async contexts involved:

```javascript
function a(){
    b();
}

function b(){
    c();
}

function c() {
    setTimeout(function () {
        throw new Error("oh noes!");
    });
}


a();
```

When this code crashes, you get:

```
Error: oh noes!
    at null._onTimeout (C:\Users\jmordetsky\j03mblog\js-exception-handling\asyncstack.js:11:15)
    at Timer.listOnTimeout [as ontimeout] (timers.js:110:15)
```

And depending on the circumstances surrounding the error, your life may be less cheery as you try to track down where things went wrong. You don't have any feel for origination or end point. You just know that inside of a setTimeout, your code crashed. 

More over - you need to know that the code below is NOT a solution. It simply doesn't work in js:

```javascript
function a(){
    try{
        b();
    }catch(e){
        console.log(e);
    }
}

function b(){
    c();
}

function c() {
    setTimeout(function () {
        throw new Error("oh noes!");
    });
}


a();
```

## This makes error handling and the use of try/catch precarious in javascript

While there are valid cases for try/catch in javascript, they are few and far between. Generally if you're using try catch it should be in conjunction with a ECMA script that throws. Like JSON.parse:

```javascript
//When to use it? ecmascript functions that throw

    try{
            json = JSON.parse(input);
       }catch(e){
         //log and recover (or not)
         json= null;
       }
```

Using try/catch instead of using checks is a bad practice:

```
 try {
        
        target[key] = source[key];
        return true;
    }
    catch(e){
        return false;
    }
```    

### You might ask why? Well - first and foremost, try/catch is slow. 

Here is a jsperf illustrating the tax of using try/catch inside of a repetitive look: http://jsperf.com/try-catch-performance-overhead. While it will vary from runtime to runtime, Chrome on windows shows a 40% tax for using an uneeded try catch.

This is also a simple case where the exception condition never occurs. What happens if it did? Or if it did fairly regularly? Look at the results from this jsperf: http://jsperf.com/try-catch-vs-normal-check. Here that if the failure condition is hitting, (ie we're lazily using try/catch to validate input) we end up with nearly a 100% tax. While the try catch in the true condition adds mild overhead, the failure cases are massively expensive. There's no need to generate an exception here.  v8 also at the time of this writing won't try to optimize a function containing a try/catch.

### Secondly, try/catch tends to lead to a lot of error handling antipatterns
 
These fall into a few groups:

* Error masking anti-patterns
* Anti-patterns in our approach to error handling
* Anti-patterns around handling of exceptions in general. 

Before we discuss anti-patterns let's discuss how we should approach error handling aka:

### It is (mostly) better for your program to crash

Taking a page from joyent's excellent guide on exceptions in node https://www.joyent.com/developers/node/design/errors, it helps to thing about errors in two categories: (and this is generally, not just in js)

    * Operational Problems
    * Programmer Errors

Operational problems are things that could/might go wrong with your program, that are generally outside of the program's control, that you as a programmer need to think through and handle. There are generally many more of these 'things' in a server side environment, but the client isn't without it's fair share. For example, on the server it could be running out some resource on the client you could make a network request to a service and you fail to connect. These are generally not bugs in your code. They a problems with the system at large that your code is a part of.

Programmer errors are when you as a programmer have made a mistake and this has lead to undesirable behavior. For example a logic error or perhaps failing to handle a common operational problem. These are generally what we consider bugs (though not handling an operational error may look like a bug). 

You absolutely MUST think through, understand and handle your programs potential operational problem's, your error handling should be structured to deal with these problems. In some cases you will attempt to recover/retry from these errors. In other cases, the issues will be irrecoverable and your program should crash. 

On the other hand - you should absolutely NOT try to handle, recover or retry from programmer errors. A programmer or logic error has left your program in unknown state, you can't possibly know what it is and as such you should crash. At most you should attempt to dump information about error to log before crashing.

There is a great line in the joyent article that reads: "If you don't know what errors can happen or don't know what they mean, then your program cannot be correct except by accident." which is a way of saying, you need to understand the system your program operates in, what could go wrong and what you're responsible for handling. In a server side environment this can get very complex. In a client side environment, we're lucky in that a lot of what we'll be dealing with are service + resource requests. 
 
All of this being said hopefully you're now convinced that broad blanket error handlers are generally a bad idea. and that this is not an acceptable approach to error handling in javascript (even if your code is sync):

```javascript
try{
   dosomething();
}catch(ex){
   console.log("failed to do something: ", ex);
}
```

## Okay so back to anti-patterns 

### Let's tackle error masking anti-pattern first

In javascript an exception is an exception is an exception and try will swallow them all and serve them up to you via catch. By adding a try catch to your code you may be inadvertently creating a higher level error handler then you think. This leads to in the best case, some developer frustration before its discovered. In the worst case it leads to incredibly hard to track errors or inconsistent behavior. For a easy way to see this put this code into node:

```javascript
try{
    var b = a;
    console.log(b);
}catch(e){
    console.log(e);
}
```

That should yield you:

```
[ReferenceError: a is not defined]
```

So here, congrats, your try/catch just essentially caught and logged a syntax error that shouldn't have run at all. This may not seem like a big deal but consider a similar example:

```javascript
try{
    var b = modulea().foo();;
    console.log(b);
}catch(e){
    console.log(e);
}
```

Here we invoke modulea.foo();. Which let's say hypothetically calls moduleb.foo(), modulec.foo() and moduled.foo(). If you're a programmer working on 'moduled' and you're using this code to run your work, are all of your syntax errors in foo now being propogated up to main call?  Worse, if this is your caller do you have to consider that any and all of your errors are going to be swallowed and logged by this code? What if someone did this midstream? What if our code above is actually in moduleb? At this point the error has been completely and inadvertently swallowed. If this has happened to you as a developer working on a large program, you recognize that it is in fact, rage-inducing. 

### Anti-patterns in our approach to error handling

This is a broad topic and we covered a bit of it above. So here I'll touch on some basics.

#### Using throw when you don't have to

Since we've just put the use of try/catch through the ringer, why you should question liberal use of throw should be obvious. If we assume that try/catch isn't being used in all but a few select scenarios then it would logically follow that explicit use of throw is a way for your program to say "we can't recover from this, crash.". Throw delivers an error synchronously and we've listed some of the problesm with this approach.  Instead consider one of the following:

* Return an error obj - return 
```
return new Error('a thing when wrong');
```

* Return an error in a node style callback 

Consider this code:

```
function anAsyncAction(data, cb){
    if (!cb){
        throw new Error("anAsyncAction requires a valid callback");
    }else{
        //do an thing
        doAsyncThing(data, function(err, res){
            //do some more thing
            cb(err, res);
        });
        
    }
}
```
You'll notice I'm using throw here as well.  The Joyent article referenced above mentions that the exception to this general rule is probably when you encounter an irrecoverable programmer error at the time of a call to your function that will be harder to track down later. For these types of errors, throw right away. I was on the fence about this for a while, but I've come around. Here, if cb was undefined we would end up with a crash inside of the doAsyncThing callback anyway. Here it is generally better to just crash via a throw. Otherwise we deliver err to the call back.

* Use an event emitter 

todo - this requires a bit more research on my end for environments outside of nodejs - I will follow up.

* Use a promise

This is the avenue I recommend the most. Leveraging functions like Bluebird's promisify allows us to receive promises from modules we're using lets us elegantly express error conditions:

```javascript
var asyncActionP = Promise.promisify(anAsyncAction);
var promise = asyncActionP(data);
promise.then(function(res){
    console.log('yay');
}).error(function(err){
    console.log('expected promise rejection case', err);
}).catch(HTTPError, function(err){
      console.log('Expected promise error, retry', err);
      //retry asyncAction
}).catch(function(err){
    console.log('unexpected promise error', err);
    //crash
    throw err;
});
```

This code makes me happy. Depending on the library you use it's very fast (see [https://github.com/petkaantonov/bluebird]Bluebird's benchmarks), it is as expressive as try/catch and allows you to target specific error conditions, it handles async as elegantly as can be expected without domains + handles sync conditions via the same semantic. 

#### Using primitives instead of error objects

A very easy demonstration of why you shouldn't do this can be seen by running the following in node:

```
throw "hi";
```

Which yields you the very informative error statement of:

```
> throw 'hi';
hi
```

Compared to:

```
throw new Error("hi");
```

Which yields:

```
> throw new Error("hi");
Error: hi
    at repl:1:7
    at REPLServer.self.eval (repl.js:110:21)
    at repl.js:249:20
    at REPLServer.self.eval (repl.js:122:7)
    at Interface.<anonymous> (repl.js:239:12)
    at Interface.EventEmitter.emit (events.js:95:17)
    at Interface._onLine (readline.js:202:10)
    at Interface._line (readline.js:531:8)
    at Interface._ttyWrite (readline.js:760:14)
    at ReadStream.onkeypress (readline.js:99:10)
```

If that doesn't convince you, don't take my word for it - consider from the author of Bluebird promises who boasts an impressive [http://stackoverflow.com/users/995876/esailija] 76.4k stack overflow score:

```
Danger: The JavaScript language allows throwing primitive values like strings. Throwing primitives can lead to worse or no stack traces. Primitives are not exceptions. You should consider always throwing Error objects when handling exceptions.
```

Indeed, primitives are not exceptions and using them in such a way reduces interoperability between modules. Modules using instanceof Error checks or want to access useful properties of the error like .stack will break in strange ways. More on the subject here: http://www.devthought.com/2011/12/22/a-string-is-not-an-error/

Use of stack illustrated here:
```
> try{ throw "hi";}catch(e){console.log(e.stack);}
undefined
undefined

>  try{ throw new Error("hi");}catch(e){console.log(e.stack);}
Error: hi
    at repl:1:12
    at REPLServer.self.eval (repl.js:110:21)
    at repl.js:249:20
    at REPLServer.self.eval (repl.js:122:7)
    at Interface.<anonymous> (repl.js:239:12)
    at Interface.EventEmitter.emit (events.js:95:17)
    at Interface._onLine (readline.js:202:10)
    at Interface._line (readline.js:531:8)
    at Interface._ttyWrite (readline.js:760:14)
    at ReadStream.onkeypress (readline.js:99:10)
```

An even better approach is to consider wrapping errors and/or extending your own error types that you can check for via instanceof. This is useful when using promises patterns. Here is an example from Bluebird.js where they define an OperationalError (previously RejectionError).

```javascript
function OperationalError(message) {
    this.name = "OperationalError";
    this.message = message;
    this.cause = message;
    this[OPERATIONAL_ERROR_KEY] = true;

    if (message instanceof Error) {
        this.message = message.message;
        this.stack = message.stack;
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }
}
```
Here you can see they check if the supplied input is itself an Error object with a stack trace. Otherwise it assumes primitive and captures it's own stacktrace. This is a good pattern for wrapping errors. 
In addition, doing something like this allow for cases down the line where you can use instanceof to check error types and react accordingly:

```javascript
   if (e instanceof MyError){
      //dump stack, retry
      console.log("MyError:", e.stack);
      doRetry();
   }else{
      throw e; //We don't know what this is, crash.
   }
```

### Anti-patterns around handling of exceptions in general. 

This will probably be the longest section as I'll walk through some of the bad things I've seen in production code and explain a bit why it causes problems. 

#### Swallowing and or ignoring errors

By far the most flagrantly terrible thing you can do your code is recognize that a function you're working with HAS an error case and then broadly ignoring what comes out of it. We touched on this in error swallowing using try/catch but it is just as easy to do something as horrible with node-style callbacks or promises that leaves you and your fellow engineers troubleshooting for days. 

Terrible - With try catch:

```javascript
doSomething();
try{
    doSomethingDicey();
}catch(e){
}
doSomethingElse();
```

Terrible - With callbacks:
```javascript
doSomething(data, function(err, res){
    if (err){
        //i don't care
    }else{
    
    }
});
```

Terrible - With promises:

```
promsise.then(function(res){
    //success!!
}).catch(function(err){}); 

```

In all of these cases you are swallowing errors that will never see the light of day. You may justify this to yourself in saying, I know I don't care about this error or this is a non-critical call and those things may be true. But you will kick yourself down the line when it turns out your assumptions were false and you'll inadvertently make another dev's life harder while they're trying to work because of the way javascript handles reference errors. At the very least - log the error so you know.

#### Using try/catch to avoid 'knowing' what could go wrong

I've seen this a fair amount of times in javascript:

```javascript
function(obj){
    try{
        return obj.prop1.prop2.prop3;
    }catch(e){
        return undefined;
    }
}
```

Generally, we mentioned that this caries a performance penalty especially in the failure case. In addition - it allows for obj to be malformed in all sorts of creative ways. Use a check instead.

#### Not logging data before 'handling' an error

Sometimes I've seen cases in sync or async code where an error occurs and the developer wants to inform the user in some way. For example:

```javascript

    getData(function(err, res){
        if (err){
            showUserError();
        }else{
            showUI();
        }
    });

```

Which is generally okay, save for the fact that no one seems to be keeping track of 'err'. It's fine to tie things up for the end user, but be sure the error you received 'can be tied up' in the way you think and at the very least track/log the error so you can figure out what happened (or even that something happened at all!). This can happen with promises as well if you ignore the output of a catch and in server side code where you receive an error and return something line 500 to the caller without logging the cause. 

#### Assuming an Error is a primitive

Here we assume an error is a primitive and attach it to log message, thus any useable data like a stack trace is lost.

```javascript
function handleError(error){
    SomeLogger.log("An error ocurred: " + error);
}

promise.then(function(res){
    //..
}).catch(function(err){
    handleError(err);
});
```

To see this easily illustrated try:

```
$ node
> var e = new Error('hi');
undefined
> console.log('error:'+e);
error:Error: hi
undefined
```
Any stack we might have gotten via 'e' is lost once it is treated as a string. If logging a primitive is a must, at least grab the stack! console.log('error:'+e.stack);


#### Using the same error handlers for rejection vs error in promises - aka BE CAREFUL with CATCH because well its CATCH

When using promises, you probably are going to want to handle unforseen problems differently then any and all errors. As such, I tend to forgo the use of .catch at all and allow my program to crash if an unknown error occurs. But if in theory you have thought out your promise rejection cases, then passing any and all errors into the same case is probably a bad idea. As such things like I've illustrated below is probably not the best idea. A better idea is to handle your rejection cases explicitly and funnel unknowns or specific error types somewhere else (.catch or .catch(ErrorType). I guess the excusable case would be if handleError was checking for specific error types via instanceof, but promises do that for you and they're more readable, so use them.

```javascript
promise.then(function(res){
    //..
}).catch(function(err){
    handleError(err);
});
```

or

```javascript
promise.then(function(res){
    //..
}).error(function(err){
    handleError(err);             
}).catch(function(err){
    handleError(err);
});
```

Here is a very concrete example of why you shouldn't use catch:

```javascript
var Promise = require('bluebird');
var fs = require('fs');
function readFileWrapper(file, cb){
    console.log("reading:", file);
    console.log(a);
    if (!cb){
        throw new Error("Call back required.");
    }
    fs.readFile(file,cb);
}
 
var readFileP = Promise.promisify(readFileWrapper);
var p = readFileP('require.js');
p.then(function(data){
    console.log(data);
}).error(function(err){
    console.log('rejected:', err);
}).catch(function(err){
   console.log('boom:', err);
});
```

If you were to run this code, you will get:
```
reading: require.js
boom: [ReferenceError: a is not defined]
```

Again congrats, as we demonstrated above with try/catch your code just caught and continued in the face of a syntax error. Catch is promises exists for the same reason that catch in try/catch exists. It captures any and all errors it can possibly catch. It also like, try/catch cannot catch rogue async errors (see Promise aggregation and async errors with Bluebird). As such .catch in promises is JUST as dangerous as catch in try/catch. If you want to handle rejections, use .error instead. Note, when the console.log(a); ReferenceError is removed from the above code, you get a reference error for reject-able expected operational failure cases: 

```javascript
rejected: { name: 'OperationalError',
  message: 'ENOENT, open \'\\scratchboard\\require.js\'',
  cause:
   { [Error: ENOENT, open '\\scratchboard\require.js']
     errno: 34,
     code: 'ENOENT',
     path: '\\scratchboard\\require.js' },
  stack: 'Error: ENOENT, open \'\\scratchboard\\require.js\'' }
 ```

Note if you remove the .catch clause from the code but leave console.log(a) in, the code will crash, which is what we want as this is a programmer, NOT an operational error.
