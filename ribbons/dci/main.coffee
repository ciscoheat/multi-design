###
Fiddle around with it: http://jsfiddle.net/6pddkcsr/
###

##### Drawing #####

Drawing = (canvas, context) ->
	##### Roles and RoleMethods #####

	ribbons = []

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
		# Find all ribbons with id
		withId: (id) ->
			ribbons.filter((r) -> r.id() is id)

		add: (id, pos) ->
			for ribbon in ribbons.withId id
				ribbon.close() 

			ribbon = Ribbon context, id
			ribbon.extend pos
			ribbons.push ribbon

		remove: (ribbon) ->
			ribbon.close()
			i = ribbons.indexOf ribbon			
			ribbons.splice i, 1 if i >= 0

		draw: ->
			#context.save()
			ribbons.map (ribbon) ->	ribbon.draw()
			#context.restore()
			window.requestAnimationFrame context.fillBackground

		trim: ->
			ribbons.map (ribbon) ->
				ribbon.trim()
				ribbons.remove ribbon if ribbon.isDone()

		jitter: ->
			ribbons.map (ribbon) -> 
				ribbon.jitter()

	##### System Operations #####

	startRender: ->
		window.setInterval ribbons.trim, 30
		window.setInterval ribbons.jitter, 10
		window.requestAnimationFrame context.fillBackground

	addRibbon: (id, ev) -> 
		ribbons.add id, canvas.position ev

	extendRibbon: (id, ev) ->
		for ribbon in ribbons.withId id
			ribbon.extend canvas.position ev

	closeRibbon: (id) ->
		for ribbon in ribbons.withId id
			ribbon.close()

##### Ribbon #####

Ribbon = (context, id) ->
	##### Roles and RoleMethods #####

	context = context

	##### State #####

	id = id
	closed = false
	color = randomColor()
	width = 4

	self = extended [],

		##### System Operations #####

		id: -> id
		isClosed: -> closed
		close: -> closed = true

		extend: (p) ->
			return if self.isClosed()
			return self.push p if self.length is 0

			last = self[self.length - 1]
			self.push p if manhattan(last, p) > 10

		isDone: ->
			self.isClosed() and self.length < 3

		jitter: ->
			self.map (p) ->
				p.x += Math.random() * 2 - 1
				p.y += Math.random() * 2 - 1

		trim: ->
			self.shift() if self.isClosed() or (self.length > 2)

		draw: ->
			context.strokeStyle = color
			context.lineWidth = width

			context.beginPath()
			context.moveTo self[0].x, self[0].y

			i = 1
			while i < self.length
				context.lineTo self[i].x, self[i].y
				i += 1

			context.stroke()

##### Inputs handling #####

# composits multiple inputs
Inputs = (inputs, drawing) ->

	##### Roles and RoleMethods #####

	drawing = drawing
	context = context

	inputs = extended inputs,
		when: (events) ->
			inputs.map (input) ->
				input.listenTo events

	##### System Operations #####

	startTracking: ->
		inputs.when
			down: (id, ev) -> drawing.addRibbon id, ev
			move: (id, ev) -> drawing.extendRibbon id, ev
			up: (id, ev) -> drawing.closeRibbon id

##### Specific input #####

# handles "down", "move", "up" events
Mouse = (element) ->
	bindings = {}

	whenEvent element, "mouse", "down move up", (action, ev) ->
		fn = bindings[action]
		fn and fn("mouse", ev)

	listenTo: (events) ->
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

	listenTo: (events) ->
		bindings = events

##### Utilities #####

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

##### Setup and start Drawing #####

canvas = document.getElementById "ribbons"
context = canvas.getContext "2d"

drawing = Drawing canvas, context
inputs = Inputs [Mouse canvas, Touch canvas], drawing

drawing.startRender()
inputs.startTracking()
