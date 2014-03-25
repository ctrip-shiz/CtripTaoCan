/*
* author:shiz@ctrip.com
* date:2012-07-20
*/
$.mod.multiLoad({
    "jmp": "1.0",
    "calendar": "3.0",
    "notice": "1.0",
    "address": "1.0",
    "validate": "1.1",
    "allyes": "1.0"
});

window.fm = document.forms[0];
var charset = cQuery.config("charset");
var releaseNo = $('#_releaseNo_').value();

// mod helper
var Mod = {
    CITY_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/flthotel/packageDomestic_' + charset + '.js?v=' + releaseNo + '.js',
    CITY_POSITION_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/hotel/index/city_position_' + charset + '.js?v=' + releaseNo + '.js',

    formValidator: $(document).regMod("validate", "1.1"),
    // show invalid tips
    showTips: function (obj, msg, hideEvent) {
        if (typeof obj.bind !== 'function')
            obj = $(obj);
        Mod.formValidator.method("show", {
            $obj: obj,
            data: msg,
            removeErrorClass: true,
            hideEvent: hideEvent || "blur",
            isFocus: true
        });
        return false;
    },

    regNotice: function (target, name, i) {
        var notice = target.regMod('notice', '1.0', {
            name: name,
            tips: noticeConfig[i],
            selClass: "inputSel"
        });
        // 把notice挂在target上，以便后面调用其中的方法
        // notice模块没有绑定change事件，只能调notice的resetValue函数
        target.notice = notice;
        return notice;
    },

    regAddress: function (target, name, which, relate) {
        var address = target.regMod('address', '1.0', {
            name: name,
            jsonpSource: Mod.CITY_DATA,
            isFocusNext: true,
            isAutoCorrect: true,
            relate: relate,
            message: {
                suggestion: addressMessageConfig[which]["suggestion"]
            },
            offset: 5
        });
		target.address = address;
		return address;
    },

    regTab: function (target, listeners, isSave) {
        isSave = typeof isSave === 'function' ? true : isSave;
        // save为true时，会自动选一下index
        var tabConfig = {
            options: {
                index: 0,
                tab: "A",
                panel: false,
                trigger: "click",
                save: isSave
            },
            style: {
                tab: "current"
            },
            listeners: listeners
        };
        return target.regMod('tab', '1.2', tabConfig);
    },

	/*
	 * @function 
		change calendar value manually,
		make up for the api lack of calendar mod,
		due to that the calendar doesn't render reasonably and the onChange event isn't triggered
		when the value is changed by setting the value directly
	 * @param {mod} target calendar
	 */
	setCalValue: function (cal, value){
		// I hate arguments validation
		cal[0].value = value;
		
		if(value == ''){
			cal.css('background-image:none');
		}else{
			S.trigger(cal, 'focus');
			S.trigger(cal, 'change');
			S.trigger(cal, 'blur');
		}
	}
};

// city position module
; (function (exports) {
    var CITY_POSITION = {}; //位置数据

    var _hotelPosTitle = undefined;
    var _targetAddress = undefined;
    var _isPositionReady = false;

    /*
    * @function 检查指定城市的指定类型（eg:地铁）数据集合是否初始化了
    * @param {string} 城市id
    * @param {string} 指定类型（可选值：zone,location,metro,spot,all）
    */
    function checkExist(cid, key) {
        if (typeof CITY_POSITION[cid] == "undefined") {
            CITY_POSITION[cid] = {};
            CITY_POSITION[cid][key] = [];
        }
        if (typeof CITY_POSITION[cid][key] == "undefined") {
            CITY_POSITION[cid][key] = [];
        }
        return true;
    }
    /*
    * @function 解析原始数据
    * @param {boolean} 是否包含地铁数据（居然有这种需求。。）
    */
    function parseRawData(isMetroIncluded) {
        ['zone', 'location'].each(function (o, i) {
            var rawName = 'CHINA_HOTEL_' + o.toString().toUpperCase() + '_RAW_DATA';
            window[rawName] = window[rawName].replace(/@(\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY) { //@Huhehaote|呼和浩特|103|hhht@
                checkExist(cid, o);
                checkExist(cid, "all");
                CITY_POSITION[cid][o].push({
                    "display": name,
                    "data": [pingYing, name, id, PY, (o == 'zone' ? 'zoneId' : 'locationId')].join("|")
                });
                CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, (o == 'zone' ? 'zoneId' : 'locationId')].join("|"));
                return '';
            });
        });

        if (!isMetroIncluded)
            return;

        CHINA_HOTEL_METRO_RAW_DATA = CHINA_HOTEL_METRO_RAW_DATA.replace(/@(\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY, alias) {
            checkExist(cid, "metro");
            CITY_POSITION[cid]["metro"].push({
                "display": name,
                "data": [pingYing, name, id, PY, "metroId"].join("|")
            });
            CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, "metroId"].join("|"));
            return '';
        });
        CHINA_HOTEL_SPOT_RAW_DATA = CHINA_HOTEL_SPOT_RAW_DATA.replace(/@(\w\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY, alias) {
            checkExist(cid, "spot");
            CITY_POSITION[cid]["spot"].push({
                "display": name,
                "data": [pingYing, name, id, PY, "landMarkId", alias].join("|")
            });
            CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, "landMarkId", alias].join("|"));
            return '';
        });
    }
    /*
    * @function 设置 targetAddress 的数据源
    * @param {string} 城市id
    */
    function setSource(cityId) {
        var sourcesuggestion = {};

        var data = CITY_POSITION[cityId];

        if (typeof data == "undefined") {
            _targetAddress.set("source", {
                suggestion: null,
                data: "@@"
            });
            return;
        }

        for (var key in _hotelPosTitle) {
            var t = _hotelPosTitle[key];
            if (typeof key === "string") {
                sourcesuggestion[t] = [];
                if (typeof data[key] !== "undefined") {
                    sourcesuggestion[t] = data[key];
                } else {
                    delete sourcesuggestion[t];
                }

            }
        }
        _targetAddress.set("source", {
            suggestion: sourcesuggestion,
            data: "@" + data["all"].join("@") + "@"
        });
    }

    function reg(target, opt) {
        var which = opt.which,
		name = opt.name,
		relate = opt.relate,
		hCity = opt.hCity,
		isMetroIncluded = opt.isMetroIncluded;

        _hotelPosTitle = addressMessageConfig[which]["titles"];

        _targetAddress = target.regMod('address', '1.0', {
            name: name,
            isFocusNext: false,
            isAutoCorrect: true,
            relate: relate,
            source: {
                data: "@@"
            },
            template: {
                suggestion: '\
						<div class="c_address_box">\
							<div class="c_address_hd">${message.suggestion}</div>\
							<div class="c_address_bd">\
								<ol class="c_address_ol">\
									{{enum(key) data}}\
										<li><span>${key}</span></li>\
									{{/enum}}\
								</ol>\
								{{enum(key,arr) data}}\
									<ul class="c_address_ul layoutfix">\
										{{each arr}}\
											<li><a data="${data}" title="${display}" href="javascript:void(0);">${display}</a></li>\
										{{/each}}\
									</ul>\
								{{/enum}}\
							</div>\
						</div>\
					',
                suggestionStyle: '\
						.c_address_box { background-color: #fff; font-size: 12px; width: 505px; }\
						.c_address_box a { text-decoration: none; }\
						.c_address_hd { height: 24px; border-color: #2C7ECF; border-style: solid; border-width: 1px 1px 0; background-color: #67A1E2; color:#CEE3FC; line-height: 24px; padding-left: 10px; }\
						.c_address_bd { border-color: #999999; border-style: solid; border-width: 0 1px 1px; overflow: hidden; padding:10px; }\
						.c_address_ol { margin:0; padding:0 0 24px; border-bottom: 2px solid #CCC; }\
						.c_address_ol li { color: #16B; cursor: pointer; float: left; height: 24px; line-height: 24px; list-style-type: none; text-align: center; margin-top:1px;}\
						.c_address_ol li span { padding:0 8px; white-space:nowrap; display:block; }\
						.c_address_ol li .hot_selected { background:url(http://pic.ctrip.com/hotelcommon/hotel_region.gif) no-repeat 4px bottom; padding-bottom: 4px;}\
						.c_address_ul { width: 100%; margin:0; padding: 4px 0 0; }\
						.c_address_ul li { float: left; height: 24px; overflow: hidden; width: 120px; }\
						.c_address_ul li a { display: block; height: 22px; width: 106px; padding:0 5px; border: 1px solid #FFF; color: #000; line-height: 22px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;}\
						.c_address_ul li a:hover { background-color: #E8F4FF; border: 1px solid #ACCCEF; text-decoration: none; }\
					'
            },
            message: {
                suggestion: addressMessageConfig[which]["suggestion"]
            },
            offset: 5
        });

        // bind focus show
        target.bind("focus", function () {
            var cityId = hCity.value();

            if (cityId == "")
                return false;

            if (!_isPositionReady) {
                var param = {
                    type: 'text/javascript', //类型
                    async: true, //是否异步加载
                    onload: function (response) { //加载成功的回调函数
                        parseRawData(isMetroIncluded);
                        setSource(cityId);
                    }
                }
                cQuery.loader.js(Mod.CITY_POSITION_DATA, param);
                _isPositionReady = true;
            } else {
                setSource(cityId);
            }
        }, {
            priority: 20
        });

        // bind clear event
        target.bind("change", function () {
            if (target.value().trim() == "") {
                for (var k in relate) {
                    relate[k].value("");
                }
            }
        });
    }

    exports.regPosition = function (target, name, which, hCity, isMetroIncluded, relate) {
        reg(target, {
            name: name,
            which: which,
            hCity: hCity,
            isMetroIncluded: isMetroIncluded,
            relate: relate
        });
    }

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
		if($.type(date1) !== 'date')
			date1 = date1.toDate();
		if($.type(date2) !== 'date')
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
        if (typeof el.bind === 'function')
            el = el[0];
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

// 回发函数
function doPostBack(foo, event) {
    $('#divLoading').removeClass('hidden').mask();
    if (cQuery.browser.isIE) {
        setTimeout(function () {
            $('#divLoading').find('p')[0].style.backgroundImage = 'url(http://pic.c-ctrip.com/common/loading.gif)';
        }, 20);
    }
    S.postForm(foo, event)
}

function doPost(target, event, url){
	var key = target.getAttribute('data-key'),
		val = target.getAttribute('data-value');
	key && $('#h' + key).value(val);
	doPostBack(url ? url : target, event);
}
// main
(function (exports){

// 搜索类型 0-往返 1-单程 2-自由组合
var SEARCH_TYPE = {
	ROUND: 0,
	ONEWAY: 1,
	FREE_COMBINE: 2
}

// namespace flt hotel
var FH = {
    // 0-往返 1-单程 2-自由组合
    _searchType: SEARCH_TYPE.ROUND,

    _bookHotelId: undefined,
	
	isPageList: true, // 是否是搜索结果页

    // 初始化某些页面元素以备使用
    _initElements: function () {
        $('#divLoading').addClass('hidden');
    },

    _initWayTab: function () {
        // tab switch
        var tabRound = $('#tabRound'),
			tabOneWay = $('#tabOneWay'),
			tabTheWay = $('#tabTheWay'),
			curTab = tabRound;

        if (tabRound.length == 0)
            return;
			
        tabRound.bind('click', function () {
            curTab.removeClass('current');
            tabRound.addClass('current');

            Searcher.switchDisplay(false);

            curTab = tabRound;
            FH._searchType = SEARCH_TYPE.ROUND;
        });
        tabOneWay.bind('click', function () {
            curTab.removeClass('current');
            tabOneWay.addClass('current');

            Searcher.switchDisplay(true);

            curTab = tabOneWay;
            FH._searchType = SEARCH_TYPE.ONEWAY;
        });
        tabTheWay.bind('click', function () {
            FH._searchType = SEARCH_TYPE.FREE_COMBINE;
            fm.action = URL.FLTHOTEL_DEFAULT;
            fm.submit();
            return false;
        });

        // init the selected tab
        // test the url to get the tabIndex
        var url = window.location.href;
        if (url.indexOf('oneway') > -1) {
            S.trigger(tabOneWay, 'click');
        }
    },
	
	_initHotelMap: function (_tmpNode, MadCat){
	
        window.MapLoading = new MadCat(function (C) {
            /**
            * show loading mask obover element
            * @param {Element} el above which el to show.
            * @param {string} [tipsKey] hash key for tips
            */
            this.showLoading = function (el, tipsKey) {
                var h = el.clientHeight || el.offsetHeight,
					w = el.clientWidth || el.offsetWidth;
                var paddingTop = Math.abs((h - 80) / 2),
					h2 = Math.abs(h - paddingTop);
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
							));
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
        * Electroic Map ( 修改了显示逻辑 for using cQuery mask  @fltHotel )
        * @module
        */
        window.EMap = new MadCat(function (C) {
            var _this = this;
            var map = null;
            var popMap = null;
            var ifm = null;

            this.set = function () { };

            // initialize map view
            this.init = function () { };

            this.showPopAndTraffic = function (pos, label, hotelid, obj) {
                var point = pos.split('|');
                if (!this.popMapInited) {
                    popMap = {
                        el: $('#pop_map')
                    };
                }

                var map_el = popMap.el[0].getElementsByTagName('div')[1];
                S.show(popMap.el);
                popMap.el.mask();

                if (!point[0] || !point[1]) {
                    S.hide(map_el);
                } else {
                    S.show(map_el);
                    MapLoading.showLoading(map_el, 'loading');
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
							
                            MapLoading.hideLoading(map_el);
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
                var holder,
					table,
					loadDiv,
					linkTraffic;
                var cache = {},
					cacheSize = 0;
                return {
                    init: function () {
                        holder = $('#pop_traffic_info')[0];
                        table = holder.getElementsByTagName('table')[0];
                        loadDiv = S.next(table);
                        linkTraffic = holder.getElementsByTagName('a')[0];
                        this.inited = true;
                    },
                    load: function (hotelId, obj) {
                        var addr = URL.HOTEL_TRAFFIC + '?hotel=' + hotelId + '&CityID=' + document.getElementById('A_city').value;
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
                        var e = S.fix(obj);
                        e && e.stopPropagation();
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

            // 补充的函数（ adapt to the cQuery mask ）
            this.unmask = function () {
                if (popMap.el) {
                    popMap.el.unmask();
                    S.hide(popMap.el);
                }
            }
        });

        /**
        * Area Map ( 修改了显示逻辑 for using cQuery mask  @fltHotel )
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
                    MapLoading.showLoading(S.lastChild(el), 'loading');
                    this.parse(cityHash[curCity]);
                } else {
                    MapLoading.showLoading(S.lastChild(el), 'loading');
                    divAMap.innerHTML = '';
                    cQuery.loader.js(URL.CITY_ZONE + '?city=' + curCity);
                }
            };
            this.showPop = function (id, f, city) {
                cur = id;
                if (this.inited && !city && (!f || curCity == city)) {
                    S.show(el);
                    el.mask();
                    this.setPop()
                } else {
                    this.init(city);
                }
                var a = $.browser.isIE && MapLoading.get() == 'emap' ? EMap.getWin().event : arguments.callee.caller.arguments[0];
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
                MapLoading.hideLoading(last);
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
                if (fm.__VIEWSTATE)
                    fm.__VIEWSTATE.name = "NOVIEWSTATE";
                fm.target = "_self";
                fm.submit();
            }
            // 补充的函数（ adapt to the cQuery mask ）
            this.unmask = function () {
                if (el) {
                    el.unmask();
                    S.hide(el);
                }
            }
        });
	},
	
    _initHotelView: function () {
        var selectBtns = $('div.flt_hotel_main div.room_list tr.t:first-child>td:last-child>input');

        if (selectBtns.length == 0)
            return;
			
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

		this._initHotelMap(_tmpNode, MadCat);
		
        // 根据机酒项目要求进行了相应修改  @fltHotel
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
            this.onAllRoomLinkClick = function (hotelId, obj, num, query) {
                var holder = $('#rl_' + hotelId)[0];
                if (!hotelHash[hotelId]) {
                    hotelHash[hotelId] = {};
                }
                var hotel = hotelHash[hotelId];
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
                }, query);
            };
            this.showAllRooms = function (hotelId, holder, cb, query) {
                var hotel = hotelHash[hotelId];
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
                            if (!res)
                                return;
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
                    var a = listA[i],
						b = listB[i];
                    if (a) {
                        if (b)
                            holder.replaceChild(b, a);
                        else
                            holder.removeChild(a);
                    } else if (b) {
                        holder.appendChild(b);
                    }
                }
                HotelSelector.swapSelected(listA, listB);
            };
            this.toggleDetails = function (tr) {
                var trArr = [],
					untrArr = [];
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
            flightPrice: $('#flightPrice').value() - 0,
            flightIsSpecial: !!$('#flightIsSpecial').value(), // 特机
            hotelRelateDic: {},
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
            init: function (type, hotelId) {
                if (type == 1) {
                    var hotelRelate = {};
                    var hlSideDiv = $('#hl_' + hotelId);
                    hotelRelate.tpObj = hlSideDiv.find('p.price')[0];
                    hotelRelate.dObj = hlSideDiv.find('span.rebate strong')[0];
                    hotelRelate.spObj = hlSideDiv.find('span.price2')[0];
                    hotelRelate.tipsObj = $(hotelRelate.spObj.parentNode);
                    this.hotelRelateDic[hotelId] = hotelRelate;
                    this.selected[hotelId] = $('#rl_' + hotelId).find('tr.t:first-child>td:last-child>input')[0];
                    this.selected[hotelId] = !this.selected[hotelId] ?
						$('#rl_' + hotelId).find('tr.unexpanded>td:last-child>input')[0] :
						this.selected[hotelId];
                    return hotelRelate;
                }
            },
            '1': function (type, hotelId, roomId, totalprice, discount, saveprice, isRoomRecommended, obj) {
                HotelRoom.selectedRoomDic[hotelId] = roomId;

                var hotelRelate = HotelSelector.hotelRelateDic[hotelId];
                if (!hotelRelate) {
                    hotelRelate = HotelSelector.init(1, hotelId);
                }

                // recommend icon
                if (HotelSelector.flightIsSpecial && isRoomRecommended) {
                    if (hotelRelate.rObj)
                        S.show(hotelRelate.rObj);
                    else {
                        var iconRecommend = document.createElement('b');
                        iconRecommend.className = "icon_rec";
                        var h5 = $('#hl_' + hotelId).find('h5')[0];
                        S.insertBefore(iconRecommend, h5);
                        hotelRelate.rObj = iconRecommend; // save the recommend icon
                    }
                } else {
                    if (hotelRelate.rObj)
                        S.hide(hotelRelate.rObj);
                }

                hotelRelate.tpObj.innerHTML = '<dfn>' + textsConfig.RMB + '</dfn>' + ((totalprice - 0) + HotelSelector.flightPrice);
                if (discount == '10.0' || saveprice == '0') {
                    S.hide(hotelRelate.tipsObj);
                } else {
                    hotelRelate.dObj.innerHTML = discount;
                    hotelRelate.spObj.innerHTML = saveprice;
                    S.show(hotelRelate.tipsObj);
                }

                HotelSelector.modifyDiffPrices(obj);
                HotelSelector.select(hotelId, obj);
            },
            '2': function (type, hotelId, roomId, totalprice, discount, saveprice, person, obj) {
                if (!$.isEmptyObject(HotelRoom.selectedRoomDic) && HotelRoom.selectedRoomDic[hotelId] != roomId) {
                    var hPerson = S.create(S.format('<input type="hidden" name="person" value="$1"/>', person));
                    obj.parentNode.appendChild(hPerson);
                    var returnUrl = $('#hReturnURL').value();
                    fm.action = returnUrl + '&' + ['RHotelID=' + hotelId, "RRoomID=" + roomId].join('&');
                    fm.submit();
                }

                HotelRoom.selectedRoomDic[hotelId] = roomId;
                if (!HotelSelector.selected[hotelId]) {
                    HotelSelector.selected[hotelId] = $('#rl_' + hotelId).find('tr.t:first-child>td:last-child>input')[0];
                    HotelSelector.selected[hotelId] = !HotelSelector.selected[hotelId] ?
						$('#rl_' + hotelId).find('tr.unexpanded>td:last-child>input')[0] :
						HotelSelector.selected[hotelId];
                }

                HotelSelector.select(hotelId, obj);
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

        FH._initRoomSelect(selectBtns, HotelRoom, HotelSelector);
    },

    _initRoomSelect: function (selectBtns, HotelRoom, HotelSelector) {
        var hotelID = $('#hHotelID').value(),
			roomID = $('#hRoomID').value();

        if (FH.isPageList) { // SearchList
            // select first room - hotel, except the selected one.
            var hotelView;
            selectBtns.each(function (el, i) {
                hotelView = S.parent(el, 'div.room_list');
                if (hotelView.id.substring(3) != hotelID) {
                    S.trigger(el, 'click');
                }
            });
        }
        // select hotel page default select
        FH._bookHotelId = hotelID;
        init(hotelID, roomID);

        function init(bookHotelId, bookRoomId) {
            var hotelView = $('#rl_' + bookHotelId);
            // 酒店不在本页
            if (hotelView.length == 0) {
                //to remove the impact of select nothing
                HotelRoom.selectedRoomDic['-1'] = {};
                return;
            }

            var isMatch = selectRoom(bookHotelId, bookRoomId);
            if (!isMatch) {
                var lnk = $(S.next(hotelView)).find('a')[0];
                hookSwapSelected(bookHotelId, bookRoomId);
                S.trigger(lnk, 'click');
            }
        }

        function selectRoom(bookHotelId, bookRoomId) {
            var hotelView = $('#rl_' + bookHotelId);
            var roomId;
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
        function hookSwapSelected(bookHotelId, bookRoomId) {
            var funcOrigin = HotelSelector.swapSelected;
            HotelSelector.swapSelected = function (listA, listB) {
                funcOrigin(listA, listB);
                selectRoom(bookHotelId, bookRoomId);
                HotelSelector.swapSelected = funcOrigin;
            }
        }
    },

    _initBookLogin: function () {
        window.bookHotel = function (hotelId, type) {
            FH._bookHotelId = hotelId;
            return __SSO_booking('', type);
        }

        window.__SSO_submit = function (a, t) {
            var queryStr =
				['HotelID=' + FH._bookHotelId,
				'RoomID=' + HotelRoom.selectedRoomDic[FH._bookHotelId]]
			.join('&');

            fm.action = URL.BOOK_FLTHOTEL + '?' + queryStr;
            fm.submit();
        }
    },

    _initFlightSelect: function () {
        var fltSelectBtns = $('div.flt_hotel_main div.flt_list td:last-child>input');

        if (fltSelectBtns.length == 0)
            return; // 与酒店选择页共享

        function selectFlight(e) {
			// 恢复表单
			Searcher.reset();

            // 保存下滚动条位置以便下次恢复
            FH.saveScrollPos();

            var target = e.target;
            var hotelId = $(S.parent(target, 'div.flt_hotel_room'))
				.find('div.room_list')[0].id.substring(3);

            var hHotelID = $('#hHotelID'), hRoomID = $('#hRoomID');
            hHotelID.value(hotelId);
            hRoomID.value(HotelRoom.selectedRoomDic[hotelId]);

            var params = ['byWay=' + target.getAttribute('data-ByWay')];

            var returnUrl = target.getAttribute('data-ReturnUrl'),
			hReturnUrl = S.create(S.format('<input name="ReturnUrl" type="hidden" value="$1"/>', returnUrl));
            target.parentNode.appendChild(hReturnUrl);

            var url = (target.getAttribute('data-ByWay').toLowerCase() == 'oneway' ? URL.SELECT_ONEWAY_FLIGHT : URL.SELECT_ROUND_FLIGHT)
				+ '?' + params.join('&');
            doPostBack(url);
        }
        fltSelectBtns.each(function (el) {
            el.bind('click', selectFlight);
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
		FH.isPageList = $('#hSelectHotel').length == 0;
	
        FH._initElements();
		FH._initHotelView();
        FH._initWayTab();
        Searcher.init();
        AdvancedSearcher.init();
        FH._initBookLogin();
        FH._initFlightSelect();
		FH._initAds();

        FH.recoverScrollPos();

        // limit form submit
        S.limitSubmit(fm);
        // register jmp module
        $(document).regMod('jmp', '1.0');
    },

    // 记住滚动条位置
    saveScrollPos: function () {
        $('#hScrollPosition').value(document.documentElement.scrollTop + document.body.scrollTop);
    },
    recoverScrollPos: function () {
        var scrollTop = $('#hScrollPosition').value();
        window.scrollTo(0, scrollTop ? +scrollTop : 0);
    }
};

// 验证
var Validator = {
	// 出发城市，到达城市，出发时间，到达时间
    isFlightPass: function (dc, ac, dd, rd) {
        var dcV = dc.value().trim(),
			acV = ac.value().trim(),
			ddV = dd.value().trim(),
			rdV = rd ? rd.value().trim() : '';

        if (dcV == "")
            return Mod.showTips(dc, validateMessageConfig.flight[0]);
        if (acV == "")
            return Mod.showTips(ac, validateMessageConfig.flight[1]);
        if (dcV == acV)
            return Mod.showTips(ac, validateMessageConfig.flight[10]);
        if (ddV == "")
            return Mod.showTips(dd, validateMessageConfig.flight[2]);
        if (!ddV.isDate())
            return Mod.showTips(dd, validateMessageConfig.flight[4]);
        if (rd && rdV != '') {
            if (!rdV.isDate())
                return Mod.showTips(rd, validateMessageConfig.flight[16]);
            if (dd.value().toDate() >= rd.value().toDate())
                return Mod.showTips(rd, validateMessageConfig.flight[7]);
				
			var dayDiff = S.dateDiff(rdV, ddV, 'd');
			if (dayDiff > 28)
				return Mod.showTips(rd, validateMessageConfig.hotel[9]);
        }
        return true;
    },
    // 入住城市，入住时间，离开时间
    isHotelPass: function (hc, cid, ld) {
        var hcV = hc.value().trim(),
		cidV = cid.value().trim(),
		ldV = ld.value().trim();
        if (hcV == "")
            return Mod.showTips(hc, validateMessageConfig.hotel[0]);
        if (cidV == "")
            return Mod.showTips(cid, validateMessageConfig.hotel[4]);
        if (!cidV.isDate())
            return Mod.showTips(cid, validateMessageConfig.hotel[6]);
        if (ldV == "")
            return Mod.showTips(ld, validateMessageConfig.hotel[5]);
        if (!ldV.isDate())
            return Mod.showTips(ld, validateMessageConfig.hotel[6]);
        if (cid.value().toDate() >= ld.value().toDate())
            return Mod.showTips(ld, validateMessageConfig.hotel[8]);
        // 28天限制
        var dayDiff = S.dateDiff(ldV, cidV, 'd');
        if (dayDiff > 28)
            return Mod.showTips(ld, validateMessageConfig.hotel[9]);

        return true;
    }
}
// 搜索
var Searcher = {

	_isInitMod: false,
	
	_switch: undefined, // 单程往返切换用对象

	validate: function (){
		if(!this._isInitMod) return true;
		
		this.txtDepartCity.address.method('validate');
		this.txtArriveCity.address.method('validate');

		return Validator.isFlightPass(
					this.txtDepartCity, 
					this.txtArriveCity, 
					this.txtDepartDate, 
					FH._searchType == SEARCH_TYPE.ROUND ? this.txtReturnDate : undefined
				) && Validator.isHotelPass(this.txtArriveCity, this.txtCheckInDate, this.txtCheckOutDate);

		return true;
	},
	//生成SEO URL
	generateUrl: function (){
		var searchType = ['round', 'oneway', 'theway'][FH._searchType];
		// 根据返回时间再设置一次searchType
		if (this.txtRDate.value() == '')
			searchType = 'oneway';

		return S.format(URL.FLTHOTEL_SEARCH, searchType, 
					this.hDCityPY.value(), this.hDCity.value(), this.hACityPY.value(), this.hACity.value())
				.toLowerCase();
	},
	// 恢复用户修改前的状态
	reset: function (){
		if(!this._isInitMod) return;
	
		$('div.flt_hotel_searchbox').each(function (el, i) {
			el.hasClass('hidden') ? el.removeClass('hidden') : el.addClass('hidden');
		});
	
		this.txtDepartCity.value(this.txtDepartCity[0].getAttribute('_defaultValue'));
		this.txtArriveCity.value(this.txtArriveCity[0].getAttribute('_defaultValue'));
		
		Mod.setCalValue(this.txtDepartDate, this.txtDepartDate[0].getAttribute('_defaultValue'));
		Mod.setCalValue(this.txtReturnDate, this.txtReturnDate[0].getAttribute('_defaultValue'));
		
		this.selectChildren.value(this.selectChildren[0].getAttribute('_defaultValue'));
		this.selectRoom.value(this.selectRoom[0].getAttribute('_defaultValue'));
		this.selectAdult.value(this.selectAdult[0].getAttribute('_defaultValue'));
		
		// 触发限制
		S.trigger(this.selectAdult, 'change');
	},
	
	init: function (){
		var txtRDate = this.txtRDate = $('#txtRDate');

        if (txtRDate.length == 0) return;

        var hDCity = this.hDCity = $("#D_city"),
			hACity = this.hACity = $("#A_city"),
			hDCityPY = this.hDCityPY = $('#D_city_py'),
			hACityPY = this.hACityPY = $('#A_city_py');

        // 初始化 下拉列表的选择项
        var selectAdult = this.selectAdult = $('#AdultSelect'),
			selectChildren = this.selectChildren = $('#ChildrenSelect'),
			selectRoom = this.selectRoom = $('#RoomSelect');
        selectAdult.value(selectAdult[0].getAttribute('_defaultValue'));
        selectChildren.value(selectChildren[0].getAttribute('_defaultValue'));
        selectRoom.value(selectRoom[0].getAttribute('_defaultValue'));
		
		var self = this;
        $('#lnkChangeSearch').bind('click', function (e) {
            $('div.flt_hotel_searchbox').each(function (el, i) {
                el.hasClass('hidden') ? el.removeClass('hidden') : el.addClass('hidden');
            });
			
			// image would not be loaded when it's hidden
			if (!self._isInitMod){
                self._initMod(hDCity, hACity, hDCityPY, hACityPY, selectAdult, selectChildren, selectRoom);
				self._isInitMod = true;
			}

            e.preventDefault();
            return false;
        });
	},
	
	_initMod: function (hDCity, hACity, hDCityPY, hACityPY, selectAdult, selectChildren, selectRoom){
		var txtDepartCity = this.txtDepartCity = $('#txtDCity'),
			txtArriveCity = this.txtArriveCity = $('#txtACity'),
			txtDepartDate = this.txtDepartDate = $('#txtDDate'),
			txtReturnDate = this.txtReturnDate = $('#txtRDate'),
			txtCheckInDate = this.txtCheckInDate = $('#txtCheckInDate'),
			txtCheckOutDate = this.txtCheckOutDate = $('#txtCheckOutDate'),
			hDCitySZM = $('#D_city_szm'),
			hACitySZM = $('#A_city_szm');

        //notice
        Mod.regNotice(txtDepartCity, 'txtDCity', 1);
        Mod.regNotice(txtArriveCity, 'txtACity', 1);
        Mod.regNotice(txtDepartDate, 'txtDDate', 0);
        Mod.regNotice(txtReturnDate, 'txtRDate', 0);
        //address
        Mod.regAddress(txtDepartCity, 'txtDCity', 'homecity_name', {
            'code': hDCity,
            'szm': hDCitySZM,
            'name_py': hDCityPY
        });
        Mod.regAddress(txtArriveCity, 'txtACity', 'destcity_name', {
            'code': hACity,
            'szm': hACitySZM,
            'name_py': hACityPY
        });
        //calendar
        this._initDateMod(txtDepartDate, txtReturnDate, txtCheckInDate, txtCheckOutDate);

        // init limit between adult\children\room select lists
        FH.SelectListLimit.regAdultChildBond(
			selectAdult,
			selectChildren);
        FH.SelectListLimit.regAdultRoomBond(
			selectAdult,
			selectRoom);
        // init input limit on txtNight
        // FH._bindNightEvent(txtNight, txtDepartDate, txtReturnDate);

        function submit(e) {
            if (Searcher.validate()) {
                $('#hSearch').value("");
                $('#hScrollPosition').value(0);
                doPostBack(Searcher.generateUrl());
            }
        }

		function cancel(){
			Searcher.reset();
		}
		
        $('#lnkSearch').bind('click', submit);
        $('#lnkCancel').bind('click', cancel);
	},
	
	_initDateMod: function (txtDepartDate, txtReturnDate, txtCheckInDate, txtCheckOutDate){
		var strongNight2 = $('#strongNight2'),
			strongNight3 = $('#strongNight3'),
			hNight = $('#hNight');

        function countNights() {
            var d1, d2;
			d1 = txtCheckInDate.value();
			d2 = txtCheckOutDate.value();

            return (d1.isDate() && d2.isDate() && d2 > d1) ?
					S.dateDiff(d1.toDate(), d2.toDate(), 'd') : '--';
        }

        function setNights() {
			var night = countNights();
            strongNight2[0].innerHTML = strongNight3[0].innerHTML = night;
            hNight.value(night);
        }
		
		function onDepartDateChange(input, value, isInit){
			//can not change when user type the date
			txtReturnDate.data('startDate', value);
			txtReturnDate.data('minDate', value);
			
			// min select date
			txtCheckInDate.data('startDate', value);
			txtCheckInDate.data('minDate', value);
			txtCheckOutDate.data('startDate', value);
			txtCheckOutDate.data('minDate', value);
			
			if(!isInit){
				Mod.setCalValue(txtCheckInDate, value);
				Mod.setCalValue(txtCheckOutDate, value.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
				setNights();
				
				if (FH._searchType == SEARCH_TYPE.ROUND)
					setTimeout(function (){ // 给日历组件反应时间
						txtReturnDate[0].focus();
					}, 1);
			}
		}
		
		function onReturnDateChange(input, value, isInit){
			// max select date
			txtCheckInDate.data('maxDate', value);
			txtCheckOutDate.data('maxDate', value);
			
			if(!isInit){
				Mod.setCalValue(txtCheckOutDate, value);
				setNights();
			}
		}
		
        txtDepartDate.regMod('calendar', '3.0', {
            options: {
                minDate: new Date().addDays(1).toStdDateString(),
                showWeek: true,
                container: cQuery.container
            },
            listeners: {
                onChange: onDepartDateChange
            }
        }).method('setWeek', txtDepartDate[0]);
		
        txtReturnDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtDepartDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtDDate"
            },
            listeners: {
                onChange: onReturnDateChange
            }
        }).method('setWeek', txtReturnDate[0]);
		
        txtCheckInDate.regMod('calendar', '3.0', {
			options: {
				minDate: new Date().addDays(1).toStdDateString(),
				showWeek: true,
				container: cQuery.container
			},
			listeners: {
				onChange: function (input, value) {
					//can not change when user type the date
					txtCheckOutDate.data('startDate', value);
					txtCheckOutDate.data('minDate', value);
					txtCheckOutDate[0].focus();

					setNights();
				}
			}
        }).method('setWeek', txtCheckInDate[0]);
		
        txtCheckOutDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtCheckInDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtCheckInDate"
            },
            listeners: {
                onChange: function (input, value) {
                    setNights();
                }
            }
        }).method('setWeek', txtCheckOutDate[0]);
		
		// init limitation and display of the checkin/checkout calendar
		onDepartDateChange(txtDepartDate[0], txtDepartDate[0].value, true);
		if(FH._searchType == SEARCH_TYPE.ROUND)
			onReturnDateChange(txtReturnDate[0], txtReturnDate[0].value, true);
	},
	
	switchDisplay: function (isOneWay){
		var _switch = {};
        if (!this._switch) {
            _switch.lblRDate = $('#lblRDate'),
			_switch.thRDate = $('#thRDate'),
			_switch.tdRDate = $('#tdRDate'),
            this._switch = _switch;
        }

        _switch = this._switch;

        if (isOneWay) {
            S.hide(_switch.lblRDate);
            S.hide(_switch.thRDate);
            S.hide(_switch.tdRDate);
        } else {
            S.show(_switch.lblRDate);
            S.show(_switch.thRDate);
            S.show(_switch.tdRDate);
        }

        if (this._isInitMod) {
            this._switchDate(isOneWay);
        }
	},
	
	_switchDate: function (isOneWay){
		Mod.setCalValue(this.txtReturnDate, '');
		this.txtReturnDate.notice.method('checkValue');
		// change the minDate and maxDate of the calendar mod
		if(this.txtReturnDate.value() == ''){
			this.txtCheckInDate.data('maxDate', '');
			this.txtCheckOutDate.data('maxDate', '');
		}
	}
}
// 高级搜索
var AdvancedSearcher = {

	_isInitMod: false,
	// search hotel by name
	_initNameSearch: function (txtHotelName){
		// 取自酒店搜索页 Legacy code - START
        var initName = function (inp) {
            if (!inp)
                return null;
            var hotelBrandAjaxSuggest = document.getElementById('hotelBrandAjaxSuggest');

            var lastName,
			cid;
            $(inp).bind('focus', function () {
                cid = $('#A_city').value();
                if (!cid)
                    return null;
                lastName = $(inp).value();
            });
            AC.init(inp, [], hotelBrandAjaxSuggest, {
                onTimer: function () {
                    if (!cid) {
                        AC.clearTimer();
                        hotelBrandAjaxSuggest.style.display = 'none';
                        return false;
                    }
                    var val = $(inp).value();
                    if (!val) {
                        lastName = val;
                        hotelBrandAjaxSuggest.style.display = 'none';
                        return;
                    }
                    if (lastName == val || AC.selected) {
                        return;
                    }

                    var data = [];
                    var url = URL.HOTEL_NAME
                    setTimeout(function () {
                        var param = {
                            cache: true,
                            onsuccess: function (response) {
                                var res = response.responseText
                                if (!res) {
                                    hotelBrandAjaxSuggest.style.display = 'none';
                                    return;
                                }
                                data = res.split(',');
                                hotelBrandAjaxSuggest.innerHTML = data.map(function (el) {
                                    var txt = el.replace(val, S.format('<b style="color:green">$1</b>', val));
                                    return S.format('<a href="javascript:;">$1</a>', txt);
                                }).join('');
                                hotelBrandAjaxSuggest.style.display = data.length ? '' : 'none';
                                AC.reset(hotelBrandAjaxSuggest.getElementsByTagName('a') || []);
                            }
                        }
                        $.ajax(URL.HOTEL_NAME + '?cityId=' + cid + '&suggest=true&keyword=' + escape(val), param);
                    }, 300);
                    lastName = val;
                }
            });
        };
        var AC = (function () {
            var keyCode = {
                "UP": 38,
                "DOWN": 40,
                "ENTER": 13,
                "ESC": 27
            };
            var timer,
			selIndex = 0,
			flag,
			up,
			down;
            var len = 0;
            var elList = [];

            return {
                init: function (input, data, holder, cb) {
                    this.cb = cb;
                    var cDom_input = $(input),
					cDom_holder = $(holder);
                    cDom_holder.offsetA(cDom_input);
                    cDom_input.bind('keydown', function (e) {
                        var e = e || window.event,
						key = e.keyCode;
                        switch (key) {
                            case keyCode.DOWN:
                                if (!len)
                                    break;
                                if (len == 1) {
                                    hover(elList[0]);
                                    break;
                                }
                                if (up)
                                    selIndex = selIndex + 2;
                                down = true;
                                up = false;
                                if (selIndex == len)
                                    selIndex = 0;
                                hover(elList[selIndex], elList[(selIndex ? selIndex : len) - 1]);
                                selIndex++;
                                break;
                            case keyCode.UP:
                                if (!len)
                                    break;
                                if (len == 1) {
                                    hover(elList[0]);
                                    break;
                                }
                                if (down)
                                    selIndex = selIndex - 2;
                                down = false;
                                up = true;
                                if (selIndex == -1)
                                    selIndex = len - 1;
                                if (selIndex == 0 && flag)
                                    selIndex = len - 1;
                                hover(elList[selIndex], elList[selIndex == (len - 1) ? 0 : (selIndex + 1)]);
                                selIndex--;
                                flag = false;
                                break;
                            case keyCode.ENTER:
                                var curr = elList[len == 1 ? 0 : (selIndex + (down ? -1 : 1))];
                                if ($(curr).hasClass('checked')) {
                                    select(input, holder, curr);
                                    $(curr).removeClass('checked');
                                    e.preventDefault ? e.stopPropagation() : e.cancelBubble = true;
                                    e.preventDefault ? e.preventDefault() : e.returnValue = false;
                                    break;
                                }
                                cb.onEnter && cb.onEnter();
                                break;
                            case keyCode.ESC:
                                holder.style.display = 'none';
                                break;
                            default:
                                AC.selected = false;
                        }
                    }).bind('focus', function () {
                        if (cb.onTimer)
                            timer = setInterval(cb.onTimer, 200);
                        input.value.trim() && input.select();
                    }).bind('blur', function () {
                        AC.clearTimer();
                        holder.style.display = 'none';
                    });

                    cDom_holder.bind('mousedown', function (e) {
                        var e = e || window.event,
						el = e.target || e.srcElement;
                        if (el.tagName.toLowerCase() == 'b')
                            el = el.parentNode;
                        if (el.tagName.toLowerCase() == 'a') {
                            select(input, holder, el);
                        }
                        e.preventDefault ? e.stopPropagation() : e.cancelBubble = true;
                        e.preventDefault ? e.preventDefault() : e.returnValue = false;
                        if (cQuery.browser.isIE)
                            holder.innerHTML += '';
                    });
                },
                reset: function (list) {
                    selIndex = 0;
                    elList = list;
                    len = list.length;
                },
                clearTimer: function () {
                    timer && clearInterval(timer);
                }
            };

            function hover(el, neighbor) {
                el.className = 'layoutfix checked';
                if (neighbor)
                    neighbor.className = 'layoutfix';
            }

            function select(obj, div, el) {
                obj.value = $(el).text().replace('&amp;', '&');
                var cb = AC.cb;
                cb.onSelect && cb.onSelect();
                div.style.display = 'none';
                AC.selected = true;
            }
        })();

        initName(txtHotelName[0]);
        // 取自酒店搜索页 Legacy code - END
	},
	
	_initMod: function (txtHotelName, txtHotelPsx){
		// notice
        Mod.regNotice(txtHotelName, 'txtHotelName', 1);
        var noticeHotelPsx = Mod.regNotice(txtHotelPsx, 'txtHotelPsx', 2);
		
		this._initNameSearch(txtHotelName);

        Mod.regPosition(txtHotelPsx, 'HotelPsxTextBox', 'txtHotelPsx', $("#A_city"), false, {
            '2': $('#positionId'), //位置id
            "4": $("#positionArea") //位置所在区
        });

        // clear the value of the txtHotelPsx when city change
        if (Searcher.acityAddress) {
            Searcher.acityAddress.method('bind', 'change', function (e) {
                noticeHotelPsx.method('resetValue');
            });
        }

        var lastStarHref; // 保存最后一次的星级选择结果

        // select star dropdownlist
        var divSelectStar = $('#divSelectStar');
        var mutilSelect = new FH.MultiSelect(
				divSelectStar.find('div'),
				divSelectStar.find('span'),
				divSelectStar.find('input')[0],
				function (v, isSelected, values, target) {
				    lastStarHref = target.href;
				});

        $('#lnkAdvancedSearch').bind('click', function () {
			$('#hScrollPosition').value(0); // 滚条状态
            if (FH.isPageList) {
                Searcher.reset();
				doPostBack(lastStarHref ? lastStarHref : Searcher.generateUrl());
            } else {
                lastStarHref ? doPostBack(lastStarHref) : fm.submit();
            }
        });
	},
	
	init: function (){
		var txtHotelName = this.txtHotelName = $('#txtHotelName'),
			txtHotelPsx = this.txtHotelPsx = $('#txtHotelPsx');

        if (txtHotelPsx.length == 0) return;

        // 面包屑导航
        window.breadcrumbNav = function (obj, e) {
            txtHotelName.value('');
            txtHotelPsx.value('');
            $('#hStar').value = '';
            doPostBack(obj, e);
        };
		
		var self = this;
		
		function popSearchPanel(e){
			var html = e.target.innerHTML;
			var unFolded = html.indexOf('up') > -1;
            e.target.innerHTML = unFolded ? html.replace('up', 'down') : html.replace('down', 'up');
			
            var divAdvancedSearch = $('#divAdvancedSearch');
            divAdvancedSearch.hasClass('hidden') ? 
				divAdvancedSearch.removeClass('hidden') : divAdvancedSearch.addClass('hidden');
							
			$('#hSearch').value( unFolded ? 0 : 1 ); // 高级搜索状态
		}
		
        $('#lnkChangeAdvance').bind('click', function (e) {
            popSearchPanel(e);
            if (!self._isInitMod){
                self._initMod(txtHotelName, txtHotelPsx);
				self._isInitMod = true;
			}
        });
		
		if($('#hSearch').value() == '1')
			S.trigger($('#lnkChangeAdvance'), 'click');
	}
}
// 房型列表
var Room = function (){
	
}
// 酒店
var Hotel = function (){

}
// static method
// 详细信息显隐切换
Hotel.toggleDetails = function (){
	var rows = [];
	var nxt = S.next(tr);
	while (nxt && /\bunexpanded\b/.test(nxt.className)) {
		untrArr.push(nxt);
		nxt = S.next(nxt);
	}
	rows.push(nxt);
	while (nxt && /\bexpanded\b/.test(nxt.className)) {
		nxt = S.next(nxt);
		rows.push(nxt);
	}
	if (tr.isExpanded) {
		if (rows.length > 1) {
			$(tr).removeClass('expandedBaseRoom');
		}
		rows.each(S.hide);
		tr.isExpanded = false;
	} else {
		if (rows.length > 1) {
			$(tr).addClass('expandedBaseRoom');
		}
		rows.each(S.show);
		if (typeof tr.isExpanded == 'undefined' && rows[rows.length - 1]) {
			var imgs = rows[rows.length - 1].getElementsByTagName('a');
			for (var i = 0, l = imgs.length; i < l; i++) {
				var img = imgs[i];
				if (img.className == 'link') {
					img.style.backgroundImage = 'url(' + img.getAttribute('_src') + ')';
				}
			}
		}
		tr.isExpanded = true;
	}
}

Hotel.prototype = {
	constructor: Hotel,
	
	showAllRooms: function (){
		
	}
}
// 酒店列表
var HotelList = {

	_hotels: {},

	init: function (){
		
	}
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
    constructor: FH.MultiSelect,

    _init: function () {
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
    select: function (target) {
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
            if (isSelected) {
                this.hData.value = '';
            } else {
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
    parseData: function () {
        var strValue = this.hData.value;
        if (strValue != '') {
            var len = strValue.length - 1;
            if (strValue.lastIndexOf(',') == len) {
                strValue = strValue.substring(0, len);
            }
            return strValue.split(',');
        }
        return [];
    },
    bindSelectEvent: function () {
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
    bindDisplayEvents: function () {
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

// 1成人2儿童 1成人1间房 关联限制
FH.SelectListLimit = {

    //关联因数 [成人儿童，成人房间]
    _relateFator: [2, 1],

    _hideOptions: function (select, start) {
        this._showAllOptions(select);

        // use a trick to hide the option, so it can be compatible with old browser
        if (!select.span) {
            select.span = document.createElement('span');
            select.options = select.find('option');
        }

        var v;
        select.options.each(function (el, i) {
            v = el[0].value;
            if (v >= start) {
                select.span.appendChild(el[0]);
            }
        });
    },

    _showAllOptions: function (select) {
        if (!select.span)
            return;

        select.options.each(function (el, i) {
            select[0].appendChild(el[0]);
        });
        // select the first one
        select[0].value = select.options[0].value;
    },

    _limitB: function (selectA, selectB, type) {
        var v = selectA.value() - 0,
			v2 = selectB.value() - 0,
			upper = v * this._relateFator[type];

        this._hideOptions(selectB, upper + 1);

        if (v2 <= upper)
            selectB[0].value = v2;
    },

    _regBond: function (selectA, selectB, type) {
        var _this = this;
        this._limitB(selectA, selectB, type);

        selectA.bind('change', function (e) {
            _this._limitB(selectA, selectB, type);
        });
    },

    regAdultChildBond: function (selectAdult, selectChildren) {
        this._regBond(selectAdult, selectChildren, 0);
    },

    regAdultRoomBond: function (selectAdult, selectRoom) {
        this._regBond(selectAdult, selectRoom, 1);
    }
}

FH.init();

})(window);