//sync
for(var i=0;i<10;i++){
    console.log("sync i==",i);
}


//async
for(var i=0;i<10;i++){
		setTimeout(function(){
			console.log("i==",i);
		}, 0);
}