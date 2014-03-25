/*
 * author:shiz@ctrip.com
 * date:2012-07-20
 */
$.mod.load('jmp', '1.0');

window.fm = document.forms[0];

// lib fix
var S = {
	// get the sibling or first-child or last-child element
	_elem : function (el, exp, which) {
		if (typeof el.bind === 'function')
			el = el[0];
		
		var which1 = which + 'ElementSibling',
			which2 = which + 'Sibling';
		if (which == 'first' || which == 'last') {
			which1 = which + 'ElementChild',
			which2 = which + 'Child';
		}else if(which == 'parent'){
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
	prev : function (el, exp) {
		return S._elem(el, exp, 'previous');
	},
	// get the next element of the specified one
	next : function (el, exp) {
		return S._elem(el, exp, 'next');
	},
	// get the first element child of the specified one
	firstChild : function (el, exp) {
		return S._elem(el, exp, 'first');
	},
	// get the last element child of the specified one
	lastChild : function (el, exp) {
		return S._elem(el, exp, 'last');
	},
	// get the parent of the specified one
	parent : function(el, exp){
		return S._elem(el, exp, 'parent');
	},
	// insert one element before another
	insertBefore : function (a, b) {
		if (typeof a.bind === 'function')
			a = a[0];
		if (typeof b.bind === 'function')
			b = b[0];
		
		b.parentNode.insertBefore(a, b);
	},
	// insert one element after another
	insertAfter : function (a, b) {
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
	show : function (el) {
		if (!el)
			return; // Fault Tolerance
		if (typeof el.removeClass !== 'function')
			el = $(el);
		el.removeClass('hidden');
	},
	// hide element
	hide : function (el) {
		if (!el)
			return; // Fault Tolerance
		if (typeof el.addClass !== 'function')
			el = $(el);
		el.addClass('hidden');
	},
	
	// fire the event
	trigger : function (target, evtName) {
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
	toArray : function (list) {
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
	format : function (str) {
		var args = arguments;
		if (args.length == 0)
			return str;
		return str.replace(/\$(\d)/g, function (w, d) {
			return args[d] == undefined ? '' : args[d];
		});
	},
	
	// limit the number of submit action in a short time
	limitSubmit : function (fm) {
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
	dateDiff : function (date1, date2, interval, isPrecise) {
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
	postForm : function (foo, event) {
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
	getRootPath : function () {
		var strFullPath = window.document.location.href;
		var strPath = window.document.location.pathname;
		var pos = strFullPath.indexOf(strPath);
		var prePath = strFullPath.substring(0, pos);
		var postPath = strPath.substring(0, strPath.substr(1).indexOf('/') + 1);
		return (prePath + postPath);
	},
	
	_tmpEl : document.createElement('div'),
	// create element with html
	create : function (html) {
		S._tmpEl.innerHTML = html.trim(); // fix TextNode bug
		return S._tmpEl.firstChild;
	},
	
	// get the value of the input with notice mod
	noticeVal : function (el) {
		if (typeof el.bind === 'function')
			el = el[0];
		return el.value.trim() == '' || el.value == el.getAttribute('_cqnotice') ? '' : el.value.trim();
	}
};

// fix element position
;(function (exports){
	exports.fixPosition = function (div, opts) {
		if(typeof div.addClass !== 'function')
			div = $(div);
	
		opts = opts || {};

		var upperBound = div.offset().top,
		scrollHandle;

		if (cQuery.browser.isIE6) {
			scrollHandle = function (e) {
				// 节流的视觉效果不好
				var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

				if (scrollTop > upperBound) {
					div[0].style.position = 'absolute';
					div[0].style.bottom = 'auto';
					div[0].style.top = (scrollTop - upperBound) + 'px';
				} else if (scrollTop == 0) {
					div[0].style.position = "static";
				}
			}
		} else {
			var isFixed = false;
			scrollHandle = function (e) {
				// 滚条位置
				var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

				if (scrollTop > upperBound) {
					if (isFixed) return;
					opts.fixedClass ?
						div.addClass(opts.fixedClass) :
						div[0].style.position = 'fixed';
					div[0].style.top = opts.topSpace || '0'; // 上端间隙
					isFixed = true;
				} else {
					opts.fixedClass ?
						div.removeClass(opts.fixedClass) :
						div[0].style.position = '';
					div[0].style.top = '';
					isFixed = false;
				}
			}
		}

		$(window).bind('scroll', scrollHandle);
		scrollHandle();
	}
})(window);

// inline function
function doPostBack(foo, event) {
	S.postForm(foo, event)
};

function doPost(target, event, url){
	var key = target.getAttribute('data-key'),
		val = target.getAttribute('data-value');
	key && $('#h' + key).value(val);
	doPostBack(url ? url : target, event);
}

// namespace flt hotel
var FH = {
	
	isIntl: $('#AirlineSelect')[0].nodeName == 'SELECT',
	
	_initElements: function (){
		$('#divLoading').addClass('hidden');
		// 初始化很抱歉（SEO）	
		var nodata = $('#noData')[0];
		nodata.innerHTML = nodata.innerHTML + textsConfig.noData;
	},
	
	_initFlightFilter : function () {
		var airlineSelect = $('#AirlineSelect'),
		departTimeSelect = $('#DepartTimeSelect');
		
		if (airlineSelect.length == 0)
			return;
		
		flightMananger.init(airlineSelect, departTimeSelect);
	},
	
	_initExpandMoreInfo : function () {
		var table, link;
		$('span.icon_select').each(function (el, i) {
			td = el[0].parentNode;
			link = $(td).find('div.more>a')[0];
			if (!link || link.innerHTML.indexOf('show_fold') > -1) return; // already unfold
			flightMananger.showMoreSeat(link);
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
	
	_loadingSubmit: function () { 
		function showLoading(){
			$('#divLoading').removeClass('hidden').mask();
			if(cQuery.browser.isIE){
				setTimeout(function (){
					$('#divLoading').find('p')[0].style.backgroundImage = 'url(http://pic.c-ctrip.com/common/loading.gif)';
				}, 20);
			}
		}
	
		var originalSubmit = fm.submit; 
		
		fm.submit = function () { 
			showLoading();

			try { 
				originalSubmit.apply(fm); 
			} catch (e) { 
				originalSubmit(); 
			} 
		};

		fm.onsubmit = function () { 
			showLoading();
		} 
	},
	
	init : function () {
		FH._initElements();
		FH._initFlightFilter();
		FH._initExpandMoreInfo();
		FH._initAds();
		FH._loadingSubmit();
		
		// register jmp module
		$(document).regMod('jmp', '1.0');
	}
}

window.flightMananger = {
	
	fltList : $('div.flt_list_item'),
	noData : $('#noData'),
	periods : [[6, 12], [12, 13], [13, 18], [18, 24]],
	curAirlines : undefined,
	curPeriods : undefined,
	airlineMultiSelect : undefined,
	departTimeMultiSelect : undefined,
	
	filterDepartTime : function (values) {
		this.noData.addClass('hidden');
		this.curPeriods = values;
		var showCount = this.filter();
		showCount == 0 && this.noData.removeClass('hidden');
	},
	filterAirline : function (values) {
		this.noData.addClass('hidden');
		this.curAirlines = values;
		var showCount = this.filter();
		showCount == 0 && this.noData.removeClass('hidden');
	},
	filter : function () {
		var curAirlines = this.curAirlines || ['-1'],
		curPeriods = this.curPeriods || ['-1'], // -1 undefined
		showCount = 0,
		_this = this;
		
		if(curAirlines.length == 0 || curPeriods.length == 0){
			flightMananger.fltList.each(function(el, i){
				S.hide(el);
			});
			return showCount;
		}
		
		flightMananger.fltList.each(function (item) {
			var airlineType = item[0].getAttribute('airline'),
			departTime = (item[0].getAttribute('departTime') - 0),
			isOK = true;
			
			if (curAirlines[0] != '-1' && curAirlines.indexOf(airlineType) == -1) {
				isOK = false;
			}
			
			if (isOK && curPeriods[0] != '-1' ) {
				isOK = false;
				var period;
				for (var i = 0, len = curPeriods.length; i < len; i++) {
					period = _this.periods[curPeriods[i]];
					if (departTime >= period[0] && departTime < period[1]) {
						isOK = true;
						break;
					}
				}
			}
			
			if (isOK) {
				S.show(item);
				showCount++;
			} else {
				S.hide(item);
			}
		});
		
		return showCount;
	},
	
	showMoreSeat : function (obj) {
		if (obj.innerHTML.indexOf('unfold') > -1) {
			obj.innerHTML = textsConfig.more_seat + '<span class="show_fold"></span>';
		} else {
			obj.innerHTML = textsConfig.more_seat + '<span class="show_unfold"></span>';
		}
		var table = S.parent(obj, 'table');
		$(table).find('tr.more_info').each(function (tr) {
			tr.hasClass('hidden') ? tr.removeClass('hidden') : tr.addClass('hidden');
		});
	},
	
	bindHoverFlight: function (){
		// var hoverIndex = -1;
		// flightMananger.fltList.each(function(el, i){
			// el.bind('mouseover',function (e){
				// if(i == hoverIndex) return;
				// if(hoverIndex != -1)
					// $(flightMananger.fltList[hoverIndex]).removeClass('hover');
				// el.addClass('hover');
				// hoverIndex = i;
			// });
		// });
	},
	
	init : function (airlineSelect, departTimeSelect) {
		this.airlineMultiSelect = new FH.MultiSelect(
				airlineSelect,
				$('#spanAirline'),
				$('#hAirline')[0],
				function (v, isSelected, values) {
				flightMananger.filterAirline(values);
			});
		
		this.departTimeMultiSelect = new FH.MultiSelect(
				departTimeSelect,
				$('#spanDepartTime'),
				$('#hDepartTime')[0],
				function (v, isSelected, values) {
				flightMananger.filterDepartTime(values);
			});
		
		// init filter
		var airline = this.airlineMultiSelect.hData.value;
		if (airline != '-1' && airline != '')
			flightMananger.filterAirline(this.airlineMultiSelect.parseData());
		var departTime = this.departTimeMultiSelect.hData.value;
		if (departTime != '-1' && departTime != '')
			flightMananger.filterDepartTime(this.departTimeMultiSelect.parseData());
		
	}
}

if(FH.isIntl){
	flightMananger.init = function (){
		var selectAirline    = $('#AirlineSelect'),
			selectDepartTime = $('#DepartTimeSelect');
		var airlineValue = selectAirline[0].getAttribute('_defaultValue'),
			departTimeValue = selectDepartTime[0].getAttribute('_defaultValue');
		
		selectAirline.bind('change', function (e){
			flightMananger.filterAirline([selectAirline[0].value]);
		});
		selectDepartTime.bind('change',function (e){
			flightMananger.filterDepartTime([selectDepartTime[0].value]);
		});
		
		selectAirline.value(airlineValue);
		selectDepartTime.value(departTimeValue);
		
		// init filter
		if (airlineValue != '-1') 
			flightMananger.filterAirline([airlineValue]);
		if (departTimeValue != '-1')
			flightMananger.filterDepartTime([departTimeValue]);
	}
	
	FH._initExpandMoreInfo = function () {
		var table, link;
		$('span.icon_select').each(function (el, i) {
			table = $(S.parent(el[0], 'table'));
			var tds = table.find('tr:first').find('td');
			var td = $(tds[tds.length - 2]);
			link = $(td).find('a')[1];
			if (!link || link.innerHTML.indexOf('show_fold') > -1) return; // already unfold
			flightMananger.showMoreSeat(link);
		});
	}
	
	// fix side
	fixPosition($('#divSideBox'), {
		topSpace: '8px'
	});
	
	//side bar
	$.mod.load('sideBar', '2.0', function (){
		var sidebar = $(document).regMod('sideBar', '2.0', {
			url: {
				feedBackURL: 'http://accounts.ctrip.com/MyCtrip/Community/CommunityAdvice.aspx?productType=12'
			},
			HTML: '<div class="side_fixed" id="sidebar"> <a class="to_top" title="${backTop}" href="javascript:;" id="gotop2"> </a> <a target="_blank" class="c_sidebar" href="${feedBackURL}" title="${feedBack}">${feedBack}</a></div>'
		});
	});
}

/*
 * @class multi select
 * @constructor
 * @param {cDom} the option list
 * @param {cDom} the displayed span
 * @param {cDom} the hidden keeping the data
 * @param {function} the function which will be triggered when user select an option
 *		(params: selectedValue, isSelected, values, target)
 */
FH.MultiSelect = function (list, txtSpan, hData, onSelect) {
	this.list = list;
	this.opts = list.find('a').slice(1);
	this.allOpt = list.find('a')[0];
	this.txtSpan = txtSpan;
	this.hData = hData;
	this.onSelect = onSelect;
	this.defaultValue = this.allOpt.getAttribute('val'); //全部选项的值
	this._hideTimer = undefined; //隐藏的setTimeout id
	
	this._init();
}
FH.MultiSelect.prototype = {
	constructor : FH.MultiSelect,
	
	_init : function () {
		// init the lsit
		var optValues = this.hData.value.split(','),
		opts = this.opts;
		for (var i = 0, len = optValues.length; i < len; i++) {
			for (var j = 0, len2 = opts.length; j < len2; j++) {
				if (opts[j].getAttribute('val') == optValues[i]) {
					opts[j].className = 'multi_option_selected';
					break;
				}
			}
		}
		
		if (this.hData.value == '' || this.hData.value == this.defaultValue)
			this.allOpt.className = 'multi_option_selected';
		
		this.bindSelectEvent();
		this.bindDisplayEvents();
	},
	select : function (target) {
		// 当target为字符串时选中value=target的那一项
		if (typeof target === 'string') {
			for (var i = 0, len = this.opts.length; i < len; i++) {
				if (this.opts[i].getAttribute('val') == target) {
					target = this.opts[i];
					break;
				}
			}
			if (typeof target === 'string')
				return; // 容错
		}
		
		var v = target.getAttribute('val'),
		isSelected = target.className == 'multi_option_selected' ? true : false;
		if (v != this.defaultValue) {
			if (this.allOpt.className == 'multi_option_selected') {
				this.hData.value = '';
				this.allOpt.className = 'multi_option';
			}
			this.hData.value = isSelected ? this.hData.value.replace(v + ',', '') : this.hData.value += (v + ',');
		} else {
			if(isSelected){
				this.hData.value = '';
			}else{				
				this.hData.value = this.defaultValue;
				this.opts.each(function (opt) {
					opt[0].className = 'multi_option';
				});
			}
		}
		target.className = isSelected ? 'multi_option' : 'multi_option_selected';
		
		if (typeof this.onSelect === 'function') {
			this.onSelect(v, !isSelected, this.parseData(), target);
		}
	},
	parseData : function () {
		var strValue = this.hData.value;
		if(strValue != ''){
			var len = strValue.length - 1;
			if(strValue.lastIndexOf(',') == len){
				strValue = strValue.substring(0, len);
			}
			return strValue.split(',');
		}
		return [];
	},
	bindSelectEvent : function () {
		var _this = this;
		_this.list.bind('click', function (e) {
			var target = e.target;
			if (target.nodeName != 'A' && target.nodeName != 'I')
				return;
			
			if (target.nodeName == 'I') {
				target = target.parentNode;
			}
			
			_this.select(target);
			
			e.preventDefault(); //取消默认行为
		})
	},
	bindDisplayEvents : function () {
		var _this = this,
		arrow = $(S.next(this.txtSpan));
		
		var showList = function () {
			clearTimeout(_this._hideTimer);
			_this.list.removeClass('hidden');
		}
		var hideList = function () {
			_this._hideTimer = setTimeout(function () {
					_this.list.addClass('hidden');
				}, 60);
		}
		this.list.bind('mouseover', showList);
		this.list.bind('mouseout', hideList);
		this.txtSpan.bind('mouseover', showList);
		this.txtSpan.bind('mouseout', hideList);
		arrow.bind('mouseover', showList);
		arrow.bind('mouseout', hideList);
	}
};

FH.init();