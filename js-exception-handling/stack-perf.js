function mySetTO(fn, tm){
    setTimeout(fn, tm);
}

function myLongStackTO(fn,tm){
    var stack = new Error().stack;
    setTimeout(function(){
        console.log('foo');
    },tm);
}


for (var i = 0; i < 1000; i++) {
    myLongStackTO(function() {
        console.log('foo');
    })
}