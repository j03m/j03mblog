js_closures_and_references_and_loops
==============================

I've generally gotten two questions that are inter-related enough with enough frequency that it probably warranted a review.

They are:

1 - Why does jshint scold me for creating functions within a loop?

2 - Why do the functions I use in this loop not seem to have the correct values?

Answer to some extent is that jshint is trying to protect you from #2 (although there are other reasons).

So, lets look at some code:

```javascript
//sync
for(var i=0;i<10;i++){
    console.log("sync i==",i);
}


//async
for(var i=0;i<10;i++){
		setTimeout(function(){
			console.log("i==",i);
		}, 0);
}
```

Before we do anything, if we run jshint over this code we can see it's not happy about our creation of a function in the second loop.

```
jshint simpleloop.js
simpleloop.js: line 11, col 10, Don't make functions within a loop.

1 error
```

Then, if you run this in node and you're new to javascript you might be surprised by the async output.

```
$ node simpleloop.js
sync i== 0
sync i== 1
sync i== 2
sync i== 3
sync i== 4
sync i== 5
sync i== 6
sync i== 7
sync i== 8
sync i== 9
i== 10
i== 10
i== 10
i== 10
i== 10
i== 10
i== 10
i== 10
i== 10
i== 10
```

So what happened? In our synchronous code, our iterator is evaluated right away. However, in our async version the execution of the function is delayed until later. Functions in javascript have access to the outter scope they're invoked in, so our setTimeout function can see 'i' but it has a reference to 'i' not to 'i' values.

Since setTimeout even with a value of 0 milliseconds for it's second parameter is execute only after the current synchronous execution completes  i==10 for all of setTimeout's values.

 I've seen this without folks trying to create some generic event handlers that have access to a piece of data. For example:

```javascript

for(var i =0;i<obj.length;i++){
     thing[i].on('event', function(){
        console.log("my data:", obj[i];
     });
}
```

This fails for the same reason as described above. To get around this, we can save scope by creating an additional closure via via an immediately invoked function:

```javascript
for(var i =0;i<10;i++){
	(function(value){
		setTimeout(function(){
			console.log(value);
		},0);
	})(i);
}
```

This will yield the values we expected, because when the immediately invoked function is called the "value" of i is saved in our parameter 'value'. Ie, setTimeout's reference is no longer to i, it's value and value isn't changing even if reference 'i' has is.

Another way you'll see this happen might be like:

```javascript
for(var i =0;i<10;i++){
    setTimeout(function(value){
        return function(){
               console.log(value);
        };
    }(i),0);
}
```

Here, rather we invoke function which returns a function to setTimeout. The result of doing this is that the value of i is still captured in a closure via the parameter value. Thus the code still works.

But jshint still isn't happy. Harumph.

```javascript
$ jshint closuredLoop.js
closuredLoop.js: line 6, col 6, Don't make functions within a loop.
closuredLoop.js: line 15, col 6, Don't make functions within a loop.

2 errors
```

Even though our code works it turns out there are still other things to consider. Most notably performance.

Here is a jsperf that executes the following:

http://jsperf.com/defined-function-vs-in-loop-function


The difference is pretty staggering. For Chrome on my mac book air the results were 792,625 operations vs 30,155. And judging by the inline test history this seems to be the case for all other browsers.


We can expand that test to use function expressions and verify that behavior is about the creation of a function on each loop iteration:

http://jsperf.com/defined-function-vs-in-loop-function/3

```

Here we see comparable execution times for a high level function expression and declaration vs an inloop anon an inloop function expression. The one strange exception seems to be the inloop function declaration which performs on par with the other.  But as it turns out when declaring a function in this manner the function is defined at parse time and hoisted making it analagous to defining the function on the outside.


