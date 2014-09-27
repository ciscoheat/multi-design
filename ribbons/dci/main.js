function Drawing(input, canvas, context){
	var ribbons = extended([], {
		add: function(item){
			ribbons.push(item);
		},
		remove: function(item){
			var i = ribbons.indexOf(item);
			if(i >= 0) ribbons.splice(i, 1);
		}
	});
	
	var open = {};
	input.when({
		down: function(id, ev){
			if(open[id] != null){
				open[id].close();
			}
			var rib = Ribbon(Line())
			rib.extend(position(ev));
			open[id] = rib;
			ribbons.add(rib);
		},
		move: function(id, ev){
			var rib = open[id];
			rib && rib.extend(position(ev));
		},
		up: function(id, ev){
			if(open[id]){
				open[id].close();
				delete open[id];
			}
		}
	});

	function draw(){
		// background fade
		context.fillStyle = "hsla(0,100%,100%,0.2)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		// render ribbons
		ribbons.map(function(ribbon){
			context.save();
			ribbon.draw();
			context.restore();
		})
	}

	function position(ev){
		return {
			x: ev.pageX - canvas.offsetLeft,
			y: ev.pageY - canvas.offsetTop,
		};
	}

	function Ribbon(){
		var rib = extended(Line(randomColor(), 4), {	
			closed: false,
			extend: function(p){
				if(rib.length == 0){
					rib.push(p);
					return;
				}
				var last = rib[rib.length-1];
				if(manhattan(last, p) > 10){
					rib.push(p);
				}
			},
			close: function(){
				rib.closed = true;
			},
			isDone: function(){
				return rib.closed && (rib.length < 3)
			},
			jitter: function(){
				rib.map(function(p){
					p.x += Math.random()*2 - 1;
					p.y += Math.random()*2 - 1;
				});
			},
			trim: function(){
				if(rib.closed || (rib.length > 2)){
					rib.shift();
				}
			},
			draw: function(){
				rib.renderTo(context);
			},
			// behavior
			_trimming: window.setInterval(function(){
				rib.trim();
				if(rib.isDone()){
					ribbons.remove(rib);
					window.clearInterval(rib._trimming);
					window.clearInterval(rib._updating);
				}
			}, 30),
			_updating: window.setInterval(function(){
				rib.jitter();
			}, 10)
		});
		return rib;
	}

	return {
		open: open,
		ribbons: ribbons,
		draw: draw
	};
}

var inputs = Inputs([Mouse(document), Touch(document)]);
var canvas = document.getElementById("ribbons");
var context = canvas.getContext("2d");

var drawing = Drawing(inputs, canvas, context);
startRender(drawing.draw);

// implements a simple line
function Line(color, width){
	var line = extended([],{
		color: color,
		width: width,
		extend: function(pt){
			line.push(pt);
		},
		renderTo: function(context){
			context.strokeStyle = line.color;
			context.lineWidth = line.width;
			context.beginPath();
			context.moveTo(line[0].x, line[0].y);
			for(var i = 1; i < line.length; i += 1){
				context.lineTo(line[i].x, line[i].y);
			}
			context.stroke();
		}
	});
	return line;
};

// composits multiple inputs
function Inputs(inputs){	
	return {
		when: function(events){
			inputs.map(function(input){
				input.when(events);
			})
		}
	};
}

// handles "down", "move", "up" events
function Mouse(element){
	var bindings = {}
	when(element, "mouse", "down move up", function(action, ev){
		var fn = bindings[action];
		fn && fn("mouse", ev);
	});
	return {
		when: function(events, fn){ bindings = events; }
	};
}

// handles "down", "move", "up" events
function Touch(element){
	var translate = {
		"start": "down", 
		"move": "move", 
		"end": "up", 
		"cancel": "up"
	};

	var bindings = {};

	when(element, "touch", "start move end cancel", function(action, ev){
		ev.changedTouches.map(function(touch){
			var fn = bindings[translate[action]];
			fn && fn(touch.identifier, ev);
		});
	});

	return {
		when: function(events){	bindings = events; }
	};
}

// other utilities
function randomColor(){
	return "hsla(" + ((Math.random()*360)|0) + ", 60%, 60%, 1)";
}

function manhattan(a, b){
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

function when(element, prefix, suffixes, fn){
	suffixes.split(" ").map(function(suffix){
		element.addEventListener(prefix + suffix, function(ev){
			fn(suffix, ev);
			ev.preventDefault();
		});
	});
};

function extended(object, extension){
	for(var name in extension){
		if(!extension.hasOwnProperty(name)) continue;
		// if(object[name]) throw "name clash with " + name;
		object[name] = extension[name];
	}
	return object;
}