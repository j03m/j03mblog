var mb = require('./getfile.js');
var Promise = require('bluebird');
var getfilep = Promise.promisify(mb.getFile);
var mp = getfilep('test.txt');

function logAndDie(e){
    console.log("Error: " + e.message + " stack:" + e.stack);

}

//bad
mp.then(function(res){
    console.log(res);
}).error(function(e){
    logAndDie(e);
}).catch(function(e){
    //ignore e, what just happened? No idea.
    console.log("generic error!");
});


//better:
// log on rejection IF it is known recoverable
// crash on catch (unknown - who knows what is happening)
mp.then(function(res){
    console.log(res);
}).error(function(e){
    logAndDie(e);
});


//not really needed
mp.then(function(res){
    console.log(res);
}).error(function(e){
    logAndDie(e);
}).catch(function(e){
   //logAndDie
   throw e;
});