(function() {
  var Drawing, Inputs, Mouse, Ribbon, Touch, canvas, context, drawing, extended, inputs, manhattan, randomColor, whenEvent;

  Drawing = function(canvas, context) {
    var ribbons, startRender;
    ribbons = [];
    startRender = function() {
      window.setInterval(ribbons.trim, 30);
      window.setInterval(ribbons.jitter, 10);
      return window.requestAnimationFrame(context.fillBackground);
    };
    context = extended(context, {
      fillBackground: function() {
        context.fillStyle = "hsla(0,100%,100%,0.2)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        return ribbons.draw();
      }
    });
    canvas = extended(canvas, {
      position: function(ev) {
        return {
          x: ev.pageX - canvas.offsetLeft,
          y: ev.pageY - canvas.offsetTop
        };
      }
    });
    ribbons = extended(ribbons, {
      withId: function(id) {
        return ribbons.filter(function(r) {
          return r.id() === id;
        });
      },
      add: function(id, pos) {
        var ribbon, _i, _len, _ref;
        _ref = ribbons.withId(id);
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ribbon = _ref[_i];
          ribbon.close();
        }
        ribbon = Ribbon(context, id);
        ribbon.extend(pos);
        return ribbons.push(ribbon);
      },
      remove: function(ribbon) {
        var i;
        ribbon.close();
        i = ribbons.indexOf(ribbon);
        if (i >= 0) {
          return ribbons.splice(i, 1);
        }
      },
      draw: function() {
        ribbons.map(function(ribbon) {
          return ribbon.draw();
        });
        return window.requestAnimationFrame(context.fillBackground);
      },
      trim: function() {
        return ribbons.map(function(ribbon) {
          ribbon.trim();
          if (ribbon.isDone()) {
            return ribbons.remove(ribbon);
          }
        });
      },
      jitter: function() {
        return ribbons.map(function(ribbon) {
          return ribbon.jitter();
        });
      }
    });
    return {
      startRender: startRender,
      addRibbon: function(id, ev) {
        return ribbons.add(id, canvas.position(ev));
      },
      extendRibbon: function(id, ev) {
        var ribbon, _i, _len, _ref, _results;
        _ref = ribbons.withId(id);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ribbon = _ref[_i];
          _results.push(ribbon.extend(canvas.position(ev)));
        }
        return _results;
      },
      closeRibbon: function(id) {
        var ribbon, _i, _len, _ref, _results;
        _ref = ribbons.withId(id);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ribbon = _ref[_i];
          _results.push(ribbon.close());
        }
        return _results;
      }
    };
  };

  Ribbon = function(context, id) {
    var closed, color, self, width;
    closed = false;
    color = randomColor();
    width = 4;
    return self = extended([], {
      id: function() {
        return id;
      },
      isClosed: function() {
        return closed;
      },
      close: function() {
        return closed = true;
      },
      extend: function(p) {
        var last;
        if (self.isClosed()) {
          return;
        }
        if (self.length === 0) {
          return self.push(p);
        }
        last = self[self.length - 1];
        if (manhattan(last, p) > 10) {
          return self.push(p);
        }
      },
      isDone: function() {
        return self.isClosed() && self.length < 3;
      },
      jitter: function() {
        return self.map(function(p) {
          p.x += Math.random() * 2 - 1;
          return p.y += Math.random() * 2 - 1;
        });
      },
      trim: function() {
        if (self.isClosed() || (self.length > 2)) {
          return self.shift();
        }
      },
      draw: function() {
        var i;
        context.strokeStyle = color;
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(self[0].x, self[0].y);
        i = 1;
        while (i < self.length) {
          context.lineTo(self[i].x, self[i].y);
          i += 1;
        }
        return context.stroke();
      }
    });
  };

  Inputs = function(inputs, drawing) {
    inputs = extended(inputs, {
      when: function(events) {
        return inputs.map(function(input) {
          return input.listenTo(events);
        });
      }
    });
    return {
      startTracking: function() {
        return inputs.when({
          down: function(id, ev) {
            return drawing.addRibbon(id, ev);
          },
          move: function(id, ev) {
            return drawing.extendRibbon(id, ev);
          },
          up: function(id, ev) {
            return drawing.closeRibbon(id);
          }
        });
      }
    };
  };

  Mouse = function(element) {
    var bindings;
    bindings = {};
    whenEvent(element, "mouse", "down move up", function(action, ev) {
      var fn;
      fn = bindings[action];
      return fn && fn("mouse", ev);
    });
    return {
      listenTo: function(events) {
        return bindings = events;
      }
    };
  };

  Touch = function(element) {
    var bindings, translate;
    bindings = {};
    translate = {
      start: "down",
      move: "move",
      end: "up",
      cancel: "up"
    };
    whenEvent(element, "touch", "start move end cancel", function(action, ev) {
      return ev.changedTouches.map(function(touch) {
        var fn;
        fn = bindings[translate[action]];
        return fn && fn(touch.identifier, ev);
      });
    });
    return {
      listenTo: function(events) {
        return bindings = events;
      }
    };
  };

  randomColor = function() {
    return "hsla(" + ((Math.random() * 360) | 0) + ", 60%, 60%, 1)";
  };

  manhattan = function(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };

  whenEvent = function(element, prefix, suffixes, fn) {
    return suffixes.split(" ").map(function(suffix) {
      return element.addEventListener(prefix + suffix, function(ev) {
        fn(suffix, ev);
        return ev.preventDefault();
      });
    });
  };

  extended = function(object, extension) {
    var name;
    for (name in extension) {
      if (!(extension.hasOwnProperty(name))) {
        continue;
      }
      if (object[name]) {
        throw "name clash with " + name;
      }
      object[name] = extension[name];
    }
    return object;
  };

  canvas = document.getElementById("ribbons");

  context = canvas.getContext("2d");

  drawing = Drawing(canvas, context);

  inputs = Inputs([Mouse(canvas, Touch(canvas))], drawing);

  drawing.startRender();

  inputs.startTracking();

}).call(this);

 //# sourceMappingURL=main.js.map