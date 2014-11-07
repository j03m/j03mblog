// for(var i =0;i<10;i++){
// 	(function(value){
// 		setTimeout(function(){
// 			console.log(value);
// 		},0);
// 	})(i);
// }


// for(var i =0;i<10;i++){
//     setTimeout(function(value){
//         return function(){
//                console.log(value);
//         };
//     }(i),0);
// }

function makeCallback(value){
	return function(){
               console.log(value);
        };
}

for(var i =0;i<10;i++){
    setTimeout(makeCallback(i),0);
}