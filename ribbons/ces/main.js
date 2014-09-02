function Ribbon() {
	return {
		alive: true,

		RibbonPath: RibbonPath(),
		RibbonStyle: {
			color: "hsla(" + ((Math.random()*360)|0) + ", 60%, 60%, 1)",
			width: 4
		},
		Trimming: {
			next: 50,
			interval: 50
		}
	};
}

function RibbonPath(){
	var manhattan = function(a, b){
		return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
	};
	
	var points = [],
		closed = false;

	return {
		get closed() { return closed },
		get points() { return points },
		add: function(p){
			if(points.length == 0){
				points.push(p);
				return;
			}

			var last = points[points.length-1];
			if(manhattan(last, p) > 10 ){
				 points.push(p);
			}
		},
		close: function(){
			closed = true;
		}
	};
}

function timestamp(){
	return (new Date()).valueOf()
}

var canvas = document.getElementById("ribbons");
canvas.positionOf = function(ev){
	return {
		x: ev.pageX - canvas.offsetLeft,
		y: ev.pageY - canvas.offsetTop
	};
}
var context = canvas.getContext("2d");

var Engine = NewEngine();
Engine.realtime = timestamp();
Engine.time = 0.0;

Engine.update = function(){
	var dt = 16;
	Engine.time += dt;
	Engine.systems("update", dt);
	Engine.em.forEach(function(en){
		if(!en.alive){
			Engine.em.remove(en);
		}
	});
}

Engine.render = function(){
	context.fillStyle = "hsla(0,100%,100%,0.2)";
	context.fillRect(0, 0, canvas.width, canvas.height);
	Engine.systems("render", context);
};

Engine.run = function(){
	Engine.systems("init", Engine);

	window.setInterval(function(){
		Engine.realtime = timestamp();
		Engine.update();
	})

	startRender(Engine.render);
}

function Drawing(Engine){
	var open = {};
	return {
		start: function(id, p){
			if(open[id] != null){
				open[id].close();
			}
			
			var ribbon = Ribbon();
			Engine.em.add(ribbon);
			
			open[id] = ribbon.RibbonPath;
			ribbon.RibbonPath.add(p);
		},
		line: function(id, p){
			if(open[id] != null){
				open[id].add(p);
			}
		},
		close: function(id){
			if(open[id] != null){
				open[id].close();
				delete open[id];
			}
		}
	};
}

// draws the ribbons on the screen
Engine.sys.Drawing = Drawing(Engine);

// handles mouse input
function Mouse(Engine){
	// needs sys.Drawing
	return {
		init: function(){
			document.addEventListener("mousedown", function(ev){
				Engine.sys.Drawing.start("mouse", canvas.positionOf(ev));
				ev.preventDefault();
			});
			document.addEventListener("mousemove", function(ev){
				Engine.sys.Drawing.line("mouse", canvas.positionOf(ev));
				ev.preventDefault();
			});
			document.addEventListener("mouseup", function(ev){
				Engine.sys.Drawing.close("mouse");
				ev.preventDefault();
			});
		}
	};
}
Engine.sys.Mouse = Mouse(Engine);

// handles touch input
function Touching(Engine){
	// needs sys.Drawing
	return {
		init: function(){
			document.addEventListener("touchstart", function(ev){
				ev.changedTouches.map(function(touch){
					Engine.sys.Drawing.start(touch.identifier, canvas.positionOf(touch));
				})
				ev.preventDefault();
			});
			document.addEventListener("touchmove", function(ev){
				ev.changedTouches.map(function(touch){
					Engine.sys.Drawing.line(touch.identifier, canvas.positionOf(touch));
				})
				ev.preventDefault();
			});

			var end = function(ev){
				ev.changedTouches.map(function(touch){
					Engine.sys.Drawing.close(touch.identifier);
				})
				ev.preventDefault();
			};
			document.addEventListener("touchend", end);
			document.addEventListener("touchleave", end);
			document.addEventListener("touchcancel", end);
		}
	};
}
Engine.sys.Touching = Touching(Engine);

// renders the scene
function Rendering(Engine){
	return {
		render: function(context){
			Engine.where(function(RibbonPath, RibbonStyle){
				var path = RibbonPath.points;
				if(path.length < 1)
					return;
				context.strokeStyle = RibbonStyle.color;
				context.lineWidth = RibbonStyle.width;
				context.beginPath();
				context.moveTo(path[0].x, path[0].y);
				for(var i = 1; i < path.length - 1; i += 1){
					var p = path[i];
					context.lineTo(p.x, p.y);
				}
				context.stroke();
			});
		}
	};
}
Engine.sys.Rendering = Rendering(Engine);

// trims the ribbons
function Trimming(Engine){
	return {
		update: function(dt){
			Engine.where(function(RibbonPath, Trimming){
				Trimming.next -= dt;
				while(Trimming.next < 0){
					if(RibbonPath.closed || (RibbonPath.points.length > 3)){
						RibbonPath.points.shift();
					}
					Trimming.next += Trimming.interval;
				}
				if(RibbonPath.closed && RibbonPath.points.length == 0){
					this.alive = false;
				}
			});
		}
	};
}
Engine.sys.Trimming = Trimming(Engine);

// moves the ribbon path
function Jittering(Engine){
	return {
		update: function(dt){
			Engine.where(function(RibbonPath){
				var path = RibbonPath.points;
				for(var i = 0; i < path.length; i += 1){
					path[i].x += Math.random()*2 - 1;
					path[i].y += Math.random()*2 - 1;
				}
			});
		}
	};
}
Engine.sys.Jittering = Jittering(Engine);

Engine.run();
