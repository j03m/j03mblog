function a(){
    try{
        b();
    }catch(e){
        console.log(e);
    }
}

function b(){
    c();
}

function c() {
    setTimeout(function () {
        throw new Error("oh noes!");
    });
}

a();