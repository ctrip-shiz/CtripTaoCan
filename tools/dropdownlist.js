// drop down select list
define(function (require, exports, module){

   var S = require('common').S;

   var DropDownList = function (pnl, itemTag){
        this.pnl = pnl;
        this.trigger = undefined;
        this._hideTimer = undefined;
        this._itemTag = itemTag || 'A';
    }

    DropDownList.prototype = {
        constructor: DropDownList,
        
        show: function (e){
            clearTimeout(this._hideTimer);
            if(S.next(this.trigger) != this.pnl[0]){ 
                // not insert twice, it will block ui in ie
                S.insertAfter(this.pnl, this.trigger);
            }
            S.show(this.pnl);
        },
        
        hide: function (e){
            var pnl = this.pnl;
            this._hideTimer = setTimeout(function () {
                S.hide(pnl);   
            }, 100);
            
        },
        
        select: function (e){
            var target = e.target;
            if(target.nodeName != this._itemTag)
                target = e.target = target.parentNode;
            if(target.nodeName != this._itemTag) 
                return;
            this.trigger.onSelect(e);
            this.hide();
        },
        
        reg: function (triggers, onSelect, triggerEvt){
            var self = this;
            
			var trigger;
			if($.type(triggers) == 'array'){
				// Set the first trigger as the main one
				// Not every trigger is contained in the main trigger, 
				// especially when the main trigger is an input which can not contain any element
				trigger = triggers[0];
			}else{
				trigger = triggers;
				triggers = [trigger];
			}
			
            triggerEvt = triggerEvt || 'mouseover';
        
            trigger.onSelect = onSelect;

            this.pnl.bind('click', this.select.bind(this));

            if(triggerEvt == 'mouseover'){
                this.pnl
                    .bind('mouseenter', this.show.bind(this))
                    .bind('mouseleave', this.hide.bind(this));
            }else{
                // `blur` will be triggered when mousedown happen on other element
                $(document).bind('click', function (e) {
                    self.hide();
                });
            }
        
            triggers.each(function (item){
				item.bind(triggerEvt, function (e){
                    self.trigger = trigger;
                    self.show(e);
                    e.stopPropagation();
                });
			});
        }
    }

    function hacklib () {
        var orginBind = $.fn.bind;

        var mapping = {
            'mouseenter': 'mouseover',
            'mouseleave': 'mouseout' 
        }

        $.fn.bind = function (evtName, fn) {
            var args = Array.prototype.slice.call(arguments);
            if(evtName !== 'mouseenter' && evtName !== 'mouseleave')
                return orginBind.apply(this, args);
            
            var target = this[0];

            var fnWrapper = function (e) {
                var related = e.relatedTarget;
                if ( !related || (related !== target && !(target.compareDocumentPosition(related) & 16)) )
                    fn(e);
                    
            }

            return orginBind.apply(this, [mapping[evtName], fnWrapper]);
        }
    }

    if( !('onmouseenter' in document.createElement('div')) )
        hacklib();

    module.exports = DropDownList;
});
