Drawing = (input, canvas, context) ->
	draw = ->
		
		# background fade
		context.fillStyle = "hsla(0,100%,100%,0.2)"
		context.fillRect 0, 0, canvas.width, canvas.height
		
		# render ribbons
		ribbons.map (ribbon) ->
			context.save()
			ribbon.draw()
			context.restore()
			return

		return
	position = (ev) ->
		x: ev.pageX - canvas.offsetLeft
		y: ev.pageY - canvas.offsetTop
	Ribbon = ->
		rib = extended(Line(randomColor(), 4),
			closed: false
			extend: (p) ->
				if rib.length is 0
					rib.push p
					return
				last = rib[rib.length - 1]
				rib.push p  if manhattan(last, p) > 10
				return

			close: ->
				rib.closed = true
				return

			isDone: ->
				rib.closed and (rib.length < 3)

			jitter: ->
				rib.map (p) ->
					p.x += Math.random() * 2 - 1
					p.y += Math.random() * 2 - 1
					return

				return

			trim: ->
				rib.shift()  if rib.closed or (rib.length > 2)
				return

			draw: ->
				rib.renderTo context
				return

			
			# behavior
			_trimming: window.setInterval(->
				rib.trim()
				if rib.isDone()
					ribbons.remove rib
					window.clearInterval rib._trimming
					window.clearInterval rib._updating
				return
			, 30)
			_updating: window.setInterval(->
				rib.jitter()
				return
			, 10)
		)
		rib
	ribbons = extended([],
		add: (item) ->
			ribbons.push item
			return

		remove: (item) ->
			i = ribbons.indexOf(item)
			ribbons.splice i, 1  if i >= 0
			return
	)
	open = {}
	input.when
		down: (id, ev) ->
			open[id].close()  if open[id]?
			rib = Ribbon(Line())
			rib.extend position(ev)
			open[id] = rib
			ribbons.add rib
			return

		move: (id, ev) ->
			rib = open[id]
			rib and rib.extend(position(ev))
			return

		up: (id, ev) ->
			if open[id]
				open[id].close()
				delete open[id]
			return

	open: open
	ribbons: ribbons
	draw: draw

# implements a simple line
Line = (color, width) ->
	line = extended([],
		color: color
		width: width
		extend: (pt) ->
			line.push pt
			return

		renderTo: (context) ->
			context.strokeStyle = line.color
			context.lineWidth = line.width
			context.beginPath()
			context.moveTo line[0].x, line[0].y
			i = 1

			while i < line.length
				context.lineTo line[i].x, line[i].y
				i += 1
			context.stroke()
			return
	)
	line

# composits multiple inputs
Inputs = (inputs) ->
	when: (events) ->
		inputs.map (input) ->
			input.when events
			return
		return

# handles "down", "move", "up" events
Mouse = (element) ->
	bindings = {}
	whenEvent element, "mouse", "down move up", (action, ev) ->
		fn = bindings[action]
		fn and fn("mouse", ev)
		return

	when: (events, fn) ->
		bindings = events
		return

# handles "down", "move", "up" events
Touch = (element) ->
	translate =
		start: "down"
		move: "move"
		end: "up"
		cancel: "up"

	bindings = {}
	whenEvent element, "touch", "start move end cancel", (action, ev) ->
		ev.changedTouches.map (touch) ->
			fn = bindings[translate[action]]
			fn and fn(touch.identifier, ev)
			return

		return

	when: (events) ->
		bindings = events
		return

# other utilities
randomColor = ->
	"hsla(" + ((Math.random() * 360) | 0) + ", 60%, 60%, 1)"

manhattan = (a, b) ->
	Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

whenEvent = (element, prefix, suffixes, fn) ->
	suffixes.split(" ").map (suffix) ->
		element.addEventListener prefix + suffix, (ev) ->
			fn suffix, ev
			ev.preventDefault()
			return

		return

	return

extended = (object, extension) ->
	for name of extension
		continue  unless extension.hasOwnProperty(name)
		
		# if(object[name]) throw "name clash with " + name;
		object[name] = extension[name]
	object

inputs = Inputs([
	Mouse(document)
	Touch(document)
])

canvas = document.getElementById("ribbons")
context = canvas.getContext("2d")
drawing = Drawing(inputs, canvas, context)

startRender drawing.draw