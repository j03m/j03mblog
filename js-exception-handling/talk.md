js - exceptions - the bad news
    sync vs async stack

operational vs logical errors
    operational
        retry 
        propogate
        blow up
        log and carry on (be sure - this assumption is where anti-patterns happen)
    programmer errors
        you cannot recover from a logic error. 
        If you have a logic error, you SHOULD crash
        
        ***Correct use of try/catch means making sure your program can still crash when should.
            
try/catch - the bad news
    try/catch eats everything
    try/catch is the cause of lots of antipatterns

When to use it? ecmascript functions that throw
    try{
       
       
        json = JSON.parse(input)
       
       
       }catch(e){
         
         json= null;
       }
       
    throw should mean "For this should never happen, crash and burn. Do not recover elegantly in any way"
    

When not to? (pretty much any other time)
    why?
    It can be slow: http://jsperf.com/try-catch-performance-overhead
    It can handle errors you didn't mean to handle - makes dev life hard, makes trouble shooting harder
    When possible, do checks, use other means of delivering error
        node style async
        return error code sync
        promise api
    
    anti-patterns - things not to do
    
Promises - long stacks
    why? When you are in async hell
    why not? Super slow.  http://jsperf.com/long-stacks3/3
    