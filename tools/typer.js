// user type listener mod
define(function (require, exports, module){
	/*
	* @class a listner which will create a real-time timer to get what the user type
	* @constructor
	* @param the target textbox
	* @param the function which will be called when the input changed (params: inputText)
	*/
	var Typer = function (textbox, callback) {
		if (!textbox || typeof callback !== 'function')
			return null;
		this._textbox = typeof textbox.bind === 'function' ? textbox : $(textbox);
		this._callback = callback;
		this._input = '';
		this._timer = undefined;

		this._init();
	}
	Typer.interval = 200;
	Typer.prototype = {
		constructor: Typer,

		_init: function () {
			var _this = this;
			this._textbox.bind('focus', function (e) {
				_this.start();
			});
			this._textbox.bind('blur', function (e) {
				_this.stop();
			});
		},

		_tick: function () {
			var oldInput = this._input;
			this._input = this._textbox.value().trim();
			if (oldInput != this._input && typeof this._callback === 'function') {
				this._callback(this._input);
			}

			this._timer = setTimeout(this._tick.bind(this), Typer.interval);
		},

		start: function () {
			var _this = this;
			this.stop();
			this._input = this._textbox.value().trim();
			this._timer = setTimeout(this._tick.bind(this), Typer.interval);
		},

		stop: function () {
			var _this = this;
			// clear later for getting the last input
			setTimeout(function () {
				clearTimeout(this._timer);
			}, Typer.interval);
		}
	}

	module.exports = Typer;

});