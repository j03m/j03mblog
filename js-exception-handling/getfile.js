var fs = require('fs');

exports.getFile = function (file, cb) {
    //console.log(a);
    if (typeof cb !== 'function'){
        throw new Error('get file requires a function!');
    }
    fs.readFile(file, cb);
};