/*
* author:shiz@ctrip.com
* date:2013-07-10
*/
define(function (require, exports, module) {
    var S = require('common').S;
    var Mod = require('common').Mod;
    require("mods/quickview.js")
    require("tools/placeholder.js").init();
    Mod.EventDispatcher = require('tools/eventdispatcher.js');
    require("mods");

    function rankList(target, event) {
        //Searcher.reset();
        //Filter.clearResults();
        $('#hActionType').value('');
        target.href = Filter.clearQuery(window.location.href);
        doPost(target, event);
    }
    window.rankList = rankList;

    // namespace flt hotel
    var SSH = {

        _bookHotelId: undefined, // 预订的酒店id

        _initBookLogin: function () {
            window.selectPackage = function (hotelId) {
                var hotel = HotelList.hotels[hotelId];
                hotel.save();
                __SSO_booking('', '1');
                //doPost(SSHConfig.URL.SELECT_HOTEL);
            }
        },

        init: function () {
            Searcher.init();
            //Searcher.init();
            Filter.init();
            HotelList.init();

            SSH._initBookLogin();

            // load mods
            require.async('mods');
            // submit loading
            Mod.initSubmitLoading();
            // limit form submit
            S.limitSubmit(fm);
            // register jmp module
            Mod.regJMP();
            // register lazyload
            $(document).regMod("lazyLoad", "1.0", {
                placeholder: 'http://pic.c-ctrip.com/hotels110127/hotel_example.jpg',
                loadingImage: 'http://pic.c-ctrip.com/hotels110127/hotel_example.jpg'
            });
            // load quickview
            require.async('mods/quickview');
        }
    };

    //新的搜索
    var Searcher = {
        wrap: $(".htl_select"),
        txtSearch: $(".htl_select .input_text"),
        changeBut: $(".htl_select .btn_data"),
        lastDate: $(".htl_select .date"),

        init: function () {
            this._regMod();
            this._addEvent();
        },

        _regMod: function () {
            var DateRange = $("#hDateRange").value().split("|");
            this.txtSearch.regMod("calendar", "3.0", {
                "options": {
                    "minDate": DateRange[0],
                    "maxDate": DateRange[1]
                }
            })
        },

        _addEvent: function () {
            var self = this;
            this.txtSearch.bind("change", this._changedFn.bind(this));
            this.changeBut.bind("click", function () {
                S.show(self.txtSearch);
                S.hide(self.lastDate);
                S.hide(self.changeBut);
                self.txtSearch[0].focus();
            })
        },

        _changedFn: function () {
            if (this.txtSearch[0].defaultValue != this.txtSearch[0].value) {
                doPost(location.href);
            }
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
        this.selectedRow = undefined;// 选择的行

        // 右边价格元素
        this.divPrice = container.find('div.price_cost');
        //this.prices = this.divPrice.attr('data-prices').split('|');
        // 票元素
        this.divTicket = container.find('div.recom_sce');
        // 第一个房型元素
        this.firstRoom = container.find('div.htl_recom>em.recom_type');
        this.firstRoom.length
        this.roomId = this.firstRoom.attr('data-roomid');
        this.roomCount = this.firstRoom.attr('data-roomCount');
        this.roomUnitPrice = this.firstRoom.attr('data-price');
        // 更多房型
        this.lnkMore = container.find('div.htl_recom a[data-role="allrooms"]');
        new Mod.EventDispatcher({ ctx: this.lnkMore, func: this.showAllRooms.bind(this) });
        // 勾选用户选择的其它房型 
        if (this.hotelId == HotelList.selectedHotel && this.roomId != HotelList.selectedRoom) {
            setTimeout(function () { // init is not completed yet
                lnkMore.trigger('click');
            }, 10);
        }

        this._initTicket();
    }

    Hotel.prototype = {
        constructor: Hotel,

        _initTicket: function () {
            var divTicket = $('#divTicket');
            var self = this;
            var cache = {};

            function show() {
                S.show(divTicket);
                divTicket.mask(true, function () {
                    S.hide(divTicket);
                });
            }

            function hide() {
                divTicket.unmask(true);
            }

            function render(title, html) {
                var wrap = divTicket.find(".hidden_content")
                wrap.html(html);
                var header = divTicket.find("h3")[0];
                header.innerHTML = title.replace(/（[^）]+）/, '');
            }

            function getData(ticketid,type, title) {
                $.ajax(SSHConfig.URL.TICKET + "?productId=" + ticketid + "&useDate=" + $("#starttime").value() + "&productType="+type, {
                    method: cQuery.AJAX_METHOD_GET,
                    onerror: function () { },
                    onsuccess: function (xhr, res) {
                        if (!res) return;
                        var data = (new Function('return ' + res.replace(/\t|\n|\r/g, '')))();
                        data.name = title;
                        var html = $.tmpl.render(SSHConfig.tmpls.ticket, data) || '';
                        cache[ticketid] = [title, html];
                        render(title, html);
                        Mod.hideLoading(divTicket);
                    }
                });
            }

            divTicket.find('.delete').bind('click', hide);

            this.divTicket.each(function (item, i) {
                item.bind('click', function (e) {
                    var target = e.target;
                    if (target.nodeName != 'A') return;
                    var xid = $(S.parent(target, "div")).attr('data-xid');
                    var xType = $(S.parent(target, "div")).attr('data-xtype');
                    //if (!xid) return;
                    show();
                    if (cache[xid]) {
                        render(cache[xid][0], cache[xid][1]);
                    } else {
                        render(target.innerHTML, '');
                        Mod.showLoading(divTicket);
                        getData(xid,xType, target.innerHTML);
                    }
                })
            });
        },

        _loading: function (type) {
            var ctx = S.parent(this.lnkMore, '.htl_recom');
            var loading =this.container.find("span:has(img)")
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
            $.ajax(SSHConfig.URL.HOTEL_ALL_ROOM + '?hotel=' + this.hotelId + '&' + (query || ''), {
                method: cQuery.AJAX_METHOD_POST,
                context: {
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
            var ctx = S.parent(this.lnkMore, '.htl_recom');
            if (res == '' || res == 'null') {
                this.linkMore.onclick = null;
                return;
            }

            try {
                this.tbRoomList = $(S.create(res));
                S.insertAfter(this.tbRoomList, ctx);
            } catch (ex) {
                S.show(ctx);
                console && console.log('Room list data error');
                return;
            }

            this.isGotAllRooms = true;
            this.isGettingRooms = false;

            // register event listener
            new Mod.EventDispatcher({
                ctx: this.tbRoomList,
                selector: 'a, input',
                event: 'click',
                cmds: [
                    { selector: 'a.more_type', func: this.hideAllRooms.bind(this) },
                    { selector: 'input', func: this.selectRoom.bind(this)},
                    //{ selector: 'select', func: this.changePrices.bind(this) },
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
                self.showAllRooms();
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
            while (tr.length&&(tr.hasClass('append_detail1') || tr.hasClass('append_detail2'))) {
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

        selectRoom: function (target) {
            this.selectedRow = S.parent(target, 'tr');
            this.roomId = this.selectedRow.getAttribute('data-room');
            //this.roomUnitPrice = target.getAttribute('data-price');
            this._changeFoldDisplay()
            this._changeSelect(target);
            this.changePrices();
        },
        // 改变价格信息 
        changePrices: function (roomId, e) {

            this._changeDiffPrices();

            var tr = this.selectedRow;
            var prices = tr.cells[5].getAttribute("data-price");
            prices = prices.split('|');
            if (prices[1] <= 0) {
                this.divPrice.find("tr:eq(1)").addClass("hidden");
            }
            else {
                this.divPrice.find("tr:eq(1)").removeClass("hidden");
            }
            this.prices = prices;
            //var avg = Math.round(+prices[2] / HotelList.personCount);
            this.divPrice.find('.tex_rig span.prices, div.price_per_single')
                .each(function (item, i) {
                    item[0].innerHTML = item[0].innerHTML.replace(/\d+/, prices[i]);
                });
        },
        // 改变差价信息
        _changeDiffPrices: function () {
            var self = this;
            var tr = this.selectedRow;
            var baseprice = +($(tr.cells[5]).attr("data-price").split('|')[2]);
            var rows = this.tbRoomList.find('tr:not(.append_detail1,.append_detail3,.down)');
            rows.each(function (row, i) {
                if (i == 0) return; // heads
                var price = +($(row[0].cells[5]).attr("data-price").split('|')[2]);
                var diff = price - baseprice;
                row[0].cells[4].firstChild.innerHTML =
                    (diff == 0 ? "" : (diff > 0 ? "+" : "-")) +
                    "<dfn>&yen;</dfn>" +
                    Math.abs(diff);
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
                        lnk.innerHTML = data.name + "（" + data.quantity + SSHConfig.texts.xunit + "）";
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
            var node = tr.cells[0].children[0];
            this.firstRoom[0].innerHTML =
                node.tagName == 'EM' ?
                    (node.getAttribute('data-master') || "") :
                    $(tr.cells[0]).find('a.recom_type')[0].innerHTML;
            this.firstRoom.find("span").remove();

            var ctx = this.firstRoom.parentNode();
            var sps = ctx.find('>span');
            var giftBox = ctx.find(".gift_box")[0];
            var giftIcon = $(tr).find(".icon_gift")[0];
            if (giftIcon) {
                var giftText = (new Function("return " + giftIcon.getAttribute("data-params")))();
                giftText = giftText && giftText.options && giftText.options.content && giftText.options.content.giftdesc;
                giftBox.innerHTML = tr.cells[0].innerHTML;
                giftBox.appendChild($(giftBox).find(".icon_gift")[0]);
                if (giftBox.getElementsByTagName("em").length) {
                    giftBox.removeChild(giftBox.getElementsByTagName("em")[0]);
                }
                else if (giftBox.getElementsByTagName("a").length) {
                    giftBox.removeChild(giftBox.getElementsByTagName("a")[0]);
                }
                var newGiftIcon = $(giftBox).find(".icon_gift")[0];
                newGiftIcon.setAttribute("data-params", "");
                newGiftIcon.setAttribute("data-role", "");
                giftBox.innerHTML += giftText;
            }
            else {
                giftBox.innerHTML = "";
            }

            sps[0].innerHTML = tr.cells[1].innerHTML;
            sps[1].innerHTML = tr.cells[2].firstChild.innerHTML;
            tr.cells[2].firstChild.innerHTML == "无早" ? $(sps[1]).removeClass("strong") : $(sps[1]).addClass("strong");
            sps[2].innerHTML = SSHConfig.texts.room[0] + tr.cells[3].firstChild.innerHTML;
            tr.cells[3].firstChild.innerHTML == "免费" ? $(sps[2]).addClass("strong") : $(sps[2]).removeClass("strong");
            sps[3].innerHTML = tr.cells[5].innerHTML + SSHConfig.texts.room[1] + "<b></b>";
        },
        // 保存post数据
        save: function () {
            $('#hRoomCount').value(this.roomCount);
            //$('#hRoomUnitPrice').value(this.roomUnitPrice);
            //$('#hPkgPrices').value(this.prices.join('|'));
            $('#hactionType').value(1);
            var xids = [];
            this.divTicket.find('a').each(function (item, i) {
                var id = item.attr('data-xid');
                id && xids.push(id);
            });
            $('#hHotelID').value(this.hotelId);
            $('#hRoomID').value(this.roomId);
        }
    }
    window.Hotel = Hotel;
    // 酒店列表
    var HotelList = {

        selectedHotel: $('#hHotelID').value(),
        selectedRoom: $('#hRoomID').value(),

        //personCount: +$('#AdultSelect').attr('data-default') + (+$('#ChildrenSelect').attr('data-default')),

        hotelSelectInited: false,

        hotels: {},

        init: function () {
            var self = this;
            $('#divHotelList li').each(function (el, i) {
                var hotelId = el.attr('data-hotel');
                if (!hotelId) return;
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

            if (divFilter.length == 0) return;

            new Mod.EventDispatcher({
                ctx: divFilter,
                func: Filter.selectOption,
                selector: 'a,input',
                cmds: [
					{ selector: 'a[data-role="more_select"]', func: Filter.openMultiChoose },
					{ selector: 'a[data-role="more"]', func: Filter.openBox },
					{ selector: 'input.multiple_btn1', func: Filter.confirmChoice },
					{ selector: 'input.multiple_btn2', func: Filter.cancelChocie },
                    { selector: 'input.htl_name', func: function () { } },
                    { selector: 'input.htl_but', func: Filter.filterName }
                ]
            });

            if (divFilterResult.length) {
                new Mod.EventDispatcher({
                    ctx: divFilterResult,
                    func: Filter.cancelResult,
                    level: 2,
                    cmds: [
						{ selector: '.del_all', func: Filter.clearResults }
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
            if (!txtHotelName.length) return;
            // init placeholder
            require.async('tools/placeholder.js', function (mod) {
                //mod.regPlaceHolder(txtHotelName, SSHConfig.placeholder[2]);
            });
            // init carriage return
            var self = this;
            txtHotelName.bind('keyup', function (e) {
                if (e.keyCode == 13)
                    self.filterName(S.next(e.target));
            });
        },
        // 筛选酒店名
        filterName: function (target) {
            var target = S.prev(target);
            if (!target || $(target).value() == '') return;
            //Searcher.reset();
            $('#hHotelName').value($('#txtHotelName').value());
            doPost(Filter.clearQuery(window.location.href));
        },
        // 去除url查询参数
        clearQuery: function (url) {
            url = url.replace(/p\d+/, '');
            var index = url.indexOf('?');
            if (index == -1) return url;
            return url.substring(0, index);
        },
        // 执行筛选
        search: function (keyIndex, target, isClear) {
            //Searcher.reset();
            var url = Filter.getURL(keyIndex, target, isClear);
            doPost(url);
        },
        // 获取指定条件的post url
        getURL: function (keyIndex, target, isClear) {
            var url = window.location.href;

            url = Filter.clearQuery(url); // remove paging info

            var key = SSHConfig.filter.keys[keyIndex],
                value = $('#h' + key).value(),
                seoKey = SSHConfig.filter.seo[keyIndex],
                rSeoItem = new RegExp(seoKey + '\\d+', 'gi'); //seo value is a number

            if (isClear && keyIndex == -1) {
                for (var i = 0; i < SSHConfig.filter.seo.length; i++) {
                    seoKey = SSHConfig.filter.seo[i];
                    rSeoItem = new RegExp(seoKey + '\\d+', 'gi');
                    url = url.replace(rSeoItem, '');
                }
                return url;
            }

            if (isClear && seoKey) {
                url = url.replace(rSeoItem, '');
                return url;
            }

            if (value.split(',').length == 1 && seoKey) {
                if (!target.href || target.href.indexOf('javascript') != -1) {
                    var matches = url.match(/\d\-[^\-\/]+(\/)?/); // test whether the url carries filter seo items
                    url = url.replace(/#\w+/, '');
                    return url + (matches[1] ? '' : '/') + seoKey + value
                }
                return Filter.clearQuery(target.href);
            }

            return url;
        },
        // 还原其它条件的初始选择，指定条件除外
        resetOthers: function (key) {
            Filter.allHidden.each(function (item, i) {
                if (item[0].id.substring(1) == key)
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
            if (target.getAttribute('data-role') == 'more') {
                $(target).removeClass('hidden');
                li.removeClass('current');
                li.hasClass('clos') ? li.removeClass('clos') : li.addClass('clos');
                target.innerHTML = SSHConfig.texts.filterMore[
                    target.innerHTML.indexOf('down') != -1 ? 1 : 0];
                target.innerHTML.indexOf('down') != -1 && li.find('a:first').removeClass('hidden');
            }
            // fix ie6/7 reflow problem
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7) {
                var next = S.next(li, 'li');
                while (next) {
                    next.style.marginTop = '10px';
                    next.style.marginTop = '';
                    next = S.next(next, 'li');
                }
            }
        },
        // 展开多选
        openMultiChoose: function (keyIndex, target) {
            var key = SSHConfig.filter.keys[keyIndex];
            Filter.openBox(target);
            // update status
            Filter.multiChooseDic[key] = true;
        },
        // 确定选择
        confirmChoice: function (keyIndex, target) {
            var key = SSHConfig.filter.keys[keyIndex];

            if ($('#h' + key).value().trim().length == 0)
                return; // select nothing 

            // update datas
            Filter.resetOthers(key);
            // post data
            Filter.search(keyIndex, target);
        },
        // 取消选择
        cancelChocie: function (keyIndex, target) {
            var key = SSHConfig.filter.keys[keyIndex];
            // update style
            var li = $(S.parent(target, 'li'));
            li.removeClass('current');
            li.find('div.btn_submit').addClass('hidden');
            // update options
            var items = li.find('span>a');
            items.each(function (item, i) {
                (i == 0 || i == items.length - 1) ? item.removeClass('hidden') : item.removeClass('cur');
            });
            // do for brand
            if (key == 'HotelBrandIds') li.addClass('htl_sear');
            // update datas
            var hData = $('#h' + key);
            hData.value(hData.attr('data-default'));

            Filter.multiChooseDic[key] = false;
            // fix ie6/7 reflow problem 
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7) {
                var next = S.next(li, 'li');
                while (next) {
                    next.style.marginTop = '10px';
                    next = S.next(next, 'li');
                }
            }
        },
        // 清除指定条件
        cancelResult: function (keyIndex, target) {
            var key = SSHConfig.filter.keys[keyIndex];
            // update datas
            var hData = $('#h' + key);
            hData.value(''); // default value is empty (but should be configed)
            $('#hActionType').value(1); // I don't know what's it for, but it's needed.
            Filter.search(keyIndex, target, true);
        },
        // 清除所有条件
        clearResults: function (target) {
            Filter.allHidden.each(function (item, i) {
                item.value('');
            });
            $('#hActionType').value(1);
            target && Filter.search(-1, target, true);
        },
        // 选择选项
        selectOption: function (keyIndex, value, target, e) {
            var key = SSHConfig.filter.keys[keyIndex];

            target = $(target);
            var isMultiChoose = key in Filter.multiChooseDic && Filter.multiChooseDic[key];
            var isChecked = target.hasClass('cur');
            var hData = $('#h' + key);

            if (isMultiChoose) {
                // checkbox
                isChecked ? target.removeClass('cur') : target.addClass('cur');

                var rValue = new RegExp('\\b' + value + '\\b');
                if (isChecked)
                    hData.value(hData.value().replace(rValue, ''));
                else
                    !rValue.test(hData.value()) && hData.value(hData.value() + ',' + value);
                // normalize value
                hData.value(hData.value().split(',').filter(function (item) { return item != '' }).join(','));
                e.preventDefault();
            } else {
                Filter.resetOthers(key); // single select reset other options
                target.addClass('cur');
                hData.value(value);
                Filter.search(keyIndex, target[0]);
            }
        }
    }

    SSH.init();

    // release memory
    $(window).bind('unload', function () {
        SSH = null;
        Filter = null;
        Validator = null;
        //Searcher = null;
        QuickView = null;
        window.HotelList = HotelList = null;
        window.Hotel = Hotel = null;
    });

});
