(function () {
	'use strict';

	var Observable = Rx.Observable;
	
	var filterById = function(id){
		return function(p){ return p.id == id; };
	};

	var logw = document.getElementById("log");
	var lines = [];
	var log = function(){
		var line = "";
		for(var i = 0; i < arguments.length; i += 1){
			line += JSON.stringify(arguments[i]) + " ";
		}
		lines.unshift(line);
		while(lines.length > 10)
			lines.pop();
		logw.innerHTML = lines.join("<br>");
	}

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

	// stream of stream of mouse locations
	var trails = pointerStart.
		map(function(start){
			return pointerMove.
				startWith(start).
				where(filterById(start.id)).
				distinctUntilChanged(null, function(prev, cur){ return manhattan(prev, cur) < 10; }).
				takeUntil(pointerEnd.where(filterById(start.id)));
		});

	// the application state
	var Drawing = {
		trails: []
	};
	trails.subscribe(function(points){
		var trail = new Trail();
		Drawing.trails.push(trail);
		
		// trail building
		points.subscribe(function(p){
			trail.add({x: p.x, y: p.y});
		}, function(){
			trail.close();
		}, function(){
			trail.close();
		});

		// trail trimming timer
		var sub = Observable.timer(30, 30).subscribe(function(){
			trail.trim();
			if(trail.isDone()) {
				var i = Drawing.trails.indexOf(trail);
				Drawing.trails.splice(i, 1);
				sub.dispose();
			}
		});
	});

	function Trail(){
		this.path = [];
		this.closed = false;

		this.color = "hsla(" + ((Math.random()*360)|0) + ", 60%, 60%, 1)";
		this.width = 4;
    };
	Trail.prototype = {
		add: function(p){
			this.path.push(p);
		},
		close: function(){
			this.closed = true;
		},
		trim: function(){
			if(this.closed || (this.path.length > 2)){
            	this.path.shift();
          	}
		},
		isDone: function(){
			return this.closed && (this.path.length < 2);
		},
		render: function(context){
			var path = this.path;
			context.strokeStyle = this.color;
	        context.lineWidth = this.width;
	        context.beginPath();
	        context.moveTo(path[0].x, path[0].y);
	        for(var i = 1; i < path.length - 1; i += 1){
	          var p = path[i];
	          context.lineTo(p.x, p.y);
	        }
	        context.stroke();
		}
	};

	function render(){
	    context.fillStyle = "hsla(0,100%,100%,0.2)";
    	context.fillRect(0, 0, canvas.width, canvas.height);
		for(var i = 0; i < Drawing.trails.length; i += 1){
			context.save();
			Drawing.trails[i].render(context);
			context.restore();
		}
	}
	looprender(render);


  // es5 shim
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

	function looprender(render){
		var callback = function(){
			render();
			window.requestAnimationFrame(callback);
		};
		callback();
	}
})();