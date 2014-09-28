Drawing = (input, canvas, context) ->
	##### Context state #####

	open = {}
	ribbons = []

	##### System Operations #####

	startRender = ->
		window.setInterval ribbons.trim, 30
		window.setInterval ribbons.jitter, 10

		cb = ->
			context.fillBackground()
			window.requestAnimationFrame cb
		cb()

	##### RoleMethods #####

	context = extended context,
		fillBackground: ->
			# background fade
			context.fillStyle = "hsla(0,100%,100%,0.2)"
			context.fillRect 0, 0, canvas.width, canvas.height

			ribbons.draw()

	canvas = extended canvas,
		position: (ev) ->
			x: ev.pageX - canvas.offsetLeft
			y: ev.pageY - canvas.offsetTop

	ribbons = extended ribbons,
		add: (item) ->
			ribbons.push item

		remove: (item) ->
			i = ribbons.indexOf item
			ribbons.splice i, 1 if i >= 0

		draw: ->
			context.save()
			ribbons.map (ribbon) ->	ribbon.draw()
			context.restore()

		trim: ->
			ribbons.map (ribbon) ->
				ribbon.trim()
				ribbons.remove ribbon if ribbon.isDone()

		jitter: ->
			ribbons.map (ribbon) -> 
				ribbon.jitter()

	input.when
		down: (id, ev) ->
			open[id].close() if open[id]?
			rib = Ribbon context
			rib.extend canvas.position(ev)
			open[id] = rib
			ribbons.add rib

		move: (id, ev) ->
			rib = open[id]
			rib and rib.extend(canvas.position(ev))

		up: (id, ev) ->
			if open[id]
				open[id].close()
				delete open[id]

	ribbons: ribbons
	startRender: startRender

# A ribbon
Ribbon = (context) ->
	rib = extended [],
		color: randomColor()
		width: 4
		closed: false

		extend: (p) ->
			return rib.push p if rib.length is 0
			last = rib[rib.length - 1]
			rib.push p if manhattan(last, p) > 10

		close: ->
			rib.closed = true

		isDone: ->
			rib.closed and rib.length < 3

		jitter: ->
			rib.map (p) ->
				p.x += Math.random() * 2 - 1
				p.y += Math.random() * 2 - 1

		trim: ->
			rib.shift() if rib.closed or (rib.length > 2)

		draw: ->
			context.strokeStyle = rib.color
			context.lineWidth = rib.width

			context.beginPath()
			context.moveTo rib[0].x, rib[0].y

			i = 1
			while i < rib.length
				context.lineTo rib[i].x, rib[i].y
				i += 1

			context.stroke()

# composits multiple inputs
Inputs = (inputs) ->
	when: (events) ->
		inputs.map (input) ->
			input.when events

# handles "down", "move", "up" events
Mouse = (element) ->
	bindings = {}

	whenEvent element, "mouse", "down move up", (action, ev) ->
		fn = bindings[action]
		fn and fn("mouse", ev)

	when: (events, fn) ->
		bindings = events

# handles "down", "move", "up" events
Touch = (element) ->
	bindings = {}

	translate =
		start: "down"
		move: "move"
		end: "up"
		cancel: "up"

	whenEvent element, "touch", "start move end cancel", (action, ev) ->
		ev.changedTouches.map (touch) ->
			fn = bindings[translate[action]]
			fn and fn(touch.identifier, ev)

	when: (events) ->
		bindings = events

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

extended = (object, extension) ->
	for name of extension when extension.hasOwnProperty(name)
		throw "name clash with " + name if object[name]
		object[name] = extension[name]
	object

inputs = Inputs([
	Mouse document
	Touch document
])

canvas = document.getElementById "ribbons"
context = canvas.getContext "2d"
drawing = Drawing inputs, canvas, context

drawing.startRender()
