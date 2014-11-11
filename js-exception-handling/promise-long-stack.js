var mb = require('./getfile.js');
var Promise = require('bluebird');
Promise.longStackTraces();
try{
    var getfilep = Promise.promisify(mb.getFile);
    var mp = getfilep('test.txt');
    mp.then(function(res){
        console.log(res);
    }).error(function(e){
        logAndDie(e);
    }).catch(function(e){
        //ignore e, what just happened? No idea.
        logAndDie(e);
    });
}catch(e){
    logAndDie(e);
}

function logAndDie(e){
    console.log("Error: " + e.message + " stack:" + e.stack);

}


var obj1 = {};
obj1.a = '1';
var obj2 = {};
obj2.b = '2';

function trycatch(target, source, key){
    try{
        target[key] = source[key];
        return true;
    }catch(e){
        return false;
    }
}


function ifcheck(target, source, key){
    if (target && target instanceof Object && source && source[key]){
        target[key] = source[key];
        return true;
    }else{
        return false;
    }
}

//t/c true
for (var i =0;i<1000;i++){
    trycatch({},{a:1},'a');
}

//t/c false
for (var i =0;i<1000;i++){
    trycatch(undefined,{a:1},'a');
}

//check true
for (var i =0;i<1000;i++){
    ifcheck({},{a:1},'a');
}

//check false
for (var i =0;i<1000;i++){
    ifcheck(undefined,{a:1},'a');
}



