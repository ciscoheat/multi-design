if(Array.prototype.map == null){
	Array.prototype.map = function map(fun /*, thisp*/) {
		var object = toObject(this),
			self = splitString && isString(this) ? this.split('') : object,
			length = self.length >>> 0,
			result = Array(length),
			thisp = arguments[1];

		// If no callback function or if callback is not a callable function
		if (!isFunction(fun)) {
			throw new TypeError(fun + " is not a function");
		}

		for (var i = 0; i < length; i++) {
			if (i in self) {
				result[i] = fun.call(thisp, self[i], i, object);
			}
		}
		return result;
	};
}

function forEach(obj, fn){
	for(var name in obj) {
		if(obj.hasOwnProperty(name))
			fn(obj[name], name);
	}
}

function startRender(render){
	var callback = function(){
		render();
		window.requestAnimationFrame(callback);
	}
	callback();
}