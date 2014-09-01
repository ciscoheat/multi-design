function Ribbon() {
  return {
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

// draws the ribbons on the screen
var Drawing = Engine.sys.Drawing = {
  open: {},
  start: function(id, p){
    if(Drawing.open[id] != null){
      Drawing.open[id].close();
    }
    
    var ribbon = Ribbon();
    Engine.em.add(ribbon);
    
    Drawing.open[id] = ribbon.RibbonPath;
    ribbon.RibbonPath.add(p);
  },
  line: function(id, p){
    if(Drawing.open[id] != null){
      Drawing.open[id].add(p);
    }
  },
  close: function(id){
    if(Drawing.open[id] != null){
      Drawing.open[id].close();
      delete Drawing.open[id];
    }
  }
};

// handles mouse input
var Mouse = Engine.sys.Mouse = {
  init: function(){
    document.addEventListener("mousedown", Mouse.down);
    document.addEventListener("mousemove", Mouse.move);
    document.addEventListener("mouseup", Mouse.up);
  },
  down: function(ev){
    Drawing.start("mouse", canvas.positionOf(ev));
    ev.preventDefault();
  },
  move: function(ev){
    Drawing.line("mouse", canvas.positionOf(ev));
  },
  up: function(ev){
    Drawing.close("mouse");
  }
};

// handles touch input
var Touching = Engine.sys.Touching = {
  init: function(){
    document.addEventListener("touchstart", Touching.down);
    document.addEventListener("touchmove", Touching.move);
    document.addEventListener("touchend", Touching.end);
    document.addEventListener("touchleave", Touching.end);
    document.addEventListener("touchcancel", Touching.end);
  },
  down: function(ev){
    ev.changedTouches.map(function(touch){
      Drawing.start(touch.identifier, canvas.positionOf(touch));
    })
    ev.preventDefault();
  },
  end: function(ev){
    ev.changedTouches.map(function(touch){
      Drawing.close(touch.identifier);
    })
    ev.preventDefault();
  },
  move: function(ev){
    ev.changedTouches.map(function(touch){
      Drawing.line(touch.identifier, canvas.positionOf(touch));
    })
    ev.preventDefault();
  }
};

// renders the scene
Engine.sys.Rendering = {
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

// trims the ribbons
Engine.sys.Trimming = {
  update: function(dt){
    Engine.where(function(RibbonPath, Trimming){
      Trimming.next -= dt;
      while(Trimming.next < 0){
        if(RibbonPath.closed || (RibbonPath.points.length > 3)){
          RibbonPath.points.shift();
        }
        Trimming.next += Trimming.interval;
      }
    });
  }
};

// moves the ribbon path
Engine.sys.Jittering = {
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

// removes completely trimmed ribbons
Engine.sys.PathCleanup = {
  update: function(dt){
    Engine.where(function(RibbonPath){
      if(RibbonPath.closed && (RibbonPath.points.length == 0)) {
        Engine.em.remove(this);
      }
    });
  }
};

Engine.run();
