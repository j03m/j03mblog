function a(){
    b();
}

function b(){
    c();
}

function c(){
    throw new Error("oh noes!");
}

a();