# jotting down some notes on the spyjs web source code here

Uses esprima to parse a given file an instruments
instrumented code before and afer looks like this:

Before:
```javascript
makeGuid = function(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });

}
```


```javascript
{
    __p.i('10,18,0,0,S,[p]:');
    makeGuid = function () {
      try {
        __p.f('10,16,11,1,FS,makeGuid', arguments);
        return __p.r('11,14,4,7,R,makeGuid', 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          try {
            __p.f('11,14,67,5,FS,[a]:0;11,11,76,77,c', arguments);
            {
              __p.i('12,12,8,67,S,[a]:0');
              var r = Math.random() * 16 | 0, v = c == 'x' ? (__p.i('12,12,51,52,CDC,[a]:0'), r) : (__p.i('12,12,56,65,CDA,[a]:0'), r & 3 | 8);
            }
            return __p.r('13,13,8,30,R,[a]:0', v.toString(16));
          } catch (__ex) {
            __p.e(__ex);
            throw __ex;
          } finally {
            __p.fe('11,14,67,5,FE,[a]:0');
          }
        }));
      } catch (__ex) {
        __p.e(__ex);
        throw __ex;
      } finally {
        __p.fe('10,16,11,1,FE,makeGuid');
      }
    };
  }
```

Where __p is defined in public/instrument.js and attached to global

lib/instrument.js is responsible for the actual instrumentation.

__.p.i === instruction
__.p.f === function start
__.p.r === return
__.p.e === exception
__.p.fe === function end


As of now I'm mostly interested in __.p.f. Looking at instrument.js I've commented some understaind thus far:

```javascript

//a is some crazy cryptic string like '10,16,11,1,FS,makeGuid
//b is the function arguments. 
f: function(a, b) {
            if (global.__p.limits) {  //check limits, not sure what this is
                var c = []; //args post prep
                b = b || [];
                for (var d in b) c.push(prepareObj(b[d], 0));
                global.__p.i(a, c); // call instruction pass a and prepped args
            } else global.__p.i(a); //else call .i raw
            stackDepth++; //inc stack dea
        },
