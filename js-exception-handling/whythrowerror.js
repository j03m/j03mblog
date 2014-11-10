try{
    throw "hi";
}catch(e){
    console.error("Error raw: " + e);
    console.error("Error: " + e.message + " " + e.stack);
}


try{
    throw new Error("hi");
}catch(e){
    console.error("Error raw: " + e);
    console.error("Error: " + e.message + " " + e.stack);
}

var Promise = require('bluebird');

var p = new Promise(function(f,r){
   throw new Error("hi");
});

var p1 = new Promise(function(f,r){
    throw "hi";
});


p.error(function(e){
    console.error("Error raw: " + e);
    console.error("Error: " + e.message + " " + e.stack);
}).catch(function(e){
    console.error("Catch raw: " + e);
    console.error("Catch: " + e.message + " " + e.stack);
});


p1.error(function(e){
    console.error("Error raw: " + e);
    console.error("Error: " + e.message + " " + e.stack);
}).catch(function(e){
    console.error("Catch raw: " + e);
    console.error("Catch: " + e.message + " " + e.stack);
});