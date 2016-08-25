'use strict';

var _window = self || window;
var head = document.head || document.getElementsByTagName('head')[0];

var assign = Object.assign;
var extend = assign;

function isObject(value) {
  return typeof value === 'object' && value !== null;
}
function isFunction(value) {
  return typeof value === 'function';
}
function isNode(value) {
  return value instanceof _window.Node;
}
if (!Array.isArray) {
  var op2str = Object.prototype.toString;
  Array.isArray = function (a) {
    return op2str.call(a) === '[object Array]';
  };
}
function isArray(value) {
  return Array.isArray(value); //return isset(value) && value instanceof Array;
}
function isset(value) {
  return value !== undefined;
}
function result(object, key) {
  if (isObject(object)) {
    var value = object[key];
    return isFunction(value) ? object[key]() : value;
  }
}
function inherits(protoProps, staticProps) {
  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var _parent = this;
  var child;
  // The constructor function for the new subclass is either defined by you
  // (the 'constructor' property in your `extend` definition), or defaulted
  // by us to simply call the parent's constructor.
  if (isset(protoProps) && protoProps.hasOwnProperty('constructor')) {
    child = protoProps.constructor;
  } else {
    child = function child() {
      return _parent.apply(this, arguments);
    };
  }

  // Add static properties to the constructor function, if supplied.
  extend(child, _parent, staticProps);
  // Set the prototype chain to inherit from `parent`, without calling
  // `parent`'s constructor function.
  var Surrogate = function Surrogate() {
    this.constructor = child;
  };
  Surrogate.prototype = _parent.prototype;
  child.prototype = new Surrogate();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (isset(protoProps)) {
    extend(child.prototype, protoProps);
  }

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = _parent.prototype;

  return child;
}
function noop() {}

var slice = Array.prototype.slice;
var Events = {
  // Bind an event to a `callback` function. Passing `"all"` will bind
  // the callback to all events fired.
  on: function on(name, callback, context) {
    if (!eventsApi(this, 'on', name, [callback, context]) || !callback) {
      return this;
    }
    if (!this._events) {
      this._events = {};
    }
    var events = this._events[name] || (this._events[name] = []);
    events.push({
      callback: callback,
      context: context,
      ctx: context || this
    });
    return this;
  },

  // Bind an event to only be triggered a single time. After the first time
  // the callback is invoked, it will be removed.
  once: function once(name, callback, context) {
    if (!eventsApi(this, 'once', name, [callback, context]) || !callback) {
      return this;
    }
    var self = this;
    var _once = _once2(function () {
      self.off(name, _once);
      callback.apply(this, arguments);
    });
    _once._callback = callback;
    return this.on(name, _once, context);
  },

  // Remove one or many callbacks. If `context` is null, removes all
  // callbacks with that function. If `callback` is null, removes all
  // callbacks for the event. If `name` is null, removes all bound
  // callbacks for all events.
  off: function off(name, callback, context) {
    var retain, ev, events, names, i, l, j, k;
    if (!this._events || !eventsApi(this, 'off', name, [callback, context])) {
      return this;
    }
    if (!name && !callback && !context) {
      this._events = {};
      return this;
    }
    names = name ? [name] : Object.keys(this._events);
    for (i = 0, l = names.length; i < l; i++) {
      name = names[i];
      events = this._events[name];
      if (events) {
        this._events[name] = retain = [];
        if (callback || context) {
          for (j = 0, k = events.length; j < k; j++) {
            ev = events[j];
            if (callback && callback !== ev.callback && callback !== ev.callback._callback || context && context !== ev.context) {
              retain.push(ev);
            }
          }
        }
        if (!retain.length) {
          delete this._events[name];
        }
      }
    }

    return this;
  },

  // Trigger one or many events, firing all bound callbacks. Callbacks are
  // passed the same arguments as `trigger` is, apart from the event name
  // (unless you're listening on `"all"`, which will cause your callback to
  // receive the true name of the event as the first argument).
  trigger: function trigger(name) {
    if (!this._events) {
      return this;
    }
    var args = slice.call(arguments, 1);
    if (!eventsApi(this, 'trigger', name, args)) {
      return this;
    }
    var events = this._events[name];
    var allEvents = this._events.all;
    if (events) {
      triggerEvents(events, args);
    }
    if (allEvents) {
      triggerEvents(allEvents, arguments);
    }
    return this;
  },

  // Tell this object to stop listening to either specific events ... or
  // to every object it's currently listening to.
  stopListening: function stopListening(obj, name, callback) {
    var listeningTo = this._listeningTo;
    if (!listeningTo) {
      return this;
    }
    var remove = !name && !callback;
    if (!callback && typeof name === 'object') {
      callback = this;
    }
    if (obj) {
      (listeningTo = {})[obj._listenId] = obj;
    }
    for (var id in listeningTo) {
      obj = listeningTo[id];
      obj.off(name, callback, this);
      if (remove || !Object.keys(obj._events).length) {
        delete this._listeningTo[id];
      }
    }
    return this;
  }
};
// Regular expression used to split event strings.
var eventSplitter = /\s+/;
var listenMethods = {
  listenTo: 'on',
  listenToOnce: 'once'
};
var uniqueId = 0;
// Inversion-of-control versions of `on` and `once`. Tell *this* object to
// listen to an event in another object ... keeping track of what it's
// listening to.
var implementation;

for (var method in listenMethods) {
  implementation = listenMethods[method];
  Events[method] = function (obj, name, callback) {
    var listeningTo = this._listeningTo || (this._listeningTo = {});
    var id = obj._listenId || (obj._listenId = 'l_' + uniqueId++);
    listeningTo[id] = obj;
    if (!callback && typeof name === 'object') {
      callback = this;
    }
    obj[implementation](name, callback, this);
    return this;
  };
}

function _once2(func) {
  var ran, result;

  if (!isFunction(func)) {
    throw new TypeError();
  }
  return function () {
    if (ran) {
      return result;
    }
    ran = true;
    result = func.apply(this, arguments);

    // clear the `func` variable so the function may be garbage collected
    func = null;
    return result;
  };
}

// Implement fancy features of the Events API such as multiple event
// names `"change blur"` and jQuery-style event maps `{change: action}`
// in terms of the existing API.
function eventsApi(obj, action, name, rest) {
  if (!name) {
    return true;
  }

  // Handle event maps.
  if (typeof name === 'object') {
    for (var key in name) {
      obj[action].apply(obj, [key, name[key]].concat(rest));
    }
    return false;
  }

  // Handle space separated event names.
  if (eventSplitter.test(name)) {
    var names = name.split(eventSplitter);
    for (var i = 0, l = names.length; i < l; i++) {
      obj[action].apply(obj, [names[i]].concat(rest));
    }
    return false;
  }

  return true;
}

// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
function triggerEvents(events, args) {
  var ev,
      i = -1,
      l = events.length,
      a1 = args[0],
      a2 = args[1],
      a3 = args[2];
  switch (args.length) {
    case 0:
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx);
      }
      return;
    case 1:
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1);
      }
      return;
    case 2:
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1, a2);
      }
      return;
    case 3:
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
      }
      return;
    default:
      while (++i < l) {
        (ev = events[i]).callback.apply(ev.ctx, args);
      }
  }
}

function Eventable(target) {
  return Object.assign(target, Events);
}

var UID = 0;

function View() {
  var _this2 = this;

  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  this.cid = UID++;
  this.garbage = [];

  if (isFunction(options.stopPreloader)) {
    this.stopPreloader = options.stopPreloader;
  }
  if (!options.template && !this.template) {
    throw 'no template found, must be specified';
  }
  if (options.template) {
    this.template = options.template;
  }
  var el = isNode(options) ? options : isNode(options.el) ? options.el : false;
  if (el) {
    this.render(el);
  }
  if (options.clone) {
    options.clone(this, this.template);
  }
  this.el = this.template.el;
  this.delegateEvents();
  if (this.template.isRendered) {
    this.template.reset(Object.assign({}, this.defaults, options.defaults, options.args));
  }
  if (this.listenIn) {
    if (this.template.isRendered) {
      this._listenIn(this.listenIn);
    } else {
      this.once('rendered', function () {
        return _this2._listenIn(_this2.listenIn);
      });
    }
  }

  if (this.init !== noop) {
    this.init(options);
  }
  return this;
}
View.assign = inherits;

Object.assign(Eventable(View.prototype), {
  init: noop, // Set initial component state without triggering re-render
  didInsertElement: noop, //Provides opportunity for manual DOM manipulation
  //willReceiveAttrs: noop,//React to changes in component attributes, so that setState can be invoked before render
  //shouldUpdate: noop,//Gives a component an opportunity to reject downstream revalidation
  //willUpdate: noop,//Invoked before a template is re-rendered to give the component an opportunity to inspect the DOM before updates have been applied
  //didUpdate: noop,//Invoked after a template is re-rendered to give the component an opportunity to update the DOM
  willDestroyElement: noop, //The inverse of didInsertElement; clean up anything set up in that hook
  //willRender: noop,//executed both after init and after willUpdate*
  didRender: noop, //executed both after didInsertElement and didUpdate*
  // *These hooks can be used in cases where the setup for initial render and subsequent re-renders is idempotent instead of duplicating the logic in both places. In most cases, it is better to try to make these hooks idempotent, in keeping with the spirit of "re-render from scratch every time"
  umount: noop,
  add: function add(somethingToRemove) {
    if (Array.isArray(somethingToRemove)) {
      this.garbage = this.garbage.concat(somethingToRemove);
    } else {
      this.garbage.push(somethingToRemove);
    }
    return this;
  },
  $: function $(selector) {
    return this.el.find(selector);
  },
  render: function render(root) {
    this.template.render(root);
    if (this.didInsertElement !== noop) {
      this.didInsertElement(root);
    }
    this.el = this.template.el;
    this.delegateEvents();
    if (this.didRender !== noop) {
      this.didRender(root);
    }
    this.trigger('rendered', root);
    return this;
  },

  // Remove this view by taking the element out of the DOM, and removing any
  // applicable Backbone.Events listeners.
  remove: function remove() {
    if (this.el) {
      this.el.off();
    }
    this.off();
    if (this.garbage.length > 0) {
      this.garbage.map(function (g) {
        return g.remove();
      });
    }
    if (this.willDestroyElement !== noop) {
      this.willDestroyElement();
    }
    if (this.template && this.template.remove) {
      this.template.remove();
    }
    /*
     var parent = this.el.parent();
    if (parent !== null) {
      parent.removeChild(this.el);
    }
    this.off();*/

    /*if (this.removed !== noop) {
      this.removed();
    }*/
    return this;
  },

  // Set callbacks, where `this.events` is a hash of
  //
  // *{"event selector": "callback"}*
  //
  //     {
  //       'mousedown .title':  'edit',
  //       'click .button':     'save',
  //       'click .open':       function(e) { ... }
  //     }
  //
  // pairs. Callbacks will be bound to the view, with `this` set properly.
  // Uses event delegation for efficiency.
  // Omitting the selector binds the event to `this.el`.
  // This only works for delegate-able events: not `focus`, `blur`, and
  // not `change`, `submit`, and `reset` in Internet Explorer.
  delegateEvents: function delegateEvents(inputEvents) {
    if (!this.el) {
      return this;
    }
    var events;
    if (isset(inputEvents)) {
      events = inputEvents;
    } else if (isset(this.events)) {
      events = result(this, 'events');
    } else {
      return this;
    }
    if (isObject(events)) {
      // we have valid map of events
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!isFunction(method)) {
          method = this[events[key]];
          if (!isFunction(method)) {
            continue;
          }
        }
        this.el.on(key, method, this);
      }
    }
    return this;
  },
  delegateSpecialEvents: function delegateSpecialEvents() {
    /*  if (this.e) {
        Object.keys(this.e).map(key => {
          var match = key.match(/\{[\w\d]+\}/gi);
          if (match !== null) {
            var d =  match.reduce((acc, val) => acc.replace(val, ''), key);
          }
          return '';
        });
      }*/
  },
  _listenIn: function _listenIn(child) {
    var _this3 = this;

    if (isArray(child)) {
      return child.forEach(function (c) {
        return _this3._listenIn(c);
      });
    }
    if (child) {
      var Child = this.template.get(child);
      var _this = this;
      if (Child && Child.on) {
        Child.on('all', function (name, a1, a2, a3, a4) {
          if (a4 === undefined) {
            _this.trigger(child + ':' + name, a1, a2, a3);
          } else {
            _this.trigger.call(this, [child + ':' + name].concat(arguments.slice(1)));
          }
        });
      }
    }
  },
  parse: function parse(values) {
    this.state = this.state || {};
    this.args = this.args || {};
    this.state = Object.assign(this.args, values);
    return this.state;
  },

  // Clears all callbacks previously bound to the view with `delegateEvents`.
  // You usually don't need to use this, but may wish to if you have multiple
  // Backbone views attached to the same DOM element.
  undelegateEvents: function undelegateEvents() {
    if (!this.el) {
      return this;
    }
    this.el.off();
    return this;
  },
  set: function set(key, value) {
    var _this4 = this;

    if (key === undefined) {
      return this;
    }
    this.state = this.state || {};
    this.args = this.args || {};
    var values = {};
    if (typeof key === 'object') {
      values = key;
    } else {
      values[key] = value;
    }
    var vals = this.state = this.parse(Object.assign(this.args, values));
    if (isset(this.tKeys)) {
      vals = this.tKeys.reduce(function (acc, val) {
        if (val in _this4.state) {
          acc[val] = _this4.state[val];
        }
        return acc;
      }, {});
    }
    this.template.set(vals);
    return this;
  }
});

module.exports = View;

