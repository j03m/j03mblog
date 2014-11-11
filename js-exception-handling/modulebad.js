var mb = require('./getfile.js');

try{
    mb.getFile('test.txt', function(err, res){
        if (err){
            logAndDie(err);
            //do something else?
            console.log("More work")
        }else{
            console.log(res.toString());
        }
    });
}catch(e){
    logAndDie(e);
}

function logAndDie(e){
    console.log("Error: " + e.message + " stack:" + e.stack);

}


worker.sendRequest().error(function(e){
    if (e instanceof FileNotFoundError){
        //do this
    }


})