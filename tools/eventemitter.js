// event emitter the same with nodejs EventEmitter
define(function (require, exports, module){

    var EventEmitter = function () {
        this._events = {};
    }

    EventEmitter.prototype = {
        constructor: EventEmitter,

        on: function (evtName, handler) {
            if(!(evtName in this._events))
                this._events[evtName] = [];
            this._events[evtName].push(handler);
        },

        off: function (evtName, handler) {
            var events = this._events[evtName];
            if(!events) return;
            for (var i = 0, len = events.length; i < len; i++) {
                if(events[i] == handler){
                    events.splice(i,1);
                    return;
                }
            };
        },

        emit: function (evtName) {
            if(!this._events[evtName]) return;
            var evts = this._events[evtName];
            var args = Array.prototype.slice.apply(arguments);
            args = args.slice(1);
            for(var i=0, len = evts.length; i<len; i++){
                evts[i].apply(this, args);
            }
        }
    }

    EventEmitter.extend = function (target) {
        var eh = new EventEmitter();

        for(var k in eh){
            if(eh.hasOwnProperty(k))
                target[k] = eh[k];
        }
        for(var k in EventEmitter.prototype){
            if(k === 'constructor') continue;
            target[k] = eh[k];
        }

        return target;
    }

    module.exports = EventEmitter;
});
