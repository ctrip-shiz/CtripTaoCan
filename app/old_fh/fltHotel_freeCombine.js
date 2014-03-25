/*
* author:shiz@ctrip.com
* date:2012-07-20
*/
$.mod.load('jmp', '1.0');

window.fm = document.forms[0];

var Mod = {};

// Task mod
;(function (exports){
	"use strict";

	function toArray(args){
		return Array.prototype.slice.call(args);
	}
	
	if(!Array.prototype.forEach)
		Array.prototype.forEach = function (f, _this){
			for (var i=0,n=this.length;i<n;i++)
				f.call(_this,this[i],i,this);
			return this;
		};
	
	///////////////////////////////////////
	
	// constructor / factory method
	var Task = function (){
		if(this instanceof Task)
			this._queue = [];
		else
			return new Task();
	}
	
	var proto = Task.prototype,
		tuples = ['done', 'fail'];
		
	proto.wait = function (func, ctx){
	
		var callbacks = (function (task){
		
			return tuples.map(function (item, i){
				return function (){
					var queue = task._queue,
						args = toArray(arguments);
					var excute = queue.shift();
					
					while(excute){
						if(item == excute.type){
							args = excute.args.concat(args);
							excute.fn.apply(excute.ctx,	args);
						}
						excute = queue.shift();
					}
				}
			});
			
		})(this);
		
		var args = toArray(arguments).slice(2);
		ctx = ctx || this;
		Array.prototype.push.apply(args, callbacks);

		if(this._queue.length == 0){
			// excute first task
			func.apply(ctx, args);
		}else{
			// add the function to the done funcs
			this._queue.push({fn: func, ctx: ctx, args: args, type: 'done'});
			// push a delimiter
			this._queue.push(null);
		}
		
		return this; // keep the chain
	};
	
	tuples.forEach(function(item, i){
		proto[item] = function (funcs, ctx){
			if(funcs){
				if(funcs.constructor !== Array)
					funcs = [funcs];
					
				var queue = this._queue,
					args = toArray(arguments).slice(2);
					
				for(var i=0, len = funcs.length; i<len; i++){
					queue.push({fn: funcs[i], ctx: ctx || this, args: args, type: item});
				}
			}
			
			return this;
		}
	});
	
	exports.Task = Task;
})(Mod);

// An uniform inline js process mod
;(function (exports){

exports.InlineJS = {
    _getMethod: function (target) {
        var jsMethod = target.getAttribute('js_method');
        if (!jsMethod)
            return undefined;

        var method = jsMethod.split('.'), ctx = window;

        for (var i = 0, len = method.length - 1; i < len; i++) {
            ctx = ctx[method[i]];
        }
        return { ctx: ctx, func: ctx[method[len]] };
    },
    _getParams: function (target) {
        var jsParams = target.getAttribute('js_params');
        if (!jsParams)
            return undefined;

        try {
            var params = cQuery.parseJSON('[' + jsParams + ']');
            return params
        } catch (e) {
            return undefined;
        }

    },
    _exec: function (target, e) {
        var method = this._getMethod(target);
        if (method) {
            var params = this._getParams(target) || [];
            params.push(target, e);
            method.func.apply(method.ctx, params);
        }
    },
    init: function () {
        var _this = this;
        $(document).bind('click', function (e) {
            var target = e.target;

            // test that the target is an anchor or input
            // for most of time, the inline js is written on an anchor or input
            // and the event target may be a tag in the target anchor ( here I just treat the target as the direct child of the anchor)
            if (target.nodeName != 'A' && target.nodeName != 'INPUT') {
                target = target.parentNode;
                if (!target || target.nodeName != 'A')
                    return true;
            }

            _this._exec(target, e);
        });
    }
};

})(Mod);

// lib fix
var S = {
    // get the sibling or first-child or last-child element
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
        while ((elem && elem.nodeType != 1) || (exp && !Sizzle.matchesSelector(elem, exp))) {
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
        if (typeof a.bind === 'function') a = a[0];
        if (typeof b.bind === 'function') b = b[0];

        b.parentNode.insertBefore(a, b);
    },
    // insert one element after another
    insertAfter: function (a, b) {
        if (typeof a.bind === 'function') a = a[0];
        if (typeof b.bind === 'function') b = b[0];

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
        if (!el) return; // Fault Tolerance
        if (typeof el.removeClass !== 'function') el = $(el);
        el.removeClass('hidden');
    },
    // hide element
    hide: function (el) {
        if (!el) return; // Fault Tolerance
        if (typeof el.addClass !== 'function') el = $(el);
        el.addClass('hidden');
    },

    // fire the event
    trigger: function (target, evtName) {
        if (!target) return; // Fault Tolerance
        if (typeof target.bind === 'function') target = target[0];
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
        if (args.length == 0) return str;
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
					(date1.getMonth() - date2.getMonth())
				);
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
        }

        var url;
        if (typeof foo === "string")
            url = foo;
        else {
            if (!foo || (!foo.href && !foo.getAttribute('href')))
                url = fm.action;
            else
                url = foo.href || foo.getAttribute('href');
        }

        fm.action = url;
        fm.submit();
    },

    // get root of the url 
    getRootPath: function () {
        var strFullPath = window.document.location.href;
        var strPath = window.document.location.pathname;
        var pos = strFullPath.indexOf(strPath);
        var prePath = strFullPath.substring(0, pos);
        var postPath = strPath.substring(0, strPath.substr(1).indexOf('/') + 1);
        return (prePath + postPath);
    },

    _tmpEl: document.createElement('div'),
    // create element with html
    create: function (html) {
        S._tmpEl.innerHTML = html.trim(); // fix TextNode bug
        return S._tmpEl.firstChild;
    },

    // get the value of the input with notice mod
    noticeVal: function (el) {
        if (typeof el.bind === 'function') el = el[0];
        return el.value.trim() == '' || el.value == el.getAttribute('_cqnotice') ? '' : el.value.trim();
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
};

// inline function
function doPost(foo, event) {
	$('#divLoading').removeClass('hidden').mask();
    S.postForm(foo, event)
}

// namespace flt hotel
var FH = {
    _bookHotelId: undefined,

    _initStrategyTabs: function () {
        var strategyTabs = $('#divStrategy').find('div.r a'),
            curStrategy = $('#hStrategy').value(),
            isCombined = $('#hIsCombined').value();

        strategyTabs.each(function (tab, i) {

            if (i == 2 && isCombined == '1')
                tab.removeClass('hidden');

            var strategy = tab[0].getAttribute('_strategy');
            if (strategy == curStrategy) {
                tab.addClass('current');
            }

            tab.bind('click', function () {
                $('#hStrategy').value(strategy);
                doPost(URL.FREECOMBINE_SEARCH);
                return false;
            });
        });
    },

    _initCalendarView: function () {

        function initCalendar() {
            FH.Calendar = {

                _rDate: /\d{4}\.\d{1,2}/,

                _tmplIcons: ['<span class="icon_flt"></span><span>$1</span>', '<span class="icon_hotel"></span><span>$1</span>'],
                _tmplRoute: '<em>$1</em><div class="my_add_route">$2</div>',
                _tmplDay: '<em>$1</em>',

                _fltHotelData: '', // data string, pattern: @dateStr:fltHotelEnum:count@

                init: function () {
                    var pnl = $('#s_calendar');

                    this.dateDiv = pnl.find('div.date')[0];
                    this.cells = pnl.find('td');
                    this.dateInfo = this.getCurrentDate(); // 保存当前日历显示的年与月
                    this.dayOfWeek = undefined; // help to location the day cell

                    this._initHead(pnl);
                    this._initBody(pnl);

                    this.pnl = pnl;
                },
                _initHead: function (pnl) {
                    var _this = this;

                    this.dateDiv.innerHTML = this.dateDiv.innerHTML.replace(this._rDate, this.dateInfo[0] + '.' + this.dateInfo[1]);

                    $(this.dateDiv).bind('click', function (e) {
                        if (e.target.nodeName != 'A') return;

                        if (e.target.className == 'cal_right') {
                            _this.switchMonth(true);
                        } else {
                            _this.switchMonth(false);
                        }
                    });

                    var btnClose = pnl.find('a.del');
                    if (!btnClose[0]) return;
                    btnClose.bind('click', function () {
                        _this.hide();
                    });
                },
                _initBody: function (pnl) {
                    this.reDrawCalendar(this.dateInfo[0], this.dateInfo[1]);
                },

                _drawFltHotel: function (cells, d, counts) {
                    d = $.type(d) == 'number' ? d : d - 0;
                    var fltIcon = counts[0] > 0 ? S.format(this._tmplIcons[0], counts[0]) : '';
                    var hotelIcon = counts[1] > 0 ? S.format(this._tmplIcons[1], counts[1]) : '';
                    cells[this.dayOfWeek + d - 1].innerHTML = S.format(this._tmplRoute, d, fltIcon + hotelIcon);
                },

                reDrawCalendar: function (y, m) {
                    var cells = this.cells;
                    // reset all the style
                    for (var i = 0, len = cells.length; i < len; i++) {
                        cells[i].className = '';
                    }

                    var startDate = new Date(y, m - 1, 1),
						dayOfWeek = startDate.getDay(),
						lastMonthDate = (new Date(startDate.getTime() - 1000 * 60 * 60 * 24)).getDate(),
						endDay = m == 12 ?
							(new Date(new Date(y + 1, 0, 1) - 1000 * 60 * 60 * 24)).getDate() :
							(new Date(new Date(y, m, 1) - 1000 * 60 * 60 * 24)).getDate(),
						day;

                    this.dayOfWeek = dayOfWeek; // save it everytime the calendar redraw

                    for (var i = 0, len = cells.length; i < len; i++) {
                        if (i < dayOfWeek) {
                            day = lastMonthDate - dayOfWeek + i + 1;
                            cells[i].className = 'disable';
                        } else if (i - dayOfWeek + 1 > endDay) {
                            day = i - dayOfWeek + 1 - endDay;
                            cells[i].className = 'disable';
                        } else {
                            day = i - dayOfWeek + 1;
                        }
                        cells[i].innerHTML = S.format(this._tmplDay, day);
                    }

                    // today
                    var today = this.getCurrentDate();
                    if (y == today[0] && m == today[1]) {
                        cells[dayOfWeek + today[2] - 1].className = 'today';
                    }
                    // flight hotel icon
                    var fltHotels = this.queryFltHotelData(y, m);
                    for (var k in fltHotels) {
                        this._drawFltHotel(cells, k, fltHotels[k]);
                    }
                },

                queryFltHotelData: function (y, m) {
                    if (this._fltHotelData == '') return null;

                    var ret = {}, // ret[day][which] = count
						rYM = new RegExp(S.format('@$1-\\d?$2-(\\d{1,2}):(\\d):(\\d)', y, m), 'g'),
						matches = null;

                    do {
                        matches = rYM.exec(this._fltHotelData);
                        if (matches == null || matches.length < 1) break;

                        if (!ret[matches[1]])
                            ret[matches[1]] = [0, 0]; // give a default to avoid the undefined value
                        ret[matches[1]][matches[2]] = matches[3];

                    } while (matches);

                    return ret;
                },

                _normalizeDateStr: function (dateStr) {
                    return dateStr.replace(/-(\d+)/g, function (w, m, i) {
                        return '-' + (m.length == 2 ? m : '0' + m);
                    });
                },
                addFltHotelData: function (dateStr, which, count) {
                    dateStr = this._normalizeDateStr(dateStr);
                    var counts = [0, 0], //give the default value of int
						r = new RegExp(S.format('@$1:(\\d):(\\d)', dateStr), 'g'),
						r2 = new RegExp(S.format('@$1:$2:(\\d)', dateStr, which), 'g'),
						matches = [], match = null, isMatch = false;

                    do {
                        match = r.exec(this._fltHotelData);
                        if (match) {
                            matches.push(match);
                        }
                    } while (match);

                    counts[which] += (count ? count : 1);
                    for (var i = 0, len = matches.length; i < len; i++) {
                        if (matches[i][1] == which) {
                            isMatch = true;
                            counts[which] += (matches[i][2] - 0); //加上原有的
                            this._fltHotelData =
								this._fltHotelData.replace(r2, function (w, m, i) {
								    return '@' + dateStr + ':' + which + ':' + counts[which];
								});
                        } else {
                            counts[matches[i][1]] = (matches[i][2] - 0);
                        }
                    }
                    if (!isMatch) { //原来没有时追加
                        this._fltHotelData += S.format('@$1:$2:$3', dateStr, which, (count ? count : 1));
                    }

                    return counts;
                },
                removeFltHotelData: function (dateStr, which, count) {
                    dateStr = this._normalizeDateStr(dateStr);
                    var counts = [0, 0], //give the default value of int
						r = new RegExp(S.format('@$1:(\\d):(\\d)', dateStr), 'g'),
						r2 = new RegExp(S.format('@$1:$2:(\\d)', dateStr, which), 'g'),
						matches = [], match = null, isMatch = false;

                    do {
                        match = r.exec(this._fltHotelData);
                        if (match) {
                            matches.push(match);
                        }
                    } while (match);

                    counts[which] -= (count ? count : 1);
                    for (var i = 0, len = matches.length; i < len; i++) {
                        if (matches[i][1] == which) {
                            isMatch = true;
                            counts[which] += (matches[i][2] - 0); //加上原有的
                            if (counts[which] == 0) { // 临界判断
                                this._fltHotelData =
									this._fltHotelData.replace(r2, function (w, m, i) {
									    return '';
									});
                            } else {
                                this._fltHotelData =
									this._fltHotelData.replace(r2, function (w, m, i) {
									    return '@' + dateStr + ':' + which + ':' + counts[which];
									});
                            }
                        } else {
                            counts[matches[i][1]] = (matches[i][2] - 0);
                        }
                    }
                    if (!isMatch) { //原来没有时返回0
                        counts[which] = 0;
                    }

                    return counts;
                },

                /*
                * @function add the flight or hotel data
                * @param {string} date string ( pattern: yyyy-MM-dd )
                * @param {number} -1-all 0-flight 1-hotel
                * @param {array} [flightcount, hotelcount]
                */
                addFltHotel: function (dateStr, which, count) {
                    var date = dateStr.split('-'), counts;
                    if (which == -1) {
                        // add flt and hotel in the same time
                        counts = count[0] > 0 ? this.addFltHotelData(dateStr, 0, count[0]) : [0, 0];
                        counts = count[1] > 0 ? this.addFltHotelData(dateStr, 1, count[1]) : [counts[0], 0];
                    } else {
                        counts = this.addFltHotelData(dateStr, which, count);
                    }

                    if (date[0] == this.dateInfo[0] && date[1] == this.dateInfo[1])
                        this._drawFltHotel(this.cells, (date[2] - 0), counts);
                },
                /*
                * @function remove the flight or hotel data
                * @param {string} date string ( pattern: yyyy-MM-dd )
                * @param {number} -1-all 0-flight 1-hotel
                * @param {array} [flightcount, hotelcount]
                */
                removeFltHotel: function (dateStr, which, count) {
                    var date = dateStr.split('-'), counts;
                    if (which == -1) {
                        // remove flt and hotel in the same time
                        counts = count[0] > 0 ? this.removeFltHotelData(dateStr, 0, count[0]) : [0, 0];
                        counts = count[1] > 0 ? this.removeFltHotelData(dateStr, 1, count[1]) : [counts[0], 0];
                    } else {
                        counts = this.removeFltHotelData(dateStr, which, count);
                    }

                    if (date[0] == this.dateInfo[0] && date[1] == this.dateInfo[1])
                        this._drawFltHotel(this.cells, (date[2] - 0), counts);
                },

                getCurrentDate: function () {
                    var date = new Date();
                    return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
                },

                switchMonth: function (isNext) {
                    var y = this.dateInfo[0],
					m = this.dateInfo[1];
                    if (isNext) {
                        if (m == 12) {
                            m = 1;
                            y++;
                        } else {
                            m++;
                        }
                    } else {
                        if (m == 1) {
                            m = 12;
                            y--;
                        } else {
                            m--;
                        }
                    }
                    this.switchDate(y, m);
                },

                switchDate: function (y, m) {
                    this.dateDiv.innerHTML = this.dateDiv.innerHTML.replace(this._rDate, y + '.' + m);
                    this.reDrawCalendar(y, m);
                    this.dateInfo = [y, m];
                },

                show: function () {
                    // show before mask, it will compute the pnl offsetWidth in mask function
                    // if the pnl is hidden, the value will be zero
                    this.pnl.removeClass('hidden');
                    this.pnl.mask();
                },
                hide: function () {
                    this.pnl.addClass('hidden');
                    this.pnl.unmask();
                }
            }

            FH.Calendar.init();

            var fltHotelInfo = (function () {
                var ret = {},
					rFlt = /(\d),(\d),(\d),(\d{4}-\d{1,2}-\d{1,2}),(\d{4}-\d{1,2}-\d{1,2})?/g,
					rHotel = /;(\d{4}-\d{1,2}-\d{1,2}),[^,]+,[^,]*,[^,]+,(\d{4}-\d{1,2}-\d{1,2}),(\d)/g,
					fltInfo = $('#hFlightSearchInfo').value(),
					hotelInfo = ';' + $('#hHotelSearchInfo').value(); // to make the first date match the reg

                if (fltInfo != '') {
                    fltInfo.replace(rFlt, function (_, childCount, adultCount, way, departDate, arriveDate) {
                        if (!ret[departDate])
                            ret[departDate] = [0, 0];
                        ret[departDate][0]+= (+childCount) + (+adultCount) ;
                        if (way == '1') {
                            if (!ret[arriveDate])
                                ret[arriveDate] = [0, 0];
                            ret[arriveDate][0]+= (+childCount) + (+adultCount);
                        }
                    });
                }
                if (hotelInfo != '' && hotelInfo != ';') {
                    var d1, d2, dayDiff, i, dateStr;
                    hotelInfo.replace(rHotel, function (_, checkInDate, leaveDate, roomCount) {
                        d1 = checkInDate.toDate(),
						d2 = leaveDate.toDate(),
						dayDiff = S.dateDiff(d1, d2, 'd');

                        for (i = 0, len = dayDiff; i < len; i++) {
                            dateStr = d1.addDays(i).toStdDateString();
                            if (!ret[dateStr])
                                ret[dateStr] = [0, 0];
                            ret[dateStr][1]+=(+roomCount);
                        }
                    });
                }
                return ret;
            })();
            for (var k in fltHotelInfo) {
                FH.Calendar.addFltHotel(k, -1, fltHotelInfo[k]);
            }
        }

        var isInitCalendar = false;
        var btnShowCalendar = $('#btnShowCalendar');
        btnShowCalendar.bind('click', function () {
            if (!isInitCalendar) {
                initCalendar(); // lazy init
                isInitCalendar = true;
            }
            FH.Calendar.show();
        });
    },

    _initHotelView: function () {
        var selectBtns = $('div.flt_hotel_main div.room_list tr.t:first-child>td:last-child>input');

        if (selectBtns.length == 0) return;

        // 修改自酒店搜索页 Legacy code - START  @fltHotel
        var _tmpNode = S.create('<div class="hidden"></div>');
        document.body.appendChild(_tmpNode);

        var MadCat = function (fn, cfg) {
            this.events = {};
            fn && fn.call(this, cfg)
        };
        $.extend(MadCat.prototype, {
            set: function () { },
            get: function () {
                return null
            },
            evt: function (key, fn) {
                this.events[key] = fn
            },
            init: function () { }
        });

        /**
        * manage hotel view
        * @module
        */
        window.HotelView = new MadCat(function (C) {
            var view_type;
            var current = 'detail';
            var curView = 'list';

            var tabs;
            var btnListView, btnMapView;
            var hotel_container;

            this.init = function () {
                tabs = $('#tabs').find('li');
                btnListView = tabs.get(0);
                btnMapView = tabs.get(1);
                view_type = $('#view_type');
                hotel_container = $('#hotel_list');

                btnMapView.bind('click', this.set2MapView);
            };
            this.set = function () {
            };

            // switch to map view
            this.set2MapView = function () {
                curView = 'emap';
                var fm = document.forms[0];
                if (fm.onsubmit()) {
                    var txtHotelPsx = $('#txtHotelPsx'),
						txtHotelName = $('#txtHotelName');
                    if (txtHotelPsx.isNull()) {
                        txtHotelPsx.value('');
                    } else {
                        if (txtHotelPsx[0].dispatchEvent) {
                            var evt = document.createEvent('Event');
                            evt.initEvent('blur', true, true);
                            txtHotelPsx[0].dispatchEvent(evt);
                        } else {
                            txtHotelPsx[0].fireEvent('onblur');
                        }
                    }
                    if (txtHotelName.isNull()) {
                        txtHotelName.value('');
                    }

                    fm.target = '_blank';
                    fm.submit();

                    if ($.browser.isIE6) {
                        var e = window.event;
                        e.preventDefault ? e.stopPropagation() : e.cancelBubble = true;
                        e.preventDefault ? e.preventDefault() : e.returnValue = false;
                    }
                }
            };

            // switch to list view
            this.set2ListView = function () {

            };

            /**
            * show loading mask obover element
            * @param {Element} el above which el to show.
            * @param {string} [tipsKey] hash key for tips
            */
            this.showLoading = function (el, tipsKey) {
                var h = el.clientHeight || el.offsetHeight,
				w = el.clientWidth || el.offsetWidth;
                var paddingTop = Math.abs((h - 80) / 2), h2 = Math.abs(h - paddingTop);
                if (el.loading) {
                    el.loading.style.width = w + 'px';
                    el.loading.style.width = h + 'px';
                    el.loading.style.paddingTop = paddingTop + 'px';
                    el.loading.style.opacity = '';
                    el.loading.style.filter = '';
                    S.show(el.loading);
                } else {
                    var loading_el = S.create(
							S.format(
								'<div style="width:$1px;padding-top:$2px;text-align:center;background-color:#fff;height:$3px">\
									<img src="http://pic.c-ctrip.com/common/loading_50.gif" /><br />$4</div>\
								</div>',
								w, paddingTop, h, textsConfig.loading
							)
						);
                    el.appendChild(loading_el);
                    el.loading = loading_el;
                }
            };

            /**
            * hide loading el not destroy
            * @param {string} el which el
            * 
            */
            this.hideLoading = function (el) {
                //$.animation.fadeOut(el.loading, S.hide);
                S.hide(el.loading);
            };

            var loadingDiv = $('#loading');
            this.showMask = function () {
                loadingDiv.mask();
            };
            this.hideMask = function () {
                loadingDiv.unmask();
            };
        });

        /**
        * Electroic Map （ 在SearchList页的基础上进行了修改）
        * @module
        */
        window.EMap = new MadCat(function (C) {
            var _this = this;
            var map = null;
            var popMap = null;
            var ifm = null;

            this.set = function () {

            };

            // initialize map view
            this.init = function () {

            };

            this.showPopAndTraffic = function (pos, label, hotelid, obj) {
                var point = pos.split('|');
                if (!this.popMapInited) {
                    popMap = { el: $('#pop_map') };
                }

                var map_el = popMap.el[0].getElementsByTagName('div')[1];
                S.show(popMap.el);
                popMap.el.mask();

                if (!point[0] || !point[1]) {
                    S.hide(map_el);
                } else {
                    S.show(map_el);
                    HotelView.showLoading(map_el, 'loading');
                    this.makeIframe(map_el, URL.MAP_IFRAME_DETAIL, function (el) {
                        _this.makeMap(this, el, function () {
							var AMap = this.AMap, opts = {};			
							opts.position = new AMap.LngLat(point[0], point[1]);
							opts.offset = {x: -10, y: -30};
							if (!cQuery.browser.isIE6){
								opts.content = S.format(
									'<div><img src="$1" style="position:absolute"/><img src="$2" style="position:absolute;top:5px;"/>\
										<div class="searchresult_popname box_shadow" style="left:30px;"><span>$3</span></div></div>',
									"http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
									'http://pic.c-ctrip.com/hotels081118/marker_shadow.png',
									label);
							}else{
								opts.content = S.format(
									'<div><img src="$1" style="position:absolute"/>\
										<div class="searchresult_popname box_shadow" style="left:30px;"><span>$2</span></div></div>',
									"http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
									label);
							}
							opts.map = ifm.map;
							var marker = new AMap.Marker(opts);
							opts.map.setCenter(marker.getPosition());
							
                            HotelView.hideLoading(map_el);
                        });
                    });
                }

                _this.TrafficInfoformap.show(hotelid, obj);
            };
            this.getView = function () {
                var view = map.getViewBound();
                var rightUp = view.RightUp.split(',');
                var leftDown = view.LeftDown.split(',');
                return {
                    maxLat: rightUp[1],
                    maxLng: rightUp[0],
                    minLat: leftDown[1],
                    minLng: leftDown[0]
                }
            };
            this.TrafficInfoformap = (function () {
                var holder, table, loadDiv, linkTraffic;
                var cache = {}, cacheSize = 0;
                return {
                    init: function () {
                        holder = $('#pop_traffic_info')[0];
                        table = holder.getElementsByTagName('table')[0];
                        loadDiv = S.next(table);
                        linkTraffic = holder.getElementsByTagName('a')[0];
                        this.inited = true;
                    },
                    // 针对 不同城市 进行了修改 @fltHotel
                    load: function (hotelId, obj) {
                        var cityId = -1;
                        if ($('#A_city')[0]) {
                            cityId = $('#A_city')[0].value;
                        } else if (obj.getAttribute) {
                            cityId = obj.getAttribute('data-cityid');
                        }

                        var addr = URL.HOTEL_TRAFFIC + '?hotel=' + hotelId + '&CityID=' + cityId;
                        var successCallBack = function (xhr, res) {
                            res = res.replace(/\r|\n|\t/g, '');
                            var data = $.parseJSON(res);
                            if (!data) {
                                S.hide(table);
                                S.hide(loadDiv);
                                return;
                            }
                            S.show(table);
                            S.hide(loadDiv);
                            var htmlArr = [];
                            var d = {};
                            for (var p in data) {
                                if (!d[data[p]['start']]) {
                                    d[data[p]['start']] = [];
                                }
                                d[data[p]['start']].push(data[p]);
                            }
                            for (var o in d) {
                                var html_p = '';
                                for (var i = 0, l = d[o].length; i < l; i++) {
                                    html_p += '<p><span>' + d[o][i].name + '</span>' + textsConfig.map + d[o][i].distance + (d[o][i].detail ? '<span class="icon_notice" data-role="jmp" data-params=\'{options: {"type": "jmp_text", "css": {"maxWidth":"480", "minWidth":"50"}, "template": "#jmp_text", "alignTo":"cursor", "classNames":{"boxType":"jmp_text"}, "content":{"txt":"' + d[o][i].detail + '"}}}\'></span>' : '') + '</p>'; ;
                                }
                                htmlArr.push('<tr><th><strong>' + o + '</strong></th><td>' + html_p + '</td></tr>');
                            }

                            _tmpNode.innerHTML = '<table><tbody>' + htmlArr.join('') + '</tobdy></table>';
                            var tb = _tmpNode.firstChild.tBodies[0];
                            tb.setAttribute('data-hotel', hotelId);

                            table.tBodies[1] ?
								table.replaceChild(tb, table.tBodies[1]) :
								table.appendChild(tb);

                            cache[hotelId] = tb;
                            cacheSize++;
                        };
                        $.ajax(addr, {
                            method: cQuery.AJAX_METHOD_GET,
                            cache: true,
                            onsuccess: successCallBack,
                            onerror: function () { }
                        });
                    },
                    show: function (hotelId, obj) {
                        this.inited || this.init();
                        S.hide(table);
                        S.show(loadDiv);
                        var tbodyCache = cache[hotelId],
							tbody = table.tBodies[1];
                        linkTraffic.href = '/map/' + hotelId + '.html#traffic';
                        if (tbodyCache) {
                            S.show(table);
                            S.hide(loadDiv);
                            table.replaceChild(tbodyCache, tbody);
                        } else {
                            this.load(hotelId, obj);
                        }
                    },
                    dismiss: function () {
                        S.hide(holder);
                    },
                    clear: function () {
                        for (var p in cache) {
                            delete cache[p];
                        }
                        cacheSize = 0;
                    }
                };

            })();

            this.getWin = function () {
                return ifm.window || ifm.contentWindow;
            };

            // @fltHotel
            this.makeIframe = function (el, src, callback) {
                if (ifm)
                    el.removeChild(ifm);
                var h = parseInt(el.style.height),
					w = parseInt(el.style.width);
                ifm = document.createElement('iframe');
                ifm.src = src;
                ifm.width = w;
                ifm.height = h;
                ifm.frameBorder = 'none';
                ifm.style.border = 'none'
				ifm.style.overflow = 'hidden';

                el.appendChild(ifm);
                var win = (ifm.window || ifm.contentWindow);

                if (cQuery.browser.isIE6) {
                    setTimeout(function () {
                        ifm.src = src;
                    }, 10);
                    ifm.attachEvent('onload', function () {
                        callback.call(win, el);
                    });
                } else {
                    win.onload = function () {
                        callback.call(win, el);
                    }
                }
            };

            this.makeMap = function (win, mapDiv, callback) {
				var mapEl = win.document.getElementById('map');

				mapEl.style.width = S.width(mapDiv) + 'px';
				mapEl.style.height = $(mapDiv).css('height');

				var AMap = win.AMap;
				var position = new AMap.LngLat(116.404,39.915);
				var map = new AMap.Map("map",{center:position, level: 15});
				
				map.plugin(["AMap.ToolBar","AMap.OverView","AMap.Scale"],function(){  
					//加载工具条  
					var tool = new AMap.ToolBar();  
					map.addControl(tool);  
					  
					//加载鹰眼  
					var view = new AMap.OverView();  
					map.addControl(view);  
					  
					//加载比例尺  
					var scale = new AMap.Scale();  
					map.addControl(scale);  
					
					// remove copyright
					var cr = $(mapEl).find('img.amap-logo');
					cr[0].style.display = 'none';
					cr = $(mapEl).find('div.amap-copyright');
					cr[0].style.display = 'none';
				});

				ifm.map = map;
				callback.apply(win);
            };

            this.unmask = function () {
                if (popMap.el) {
                    popMap.el.unmask();
                    S.hide(popMap.el);
                }
            }
        });

        /**
        * Area Map
        * @module
        */
        window.AMap = new MadCat(function (C) {
            var el,
				cur,
				curCity,
				pop_el,
				divAMap;
            var cityId,
				cityPY;
            var hash = {},
				cityHash = {};
            var popTmpl = '<b class="${cls}" style="left: ${left}px;"></b><a class="ico_delete2" href="javascript:;" onclick="AMap.hidePop()"></a><strong>${name}</strong><p>${desc}</p><div class="searchresult_mapjump_bom"></div>';
            var mapTmpl = '<area shape="poly" onclick="AMap.showPop(${id}, true)" coords="${coords}" id="zone_${id}" href="javascript:;"/>';
            this.init = function (city) {
                if (!el) {
                    el = $('#amap');
                    pop_el = $('#divAMapJump')[0],
					divAMap = $('#divAMap')[0],
					cityId = $('#A_city')[0],
					cityPY = $('#A_city_py')[0];
                }
                curCity = city || cityId.getAttribute('_defaultValue');
                if (cityHash[curCity]) {
                    divAMap.innerHTML = '';
                    HotelView.showLoading(S.lastChild(el), 'loading');
                    this.parse(cityHash[curCity]);
                } else {
                    HotelView.showLoading(S.lastChild(el), 'loading');
                    divAMap.innerHTML = '';
                    cQuery.loader.js(URL.CITY_ZONE + '?city=' + curCity);
                }
            };
            // 针对同一城市进行了修改 @fltHotel
            this.showPop = function (id, f, city) {
                cur = id;
                if (this.inited && !city && (!f || curCity == city)) {
                    S.show(el);
                    el.mask();
                    this.setPop()
                } else {
                    this.init(city);
                }
                var a = $.browser.isIE && HotelView.get() == 'emap' ? EMap.getWin().event : arguments.callee.caller.arguments[0];
                S.fix(a).preventDefault()
            };
            this.hidePop = function () {
                S.hide(pop_el)
            };
            this.parse = function (data) {
                cityHash[curCity] = data;
                var res = ['<img style="-webkit-user-select:none;-moz-user-select:none;" src="', data.map_image, '" usemap="#m_hotmap" /><map id="m_hotmap" name="m_hotmap">'];
                var last = S.lastChild(el);
                var d = data.data;
                if (!d) {
                    return;
                }
                for (var i = 0, l = d.length; i < l; i++) {
                    var item = d[i];
                    hash[item.id] = item;
                    res.push(cQuery.tmpl.render(mapTmpl, item))
                }
                res.push('</map>');
                HotelView.hideLoading(last);
                divAMap.innerHTML = res.join('');
                setTimeout(function () {
                    S.show(el);
                    el.mask();
                }, 50)
                setTimeout(this.setPop, 100);
                this.inited = true
            };
            this.setPop = function () {
                var curZone = hash[cur];
                if (!curZone) {
                    S.hide(pop_el);
                    return;
                }
                if (!hash[cur].coords)
                    return;
                var coords = hash[cur].coords.split(',');
                var odd = [],
				even = [];
                for (var i = 0, l = coords.length; i < l; i++) {
                    i % 2 ? even.push(coords[i]) : odd.push(coords[i])
                }
                var x1 = Math.min.apply(null, odd),
				x2 = Math.max.apply(null, odd),
				y1 = Math.min.apply(null, even),
				y2 = Math.max.apply(null, even);
                var x = x1 + (x2 - x1) / 2,
				y = y1 + (y2 - y1) / 2;
                var cls = 'tri_b',
					left = 50;
                var st = S.lastChild(el).scrollTop;
                if ((y - st) < 150) {
                    cls = 'tri_t';
                    y += 20
                } else {
                    y -= 165
                }
                if (x > 366) {
                    x -= 272;
                    left = 272
                } else {
                    x -= 50
                }
                if (x < 10) {
                    left = 20;
                    x += 30
                }
                if (x > 373) {
                    left = 302;
                    x -= 30
                }
                pop_el.innerHTML = cQuery.tmpl.render(popTmpl, $.extend(curZone, {
                    left: left,
                    cls: cls
                }));
                pop_el.style.left = x + 'px';
                pop_el.style.top = y + 'px';
                S.show(pop_el)
            };
            this.click = function (id) {
                var fm = document.forms[0];
                if (curCity != cityId.getAttribute('_defaultValue')) {
                    fm.action = S.format(C.ajaxAddress.linkZone, cityPY.value, cityId.value, id);
                } else {
                    fm.action = S.format(C.ajaxAddress.linkZone, cityPY.getAttribute('_defaultValue'), cityId.getAttribute('_defaultValue'), id);
                }
                if (fm.__VIEWSTATE) fm.__VIEWSTATE.name = "NOVIEWSTATE";
                fm.target = "_self";
                fm.submit();
            }
            this.unmask = function () {
                if (el) {
                    el.unmask();
                    S.hide(el);
                }
            }
        });

        // @fltHotel
        window.HotelRoom = new MadCat(function (C) {
            // 选择的房型字典
            this.selectedRoomDic = {};
            this.onSelectHotelButtonClick = function (type, hotelId, roomId, totalprice, discount, saveprice, isRoomRecommended, obj) {
                HotelSelector[type](type, hotelId, roomId, totalprice, discount, saveprice, !!isRoomRecommended, obj); // change isRoomRecommended to bool
                this.onSelectHotelButtonClick = HotelSelector[type];
            }

            var hotelHash = {};
            this.str2Tr = function (str) {
                _tmpNode.innerHTML = '<table>' + str + '</table>';
                return _tmpNode.firstChild.rows[0];
            }
            // 展开全部房型
            // 针对同一酒店 不同行程进行了修改  @fltHotel
            this.onAllRoomLinkClick = function (hotelId, obj, num, query, index) {
                var holder = S.prev(obj.parentNode);
                var hotel;
                if (typeof index === 'number') {
                    if (!hotelHash[index]) {
                        hotelHash[index] = {};
                    }
                    hotel = hotelHash[index]
                } else {
                    if (!hotelHash[hotelId]) {
                        hotelHash[hotelId] = {};
                    }
                    hotel = hotelHash[hotelId]
                }

                var isShowAll = hotel['isShowAll'];
                var spaceSpan = isShowAll ? '<span class="show_unfold"></span>' : '<span class="show_fold"></span>';
                if (hotel.inited) {
                    obj.innerHTML = isShowAll ? textsConfig.room[0] + spaceSpan : textsConfig.room[1] + spaceSpan;
                    if (num) {
                        obj.innerHTML = isShowAll ? textsConfig.room[2].replace("$1", num) + spaceSpan : textsConfig.room[1] + spaceSpan;
                    }
                } else {
                    S.hide(obj);
                    S.show(S.next(obj));
                }
                this.showAllRooms(hotelId, holder, function () {
                    obj.innerHTML = textsConfig.room[1] + spaceSpan;
                    if (S.next(obj).className == 'searchresult_toggle_tips') {
                        S.hide(S.lastChild(obj.parentNode));
                    } else {
                        S.hide(S.next(obj));
                    }
                    S.show(obj);
                }, query, index);
            };
            // 针对同一酒店 不同行程进行了修改  @fltHotel
            this.showAllRooms = function (hotelId, holder, cb, query, index) {
                var hotel = typeof index === 'number' ? hotelHash[index] : hotelHash[hotelId];
                var isShowAll = hotel['isShowAll'];
                var _this = this;
                if (hotel.inited) {
                    if (isShowAll) {
                        this.swap(holder, hotel.allRooms, hotel.original);
                        hotel.originalRows.each(function (el) {
                            el.isExpanded && _this.clickName(el);
                        });
                    } else {
                        this.swap(holder, hotel.original, hotel.allRooms);
                        hotel.allRoomRows.each(function (el) {
                            el.isExpanded && _this.clickName(el);
                        });
                    }

                    hotel['isShowAll'] = !isShowAll;
                } else {
                    $.ajax(URL.HOTEL_ALL_ROOM + '?hotel=' + hotelId + '&' + (query || ''), {
                        method: cQuery.AJAX_METHOD_GET,
                        cache: true,
                        onerror: function () { },
                        onsuccess: function (xhr, res) {
                            if (!res) return;
                            hotel['isShowAll'] = true;
                            _tmpNode.innerHTML = res;
                            hotel.allRooms = $(_tmpNode).find('table');
                            hotel.allRoomRows = S.toArray(hotel.allRooms[0].rows).concat(
								hotel.allRooms[1] ? S.toArray(hotel.allRooms[1].rows) : []);
                            hotel.original = $(holder).find('table');
                            hotel.originalRows = S.toArray(hotel.original[0].rows).concat(
								hotel.original[1] ? S.toArray(hotel.original[1].rows) : []);
                            _this.swap(holder, hotel.original, hotel.allRooms);
                            cb && cb();
                            hotel.inited = true;
                        }
                    });
                }
            };
            this.clickName = function (row) {
                var a = row.cells[0].getElementsByTagName('a')[1];
                if (!a || a.className.indexOf("hotel_room_name") < 0) {
                    a = row.cells[1].getElementsByTagName('a')[0];
                }
                a.onclick();
            };
            this.swap = function (holder, listA, listB) {
                var l = Math.max(listA.length, listB.length);
                for (var i = 0; i < l; i++) {
                    var a = listA[i], b = listB[i];
                    if (a) {
                        if (b) holder.replaceChild(b, a);
                        else holder.removeChild(a);
                    } else if (b) {
                        holder.appendChild(b);
                    }
                }
                HotelSelector.swapSelected(listA, listB);
            };
            this.toggleDetails = function (tr) {
                var trArr = [], untrArr = [];
                var nxt = S.next(tr);
                while (nxt && /\bunexpanded\b/.test(nxt.className)) {
                    untrArr.push(nxt);
                    nxt = S.next(nxt);
                }
                trArr.push(nxt);
                while (nxt && /\bexpanded\b/.test(nxt.className)) {
                    nxt = S.next(nxt);
                    trArr.push(nxt);
                }
                if (tr.isExpanded) {
                    if (trArr.length > 1) {
                        $(tr).removeClass('expandedBaseRoom');
                    }
                    trArr.each(S.hide);
                    tr.isExpanded = false;
                } else {
                    if (trArr.length > 1) {
                        $(tr).addClass('expandedBaseRoom');
                    }
                    trArr.each(S.show);
                    if (typeof tr.isExpanded == 'undefined' && trArr[trArr.length - 1]) {
                        var imgs = trArr[trArr.length - 1].getElementsByTagName('a');
                        for (var i = 0, l = imgs.length; i < l; i++) {
                            var img = imgs[i];
                            if (img.className == 'link') {
                                img.style.backgroundImage = 'url(' + img.getAttribute('_src') + ')';
                            }
                        }
                    }
                    tr.isExpanded = true;
                }
            };

            this.hideDetails = function (obj) {
                var tr = obj.parentNode.parentNode.parentNode;
                var roomRow = S.prev(tr);
                while (roomRow && /\bexpanded\b|\bunexpanded\b/.test(roomRow.className)) {
                    roomRow = S.prev(roomRow);
                }
                this.clickName(roomRow);
            };

            this.onNameClick = function (obj) {
                var tr = obj.parentNode.parentNode;
                this.toggleDetails(tr);
            };

        });
        // 修改自酒店搜索页 Legacy code - END

        // 酒店房型选择 默认选中第一个房型
        var HotelSelector = {
            selected: {}, //选中的input
            flightPrice: $('#hFlightTotalPrice').value() - 0,
            flightSavePrice: $('#hFlightTotalSave').value() - 0,
            hotelRelateDic: {}, //存放与每一个酒店相关的对象
            rDiffPrice: /^([\+\-]*)([^\d]+)(\d+)$/, //差价处理
            modifyDiffPrices: function (obj) {
                var baseDiffPrice = this.praseDiffPrice(
						$(S.parent(obj, 'tr')).find('span.base_price')[0].innerHTML
					);
                var table = S.parent(obj, 'table');
                var spans = $(table).find('span.base_price');
                var _this = this, price;
                // 比价超有问题
                spans.each(function (el, i) {
                    price = _this.praseDiffPrice(el[0].innerHTML);
                    price = price - baseDiffPrice;
                    el[0].innerHTML = _this.htmlDiffPrice(el[0].innerHTML, price);
                });
            },
            praseDiffPrice: function (html) {
                var matches = html.match(this.rDiffPrice);
                var ret = matches[1] == '-' ? -1 : 1;
                return ret * (matches[3] - 0);
            },
            htmlDiffPrice: function (html, price) {
                var sign = price == 0 ? '' : (price > 0 ? '+' : '-');
                return html.replace(this.rDiffPrice, function (_, a, b, c) {
                    return sign + b + Math.abs(price);
                });
            },
            select: function (hotelId, obj) {
                var selected = this.selected[hotelId];

                S.hide(S.prev(selected));
                S.show(selected);
                var selectSpan = S.prev(obj);
                if (!selectSpan) {
                    selectSpan = document.createElement('span');
                    selectSpan.className = 'icon_select';
                    S.insertBefore(selectSpan, obj);
                }
                S.show(selectSpan);
                S.hide(obj);

                this.selected[hotelId] = obj;
            },
            init: function (type, hotelId, divHotel) {
                if (type == -1) {
                    var priceObj = {};
                    // 每个酒店价格信息
                    priceObj.totalprices = {};
                    priceObj.saveprices = {};
                    // 价格修改
                    priceObj.tpObj = $('#divStrategy span.price');
                    priceObj.spObj = $('#divStrategy span.price2');
                    priceObj.dObj = $('#divStrategy strong');
                    // 选择航班需要投递酒店总价
                    priceObj.hHotelTotalPrice = $('#hHotelTotalPrice');
                    priceObj.hHotelSavePrice = $('#hHotelSavePrice');
                    // 勾选保存
                    priceObj.hHotelRooms = $('#hHotelRooms')[0];

                    this.hotelRelateDic[-1] = priceObj;
                    return priceObj;
                } else {
                    var hotelRelate = {};
                    hotelRelate.selectLnk = $('#btn_' + hotelId)[0];
                    hotelRelate.hRoom = $('#hRoom_' + hotelId)[0];
                    hotelRelate.hHotelPrice = $('#hHotelPrice_' + hotelId)[0];
                    this.selected[hotelId] = $(divHotel).find('tr.t:first-child>td:last-child>input')[0];
                    this.selected[hotelId] = !this.selected[hotelId] ?
						$(divHotel).find('tr.unexpanded>td:last-child>input')[0] :
						this.selected[hotelId];

                    this.hotelRelateDic[hotelId] = hotelRelate;
                    return hotelRelate;
                }
            },
            '3': function (type, hotelId, roomId, totalprice, discount, saveprice, person, obj) {
                var divHotel = S.parent(obj, 'div.room_list');
                var hotelId = divHotel.getAttribute('_index'); // 偷换hotelID成行程id，以保持一致性

                HotelRoom.selectedRoomDic[hotelId] = roomId;

                var priceObj = HotelSelector.hotelRelateDic[-1];
                if (!priceObj) {
                    priceObj = HotelSelector.init(-1);
                }

                var hotelRelate = HotelSelector.hotelRelateDic[hotelId];
                if (!hotelRelate) {
                    hotelRelate = HotelSelector.init(3, hotelId, divHotel);
                }

                priceObj.totalprices[hotelId] = totalprice - 0;
                priceObj.saveprices[hotelId] = saveprice - 0;

                var prices = HotelSelector.calculatePrice();

                priceObj.tpObj[0].innerHTML = parseInt(prices[0]);
                priceObj.spObj[0].innerHTML = '<dfn>' + textsConfig.RMB + '</dfn>' + parseInt(prices[1]);
                priceObj.dObj[0].innerHTML = prices[2];

                if (prices[2] == 10.0 || parseInt(prices[1]) == 0) {
                    priceObj.dObj.addClass('invisible');
                    priceObj.spObj.addClass('invisible');
                    $(S.next(priceObj.dObj)).addClass('invisible');
                    $(S.prev(priceObj.spObj)).addClass('invisible');
                } else {
                    priceObj.dObj.removeClass('invisible');
                    priceObj.spObj.removeClass('invisible');
                    $(S.next(priceObj.dObj)).removeClass('invisible');
                    $(S.prev(priceObj.spObj)).removeClass('invisible');
                }

                HotelSelector.setHotelData(hotelId, roomId, [
					prices[0] - HotelSelector.flightPrice,
					prices[1] - HotelSelector.flightSavePrice
				]);

                HotelSelector.modifyDiffPrices(obj);
                HotelSelector.select(hotelId, obj);
            },
            setHotelData: function (hotelId, roomId, prices) {
                var priceObj = this.hotelRelateDic[-1],
				hotelRelate = this.hotelRelateDic[hotelId];

                hotelRelate.hRoom.value = roomId;

                var link = hotelRelate.selectLnk.getAttribute('href');
                link = link.replace(/RoomID=[^&]+/, 'RoomID=' + roomId);
                hotelRelate.selectLnk.setAttribute('href', link);

                var rooms = [], hotelPrices = [];
                for (var k in this.hotelRelateDic) {
                    if (k == -1) continue;
                    rooms.push(this.hotelRelateDic[k].hRoom.value);

                    // process hotel price
                    hotelPrices[0] = prices[0] - priceObj.totalprices[k];
                    hotelPrices[1] = prices[1] - priceObj.saveprices[k];
                    this.hotelRelateDic[k].hHotelPrice.value = hotelPrices.join('|');
                }
                var hotelRooms = rooms.join('_');

                priceObj.hHotelTotalPrice.value(prices[0]);
                priceObj.hHotelSavePrice.value(prices[1]);

                priceObj.hHotelRooms.value = hotelRooms;
            },
            calculatePrice: function () {
                var priceObj = this.hotelRelateDic[-1],
				flightPrice = this.flightPrice,
				flightSavePrice = this.flightSavePrice;

                var totalprice = 0, saveprice = 0, discount = 0;
                for (var hotel in priceObj.totalprices) {
                    totalprice += priceObj.totalprices[hotel];
                    saveprice += priceObj.saveprices[hotel];
                }
                totalprice += flightPrice;
                saveprice += flightSavePrice;
                discount = Math.floor(100 * (totalprice / (totalprice + saveprice))) /10;
                return [totalprice, saveprice, discount];
            },
            // 交换选择的房型
            swapSelected: function (listA, listB) {
                var selectedOne = $(listA[0]).find('input.hidden')[0],
					roomId = selectedOne ? selectedOne.getAttribute('data-room') : '',
					inputsB = $(listB[0]).find('input.flt_hotel_btn6');
                for (var i = 0, len = inputsB.length; i < len; i++) {
                    if (inputsB[i].getAttribute('data-room') == roomId) {
                        S.trigger(inputsB[i], 'click');
                        break;
                    }
                }
            }
        };

        FH._initRoomSelect(selectBtns, HotelSelector);
    },

    _initRoomSelect: function (selectBtns, HotelSelector) {
        // select first room - hotel
        var hotelRooms = $('#hHotelRooms')[0].value;
        if (hotelRooms == "") {
            selectBtns.each(function (el, i) {
                S.trigger(el, 'click');
            });
        } else {
            init(hotelRooms);
        }

        function init(hotelRooms) {
            var url = window.location.href,
				matches1 = /RRoomID=([^&|\/#]+)/.exec(url),
				matches2 = /Index=([^&|\/#]+)/.exec(url),
				bookRoomId = matches1 ? matches1[1] : 0,
                index = matches2 ? matches2[1] : -1;

            var rooms = hotelRooms.split('_');
            if (index != -1 && bookRoomId != 0) {
                rooms[index] = bookRoomId;
            }

            var isMatch = true, hookCount = 0, expandLnks = [];
            var hotelViews = $('div.flt_hotel_main div.room_list');
            hotelViews.each(function (el, i) {
                isMatch = selectRoom(i, rooms, el);
                if (!isMatch) {
                    hookCount++;
                    expandLnks.push($(S.next(el)).find('a')[0]);
                }
            });
            if (hookCount > 0)
                hookSwapSelected(rooms, hotelViews, hookCount);
            expandLnks.each(function (lnk, i) {
                S.trigger(lnk, 'click');
            });
        }

        function selectRoom(index, rooms, hotelView) {
            var roomId, bookRoomId = rooms[index];
            var inputs = hotelView.find('tr.t>td:last-child>input, tr.unexpanded>td:last-child>input');
            for (var i = 0, len = inputs.length; i < len; i++) {
                roomId = inputs[i].getAttribute('data-room');
                if (roomId == bookRoomId) {
                    S.trigger(inputs[i], 'click');
                    return true;
                }
            }
            return false;
        }

        // 在展开房型的最后一步<交换勾选>处hook
        // 异步情况下存在执行顺序问题
        function hookSwapSelected(rooms, hotelViews, hookCount) {
            var fnOrigin = HotelSelector.swapSelected;
            var count = 0;
            HotelSelector.swapSelected = function (listA, listB) {
                fnOrigin(listA, listB);
                // fix the async problem
                var index = listB[0].parentNode.getAttribute('_index') - 0;
                selectRoom(index, rooms, $(hotelViews[index]));
                count++;
                if (count == hookCount)
                    HotelSelector.swapSelected = fnOrigin;
            }
        }
    },

    _initURL: function () {
        var root = S.getRootPath();
        for (var k in URL) {
            URL[k] = root + URL[k];
        }
    },

    _initData: function (callback) {
        function setData(data) {
            if (data.IsCommit) {
                $('#divStrategy').removeClass('hidden');
                $('#divNoData').addClass('hidden');
            } else {
                $('#divStrategy').addClass('hidden');
                $('#divNoData').removeClass('hidden');
            }

            var nots = ['IsCommit', 'Flights', 'HotelDatas'];
            for (var k in data) {
                if (nots.indexOf(k) > -1) continue;
                $('#h' + k).value(data[k]);
            }
        }

        function getAjaxData() {
            var context = { strategy: $('#hStrategy').value() };
            $('#divAjaxData input').each(function (item, i) {
                context[item[0].name] = item.value();
            });
            return context;
        }

        function gotoError() {
            fm.action = URL.ERROR;
            fm.submit();
        }

        function dataReady(data) {
            try {
                var fnText = 'return ' + data.responseText;
                data = (new Function(fnText))();
            } catch (e) {
                gotoError();
                return;
            }

            var fltTmpl = $('#fltTmpl')[0].innerHTML,
				hotelTmpl = $('#hotelTmpl')[0].innerHTML,
				divAirline = $('#divAirline')[0],
				divHotel = $('#divHotel')[0];

            // pre process the tmpl
            var parts1, parts2;
            parts1 = fltTmpl.split('{{IsCommit}}');
            parts2 = hotelTmpl.split('{{IsCommit}}');
            if (data.IsCommit) {
                delete parts1[2];
                delete parts2[2];
            } else {
                delete parts1[1];
                delete parts2[1];
            }
            fltTmpl = parts1.join('');
            hotelTmpl = parts2.join('');

            data.HotelDatas.IsCommit = data.IsCommit;
            divAirline.innerHTML += $.tmpl.render(fltTmpl, data.Flights);
            divHotel.innerHTML += $.tmpl.render(hotelTmpl, data.HotelDatas);

            setData(data);

            // modify page id
            //$('#page_id').value(data.IsCommit ? '105013' : '105014');

            // true init
			callback();

            hideLoading();
        }

        var divLoading = $('#divLoading');
        function showLoading() {
            divLoading.removeClass('hidden');
            divLoading.mask();
        }
        function hideLoading() {
            divLoading.unmask();
            divLoading.addClass('hidden');
            // invisible is better in ie6 
            $('#divMain').removeClass('invisible');
        }

        var url = window.location.href;
        url = URL.FLTHOTEL_DATA + (url.indexOf('?') > -1 ? url.substring(url.indexOf('?')) : '');

        showLoading();

        $.ajax(url, {
            method: cQuery.AJAX_METHOD_POST,
            context: getAjaxData(),
            // contentType: "application/json",
            // dataType: "json",
            cache: true,
            onsuccess: dataReady,
            onerror: gotoError
        });
    },

    _initAds: function () {
        // head ad
        var banner = $('#banner');
		if(banner.length == 0) return;
        banner.regMod('allyes', '1.0', {
            "mod_allyes_user": banner[0].getAttribute('mod_allyes_user')
        });
    },

    init: function () {

        FH._initURL();
		
		Mod.Task()
			.wait(FH._initData)
			.done([
				FH._initHotelView,
				FH._initStrategyTabs,
				FH._initCalendarView
			]);

		FH._initAds();
		// init inline js function
		Mod.InlineJS.init();
        // limit form submit
        S.limitSubmit(fm);
        // register jmp module
        $(document).regMod('jmp', '1.0');
    }

};

FH.init();