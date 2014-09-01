var Observable = Rx.Observable;

var canvas = document.getElementById("ribbons");
var context = canvas.getContext("2d");

// a touch event stream
var touch = function(eventname){
	return Observable.fromEvent(document, eventname).
		selectMany(function(ev){
			ev.preventDefault();
			return Observable.fromArray(ev.changedTouches).map(function(t){
				return { 
					id: t.identifier,
					x: t.pageX - canvas.offsetLeft,
					y: t.pageY - canvas.offsetTop,
					timestamp: ev.timeStamp
				};
			});
		});
};

// a mouse event stream
var mouse = function(eventname){
	return Observable.fromEvent(document, eventname).
		map(function(ev){
			ev.preventDefault();
			return {
				id: "mouse",
				x: ev.pageX - canvas.offsetLeft,
				y: ev.pageY - canvas.offsetTop,
				timestamp: ev.timeStamp
			};
	});
};

// stream of pointer starting
var pointerStart = Observable.merge(
	touch("touchstart"),
	mouse("mousedown")
);

// stream of pointer moving
var pointerMove = Observable.merge(
	touch("touchmove"),
	mouse("mousemove")
);

// stream of pointer ends
var pointerEnd = Observable.merge(
	touch("touchend"), touch("touchcancel"),
	mouse("mouseup"), mouse("mouseleave")
);

function manhattan(a, b){
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
};

function filterById(id){
	return function(p){ return p.id == id; };
};

// stream of stream of mouse locations
var trails = pointerStart.
	map(function(start){
		return pointerMove.
			startWith(start).
			where(filterById(start.id)).
			distinctUntilChanged(null, 
				function(prev, cur){
					return manhattan(prev, cur) < 10;
				}).
			takeUntil(pointerEnd.where(filterById(start.id)));
	});

// the application state
var Drawing = {
	ribbons: [],
	render: function(){
 		context.fillStyle = "hsla(0,100%,100%,0.2)";
		context.fillRect(0, 0, canvas.width, canvas.height);
		for(var i = 0; i < Drawing.ribbons.length; i += 1){
			context.save();
			Drawing.ribbons[i].render(context);
			context.restore();
		}
	},
	subscribeTo: function(trails){
		trails.subscribe(function(points){
			var ribbon = new Ribbon();
			Drawing.ribbons.push(ribbon);
			
			// ribbon building
			points.subscribe(function(p){
				ribbon.add({x: p.x, y: p.y});
			}, function(){
				ribbon.close();
			}, function(){
				ribbon.close();
			});

			var jittering = Observable.timer(30, 30).subscribe(function(){
				ribbon.jitter();
			});

			var trimming = Observable.timer(30, 30).subscribe(function(){
				ribbon.trim();
				if(ribbon.isDone()) {
					var i = Drawing.ribbons.indexOf(ribbon);
					Drawing.ribbons.splice(i, 1);
					
					trimming.dispose();
					jittering.dispose();
				}
			});
		})
	}
};

Drawing.subscribeTo(trails);

function Ribbon(){
	var path = [],
		closed = false,
		color = "hsla(" + ((Math.random()*360)|0) + ", 60%, 60%, 1)",
		width = 4;

	return {
		add: function(p){
			path.push(p);
		},
		close: function(){
			closed = true;
		},
		jitter: function(){
			for(var i = 0; i < path.length; i += 1){
				path[i].x += Math.random()*2 - 1;
				path[i].y += Math.random()*2 - 1;
			}
		},
		trim: function(){
			if(closed || (path.length > 2)){
	        	path.shift();
	      	}
		},
		isDone: function(){
			return closed && (path.length < 2);
		},
		render: function(context){
			context.strokeStyle = color;
			context.lineWidth = width;
			context.beginPath();
			context.moveTo(path[0].x, path[0].y);
			for(var i = 1; i < path.length - 1; i += 1){
				var p = path[i];
				context.lineTo(p.x, p.y);
			}
			context.stroke();
		}
	}
};
startRender(Drawing.render);