(function () {
  'use strict';

  function Ribbon() {
    this.id = uuid();
    this.RibbonPath = new RibbonPath();
    this.RibbonStyle = {
      color: "hsla(" + ((Math.random()*360)|0) + ", 60%, 60%, 1)",
      width: 4
    };
    this.Trimming = {
      next: 50,
      interval: 50
    };
  }

  function RibbonPath(){
    this.points = [];
    this.closed = false;
  }
  RibbonPath.prototype = {
    manhattan: function(a, b){
      return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },
    add: function(p){
      if(this.points.length == 0){
        this.points.push(p);
        return;
      }

      var last = this.points[this.points.length-1];
      if(this.manhattan(last, p) > 10 ){
         this.points.push(p);
      }
    },
    close: function(){
      this.closed = true;
    }
  };

  var canvas = document.getElementById("ribbons");
  var context = canvas.getContext("2d");

  var Engine = {
    realtime: 0.0,
    time: 0.0,

    canvas: canvas,
    context: context,
    entity: {
      list: {},
      byId: function(id){
        return this.list[id];
      },
      add: function(en){
        this.list[en.id] = en;
        return en.id;
      },
      remove: function(id){
        delete this.list[id];
      },
      cmap: function(sys, fn){
        var args = argumentsOf(fn);
        for(var id in this.list){
          if(!this.list.hasOwnProperty(id)){ continue; }

          var en = this.list[id],
              components = [];
          for(var k = 0; k < args.length; k += 1){
            var c = en[args[k]];
            if(c == null){
              break
            }
            components.push(c);
          }

          if(components.length != args.length){
            continue;
          }

          fn.apply(sys, components);
        }
      }
    },
    systems: [],

    render: function(){
      var context = this.context;

      context.fillStyle = "hsla(0,100%,100%,0.2)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      this.systems.map(function(sys){
        if(sys.render != null){
          context.save();
          sys.render(context);
          context.restore();
        }
      });
    },
    update: function(){
      var dt = 16;
      this.time += dt;
      this.systems.map(function(sys){
        if(sys.update != null)
          sys.update(dt);
      });
    },
    init: function(){
      var engine = this;
      this.systems.map(function(sys){
        sys.Engine = engine;
        if(sys.init != null)
          sys.init();
      });

      window.setInterval(function(){
        engine.realtime = (new Date()).valueOf();
        engine.update();
      }, 10);

      looprender(engine.render.bind(engine));
    }
  };

  function positionOf(ev){
    return {
      x: ev.pageX - Engine.canvas.offsetLeft,
      y: ev.pageY - Engine.canvas.offsetTop
    };
  }

  Engine.systems.push({
    name: "Mousing",
    open: null,

    init: function(){
      document.addEventListener("mousedown", this.mouseDown.bind(this));
      document.addEventListener("mouseup", this.mouseUp.bind(this));
      document.addEventListener("mousemove", this.mouseMove.bind(this));
    },
    mouseDown: function(ev){
      if(this.open != null){
        this.open.RibbonPath.close();
      }

      var ribbon = new Ribbon();
      this.open = ribbon;
      ribbon.RibbonPath.add(positionOf(ev));
      this.Engine.entity.add(ribbon);
    },
    mouseUp: function(ev){
      if(this.open == null) return;
      this.open.RibbonPath.close();
      this.open = null;
    },
    mouseMove: function(ev){
      if(this.open == null) return;
      this.open.RibbonPath.add(positionOf(ev));
    }
  });

  Engine.systems.push({
    name: "Touching",
    open: {},
    init: function(){
      document.addEventListener("touchstart", this.touchDown.bind(this));
      document.addEventListener("touchmove", this.touchMove.bind(this));
      document.addEventListener("touchend", this.touchEnd.bind(this));
      document.addEventListener("touchleave", this.touchEnd.bind(this));
      document.addEventListener("touchcancel", this.touchEnd.bind(this));
    },
    touchDown: function(ev){
      var changed = ev.changedTouches;
      for(var i = 0; i < changed.length; i += 1){
        var touch = changed[i];
        var ribbon = new Ribbon();
        this.open[touch.identifier] = ribbon;
        this.Engine.entity.add(ribbon);
        ribbon.RibbonPath.add(positionOf(touch));
      }

      ev.preventDefault();
    },
    touchEnd: function(ev){
      var changed = ev.changedTouches;
      for(var i = 0; i < changed.length; i += 1){
        var touch = changed[i];
        var ribbon = this.open[touch.identifier];
        ribbon.RibbonPath.close();
        delete this.open[touch.identifier];
      }
      ev.preventDefault();
    },
    touchMove: function(ev){
      var changed = ev.changedTouches;
      for(var i = 0; i < changed.length; i += 1){
        var touch = changed[i];
        var ribbon = this.open[touch.identifier];
        ribbon.RibbonPath.add(positionOf(touch));
      }
      ev.preventDefault();
    }
  });

  Engine.systems.push({
    name: "Rendering",
    render: function(context){
      this.Engine.entity.cmap(this, function(RibbonPath, RibbonStyle){
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
  });

  Engine.systems.push({
    name: "Trimming",
    update: function(dt){
      this.Engine.entity.cmap(this, function(RibbonPath, Trimming){
        Trimming.next -= dt;
        while(Trimming.next < 0){
          if(RibbonPath.closed || (RibbonPath.points.length > 2)){
            RibbonPath.points.shift();
          }
          Trimming.next += Trimming.interval;
        }
      });
    }
  });

  Engine.systems.push({
    name: "Scattering",
    time: 0,
    update: function(dt){
      this.time += dt;
      var time = this.time;
      this.Engine.entity.cmap(this, function(RibbonPath){
        var path = RibbonPath.points;
        for(var i = 0; i < path.length; i += 1){
          path[i].x += Math.random()*2 - 1;
          path[i].y += Math.random()*2 - 1;
        }
      });
    }
  });

  Engine.systems.push({
    name: "Cleanup",
    update: function(dt){
      this.Engine.entity.cmap(this, function(id, RibbonPath){
        if(RibbonPath.closed && (RibbonPath.points.length == 0)) {
          this.Engine.entity.remove(id);
        }
      });
    }
  });

  Engine.init();
  window.Engine = Engine;

  function argumentsOf(fn){
    var args = fn
      .toString()
      .replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s))/mg,'')
      .match(/^function\s*[^\(]*\(\s*([^\)]*)\)/m)[1]
      .split(/,/);
    return args;
  }

  function uuid(){
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
               .toString(16)
               .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
           s4() + '-' + s4() + s4() + s4();
  }

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
