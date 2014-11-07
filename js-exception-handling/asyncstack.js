function a(){
    b();
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