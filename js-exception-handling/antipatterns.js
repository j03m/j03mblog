//don't throw non Errors
Theses are all exceptions:

throw 1;
throw "omg no help";

All of these are errors:

var e = new Error();
var e = new Error(1);
var e = new Error("omg no help");


In promises, only reject with error objects!.


    //avoid things like this:
    getsomeData(function(err, res){
        try{
            var thing;

            if(res !== undefined && res.something !== undefined && res.something.somethingelse !=undefined){
                thing = res.something.somethingelse;
            }else{
                var e = new Error("Data Mailformed");
                e.data = res;
                logger.error("data malformed", e);
            }

        } catch(e){
            logger.error("data malformed", e);
            thing = 0;

            //continue as usual

        }
    });

    //probably better to crash and die depending on the situation

    //Handling Errors in RPLUS.... (see designer)


    //obviously something like this is generally terrible
    try{
        centerThisThing(ctrl); //
    }
    catch(e){

    } //bad

    //sometimes when an error occurs we want to let the user know but that doesn't mean that we as
    //developers don't need to know what happened:
    try {
        doSomething();
    }
    catch (e) {

        showErrorUI();
    }



//ignoring errors a promise is going to hurt you in the long run
function save (request, context){
    worker.saveSomeUserStuff(request)
        .then(function(response) {
            logger.debug("Save success!");
        })
        .catch(function(exception) {
            logger.error("Save failed!"); //and you have no idea why
        });
    context.deliverResponse({ success: "Ok" });
}

    //instead:
    .catch(function(reason){
        logger.error("Save Failed: ", reason);
        context.deliverError(1, reason);
    });





/*

 Avoid try-catch in performance-critical functions, and loops

 Anywhere else they won't do much harm. <- The key is, they can do a lot of harm
 So, Use them wisely, use them sparingly.

 Generally - rule of thumb if you can test for an error do that instead of using try/catch

 Remember - getting meaningful data from an error is most important and try/catch tends to hinder rather then thelp that,
 especially when abused.

 I see a lot of abuse in our code.

 */
