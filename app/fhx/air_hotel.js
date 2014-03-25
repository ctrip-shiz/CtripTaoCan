document.domain = location.host.replace('vacations.', '');

var parentWin = window.parent;

var QuickView = {

    $container: parentWin.$('#divQuickView'),
    $iframe: parentWin.$('#divQuickViewIframe'),

    show: function () {
        var self = this;

        var args = [].slice.call(arguments);
        this.$container.mask();

        this.$iframe[0].src = 
            location.protocol + "//" + location.host.replace('flights', 'vacations') +
            "/DIY/AirRecommendHotel/ARHQuickView.aspx";
        parentWin.readyQuickView = function (win) {
            self._rewrite(win, args);
            win.QuickView.show.apply(win.QuickView, args);
        }
    },
    // rewrite quickview 组件行为以适应iframe方式的显示隐藏
    _rewrite: function (win, args) {
        var self = this;

        win.QuickViewConfig.quickview = FHXConfig.quickview;

        var hotelId = args[2];
        var data = $('#hHotel' + hotelId).value();
        var hData = win.document.createElement('input');
        hData.type = 'hidden';
        hData.id = 'hHotel' + hotelId;
        hData.value = data;
        win.document.body.appendChild(hData);

        win.QuickView.hide = function () {
            self.$container.unmask();
        }
    }
}

var XView = {

    $container: parentWin.$('#divXProduct'),

    _cache: {},

    _bindEvents: function () {
        $('#divHotelList [data-xid]').bind('click', this._showX.bind(this));

        var self = this;
        this.$container.bind('click', function (e) {
           if(e.target.nodeName != 'A' || e.target.className != 'delete') return;
           self.$container.unmask();
        });
    },

    _showX: function (e) {
        var xid = e.target.getAttribute('data-xid');

        var cache = this._cache[xid];
        if(cache){
            this.render(cache);
        }else{
            this.render({name: e.target.innerHTML, loading: true});
            this.getData(xid, e.target.innerHTML);
        }
    },

    init: function () {
        this._bindEvents();
    },

    render: function (data) {
        var html = $.tmpl.render(FHXConfig.tmpls.xdetail, data);
        this.$container.html(html);
        this.$container.mask();
    },

    getData: function (xid, title) {
        var self = this;
        $.ajax(FHXConfig.URL.X_PRODUCTS + "?XProductIDs=" + xid, {
            method: cQuery.AJAX_METHOD_GET,
            onerror: function () { },
            onsuccess: function (xhr, res) {
                if(!res) return;
                var data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
                data.name = title;
                self._cache[xid] = data;
                self.render(data);
            }
        });
    }
}

var AirHotel = {

    $ifr: parentWin.$('#ifrAirHotel'),

    $container: $('#divHotelList'),

    fm: document.getElementById('fm'),

    moreHotel: function () {
        var params = {};
        ['FromID', 'ToID', 'FromPY', 'ToPY'].each(function (item) {
            params[item] = $('#h' + item).value();
        });
        var url = $.tmpl.render(FHXConfig.URL.SINGLE_FLT_HOTEL, params);
        this.postData(url);
    },

    chooseHotel: function (hotelId, ubtCode) {
        var roomId = this.$container.find('[data-hotel="'+hotelId+'"] em[data-room]').attr('data-room');
        $('#hHotelID').value(hotelId);
        $('#hRoomID').value(roomId);

        this.postData(FHXConfig.URL.FREE_COMBINE + '#ctm_ref=' + ubtCode);
    },

    postData: function (url) {
        var randomWinId = 'fhx' + Math.floor(Math.random()*100000);
        window.open(url, randomWinId);
        this.fm.target = randomWinId;
        this.fm.action = url;
        this.fm.submit();
    },

    init: function () {
        var count = this.$container.find('[data-hotel]').length;

        if(!count){
            cQuery.log($('#ErrorMessage').value());
            this.$ifr[0].parentNode.removeChild(this.$ifr[0]);
            return;
        }
        // adjust container height
		var h = 0;
		this.$container.find('[data-hotel]').each(function (item){
			h += item[0].offsetHeight || 150;
		});
		this.$ifr.css('height', (h + 80) + 'px');
    }
}

XView.init();
AirHotel.init();
 
$.mod.load('jmp', '1.0', function () {
    $(document).regMod('jmp', '1.0');
})

