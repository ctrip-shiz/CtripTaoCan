/*
* author:shiz@ctrip.com
* date:2013-07-10
*/
define(function(require, exports, module) {

var S = require('common').S;
var Mod = require('common').Mod;
Mod.EventDispatcher = require('tools/eventdispatcher.js');

function rankList (target, event) {
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
        Filter .init();

        FHX._initBookLogin();

        // load mods
        require.async('mods');
        // submit loading
        Mod.initSubmitLoading();
        // limit form submit
        S.limitSubmit(fm);
        // register jmp module
        $(document).regMod('jmp', '1.0');
        // load quickview
        require.async('mods/quickview');
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
    // this.divPrice = container.find('div.price_cost');
    // this.prices = this.divPrice.attr('data-prices').split('|');
    // X资源元素
    // this.divXProduct = container.find('div.free_service>dl.service_info_list');
    // 第一个房型元素
    // this.firstRoom = container.find('div.htl_recom>em.recom_type');
    // this.roomId = this.firstRoom.attr('data-room');
    // this.roomCount = this.firstRoom.attr('data-roomCount');
    // this.roomUnitPrice = this.firstRoom.attr('data-price');
    // 更多房型
    this.lnkMore = container.find('p.htl_operate a[data-role="allrooms"]');
    new Mod.EventDispatcher({ctx: this.lnkMore, func: this.showAllRooms.bind(this)});
    // 勾选用户选择的其它房型
    // if(this.hotelId == HotelList.selectedHotel && this.roomId != HotelList.selectedRoom){
    //     setTimeout(function () { // init is not completed yet
    //         lnkMore.trigger('click');
    //     },10);
    // }

    // this._initFlightSelect(container);
    // this._initXView();

    this.tbRoomList1 = container.find('table');
    this.tbRoomList2 = undefined;
    this._bindRoomListEvents(container.find('table'));
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
        var ctx = S.parent(this.lnkMore,'.htl_operate');
        var loading = S.next(ctx);
        if(type == 'show'){
            S.hide(ctx);
            S.show(loading);
        }else{
            S.hide(loading);
            S.show(ctx);
        }
    },
        
    _ajaxAllRooms: function (query, callback){
        $.ajax(FHXConfig.URL.HOTEL_ALL_ROOM + '?hotel=' + this.hotelId + '&' + (query || ''), {
            method: cQuery.AJAX_METHOD_POST,
            context: {
                "PkgPrices": $('#hPkgPrices').value()
            },
            cache: true,
            onerror: function () { },
            onsuccess: function (xhr, res) {
                callback(res);
            }
        });
    },

    _initAllRooms: function (query, res){
        this._loading('hide');

        if(res == '' || res == 'null'){
            this.linkMore.onclick = null;
            return;
        }

        try{
            this.tbRoomList2 = $(S.create(res));
            S.insertAfter(this.tbRoomList2, this.tbRoomList1);
            S.hide(this.tbRoomList1);
            this.lnkMore.html(FHXConfig.texts.room[3]);
        }catch(ex){
            S.show(S.parent(this.lnkMore,'.htl_operate'));
            console && console.log('Room list data error');
            return;
        }

        this.isGotAllRooms = true;
        this.isGettingRooms = false;

        this._bindRoomListEvents(this.tbRoomList2);

        if(this.hotelId == HotelList.selectedHotel)
            HotelList.initRoomSelect();
        // select the specified room
        // var self = this;
        // setTimeout(function () {
        //     var btn = self.tbRoomList
        //         .find('tr[data-room="'+self.roomId+'"]>td:last')
        //         .find('input');
        //     S.trigger(btn, 'click');
        // },30);
        
    },

    _bindRoomListEvents: function (table) {
        // register event listener
        new Mod.EventDispatcher({
                ctx: table,
                selector: 'a, input, select',
                event: 'click change',
                cmds: [
                    //{selector: 'a.more_type', func: this.hideAllRooms.bind(this)},
                    {selector: 'input',  func: this.selectRoom.bind(this)},
                    {selector: 'select', func: this._changeDiffPrices.bind(this)},
                    {selector: 'a.recom_type', func: this.toggleDetails.bind(this)},
                    {selector: 'a.btn_up', func: this.hideDetails.bind(this)}
                ]
            });
        // fix onchange for ie
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
            table.find('select').bind('change', this._changeDiffPrices.bind(this));        
    },
    
    showAllRooms: function (num, query){
        if (this.isGotAllRooms) {
            if(this.tbRoomList1.hasClass('hidden')){
                S.hide(this.tbRoomList2);
                S.show(this.tbRoomList1);
                this.lnkMore.html(FHXConfig.texts.room[2].replace('$', num));
            }else{
                S.show(this.tbRoomList2);
                S.hide(this.tbRoomList1);
                this.lnkMore.html(FHXConfig.texts.room[3]);
            }   
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
        while(tr && (tr.hasClass('append_detail1') || tr.hasClass('append_detail2'))){
            if(tr.hasClass('append_detail1')){
                tr.hasClass('hidden') ? tr.removeClass('hidden') : tr.addClass('hidden');
            }
            tr = S.next(tr) ? $(S.next(tr)) : null;
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
        //this._changeXProduct();
        this._changeSelect(target);
        //this.changePrices();
        this._goBack();
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

        //this._changeFoldDisplay();
    },
    // 改变差价信息
    _changeDiffPrices: function (target, e) {
        if(e && e.type != 'change') return;
        if(!e) target = target.target;
        var self = this;
        var tr = S.parent(target, 'tr');
        var baseprice = HotelList.baseprice,
            price = + target.value.split('|')[2],
            diff = price - baseprice;

        tr.cells[5].innerHTML = '<span class="col_oran" title="">'
            + ((diff == 0) ? '' : diff > 0 ? '+' : '-') 
            + '&nbsp;<dfn>¥</dfn>'+ Math.abs(diff) +'</span>';
        // var baseprice = +(tr.cells[5].firstChild.value.split('|')[2]);
        // var rows = this.tbRoomList.find('tr:not(.append_detail1,.down)');
        // rows.each(function(row, i){
        //     if(i == 0) return; // heads
        //     var price = +(row[0].cells[5].firstChild.value.split('|')[2]);
        //     var diff = price - baseprice;
        //     row[0].cells[4].firstChild.innerHTML = 
        //         (diff == 0 ? "" : (diff > 0 ? "+" : "-")) +
        //         "<dfn>&yen;</dfn>" + 
        //         Math.abs(diff);
        //     // disable nonselected row and get the count of selected room
        //     if(tr == row[0]){
        //         row[0].cells[5].firstChild.disabled = false;
        //         var selectRoom = row[0].cells[5].firstChild;
        //         self.roomCount = selectRoom.options[selectRoom.selectedIndex].text;
        //     }else{
        //         row[0].cells[5].firstChild.disabled = true;
        //     }
                
        // });
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

        if(selected && S.parent(selected, 'table') == S.parent(obj, 'table')){
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
    // 选择后跳转
    _goBack: function () {
        var tr = this.selectedRow;
        var select = S.firstChild(tr.cells[4]);
        this.roomCount = select.options[select.selectedIndex].text;
        this.save();
        doPost(FHXConfig.URL.MIDWARE + "?ActionType=4");
    },
    // 保存post数据
    save: function () {
        $('#hRoomCount').value(this.roomCount);
        // $('#hRoomUnitPrice').value(this.roomUnitPrice);
        // $('#hPkgPrices').value(this.prices.join('|'));

        // var xids = [];
        // this.divXProduct.find('dd>a').each(function(item, i){
        //     var id = item.attr('data-xid');
        //     id && xids.push(id);
        // });
        // $('#hXProducts').value(xids.join('|'));

        $('#hHotelID').value(this.hotelId);
        $('#hRoomID').value(this.roomId);
    }
}
window.Hotel = Hotel;
// 酒店列表
var HotelList = {

    selectedHotel: $('#hHotelID').value(),
    selectedRoom: $('#hRoomID').value(),

    baseprice: + $('#hPrePkgPrice').value(),

    personCount: 2,//+$('#AdultSelect').attr('data-default') + (+$('#ChildrenSelect').attr('data-default')),

    hotelSelectInited: false,
    
    hotels: {},
    
    init: function (){
        var self = this;
        $('.htl_list').each(function(el, i){
            var hotelId = el.attr('data-hotel');
            if(!hotelId) return;
            self.hotels[hotelId] = new Hotel(hotelId, el);
        });
        this.initRoomSelect();
    },

    initRoomSelect: function () {
        var hotelId = $('#hHotelID').value(), 
            roomId = $('#hRoomID').value(),
            roomCount = $('#hRoomCount').value();
        var hotel = this.hotels[hotelId];
        if(!hotel) return;
        var btn = hotel.container.find('table:last').find('#btnSelectRoom'+roomId),
            select = S.firstChild(S.parent(btn, 'tr').cells[4]);
        hotel._changeSelect(btn);
        hotel.roomCount =  roomCount;

        S.toArray(select.options)
            .each(function (opt, i) {
                if(opt.text == roomCount){
                    opt.selected = true;
                    S.trigger(select, 'change');
                }
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
    // 去除url查询参数
    clearQuery: function (url) {
        var index = url.indexOf('?');
        if(index == -1) return url;
        return url.substring(0, index);
    },
    // 筛选酒店名
    filterName: function (target) {
        var target = S.prev(target);
        if(!target || $(target).value() == '') return;
        $('#hHotelName').value($('#txtHotelName').value());
        doPost(Filter.clearQuery(window.location.href));
    },
    // 执行筛选
    search: function (keyIndex, target, isClear) {
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

// X资源
var PriceChanger = {

    _rPrice: /([\d\-]+)/g,

    init: function () {
        this.divPackagePrice = $('#divDataConfirm .prices')[0];
    },

    changePackagePrice: function (prices) {
        var divPackagePrice = this.divPackagePrice;
        var i = 0;
        divPackagePrice.innerHTML = 
            divPackagePrice.innerHTML.replace(this._rPrice, function (_, w) {
                prices[i] = +w + prices[i++];
                return prices[i-1];
            });
        var hPrices = $('#hPrices')[0];
        hPrices.value = 
            hPrices.value.split('|').map(function (item, i) {
                return i == 2 ? prices[0] : item;
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
        cells[6].innerHTML = cells[6].innerHTML.replace(this._rPrice, total.ctrip || '--');

        if(total.ctrip){
            if(cells[6].innerHTML.toLowerCase().indexOf('dfn') != -1)
                return total;
            cells[6].innerHTML = cells[6].innerHTML.replace(this._rPrice, function (p) {
                return '<dfn>&yen;</dfn>' + p;
            });
        }else{
            cells[6].innerHTML = cells[6].innerHTML.replace(/<dfn>[^<]+<\/dfn>/i, '');
        }
        
        return total;
    }
}

var XController = {

    data: {},

    hData: $('#hXData')[0],

    init: function () {
        this.divXProduct = $('#divXProduct');
        this.divXList = $('#divXList');
        // prepare data
        var self = this;
        this.hData.value.split(',').each(function(data, i){
            var data = data.split('|');
            self.data[data[0]] = data;
        });

        this._bindEvents();
    },

    _bindEvents: function () {
        var self = this;
        // selects to change x date/count
        this.divXList.bind('change', function (e){
            if(e.target.nodeName != 'SELECT') return;
            self._changeX(e.target);
        });
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
            this.divXList.find("select").bind('change', function (e){
                self._changeX(e.target);  
            });
        // links to remove x
        this.divXProduct.bind('click', function (e){
            if(e.target.nodeName != 'A') return;
            var xid = S.parent(e.target, 'tr').getAttribute('data-xid');
            if(!xid) return;
            self.remove(xid);
        });
        
        // toggle details/more
        this._bindToggleEvents();
    },

    _bindToggleEvents: function () {
        var self = this;

        function toggleDetail (target) {
            var tr, trDetail;
            if(target.className == 'more_type'){
                trDetail = S.parent(target, 'tr');
                tr = S.prev(trDetail);
                self.toggleDetail(tr, trDetail);
            }else{
                tr = S.parent(target, 'tr');
                trDetail = S.next(tr);
                if(trDetail && trDetail.className.indexOf('append_detail1') > -1)
                    self.toggleDetail(tr, trDetail);
                else
                    self._requestDetail(tr.getAttribute('data-xid'), tr);
            }
        }

        this.divXList.bind('click', function (e) {
            var target = e.target;
            if(target.nodeName == 'B')
                target = target.parentNode;
            if(target.nodeName != 'A' || !/javascript/.test(target.href))
                return;
            (target.className == 'more_type' && target.parentNode.className != 'txt') ?
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
                if(!res) return;
                var data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
                data.name = FHXConfig.XData[xid].name;
                data.visa = FHXConfig.XData[xid].visa;
                var html = $.tmpl.render(FHXConfig.tmpls.xdetail[1], data);
                if(!html) return;
                var div = $(trDetail).find('div')[0];
                div.innerHTML = html;
            }
        });
    },

    toggleDetail: function (tr, trDetail) {
        tr = $(tr), trDetail = $(trDetail);
        if(tr.hasClass('tr_down')){
            tr.removeClass('tr_down');
            trDetail.addClass('hidden');
        }else{
            tr.addClass('tr_down');
            trDetail.removeClass('hidden');
        }
    },

    _changeXQuantity: function (tr, date) {
        var xid = tr.getAttribute('data-xid'),
            count = FHXConfig.XData[xid].count; // original count
        var quantityObj = FHXConfig.XData[xid].prices[date].quantity,
            quantitySelect = S.firstChild(tr.cells[5]);

        // create options
        var optsHtml = '<option value="0">0</option>', selected = 0;
        for (var i = quantityObj.min; i <= quantityObj.max; i += quantityObj.step) {
            i == count && (selected = i);
            optsHtml += S.format('<option value="$1" $2>$1</option>', i, 
                i == count ? 'selected="selected"' : '');
        }
        $(quantitySelect).html(optsHtml);
        cQuery.browser.isIE && (quantitySelect.value = selected);

        if(selected == -1 && count > 0){
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
        if(xSelect.className === 'per_num'){
            count = +xSelect.value;
            !isRemove && this[method](xid, count, date, tr);
            FHXConfig.XData[xid].count = count;
        }else{
            date = xSelect.value;
            !isRemove && this._changeXQuantity(tr, date); // change quantity select
            !isRemove && (xid in this.data) && this[method](xid, count, date, tr);
            FHXConfig.XData[xid].date = date;
        }
        // change prices
        var total = PriceChanger.changeXPrice(tr, count);
        PriceChanger.changePackagePrice([total.ctrip - oldPrice, 0]);
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
        var isUpdated = false, lastTable;
        this.divXProduct.find('table.type_lis_tks').each(function(table, i){
            if(isUpdated) return;
            table.find('tr').each(function(tr, i){
                if(isUpdated) return;
                if(tr[0].getAttribute('data-xid') == id){
                    // use replaceChild to work as ohtml
                    // but it will not copy the events of the old one
                    table.find('tbody')[0].replaceChild(newTR, tr[0]);
                    isUpdated = true;
                }
            });
            lastTable = table;
        });

        if(data.ctripprice == 0)
            lastTable = this.divXProduct.find('table.type_lis_tks:first');

        if(!isUpdated)
            lastTable.find('tbody')[0].appendChild(newTR);
            
        this._drawSeperate();

        return data;
    },

    _save: function () {
        var data = [], _data = this.data;
        for(var id in _data){
            if(!_data.hasOwnProperty(id)) continue;
            var tmp = [];
            for(var k in _data[id]){
                if (!_data[id].hasOwnProperty(k)) continue;
                tmp.push(_data[id][k]);
            }
            data.push(tmp.join('|'));
        }
        this.hData.value = data.join(',');
    },

    _add: function (id, count, date, tr) {
        tr.cells[7].innerHTML = '<b class="icon_selected"></b>';
        var data = this._redrawXProduct(id, count, date);
        this.data[id] = data;
        this._save();
    }, 

    _edit: function (id, count, date, tr) {
        if(count == 0){
            this._remove(id, tr);
            return;
        }
        var data = this._redrawXProduct(id, count, date);
        this.data[id] = data;
        this._save();
    },

    _remove: function (id, tr) {
        if( !(id in this.data) ) return;

        delete this.data[id];
        this._save();

        var self = this;

        tr.cells[7].innerHTML = '';
        var selectCount = S.firstChild(tr.cells[5]);
        selectCount.value = 0;

        this.divXProduct.find('table.type_lis_tks').each(function(table, i){
            table.find('tr').each(function(tr, i){
                if(tr[0].getAttribute('data-xid') == id)
                    tr[0].parentNode.removeChild(tr[0]);
            });
        });

        this._drawSeperate();
    },

    remove: function (id) {
        var tr = this.divXList.find('tr[data-xid="'+id+'"]')[0];
        this._remove(id, tr);
        var selectCount = S.firstChild(tr.cells[5]);
        this._changeX(selectCount, true);
    },

    _drawSeperate: function () {
        var tbs = this.divXProduct.find('table.type_lis_tks');
        if(tbs[0].rows.length == 0 || tbs[1].rows.length == 0)
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

        var rows = $(tb).find('tr:not(.append_detail1)').each(function(row, i){
            if(i < 3) return;
            row.hasClass('hidden') ? row.removeClass('hidden') : row.addClass('hidden');
        });
        rows[rows.length - 1].className = '';
    }
}

// 1成人2儿童 1成人1间房 关联限制
FHX.SelectListLimit = {

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

FHX.init();

// release memory
$(window).bind('unload', function(){
    FHX = null;    
    Filter = null;
    Validator = null;
    QuickView = null;
    window.HotelList = HotelList = null;
    window.Hotel = Hotel = null;
});

});
