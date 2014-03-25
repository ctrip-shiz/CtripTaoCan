/*
* author:shiz@ctrip.com
* date:2013-12-16
*/
define(function (require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;

    // 度假头部搜索
    require.async('webresource/publicNavTempNew');
    
    require.async('webresource/ssh_startCities');

    // 由于有keywords问题，所以这个函数用于这个页面doPost
    function rankList(target, event) {
        // $('#hActionType').value('');
        var txtKeywords = $('#SearchText');
        if (txtKeywords[0] && SSHConfig.searchType == '0') {
            txtKeywords[0].name = 'keywords';
            txtKeywords[0].value = txtKeywords.value();
        }
        doPost(target, event);
    }
    window.rankList = rankList;

    // 酒店筛选
    var Filter = {

        multiChooseDic: {},

        allHidden: $('#divFilterData').find('input'),

        selectClass: 'cur',

        init: function () {
            var divFilter = $('#ulFilter'), divFilterResult = $('#divFilterResult');

            if (divFilter.length == 0) return;

            require.async('tools/eventdispatcher.js', function (EventDispatcher) {

                new EventDispatcher({
                    ctx: divFilter,
                    func: Filter.selectOption,
                    selector: 'a,input',
                    cmds: [
                    { selector: '[data-filter="more_select"]', func: Filter.openMultiChoose },
                    { selector: '[data-filter="more"]', func: Filter.openBox },
                    { selector: '[data-filter="confirm"]', func: Filter.confirmChoice },
                    { selector: '[data-filter="cancel"]', func: Filter.cancelChoice}//,
                    // {selector: 'input.htl_name',             func: function(){}},
                    // {selector: 'input.htl_but',              func: Filter.filterName}
                ]
                });

                if (divFilterResult.length) {
                    new EventDispatcher({
                        ctx: divFilterResult,
                        func: Filter.cancelResult,
                        level: 2,
                        cmds: [
	                        { selector: '.del_all', func: Filter.clearResults }
	                    ]
                    });
                }
            })

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
            require.async('tools/placeholder.js', function (placeholder) {
                placeholder.init();
            });
            // init carriage return
            var self = this;
            txtHotelName.bind('keyup', function (e) {
                if (e.keyCode == 13)
                    self.filterName(S.next(e.target));
            });
        },
        // 去除url查询参数
        clearQuery: function (url) {
            // url keywords problem
            var txtKeywords = $('#SearchText');
            if (txtKeywords[0] && SSHConfig.searchType == '0') {
                txtKeywords[0].name = 'keywords';
                txtKeywords[0].value = txtKeywords.value();
            }

            var index = url.indexOf('?');
            if (index == -1) return url;
            return url.substring(0, index);
        },
        // 筛选酒店名
        filterName: function (target) {
            var target = S.prev(target);
            if (!target || $(target).value() == '') return;
            Searcher.reset();
            $('#hHotelName').value($('#txtHotelName').value());
            doPost(Filter.clearQuery(window.location.href));
        },
        // 执行筛选
        search: function (keyIndex, target, isClear) {
            var url = Filter.getURL(keyIndex, target, isClear);
            doPost(url);
        },
        // 获取指定条件的post url
        getURL: function (keyIndex, target, isClear) {
            var url = window.location.href;

            url = Filter.clearQuery(url);

            var key = SSHConfig.filter.keys[keyIndex],
            value = $('#h' + key).value(),
            seoKey = SSHConfig.filter.seo[keyIndex],
            rSeoItem = new RegExp(seoKey + '\\d+', 'gi'); //seo value is a number

            // 清空所有
            if (isClear && keyIndex == -1) {
                SSHConfig.filter.seo
                .each(function (seoKey) {
                    var reg = new RegExp("(" + seoKey + "\\d+" + ")+", "gi");
                    url = url.replace(reg, '');
                });
                return url.replace(/\/$/, '');
            }
            // 清空单选
            if (isClear && seoKey) {
                url = url.replace(rSeoItem, '');
                return url.replace(/\/$/, '');
            }
            // 单选
            if (value.split(',').length == 1) {
                if (!target.href || target.href.indexOf('javascript') != -1) {
                    url = url.replace(/#\w+/, '');
                    if (seoKey) { // 多选时只选了一个选项 需要SEO
                        // not contain any seo item
                        if (url == SSHConfig.filter.url || url.indexOf('search') > -1)
                            return SSHConfig.filter.url + "/" + seoKey + value;
                        else // contain other seo items
                            return url + seoKey + value;
                    }
                    return url;
                }
                return Filter.clearQuery(target.href);
            }
            //多选
            url = SSHConfig.filter.url;
            var seo = SSHConfig.filter.seo;
            seo.each(function (seoKey) {
                var reg = new RegExp("(" + seoKey + "\\d+" + ")+", "gi");
                url = url.replace(reg, '');
            });
            url += '/';
            var keys = SSHConfig.filter.keys;
            seo.each(function (seoKey, i) {
                var values = $('#h' + keys[i]).value();
                if (!values) return;
                values = values.split(',');
                url += seoKey + values.join(seoKey);
            });

            return url.replace(/\/$/, '');
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
            if (target.getAttribute('data-filter') == 'more') {
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
        cancelChoice: function (keyIndex, target) {
            var key = SSHConfig.filter.keys[keyIndex];
            // update style
            var li = $(S.parent(target, 'li'));
            li.removeClass('current');
            li.find('div.btn_submit').addClass('hidden');
            // update options
            var items = li.find('span>a');
            items.each(function (item, i) {
                (i == 0 || i == items.length - 1) ? item.removeClass('hidden') : item.removeClass(Filter.selectClass);
            });
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
            Filter.search(keyIndex, target, true);
        },
        // 清除所有条件
        clearResults: function (target) {
            Filter.allHidden.each(function (item, i) {
                item.value('');
            });
            target && Filter.search(-1, target, true);
        },
        // 选择选项
        selectOption: function (keyIndex, value, target, e) {
            var key = SSHConfig.filter.keys[keyIndex];

            var selectClass = Filter.selectClass;

            target = $(target);
            var isMultiChoose = key in Filter.multiChooseDic && Filter.multiChooseDic[key];
            var isChecked = target.hasClass(selectClass);
            var hData = $('#h' + key);

            if (isMultiChoose) {
                // checkbox
                isChecked ? target.removeClass(selectClass) : target.addClass(selectClass);

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
                target.addClass(selectClass);
                hData.value(value);
                Filter.search(keyIndex, target[0]);
            }
        }
    }

    // 价格筛选框输入限制
; (function (exports) {
    exports.Limiter = {
        //Backspace, Tab, End,  Home,  <-,  ->,  Delete, 
        _fnKeys: [8, 9, 35, 36, 37, 39, 46],

        'int': function (keyCode) {
            return (this._fnKeys.indexOf(keyCode) == -1) &&
                (keyCode < 48 || keyCode > 57) &&
                (keyCode < 96 || keyCode > 105);
        },

        'intfix': function (e) {
            e.target.value = e.target.value.replace(/[^0-9]+/g, '');
        },

        /*
        * @function reg the input limit on the specified target
        * @param {cDom} target
        * @param {string} limit type ( int\float\eng\chs )
        */
        reg: function (target, type) {
            var _this = this, isFix = false;
            target.bind('keydown', function (e) {
                var keyCode = e.keyCode;

                // fix input-method problem
                if (keyCode == 229 && cQuery.browser.isIE) {
                    if (isFix) return;

                    target.bind('keyup', _this[type + 'fix']);
                    target.bind('blur', _this[type + 'fix']);
                    isFix = true;

                    return;
                }

                _this[type](keyCode) && e.preventDefault();
            });
        }
    };
})(Mod);

    var PriceFilter = {

        $container: $('#divPriceFilter'),

        $txtPrices: [],

        init: function () {
            var self = this;

            this.$container
            .find('input[type="text"]')
            .each(function (txt, i) {
                Mod.Limiter.reg(txt, 'int');
                self.$txtPrices.push(txt);
            });

            this.$container
            .find('input[type="button"]')
            .bind('click', this.submit.bind(this));

            // init placeholder
            require.async('tools/placeholder.js', function (placeholder) {
                placeholder.init();
            });
        },

        submit: function () {
            if (this.validate())
                rankList(window.location.href);
        },

        validate: function () {
            var values = [];
            this.$txtPrices.each(function (txt, i) {
                if (txt.value() == '')
                    txt.value(0);
                values.push(+txt.value());
            });

            if (values[0] == values[1]) {
                if (values[0] == 0) {
                    this.$txtPrices[0].value("");
                    this.$txtPrices[1].value("");
                    return true;
                }
                return false;
            }

            if (values[0] > values[1]) {
                this.$txtPrices[0].value(values[1]);
                this.$txtPrices[1].value(values[0]);
                return true;
            }
            return true;

        }
    }

    Filter.init();
    PriceFilter.init();

    // init city select
    (function () {
        var $citySelect = $('#CitySelect>dt');
        if (!$citySelect.length) return;

        var $content, inited = false;
        $('#CitySelect').bind('click', function () {
            if ($content) S.show($content);

            if (inited) return;
            setTimeout(init, 200);
        });

        function init() {
            $content = $('#CitySelect>dd');

            $content.bind('click', function (e) {
                if (e.target.nodeName != 'A') return;

                $citySelect.html('<i></i>' + e.target.innerHTML + '<span>站</span><b></b>');
                $citySelect.parentNode().removeClass('city_spread');
                S.hide($content);

                e.preventDefault();
            });

            inited = true;
        }
    })();

});
