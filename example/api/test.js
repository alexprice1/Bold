module.exports=function(data,fn,session,extras){
	exports.run=function(){
		var number = Math.random();
		if(number<.5){
			return fn("This is a standard error message.");
		} else {
			return fn(null,{
				data:"This the standard way to send data back to the client."
			});
		}
	};
	return exports;
};