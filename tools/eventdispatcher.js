// event dispatcher 
define(function (require, exports, module){

	var EventDispatcher = function (opts) {
        if(!opts.ctx) return;

		var defaults = {
			selector: 'a', 
			event: 'click', // multi-event: click change
			level: 1
        }

		opts = opts ? $.extend(defaults, opts) : defaults;

		var self = this;
        opts.event.split(' ').each(function(evtName, i){
            opts.ctx.bind(evtName, self.dispatchEvent.bind(self, opts));
        });

        this._params = [];// command parameters
	}

	EventDispatcher.prototype.dispatchEvent = function (opts, e) {
		var target = e.target;

		target = this.matchNode(target, opts);
		if(!target) return;

		var func = this.matchFunc(target, opts.cmds) || opts.func;

        if(func){
            this._params.push(e);
            func.apply(target, this._params);
            if (e.target.nodeName == 'A') // prevent default link action
                e.preventDefault();
        }
	}

	EventDispatcher.prototype.getParams = function (target) {
		var params = target.getAttribute('data-params');
		params = params ? $.parseJSON('[' + params + ']') : [];
		params.push(target);
		return params;
	}

    // match the command node with Sizzle
	EventDispatcher.prototype.matchNode = function (element, opts) {
        var self = this;
		var target = element, i = 0;

		opts.level = typeof opts.level === 'number' && opts.level > 0 ? opts.level : 0;

		while(i++ <= opts.level){
            if(Sizzle.matchesSelector(target, opts.selector)){
                self._params = self.getParams(target);
                return target;
            }
            target = target.parentNode;
		}

        return null;
	}

	EventDispatcher.prototype.matchFunc = function (element, cmds) {
        if(!cmds) return;
		for (var i = 0, len = cmds.length; i < len; i++) {
			if(this.matchNode(element, cmds[i])){
				return cmds[i].func;
			}
		}
	}

	module.exports = EventDispatcher;
});
