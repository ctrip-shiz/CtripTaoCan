// main
(function (exports) {

    // 全局表单
    var fm = document.forms[0];
    var charset = cQuery.config("charset");
    var releaseNo = $('#_releaseNo_').value();

    // mod helper
    var Mod = {
        CITY_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/flthotel/packageDomestic_' + charset + '.js?v=' + releaseNo + '.js',

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

        regAddress: function (target, name, which, relate) {
            var address = target.regMod('address', '1.0', {
                name: name,
                jsonpSource: Mod.CITY_DATA,
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
        setCalValue: function (cal, value) {
            // I hate arguments validation
            cal[0].value = value;

            if (value == '') {
                cal.css('background-image:none');
            } else {
                S.trigger(cal, 'focus');
                S.trigger(cal, 'change');
                S.trigger(cal, 'blur');
            }
        }
    };

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
        * @param {date|string} date or date string
        * @param {date|string} date or date string
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
        /*
        * @function format date or date string in specified form
        * @param {date|string} date or date string
        * @param {string} format form (everybody knows what it looks like)
        * @return {string} date formated string
        */
        dateFormat: function (date, formatStr) {
            if ($.type(date) !== 'date')
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
        }
    };

    // 搜索类型 0-往返 1-单程 2-自由组合
    var SEARCH_TYPE = {
        ROUND: 0,
        ONEWAY: 1,
        FREE_COMBINE: 2
    }

    // namespace flt hotel
    var FH = {
        _searchType: SEARCH_TYPE.ROUND,
        _isInitFreeCombine: false,
        _isInitOneRound: false,

        // 初始化某些页面元素以备使用

        // 用户原声

        _initMainTab: function () {
            // var searchContent = $('#searchContent'),
            // freeChoice = $('#freeChoice'),
            // s_calendar = $('#s_calendar'),
            // searchBox = $('#searchBox'),
            // adAreaBox = $('#adAreaBox');

            function switchType(n) {
                if (n == SEARCH_TYPE.FREE_COMBINE) {
                    //calendar and inputs init
                    FH.initFreeCombine();

                    // searchContent.css('display:none');
                    // freeChoice.css('display:block');
                    // s_calendar.css('display:block');
                    // searchBox.addClass('search_box_full');
                    // adAreaBox.addClass('hidden');

                    // modify page id
                    //$('#page_id').value('105012');
                } else {
					
					// for hotel
					var isInit = FH._isInitOneRound;
					
                    // round and oneway input init
                    FH.initOneRound();
                    // switch date mod display status
                    OneRounder.switchDateDisplay(!!n, isInit);

                    // freeChoice.css('display:none');
                    // s_calendar.css('display:none');
                    // searchBox.removeClass('search_box_full');
                    // adAreaBox.removeClass('hidden');
                    // searchContent.css('display:block');

                    // modify page id
                    //$('#page_id').value('105009');
                }
                FH._searchType = n;
            }

            // bind events
            var rdoes = $('#FH_switchType').find('input');
            rdoes.each(function (rdo, i) {
                rdo.bind('click', function (e) {
                    switchType(i);
                });
            });

            //init the selected tab
            var curTab = 0; //$('#hCurTab').value() - 0;
            switchType(curTab);
            rdoes[curTab].checked = true;
        },
        // 自由组合

        // 单程往返
        initOneRound: function () {
            if (!FH._isInitOneRound) {
                OneRounder.init();
                FH._isInitOneRound = true;
            }
        },
        // 广告

        //最新预订

        init: function () {
            // FH._initElements();
            // // 初始化 单程 往返 自由组合 Tab切换
            FH._initMainTab();
            // // 初始搜索历史
            // HistorySearcher.init();
            // // 初始化 底部 推荐信息 城市对
            // Recommender.init();
            // // 初始化 用户原声
            // FH._initUserVoice();
            // // 广告
            // FH._initAds();
            // // 最新预订
            // FH._initLastestBooking();
            // 表单提交限制
            // S.limitSubmit(fm);

            //搜索
            $('#FH_indexBtnSearch').bind('click', function () {
                // 设置是否是特价信息的搜索
                FH.search();
            });
        },

        search: function (searchType) {
            var isSearchHistory = false;
            if ($.type(searchType) === 'number') {
                FH._searchType = searchType;
                isSearchHistory = true;
            }

            if (FH._searchType == SEARCH_TYPE.FREE_COMBINE) {
                if (FH.airLineManager.isEmpty() || FH.hotelManager.isEmpty())
                    return;
                // save info for recovery in history
                $('#hOriginSearchInfo').value(FH.airLineManager.hInfo.value() + '|' + FH.hotelManager.hInfo.value());
                fm.action = FHConfig.URL.FREE_COMBINE_SEARCH;
            } else {
                if (!OneRounder.validate())
                    return;
                //OneRounder.save(OneRounder.cookieKey);
                fm.action = OneRounder.generateUrl();
            }

            // 保存搜索历史
            // if(!isSearchHistory) // 非指定历史搜索时保存
            // HistorySearcher.save(FH._searchType);

            // loading
            // $('#divLoading').removeClass('hidden').mask();
            // if (cQuery.browser.isIE) {
            // // fix animated gif problem
            // setTimeout(function (s) {
            // $('#divLoading').find('p')[0].style.backgroundImage = 'url(http://pic.c-ctrip.com/common/loading.gif)';
            // }, 20);
            // }
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
            if (dd.value().toDate() > cid.value().toDate())
                return Mod.showTips(cid, FHConfig.validateMessage.hotel[13]);
            if (rd.value() && rd.value().toDate() < cod.value().toDate())
                return Mod.showTips(cod, FHConfig.validateMessage.hotel[14]);
            return true;
        }
    }
    // 单程往返
    var OneRounder = {

        cookieKey: 'IndexSearch',
        // 当开始日期不合理时，默认的开始时间
        startDate: new Date().toFormatString('yyyy-MM-dd').toDate().addDays(2),
        // 根据搜索历史的日期与当前日期，获得合理的日期信息
        // isShow 是否是显示，过期就不呈现日期（返回空）

        // 搜索验证
        validate: function () {
            // insure hidden value
            this.txtDCity.address.method('validate');
            this.txtACity.address.method('validate');

            // for hotel
            if (!this.hDCityPY.value())
                this.txtDCity.value('');
            if (!this.hACityPY.value())
                this.txtACity.value('');

            // var noNeedCheckHotel = false;
            // if($('#FH_divChangeHotelDate').hasClass('hidden')){
            // this.txtCheckInDate .value(this.txtDDate.value());
            // Mod.setCalValue(this.txtCheckOutDate, this.txtRDate.value());
            // noNeedCheckHotel = true;
            // }

            // 在勾选修改时验证CheckIn与CheckOut时间
            return Validator.isFlightPass(
				this.txtDCity,
				this.txtACity,
				this.txtDDate,
				FH._searchType == SEARCH_TYPE.ROUND ? this.txtRDate : undefined
			)
            // && (noNeedCheckHotel || (Validator.isHotelPass(this.txtACity, this.txtCheckInDate, this.txtCheckOutDate) &&
            // Validator.isDatePass(this.txtDDate, this.txtRDate, this.txtCheckInDate, this.txtCheckOutDate)));
        },
        //生成SEO FHConfig.URL
        generateUrl: function () {
            var searchType = ['round', 'oneway', 'theway'][FH._searchType];
            // 根据返回时间再设置一次searchType
            if (this.txtRDate.value() == '')
                searchType = 'oneway';

            return S.format(FHConfig.URL.FLTHOTEL_SEARCH, searchType, this.hDCityPY.value(), this.hDCity.value(), this.hACityPY.value(), this.hACity.value()).toLowerCase();
        },

        init: function () {
            // form input
            var txtDCity = this.txtDCity = $('#FH_txtDCity'),
			txtACity = this.txtACity = $('#FH_txtACity'),
			txtDDate = this.txtDDate = $('#FH_txtDDate'),
			txtRDate = this.txtRDate = $('#FH_txtRDate'),
			txtCheckInDate = this.txtCheckInDate = $('#FH_txtCheckInDate'),
			txtCheckOutDate = this.txtCheckOutDate = $('#FH_txtCheckOutDate'),
			hDCity = this.hDCity = $("#FH_D_city"),
			hACity = this.hACity = $("#FH_A_city"),
			hDCitySZM = this.hDCitySZM = $('#FH_D_city_szm'),
			hACitySZM = this.hACitySZM = $('#FH_A_city_szm'),
			hDCityPY = this.hDCityPY = $('#FH_D_city_py'),
			hACityPY = this.hACityPY = $('#FH_A_city_py'),
			selectAdult = this.selectAdult = $('#FH_AdultSelect'),
			selectChildren = this.selectChildren = $('#FH_ChildrenSelect'),
			selectRoom = this.selectRoom = $('#FH_RoomSelect');

            //address
            Mod.regAddress(txtDCity, 'FH_txtDCity', 'homecity_name', {
                'code': hDCity,
                'szm': hDCitySZM,
                'name_py': hDCityPY
            });
            Mod.regAddress(txtACity, 'FH_txtACity', 'destcity_name', {
                'code': hACity,
                'szm': hACitySZM,
                'name_py': hACityPY
            });
            // date calendar
            this._initDateMod(txtDDate, txtRDate, txtCheckInDate, txtCheckOutDate);

            //this.recover(this.cookieKey);

            //notice
            Mod.regNotice(txtDCity, 'FH_txtDCity', 1);
            Mod.regNotice(txtACity, 'FH_txtACity', 1);
            Mod.regNotice(txtDDate, 'FH_txtDDate', 0);
            Mod.regNotice(txtRDate, 'FH_txtRDate', 0);
            // Mod.regNotice(txtCheckInDate, 'txtCheckInDate', 0);
            // Mod.regNotice(txtCheckOutDate, 'txtCheckOutDate', 0);

            // init limit between adult\children\room select lists
            FH.SelectListLimit.regAdultChildBond(selectAdult, selectChildren);
            FH.SelectListLimit.regAdultRoomBond(selectAdult, selectRoom);

            // for hotel
            var selectNight = this.selectNight = $('#FH_NightSelect');
            selectNight.bind('change', function (e) {
                //selectNight[0].options[selectNight[0].selectedIndex].value
                $('#FH_hNight').value(selectNight[0].value);
                $('#FH_spanNight')[0].innerHTML = selectNight[0].value;
            });
        },

        switchDateDisplay: function (isOneWay, isInit) {
            // switch date mod display status according to the search type
            // isOneWay ?
            // S.hide(this.txtRDate.parentNode()) :
            // S.show(this.txtRDate.parentNode());

            // if(this.txtRDate.value() == ''){
            // this.txtCheckInDate.data('maxDate', '');
            // this.txtCheckOutDate.data('maxDate', '');
            // }

            // for hotel
            if (isOneWay) {
                S.hide(this.txtRDate.parentNode().parentNode());
                S.show(this.selectNight);
                S.hide($('#FH_spanNight'));
                Mod.setCalValue(this.txtRDate, '');
            } else {
                S.show(this.txtRDate.parentNode().parentNode());
                S.hide(this.selectNight);
                S.show($('#FH_spanNight'));
				
				var night = parseInt($('#FH_hNight').value());
				!isNaN(night) && isInit && Mod.setCalValue(this.txtRDate, 
					this.txtDDate.value().toDate().addDays(night).toStdDateString());
            }
            this.txtRDate.notice.method('checkValue');
        },

        //保留最近一次单程往返搜索

        //恢复最近一次单程往返搜索

        _initDateMod: function (txtDDate, txtRDate, txtCheckInDate, txtCheckOutDate) {

            // for hotel
            if (txtDDate.value().isDate() && txtDDate.value().toDate() < new Date().addDays(1)) {
                txtDDate.value(txtDDate.value().toDate().addDays(1).toStdDateString());
                txtRDate.value(txtRDate.value().toDate().addDays(1).toStdDateString());
            }

            var self = this;

            var spanNight = $('#FH_spanNight'),
			hNight = $('#FH_hNight');

            function countNights() {
                var d1, d2;
                // 由于_searchType一直在变化，所以在函数内部进行检测
                // d1 = txtCheckInDate.value();
                // d2 = txtCheckOutDate.value();
                d1 = txtDDate.value();
                d2 = txtRDate.value();

                return (d1.isDate() && d2.isDate() && d2.toDate() > d1.toDate()) ?
					S.dateDiff(d1, d2, 'd') : '--';
            }

            function setNights() {
                var night = countNights();

                // for hotel
                if (isNaN(night)) {
                    if (self.selectNight[0].value != 1)
                        return;
                    if (FH._searchType == SEARCH_TYPE.ONEWAY)
                        night = 1;
                }

                night < 8 && !isNaN(night) ?
				self.selectNight[0].value = night :
				self.selectNight[0].value = 1;

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

                        // Mod.setCalValue(txtCheckInDate, value);
                        // Mod.setCalValue(txtCheckOutDate, value.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
                        // // remove selClass -- notice problem
                        // txtCheckInDate.notice.method('checkValue');
                        // txtCheckOutDate.notice.method('checkValue');

                        // txtCheckInDate.data('startDate', value);
                        // txtCheckInDate.data('minDate', value);
                        // txtCheckOutDate.data('startDate', value);
                        // txtCheckOutDate.data('minDate', value);

                        setNights();

                        if (FH._searchType == SEARCH_TYPE.ROUND){
                            setTimeout(function () {
                                txtRDate[0].focus();
                            }, 1);
						}
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
                        // Mod.setCalValue(txtCheckOutDate, value);

                        // // max select date
                        // txtCheckInDate.data('maxDate', value);
                        // txtCheckOutDate.data('maxDate', value);

                        setNights();

						setTimeout(function () {
							$('#FH_indexBtnSearch')[0].focus();
						}, 50);
                    }
                }
            });
            // calendars[2] = txtCheckInDate.regMod('calendar', '3.0', {
            // options: {
            // minDate: new Date().addDays(1).toStdDateString(),
            // showWeek: true,
            // container: cQuery.container
            // },
            // listeners: {
            // onChange: function (input, value) {
            // //can not change when user type the date
            // txtCheckOutDate.data('startDate', value);
            // txtCheckOutDate.data('minDate', value);
            // txtCheckOutDate[0].focus();
            // setNights();
            // }
            // }
            // });
            // calendars[3] = txtCheckOutDate.regMod('calendar', '3.0', {
            // options: {
            // minDate: txtCheckInDate.value() || new Date().addDays(1).toStdDateString(),
            // showWeek: true,
            // reference: "#txtCheckInDate"
            // },
            // listeners: {
            // onChange: function (input, value) {
            // setNights();
            // }
            // }
            // });
            txtDDate.calendar = calendars[0];
            txtRDate.calendar = calendars[1];
            //txtCheckInDate.calendar = calendars[2];
            //txtCheckOutDate.calendar = calendars[3];

            // check to hide or show hotel date input 
            // $('#chkHotelDate').bind('click',function (e){
            // var divChangeHotelDate = $('#divChangeHotelDate');
            // divChangeHotelDate.hasClass('hidden') ? S.show(divChangeHotelDate) : S.hide(divChangeHotelDate);
            // });

            // for hotel
            setTimeout(function () {
                setNights();
            }, 100);
        }
    }
    // 自由组合
    // 搜索历史
    // 底部 推荐信息 城市对

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

    exports.FH = FH;

})(window);

