/*
 * author:shiz@ctrip.com
 * date:2013-07-10
 */
define(function (require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;
    require.async('mods');

    var FHX = {

        _initElements: function () {
            // 初始化很抱歉（SEO）	
            var nodata = $('#noData')[0];
            nodata.innerHTML = FHXConfig.texts.noData;
        },

        init: function () {
            FlightManager.init();
            Filter.init();
            FHX._initElements();
            // submit loading
            Mod.initSubmitLoading();
            // register jmp module
            Mod.regJMP();
        }
    }

    var FlightManager = {

        init: function () {
            var self = this;
            $(document).bind('click', function (e) {
                if(Sizzle.matchesSelector(e.target, 'span[data-role="moredetail"], a[data-role="moreseat"]')){
                    self.toggleDisplay(e);
                }
                if(Sizzle.matchesSelector(e.target, 'input[data-role="selectFlight"]')){
                    self.selectFlight(e);
                }
            });
            $('#btnReSelect')
                .bind('click', this.reselectFrom);
        },

        toggleDisplay: function (e) {
            var target = e.target, tr = S.parent(target, 'tr');
            if (target.nodeName == 'B')
                target = target.parentNode;

            var isMoreDetail = e.target.getAttribute('data-role') == 'moredetail';
            var rowClass, displayed;

            if(isMoreDetail){
                rowClass = 'append_detail2';
                displayed = tr.getAttribute('data-showdetail');
                if(displayed){
                    tr.setAttribute('data-showdetail', '');
                    $(target).parentNode().removeClass('cur');
                }else{
                    tr.setAttribute('data-showdetail', 'T');
                    $(target).parentNode().addClass('cur')
                }           
            }else{
                rowClass = 'append_detail1';
                displayed = tr.getAttribute('data-showseats');
                if(displayed){
                    tr.setAttribute('data-showseats', '');
                    $(S.parent(target, 'tr')).removeClass('downtd');
                }else{
                    tr.setAttribute('data-showseats', 'T');
                    $(S.parent(target, 'tr')).addClass('downtd');
                }
            }
           
			var next = S.next(tr, '.'+rowClass);
            while (next) {
                displayed ? S.hide(next) : S.show(next);
                next = S.next(next, '.'+rowClass);
            }
            target.innerHTML = displayed ? 
                target.innerHTML.replace('down', 'up') : 
                target.innerHTML.replace('up', 'down') ;
        },

        selectFlight: function (e) {
            var way = e.target.getAttribute('data-way'),
                elems = e.target.getAttribute('data-elems'),
                price = e.target.getAttribute('data-price'),
                xresulttime = e.target.getAttribute('data-xresulttime');
            $('#hTripRound').value(way);
            $('#hFlightElems').value(elems);
            $('#hFlightPrice').value(price);
            $('#hXResultTime').value(xresulttime);
            Filter.clear();
            S.postForm( way == "RoundFirst" ? FHXConfig.URL.SELECT_FLIGHT : FHXConfig.URL.ORDER_CONFIRM);
        },

        reselectFrom: function (e) {
            $('#hTripRound').value('RoundFirst');
            $('#hFlightElems').value('');
            Filter.clear();
            doPost(e.target, e);
        }
    }

    var Filter = {

        data: {},

        list: $('#fltList'),

        allHidden: $('#divFilterData').find('input'),

        periods: [[6, 12], [12, 13], [13, 18], [18, 24]], // 起飞时间段

        _addHiddenClass: function () {
            var styleStr = "";
            Filter.allHidden.each(function (item, i) {
                styleStr += ('.hidden' + i + '{display:none} ');
            });
            // add seat hidden class
            styleStr += '.hiddenSeat {display:none}';

            // create style
            var style = document.createElement('style');
            style.type = 'text/css';
            if (style.styleSheet) {
                style.styleSheet.cssText = styleStr;
            } else {
                style.appendChild(document.createTextNode(styleStr));
            }

            document.getElementsByTagName('head')[0].appendChild(style);
        },

        _initFlightData: function () {
            var viewDic = ["00","01","10","11"];
            var viewport, stopstatus = [false, false];

            this.list.find('div.flt_li').each(function (flt, i) {
                var viewData = 00;
                flt.find('tr').each(function (tr) {
                    var fltData = tr[0].getAttribute('data-flt')
                    if(!fltData) return;
                    viewData = viewData | parseInt(fltData, 2);
                });

                var attr = flt.attr('data-flt').split('|');
                attr[5] = viewDic[viewData];
                flt.attr('data-flt', attr.join('|'));

                if(i == 0) viewport = viewData;
                viewport = viewport | viewData; //二进制逻辑操作处理多选项交并问题

                attr[4] == 0 && (stopstatus[0] = true);
                attr[4] == 1 && (stopstatus[1] = true);
            });

            switch(viewport){
                case 0: S.hide($('#divFilter2')); break;
                case 1: S.hide($('#divFilter2 label:first')); break;
                case 2: S.hide($('#divFilter2 label:last')); break;
            }
            if(stopstatus[0] ^ stopstatus[1]) 
                $('#divFilter1 li:last').addClass('hidden');
        },

        init: function () {
            if ($('#divFilter1').length == 0) return;

            this._initFlightData();

            // prepare class for filter 
            Filter._addHiddenClass();

            // init data and list display
            Filter.allHidden.each(function (input, i) {
                if (!input.value()) return;
                Filter.data[i] = input.value().split(',');
                Filter.filter(i, Filter.data[i]);
            });

            require.async(
                ['tools/eventemitter.js', 'tools/eventdispatcher.js'],
                function(EventEmitter, EventDispatcher){
                    Mod.EventEmitter = EventEmitter;
                    Mod.EventDispatcher = EventDispatcher;

                    // init departtime multiselect
                    var count = Filter.allHidden.length - 1;

                    new EventDispatcher({ ctx: $('#divFilter1'), func: Filter.selectOption, selector: 'a,input' });
                    new EventDispatcher({ ctx: $('#divFilter2'), func: Filter.selectOption, selector: 'a,input' });
                });
        },

        selectOption: function (keyIndex, value, target) {
            var values = Filter.data[keyIndex] || [];
            if (value === '') {
                values = [];
                $(target).parentNode().find('input').each(function (item, i) {
                    item[0].checked = false;
                });
            } else {
                var index = values.indexOf(value);
                target.checked ?
				values.push(value) :
				values.splice(index, 1);
            }
            Filter.allHidden[keyIndex].value = values.join(',');
            Filter.data[keyIndex] = values;
            Filter.filter(keyIndex, values);
        },

        filter: function (keyIndex, values) {
            var allVisible = !values.length || values[0] === '';
            var hiddenClass = 'hidden' + keyIndex;

            if (!allVisible) {
                if (keyIndex == 5) {// 仅查看
                    values = values.map(function (item, i) {
                        return parseInt(item, 2);
                    });
                }
                if (keyIndex == 1) {// 起飞时间
                    values = values.map(function (item, i) {
                        return Filter.periods[item];
                    });
                }
            }

            Filter.list.find('.flt_li').each(function (item, i) {
                // 航空公司、起飞时段、计划机型、起飞机场、是否中转、仅查看
                var data = item[0].getAttribute('data-flt').split('|')[keyIndex];

                if (allVisible)
                    return item.removeClass(hiddenClass);

                if (keyIndex == 5) // 仅查看 
                    return ((values[0] & parseInt(data, 2)) || (values[1] & parseInt(data, 2))) ?
					   item.removeClass(hiddenClass) : item.addClass(hiddenClass);

                if (keyIndex == 1) { // 起飞时间
                    for (var i = 0, len = values.length; i < len; i++) {
                        if (values[i][0] <= data && data < values[i][1])
                            return item.removeClass(hiddenClass);
                    }
                    return item.addClass(hiddenClass);
                }

                (values.indexOf(data) != -1) ? item.removeClass(hiddenClass) : item.addClass(hiddenClass);
            });
            
            if(keyIndex == 5) // 舱位筛选
                Filter.filterSeats(values, allVisible);

            Filter.displayNoData();
        },

        filterSeats: function (values, allVisible) {
            
            Filter.list.find('.flt_li').each(function (item, i) {
                var needChange = false, index = -1;
                var rows = item.find('>table>tbody>tr:not(.append_detail2)');
                // show/hide seats
                rows.each(function (tr, j) {
                    var data = tr[0].getAttribute('data-flt');
                    var visible = allVisible || (values[0] & parseInt(data, 2)) || (values[1] & parseInt(data, 2));

                    if(j == 0){
                        // change the first seat
                        if(!visible){
                            var row = item.find('tr:first')[0];
                            needChange = true;
                            if(row._changed) return;
                            row._backup = [
                                row.cells[4].innerHTML,
                                row.cells[5].innerHTML,
                                row.cells[6].innerHTML,
                                row.cells[7].innerHTML,
                                row.cells[8].innerHTML
                            ];
                        }
                    }else{
                        if(index == -1 && visible) index = j;
                        // show/hide the economic seat
                        visible ? tr.removeClass('hiddenSeat') : tr.addClass('hiddenSeat');    
                    }
                });
                // seat change
                var first = item.find('tr:first')[0];
                if(!first._changed && needChange && index != -1){ // 舱位置顶
                    var other = rows[index];
                    [4,5,6,7,8].each(function (i) {
                        first.cells[i].innerHTML = other.cells[i].innerHTML;
                    });

                    $(other).addClass('hiddenSeat'); // the hidden class is used by function toggleDispaly

                    first._changeIndex = index;
                    first._changed = true;
                }
                if(!needChange && first._changed){ // 舱位恢复
                    var other = rows[first._changeIndex];
                    [4,5,6,7,8].each(function (i, j) {
                        first.cells[i].innerHTML = first._backup[j];
                    });
                    $(other).removeClass('hiddenSeat');
                    delete first._changeIndex;
                    first._changed = false;
                }
                // show/hide more seat button
                var count = 0;
                rows.each(function (tr) {
                    if(tr.hasClass('hiddenSeat')) count++;
                });
                if(first._backup){
                    // 换舱显示下更多按钮处理
                    if(count <= rows.length - 2){
                        start = first._backup[0].indexOf('<');
                        if(first.cells[4].innerHTML.indexOf('<') != -1 || start == -1) return;
                        first.cells[4].innerHTML += first._backup[0].substring(start);
                    }
                }else{
                    if(count >= rows.length - 2){
                        start = first.cells[4].innerHTML.indexOf('<');
                        if(start == -1) return;
                        first._origin = first.cells[4].innerHTML;
                        first.cells[4].innerHTML = first.cells[4].innerHTML.substring(0, start);
                    }else{
                        first._origin && (first.cells[4].innerHTML = first._origin);
                    }
                }

            });
        },

        displayNoData: function () {
            var showCount = 0;
            Filter.list.find('.flt_li').each(function (item, i) {
                if (showCount > 0) return;
                item[0].className.indexOf('hidden') == -1 && showCount++;
            });
            showCount == 0 ? S.show($('#noData')) : S.hide($('#noData'));
        },

        clear: function () {
            Filter.allHidden.each(function(item, i){
                item.value('');
            });
        }
    }

    /*
    * @class multi select
    * @constructor
    * @param {cDom} the option list
    * @param {dom} the trigger element
    * @param {dom} the hidden keeping the data
    */
    // FHX.MultiSelect = function (list, trigger, hData) {

    //     Mod.EventEmitter.extend(this);

    //     this.list = list;
    //     this.trigger = trigger;
    //     this.hData = hData;

    //     // option key-value data mapping
    //     this._mapping = { "-1": this.trigger.innerHTML.match(/[\u0100-\uffff]+/)[0] };
    //     this._values = undefined;

    //     this._init();
    // }
    // FHX.MultiSelect.prototype = {
    //     constructor: FHX.MultiSelect,

    //     _init: function () {
    //         var optValues = this._values = this.hData.value ? this.hData.value.split(',') : [];
    //         var list = this.list.find('label');

    //         var mapping = {}, text = [];

    //         list.each(function (item, i) {
    //             var chk = item.find('input')[0];

    //             mapping[chk.value] = item[0].innerHTML.match(/[\u0100-\uffff]+/)[0];

    //             if (optValues.indexOf(chk.value) != -1) {
    //                 chk.checked = true;
    //                 text.push(mapping[chk.value]);
    //             } else {
    //                 chk.checked = false;
    //             }
    //         });

    //         this._mapping = $.extend(this._mapping, mapping);

    //         if (text.length)
    //             this.trigger.innerHTML = text.join(',') + '<b class="up"></b> <b class="down"></b>';

    //         this.bindSelectEvent();
    //         this.bindDisplayEvents();
    //     },

    //     select: function (target) {
    //         // 当target为字符串时选中value=target的那一项
    //         // to do

    //         var v = target.value, isSelected = target.checked;
    //         var index = this._values.indexOf(v);

    //         isSelected ?
    // 			this._values.push(v) :
    // 			this._values.splice(index, 1);

    //         var text = [], map = this._mapping;
    //         for (var k in map) {
    //             if (!map.hasOwnProperty(k)) continue;
    //             if (this._values.indexOf(k) != -1)
    //                 text.push(map[k]);
    //         }
    //         if (this._values.length == 0)
    //             text.push(map["-1"]); // 补上全天

    //         this.hData.value = this._values.join(',');
    //         this.trigger.innerHTML = text.join(',') + '<b class="up"></b> <b class="down"></b>';

    //         this.emit('select', this._values, v, !isSelected, target);
    //     },
    //     bindSelectEvent: function () {
    //         var self = this;
    //         this.list.bind('click', function (e) {
    //             var target = e.target;
    //             if (target.nodeName != 'INPUT') //target.nodeName != 'LABEL' && 
    //                 return;
    //             self.select(target);
    //         })
    //     },
    //     bindDisplayEvents: function () {
    //         var self = this;
    //         var hideTimer = undefined;

    //         var showList = function () {
    //             clearTimeout(hideTimer);
    //             self.list.parentNode().addClass('fliter_sub_nav');
    //             self.list.removeClass('hidden');
    //         }
    //         var hideList = function () {
    //             hideTimer = setTimeout(function () {
    //                 self.list.addClass('hidden');
    //                 self.list.parentNode().removeClass('fliter_sub_nav');
    //             }, 60);
    //         }
    //         this.list.bind('mouseover', showList);
    //         this.list.bind('mouseout', hideList);
    //         $(this.trigger).bind('mouseover', showList);
    //         $(this.trigger).bind('mouseout', hideList);
    //     }
    // };

    FHX.init();

});