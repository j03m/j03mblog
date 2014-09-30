# The anatomy of the v8 tick log

This article serves as a sort of treasure map of sorts as I've found myself going through the internals of the v8 profiler for the second time and being that my memory is slowly degenerating into a heap of dung, I thought I'd document some of it this time around so that on spin #3 i don't feel like I'm starting from scratch :/. Hopefully this helps someone else too. Note this doc is currently still a Work in Progress as such, some of the statements may thus far be untrue and should be considered my personal notes until this message is removed and we can consider everything verified.

If you've ever tried to use --prof with node you've quite possibly noticed that when you run node with the --prof flag it creates a (not so) little file called v8.log in the directory of the script you've run. If you've never done with before, well then go have a bit fun quick and do:

```
node somescriptthatdoesanythingitdoesntmatter.js; cat v8.log
```
And so there you have it. The magical v8.log file. It's filled with really useful data like:

```
$ head v8.log
shared-library,"C:\Program Files\nodejs\node.exe",0x3fd60000,0x40409000
shared-library,"C:\WINDOWS\SYSTEM32\ntdll.dll",0x77180000,0x7732a000
shared-library,"C:\WINDOWS\system32\kernel32.dll",0x76da0000,0x76ebf000
shared-library,"C:\WINDOWS\system32\KERNELBASE.dll",0xfd6d0000,0xfd73b000
shared-library,"C:\WINDOWS\system32\WS2_32.dll",0xfe0d0000,0xfe11d000
shared-library,"C:\WINDOWS\system32\msvcrt.dll",0xff230000,0xff2cf000
shared-library,"C:\WINDOWS\system32\RPCRT4.dll",0xfd9b0000,0xfdadd000
shared-library,"C:\WINDOWS\system32\NSI.dll",0xfeff0000,0xfeff8000
shared-library,"C:\WINDOWS\system32\USER32.dll",0x76ca0000,0x76d9a000
shared-library,"C:\WINDOWS\system32\GDI32.dll",0xff2d0000,0xff337000
```

and of course this:

```
$ tail v8.log
tick,0x771d197a,0x1ce778,0,0x0,5
tick,0x771d197a,0x1ce778,0,0x0,5
tick,0x771d197a,0x1ce778,0,0x0,5
tick,0x13ff2105d,0x1cec70,0,0x1,4,0xb3776944,0xb377bfb4,0xb34ee7a5,0xb34ef6ac,0xb34ef0f6,0xb34ed3df,0xb3776eb2
tick,0x771d197a,0x1ce778,0,0x0,5
code-creation,StoreIC,0xb383f2a0,185,"needDrain"
code-creation,StoreIC,0xb383f2a0,185,"needDrain"
code-creation,LoadIC,0xb383f360,138,"_events"
code-creation,LoadIC,0xb383f360,138,"_events"
profiler,"end"
```

Hmmm. Okay....and there you go your app is profiled! Tada! :/  Okay kidding aside, while it may be difficult to digest in raw form, trust me, this dump does have everything you need - we just need to know how to process it. Luckily, we're not quite left hanging. The v8 source includes a sample set of javascripts under /tools that teach us how to interpret the tick log and transform it into consumable data. Even better, a nice person named [Andrey Sidorov](https://github.com/sidorares) was nice enough to give us [node-tick](https://github.com/sidorares/node-tick) which is a similar implementation in node. You could use the v8 scripts but I would imagine most of us are already set up to debug/run/dothings with node and building v8's command line program (d8) is surmountable, but unnecessary. So, we'll use node-tick's src instead as its readily available, seems to work and has node-ified enough stuff that I found it easier to digest.

Either the v8 scripts or node-tick will give you the same output which crunches all of ticks and produces sumarrized version similar to:

```
  Note: callees occupying less than 0.1% are not shown.

  inclusive      self           name
  ticks   total  ticks   total
    868   61.2%      1    0.1%  Function: listOnTimeout timers.js:77
    867   61.1%      0    0.0%    Function: ~Module.runMain module.js:495
    867   61.1%      0    0.0%      Function: Module._load module.js:275
    836   59.0%      0    0.0%        Function: ~Module.load module.js:346
    835   58.9%      0    0.0%          Function: ~Module._extensions..js module.js:472
    834   58.8%      0    0.0%            Function: ~Module._compile module.js:374
```

That is all well and good, but what else can we do? What else lives in the mysterious v8.log file and what else can we do with it? I started asking this question for various reasons and decided to dig into the processor code to iron out exactly what is going on.

For me the magic really got started in logreader.js. Basically up until this point, v8.log was being injested and parsed as lines of csv (simple enough). But here, we start to see the concept of a dispatch table. Which is using the first field of each line of the csv as a way to instruct the program how to parse the other columns of the csv. I'm looking at dispatchLogRow_ in logreader.js:

```javascript
LogReader.prototype.dispatchLogRow_ = function(fields) {
  // Obtain the dispatch.
  var command = fields[0];
  if (!(command in this.dispatchTable_)) return;

  var dispatch = this.dispatchTable_[command];

  if (dispatch === null || this.skipDispatch(dispatch)) {
    return;
  }

  // Parse fields.
  var parsedFields = [];
  for (var i = 0; i < dispatch.parsers.length; ++i) {
    var parser = dispatch.parsers[i];
    if (parser === null) {
      parsedFields.push(fields[1 + i]);
    } else if (typeof parser == 'function') {
      parsedFields.push(parser(fields[1 + i]));
    } else {
      // var-args
      parsedFields.push(fields.slice(1 + i));
      break;
    }
  }

  // Run the processor.
  dispatch.processor.apply(this, parsedFields);
};
```

Dumping the contents of the dispatch table lets us get an understanding of what kinds of commands might live in v8.log:


```
var data = {
    "shared-library": {"parsers": [null, null, null]}
    ,"code-creation": {"parsers": [null, null, null, null,"var-args"]}
    ,"code-move": {"parsers": [null, null]}
    ,"code-delete": {"parsers": [null]}
    ,"sfi-move": {"parsers": [null, null]}
    ,"snapshot-pos": {"parsers": [null, null]}
    ,"tick": {"parsers": [null, null, null, null, null,"var-args"]}
    ,"heap-sample-begin": {"parsers": [null, null, null]}
    ,"heap-sample-end": {"parsers": [null, null]}
    ,"profiler": null
    ,"function-creation": null
    ,"function-move": null
    ,"function-delete": null
    ,"heap-sample-item": null
    ,"code-allocate": null
    ,"begin-code-region": null
    ,"end-code-region": null
};
```
Where because I JSON.stringified it, most of those nulls were actually parser functions. The dispatch table gets set via a caller supplied param which actually comes from the implementation of TickProcessor (in tickprocessor.js). So event better, we can see the full definition there, functions in tact:

```
 LogReader.call(this, {
      'shared-library': { parsers: [null, parseInt, parseInt],
          processor: this.processSharedLibrary },
      'code-creation': {
          parsers: [null, parseInt, parseInt, null, 'var-args'],
          processor: this.processCodeCreation },
      'code-move': { parsers: [parseInt, parseInt],
          processor: this.processCodeMove },
      'code-delete': { parsers: [parseInt],
          processor: this.processCodeDelete },
      'sfi-move': { parsers: [parseInt, parseInt],
          processor: this.processFunctionMove },
      'snapshot-pos': { parsers: [parseInt, parseInt],
          processor: this.processSnapshotPosition },
      'tick': {
          parsers: [parseInt, parseInt, parseInt,
                    parseInt, parseInt, 'var-args'],
          processor: this.processTick },
      'heap-sample-begin': { parsers: [null, null, parseInt],
          processor: this.processHeapSampleBegin },
      'heap-sample-end': { parsers: [null, null],
          processor: this.processHeapSampleEnd },
      // Ignored events.
      'profiler': null,
      'function-creation': null,
      'function-move': null,
      'function-delete': null,
      'heap-sample-item': null,
      // Obsolete row types.
      'code-allocate': null,
      'begin-code-region': null,
      'end-code-region': null });
```

So, now we can see that each field (+1 to skip the command) is assigned a function for parsing (or null) and a processor. Then the dispatcher is selected based on the command (aka the first column value), the fields are parsed (if non-null) and captured, and last the processor is called with 'this' as a context and passed the parsed fields as a parameter (via apply).

Uh but what do the commands do?

### shared-library

Not 100% - but this captures native code invokations, or maybe load? For example as I debug this I'm looking at an entry for node.exe with start + ending addresses. I'm not that interested in this, so I'll circle back.

### code-creation

This is an important one (or it is to me right now). This seems to capture the act of creating executable code from your js. What is important about this is that as the code is created v8 will map it by address internally with calls to addFuncCode/addFuncCode in profiler.js. Ie, the processor for code-creation (processCodeCreation), invokes addFuncCode or addCode on the internal variable this.profile_ (which is an instance of V8Profile, which inherits from Profile defined in profile.js). AddCoce/AddFuncCode. All of these bits of code are added to Profiler's internal .codeMap_ whih is an instance of CodeMap from codemap.js. CodeMap contains a bunch of [splaytrees](http://en.wikipedia.org/wiki/Splay_tree) which are going to contain all sorts of data about or javascript and then a bunch of helper functions for interpreting and transforming that data. (I think, note to self come back and brush this up...if youre reading this I didn't proof read very well).

```javascript
TickProcessor.prototype.processCodeCreation = function(
    type, start, size, name, maybe_func) {
  name = this.deserializedEntriesNames_[start] || name;
  if (maybe_func.length) {
    var funcAddr = parseInt(maybe_func[0]);
    var state = parseState(maybe_func[1]);
    this.profile_.addFuncCode(type, name, start, size, funcAddr, state);
  } else {
    this.profile_.addCode(type, name, start, size);
  }
};
```

### code-move



### code-delete

### sfi-move

### snapshot-pos

### tick

The most important one. Tick represents time executing code we built during code-creation. This command gets handled by processTick, so lets spend some extra time talking about parameters. The fields parsed for this command are:

* pc - Program counter (address of the current instruction)

* sp - Stack pointer (quite possibly always 0 in my experiments)

* is_external_callback - a flag that tells us if this is a callback (I think)

* tos_or_external_callback - the address of the callback(?)

* vmState - corresponds to values defined in VmStates and seem to indicate the state of virtual machine (ahem, vm+states anyone?) at the time the tick was logged. These are apparently javascript (0), garbage collection (1), compilation (2), other (3) and external (3). I don't actually know what other + external signify.

* stack - stack of calls thus far (appears to always be empty during my experiements)

In order to get indepth into what is happening in this function, I'm going to discuss each line of code in process tick.

First things first - We increment our total ticks and if the vmstate is garbage collecting, we increment the number of ticks for garbage collection. This is so that we can show total % of time spent garbage collecting later. Then we call includeTick. This seems to just check an internal variable stateFilter_ === our current vmstate or is set to null. It looks like you can set this value via TickProcessor's constructor which could be useful if you want to filter out specific states.

```javascript
TickProcessor.prototype.processTick = function(pc,
                                               sp,
                                               is_external_callback,
                                               tos_or_external_callback,
                                               vmState,
                                               stack) {
  this.ticks_.total++;
  if (vmState == TickProcessor.VmStates.GC) this.ticks_.gc++;
  if (!this.includeTick(vmState)) {
    this.ticks_.excluded++;
    return;
  }
```


Next we determine the type of callback. I'm not sure what this does.
```javascript
  if (is_external_callback) {
    // Don't use PC when in external callback code, as it can point
    // inside callback's code, and we will erroneously report
    // that a callback calls itself. Instead we use tos_or_external_callback,
    // as simply resetting PC will produce unaccounted ticks.
    pc = tos_or_external_callback;
    tos_or_external_callback = 0;
  } else if (tos_or_external_callback) {
    // Find out, if top of stack was pointing inside a JS function
    // meaning that we have encountered a frameless invocation.
    var funcEntry = this.profile_.findEntry(tos_or_external_callback);
    if (!funcEntry || !funcEntry.isJSFunction || !funcEntry.isJSFunction()) {
      tos_or_external_callback = 0;
    }
  }
```

Then a call to processStack and recordTick. ProcessStack appears to append the prior function call and this call to the current stack and return it. RecordTick basically processing the stack of addresses against the codemap we built. If an address is found, an entry is retrieved and used in our report. If the pc is unknown it's counted as an "unaccounted" tick.  You can see unaccounted ticks at the top of your report:

```
statistical profiling result from c:/blp/rplus/bbcode/scratchboard/v8.log, (1418 ticks, 500 unaccounted, 0 excluded).

[Unknown]:
   ticks  total  nonlib   name
    500   35.3%

```

The end result of finding code in the maps is an expanded set of strings in exchange for addresses. The array is added to two trees in our Profile. The profile consists of a bottomUpTree and topDownTree pair of CallTrees and our codeMap.  RecordTick essentially tries to find the call path on both trees (reversing first for the top down tree) and increments the ticks on a given node.

For example, if you were to add a console.log to recoredTick to dump the contents of processedStack you would see things like:

```
[ 'C:\\WINDOWS\\SYSTEM32\\ntdll.dll',
  'Function: ~<anonymous> C:\\blp\\rplus\\bbcode\\scratchboard\\nodetickgen.js:1',
  'Function: ~Module._compile module.js:374',
  'Function: ~Module._extensions..js module.js:472',
  'Function: ~Module.load module.js:346',
  'Function: Module._load module.js:275',
  'Function: ~Module.runMain module.js:495',
  'Function: listOnTimeout timers.js:77' ]
```

The CallTree class is defined in profile.js (as is profile) and is a [call graph](http://en.wikipedia.org/wiki/Call_graph)

```javascript
  this.profile_.recordTick(this.processStack(pc, tos_or_external_callback, stack));
};
```


### heap-sample-begin

### heap-sample-end

## Next up - generating our own mock logs.

Hmmm. I wonder if a v8 test does this already. Hawt.

To be continued.








