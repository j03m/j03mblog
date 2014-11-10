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

Will yield you a nice clear stack trace. You can see where things started (a) and where things went wrong (c). If you run this in node you will get:

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

If this ends up in your log or console, you're a happy programmer. But, what happens when things get more complex and there are async context's involved:

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

And depending on the circumstances surrounding the error, your life may be less cheery as you try to track down where things went wrong. You don't have any feel for origination or end point. You just know that inside of a setTimeout - code crashed. 

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

Why not? 


## There is a difference between Error and Exception. You can THROW anything. But you should only throw Objects. Specifically, you should probably only throw errors.

Theses are all exceptions:

```javascript
throw 1;
throw "omg no help";
```

All of these are errors:
```javascript
var e = new Error();
var e = new Error(1);
var e = new Error("omg no help");
```

Arguably, if you use throw you should be throwing Errors.
```javascript
throw new Error("omg help!");
```


* If you are using try/catch you really need a good reason.

Unlike other languages, there is very little reason to use try/catch is javascript. The rule of thumb is that unless its some external validation function. Like JSON.parse.

* It helps to thing about errors in two categories

    Operational Problems with correct programs  - try/catch is okay but ill advised, your program should know and handle the operational errors it needs to deal with or it should crash
    Programmer Errors - ie, bugs in the program - you should never attempt to patch these with try/catch as you leave your program in an unknown state. The best case scenario here is potentially for a log and crash.
* Approach to handling errors
    
    retry - how often? how many times? Exponential back off. be careful. Client retry->worker retry->service retry->db failure
    propogate- most likley, if you know this issue isn't going to fix itself any time soon propogate, crash. 
    blow up - aka log and crash. "This can't happen, so log and crash"
    log and carry on - okay, but - be sure
    
    don't try to handle programmer errors - you can't really know the state of the program after a developer error has happened. As such, you can't recover. You must crash.
    
    
    //don't be this person:
    var somelib = {
        somefunc:function(){
            console.log(xyz);
        }
    };
    
    try{
        somelib.somefunc();
    }catch(e){
        console.log(e);
    }
    //this produces: [ReferenceError: xyz is not defined]
    //and is completely useless.
    
    
    
    Just let it crash:
    ReferenceError: xyz is not defined
        at Object.somelib.somefunc (repl:3:13)
        at repl:1:9
        at REPLServer.self.eval (repl.js:110:21)
        at repl.js:249:20
        at REPLServer.self.eval (repl.js:122:7)
        at Interface.<anonymous> (repl.js:239:12)
        at Interface.EventEmitter.emit (events.js:95:17)
        at Interface._onLine (readline.js:202:10)
        at Interface._line (readline.js:531:8)
        at Interface._ttyWrite (readline.js:760:14)
    
    Even this:
    
    try {
      JSON.parse(undefined)
    } catch (er) {
      console.error('Invalid JSON', er)
    }
    Invalid JSON [SyntaxError: Unexpected token u]
  
    ^ This is totally useless.
      JSON.parse(undefined)
      

    any attempt to recover should be limited to log/crash - ie a last ditch effort to say good bye

* Getting errors back to your callers
    
    > If you don't know what errors can happen or don't know what they mean, then your program cannot be correct except by accident. 

    * What can happen when I call a worker?
    * What can happen with a client component?
    * DMP?

    * callbacks - use a node style callback callback(err, result) pass new Error() to the callback
    
    * promises - use a promise driven api, fail the promise and pass an error that way
    
    * events - 'error' events - complex objects with lots of statefulness should use this pattern. Example socket.

    Most common: Operation error in async - callback/promise
    Complex stateful - event emitter
    
    Use callbacks and return codes where possible - If I can deliver an operation error asynchronously and synchronously - only use the callback/promise. Don't mix methods.
    In our world, your consumer should NEVER need to use try catch. Ever.
    When is it okay for your module to throw? - For programmer errors that are irrecoverable - for example I invoke your function and fail to supply a callback - throw synchronously.
    
    
    It's generally understood that if a "unknown/uncaught" exception occurs in your code the program *should* crash. However, this also assumes that after the crash you have some mechanism of determine where and how the failure occurred and can thereby get enough information to correct it. In the case of our async crash, that is much more difficult. So the focus of this article will be:

    General JS Stuff:
    * How to structure your code maximize the tracability of a crash
    * When and how to use try/catch, when not to

    Rplus JS Stuff:
    x How do these things apply to workers?
    x Long stack trace, enable in promises, grab manually
    x wrapping is okay if - the original error is unchanged. how to wrap?

    http://jsperf.com/long-stacks3/edit

    Show off - a programmer error eaten by a try/catch

/* Basics:
    Sync code - return the error
    Async Error - return a code
    Eventful code - use an event emitter
*/

