var mb = require('./getfile.js');


    var longStack = new Error("getFile").stack;
    mb.getFile('test.txt', function(err, res){
        if (err){
            err.longStack = longStack
            logAndDie(err);
        }else{
            console.log(res.toString());
        }

    });

function logAndDie(e, stack1){
    console.log("Long stack:" + e.longStack);

    console.log("Error: " + e.message + " stack:" + e.stack);
    //exit
}