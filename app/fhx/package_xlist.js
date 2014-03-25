/*
 * author:shiz@ctrip.com
 * date:2013-07-10
 */

define(function(require, exports, module) {


var S = require('common').S;
var Mod = require('common').Mod;
require.async('mods');

var FHX = {

    confirmFixer: undefined,//固定的填写信息按钮栏

	init: function () {
        FHX._bindToggleMoreDetail();
        // submit loading
        Mod.initSubmitLoading();
        // register jmp module
        Mod.regJMP();

        if(FHXConfig.noData) return;

        PriceChanger.init();
        XController.init();
        fm.autocomplete = 'off';
        
        if(cQuery.browser.isIE6) return;
        // fix confirm div
        require.async(
            'tools/fixposition.js',
            function (mod) {
                FHX.confirmFixer = 
                    mod.fixPosition(
                        $("#divDataConfirm"), 
                        {fixedClass: "data_count_fix"}
                    );
            });
	},

    _bindToggleMoreDetail: function () {
        function toggleMoreDetail (e) {
            var target = e.target,
                tr = S.parent(target, 'tr'),
                displayed = tr.getAttribute('data-show'),
                next = S.next(tr);

            if(target.nodeName == 'B')
                target = target.parentNode;

            if(displayed){
                $(target).parentNode().removeClass('cur');
                target.innerHTML = target.innerHTML.replace('down', 'up');
                while(next && next.className == 'append_detail2'){
                    S.hide(next);
                    next = S.next(next);
                }
                tr.setAttribute('data-show','');
            }else{
                $(target).parentNode().addClass('cur');
                target.innerHTML = target.innerHTML.replace('up', 'down');
                while(next && next.className == 'append_detail2 hidden'){
                    S.show(next);
                    next = S.next(next);
                }
                tr.setAttribute('data-show','T');
            }
        }
        $('span[data-role="moredetail"]').each(function(item, i){
            item.bind('click', toggleMoreDetail);
        });
    }
}

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
		cells[5].innerHTML = cells[5].innerHTML.replace(this._rPrice, total.ctrip || '--');

        if(total.ctrip){
            if(cells[5].innerHTML.toLowerCase().indexOf('dfn') != -1)
                return total;
            cells[5].innerHTML = cells[5].innerHTML.replace(this._rPrice, function (p) {
                return '<dfn>&yen;</dfn>' + p;
            });
        }else{
            cells[5].innerHTML = cells[5].innerHTML.replace(/<dfn>[^<]+<\/dfn>/i, '');
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
        this._bindEvents();
        this._startup();
	},

    _startup: function () {
        var self = this;
        // prepare data
        this.hData.value.split(',').each(function(data, i){
            var data = data.split('|');
            self.data[data[0]] = data;
        });

        var data = FHXConfig.XData;
        var defaultProducts = [];
        // 勾选已选
        var xlist = $('#hXProducts').value();
        for(var id in data){
            if(data[id].count > 0 && xlist.indexOf(id)==-1)
                defaultProducts.push(id);
        }
        for(var id in FHXConfig.XData){
            var xdata = FHXConfig.XData[id];
            if(xdata.count > 0){
                var totalprice = xdata.count * xdata.prices[xdata.date].ctrip;
                PriceChanger.changePackagePrice([totalprice, 0]);
            }
        }
        this.divXList.find('tr').each(function (tr, i) {
            var id = tr.attr('data-xid');
            if(defaultProducts.indexOf(id) != -1){
                var select = S.firstChild(tr[0].cells[4]);
                select.value = data[id].count;
                S.trigger(select, 'change');
            } 
        });
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
                if(!res) return;
                var data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
                data.name = FHXConfig.XData[xid].name;
                data.visa = FHXConfig.XData[xid].visa;
                var html = $.tmpl.render(FHXConfig.tmpls.xdetail[1], data);
                if(!html) return;
                var div = $(trDetail).find('div.details_bd')[0];
                div.innerHTML = html;
            }
        });
    },

    toggleDetail: function (tr, trDetail) {
        trDetail = $(trDetail);
        if(trDetail.hasClass('hidden')){
            trDetail.removeClass('hidden');
        }else{
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
		tr.cells[6].innerHTML = '<b class="icon_selected"></b>';
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

        tr.cells[6].innerHTML = '';
        var selectCount = S.firstChild(tr.cells[4]);
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
        var selectCount = S.firstChild(tr.cells[4]);
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
 
        FHX.confirmFixer && FHX.confirmFixer.updateUpper();
    },

    toggleMore: function (target) {
        var tb = S.parent(target, 'table');

        target.innerHTML = target.innerHTML.indexOf('up') > 0 ?
            (FHXConfig.texts.more[1] + '<b class="down">') :
            (FHXConfig.texts.more[0] + '<b class="up">');

        var count = 0;
        var rows = $(tb).find('tr').each(function(row, i){
            if(count < 3){
                !row.hasClass('append_detail1') && count++;
                return;   
            }
            row.hasClass('hidden') ? row.removeClass('hidden') : row.addClass('hidden');
            row.hasClass('append_detail1') && row.addClass('hidden');

        });
        rows[rows.length - 1].className = '';
    }
}

FHX.init();

/*
Post:
    "id|count|date|type|name|totalctrip|totalmarket|choosedate|unit,..."
Format:
    {
        '1231': {
            name: '木府门票',
            type: '门票',
            date: '2013-06-28',
            count: 2,
            choosedate: '1',
            unit: '份',
            prices: {
                '2013-06-28': {
                    market: 98,
                    ctrip: 52,
                    quantity: {
                        default:3,
                        max: 3, 
                        min: 1, 
                        step: 1
                    } 
                }
            },
            visa:{
                type: '签证类型',
                acceptdate: '携程受理时间',
                entertimes: '入境次数',
                stopdays: '可停留天数',
                validdate: '签证有效期'
            }
        }
    }
*/
});
