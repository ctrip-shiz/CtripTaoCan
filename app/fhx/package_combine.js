/*
* author:shiz@ctrip.com
* date:2013-07-10
*/
define(function (require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;
    Mod.EventDispatcher = require('tools/eventdispatcher.js');

    function rankList(target, event) {
        Searcher.reset();
        $('#hActionType').value('');
        target.href = Searcher.getUrl();
        doPost(target, event);
    }
    window.rankList = rankList;

    // namespace flt hotel
    var FHX = {

        _bookHotelId: undefined, // 预订的酒店id

        _initBookLogin: function () {
            // fix confirm div
            if (!cQuery.browser.isIE6) {
                require.async(
                'tools/fixposition.js',
                function (mod) {
                    FHX.confirmFixer =
                        mod.fixPosition(
                            $("#divDataConfirm"),
                            { fixedClass: "travel_intro_fix" }
                        );
                });
            }


            window.selectPackage = function (hotelId) {
                var hotel = HotelList.hotels[hotelId];
                hotel.save();
                doPost(FHXConfig.URL.BOOK_FLTHOTEL);
            }
        },

        init: function () {
            HotelList.init();
            Searcher.init();
            XController.init();

            // load mods
            require.async('mods');
            FHX._initBookLogin();
            FHX._bindToggleMoreDetail();
            // submit loading
            Mod.initSubmitLoading();
            // limit form submit
            S.limitSubmit(fm);
            // register jmp module
            $(document).regMod('jmp', '1.0');
            // load quickview
            require.async('mods/quickview');
        },

        _bindToggleMoreDetail: function () {
            function toggleMoreDetail(e) {
                var target = e.target,
                tr = S.parent(target, 'tr'),
                displayed = tr.getAttribute('data-show'),
                next = S.next(tr);

                if (target.nodeName == 'B')
                    target = target.parentNode;

                if (displayed) {
                    $(target).parentNode().removeClass('cur');
                    target.innerHTML = target.innerHTML.replace('down', 'up');
                    while (next && next.className == 'more_plane') {
                        S.hide(next);
                        next = S.next(next);
                    }
                    tr.setAttribute('data-show', '');
                } else {
                    $(target).parentNode().addClass('cur');
                    target.innerHTML = target.innerHTML.replace('up', 'down');
                    while (next && next.className == 'more_plane hidden') {
                        S.show(next);
                        next = S.next(next);
                    }
                    tr.setAttribute('data-show', 'T');
                }
            }
            $('span[data-role="moredetail"]').each(function (item, i) {
                item.bind('click', toggleMoreDetail);
            });
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
        checkAddress: function (txtFrom, txtTo) {
            if (txtTo) {
                if (!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[8]);
                if (!txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[9]);
                if (txtFrom.value().trim() == txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[13]);
            } else {
                if (!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[10]);
            }
            return true;
        },
        // 航班时间与酒店时间限制
        checkDate: function (departDate, returnDate, checkinDate, checkoutDate) {
            var dd = departDate.value(), rd = returnDate.value();

            if (checkinDate) {
                var cid = checkinDate.value(), cod = checkoutDate.value();
                if (cid == "")
                    return Mod.showTips(checkinDate, FHXConfig.validate[2]);
                if (cod == "")
                    return Mod.showTips(checkoutDate, FHXConfig.validate[3]);
                if (!cid.isDate())
                    return Mod.showTips(checkinDate, FHXConfig.validate[4]);
                if (!cod.isDate())
                    return Mod.showTips(checkoutDate, FHXConfig.validate[4]);
                if (cid >= cod)
                    return Mod.showTips(checkoutDate, FHXConfig.validate[6]);
                if (S.dateDiff(cid, cod, 'd') > 28)
                    return Mod.showTips(checkoutDate, FHXConfig.validate[7]);

                if (cid.toDate().addDays(1) < dd.toDate())
                    return Mod.showTips(checkinDate, FHXConfig.validate[11]);
                if (rd.toDate().addDays(1) < cod.toDate())
                    return Mod.showTips(checkoutDate, FHXConfig.validate[12]);
            } else {
                if (dd == "")
                    return Mod.showTips(departDate, FHXConfig.validate[0]);
                if (rd == "")
                    return Mod.showTips(returnDate, FHXConfig.validate[1]);
                if (!dd.isDate())
                    return Mod.showTips(departDate, FHXConfig.validate[4]);
                if (!rd.isDate())
                    return Mod.showTips(returnDate, FHXConfig.validate[4]);
                if (dd >= rd)
                    return Mod.showTips(returnDate, FHXConfig.validate[5]);
                if (S.dateDiff(dd, rd, 'd') > 28)
                    return Mod.showTips(returnDate, FHXConfig.validate[7]);
            }

            return true;
        }
    }
    // 搜索
    var Searcher = {

        _isInitMod: false,

        _textboxes: [], // store the textboxes for skiping to next when one is filled

        _hotelCount: 0,
        _hotelDateChanged: false,
        _hotelCityChanged: false,

        focusNext: true,

        _addressValidate: function (cb) {
            var self = this, i = 0;
            function callback () {
                if(++i == self._hotelCount + 2)
                    cb();
            }
            this._textboxes.each(function (item, i) {
                item.address && item.address.method('validate', false, callback);
            });
        },
        _isSearchChanged: function () {
            var self = this;
            var isSame = $('#divHotelQuery').attr('data-default') == this._hotelCount;
            this._textboxes.each(function(item, i){
                    if(!isSame) return;
                    isSame = isSame && (item.value() === item.attr('data-default'));
                });
            if(isSame)
                isSame = this.selectAdult.value() == this.selectAdult.attr('data-default') && 
                    this.selectChildren.value() == this.selectChildren.attr('data-default');
            if(isSame){
                Searcher.reset();
                return false;
            }
            return true;
        },
        // async(for address data check) validate search parameters 
        // callback: success callback
        validate: function (callback){
            var self = this;
            this.focusNext = false;
            //this._addressValidate(function () {

               // check flight
                var ok = Validator.checkAddress(self._textboxes[0], self._textboxes[1]) &&
                    Validator.checkDate(self._textboxes[2], self._textboxes[3]);
                if(!ok) return ok;
                // check hotel
                var txts = self._textboxes;
                for (var i = 4; i < txts.length; i+=3) {
                    ok = Validator.checkAddress(txts[i]);
                    if(!ok) return ok;
                    ok = Validator.checkDate(self.txtFromDate, self.txtToDate, txts[i+1], txts[i+2]);
                    if(!ok) return ok;
                } 

                callback();
            //});
        },
        getUrl: function () {
            var checkInCity = this._textboxes[4].value();
            if(this._hotelCount > 1 || this.txtTo.value() != checkInCity)
                return FHXConfig.URL.FREE_COMBINE;
            else
                return S.format(FHXConfig.URL.SINGLE_FLT_HOTEL,
                            'round', this.hFromPY.value(), this.hFromID.value(),
                            this.hToPY.value(), this.hToID.value()).toLowerCase();
        },
        // 搜索
        search: function (e) {
            if(!this._isInitMod) return;
            if(!this._isSearchChanged()) return;

            Searcher.validate(function () {
                $('#hScrollPosition').value(0);
                var url = Searcher.getUrl();
                $('#hActionType').value('');
                doPost(url, e);
            });
        },
        // 恢复用户修改前的状态
        reset: function (e){
            if(!this._isInitMod) return;

            this._textboxes.splice(4, this._textboxes.length-4);
            this._hotelCount = 0;
            this._hotelDateChanged = false;
            this._hotelCityChanged = false;

            this.hotelContainer[0].innerHTML = this._defaultHotelContent;

            this._initHotelMods(true);

            this.focusNext = false;
            this._textboxes.each(function (txt, i) {
                if(i > 3) return;
                txt.calendar?
                    txt.calendar.method('setVal', txt, txt.attr('data-default')):
                    txt.value(txt.attr('data-default'));
            });
            this.focusNext = true;
            
            this.selectChildren.value(this.selectChildren.attr('data-default'));
            this.selectAdult.value(this.selectAdult.attr('data-default'));
            
            // 触发限制
            S.trigger(this.selectAdult, 'change');

            this.toggleModifyDisplay(true);

            e && e.preventDefault();
        },

        _splitFlightDates: function () {
            if(this._hotelDateChanged) return;

            var start = this.txtFromDate.value(),
                end   = this.txtToDate.value();
            if(!start.isDate() || !end.isDate() || start > end) return;

            var ret = [];
            var days = S.dateDiff(start, end, 'd');

            if(days < 1) return;

            if(days == 1) return [start, end];

            var avg = Math.floor(days / this._hotelCount),
                mod = days % this._hotelCount;

            start = start.toDate();
            end = end.toDate();
            var days1 = 0, days2 = 0;
            for (var i =0; i < this._hotelCount; i++) { 
                days2 = days1 + avg + (i<mod ? 1 : 0);
                if(days1 == days2) days1--;
                ret.push(
                    start.addDays(days1).toFormatString('yyyy-MM-dd'),
                    start.addDays(days2).toFormatString('yyyy-MM-dd')
                );
                days1 = days2;

            }
            return ret;
        },

        _updateHotelBox: function (dates) {
            // 拆日期
            if(dates){
                var index, start, end, last = dates.length - 1;
                for (var i = 0; i < this._hotelCount; i++) {
                    start = dates[2 * i] ? dates[2 * i] : dates[last - 1];
                    end = dates[2 * i + 1] ? dates[2 * i + 1] : dates[last];
                    index = 5 + i * 3;
                    this._textboxes[index].value(start);
                    this._textboxes[index].calendar.method('setWeek', this._textboxes[index]);
                    this._textboxes[index + 1].value(end);
                    this._textboxes[index + 1].calendar.method('setWeek', this._textboxes[index + 1]);
                    this._textboxes[index + 1].data('minDate', start.toDate().addDays(1).toStdDateString());
                };
            }
            // 更新删除/添加按钮状态
            var deletelnks = this.hotelContainer.find('>div a');
            deletelnks[0].className = deletelnks.length > 1 ? '' : 'hidden';
            deletelnks.length >=3 ? $('#lnkAddHotel').addClass('hidden') : $('#lnkAddHotel').removeClass('hidden');
        },

        // 添加酒店
        addHotel: function () {
            if(this._hotelCount >= 3) return;

            var htmlHotel = $.tmpl.render(FHXConfig.hotelTemplate, {
                to: this.txtTo.value(), toid: this.hToID.value(), count: this._hotelCount
            });
            var divHotel = $(S.create(htmlHotel));

            var lnkAdd = this.hotelContainer.find('>a');
            S.insertBefore(divHotel, lnkAdd);

            divHotel.find('input[type="text"]').each(this._regHotelMods.bind(this));

            this._updateHotelBox(this._splitFlightDates());
        },
        // 删除酒店
        removeHotel: function (index) {
            this._hotelCount--;
            this._textboxes.splice(index * 3 + 4, 3);

            var k = 0;
            this.hotelContainer.find('>div').each(function (div, i) {
                i == index ? 
                    div[0].parentNode.removeChild(div[0]) :
                    div.find('a').attr('data-index', k++) ;
            });

            this._updateHotelBox(this._splitFlightDates());
        },

        // 切换更改面板显示
        toggleModifyDisplay: function(isReset){
            $('.select_box').each(function(el, i){
                if(isReset)
                    i == 0 ? el.removeClass('hidden') : el.addClass('hidden');
                else
                    el.hasClass('hidden') ? el.removeClass('hidden') : el.addClass('hidden');
                el[0].style.zoom = 1; // for ie6
            });
        },
        
        init: function (){
            if ($('#txtFromDate').length == 0) return;

            // 初始化 下拉列表的选择项
            var selectAdult = this.selectAdult = $('#AdultSelect');
            var selectChildren = this.selectChildren = $('#ChildrenSelect');
            selectAdult.value(selectAdult.attr('data-default'));
            selectChildren.value(selectChildren.attr('data-default'));
            
            // 更改
            var self = this;
            $('#lnkChangeSearch').bind('click', function (e) {
                self.toggleModifyDisplay();
                
                // image would not be loaded when it's hidden
                if (!self._isInitMod){
                    require.async(// 载入placeholder
                        'tools/placeholder.js',
                        function (placeholder) {
                            placeholder.init();
                            // init mods
                            self._initMod(selectAdult, selectChildren);
                            self._isInitMod = true;
                        });
                }

                e.preventDefault();
                return false;
            });

            var self = this;
            require.async('tools/eventemitter.js', function (EventEmitter) {
                EventEmitter.extend(self);
            });
            
            this._initTxts();
        },
        // add functions to textboxes
        _initTxts: function () {
            this._textboxes.next = function (txt) {
                return this[ this.indexOf(txt) + 1 ];
            }
            this._textboxes.last = function (txt) {
                return this[ this.length - 1 ];
            }
        },
        
        _initMod: function (selectAdult, selectChildren){
            this.hotelContainer = $('#divHotelQuery');

            this._initFlightMods();
            this._initHotelMods();

            //init limit between adult\children\room select lists
            FHX.SelectListLimit.regAdultChildBond(this.selectAdult, this.selectChildren);
            
            $('#lnkSearch').bind('click', Searcher.search.bind(Searcher));
            $('#lnkCancel').bind('click', Searcher.reset.bind(Searcher));
        },
        
        _initFlightMods: function () {
            var self = this;
            
            ['txtFrom', 'txtTo', 'txtFromDate', 'txtToDate'].each(function(item){
                self[item] = $('#'+item);
                self._textboxes.push(self[item]);
            });

            // register address mods
            var dataUrl = 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=${type}' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0');
            var rPY = /@([a-zA-Z\s]+)/

            self.hFromID = $('#hFromID'); self.hFromPY = $('#hFromPY');
            self.hToID = $('#hToID'); self.hToPY = $('#hToPY');

            var tempAddress = 
                self.txtFrom.regMod('address', '1.0', {
                    name: 'txtFrom',
                    jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_start_" + cQuery.config("charset") + ".js",
                    jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=1' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
                    message: FHXConfig.address.message,
                    template: { suggestion: FHXConfig.address.suggestion[0], suggestionStyle: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle }
                });
            tempAddress.method('bind', 'change', function (_, data) {
                    self.txtFrom[0].value = data.items[1].replace(/\([^\)]+\)/, '');
                    self.txtFrom[0].blur();
                    $.jsonp(
                        dataUrl.replace("${type}", 1).replace("${key}", data.value), {
                            onload: function (data) {
                                self.hFromID.value(data.data.split('|')[2]);
                                var py = data.data.match(rPY)[1];
                                self.hFromPY.value(py);
                            }
                        });
                });
            self.txtFrom.address = tempAddress;

            tempAddress =
                self.txtTo.regMod('address', '1.0', {
                    name: 'txtTo',
                    jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_dest_" + cQuery.config("charset") + ".js",
                    jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=0' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
                    message: FHXConfig.address.message,
                    template: { suggestion: FHXConfig.address.suggestion[1], suggestionStyle: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle }
                });
            tempAddress.method('bind', 'change', function (_, data) {
                    self.txtTo[0].value = data.items[1].replace(/\([^\)]+\)/, '');
                    self.txtTo[0].blur();
                    $.jsonp(
                        dataUrl.replace("${type}", 1).replace("${key}", data.value), {
                            onload: function (data) {
                                self.hToID.value(data.data.split('|')[2]);
                                var py = data.data.match(rPY)[1];
                                self.hToPY.value(py);

                                self.emit('tocitychange', self.txtTo.value(), self.hToID.value());
                                var next = self._textboxes.next(self.txtTo);
                            }
                    });
                });
            self.txtTo.address = tempAddress;

            // register calendar mods
            var tempCal = 
                self.txtFromDate.regMod('calendar', '3.0', {
                    options: {
                        minDate: new Date().addDays(1).toStdDateString(),
                        showWeek: true,
                        container: cQuery.container
                    },
                    listeners: {
                        onChange: function (input, v) {
                            //can not change when user type the date
                            self.txtToDate.data('startDate', v.toDate().addDays(1).toStdDateString());
                            self.txtToDate.data('minDate', v.toDate().addDays(1).toStdDateString());
                            self.txtToDate.data('maxDate', v.toDate().addDays(28).toStdDateString());
                                      
                            if(self.focusNext && v >= self.txtToDate.value()){
                                var date = v.toDate().addDays(1).toFormatString("yyyy-MM-dd");
                                self.txtToDate.value(date);
                                self.emit('todatechange', date, v.toDate().addDays(2).toFormatString("yyyy-MM-dd"));
                            }
                            // min select date
                            var minDate = v.toDate().addDays(-1).toStdDateString();
                            self.emit('fromdatechange', v, minDate);
                            self.focusNext && self.txtToDate[0].focus();
                        }
                    }
                });
            tempCal.method('setWeek', self.txtFromDate[0]);
            self.txtFromDate.calendar = tempCal;
            
            tempCal = 
                self.txtToDate.regMod('calendar', '3.0', {
                    options: {
                        minDate: self.txtFromDate.value().toDate().addDays(1).toStdDateString(),
                        maxDate: self.txtFromDate.value().toDate().addDays(28).toStdDateString(),
                        showWeek: true
                    },
                    listeners: {
                        onChange: function (input, v) {
                            // max select date
                            var maxDate = v.toDate().addDays(1).toStdDateString();
                            self.emit('todatechange', v, maxDate);
                        }
                    }
                });
            tempCal.method('setWeek', self.txtToDate[0]);
            self.txtToDate.calendar = tempCal;
        },

        _initHotelMods: function (isReset) {
            var self = this;

            this._defaultHotelContent = this.hotelContainer[0].innerHTML;

            this.hotelContainer
                    .find('input[type="text"]')
                    .each(this._regHotelMods.bind(this));

            if(isReset) return;
            // bind events
            this.hotelContainer.bind('click', function (e) {
                if(e.target.nodeName != 'A') return;
                var index = e.target.getAttribute('data-index');
                (index !== null && index !== "") ? self.removeHotel(+index) : self.addHotel();
            })
        },

        _regHotelMods: function (txt, i) {
            var self = this;

            var which = i % 3;

            if(which == 0){ // reg address
                var hDatas = txt.parentNode().find('input[type="hidden"]');
                var tempAddress = 
                    txt.regMod("address", "1.0", {
                        name: "cityname",
                        jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_dest_" + cQuery.config("charset") + ".js",
                        jsonpFilter: '/DIY/Ajax/AjaxGobalCity.aspx?isctrip=1&keyword=${key}',
                        template: {
                            filter: FHXConfig.address.hotelFilter,
                            filterStyle: FHXConfig.address.hotelFilterStyle,
                            filterPageSize: -1,
                            suggestion: FHXConfig.address.suggestion[1],
                            suggestionStyle: FHXConfig.address.suggestionStyle
                        },
                        relate: {
                            2: $(hDatas[0]), // id
                            3: $(hDatas[1])  // py
                        }
                    });
                tempAddress.method('bind', 'change', 
                    function (_, data) {
                        self._hotelCityChanged = true;
                        hDatas[0].value = data.items[2];
                        var next = self._textboxes.next(txt);
                    });
                txt.address = tempAddress;
                self.on('tocitychange', function (tocity, tocityId) {
                    if(!self._hotelCityChanged){
                        txt.value(tocity);
                        var checkinCities = document.getElementsByName('ToCities');
                        for (var i = 0; i < checkinCities.length; i++) {
                            checkinCities[i].value = tocityId;
                        };
                    }
                });
                // init city changing status
                this._hotelCityChanged = this._hotelCityChanged || txt.value() != self.txtTo.value();
            }else{ // reg calendar

                if(which == 1){
                    var tempCal =
                        txt.regMod('calendar', '3.0', {
                            options: {
                                minDate: self.txtFromDate.value().toDate().addDays(-1).toStdDateString(),
                                maxDate: self.txtToDate.value().toDate().addDays(1).toStdDateString(),
                                showWeek: true,
                                container: cQuery.container
                            },
                            listeners: {
                                onChange: function (input, v) {

                                    self._hotelDateChanged = true;
                                    //can not change when user type the date
                                    var minDate = v.toDate().addDays(1).toStdDateString();

                                    var next = self._textboxes.next(txt);
                                    next.data('startDate', minDate);
                                    next.data('minDate', minDate);
                                    if(self.focusNext){
                                        if(v >= next.value())
                                            next.value(v.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
                                        next[0].focus();
                                    }
                                }
                            }
                        });

                    self.on('fromdatechange', function (date, minDate) {
                        if(!self._hotelDateChanged){
                            txt.value(date);
                            txt.data('minDate', minDate);
                            self._updateHotelBox(self._splitFlightDates());
                        } 
                    });
                }else{
                    var tempCal =
                        txt.regMod('calendar', '3.0', {
                            options: {
                                minDate: (self._textboxes.last().value() || self.txtFromDate.value())
                                    .toDate().addDays(1).toStdDateString(),
                                maxDate: self.txtToDate.value().toDate().addDays(1).toStdDateString(),
                                showWeek: true
                            },
                            listeners: {
                                onChange: function (input, v) {
                                    self._hotelDateChanged = true;
                                    var next = self._textboxes.next(txt);
                                }
                            }
                        });
                    self._hotelCount ++; // +1 hotel query.

                    self.on('todatechange', function (date) {
                        if(!self._hotelDateChanged)
                            self._updateHotelBox(self._splitFlightDates());
                    });
                }

                tempCal.method('setWeek', txt[0]);
                txt.calendar = tempCal;
                // listen to the change of flight dates
                self.on('todatechange', function (date, maxDate) {
                    txt.data('maxDate', maxDate);
                });
            }

            self._textboxes.push(txt);
        }
    }

    // 酒店
    var Hotel = function (hotelId, container) {
        this.hotelId = hotelId;
        this.prices = undefined; // 包价格
        this.roomId = 0; //选择的房型id
        this.roomCount = 1; //选择的房型间数
        this.roomUnitPrice = 0; //选择的房型单价
        this.isGotAllRooms = false; //是否请求了所有房型
        this.isGettingRooms = false; //是否在请求房型数据

        this.container = container;
        this.tbRoomList = undefined; // 房型列表
        this.selectedBtn = undefined; //选择的选择按钮
        this.selectedRow = undefined; // 选择的行

        // // 右边价格元素
        // this.divPrice = container.find('div.price_cost');
        // this.prices = this.divPrice.attr('data-prices').split('|');
        // // X资源元素
        // this.divXProduct = container.find('div.free_service>dl.service_info_list');
        // // 第一个房型元素
        // this.firstRoom = container.find('div.htl_recom>em.recom_type');
        // this.roomId = this.firstRoom.attr('data-room');
        // this.roomCount = this.firstRoom.attr('data-roomCount');
        // this.roomUnitPrice = this.firstRoom.attr('data-price');
        // // 更多房型
        // this.lnkMore = container.find('div.htl_recom a[data-role="allrooms"]');
        // new Mod.EventDispatcher({ctx: this.lnkMore, func: this.showAllRooms.bind(this)});
        // // 勾选用户选择的其它房型        
        // if(this.hotelId == HotelList.selectedHotel && this.roomId != HotelList.selectedRoom){
        //     setTimeout(function () { // init is not completed yet
        //         lnkMore.trigger('click');
        //     },10);
        // }

        // this._initFlightSelect(container);
        // this._initXView();
        container.find('>a').bind('click', this.selectHotel.bind(this));
        container.find('select').bind('change', this.selectRoomCount.bind(this));
    }

    Hotel.prototype = {
        constructor: Hotel,

        _initFlightSelect: function (container) {
            var self = this;
            container.find('div.free_service>dl.flight_info_list>.btn_flt>a')
            .bind('click', function () {
                self.save();
                doPost(FHXConfig.URL.SELECT_FLIGHT);
            });
        },

        _initXView: function () {
            var divXProduct = $('#divXProduct');
            var cache = {};

            function show() {
                S.show(divXProduct);
                divXProduct.mask(true, function () {
                    S.hide(divXProduct);
                });
            }

            function hide() {
                divXProduct.unmask(true);
            }

            function render(title, html) {
                divXProduct.find('.popup_tit')[0].innerHTML = title.replace(/（[^）]+）/, '');
                divXProduct.find('.popup_con')[0].innerHTML = html;
            }

            function getData(xid, title) {
                $.ajax(FHXConfig.URL.X_PRODUCTS + "?XProductIDs=" + xid, {
                    method: cQuery.AJAX_METHOD_GET,
                    onerror: function () { },
                    onsuccess: function (xhr, res) {
                        if (!res) return;
                        var data = (new Function('return ' + res.replace(/\t|\n|\r/g, '')))();
                        data.name = title;
                        var html = $.tmpl.render(FHXConfig.tmpls.xdetail, data) || '';
                        cache[xid] = [title, html];
                        render(title, html);
                        Mod.hideLoading(divXProduct);
                    }
                });
            }

            divXProduct.find('>a').bind('click', hide);

            this.divXProduct.bind('click', function (e) {
                var target = e.target;
                if (target.nodeName != 'A') return;
                var xid = target.getAttribute('data-xid');
                if (!xid) return;

                show();
                if (cache[xid]) {
                    render(cache[xid][0], cache[xid][1]);
                } else {
                    render(target.innerHTML, '');
                    Mod.showLoading(divXProduct);
                    getData(xid, target.innerHTML);
                }
            });
        },

        _loading: function (type) {
            var ctx = S.parent(this.lnkMore, '.htl_recom');
            var loading = S.next(ctx);
            if (type == 'show') {
                S.show(ctx);
                S.show(loading);
            } else {
                S.hide(loading);
                S.hide(ctx);
            }
            return loading;
        },

        _ajaxAllRooms: function (query, callback) {
            $.ajax(FHXConfig.URL.HOTEL_ALL_ROOM + '?hotel=' + this.hotelId + '&' + (query || ''), {
                method: cQuery.AJAX_METHOD_POST,
                context: {
                    "FlightParams": $('#hFlightParams').value()
                },
                cache: true,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    callback(res);
                }
            });
        },

        _initAllRooms: function (query, res) {
            var loading = this._loading('hide');

            if (res == '' || res == 'null') {
                this.linkMore.onclick = null;
                return;
            }

            try {
                this.tbRoomList = $(S.create(res));
                S.insertAfter(this.tbRoomList, loading);
            } catch (ex) {
                S.show(S.parent(this.lnkMore, '.htl_recom'));
                console && console.log('Room list data error');
                return;
            }

            this.isGotAllRooms = true;
            this.isGettingRooms = false;

            // register event listener
            new Mod.EventDispatcher({
                ctx: this.tbRoomList,
                selector: 'a, input, select',
                event: 'click change',
                cmds: [
                    { selector: 'a.more_type', func: this.hideAllRooms.bind(this) },
                    { selector: 'input', func: this.selectRoom.bind(this) },
                    { selector: 'select', func: this.changePrices.bind(this) },
                    { selector: 'a.recom_type', func: this.toggleDetails.bind(this) },
                    { selector: 'a.btn_up', func: this.hideDetails.bind(this) }
                ]
            });
            // fix onchange for ie
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
                this.tbRoomList.find('select').bind('change', this.changePrices.bind(this));
            // select the specified room
            var self = this;
            setTimeout(function () {
                var btn = self.tbRoomList
                .find('tr[data-room="' + self.roomId + '"]>td:last')
                .find('input');
                S.trigger(btn, 'click');
            }, 30);

        },

        showAllRooms: function (num, query) {
            if (this.isGotAllRooms) {
                S.show(this.tbRoomList);
                this._loading('hide');
            } else {
                if (this.isGettingRooms) return;
                this.isGettingRooms = true;
                this._loading('show');
                this._ajaxAllRooms(query,
                this._initAllRooms.bind(this, query));

            }
        },

        hideAllRooms: function () {
            S.hide(this.tbRoomList);
            S.show(S.parent(this.lnkMore, 'div.htl_recom'));
        },

        toggleDetails: function (target) {
            var tr = S.parent(target, 'tr');
            tr = $(S.next(tr));
            while (tr.hasClass('append_detail1') || tr.hasClass('append_detail2')) {
                if (tr.hasClass('append_detail1')) {
                    tr.hasClass('hidden') ? tr.removeClass('hidden') : tr.addClass('hidden');
                }
                tr = $(S.next(tr));
            };
        },

        hideDetails: function (target) {
            var tr = S.parent(target, 'tr');
            S.hide(tr);
        },
        // 选择酒店
        selectHotel: function () {
            this.save();
            doPost(FHXConfig.URL.MIDWARE + '?ActionType=' + FHXConfig.ACTION.hotel);
        },
        // 选择房型间数
        selectRoomCount: function (e) {
            var roomCounts = S.toArray(document.getElementsByName("RoomCount"));
            roomCounts = roomCounts.map(function (select) {
                return select.value;
            });

            $.ajax(FHXConfig.URL.CALC_PKG_PRICE + "?RoomCount=" + roomCounts.join('|') + "&HotelIndex=" + this.hotelId, {
                method: cQuery.AJAX_METHOD_POST,
                context: {
                    PkgItemPrice: $('#hPkgItemPrice').value()
                },
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if (!res) return;
                    var prices = res.split('|');
                    if (prices.length)
                        PriceChanger.changePkgPrices(+prices[2], +prices[1]);
                }
            });
        },
        // 选择房型
        selectRoom: function (target) {
            this.selectedRow = S.parent(target, 'tr');
            this.roomId = this.selectedRow.getAttribute('data-room');
            this.roomUnitPrice = target.getAttribute('data-price');
            this._changeXProduct();
            this._changeSelect(target);
            this.changePrices();
        },
        // 改变价格信息 
        changePrices: function (roomId, e) {
            if (e && e.type != 'change') return; // filter out click event

            this._changeDiffPrices();

            var tr = this.selectedRow;
            var prices = tr.cells[5].firstChild.value;
            prices = prices.split('|');
            this.prices = prices;
            var avg = Math.round(+prices[2] / HotelList.personCount);
            this.divPrice.find('span.prices, div.price_per_single')
            .each(function (item, i) {
                item[0].innerHTML = item[0].innerHTML.replace(/\d+/, i == 3 ? avg : prices[i]);
            });

            this._changeFoldDisplay();
        },
        // 改变差价信息
        _changeDiffPrices: function () {
            var self = this;
            var tr = this.selectedRow;
            var baseprice = +(tr.cells[5].firstChild.value.split('|')[2]);
            var rows = this.tbRoomList.find('tr:not(.append_detail1,.down)');
            rows.each(function (row, i) {
                if (i == 0) return; // heads
                var price = +(row[0].cells[5].firstChild.value.split('|')[2]);
                var diff = price - baseprice;
                row[0].cells[4].firstChild.innerHTML =
                (diff == 0 ? "" : (diff > 0 ? "+" : "-")) +
                "<dfn>&yen;</dfn>" +
                Math.abs(diff);
                // disable nonselected row and get the count of selected room
                if (tr == row[0]) {
                    row[0].cells[5].firstChild.disabled = false;
                    var selectRoom = row[0].cells[5].firstChild;
                    self.roomCount = selectRoom.options[selectRoom.selectedIndex].text;
                } else {
                    row[0].cells[5].firstChild.disabled = true;
                }

            });
        },
        // 改变X资源
        _changeXProduct: function (roomId) {
            var tr = this.selectedRow;
            var lnks = this.divXProduct.find('dd>a');
            var xdata = $.parseJSON(tr.getAttribute('data-params'));
            if (!xdata) return;
            if (!xdata.list) {
                this.divXProduct.addClass('hidden');
            } else {
                this.divXProduct.removeClass('hidden');
                lnks.each(function (lnk, i) {
                    lnk = lnk[0];
                    var data = xdata.list[i];
                    if (data) {
                        lnk.innerHTML = data.name + "（" + data.quantity + FHXConfig.texts.xunit + "）";
                        lnk.setAttribute('data-xid', data.productid);
                    } else {
                        lnk.innerHTML = '';
                        lnk.setAttribute('data-xid', '');
                    }
                });
            }

        },
        // 改变选择按钮
        _changeSelect: function (obj) {
            var selected = this.selectedBtn;

            if (selected) {
                S.hide(S.prev(selected));
                S.show(selected);
            }

            var icon = S.prev(obj);
            if (!icon) {
                icon = document.createElement('b');
                icon.className = 'icon_selected';
                S.insertBefore(icon, obj);
            }
            S.show(icon);
            S.hide(obj);

            this.selectedBtn = obj;
        },
        // 改变收起时房型显示
        _changeFoldDisplay: function (roomId) {
            //row_info_order: name,bedtype,breakfast,broadband,diffprice,bedselect,roombutton
            var tr = this.selectedRow;
            var node = tr.cells[0].firstChild;
            this.firstRoom[0].innerHTML =
            node.tagName == 'SPAN' ?
                (node.getAttribute('data-master') || "") :
                $(tr.cells[0]).find('a.recom_type')[0].innerHTML;
            var ctx = this.firstRoom.parentNode();
            var sps = ctx.find('span');
            sps[0].innerHTML = tr.cells[1].innerHTML;
            sps[1].innerHTML = tr.cells[2].firstChild.innerHTML;
            sps[2].innerHTML = FHXConfig.texts.room[0] + tr.cells[3].firstChild.innerHTML;
            var select = tr.cells[5].firstChild;
            sps[3].innerHTML = select.options[select.selectedIndex].text + FHXConfig.texts.room[1] + "<b></b>";
        },
        // 保存post数据
        save: function () {
            // $('#hRoomCount').value(this.roomCount);
            // $('#hRoomUnitPrice').value(this.roomUnitPrice);
            // $('#hPkgPrices').value(this.prices.join('|'));

            // var xids = [];
            // this.divXProduct.find('dd>a').each(function(item, i){
            //     var id = item.attr('data-xid');
            //     id && xids.push(id);
            // });
            // $('#hXProducts').value(xids.join('|'));

            $('#hHotelID').value(this.hotelId);
            //$('#hRoomID').value(this.roomId);
        }
    }
    window.Hotel = Hotel;
    // 酒店列表
    var HotelList = {

        selectedHotel: $('#hHotelID').value(),
        selectedRoom: $('#hRoomID').value(),

        personCount: +$('#AdultSelect').attr('data-default') + (+$('#ChildrenSelect').attr('data-default')),

        hotelSelectInited: false,

        hotels: {},

        init: function () {
            var self = this;
            $('#divHotelList li').each(function (el, i) {
                var hotelId = el.attr('data-hotel');
                if (!hotelId) return;
                self.hotels[hotelId] = new Hotel(hotelId, el);
            });
            this.initRoomSelect();
        },
        initRoomSelect: function () {
            var roomCounts = $('#hRoomCount').value();
            if (!roomCounts) return;
            roomCounts = roomCounts.split(',');
            var selects = S.toArray(document.getElementsByName('RoomCount'));
            selects.each(function (select, i) {
                select.value = roomCounts[i];
            });
        }
    }
    window.HotelList = HotelList;

    // X资源
    var PriceChanger = {

        _rPrice: /([\d\-]+)/g,

        // init: function () {
        //     this.divPackagePrice = $('#divPkgPrices')[0];
        // },

        _xPrice: 0,

        changePkgPrices: function (prices) {
            var self = this;

            var isReplaced = false;
            if (arguments.length > 1) {
                prices = S.toArray(arguments);
                isReplaced = true;
            }
            var divPackagePrice = $('#divPkgPrices')[0];
            var i = 0;
            divPackagePrice.innerHTML =
            divPackagePrice.innerHTML.replace(this._rPrice, function (_, w) {
                if (isReplaced) {
                    if (i == 0) // total price
                        prices[i] = prices[i] + self._xPrice;
                } else {
                    if (i == 0) // total price
                        self._xPrice += prices[i];
                    prices[i] = +w + prices[i];
                }
                return prices[i++];
            });
            var hPkgPrices = $('#hPkgPrices')[0];
            hPkgPrices.value =
            hPkgPrices.value.split('|').map(function (item, i) {
                return i == 2 ? prices[0] : i == 1 ? prices[1] : item;
            }).join('|');
        },

        changeXPrice: function (tr, count) {
            var xid = tr.getAttribute('data-xid');
            var prices = FHXConfig.XData[xid].prices;
            prices = prices[FHXConfig.XData[xid].date];
            var total = {
                market: count * prices.market,
                ctrip: count * prices.ctrip
            }

            var cells = tr.cells;
            cells[1].innerHTML = cells[1].innerHTML.replace(this._rPrice, prices.market || '--');
            cells[2].innerHTML = cells[2].innerHTML.replace(this._rPrice, prices.ctrip || '--');
            cells[5].innerHTML = cells[5].innerHTML.replace(this._rPrice, total.ctrip || '--');

            if (total.ctrip) {
                if (cells[5].innerHTML.toLowerCase().indexOf('dfn') != -1)
                    return total;
                cells[5].innerHTML = cells[5].innerHTML.replace(this._rPrice, function (p) {
                    return '<dfn>&yen;</dfn>' + p;
                });
            } else {
                cells[5].innerHTML = cells[5].innerHTML.replace(/<dfn>[^<]+<\/dfn>/i, '');
            }

            return total;
        }
    }

    var XController = {

        data: {},

        hData: $('#hXData')[0],

        init: function () {
            this.tblXProduct = $('#tblXProduct');
            this.divXList = $('#divXList');
            this._bindEvents();
            this._startup();
        },

        _startup: function () {
            var data = FHXConfig.XData;
            var defaultProducts = [];
            // 恢复数据
            var strData = this.hData.value;
            if (strData) {
                var choosen = {};
                strData.split(',').each(function (d, i) {
                    d = d.split('|');
                    choosen[d[0]] = { count: d[1], date: d[2] };
                });
                for (var id in data) {
                    if (id in choosen) {
                        data[id].count = FHXConfig.XData[id].count = choosen[id].count;
                        data[id].date = FHXConfig.XData[id].date = choosen[id].date;
                    } else {
                        data[id].count = FHXConfig.XData[id].count = 0;
                    }
                }
            }
            // 勾选已选
            for (var id in data) {
                if (data[id].count > 0)
                    defaultProducts.push(id);
            }
            for (var id in FHXConfig.XData) {
                var xdata = FHXConfig.XData[id];
                if (xdata.count > 0) {
                    var totalprice = xdata.count * xdata.prices[xdata.date].ctrip;
                    PriceChanger.changePkgPrices([totalprice, 0]);
                }
            }
            this.divXList.find('tr').each(function (tr, i) {
                var id = tr.attr('data-xid');
                if (defaultProducts.indexOf(id) != -1) {
                    var select = S.firstChild(tr[0].cells[4]);
                    select.value = data[id].count;
                    S.trigger(select, 'change');
                }
            });
        },

        _bindEvents: function () {
            var self = this;
            // selects to change x date/count
            this.divXList.bind('change', function (e) {
                if (e.target.nodeName != 'SELECT') return;
                self._changeX(e.target);
            });
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
                this.divXList.find("select").bind('change', function (e) {
                    self._changeX(e.target);
                });
            // links to remove x
            this.tblXProduct.bind('click', function (e) {
                if (e.target.nodeName != 'A') return;
                var xid = S.parent(e.target, 'tr').getAttribute('data-xid');
                if (!xid) return;
                self.remove(xid);
            });

            // toggle details/more
            this._bindToggleEvents();
        },

        _bindToggleEvents: function () {
            var self = this;

            function toggleDetail(target) {
                var tr, trDetail;
                if (target.className == 'more_type') {
                    trDetail = S.parent(target, 'tr');
                    tr = S.prev(trDetail);
                    self.toggleDetail(tr, trDetail);
                } else {
                    tr = S.parent(target, 'tr');
                    trDetail = S.next(tr);
                    if (trDetail && trDetail.className.indexOf('append_detail1') > -1)
                        self.toggleDetail(tr, trDetail);
                    else
                        self._requestDetail(tr.getAttribute('data-xid'), tr);
                }
            }

            this.divXList.bind('click', function (e) {
                var target = e.target;
                if (target.nodeName == 'B')
                    target = target.parentNode;
                if (target.nodeName != 'A' || !/javascript/.test(target.href))
                    return;
                target.getAttribute('data-morex') ?
                self.toggleMore(target) : toggleDetail(target);
            });
        },

        _requestDetail: function (xid, tr) {
            var self = this;
            // render
            var trDetail = S.create(FHXConfig.tmpls.xdetail[0]);
            S.insertAfter(trDetail, tr);
            self.toggleDetail(tr, trDetail);
            // ajax
            $.ajax(FHXConfig.URL.XDETAIL + "?XProductIDs=" + xid, {
                method: cQuery.AJAX_METHOD_GET,
                cache: false,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if (!res) return;
                    var data = (new Function('return ' + res.replace(/\t|\n|\r/g, '')))();
                    data.name = FHXConfig.XData[xid].name;
                    data.visa = FHXConfig.XData[xid].visa;
                    var html = $.tmpl.render(FHXConfig.tmpls.xdetail[1], data);
                    if (!html) return;
                    var div = $(trDetail).find('div.details_bd')[0];
                    div.innerHTML = html;
                }
            });
        },

        toggleDetail: function (tr, trDetail) {
            trDetail = $(trDetail);
            if (trDetail.hasClass('hidden')) {
                trDetail.removeClass('hidden');
            } else {
                trDetail.addClass('hidden');
            }
        },

        _changeXQuantity: function (tr, date) {
            var xid = tr.getAttribute('data-xid'),
            count = FHXConfig.XData[xid].count; // original count
            var quantityObj = FHXConfig.XData[xid].prices[date].quantity,
            quantitySelect = S.firstChild(tr.cells[4]);

            // create options
            var optsHtml = '<option value="0">0</option>', selected = 0;
            for (var i = quantityObj.min; i <= quantityObj.max; i += quantityObj.step) {
                i == count && (selected = i);
                optsHtml += S.format('<option value="$1" $2>$1</option>', i,
                i == count ? 'selected="selected"' : '');
            }
            $(quantitySelect).html(optsHtml);
            cQuery.browser.isIE && (quantitySelect.value = selected);

            if (selected == -1 && count > 0) {
                quantitySelect.value = quantityObj["default"];
                FHXConfig.XData[xid].count = quantityObj["default"];
            }
        },

        _changeX: function (xSelect, isRemove) {
            var tr = xSelect.parentNode.parentNode;
            var xid = tr.getAttribute('data-xid'),
            count = FHXConfig.XData[xid].count,
            date = FHXConfig.XData[xid].date;
            var method = (xid in this.data) ? '_edit' : '_add';

            var oldPrice = count * FHXConfig.XData[xid].prices[date].ctrip;

            // save data
            if (xSelect.className === 'per_num') {
                count = +xSelect.value;
                !isRemove && this[method](xid, count, date, tr);
                FHXConfig.XData[xid].count = count;
            } else {
                date = xSelect.value;
                !isRemove && this._changeXQuantity(tr, date); // change quantity select
                !isRemove && (xid in this.data) && this[method](xid, count, date, tr);
                FHXConfig.XData[xid].date = date;
            }
            // change prices
            var total = PriceChanger.changeXPrice(tr, count);
            PriceChanger.changePkgPrices([total.ctrip - oldPrice, 0]);
        },

        _redrawXProduct: function (id, count, date) {
            var xData = FHXConfig.XData[id];
            var data = {
                id: id,
                count: count,
                date: date,
                type: xData.type,
                typeId: xData.typeId,
                name: xData.name,
                ctripprice: xData.prices[date].ctrip * count,
                marketprice: xData.prices[date].market * count,
                choosedate: xData.choosedate,
                unit: xData.unit
            }
            var html = $.tmpl.render(FHXConfig.tmpls.xproduct, data),
            newTR = S.create(html);

            // paint on page
            // var isUpdated = false, lastTable;
            // this.divXProduct.find('table.type_lis_tks').each(function(table, i){
            //     if(isUpdated) return;
            //     table.find('tr').each(function(tr, i){
            //         if(isUpdated) return;
            //         if(tr[0].getAttribute('data-xid') == id){
            //             // use replaceChild to work as ohtml
            //             // but it will not copy the events of the old one
            //             table.find('tbody')[0].replaceChild(newTR, tr[0]);
            //             isUpdated = true;
            //         }
            //     });
            //     lastTable = table;
            // });
            var isUpdated = false; var self = this;
            this.tblXProduct.find('tr').each(function (tr, i) {
                if (isUpdated) return;
                if (tr[0].getAttribute('data-xid') == id) {
                    self.tblXProduct.find('tbody')[0].replaceChild(newTR, tr[0]);
                    isUpdated = true;
                }
            });

            // if(data.ctripprice == 0)
            //     lastTable = this.divXProduct.find('table.type_lis_tks:first');

            if (!isUpdated)
                this.tblXProduct.find('tbody')[0].appendChild(newTR);

            FHX.confirmFixer && FHX.confirmFixer.updateUpper();

            //this._drawSeperate();

            return data;
        },

        _save: function () {
            var data = [], _data = this.data;
            for (var id in _data) {
                if (!_data.hasOwnProperty(id)) continue;
                var tmp = [];
                for (var k in _data[id]) {
                    if (!_data[id].hasOwnProperty(k)) continue;
                    tmp.push(_data[id][k]);
                }
                data.push(tmp.join('|'));
            }
            this.hData.value = data.join(',');
        },

        _add: function (id, count, date, tr) {
            tr.cells[6].innerHTML = '<b class="icon_selected"></b>';
            var data = this._redrawXProduct(id, count, date);
            this.data[id] = data;
            this._save();
        },

        _edit: function (id, count, date, tr) {
            if (count == 0) {
                this._remove(id, tr);
                return;
            }
            var data = this._redrawXProduct(id, count, date);
            this.data[id] = data;
            this._save();
        },

        _remove: function (id, tr) {
            if (!(id in this.data)) return;

            delete this.data[id];
            this._save();

            var self = this;

            tr.cells[6].innerHTML = '';
            var selectCount = S.firstChild(tr.cells[4]);
            selectCount.value = 0;

            // this.divXProduct.find('table.type_lis_tks').each(function(table, i){
            //     table.find('tr').each(function(tr, i){
            //         if(tr[0].getAttribute('data-xid') == id)
            //             tr[0].parentNode.removeChild(tr[0]);
            //     });
            // });

            //this._drawSeperate();

            this.tblXProduct.find('tr').each(function (tr, i) {
                if (tr[0].getAttribute('data-xid') == id)
                    tr[0].parentNode.removeChild(tr[0]);
            });

            FHX.confirmFixer && FHX.confirmFixer.updateUpper();
        },

        remove: function (id) {
            var tr = this.divXList.find('tr[data-xid="' + id + '"]')[0];
            this._remove(id, tr);
            var selectCount = S.firstChild(tr.cells[4]);
            this._changeX(selectCount, true);
        },

        _drawSeperate: function () {
            var tbs = this.divXProduct.find('table.type_lis_tks');
            if (tbs[0].rows.length == 0 || tbs[1].rows.length == 0)
                $(tbs[1].parentNode).addClass('table_box_no_line');
            else
                $(tbs[1].parentNode).removeClass('table_box_no_line');
            // show/hide divProduct
            (tbs[0].rows.length == 0 && tbs[1].rows.length == 0) ?
            S.hide(this.divXProduct) : S.show(this.divXProduct);

            FHX.confirmFixer.updateUpper();
        },

        toggleMore: function (target) {
            var tb = S.parent(target, 'table');

            target.innerHTML = target.innerHTML.indexOf('up') > 0 ?
            (FHXConfig.texts.more[1] + '<b class="down">') :
            (FHXConfig.texts.more[0] + '<b class="up">');

            var count = 0;
            var rows = $(tb).find('tr').each(function (row, i) {
                if (count < 3) {
                    !row.hasClass('append_detail1') && count++;
                    return;
                }
                row.hasClass('hidden') ? row.removeClass('hidden') : row.addClass('hidden');
                row.hasClass('append_detail1') && row.addClass('hidden');

            });
            rows[rows.length - 1].className = '';
        }
    }

    // 1成人2儿童 1成人1间房 关联限制
    FHX.SelectListLimit = {

        //关联函数 [成人儿童，成人房间]
        _relateFator: [
            function (v) {
                return Math.min(2 * v, 9 - v);
            },
            function (v) {
                return v;
            }
        ],

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
            var v = +selectA.value(),
            v2 = +selectB.value(),
            upper = this._relateFator[type](v);

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

    FHX.init();

    // release memory
    $(window).bind('unload', function () {
        FHX = null;
        Validator = null;
        Searcher = null;
        QuickView = null;
        window.HotelList = HotelList = null;
        window.Hotel = Hotel = null;
    });
});
