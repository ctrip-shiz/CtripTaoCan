
define(function (require, exports, module){
	// lib fix
    var S = {
        // // get the sibling or first-child or last-child element
        _elem: function (el, exp, which) {
            if (typeof el.bind === 'function')
                el = el[0];

            var which1 = which + 'ElementSibling',
                which2 = which + 'Sibling';
            if (which == 'first' || which == 'last') {
                which1 = which + 'ElementChild',
                which2 = which + 'Child';
            } else if (which == 'parent') {
                which1 = which2 = 'parentNode';
            }

            var elem;
            elem = el[which1] || el[which2];
            while ((elem && elem.nodeType != 1) || (elem && exp && !Sizzle.matchesSelector(elem, exp))) {
                elem = elem[which2];
            }

            return elem;
        },
        // get the prev element of the specified one
        prev: function (el, exp) {
            return S._elem(el, exp, 'previous');
        },
        // get the next element of the specified one
        next: function (el, exp) {
            return S._elem(el, exp, 'next');
        },
        // get the first element child of the specified one
        firstChild: function (el, exp) {
            return S._elem(el, exp, 'first');
        },
        // get the last element child of the specified one
        lastChild: function (el, exp) {
            return S._elem(el, exp, 'last');
        },
        // get the parent of the specified one
        parent: function (el, exp) {
            return S._elem(el, exp, 'parent');
        },
        // insert one element before another
        insertBefore: function (a, b) {
            if (typeof a.bind === 'function')
                a = a[0];
            if (typeof b.bind === 'function')
                b = b[0];

            b.parentNode.insertBefore(a, b);
        },
        // insert one element after another
        insertAfter: function (a, b) {
            if (typeof a.bind === 'function')
                a = a[0];
            if (typeof b.bind === 'function')
                b = b[0];

            var parent = b.parentNode;
            var last = parent.lastChild;
            if (last == b) {
                parent.appendChild(a);
            } else {
                var next = S.next(b);
                parent.insertBefore(a, next);
            }
        },
        
        // show element
        show: function (el) {
            if (!el)
                return; // Fault Tolerance
            if (typeof el.removeClass !== 'function')
                el = $(el);
            el.removeClass('hidden');
        },
        // hide element
        hide: function (el) {
            if (!el)
                return; // Fault Tolerance
            if (typeof el.addClass !== 'function')
                el = $(el);
            el.addClass('hidden');
        },
        
        // fire the event
        trigger: function (target, evtName) {
            if (!target)
                return; // Fault Tolerance
            if (typeof target.bind === 'function')
                target = target[0];
            if (target.dispatchEvent) {
                var evt = document.createEvent('Event');
                evt.initEvent(evtName, true, true);
                target.dispatchEvent(evt);
            } else {
                target.fireEvent('on' + evtName);
            }
        },
        // fix the event（mainly used in the page inline function）
        // it calls the cQuery lib function to short the code
        fix: function (evt) {
            //return cQuery.event.fixProperty(evt, null);
            if (!evt.preventDefault) {
                evt.preventDefault = function () {
                    evt.returnValue = false;
                }
            }
            if (!evt.stopPropagation) {
                evt.stopPropagation = function () {
                    evt.cancelBubble = true;
                }
            }
            if (!evt.stop) {
                evt.stop = function () {
                    this.preventDefault();
                    this.stopPropagation();
                }
            }
            return evt;
        },
        
        // change the HtmlCollection or NodeList to array
        toArray: function (list) {
            try {
                return Array.prototype.slice.apply(list)
            } catch (e) {
                var arr = [];
                for (var i = 0, l = list.length; i < l; i++) {
                    arr.push(list[i]);
                }
                return arr;
            }
        },
        // format the $\d width the args
        format: function (str) {
            var args = arguments;
            if (args.length == 0)
                return str;
            return str.replace(/\$(\d)/g, function (w, d) {
                return args[d] == undefined ? '' : args[d];
            });
        },
        
        // limit the number of submit action in a short time
        limitSubmit: function (fm) {
            // to solve the problem that onsubmit event couldn't be triggered when calling the form submit method
            // and use the closure to keep 'isSubmit'
            var originalSubmit = fm.submit,
            isSubmit = false,
            resetTimer; // use for reset the 'isSubmit'

            fm.submit = function () {
                if (isSubmit) {
                    return;
                } else {
                    isSubmit = true;
                    setTimer();
                }

                try {
                    originalSubmit.apply(fm);
                } catch (e) {
                    originalSubmit();
                }
            }

            fm.onsubmit = function () {
                if (isSubmit)
                    return false;
                isSubmit = true;
                setTimer();
            }

            function setTimer() {
                clearTimeout(resetTimer);
                resetTimer = setTimeout(function () {
                    isSubmit = false;
                }, 2000);
            }
        },
        /*
        * @function get the difference between two date on the specified interval
        * @param {date} date
        * @param {date} date
        * @param {string} interval
        * @param {boolean} whether do a precise action
        * @return {number}} the difference
        */
        dateDiff: function (date1, date2, interval, isPrecise) {
            if ($.type(date1) !== 'date')
                date1 = date1.toDate();
            if ($.type(date2) !== 'date')
                date2 = date2.toDate();

            //do not check the input
            var timeDiff = Math.abs(date1.getTime() - date2.getTime());

            switch (interval) {
                case 'S':
                    return timeDiff;
                case 's':
                    return Math.round(timeDiff / 1000);
                case 'm':
                    return Math.round(timeDiff / 1000 / 60);
                case 'h':
                    return Math.round(timeDiff / 1000 / 60 / 60);
                case 'd':
                    return Math.round(timeDiff / 1000 / 60 / 60 / 24);
                case 'M':
                    return Math.abs(
                    (date1.getFullYear() - date2.getFullYear()) * 12 +
                    (date1.getMonth() - date2.getMonth()));
                case 'y':
                    return Math.abs(date1.getFullYear() - date2.getFullYear());
                default:
                    return null;
            }
        },
        /**
        *@function to post data to specified url
        *@param { string | object  | null} the url or the element or null(it will post back)
        *@param { object } the event
        */
        postForm: function (foo, event) {
            if (event) {
                var evt = S.fix(event);
                evt.preventDefault();
                evt.stopPropagation();
            }

            fm.target = '_self';

            var url;
            if (typeof foo === "string")
                url = foo;
            else {
                if (!foo || (!foo.href && !foo.getAttribute('href')))
                    url = fm.action;
                else {
                    url = foo.href || foo.getAttribute('href');
                    fm.target = foo.target || '_self';
                }
            }

            url = /^(javascript:)/i.test(url) ? window.location.href : url;
            fm.action = url;
            fm.submit();
        },
        // create element with html
        create: function (html) {
            html = html.trim(); // fix TextNode bug
            // The cached element will be removed, when the function is invoked
            // and the element is not appended to the dom tree.
            var _tmpEl = document.createElement('div');
            _tmpEl.innerHTML = html;
            var ret = _tmpEl.firstChild;

            if(ret.nodeType != 1 || _tmpEl.childNodes.length > 2){
                // try to parse the html
                var rTag = /<([\w:]+)([^\>]*)>/;
                var matches = html.match(rTag);
                if(!matches) return null;
                // create tr/td element
                var tagName = matches[1];
                if(tagName == 'tr' || tagName == 'td'){
                    var htmlTable = tagName == 'tr' ?
                        "<table><tbody>" + html + "</tbody></table>" : 
                        "<table><tbody><tr>" + html + "</tr></tbody></table>";
                    var table = S.create(htmlTable);
                    return tagName == 'tr' ?
                        table.rows[0] : table.rows[0].cells[0];
                }
                
                return null;
            }

            return ret;
        },
        // serialize form
        formSerialize: function (fm) {
            var rInput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i;
            var rSelectTextarea = /^(?:select|textarea)/i;

            var els = fm.elements ? S.toArray(fm.elements) : [];
            var ret = {};
            els.each(function (el, i) {
                if (el.name && !el.disabled && (el.checked || rSelectTextarea.test(el.nodeName) || rInput.test(el.type))) {
                    if (el.name in ret) {
                        ret[el.name] += (',' + el.value);
                    } else {
                        ret[el.name] = el.value;
                    }
                }
            });
            return ret;

        },
        
        // get element height
        height: function (el) {
            if (typeof el.css !== 'function')
                el = $(el);
            var height = parseInt(el.css('height'));
            isNaN(height) && (height = el[0].offsetHeight);
            return height;
        },
        // get element width
        width: function (el) {
            if (typeof el.css !== 'function')
                el = $(el);
            var width = parseInt(el.css('width'));
            isNaN(width) && (width = el[0].offsetWidth);
            return width;
        }
    }
    
    // mod helper
    var Mod = {
        // show invalid tips
        showTips: function (obj, msg, isScroll) {
            if(!Mod.formValidator)
                Mod.formValidator = $(document).regMod("validate", "1.1");
            if (typeof obj.bind !== 'function')
                obj = $(obj);
            Mod.formValidator.method("show", {
                $obj: obj,
                data: msg,
                removeErrorClass: true,
                hideEvent: "blur",
                isFocus: true,
				isScroll: isScroll
            });
            return false;
        },
        /*
         * @function 
            show loading in target context
         * @param {DomElement} target context
         * @param {String} loading message
         */
        showLoading: function (ctx, msg){
            if(typeof ctx.bind === 'function')
                ctx = ctx[0];
            var h = S.height(ctx),
                w = S.width(ctx),
                paddingTop = Math.abs((h - 80) / 2),
                h2 = Math.abs(h - paddingTop);
            if (ctx._loading) { // 
                ctx._loading.style.width = w + 'px';
                ctx._loading.style.height = h + 'px';
                ctx._loading.style.paddingTop = paddingTop + 'px';
                S.show(ctx._loading);
            } else {
                // the fix method using position absolute depends on the container style
                // this method appending the loading div to the container needs childnodes of the container to be hidden
                var tmplLoading = 
                    '<div style="width:$1px;padding-top:$2px;height:$3px;text-align:center;background-color:#fff;">\
                        <img src="http://pic.c-ctrip.com/common/loading_50.gif" /><br />$4</div>\
                    </div>';
                ctx._loading = S.create(S.format(tmplLoading, w, paddingTop, h, msg || "正在加载，请稍候......"));
                ctx.appendChild(ctx._loading);
            }
        },
        
        hideLoading: function (ctx){
            if(typeof ctx.bind === 'function')
                ctx = ctx[0];
            ctx._loading && S.hide(ctx._loading);
        },
        
        // 初始化查询Loading
        initSubmitLoading: function (){
            function showLoading() {
                $('#divLoading').removeClass('hidden').mask();
                if(cQuery.browser.isIE6 || cQuery.browser.isIE7)
                    setTimeout(function() {
                        $('#divLoading').find('img')[0].src = "http://pic.c-ctrip.com/common/loading_50.gif";
                    }, 50);
            }

            var originalSubmit = fm.submit;

            fm.submit = function () {
                showLoading();

                try {
                    originalSubmit.apply(fm);
                } catch (e) {
                    originalSubmit();
                    // for ie6 fm.submit() bug
                    window.event && (window.event.returnValue = false);
                }
            };

            fm.onsubmit = function () {
                showLoading();
            }
        },
		
		regJMP: function (){
			$(document).regMod('jmp', '1.0');
		}
		
    };

	// extend cquery mask
	;(function ($, exports) {
		var orginMask   = $.fn.mask;
		var orginUnmask = $.fn.unmask;

		$.fn.mask = function (isClickHide, hideCallback) {
			orginMask.call(this);

			if(isClickHide){
				var data = this.data('__mask__');

				if('maskHide' in data) return this;

				var self = this;
				data.stopHide = function(e){
					e.stopPropagation();
				}
				data.maskHide = function(e){
					self.unmask(true);
				}
				data.hideCallback = hideCallback;

				this.bind('click', data.stopHide);
				this.parentNode().bind('click', data.maskHide);

				this.data('__mask__', data);
			}

			return this;
		}
		$.fn.unmask = function (isClickHide) {
			if(isClickHide){
				var data = this.data('__mask__');

				if(!data || !('maskHide' in data)) return orginUnmask.call(this);

				this.unbind('click', data.stopHide);
				this.parentNode().unbind('click', data.maskHide);
				data.hideCallback();
				
				delete data.stopHide;
				delete data.maskHide;
				delete data.hideCallback;
			}
			
			orginUnmask.call(this);

			return this;
		}
	})(cQuery, Mod);
	
    // 回发函数
    function doPost(target, event, url){
        if(typeof target !== 'string'){
            var key = target.getAttribute('data-key'),
                val = target.getAttribute('data-value');
            if(key){
                val = val.split('|');
                key.split('|').each(function(item, i){
                    item && $('#h' + item).value(val[i]);
                });
            }
        }
        S.postForm(url ? url : target, event);
    }
    window.doPost = doPost;
    window.fm = document.forms[0];
    
    exports.S = S;
    exports.Mod = Mod;
});
