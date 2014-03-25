/*
* author:shiz@ctrip.com
* date:2013-07-10
*modified date:2014-03-03 by xjchang
*/
define(function(require, exports, module) {

var S = require('common').S;
var Mod = require('common').Mod;
Mod.EventDispatcher = require('tools/eventdispatcher.js');

function rankList (target, event) {
    Searcher.reset();
    Filter.clearResults();
    $('#hActionType').value('');
    target.href = Filter.clearQuery(window.location.href);
    doPost(target, event);
}
window.rankList = rankList;

// namespace flt hotel
var FHX = {

    _bookHotelId: undefined, // 预订的酒店id

    _initBookLogin: function () {
        window.selectPackage = function (hotelId) {
            var hotel = HotelList.hotels[hotelId];
            hotel.save();
            doPost(FHXConfig.URL.BOOK_FLTHOTEL);
        }
    },

    init: function () {
        HotelList.init();
        Searcher.init();
		Filter .init();

        FHX._initBookLogin();
        FHX.recoverScrollPos();

        FHX.initShowCalendar();

        // load mods
        require.async('mods');
        // submit loading
        Mod.initSubmitLoading();
        // limit form submit
        S.limitSubmit(fm);
        // register jmp module
        $(document).regMod('jmp', '1.0');
        // register lazyload
        $(document).regMod("lazyLoad","1.0", {
            placeholder: 'http://pic.c-ctrip.com/hotels110127/hotel_example.jpg',
            loadingImage: 'http://pic.c-ctrip.com/hotels110127/hotel_example.jpg'
        });
        // load quickview
        require.async('mods/quickview');
    },

    initShowCalendar: function () {
        var container;
        var hFromID = $('#hFromID'),
            hToID = $('#hToID');

        $.ajax(FHXConfig.URL.SHOW_CALENDAR + "?dcityid="+hFromID.value()+"&acityid="+hToID.value(), {
            method: cQuery.AJAX_METHOD_POST,
            cache: true,
            onerror: function () { },
            onsuccess: function (xhr, res) {
                try{
                    eval(res);
                    if(cQuery.jsonpResponse.data.showcalendar){
                        $('#lnkPriceBoard').removeClass('hidden');
                        bindShowCalendar();
                    }
                }catch(ex){}          
            }
        });

        function bindShowCalendar() {
            $('#lnkPriceBoard').bind('click', function (e) {
                !container && init();
                container.mask();
            });

        }

        function init() {
            var url = '/DIY/PriceBoard.aspx?from='+hFromID.value()+'&to='+hToID.value()+'&days=7';
            container = $(S.create('<div class="hotel_pic_popup" style="display:inline-block; *display:inline; *zoom:1; padding:0 10px 10px"><div></div><a href="javascript:;" class="del_big"></a></div>'));
            container.css('width', screen.width <= "1240" ? '768px' : '878px');
            container.find('>div')[0].innerHTML = '<iframe scrolling="no" frameborder="no" border="0" src="'+url+'" style="border: none; width: 100%; height: 433px;"></iframe>';
            container.find('>a').bind('click', function (e) {
                container.unmask();
            });
            if(cQuery.browser.isIE6){
                setTimeout(function () {
                    container.find('iframe')[0].src = url;
                }, 50);
            }
        } 
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
        if(txtTo){
            if(!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[8]);
            if(!txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[9]);
            if(txtFrom.value().trim() == txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[13]);
        }else{
            if(!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[10]);
        }
        return true;
    },
    // 航班时间与酒店时间限制
    checkDate: function (departDate, returnDate, checkinDate, checkoutDate) {        
        var dd = departDate.value(), rd = returnDate.value();

        if(checkinDate){
            var cid = checkinDate.value(), cod = checkoutDate.value();
            if(cid == "")
                return Mod.showTips(checkinDate, FHXConfig.validate[2]);
            if(cod == "")
                return Mod.showTips(checkoutDate, FHXConfig.validate[3]);
            if(!cid.isDate())
                return Mod.showTips(checkinDate, FHXConfig.validate[4]);
            if(!cod.isDate())
                return Mod.showTips(checkoutDate, FHXConfig.validate[4]);
            if(cid >= cod)
                return Mod.showTips(checkoutDate, FHXConfig.validate[6]);
            if(S.dateDiff(cid, cod, 'd') > 28)
                return Mod.showTips(checkoutDate, FHXConfig.validate[7]);
            
            if(cid.toDate().addDays(1) < dd.toDate())
                return Mod.showTips(checkinDate, FHXConfig.validate[11]);
            if(rd.toDate().addDays(1) < cod.toDate())
                return Mod.showTips(checkoutDate, FHXConfig.validate[12]);
        }else{
            if(dd == "")
                return Mod.showTips(departDate, FHXConfig.validate[0]);
            if(rd == "")
                return Mod.showTips(returnDate, FHXConfig.validate[1]);
            if(!dd.isDate())
                return Mod.showTips(departDate, FHXConfig.validate[4]);
            if(!rd.isDate())
                return Mod.showTips(returnDate, FHXConfig.validate[4]);
            if(dd >= rd)
                return Mod.showTips(returnDate, FHXConfig.validate[5]);
            if(S.dateDiff(dd, rd, 'd') > 28)
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
            // clear filter
            Filter.clearResults();
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
var Hotel = function (hotelId, container){
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
    this.selectedRow = undefined;// 选择的行
    
    // 右边价格元素
    this.divPrice = container.find('div.price_cost');
    this.prices = this.divPrice.attr('data-prices').split('|');
    // X资源元素
    this.divXProduct = container.find('div.free_service>dl.service_info_list');
    // 第一个房型元素
    this.firstRoom = container.find('div.htl_recom>em.recom_type');
    this.roomId = this.firstRoom.attr('data-room');
    this.roomCount = this.firstRoom.attr('data-roomCount');
    this.roomUnitPrice = this.firstRoom.attr('data-price');
    // 更多房型
    this.lnkMore = container.find('div.htl_recom a[data-role="allrooms"]');
    new Mod.EventDispatcher({ctx: this.lnkMore, func: this.showAllRooms.bind(this)});
    // 勾选用户选择的其它房型        
    if(this.hotelId == HotelList.selectedHotel && this.roomId != HotelList.selectedRoom){
        setTimeout(function () { // init is not completed yet
            lnkMore.trigger('click');
        },10);
    }

    this._initFlightSelect(container);
    this._initXView();
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

        function show () {
            S.show(divXProduct);
            divXProduct.mask(true, function () {
                S.hide(divXProduct);
            });
        }

        function hide () {
            divXProduct.unmask(true);
        }

        function render (title, html) {
            divXProduct.find('.popup_tit')[0].innerHTML = title.replace(/（[^）]+）/,'');
            divXProduct.find('.popup_con')[0].innerHTML = html;
        }

        function getData (xid, title) {
            $.ajax(FHXConfig.URL.X_PRODUCTS + "?XProductIDs=" + xid, {
                method: cQuery.AJAX_METHOD_GET,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(!res) return;
                    var data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
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
            if(target.nodeName != 'A') return;
            var xid = target.getAttribute('data-xid');
            if(!xid) return;

            show();
            if(cache[xid]){
                render(cache[xid][0], cache[xid][1]);
            }else{
                render(target.innerHTML, '');
                Mod.showLoading(divXProduct);
                getData(xid, target.innerHTML);
            }
        });
    },

    _loading: function (type) {
        var ctx = S.parent(this.lnkMore,'.htl_recom');
        var loading = S.next(ctx);
        if(type == 'show'){
            S.show(ctx);
            S.show(loading);
        }else{
            S.hide(loading);
            S.hide(ctx);
        }
        return loading;
    },
		
	_ajaxAllRooms: function (query, callback){
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

	_initAllRooms: function (query, res){
        var loading = this._loading('hide');

        if(res == '' || res == 'null'){
            this.linkMore.onclick = null;
            return;
        }

        try{
            this.tbRoomList = $(S.create(res));
            S.insertAfter(this.tbRoomList, loading);
        }catch(ex){
            S.show(S.parent(this.lnkMore,'.htl_recom'));
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
                    {selector: 'a.more_type', func: this.hideAllRooms.bind(this)},
                    {selector: 'input',       func: this.selectRoom.bind(this)},
                    {selector: 'select',      func: this.changePrices.bind(this)},
                    {selector: 'a.recom_type',func: this.toggleDetails.bind(this)},
                    {selector: 'a.btn_up',    func: this.hideDetails.bind(this)}
                ]
            });
        // fix onchange for ie
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
            this.tbRoomList.find('select').bind('change', this.changePrices.bind(this));
        // select the specified room
        var self = this;

        setTimeout(function () {
            var btn = self.tbRoomList
                .find('tr[data-room="'+self.roomId+'"]>td:last')
                .find('input');
            S.trigger(btn, 'click');
        },30);
        
	},
	
	showAllRooms: function (num, query){
		if (this.isGotAllRooms) {
            S.show(this.tbRoomList);
            this._loading('hide');
		} else {
            if(this.isGettingRooms) return;
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
        while(tr.hasClass('append_detail1') || tr.hasClass('append_detail2')){
            if(tr.hasClass('append_detail1')){
                tr.hasClass('hidden') ? tr.removeClass('hidden') : tr.addClass('hidden');
            }
            tr = $(S.next(tr));
        };
    },

    hideDetails: function (target) {
        var tr = S.parent(target, 'tr');
        S.hide(tr);
    },
	
	selectRoom: function (target){
        this.selectedRow = S.parent(target, 'tr');
		this.roomId = this.selectedRow.getAttribute('data-room');
        this.roomUnitPrice = target.getAttribute('data-price');
        this._changeXProduct();
        this._changeSelect(target);
        this.changePrices();
	},
    // 改变价格信息 
    changePrices: function (roomId, e){
        if(e && e.type != 'change') return; // filter out click event

        this._changeDiffPrices();

        var tr = this.selectedRow;
        var prices = tr.cells[5].firstChild.value;
        prices = prices.split('|');
        this.prices = prices;
        var avg = Math.round(+prices[2] / HotelList.personCount);
        this.divPrice.find('span.prices, div.price_per_single')
            .each(function(item, i){
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
        rows.each(function(row, i){
            if(i == 0) return; // heads
            var price = +(row[0].cells[5].firstChild.value.split('|')[2]);
            var diff = price - baseprice;
            row[0].cells[4].firstChild.innerHTML = 
                (diff == 0 ? "" : (diff > 0 ? "+" : "-")) +
                "<dfn>&yen;</dfn>" + 
                Math.abs(diff);
            // disable nonselected row and get the count of selected room
            if(tr == row[0]){
                row[0].cells[5].firstChild.disabled = false;
                var selectRoom = row[0].cells[5].firstChild;
                self.roomCount = selectRoom.options[selectRoom.selectedIndex].text;
            }else{
                row[0].cells[5].firstChild.disabled = true;
            }
                
        });
    },
    // 改变X资源
    _changeXProduct: function (roomId) {
        var tr = this.selectedRow;
        var lnks = this.divXProduct.find('dd>a');
        var xdata = $.parseJSON(tr.getAttribute('data-params'));
        if(!xdata) return;
        if(!xdata.list){
            this.divXProduct.addClass('hidden');
        }else{
            this.divXProduct.removeClass('hidden');
            lnks.each(function(lnk, i){
                lnk = lnk[0];
                var data = xdata.list[i];
                if(data){
                    lnk.innerHTML = data.name + "（" + data.quantity + FHXConfig.texts.xunit + "）" ;
                    lnk.setAttribute('data-xid', data.productid);    
                }else{
                    lnk.innerHTML = '';
                    lnk.setAttribute('data-xid', '');    
                }
            });    
        }
        
    },
    // 改变选择按钮
	_changeSelect: function (obj) {
		var selected = this.selectedBtn;

        if(selected){
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
        $('#hRoomCount').value(this.roomCount);
        $('#hRoomUnitPrice').value(this.roomUnitPrice);
        $('#hPkgPrices').value(this.prices.join('|'));

        var xids = [];
        this.divXProduct.find('dd>a').each(function(item, i){
            var id = item.attr('data-xid');
            id && xids.push(id);
        });
        $('#hXProducts').value(xids.join('|'));

        $('#hHotelID').value(this.hotelId);
        $('#hRoomID').value(this.roomId);
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
	
	init: function (){
		var self = this;
		$('#divHotelList li').each(function(el, i){
			var hotelId = el.attr('data-hotel');
            if(!hotelId) return;
			self.hotels[hotelId] = new Hotel(hotelId, el);
		});
	}
}
window.HotelList = HotelList;

// 酒店筛选
var Filter = {

	multiChooseDic: {},
	
	allHidden: $('#divFilterData').find('input'),

	init: function () {
		var divFilter = $('#ulFilter'), divFilterResult = $('#divFilterResult');
		
		if(divFilter.length == 0) return;

		new Mod.EventDispatcher({
                ctx: divFilter,
                func: Filter.selectOption,
                selector: 'a,input',
				cmds: [
					{selector: 'a[data-role="more_select"]', func: Filter.openMultiChoose},
					{selector: 'a[data-role="more"]',        func: Filter.openBox},
					{selector: 'input.multiple_btn1',        func: Filter.confirmChoice},
					{selector: 'input.multiple_btn2',        func: Filter.cancelChocie},
                    {selector: 'input.htl_name',             func: function(){}},
                    {selector: 'input.htl_but',              func: Filter.filterName}
				]
			});
		
		if(divFilterResult.length){
			new Mod.EventDispatcher({
                    ctx: divFilterResult, 
                    func: Filter.cancelResult,
                    level: 2,
					cmds: [
						{selector: '.del_all', func: Filter.clearResults}
					]
				});
		}
		
        this._initNameFilter(divFilter);

		// init breadcrumb navigation
        window.breadcrumbNav = function (obj, e) {
            $('#hStarList').value = '';
            doPost(obj, e);
        };
	},

    _initNameFilter: function (divFilter) {
        var txtHotelName = divFilter.find('input.htl_name');
        if(!txtHotelName.length) return;
        // init placeholder
        require.async('tools/placeholder.js', function (placeholder) {
            placeholder.init();
        });
        // init carriage return
        var self = this;
        txtHotelName.bind('keyup', function (e){
            if(e.keyCode == 13)
                self.filterName(S.next(e.target));
        });
    },
    // 筛选酒店名
    filterName: function (target) {
        var target = S.prev(target);
        if(!target || $(target).value() == '') return;
        Searcher.reset();
        $('#hHotelName').value($('#txtHotelName').value());
        doPost(Filter.clearQuery(window.location.href));
    },
    // 去除url查询参数
    clearQuery: function (url) {
        url = url.replace(/p\d+/, '');
        var index = url.indexOf('?');
        if(index == -1) return url;
        return url.substring(0, index);
    },
    // 执行筛选
    search: function (keyIndex, target, isClear) {
        Searcher.reset();
        var url = Filter.getURL(keyIndex, target, isClear);
        doPost(url);
    },
	// 获取指定条件的post url
	getURL: function (keyIndex, target, isClear){
		var url = window.location.href;
		
		url = Filter.clearQuery(url); // remove paging info
		
		var key    = FHXConfig.filter.keys[keyIndex],
			value  = $('#h' + key).value(), 
			seoKey = FHXConfig.filter.seo[keyIndex], 
			rSeoItem = new RegExp(seoKey + '\\d+','gi'); //seo value is a number

		if(isClear && keyIndex == -1){
            for (var i = 0; i < FHXConfig.filter.seo.length; i++) {
                seoKey = FHXConfig.filter.seo[i];
                rSeoItem = new RegExp(seoKey + '\\d+','gi');
			    url = url.replace(rSeoItem, '');
            }
            return url;
        }

		if(isClear && seoKey){
			url = url.replace(rSeoItem, '');
			return url;
		}
		
		if(value.split(',').length == 1 && seoKey){
            if(!target.href || target.href.indexOf('javascript') != -1){
                var matches = url.match(/\d\-[^\-\/]+(\/)?/); // test whether the url carries filter seo items
                url = url.replace(/#\w+/,'');
                return url + (matches[1] ? '' : '/') + seoKey + value
            }
            return Filter.clearQuery(target.href);
        }
		
		return url;
	},
    // 还原其它条件的初始选择，指定条件除外
	resetOthers: function (key){
		Filter.allHidden.each(function(item, i){
			if(item[0].id.substring(1) == key)
				return;
			item.value(item.attr('data-default'));
		});
	},
	// 展开更多
	openBox: function (target) {
		$(target).addClass('hidden');
        var li = $(S.parent(target, 'li'));
        li.removeClass('htl_sear');
        li.addClass('current');
        li.find('a:first').addClass('hidden');
        li.find('div.btn_submit').removeClass('hidden');
        // zone more options
        if(target.getAttribute('data-role') == 'more'){
            $(target).removeClass('hidden');
            li.removeClass('current');
            li.hasClass('clos') ? li.removeClass('clos') : li.addClass('clos');
            target.innerHTML = FHXConfig.texts.filterMore[
                target.innerHTML.indexOf('down') != -1 ? 1 : 0];
            target.innerHTML.indexOf('down') != -1 && li.find('a:first').removeClass('hidden');
        }
        // fix ie6/7 reflow problem
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7){
            var next = S.next(li, 'li');
            while(next){
                next.style.marginTop = '10px';
                next.style.marginTop = '';
                next = S.next(next, 'li');
            }
        }	
	},
    // 展开多选
	openMultiChoose: function (keyIndex, target) {
		var key = FHXConfig.filter.keys[keyIndex];
		Filter.openBox(target);
		// update status
		Filter.multiChooseDic[key] = true;
	},
    // 确定选择
	confirmChoice: function (keyIndex, target) {
		var key = FHXConfig.filter.keys[keyIndex];

		if($('#h' + key).value().trim().length == 0)
			return; // select nothing 

		// update datas
		Filter.resetOthers(key);        
		// post data
        Filter.search(keyIndex, target);
	},
    // 取消选择
	cancelChocie: function (keyIndex, target) {
		var key = FHXConfig.filter.keys[keyIndex];
		// update style
		var li = $(S.parent(target,'li'));
		li.removeClass('current');
		li.find('div.btn_submit').addClass('hidden');
        // update options
		var items = li.find('span>a');
		items.each(function(item, i){
			(i == 0 || i == items.length - 1) ? item.removeClass('hidden') : item.removeClass('cur');
		});
        // do for brand
        if(key == 'HotelBrandIds') li.addClass('htl_sear');
		// update datas
		var hData = $('#h' + key);
		hData.value(hData.attr('data-default'));

		Filter.multiChooseDic[key] = false;
        // fix ie6/7 reflow problem 
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7){            
            var next = S.next(li, 'li');
            while(next){
                next.style.marginTop = '10px';
                next = S.next(next, 'li');
            }
        }   
	},
    // 清除指定条件
	cancelResult: function (keyIndex, target){
		var key = FHXConfig.filter.keys[keyIndex];
		// update datas
		var hData = $('#h' + key);
		hData.value(''); // default value is empty (but should be configed)
        $('#hActionType').value(1); // I don't know what's it for, but it's needed.
        Filter.search(keyIndex, target, true);
	},
	// 清除所有条件
	clearResults: function (target){
		Filter.allHidden.each(function(item, i){
			item.value('');
		});
        $('#hActionType').value(1);
        target && Filter.search(-1, target, true);
	},
	// 选择选项
	selectOption: function (keyIndex, value, target, e) {
		var key = FHXConfig.filter.keys[keyIndex];
		
		target = $(target);
		var isMultiChoose = key in Filter.multiChooseDic && Filter.multiChooseDic[key];
		var isChecked = target.hasClass('cur');
		var hData = $('#h' + key);
		
		if(isMultiChoose){
			// checkbox
			isChecked ? target.removeClass('cur') : target.addClass('cur');
			
			var rValue = new RegExp('\\b' + value + '\\b');
			if(isChecked)
				hData.value(hData.value().replace(rValue, ''));
			else
				!rValue.test(hData.value()) && hData.value(hData.value() + ',' + value);
			// normalize value
			hData.value(hData.value().split(',').filter(function(item){return item != ''}).join(','));
            e.preventDefault();
		}else{
            Filter.resetOthers(key); // single select reset other options
			target.addClass('cur');
			hData.value(value);
            Filter.search(keyIndex, target[0]);
		}
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
$(window).bind('unload', function(){
    FHX = null;    
    Filter = null;
    Validator = null;
    Searcher = null;
    QuickView = null;
    window.HotelList = HotelList = null;
    window.Hotel = Hotel = null;
});

});
