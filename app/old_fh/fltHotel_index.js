/*
* author:shiz@ctrip.com
* date:2012-07-20
*/
$.mod.multiLoad({
    "tab": "1.2",
    "address": "1.0",
    "calendar": "3.0",
    "notice": "1.0",
    "toggle": "1.0",
    "validate": "1.1",
    "allyes": "1.0",
    "adFrame": "1.0",
    "dropBox": "1.0"
});

// 全局表单
window.fm = document.forms[0];
var charset = cQuery.config("charset");
var releaseNo = $('#_releaseNo_').value();

// mod helper
var Mod = {
    CITY_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/flthotel/packageDomestic_' + charset + '.js?v=' + releaseNo + '.js',
    CITY_DATA_DEST: 'http://webresource.c-ctrip.com/code/cquery/resource/address/flthotel/packageDomestic_dest_' + charset + '.js?v=' + releaseNo + '.js',
    
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
            tips: FHConfig.notice[i],
            selClass: "inputSel"
        });
        // 把notice挂在target上，以便后面调用其中的方法
        // notice模块没有绑定change事件，只能调notice的resetValue函数
        target.notice = notice;
        return notice;
    },

    regAddress: function (target, name, which, relate, isDest) {
        var address = target.regMod('address', '1.0', {
            name: name,
            jsonpSource: !isDest ? Mod.CITY_DATA : Mod.CITY_DATA_DEST,
            isFocusNext: true,
            isAutoCorrect: true,
            relate: relate,
            message: {
                suggestion: FHConfig.addressMessage[which]["suggestion"]
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

// hotel address mod
; (function (exports) {
    var HOTEL_CITY_DATA = 'http://webresource.c-ctrip.com/code/cquery/resource/address/hotel/online/city_' + charset + '.js?v=' + releaseNo;
    var _target, _targetAddress, _cityData;

    function initTab(obj) {
        var spans = obj.find('span');
        var uls = obj.find('.c_address_ul');
        if (!spans.length) {
            return;
        }

        function switchTab() {
            var _this = this;
            spans.each(function (span, i) {
                if (span[0] == _this) {
                    span.addClass('hot_selected');
                    uls[i].style.display = '';
                } else {
                    span.removeClass('hot_selected');
                    uls[i].style.display = 'none';
                }
            });
        }

        spans.bind('mousedown', switchTab);
        switchTab.apply(spans[0]);
    };

    function parseRawData() {
        var data = {};

        CHINA_HOTEL_CITY_RAW_DATA = CHINA_HOTEL_CITY_RAW_DATA.
				replace(/@(\w?\d+)\|0\|([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g,
				function (_, id, name, jp, py) {
				    data[id] = [name, py, jp];
				    return "";
				});
        CHINA_HOTEL_CITY_RAW_DATA = CHINA_HOTEL_CITY_RAW_DATA.
				replace(/@(\w?\d+)\|([1-9]\d*)\|([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g,
				function (_, id, pid, name, jp, py) {
				    var p = data[pid];
				    if (p) {
				        if (p.length == 3)
				            p.push({});
				        p[3][id] = [name, py, jp];
				    }
				    return "";
				});
        // { pid: [name, py, jp, { id1: [name, py, jp], id2: [name, py, jp] }]}
        return data;
    };

    var templ = '<li tabindex="1000" title="" id="$1">$2</li>',
		tSpace = '&nbsp;',
		tArrow = '->',
		alignLen = 11;
    function createList(data, pid) {
        var arrLi = [], name, len;
        pid = (pid || '') + '_';

        for (var id in data) {
            name = data[id][0];
            if (pid == '_') {
                // chinese char is double longer than english one
                len = data[id][0].length * 2;
				//过长\无城市\张三省\台湾省过滤
                if( len > alignLen || id == '80' || id == '53' || !$.isPlainObject(data[id][3])) continue; 
                name += tSpace.repeat(alignLen - len) + tArrow;
            }
            arrLi.push(S.format(templ, pid + id, name));
        }
        return arrLi.join('');
    };

    var classOn = 'on', selected = []; //save selected province and city

    function select(item, which) {
        if (selected[which]) {
            selected[which].className = '';
        }
        item.className = classOn;
        selected[which] = item;
    };

    function selectCity(item, isFilled) {
        select(item, 1);
        var ids = item.id.split('_');
        isFilled && _target.value(_cityData[ids[0]][3][ids[1]][0]);
    };

    function suggestionInit(obj) {
        initTab(obj);

        _cityData = _cityData || parseRawData();

        var uls = obj.find('.index_area');

        uls[0].innerHTML = createList(_cityData);

        $(uls[0]).bind('mousedown', function (e) {
            if (e.target.tagName != 'LI') return;

            var item = e.target;
            select(item, 0);

            var pid = item.id.substring(1);
            if (_cityData[pid][3]) {
                uls[1].innerHTML = createList(_cityData[pid][3], pid);
                // 选择第一项
                var item2 = $(uls[1]).find('li')[0];
                selectCity(item2, false);
            }
        });

        $(uls[1]).bind('mousedown', function (e) {
            if (e.target.tagName != 'LI') return;

            var item = e.target;
            selectCity(item, true);
            // trigger the function of the address mod to make suggesion panel disappear
            S.trigger(_target, 'blur');
        });
    };
	
	function filterData(data){
		var taiwan_cities = ',617,720,3844,3845,3846,3847,3848,3849,5152,5589,6954,7203,7523,7524,7570,7613,7614,7662,7805,7808,7809,7810,7811,';
		data.data = data.data.replace(/@\D+(\d+)[^\d@]+/g, function (_, id){
			id = ',' + id + ',';
			return taiwan_cities.indexOf(id) > -1 ? '' : _ ;
		});
	};

    function reg(target, name, which, relate) {
	
		$.loader.jsonp(HOTEL_CITY_DATA,{
			charset: charset,
			onload: function(data){
			
				filterData(data);
				
				_target = target;
				
				_targetAddress = target.regMod("address", "1.0", {
					name: name,
					isFocusNext: false,
					isAutoCorrect: true,
					relate: relate,
					source : data,
					template: {
						suggestion: '<div class="c_address_box">\
							<div class="c_address_hd">' + FHConfig.addressMessage[which].suggestion + '</div>\
							<div class="c_address_bd">\
								<ol class="c_address_ol">{{enum(key) data}}<li><span>${key}</span></li>{{/enum}}</ol>\
								{{enum(key,arr) data}}\
								{{if key!="' + FHConfig.addressMessage[which].addressTab + '"}}\
								<ul class="c_address_ul layoutfix">\
									{{each arr}}<li><a href="javascript:void(0);" data="${data}">${display}</a></li>{{/each}}\
								</ul>\
								{{/else}}\
								<div class="c_address_ul layoutfix">\
									<div id="union" class="hotel_index_area" style="width: 500px">\
										<ul class="index_area"></ul>\
										<label class="ico_index_area"></label>\
										<ul class="index_area"></ul>\
									</div>\
								</div>\
								{{/if}}\
								{{/enum}}\
							</div>\
						</div>',
						suggestionStyle: '.c_address_box { background-color: #fff; font-size: 12px; width: 425px; }.c_address_box a { text-decoration: none; }.c_address_hd { height: 24px; border-color: #2C7ECF; border-style: solid; border-width: 1px 1px 0; background-color: #67A1E2; color:#CEE3FC; line-height: 24px; padding-left: 10px; }.c_address_hd strong{color:#fff;}.c_address_bd { border-color: #999999; border-style: solid; border-width: 0 1px 1px; overflow: hidden; padding:10px; }.c_address_ol { margin:0; padding:0 0 20px; border-bottom: 1px solid #5DA9E2; }.c_address_ol li { color: #005DAA; cursor: pointer; float: left; height: 20px; line-height: 20px; list-style-type: none; text-align: center; }.c_address_ol li span { padding:0 8px; white-space:nowrap; display:block; }.c_address_ol li .hot_selected { display:block; padding:0 7px; background-color: #FFFFFF; border-color: #5DA9E2; border-style: solid; border-width: 1px 1px 0; color: #000000; font-weight: bold; }.c_address_ul { width: 100%; margin:0; padding: 4px 0 0; }.c_address_ul li { float: left; height: 24px; overflow: hidden; width: 67px; }.c_address_ul li a { display: block; height: 22px; border: 1px solid #FFFFFF; color: #1148A8; line-height: 22px; padding-left: 5px; }.c_address_ul li a:hover { background-color: #E8F4FF; border: 1px solid #ACCCEF; text-decoration: none; }#union li{float:none;height:14px;width:auto;}',
						suggestionInit: suggestionInit
					}
				});
			}
		});		

    };

    exports.regHotelAddress = function (target, name, which, relate) {
        reg(target, name, which, relate);
        return _targetAddress;
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
        if(!evt.preventDefault){
            evt.preventDefault = function () {
                evt.returnValue = false;
            }
        }
        if(!evt.stopPropagation){
            evt.stopPropagation = function(){
                evt.cancelBubble = true;
            }
        }
        if(!evt.stop){
            evt.stop = function(){
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
    * @param {date|string} date or date string
    * @param {date|string} date or date string
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
	/*
	 * @function format date or date string in specified form
	 * @param {date|string} date or date string
	 * @param {string} format form (everybody knows what it looks like)
	 * @return {string} date formated string
	 */
	dateFormat: function (date, formatStr){
		if($.type(date) !== 'date')
			date = date.toDate();
		return date.toFormatString(formatStr);
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
            else{
                url = foo.href || foo.getAttribute('href');
				fm.target = foo.target || '_self';
			}
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
    }
};

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
    _searchType: SEARCH_TYPE.ROUND,
	_intlSearchType: SEARCH_TYPE.ROUND,
	_isSearchIntl: false, // 搜索海外机酒
    _isInitFreeCombine: false,
    _isInitOneRound: false,

    // 初始化某些页面元素以备使用
    _initElements: function () {
        // divLoading should be visible at first to make sure the loading.gif be downloaded.
        $('#divLoading').addClass('hidden');

        // 很抱歉（SEO）
        var nodata = $('#noData')[0];
        nodata.innerHTML = nodata.innerHTML + FHConfig.texts.noData;
    },
    // 用户原声
    _initUserVoice: function () {
        $.mod.load('sideBar', '2.0', function (){
			var sidebar = $(document).regMod('sideBar', '2.0', {
				url: {
					feedBackURL: 'http://accounts.ctrip.com/MyCtrip/Community/CommunityAdvice.aspx?productType=12'
				},
				HTML: '<div class="side_fixed" id="sidebar"> <a class="to_top" title="${backTop}" href="javascript:;" id="gotop2"> </a> <a target="_blank" class="c_sidebar" href="${feedBackURL}" title="${feedBack}">${feedBack}</a></div>'
			});
		});
    },
	// 国内/国际切换
	_initMainTab: function (){
		var tabs = $('#divMainSearchBox').find('>div.tabs li');
		//contents = $('#divMainSearchBox').find('>div.tabs_content');
		
		function switchSearch(){
			if(FH._isSearchIntl){
				// switch to round way
				$('#switchType').find('input:first').trigger('click')[0].checked = true;
				// for ie6, so skillful
				OneRounder.selectChildren[0].style.position = "absolute";
                OneRounder.selectChildren[0].style.top = '-1000px';
				
				if($('#chkHotelDate')[0].checked){
					// 收起入离日期修改
					$('#chkHotelDate').trigger('click');
					$('#chkHotelDate')[0].checked = false;
                    Mod.setCalValue(OneRounder.txtCheckInDate, OneRounder.txtDDate.value());
                    Mod.setCalValue(OneRounder.txtCheckOutDate, OneRounder.txtRDate.value());
				}
				S.hide($('#divChkHotelDate'));
				S.hide($('#switchType'));
				$('#searchContent').addClass('hk_content');
			
				S.hide($('#trDomesticAddress'));
				S.show($('#trIntlAddress'));
				
				if(!OneRounder.isInitIntlAddress)
					OneRounder.initIntlAddress();
				
				OneRounder.txtIntlDCity[0].name = 
					OneRounder.txtDCity[0].name;
				OneRounder.txtDCity[0].name = '';
				
				OneRounder.rdoAcities[0][0].name = OneRounder.txtACity[0].name;
				OneRounder.rdoAcities[1][0].name = OneRounder.txtACity[0].name;
				OneRounder.txtACity[0].name = '';
				
				OneRounder.selectChildren.value(0);
			}else{
				$('#searchContent').removeClass('hk_content');
				
				OneRounder.selectChildren[0].style.position = "";
                OneRounder.selectChildren[0].style.top = "";
				
				S.show($('#divChkHotelDate'));
				S.show($('#switchType'));
			
				S.hide($('#trIntlAddress'));
				S.show($('#trDomesticAddress'));
				
				OneRounder.txtDCity[0].name = 
					OneRounder.txtIntlDCity[0].name;
				OneRounder.txtIntlDCity[0].name = '';
				
				OneRounder.txtACity[0].name = OneRounder.rdoAcities[0][0].name;
				OneRounder.rdoAcities[0][0].name = '';
				OneRounder.rdoAcities[1][0].name = '';
			}
		}
		
		tabs.each(function(tab, i){
			tab.bind('click',function (e){
				var other = Math.abs(1-i);
				$(tabs[other]).removeClass('select');
				$(tabs[i]).addClass('select');
				//S.hide(contents[other]);
				//S.show(contents[i]);
				FH._isSearchIntl = !!i;
				switchSearch();
			});
		});
		
		if(cQuery.browser.isIE6){
			setTimeout(function (){ // 解决IE6下绑定SelectListLimit后，下拉选择儿童又出现的诡异bug
				OneRounder.selectAdult.bind('change', function (){
					if(FH._isSearchIntl)
						S.hide(OneRounder.selectChildren);
				});
			},50);
		}
		
	},
	// 国内行程类型切换
    _initDomesticTab: function () {
        var searchContent = $('#searchContent'),
			freeChoice = $('#freeChoice'),
			s_calendar = $('#s_calendar'),
			searchBox = $('#searchBox'),
			adAreaBox = $('#adAreaBox');

		function switchType(n){
			if (n == SEARCH_TYPE.FREE_COMBINE) {
				//calendar and inputs init
				FH.initFreeCombine();

				searchContent.css('display:none');
				freeChoice.css('display:block');
				s_calendar.css('display:block');
				searchBox.addClass('search_box_full');
				adAreaBox.addClass('hidden');

				// modify page id
				//$('#page_id').value('105012');
			} else {
                
				// round and oneway input init
				FH.initOneRound();
                // switch date mod display status
                OneRounder.switchDateDisplay(!!n);

				freeChoice.css('display:none');
				s_calendar.css('display:none');
				searchBox.removeClass('search_box_full');
				adAreaBox.removeClass('hidden');
				searchContent.css('display:block');

				// modify page id
				//$('#page_id').value('105009');
			}
			FH._searchType = n;
		}
		
		// bind events
		var rdoes = $('#switchType').find('input');
		rdoes.each(function(rdo, i){
			rdo.bind('click',function (e){
				switchType(i);
			});
		});
		
        //init the selected tab
        var curTab = $('#hCurTab').value() - 0;
		switchType(curTab);
		rdoes[curTab].checked = true;
    },
	// 自由组合
	initFreeCombine: function (){
		if (!FH._isInitFreeCombine){
			FreeCombiner.init();
			FH._isInitFreeCombine = true;
		}
	},
	// 单程往返
	initOneRound: function (){
		if (!FH._isInitOneRound){
			OneRounder.init();
			FH._isInitOneRound = true;
		}
	},
    // 广告
    _initAds: function () {
        // head ad
        var banner = $('#banner');
		if(banner[0]){
			banner.regMod('allyes', '1.0', {
				"mod_allyes_user": banner[0].getAttribute('mod_allyes_user')
			});
		}

        $('#adAreaBox').find('div').each(function(item, i){
            item.regMod('allyes', '1.0', {
                "mod_allyes_user": item[0].getAttribute('data-ad')
            });
        });
		// main ad
		// $('#ad_up').regMod('allyes', '1.0', {
			// "mod_allyes_user": "ctrip|CTRIP_TUANGOU_BIGBUTTON_NEW|CTRIP_GROUP_JIJIU_UPBIGBUTTON_NEW3"
		// });
		// $('#ad_down').regMod('adFrame', '1.0', {
			// "mod_adframe_style": "width:470px;height:200px;",
			// "mod_adframe_src": FHConfig.URL.AD_DOWN
		// });
    },
    // 最新预订
	_initLastestBooking: function (){
		var recommendBox = $('#recommendBox');
		$.ajax(FHConfig.URL.LATEST_BOOKING, {
			method: cQuery.AJAX_METHOD_GET,
			cache: true,
			onsuccess: function (xhr, res) {
				if(!res) return;
				var tmpDiv = document.createElement('div');
				tmpDiv.innerHTML = res.trim();
				S.insertAfter($(tmpDiv).find('>ul'), recommendBox);
                S.insertAfter($(tmpDiv).find('>h3'), recommendBox);
			},
			onerror: function () { cQuery.log('error'); }
		});
	},
    init: function () {
        FH._initElements();
		// 初始化 国内/国际切换
		FH._initMainTab();
        // 初始化 国内 单程 往返 自由组合 Tab切换
        FH._initDomesticTab();
		// 初始搜索历史
		HistorySearcher.init();
        // 初始化 底部 推荐信息 城市对
		Recommender.init();
        // 初始化 用户原声
        FH._initUserVoice();
		// 广告
        FH._initAds();
		// 最新预订
		FH._initLastestBooking();
        // 表单提交限制
        S.limitSubmit(fm);
    },
	
    search: function (searchType, isSearchIntl) {
		var isSearchHistory = false;
		if($.type(searchType) === 'number'){
			FH._searchType = searchType;
			isSearchHistory = true;
		}
		if(typeof isSearchIntl !== 'undefined'){
			FH._isSearchIntl = isSearchIntl;
			isSearchHistory = true;
		}
	
        if (FH._searchType == SEARCH_TYPE.FREE_COMBINE) {
            if (FH.airLineManager.isEmpty() || FH.hotelManager.isEmpty())
                return;
            // save info for recovery in history
            $('#hOriginSearchInfo').value(FH.airLineManager.hInfo.value() + '|' + FH.hotelManager.hInfo.value());
            fm.action = FHConfig.URL.FREE_COMBINE_SEARCH;
        } else {
			if(FH._isSearchIntl){
				if (!OneRounder.validateIntl()) return;
				fm.action = OneRounder.generateIntlUrl();
			}else{
				if (!OneRounder.validate()) return;
				fm.action = OneRounder.generateUrl();
			}
			OneRounder.save(OneRounder.cookieKey);
        }

		// 保存搜索历史
		if(!isSearchHistory) // 非指定历史搜索时保存
			HistorySearcher.save(FH._searchType);
		
        // loading
        $('#divLoading').removeClass('hidden').mask();
        if (cQuery.browser.isIE) {
            // fix animated gif problem
            setTimeout(function (s) {
                $('#divLoading').find('p')[0].style.backgroundImage = 'url(http://pic.c-ctrip.com/common/loading.gif)';
            }, 20);
        }
        fm.submit();
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
            return Mod.showTips(dc, FHConfig.validateMessage.flight[0]);
        if (acV == "")
            return Mod.showTips(ac, FHConfig.validateMessage.flight[1]);
        if (dcV == acV)
            return Mod.showTips(ac, FHConfig.validateMessage.flight[10]);
        if (ddV == "")
            return Mod.showTips(dd, FHConfig.validateMessage.flight[2]);
        if (!ddV.isDate())
            return Mod.showTips(dd, FHConfig.validateMessage.flight[4]);
		if (ddV.toDate() <= new Date())
			return Mod.showTips(dd, FHConfig.validateMessage.hotel[7]);	
        if (rd && rdV != '') {
            if (!rdV.isDate())
                return Mod.showTips(rd, FHConfig.validateMessage.flight[16]);
            if (dd.value().toDate() >= rd.value().toDate())
                return Mod.showTips(rd, FHConfig.validateMessage.flight[7]);
				
			var dayDiff = S.dateDiff(rdV, ddV, 'd');
			if (dayDiff > 28)
				return Mod.showTips(rd, FHConfig.validateMessage.hotel[9]);
        }
        return true;
    },
    // 入住城市，入住时间，离开时间
    isHotelPass: function (hc, cid, ld) {
        var hcV = hc.value().trim(),
		cidV = cid.value().trim(),
		ldV = ld.value().trim();
        if (hcV == "")
            return Mod.showTips(hc, FHConfig.validateMessage.hotel[0]);
        if (cidV == "")
            return Mod.showTips(cid, FHConfig.validateMessage.hotel[4]);
        if (!cidV.isDate())
            return Mod.showTips(cid, FHConfig.validateMessage.hotel[6]);
        if (ldV == "")
            return Mod.showTips(ld, FHConfig.validateMessage.hotel[5]);
        if (!ldV.isDate())
            return Mod.showTips(ld, FHConfig.validateMessage.hotel[6]);
        if (cid.value().toDate() >= ld.value().toDate())
            return Mod.showTips(ld, FHConfig.validateMessage.hotel[8]);
        // 28天限制
        var dayDiff = S.dateDiff(ldV, cidV, 'd');
        if (dayDiff > 28)
            return Mod.showTips(ld, FHConfig.validateMessage.hotel[9]);

        return true;
    },
    // 航班时间与酒店时间限制
    isDatePass: function (dd, rd, cid, cod) {
        if(dd.value().toDate() > cid.value().toDate())
            return Mod.showTips(cid, FHConfig.validateMessage.hotel[13]);
        if(rd.value() && rd.value().toDate() < cod.value().toDate())
            return Mod.showTips(cod, FHConfig.validateMessage.hotel[14]);
        return true;
    }
}
// 单程往返
var OneRounder = {

	isInitIntlAddress: false,

	cookieKey: 'FH_Search',
	// 当开始日期不合理时，默认的开始时间
	startDate: new Date().toFormatString('yyyy-MM-dd').toDate().addDays(2),
	/*
	 * @function
		根据搜索历史的日期与当前日期，获得合理的日期信息
		isShow 是否是显示，过期就不呈现日期（返回空）
	 * @return {object}
	 */
	getProperDate: function (ddate, rdate, isShow, checkInDate, checkOutDate){
		
		if(!ddate) return null; // 第一次进入首页
		
		ddate = ddate.toDate();
		var dif = ddate <= new Date() ? S.dateDiff(ddate, this.startDate, 'd') : 0;
		
		return dif > 0 ? {
				ddate: !isShow ? ddate.addDays(dif).toFormatString('yyyy-MM-dd') : '',
				rdate: (rdate && !isShow) ? rdate.toDate().addDays(dif).toFormatString('yyyy-MM-dd') : '',
				checkInDate: (checkInDate && !isShow) ? checkInDate.toDate().addDays(dif).toFormatString('yyyy-MM-dd') : '',
				checkOutDate: (checkOutDate && !isShow) ? checkOutDate.toDate().addDays(dif).toFormatString('yyyy-MM-dd') : ''
			} : {
				ddate: ddate.toFormatString('yyyy-MM-dd'),
				rdate: rdate || '',
				checkInDate: checkInDate || '',
				checkOutDate: checkOutDate || ''
			}
	},
	// 搜索验证
	validate: function (){
		// insure hidden value
		this.txtDCity.address.method('validate');
		this.txtACity.address.method('validate');
		
		var noNeedCheckHotel = false;
		if($('#divChangeHotelDate').hasClass('hidden')){
			this.txtCheckInDate .value(this.txtDDate.value());
            Mod.setCalValue(this.txtCheckOutDate, this.txtRDate.value());
			noNeedCheckHotel = true;
		}
		
		// 在勾选修改时验证CheckIn与CheckOut时间
		return Validator.isFlightPass(
				this.txtDCity, 
				this.txtACity, 
				this.txtDDate, 
				FH._searchType == SEARCH_TYPE.ROUND ? this.txtRDate : undefined
			) && (noNeedCheckHotel || (Validator.isHotelPass(this.txtACity, this.txtCheckInDate, this.txtCheckOutDate) &&
                 Validator.isDatePass(this.txtDDate, this.txtRDate, this.txtCheckInDate, this.txtCheckOutDate)));
	},
	// 验证港澳
	validateIntl: function (){
		this.txtIntlDCity.address.method('validate');
		this.txtRDate.trigger('blur');//触发港澳返回日期填充逻辑
		
		return Validator.isFlightPass(
			this.txtIntlDCity, 
			this.rdoAcities[0],
			this.txtDDate, 
			this.txtRDate
		);
	},
	//生成SEO FHConfig.URL
	generateUrl: function (){
		var searchType = ['round', 'oneway', 'theway'][FH._searchType];
		// 根据返回时间再设置一次searchType
		if(this.txtRDate.value() == '')
			searchType = 'oneway';
		
		return S.format(FHConfig.URL.FLTHOTEL_SEARCH, searchType, this.hDCityPY.value().replace("'",""), this.hDCity.value(), this.hACityPY.value().replace("'",""), this.hACity.value()).toLowerCase();
	},
	// 生成国际SEO URL
	generateIntlUrl: function (){
		var searchType = ['round', 'oneway', 'theway'][FH._intlSearchType];
		var url = window.location.protocol + '//' + window.location.host + '/' + 'international' + FHConfig.URL.FLTHOTEL_SEARCH;
		return S.format(url, searchType, this.hDCityPY.value().replace("'",""), this.hDCity.value(), this.hACityPY.value().replace("'",""), this.hACity.value()).toLowerCase();
	},

	init: function (){
        //address
        this._initAddress();
        // date calendar
        this._initDateMod();
		// init limit between adult\children\room select lists
		var selectAdult = this.selectAdult = $('#AdultSelect'),
			selectChildren = this.selectChildren = $('#ChildrenSelect'),
			selectRoom = this.selectRoom = $('#RoomSelect');
		// recover from cookie
		this.recover(this.cookieKey);
		// select
        FH.SelectListLimit.regAdultChildBond(selectAdult, selectChildren);
        FH.SelectListLimit.regAdultRoomBond(selectAdult, selectRoom);
	},
	// 单程往返切换时，日期输入框切换逻辑
	switchDateDisplay: function (isOneWay, isInit){
		// switch date mod display status according to the search type
		isOneWay ?
			S.hide(this.txtRDate.parentNode()) :
			S.show(this.txtRDate.parentNode());
        // 日期调整
        isOneWay && Mod.setCalValue(this.txtRDate, '');
        this.txtRDate.notice.method('checkValue');

        if(this.txtRDate.value() == ''){
            this.txtCheckInDate.data('maxDate', '');
            this.txtCheckOutDate.data('maxDate', '');
        }
	},
	
	//保留最近一次单程往返搜索
	save: function (key, opts){
		// set domain to share in all channel in ctrip
		var domain = window.location.href.indexOf('ctrip.com') > 0 ? 'ctrip.com' : 'ctriptravel.com';
		opts = opts || { expires: 2, domain: domain }; // opts is shared in subkeys, just set it at last
		cQuery.cookie.set(key, 'dcity', this.txtDCity.value(), opts);
		cQuery.cookie.set(key, 'acity', this.txtACity.value(), opts);
		cQuery.cookie.set(key, 'ddate', this.txtDDate.value(), opts);
		cQuery.cookie.set(key, 'rdate', this.txtRDate.value(), opts);
		cQuery.cookie.set(key, 'checkIn', this.txtCheckInDate.value(), opts);
		cQuery.cookie.set(key, 'checkOut', this.txtCheckOutDate.value(), opts);
		cQuery.cookie.set(key, 'adult', this.selectAdult.value(), opts);
		cQuery.cookie.set(key, 'children', this.selectChildren.value(), opts);
		cQuery.cookie.set(key, 'room', this.selectRoom.value(), opts);
		$('#chkHotelDate')[0].checked && cQuery.cookie.set(key, 'chkHotelDate', 'true', opts);
		cQuery.cookie.set(key, 'night', $('#hNight').value(), opts);
		// for intl
        if(this.txtIntlDCity){
            cQuery.cookie.set(key, 'isIntl', +FH._isSearchIntl, opts);
            cQuery.cookie.set(key, 'intl_dcity', this.txtIntlDCity.value(), opts);
            this.rdoAcities.each(function(rdo, i){
                if(rdo[0].checked)
                    cQuery.cookie.set(key, 'intl_acity', rdo[0].value, opts);
            });
        }
	},
	//恢复最近一次单程往返搜索
	recover: function (key){
		var txtDCity = this.txtDCity,
			txtACity = this.txtACity,
			txtDDate = this.txtDDate,
			txtRDate = this.txtRDate,
			txtCheckInDate = this.txtCheckInDate,
			txtCheckOutDate = this.txtCheckOutDate,
			selectAdult = this.selectAdult,
			selectChildren = this.selectChildren,
			selectRoom = this.selectRoom;
	
		txtDCity[0].value = cQuery.cookie.get(key, 'dcity') || txtDCity[0].value;
		txtACity[0].value = cQuery.cookie.get(key, 'acity') || txtACity[0].value;
		
		// for intl
		$('#txtIntlDCity').value( cQuery.cookie.get(key, 'intl_dcity') || $('#txtIntlDCity').value() );
		var intl_acity = cQuery.cookie.get(key, 'intl_acity');
		if(intl_acity){
			[$('#rdoAcity1'), $('#rdoAcity2')].each(function(rdo, i){
				if(rdo[0].value == intl_acity)
					rdo.trigger('click');
			});
		}
		
		selectAdult[0].value    = cQuery.cookie.get(key, 'adult') || selectAdult[0].value;
		selectChildren[0].value = cQuery.cookie.get(key, 'children') || selectChildren[0].value;
		selectRoom[0].value = cQuery.cookie.get(key, 'room') || selectRoom[0].value;
		
		var chkHotelDate = $('#chkHotelDate'),
            divChangeHotelDate = $('#divChangeHotelDate');
		if(cQuery.cookie.get(key, 'chkHotelDate')){	
            S.show(divChangeHotelDate);
			chkHotelDate[0].checked = true;
		}else{
            S.hide(divChangeHotelDate);
            chkHotelDate[0].checked = false;
        }
		
		$('#hNight')[0].value = cQuery.cookie.get(key, 'night') || $('#hNight')[0].value;
		$('#spanNight')[0].innerHTML = 
			$('#spanNight')[0].innerHTML.replace(/\d+|\-\-/, 
				cQuery.cookie.get(key, 'night') || $('#hNight')[0].value);
		
		var dateDic = OneRounder.getProperDate(
			cQuery.cookie.get(key, 'ddate'),
			cQuery.cookie.get(key, 'rdate'),
			false,
			cQuery.cookie.get(key, 'checkIn'),
			cQuery.cookie.get(key, 'checkOut')
		);
		
		if(dateDic){
            txtDDate[0].value = dateDic.ddate;
            txtRDate[0].value = dateDic.rdate;
            txtCheckInDate[0] .value = dateDic.checkInDate;
            txtCheckOutDate[0].value = dateDic.checkOutDate;
            txtDDate.calendar.method('setWeek', txtDDate[0]);
            txtRDate.calendar.method('setWeek', txtRDate[0]);
            txtCheckInDate.calendar.method('setWeek', txtCheckInDate[0]);
            txtCheckOutDate.calendar.method('setWeek', txtCheckOutDate[0]);
            // timeout to avoid the data being changed in the mod init 
            setTimeout(function (argument) {
                txtRDate.data('startDate', dateDic.ddate);
                txtRDate.data('minDate', dateDic.ddate);
                txtCheckInDate .data('minDate', dateDic.ddate);
                txtCheckInDate .data('maxDate', dateDic.rdate);
                txtCheckOutDate.data('maxDate', dateDic.rdate);
                txtCheckOutDate.data('startDate', dateDic.checkInDate);
                txtCheckOutDate.data('minDate', dateDic.checkInDate);
            },200)
		}
	},
	
	// 初始化 国际地址选择器
	initIntlAddress: function (){
		var txtDCity = this.txtIntlDCity = $('#txtIntlDCity');
		
		Mod.regAddress(txtDCity, 'txtIntlDCity', 'homecity_name', {
            'code': this.hDCity,
            'szm': this.hDCitySZM,
            'name_py': this.hDCityPY
        });
		
		Mod.regNotice(txtDCity, 'txtIntlDCity', 1);
		
		var rdoAcities = this.rdoAcities = [$('#rdoAcity1'), $('#rdoAcity2')];
		var self = this, cities = FHConfig.intlCities;
		rdoAcities.each(function(rdo, i){
			rdo.bind('click',function (e){
				var selectedACity = cities[i];
				self.hACity.value(selectedACity.id);
				self.hACitySZM.value(selectedACity.szm);
				self.hACityPY.value(selectedACity.py);
			});
			
			if(rdo[0].checked)
				rdo.trigger('click');
		});
		
		this.isInitIntlAddress = true;
		
		// for intl package date
		var txtDDate = $('#txtDDate'), txtRDate = $('#txtRDate');
		txtRDate.bind('blur', function (){
			if(FH._isSearchIntl){
				if(txtDDate.value().isDate() && !txtRDate.value().isDate())
					Mod.setCalValue(txtRDate, txtDDate.value().toDate().addDays(1).toStdDateString());
			}
		});
	},
	
	_initAddress: function (){
		var txtDCity = this.txtDCity = $('#txtDCity'),
			txtACity = this.txtACity = $('#txtACity'),
			hDCity = this.hDCity = $("#D_city"),
			hACity = this.hACity = $("#A_city"),
			hDCitySZM = this.hDCitySZM = $('#D_city_szm'),
			hACitySZM = this.hACitySZM = $('#A_city_szm'),
			hDCityPY = this.hDCityPY = $('#D_city_py'),
			hACityPY = this.hACityPY = $('#A_city_py');
			
		Mod.regAddress(txtDCity, 'txtDCity', 'homecity_name', {
            'code': hDCity,
            'szm': hDCitySZM,
            'name_py': hDCityPY
        });
        Mod.regAddress(txtACity, 'txtACity', 'destcity_name', {
            'code': hACity,
            'szm': hACitySZM,
            'name_py': hACityPY
        }, true);
		
		//notice
        Mod.regNotice(txtDCity, 'txtDCity', 1);
        Mod.regNotice(txtACity, 'txtACity', 1);
        
        // test destination city for domesctination and internation switching
        txtACity.bind('blur',function (e){
            if(txtACity.value() == '香港' || txtACity.value() == '澳门' || txtACity.value() == '澳門'){
                // switch ui
                $('#divMainSearchBox').find('>div.tabs li:last').trigger('click');
                var which = txtACity.value() != '香港' ? 2 : 1;
                setTimeout(function (){
                    $('#rdoAcity' + which).trigger('click')[0].checked = true;
                }, 50);
                // clear hidden data
                hACity.value('');
                hACityPY.value('');
                hACitySZM.value('');
                txtACity.value('');
                txtACity.notice.method('checkValue');
            }
        });
	},
	
	_initDateMod: function (){
		var txtDDate = this.txtDDate = $('#txtDDate'),
			txtRDate = this.txtRDate = $('#txtRDate'),
			txtCheckInDate = this.txtCheckInDate = $('#txtCheckInDate'),
			txtCheckOutDate = this.txtCheckOutDate = $('#txtCheckOutDate');
	
		var spanNight = $('#spanNight'),
			hNight = $('#hNight');
		
		function countNights() {
			var d1, d2;
            // 由于_searchType一直在变化，所以在函数内部进行检测
			d1 = txtCheckInDate.value();
			d2 = txtCheckOutDate.value();
			
			return (d1.isDate() && d2.isDate() && d2.toDate() > d1.toDate()) ?
					S.dateDiff(d1, d2, 'd') : '--';
        }
		
		function setNights(){
			var night = countNights();
			spanNight[0].innerHTML = spanNight[0].innerHTML.replace(/\d+|\-\-/, night);
			hNight.value(night);
		}
		
		var calendars = [];
		calendars[0] = txtDDate.regMod('calendar', '3.0', {
            options: {
                minDate: new Date().addDays(1).toStdDateString(),
                showWeek: true,
                container: cQuery.container
            },
            listeners: {
                onChange: function (input, value) {
                    //can not change when user type the date
                    txtRDate.data('startDate', value);
                    txtRDate.data('minDate', value);
						
					Mod.setCalValue(txtCheckInDate, value);
					Mod.setCalValue(txtCheckOutDate, value.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
					// remove selClass -- notice problem
					txtCheckInDate.notice.method('checkValue');
					txtCheckOutDate.notice.method('checkValue');
					
					txtCheckInDate.data('minDate', value);
					txtCheckOutDate.data('startDate', value);
					txtCheckOutDate.data('minDate', value);
					
					setNights();
					
					if (FH._searchType == SEARCH_TYPE.ROUND)
						setTimeout(function (){
							txtRDate[0].focus();
						},1)
                }
            }
        });
        calendars[1] = txtRDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtDDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtDDate"
            }, 
			listeners: {
                onChange: function (input, value) {
					Mod.setCalValue(txtCheckOutDate, value);
					
					// max select date
					txtCheckInDate.data('maxDate', value);
					txtCheckOutDate.data('maxDate', value);
			
					setNights();
                }
            }
        });
		calendars[2] = txtCheckInDate.regMod('calendar', '3.0', {
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
        });
        calendars[3] = txtCheckOutDate.regMod('calendar', '3.0', {
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
        });
		txtDDate.calendar = calendars[0];
		txtRDate.calendar = calendars[1];
		txtCheckInDate.calendar = calendars[2];
		txtCheckOutDate.calendar = calendars[3];
		
		// check to hide or show hotel date input 
		$('#chkHotelDate').bind('click',function (e){
			var divChangeHotelDate = $('#divChangeHotelDate');
			divChangeHotelDate.hasClass('hidden') ? S.show(divChangeHotelDate) : S.hide(divChangeHotelDate);
		});
		
		//notice
		Mod.regNotice(txtDDate, 'txtDDate', 0);
        Mod.regNotice(txtRDate, 'txtRDate', 0);
        Mod.regNotice(txtCheckInDate, 'txtCheckInDate', 0);
        Mod.regNotice(txtCheckOutDate, 'txtCheckOutDate', 0);
	}
}
// 自由组合
var FreeCombiner = {

	init: function (){
		this._initCalendar();
		this._initManager();
		this._initFlightManager();
		this._initHotelManager();
		this._bindEvents();
		this.recover();
	},
	
	_initCalendar: function (){
		// calendar
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
                    if (e.target.nodeName != 'A')
                        return;

                    if (e.target.className == 'cal_right') {
                        _this.switchMonth(true);
                    } else {
                        _this.switchMonth(false);
                    }
                });

                var btnClose = pnl.find('a.del');
                if (!btnClose[0])
                    return;
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
                if (this._fltHotelData == '')
                    return null;

                var ret = {}, // ret[day][which] = count
					rYM = new RegExp(S.format('@$1-\\d?$2-(\\d{1,2}):(\\d):(\\d)', y, m), 'g'),
					matches = null;

                do {
                    matches = rYM.exec(this._fltHotelData);
                    if (matches == null || matches.length < 1)
                        break;

                    if (!ret[matches[1]])
                        ret[matches[1]] = [0, 0]; // give a default to avoid the undefined value
                    ret[matches[1]][matches[2]] = matches[3];

                } while (matches);

                return ret;
            },

            addFltHotelData: function (dateStr, which, count) {
                dateStr = S.dateFormat(dateStr, 'yyyy-MM-dd');
                var counts = [0, 0], //give the default value of int
					r = new RegExp(S.format('@$1:(\\d):(\\d)', dateStr), 'g'),
					r2 = new RegExp(S.format('@$1:$2:(\\d)', dateStr, which), 'g'),
					matches = [],
					match = null,
					isMatch = false;

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
                dateStr = S.dateFormat(dateStr, 'yyyy-MM-dd');
                var counts = [0, 0], //give the default value of int
					r = new RegExp(S.format('@$1:(\\d):(\\d)', dateStr), 'g'),
					r2 = new RegExp(S.format('@$1:$2:(\\d)', dateStr, which), 'g'),
					matches = [],
					match = null,
					isMatch = false;

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
                if(!dateStr) return;
                var date = dateStr.split('-'),
				counts;
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
                if(!dateStr) return;
                var date = dateStr.split('-'),
				counts;
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
	},
	
	_initManager: function (){
		/**
        * @class 航程\酒店管理器
        * @param { string } 添加项时用的HTML模板
        * @param { cDom } 填写内容左上角的编号元素
        * @param { cDom } 填写内容的DIV
        * @param { cDom } 警告Div
        * @param { cDom } 数据保存的隐藏域
        * @param { number } 程数限制
        * @param { object } 在对象中要重写的模板方法
        */
        FH.Manager = function (tmpl, lbNum, divInput, divAlert, hInfo, limit, methods) {

            this.tmpl = tmpl;
            this.lbNum = lbNum;
            this.divInput = divInput;
            this.divBox = $(divInput[0].parentNode);
            this.divAlert = divAlert;
            this.hInfo = hInfo;
            this.limit = limit;
            this._data = [];
            this._count = 0;
            this._editedItem = undefined;
            this._editedIndex = -1;
            // use to remove icon
            this._oldDates = [];
            // old icon count
            this._oldCount = 0;
            // set the info null
            hInfo.value('');

            $.extend(this, methods);

            if (!FH.Manager._init) {

                $.extend(FH.Manager.prototype, {
                    tmplRoute: FHConfig.freeCombine.tmplRoute,

                    // 更新数据隐藏域
                    _updateInfo: function () {
                        var info = this._data.map(function (data, i){
							return data.join(',');
						});
                        this.hInfo.value(info.join(';'));
                    },

                    _saveAdd: function (item) {
                        var itemHtml = this.getItemHtml(item);

                        var element = S.create(itemHtml);
                        this.divBox[0].appendChild(element);

                        this._data.push(item);
                        this.updateCalender('add', this._count);
                        this._count++;
                        this._updateInfo();

                        return $(element);
                    },

                    _saveEdit: function () {
                        var item = this.getItem();
                        var itemHtml = this.getItemHtml(item);

                        this._editedItem.ohtml(itemHtml);
                        S.show(this._editedItem);
                        this._data[this._editedIndex] = item;
                        this.updateCalender('edit', this._editedIndex);
                        this._updateInfo();

                        this._editedItem = undefined;
                        this._editedIndex = -1;

                        return this._editedItem;
                    },

                    save: function () {
                        if (!this.validate())
                            return;
                        S.hide(this.divInput);

                        var saveOne = !this._editedItem ? this._saveAdd(this.getItem()) : this._saveEdit();
                        if (cQuery.browser.isIE6)
                            this.fixIE6Hover(saveOne);

                        S.hide(this.divAlert);
                    },
					// add data item
                    addItem: function (item) {
                        var saveOne = this._saveAdd(item);
                        if (cQuery.browser.isIE6)
                            this.fixIE6Hover(saveOne);
                    },
					// adding
                    add: function () {
                        // the edit item lock the input box
                        if (this._editedItem)
                            return;

                        if (this.isOver())
                            return;

                        this.lbNum.text(S.format(this.tmplRoute, this._count + 1));
                        S.show(this.divInput);
                        this.divInput.appendTo(this.divBox);
                    },
					// editing
                    edit: function (i, obj) {
                        if (this._editedItem) {
                            S.show(this._editedItem);
                        }

                        this.lbNum.text(S.format(this.tmplRoute, i + 1));
                        this._editedItem = $(obj.parentNode.parentNode);
                        S.hide(this._editedItem);
                        this._editedIndex = i;
                        // save old date to remove the icon
                        this.saveOldDate(i);
                        this.saveOldCount(i);
                        this.resetForm(i);
                        S.show(this.divInput);
                        S.insertAfter(this.divInput, this._editedItem);
                    },
					// delete data item
                    remove: function (i, obj) {
                        // the edit item lock the input box
                        if (this._editedItem)
                            return;

                        var itemUL = obj.parentNode.parentNode;
                        var uls = $(itemUL.parentNode).find('ul');
                        var tmp;
                        for (var k = i + 1, len = uls.length; k < len; k++) {
                            tmp = $(uls[k]).find('li');
                            tmp[0].innerHTML = '<b>' + S.format(this.tmplRoute, k) + '</b>';
                            tmp[4].innerHTML = tmp[4].innerHTML.replace(/\d/g, k - 1);
                        }
                        itemUL.parentNode.removeChild(itemUL);

                        // update calendar before remove the item data which is used to location the date
                        this.updateCalender('remove', i);
                        this._data.splice(i, 1);
                        this._count--;
                        this._updateInfo();

                        // the num should be changed when the input div is showing out cause of the add operation
                        this.lbNum.text(S.format(this.tmplRoute, this._count + 1));
                    },
					// clear all the data items and reset the object status
					clear: function (){
						this.hInfo.value('');
						this._data = [];
						this._count = 0;
						this._editedItem = undefined;
						this._editedIndex = -1;
						this._oldDates = [];
					},
					
                    cancel: function () {
                        S.hide(this.divInput);

                        // process the edit
                        if (this._editedItem) {
                            S.show(this._editedItem);
                            this._editedItem = undefined;
                            this._editedIndex = -1;
                        }

                        S.hide(this.divAlert);
                    },

                    // judge wether the count of route is over the limit
                    isOver: function () {
                        if (this._data.length == this.limit) {
                            this.divAlert.html(FHConfig.freeCombine.tips[this.limit][1]);
                            S.show(this.divAlert);
                            return true;
                        }
                        S.hide(this.divAlert);
                        return false;
                    },

                    isEmpty: function () {
                        if (this.hInfo.value() == '') {
                            this.divAlert.html(FHConfig.freeCombine.tips[this.limit][0]);
                            S.show(this.divAlert);
                            return true;
                        }
                        S.hide(this.divAlert);
                        return false;
                    },

                    // bind hover event on item for ie
                    fixIE6Hover: function (item) {
                        var timer;
                        item.bind('mouseover', function () {
                            clearTimeout(timer);
                            item.addClass('hover');
                        });
                        item.bind('mouseout', function () {
                            clearTimeout(timer);
                            timer = setTimeout(function () {
                                item.removeClass('hover');
                            }, 30);
                        });
                    }
                });

                // switch date to the specified date of the first added data
                var funcOrigin = FH.Manager.prototype._saveAdd;
                FH.Manager.prototype._saveAdd = function (item) {
                    var ret = funcOrigin.call(this, item);

                    var dateStr = this.getShowDate();
                    var date = dateStr.toDate(), today = new Date();
                    var y = date.getFullYear(), m = date.getMonth() + 1;
                    if (today.getFullYear() != y || today.getMonth() + 1 != m) {
                        FH.Calendar.switchDate(date.getFullYear(), date.getMonth() + 1);
                    }

                    FH.Manager.prototype._saveAdd = funcOrigin;
                    return ret;
                }

                FH.Manager._init = true;
            }

            this.init();
        }

	},
	
	_initFlightManager: function (){
		FH.airLineManager = new FH.Manager(
				FHConfig.freeCombine.tmplAirline,
				$('#AirlineNum'),
				$('#AirlineInput'),
				$('#fltAlert'),
				$('#FlightSearchInfoHidden'),
				3, {
				    init: function () {
				        var txtDCity = $('#txtAirDCity'),
							txtACity = $('#txtAirACity'),
							hDCity = $('#Air_D_city'),
							hDCitySZM = $('#Air_D_city_szm'),
							hACity = $('#Air_A_city'),
							hACitySZM = $('#Air_A_city_szm'),
							txtLeaveDateTime = $('#txtAirDDate'),
							txtArriveDateTime = $('#txtAirADate'),
							selectWay = $('#AirlineWaySelect'),
							selectAirPersonNum = $('#AirPersonNumSelect'),
							selectAirChildrenNum = $('#AirChildrenNumSelect');

				        Mod.regNotice(txtDCity, 'txtAirDCity', 1);
				        Mod.regNotice(txtACity, 'txtAirACity', 1);
				        Mod.regNotice(txtLeaveDateTime, 'txtAirDDate', 0);
				        Mod.regNotice(txtArriveDateTime, 'txtAirADate', 0);

				        Mod.regAddress(txtDCity, 'txtAirDCity', 'homecity_name', {
				            'code': hDCity,
				            'szm': hDCitySZM
				        });
				        Mod.regAddress(txtACity, 'txtAirACity', 'destcity_name', {
				            'code': hACity,
				            'szm': hACitySZM
				        });

				        txtLeaveDateTime.regMod('calendar', '3.0', {
				            options: {
				                minDate: new Date().addDays(1).toStdDateString(),
				                showWeek: true,
				                container: cQuery.container
				            },
				            listeners: {
				                onChange: function (input, value) {
				                    //can not change when user type the date
									txtArriveDateTime.data('minDate', value);
				                    txtArriveDateTime.data('startDate', value);
				                    if (selectWay.value() == '1')
				                        txtArriveDateTime[0].focus();
				                }
				            }
				        });
				        txtArriveDateTime.regMod('calendar', '3.0', {
				            options: {
				                minDate: new Date().addDays(1).toStdDateString(),
				                showWeek: true,
				                reference: "#txtAirDDate"
				            }
				        });

				        selectWay.bind('change', function () {
				            if (selectWay.value() == 0) {
				                S.hide(txtArriveDateTime);
				                S.hide(S.prev(txtArriveDateTime));
				                S.hide(S.prev(S.prev(txtArriveDateTime)));
				            } else {
				                S.show(txtArriveDateTime);
				                S.show(S.prev(txtArriveDateTime));
				                S.show(S.prev(S.prev(txtArriveDateTime)));
				            }
				        });
				        // to init the display state of txtArriveDateTime
				        S.trigger(selectWay, 'change');

				        FH.SelectListLimit.regAdultChildBond(
							selectAirPersonNum,
							selectAirChildrenNum);

				        this.txtDCity = txtDCity;
				        this.txtACity = txtACity;
				        this.hDCity = hDCity;
				        this.hDCitySZM = hDCitySZM;
				        this.hACity = hACity;
				        this.hACitySZM = hACitySZM;
				        this.txtLeaveDateTime = txtLeaveDateTime;
				        this.txtArriveDateTime = txtArriveDateTime;
				        this.chidrenNum = selectAirChildrenNum;
				        this.personNum = selectAirPersonNum;
				        this.selectWay = selectWay;
				    },
				    validate: function () {
                        this.txtDCity.address.method('validate');
						this.txtACity.address.method('validate');
				        if (this.selectWay.value() == 0)
				            return Validator.isFlightPass(this.txtDCity, this.txtACity, this.txtLeaveDateTime);
				        else{
							// validate return date
							if(this.txtArriveDateTime.value().trim() == '')
								return Mod.showTips(this.txtArriveDateTime, FHConfig.validateMessage.flight[5]);
				            return Validator.isFlightPass(this.txtDCity, this.txtACity, this.txtLeaveDateTime, this.txtArriveDateTime);
						}
				    },
				    getItem: function () {
				        return [
							this.hDCity.value(), this.hDCitySZM.value(), this.txtDCity.value(),
							this.hACity.value(), this.hACitySZM.value(), this.txtACity.value(),
							this.chidrenNum.value(), this.personNum.value(), this.selectWay.value(),
							this.txtLeaveDateTime.value(), 
                            this.selectWay.value() == '1' ? this.txtArriveDateTime.value() : ''
						];
				    },
				    getItemHtml: function (item) {
				        var index = this._editedIndex > -1 ? this._editedIndex : this._count;
				        var arrow = item[8] == "1" ? "&harr;" : "&rarr;"; // 单程往返箭头
				        var data = {
				            index: index, route: index + 1,
				            dcity: item[2], acity: item[5],
				            ddate: item[9], rdate: item[10],
				            adults: item[7], children: item[6],
				            arrow: arrow
				        };
				        return cQuery.tmpl.render(this.tmpl, data);
				    },
				    resetForm: function (i) {
				        var item = this._data[i];
				        if (i === -1) {
				            this.hDCity.value(''); this.hDCitySZM.value(''); this.txtDCity.notice.method('resetValue');
				            this.hACity.value(''); this.hACitySZM.value(''); this.txtACity.notice.method('resetValue');
				            this.chidrenNum.value(0); this.personNum.value(2); this.selectWay.value(0);
				            this.txtLeaveDateTime.notice.method('resetValue');
				            this.txtArriveDateTime.notice.method('resetValue');
				            // bug fix : trigger the select change event
				            S.trigger(this.selectWay, 'change');
				        } else {
				            this.hDCity.value(item[0]); this.hDCitySZM.value(item[1]);
				            this.txtDCity.value(item[2]); this.hACity.value(item[3]);
				            this.hACitySZM.value(item[4]); this.txtACity.value(item[5]);
				            this.chidrenNum.value(item[6]); this.personNum.value(item[7]);
				            this.selectWay.value(item[8]); this.txtLeaveDateTime.value(item[9]);
				            this.txtArriveDateTime.value(item[10]);
				            // bug fix : trigger the select change event
				            S.trigger(this.selectWay, 'change');
				        }
				    },
				    saveOldDate: function (i) {
				        this._oldDates = [this._data[i][9], this._data[i][10]];
				    },
                    saveOldCount: function (i) {
                        this._oldCount = +this._data[i][6] + (+this._data[i][7]);
                    },
				    updateCalender: function (which, i) {
				        var leaveDateStr = this._data[i][9],
							arriveDateStr = this._data[i][10],
							way = this._data[i][8],
                            count = +this._data[i][6] + (+this._data[i][7]);

				        switch (which) {
				            case 'add':
				                FH.Calendar.addFltHotel(leaveDateStr, 0, count);
				                break;
				            case 'remove':
				                FH.Calendar.removeFltHotel(leaveDateStr, 0, count);
				                break;
				            case 'edit':
				                FH.Calendar.removeFltHotel(this._oldDates[0], 0, this._oldCount);
				                FH.Calendar.removeFltHotel(this._oldDates[1], 0, this._oldCount);
				                FH.Calendar.addFltHotel(leaveDateStr, 0, count);
				                break;
				            default:
				                break;
				        }
				        if (way == '1') {
				            switch (which) {
				                case 'add':
				                    FH.Calendar.addFltHotel(arriveDateStr, 0, count);
				                    break;
				                case 'remove':
				                    FH.Calendar.removeFltHotel(arriveDateStr, 0, count);
				                    break;
				                case 'edit':
				                    FH.Calendar.addFltHotel(arriveDateStr, 0, count);
				                    break;
				                default:
				                    break;
				            }
				        }
				    },
				    // 获得包含日历初始显示年月的日期
				    getShowDate: function () {
				        return this._data[0][9];
				    }
				});
	},
	
	_initHotelManager: function (){
		FH.hotelManager = new FH.Manager(
				FHConfig.freeCombine.tmplHotel,
				$('#HotelNum'),
				$('#HotelInput'),
				$('#hotelAlert'),
				$('#HotelSearchInfoHidden'),
				6, {
				    init: function () {
				        var txtHotelCity = $('#txtHotelCity'),
							hHotelCity = $('#hotel_city'),
							hHotelCitySZM = $('#hotel_city_szm'),
							txtCheckInDate = $('#txtHotelCheckInDate'),
							txtLeaveDate = $('#txtHotelLeaveDate');

				        Mod.regNotice(txtHotelCity, 'txtHotelCity', 1);
				        Mod.regNotice(txtCheckInDate, 'txtHotelCheckInDate', 0);
				        Mod.regNotice(txtLeaveDate, 'txtHotelLeaveDate', 0);

				        Mod.regHotelAddress(txtHotelCity, 'txtHotelCity', 'homecity_name', {
				            'id': hHotelCity
				        });

				        txtCheckInDate.regMod('calendar', '3.0', {
				            options: {
				                minDate: new Date().addDays(1).toStdDateString(),
				                showWeek: true,
				                container: cQuery.container
				            },
				            listeners: {
				                onChange: function (input, value) {
				                    //can not change when user type the date
									txtLeaveDate.data('minDate', value);
				                    txtLeaveDate.data('startDate', value);
				                    txtLeaveDate[0].focus();
				                }
				            }
				        });
				        txtLeaveDate.regMod('calendar', '3.0', {
				            options: {
				                minDate: new Date().addDays(1).toStdDateString(),
				                showWeek: true,
				                reference: "#txtHotelCheckInDate"
				            }
				        });

				        this.txtHotelCity = txtHotelCity;
				        this.hHotelCity = hHotelCity;
				        this.hHotelCitySZM = hHotelCitySZM;
				        this.txtCheckInDate = txtCheckInDate;
				        this.txtLeaveDate = txtLeaveDate;
				        this.roomNum = $('#RoomNumSelect');
				    },
				    validate: function () {
				        return Validator.isHotelPass(this.txtHotelCity, this.txtCheckInDate, this.txtLeaveDate);
				    },
				    getItem: function () {
				        return [
							this.txtCheckInDate.value(), this.hHotelCity.value(), this.hHotelCitySZM.value(),
							this.txtHotelCity.value(), this.txtLeaveDate.value(), this.roomNum.value()
						];
				    },
				    getItemHtml: function (item) {
				        var index = this._editedIndex > -1 ? this._editedIndex : this._count;
				        var data = {
				            index: index, route: index + 1,
				            city: item[3],
				            checkin: item[0], leave: item[4],
				            rooms: item[5]
				        };
				        return cQuery.tmpl.render(this.tmpl, data);
				    },
				    resetForm: function (i) {
				        var item = this._data[i];
				        if (i === -1) {
				            this.txtCheckInDate.notice.method('resetValue');
				            this.hHotelCity.value(''); this.hHotelCitySZM.value('');
				            this.txtHotelCity.notice.method('resetValue');
				            this.txtLeaveDate.notice.method('resetValue');
				        } else {
				            this.txtCheckInDate.value(item[0]); this.hHotelCity.value(item[1]);
				            this.hHotelCitySZM.value(item[2]); this.txtHotelCity.value(item[3]);
				            this.txtLeaveDate.value(item[4]); this.roomNum.value(item[5]);
				        }
				    },
				    saveOldDate: function (i) {
				        this._oldDates = [this._data[i][0], this._data[i][4]];
				    },
                    saveOldCount: function (i) {
                        this._oldCount = +this._data[i][5];
                    },
				    updateCalender: function (which, index) {
				        var d1 = this._data[index][0].toDate(),
							d2 = this._data[index][4].toDate(),
							dayDiff = S.dateDiff(d1, d2, 'd'),
                            count = +this._data[index][5];

				        switch (which) {
				            case 'add':
				                for (var i = 0, len = dayDiff; i < len; i++) {
				                    FH.Calendar.addFltHotel(d1.addDays(i).toStdDateString(), 1, count);
				                }
				                break;
				            case 'remove':
				                for (var i = 0, len = dayDiff; i < len; i++) {
				                    FH.Calendar.removeFltHotel(d1.addDays(i).toStdDateString(), 1, count);
				                }
				                break;
				            case 'edit':
				                var oldDate1 = this._oldDates[0].toDate(),
									oldDate2 = this._oldDates[1].toDate(),
									dayDiff2 = S.dateDiff(oldDate1, oldDate2, 'd');

				                for (var i = 0, len = dayDiff2; i < len; i++) {
				                    FH.Calendar.removeFltHotel(oldDate1.addDays(i).toStdDateString(), 1, this._oldCount);
				                }

				                for (var i = 0, len = dayDiff; i < len; i++) {
				                    FH.Calendar.addFltHotel(d1.addDays(i).toStdDateString(), 1, count);
				                }
				                break;
				            default:
				                break;
				        }
				    },
				    // 获得包含日历初始显示年月的日期
				    getShowDate: function () {
				        return this._data[0][0];
				    }
				});
	},
	
	_bindEvents: function (){
		$('#freeChoice a.add_my_route').each(function (btn, i) {
            btn.bind('click', function () {
                i == 0 ? FH.airLineManager.add() : FH.hotelManager.add();
            });
        });
        $('#freeChoice input.base_btn_confirm').each(function (btn, i) {
            btn.bind('click', function () {
                i == 0 ? FH.airLineManager.save() : FH.hotelManager.save();
            });
        });
        $('#freeChoice div.add_btn_box a').each(function (a, i) {
            a.bind('click', function () {
                i == 0 ? FH.airLineManager.cancel() : FH.hotelManager.cancel();
            });
        });
	},
	
	// 恢复搜索历史
	recover: function (){
		var originSearchInfo = $('#hOriginSearchInfo').value();

        if (originSearchInfo == '|') return;

        var infoes = originSearchInfo.split('|');

		// 对数据中的日期进行合理化
		var dif = 0, now = new Date();
		function checkDate(item, isModifyItem){
            var ret, difDays;
            if(isModifyItem){
                if(dif > 0){
                    ret = item.replace(/(\d{4}-\d{1,2}-\d{1,2})/g, function (_, d, i){
                        return d.toDate().addDays(dif).toFormatString('yyyy-MM-dd');
                    });
                }else{
                    ret = item;
                }
            }else{
                ret = item.replace(/(\d{4}-\d{1,2}-\d{1,2})/g, function (_, d, i){
                    if(d.toDate() <= now){
                        difDays = S.dateDiff(d, OneRounder.startDate, 'd');
                        dif = Math.max(dif, difDays);
                    }
                });
            }
			return ret;
		}
		
        [0, 1].each(function (manager, i) {
            infoes[i].split(';').each(function (item, i) {
				checkDate(item);
            });
        });
        [FH.airLineManager, FH.hotelManager].each(function (manager, i) {
            manager.clear();
            infoes[i].split(';').each(function (item, i) {
                item = checkDate(item, true);
                manager.addItem(item.split(','));
            });
        });
	}
}
// 搜索历史
var HistorySearcher = {
	
	keyPrefix: 'HistorySearch', // Cookie前缀
	keys: undefined, // 搜索历史的Cookie键值列表
	
	_bindEvents: function (div){
		div.bind('click',function (e){
			if(e.target.nodeName != 'A') return;
			var index = +e.target.getAttribute('data-index'),
				type = +e.target.getAttribute('data-type'),
				isSearchIntl = !!+e.target.getAttribute('data-search');
			HistorySearcher.recover(index);
			FH.search(type, isSearchIntl);
            e.preventDefault();
		});
	},
	
	init: function (){
		var keys = cQuery.cookie.get(this.keyPrefix);
		this.keys = keys ? keys.split('|') : [];
		
		this.render();
	},
	
	render: function (){		
		var div = $('#divHistorySearch');
		if(div.length == 0) return;
        if(this.keys.length == 0) { S.hide(div); return; }
		
		var self = this;
		this.keys.each(function(key, i){
			var searchType = +cQuery.cookie.get(key, 'type');
			var isSearchIntl = cQuery.cookie.get(key, 'isIntl');
			var link = searchType == SEARCH_TYPE.FREE_COMBINE ? 
					self._createFreeCombineLink(key, i, searchType) : 
					self._createOneRoundLink(key, i, searchType, isSearchIntl);
			div[0].appendChild(link);
		});
		
		this._bindEvents(div);
	},
	
	_tmplLink: '<a href="javascript:void(0);" data-index="$1" data-type="$2" data-search="$3">$4</a>',
	
	_rDate: /(\d{4}-\d{1,2}-\d{1,2})/g,
	_rCity: /([\u4e00-\u9fa5\(\)])+/g,
	
	_createFreeCombineLink: function (key, i, searchType){
		var self = this;
		var rawDatas = cQuery.cookie.get(key, 'data').split('|'),
			cities = [], dates = [], isMore = false;
		
        function mergeCities () {
            cities.each(function(item, i){
                if(item[2] && item[2] != item[1] && item[2] != item[0])
                    isMore = true;
                item.length > 2 && item.pop();
            });
            cities = cities[0].concat(cities[1]);
            cities.unique();
        }

		function pickCities(data, index){
            cities[index] = 
                data.match(self._rCity)
                    .filter(function (item, i){
                        return index == 0 ? (i % 2 == 0) : true;
                    }).slice(0, 3);
		}
		
		function pickDates(data, index){
			Array.prototype.push.apply(
				dates,
				data.match(self._rDate)
					.map(function (date, i){
						return date.toDate();
					})
			);
		}
		
		rawDatas.each(function(data, i){
			if(data == '') return;
			pickCities(data, i);
			pickDates(data, i);
		});
        mergeCities();
		
		var startDate = new Date(Math.min.apply(Math, dates)),
			endDate = new Date(Math.max.apply(Math, dates));
		
		// 时间已过期
		if(startDate <= new Date()){
			startDate = '';
			endDate = '';
		}
		
		var data = {
			index: i,
			searchType: searchType,
			cities: cities,
			startDate: !startDate ? startDate : startDate.toFormatString('MM-dd'),
			endDate: !endDate ? endDate : endDate.toFormatString('MM-dd')
		}
		
		// to do template render
		var text = FHConfig.texts.routeType[searchType] + ' ' + 
			data.cities.join(' - ') + (isMore ? '... ' : ' ') + 
			(data.startDate ? (data.startDate + ' ~ ' + data.endDate) : '');
		return S.create(S.format(this._tmplLink, i, searchType, 0, text));
	},
	
	_createOneRoundLink: function (key, i, searchType, isSearchIntl){
		var dateDic = OneRounder.getProperDate(
			cQuery.cookie.get(key, 'ddate'),
			cQuery.cookie.get(key, 'rdate'),
			true
		);
	
        if(!dateDic)
            return document.createElement('a');
    
		var data = {
			index: i,
			searchType: searchType,
			dcity: cQuery.cookie.get(key, 'dcity'),
			acity: cQuery.cookie.get(key, 'acity'),
			ddate: dateDic.ddate.substring(5),
			rdate: dateDic.rdate.substring(5),
			night: cQuery.cookie.get(key, 'night')
		}
		
		if(isSearchIntl == '1'){
			data.dcity = cQuery.cookie.get(key, 'intl_dcity');
			data.acity = cQuery.cookie.get(key, 'intl_acity');
		}
		
		// to do template render
		var text = FHConfig.texts.routeType[data.rdate ? 0 : 1] + ' ' + 
			data.dcity + ' - ' + data.acity + ' ' + data.ddate + 
            ((data.rdate && searchType == SEARCH_TYPE.ROUND) ? (' ~ ' + data.rdate + ' ') : ' ') +
			data.night + FHConfig.texts.night;
		return S.create(S.format(this._tmplLink, i, searchType, isSearchIntl, text));
	},
    // 检查纪录是否重复
    check: function (key) {
        var val = cQuery.cookie.get(key),
            hasSameItem = false;

        for (var i = 0, len = this.keys.length; i < len; i++) {
            if(val == cQuery.cookie.get(this.keys[i])){
                hasSameItem = true;
                break;
            }
        };

        if(hasSameItem){
            cQuery.cookie.del(key, false);
            return false;
        }else{
            return true;
        }
    },
	// 保存搜索纪录
	save: function (searchType){
		var now = new Date().getTime(), // Date.now();
			key = this.keyPrefix + '_' + now,
			opts = { expires: 700 };
		
		cQuery.cookie.set(key, 'type', searchType);
		
		searchType == SEARCH_TYPE.FREE_COMBINE ? 
			cQuery.cookie.set(key, 'data', $('#hOriginSearchInfo').value().replace(/,/g,'_'), opts) :
			OneRounder.save(key, opts);
			
        this.check(key) && this.keys.unshift(key);

        if(this.keys.length > 3){
            var delKey = this.keys.pop();
            cQuery.cookie.del(delKey, false);
        }

		// 保存键值
		cQuery.cookie.set(this.keyPrefix, null, this.keys.join('|'), opts);
		
	},
	// 恢复历史到表单
	recover: function (index){
		var key = this.keys[index];
		if(!key) return;
		var searchType = +cQuery.cookie.get(key, 'type'),
			isSearchIntl = !!+cQuery.cookie.get(key, 'isIntl');
			
		if(isSearchIntl)
			S.trigger($('#divMainSearchBox').find('>div.tabs li')[1], 'click');
		
		if(searchType == SEARCH_TYPE.FREE_COMBINE){
            // In ie browser, the comma is not allowed in cookie.
			$('#hOriginSearchInfo').value(cQuery.cookie.get(key, 'data').replace(/_/g,','));
			FH.initFreeCombine();
			FreeCombiner.recover();
		}else{
			FH.initOneRound();
			OneRounder.recover(key);
		}
	}
}
// 底部 推荐信息 城市对
var Recommender = {
    cookieKey: 'RecommendDCity',
	// 航段字典
	// eg. {"北京": "大连|杭州|青岛|三亚|上海|深圳|厦门|重庆", "上海": "北京|大连|广州|桂林|丽江|三亚|西安|重庆"}
	_flightsDic: {},
	// @function 更新数据隐藏域
	_updateInfo: undefined,
	// @function Ajax数据HTML
	_ajaxDataHtml: undefined,
	// @function 定期清除数据缓存
	_tickClearCache: undefined,
	// @function 初始化请求白名单
	_initWhite: undefined,
	// 到达城市tab列表
	//_acityLinks: undefined,
	// @function 显示指定出发城市对应的所有到达城市Tab
	showTabs: undefined,
	// @function 隐藏所有到达城市Tab
	hideTabs: undefined,
	// @function 显示无数据界面
	showNoData: undefined,
	// @function 显示Loading界面
	showLoading: undefined,
    // @function 显示Loading界面
    hideLoading: undefined,
	// @function 修复IE6下div无:hover
	_fixIE6Hover: undefined,
	// @function 选择到达城市
	selectACity: undefined,
	// @function 选择出发城市
	selectDCity: undefined,
	// 初始化数据相关成员
	_initModel: function (){
        var hRDCity = $('#hRDCityName'),
            hRACity = $('#hRACityName'),
            htmlCache = {};
			
		var self = this;
		
		this._updateInfo = function (el, type) {
            type == 'D' ?
                hRDCity.value(el.innerHTML) :
                hRACity.value(el.innerHTML.toLowerCase().replace('<b></b>', ''));
        }
		
		this._initWhite = function (callback) {
            var addr = S.format('$1?white=1', FHConfig.URL.HOT_PACKAGE_DATA);
            $.ajax(addr, {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, res) {
					if(res){
						self._flightsDic = cQuery.parseJSON(res);
						callback(res);
					}else{
						callback();
					}
                },
                onerror: function () { callback(); }
            });
        }

        this._getDefaultDCity = function () {
            return cQuery.cookie.get(Recommender.cookieKey) || hRDCity.value();
        }
		
		this._ajaxDataHtml = function (callback) {
            var dcity = hRDCity.value(),
                acity = hRACity.value(),
                identity = dcity + acity;
            if (typeof htmlCache[identity] === 'undefined') {
                var addr = S.format('$1?dcity=$2&acity=$3', FHConfig.URL.HOT_PACKAGE_DATA, escape(dcity), escape(acity));
                $.ajax(addr, {
                    method: cQuery.AJAX_METHOD_GET,
                    cache: true,
                    onsuccess: function (xhr, html) {
                        htmlCache[identity] = html;
                        // 取消回调判定
                        if (identity == dcity + acity)
                            callback(html);
                    },
                    onerror: function () { }
                });
            } else {
                callback(htmlCache[identity]);
            }
        }
		
		this._tickClearCache = function (){
			setInterval(function () {
				htmlCache = {};
				self._flightsDic = {};
			}, 12 * 60 * 60 * 1000);
		}
	},
	// 初始化视图相关成员
	_initView: function (){
		var recommendBox = $('#recommendBox'),
			noData = $('#noData'),
            loading = $('#divRecommendLoading'),
			choiceCity = this._choiceCity = $('#choiceCity'),
            tmplLink = '<li><a href="javascript:;"><b></b>$1</a></li>',
            self = this;
		
		this.showTabs = function (dcity) {
            if(!self._flightsDic[dcity])
                return false;

            self._flightsDic[dcity].split('|').each(function(item, i){
                choiceCity[0].appendChild(S.create(S.format(tmplLink, item)));
            });

            return true;
        }
        this.hideTabs = function () {
            choiceCity.find('li').each(function(item, i){
                (i > 1) && item.remove();
            });
        }

        this.showNoData = function () {
            S.show(noData);
            S.hide(recommendBox);
            S.hide(loading);
        }
        this.showLoading = function () {
            S.hide(noData);
            S.show(recommendBox);
            recommendBox.html('');
            S.show(loading);
        }
        this.hideLoading = function () {
            S.hide(loading);
        }
		
		this._fixIE6Hover = function (recommendBox){
			recommendBox.find('li').each(function (div, i) {
				var timer;
				div.bind('mouseover', function (e) {
					clearTimeout(timer);
					div.addClass('hover');
				});
				div.bind('mouseout', function (e) {
					clearTimeout(timer);
					timer = setTimeout(function () {
						div.removeClass('hover');
					}, 30);
				});
			});
		}
	},
	// 初始化控制相关成员
	_initController: function (){
		var recommendBox = $('#recommendBox');

        // create acity tab
        var acityTab = 
            (function (onChange) {
                var firstTab = $('#choiceCity').find('a:first'),
                    current = firstTab,
                    curStyle = 'current';

                $('#choiceCity').bind('click', function (e){
                    var target = e.target;
                    if(target.nodeName != 'A') return;

                    current && (current.className = '');
                    current = target;
                    current.className = curStyle;

                    onChange && onChange(target);
                });

                return {
                    firstTab: firstTab
                };
            })(selectACity);
        
        //dcity dropbox
        $('#showCity').regMod('dropBox', '1.0', {
            options: {
                type: 'drop', //1:auto 2:select
                dropDom: $('#showCityList'),
                trigger: ['mousedown'],
                ajax: false,
                stag: 'a'
            },
            listeners: {
                returnVal: selectDCity
            }
        });
		
		var self = this;
		
		function selectACity(el) {
            self._updateInfo(el, 'A');
            self.showLoading();

            self._ajaxDataHtml(function (html) {
                self.hideLoading();
                if (!html) {
					self.showNoData();
                } else {
                    recommendBox.html(html);
                    if (cQuery.browser.isIE6)
                        self._fixIE6Hover(recommendBox);
                }
            });
        }
        function selectDCity(val, el, isInited) {
            if(isInited)
                val = el.innerHTML;
            else
                cQuery.cookie.set(self.cookieKey, null, val, {expires: 700});

            $('#showCity a').html(val + FHConfig.texts.depart);

            self._updateInfo(el, 'D');
            self.showLoading();
            self.hideTabs();

            var dcity = el.innerHTML;
            self.showTabs(dcity) ?
                S.trigger(acityTab.firstTab, 'click'): 
                self.showNoData();
            
        }

        (function (self) {
            self._initWhite(function (res) {
                selectDCity(
                    null, 
                    $('#showCityList').find('a:contains('+ self._getDefaultDCity() +')')[0], 
                    true
                );
            });
        })(this);

		this.selectACity = selectACity;
		this.selectDCity = selectDCity;
	},
	
	init: function (){
		this._initModel();
		this._initView();
		this._initController();
		this._tickClearCache();
	}
}

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

//搜索
$('#indexBtnSearch').bind('click', function () {
    // 设置是否是特价信息的搜索
    FH.search();
});

exports.FH = FH;

})(window);