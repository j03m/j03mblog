var mb = require('./getfile.js');

try{
    var longStack = new Error("getFile").stack;
    mb.getFile('test.txt', function(err, res){
        if (err){
            err.longStack = longStack
            logAndDie(err);
        }else{
            console.log(res.toString());
        }

    });
}catch(e){
    console.log(e.stack);
}

function logAndDie(e, stack1){
    console.log("Error: " + e.message + " stack:" + e.stack);
    console.log("Long stack:" + e.longStack);
    //exit
}