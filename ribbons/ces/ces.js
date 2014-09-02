function NewEngine(){
	var entities = Entities(),
		systems = {};
	return {
		get sys(){ return systems; },
		get em(){ return entities; },
		// calls method on each system with arguments
		systems: function(method){
			var rest = Array.prototype.slice.call(arguments, 1);
			forEach(systems, function(sys){
				if(sys[method] != null){
					sys[method].apply(sys, rest);
				}
			})
		},
		// selects over entities where we have components requested by fn
		where: function(fn){
			entities.where(fn);
		}
	}
}

function Entities(){
	var list = {};

	return {
		get list(){ return list; },

		byId: function(id){ return list[id]; },
		add: function(en){
			en._id = uuid();
			list[en._id] = en;
			return en._id;
		},
		remove: function(en){
			delete list[en._id];
		},
		removeById: function(id){
			delete list[id];
		},
		forEach: function(fn){
			forEach(list, function(en){
				fn(en);
			});
		},
		where: function(fn){
			if(fn.__arguments == null){
				fn.__arguments = argumentsOf(fn);
			}
			var args = fn.__arguments;
			forEach(list, function(en){
				var cs = [];
				for(var i = 0; i < args.length; i += 1){
					var c = en[args[i]];
					if(c == null)
						return;
					cs.push(c);
				}
				fn.apply(en, cs);
			});
		}
	}
}


function argumentsOf(fn){
	var args = fn
		.toString()
		.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
		.match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
		.split(/,/);
	return args;
}

function s4() {
	return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
}

function uuid(){
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}