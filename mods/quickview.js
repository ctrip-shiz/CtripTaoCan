define(function (require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;

    // traffic map
    ; (function (exports) {
        var data, tmpl, limit,
        cache = {},
        elNoData,
        container,
        ajaxCallback;

        /*
        * @function 
        * @param {object} raw data from server
        eg. {"0":{"start":"机场","name":"杭州萧山国际机场","distance":"44.2 公里","detail":"乘出租车约77分钟，车费约157元"},"1":{"start":"市中心","name":"武林广场","distance":"11 公里","detail":"乘出租车约40分钟，车费约33元"},"2":{"start":"火车站","name":"杭州城站火车站","distance":"12.5 公里","detail":"乘出租车约55分钟，车费约38元"}}
        * @return {array} 数据分布顺序：机场、市中心、火车站
        */
        function processData(rawData) {
            var ret = [], data = {};
            for (var i in rawData) {
                if (rawData[i].start in data)
                    data[rawData[i].start].push(rawData[i]);
                else
                    data[rawData[i].start] = [rawData[i]];
            }
            var isFull = false;
            for (var j = 0; j < QuickViewConfig.texts.traffic.length && !isFull; j++) {
                var k = QuickViewConfig.texts.traffic[j];
                if (data[k] && !isFull) {
                    for (var i = 0, len = data[k].length; i < len; i++) {
                        ret.push(data[k][i]);
                        if (ret.length >= limit) {
                            isFull = true;
                            break;
                        }
                    };
                }
            }
            return ret;
        }

        function clearList() {
            var el = S.next(elNoData);
            while (el) {
                el.parentNode.removeChild(el);
                el = S.next(elNoData);
            }
        }

        function render(data) {
            clearList();

            var html = cQuery.tmpl.render(tmpl, data);
            var div = document.createElement('div');
            div.innerHTML = html;
            S.toArray(div.childNodes).each(function (item, i) {
                container[0].appendChild(item);
            });

            S.hide(elNoData);
        }

        function onSuccess(data, hotelId, noProcess) {
            if (data && !noProcess)
                data = processData(data);
            if (!data || data.length == 0) {
                data = null;
                clearList();
                S.show(elNoData);
            } else {
                cache[hotelId] = data;
                render(data);
            }

            ajaxCallback && ajaxCallback(data, hotelId);
        }

        function getData(hotelId, cityId, count) {
            limit = count || 3;
            if (hotelId in cache) {
                onSuccess(cache[hotelId], hotelId, true);
                return;
            }
            cache[hotelId] = null;
            var addr = QuickViewConfig.URL.HOTEL_TRAFFIC + '?hotel=' + hotelId + '&CityID=' + cityId;
            $.ajax(addr, {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, res) {
                    res = res.replace(/\r|\n|\t/g, '');
                    data = cQuery.parseJSON(res);
                    onSuccess(data, hotelId);
                },
                onerror: function () {
                    S.show(elNoData);
                    ajaxCallback && ajaxCallback(null, hotelId);
                }
            });
        }

        // Does it need a loading mask? 

        exports.regTMap = function (target, template, callback) {
            container = target;
            elNoData = target.find('#elNoTraffic');
            tmpl = template;
            ajaxCallback = callback;
            return {
                getData: getData
            }
        }
    })(Mod);
    // hotel comment
    ; (function (exports) {
        var data, tmpl, limit,
        cache = {},
        elNoData,
        container,
        ajaxCallback;

        function clearList() {
            var el = S.next(elNoData);
            while (el) {
                el.parentNode.removeChild(el);
                el = S.next(elNoData);
            }
        }

        function render(data) {
            clearList();

            var html = cQuery.tmpl.render(tmpl, data);
            var div = document.createElement('div');
            div.innerHTML = html;
            S.toArray(div.childNodes).each(function (item, i) {
                container[0].appendChild(item);
            });

            S.hide(elNoData);
        }

        function onSuccess(data, hotelId, masterHotelId) {
            if (!data || cQuery.isEmptyObject(data) || data.data.length == 0) {
                data = null;
                clearList();
                S.show(elNoData);
            } else {
                cache[hotelId] = data;
                // 剔除limit之外的数据
                render(data.data.slice(0, limit));
            }

            ajaxCallback && ajaxCallback(data, hotelId);
        }

        // data example: {data: [{"UserCode":"288001****","CommentContent":"好～～～～～～"},{"UserCode":"_M1588877****","CommentContent":"很舒服的一个酒店！浓浓的美式田园风！位置很好，在半山腰上，空气清新！环境优美！"},{"UserCode":"E0565****","CommentContent":"推荐，还会带家人朋友过来"}]}
        function getData(hotelId, masterHotelId, count) {
            limit = count || 3;
            if (hotelId in cache) {
                onSuccess(cache[hotelId], hotelId, masterHotelId);
                return;
            }
            cache[hotelId] = null;
            var addr = QuickViewConfig.URL.HOTEL_COMMENT + '?hotel=' + hotelId + '&MasterHotelId=' + masterHotelId;
            $.ajax(addr, {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, res) {
                    res = res.replace(/\r|\n|\t/g, '');
                    data = cQuery.parseJSON(res);
                    onSuccess(data, hotelId, masterHotelId);
                },
                onerror: function () {
                    S.show(elNoData);
                    ajaxCallback && ajaxCallback(null, hotelId);
                }
            });
        }
        // Does it need a loading mask? 

        exports.regHtlComment = function (target, template, callback) {
            container = target;
            elNoData = target.find('#elNoComment');
            tmpl = template;
            ajaxCallback = callback;
            return {
                getData: getData
            }
        }
    })(Mod);
    // quick view of hotel
    var QuickView = {

        divQuickView: undefined,

        _emap: undefined,
        _tmap: undefined,
        _comment: undefined,

        _markers: {},
        _inited: false,

        _showTitle: function (hotelId, index) {
            var data = $('#hHotel' + (index ? index : hotelId)).value();
            data = cQuery.parseJSON(data);
            this.divViewTitle[0].innerHTML = $.tmpl.render(QuickViewConfig.tmpls.head, data);
        },

        _createHotelMarker: function (position, htlName) {
            var opts = { position: {}, offset: {}, icon: '' };

            var pos = position.split('|');

            opts.position = {
                lon: pos[0],
                lat: pos[1]
            }

            opts.offset = {
                x: -10,
                y: -30
            }

            if (!cQuery.browser.isIE6) {
                opts.content = S.format(
                '<div><img src="$1" style="position:absolute"/><img src="$2" style="position:absolute;top:5px;"/>\
                    <div class="searchresult_popname box_shadow" style="left:30px;"><span>$3</span></div></div>',
                "http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
                'http://pic.c-ctrip.com/hotels081118/marker_shadow.png',
                htlName);
            } else {
                opts.content = S.format(
                '<div><img src="$1" style="position:absolute"/>\
                    <div class="searchresult_popname box_shadow" style="left:30px;"><span>$2</span></div></div>',
                "http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
                htlName);
            }

            var marker = this._emap.createMarker(opts);

            return marker;
        },

        _showMap: function (position, hotelId, htlName) {
            var divMap = this.divQuickView.find('.iframe_box');

            var self = this;
            function mapReady() {
                var marker = self._markers[hotelId] || self._createHotelMarker(position, htlName);
                self._markers[hotelId] = marker;
                self._emap.show(marker);
                Mod.hideLoading(divMap);
            }

            Mod.showLoading(divMap);

            if (this._emap) {
                this._emap.reCreate(); // will trigger mapReady
                this._emap.on('mapReady', mapReady);
            } else {
                require.async('tools/emap.js', function (mod) {
                    Mod.regEMap = mod.regEMap;
                    self._emap = Mod.regEMap(divMap, { iframeUrl: QuickViewConfig.URL.MAP_IFRAME_DETAIL });
                    self._emap.on('mapReady', mapReady);
                });
            }
        },

        _showComment: function (hotelId, masterHotelId) {
            if (!this._comment) {
                var ul = this.ulComment;
                Mod.showLoading(ul);
                this._comment = Mod.regHtlComment(ul, QuickViewConfig.tmpls.htlcomment, function () {
                    Mod.hideLoading(ul);
                });
            }
            this._comment.getData(hotelId, masterHotelId, 6);
        },

        _showTraffic: function (hotelId, cityId) {
            if (!this._tmap) {
                var ul = this.ulTraffic;
                Mod.showLoading(ul);
                this._tmap = Mod.regTMap(ul, QuickViewConfig.tmpls.traffic, function () {
                    Mod.hideLoading(ul);
                });
            }
            this._tmap.getData(hotelId, cityId);
        },

        _renderPics: function (htmlList) {
            var self = this;

            var tmplNoPicLi = '<li class="no_pic_small"></li> ';
            this.ulSmallPic[0].innerHTML = htmlList;

            var count = this.ulSmallPic.find('li').length;
            for (var i = 0, len = 9 - count; i < len; i++) {
                htmlList += tmplNoPicLi;
            }
            this.ulSmallPic[0].innerHTML = htmlList;

            if (!this.ulSmallPic.isBondEvent) {
                function onPicClick(e) {
                    var target = e.target;
                    if (e.target.nodeName == 'LI') {
                        target = e.target.getElementsByTagName('img');
                        if (!target || target.length == 0)
                            return;
                        target = target[0];
                    }
                    if (target.nodeName != 'IMG') return;

                    self.divLargePic[0].getElementsByTagName('img')[0].src =
                    target.getAttribute('bigsrc');
                }

                this.ulSmallPic.bind('click', onPicClick);
                this.ulSmallPic.notBindEvent = true;
            }

            S.trigger(this.ulSmallPic.find('li:first'), 'click');

            S.show(this.divLargePic);
            S.show(this.ulSmallPic);
            S.hide(this.divNoLargePic);
            Mod.hideLoading(self.divNoLargePic);
        },

        _showPics: function (hotelId, cityId) {

            var self = this;

            S.hide(this.divLargePic);
            S.hide(this.ulSmallPic);
            S.show(this.divNoLargePic);
            Mod.showLoading(this.divNoLargePic);

            var txtCheckInDate = $('#txtCheckInDate'),
            txtCheckOutDate = $('#txtCheckOutDate');

            var params = [
                'hotel=' + hotelId,
                'tocity=' + cityId,
                'CheckInDate=' + QuickViewConfig.quickview[cityId].checkin,
                'CheckOutDate=' + QuickViewConfig.quickview[cityId].checkout
            ]
            $.ajax(QuickViewConfig.URL.HOTEL_PIC + '?' + params.join('&'), {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, res) {
                    if (res)
                        self._renderPics(res);
                    else
                        Mod.hideLoading(self.divNoLargePic);
                },
                onerror: function () {
                    Mod.hideLoading(self.divNoLargePic);
                }
            });
        },

        _initElements: function () {
            this.divQuickView = $('#divQuickView');

            this.divViewTitle = this.divQuickView.find('.searchresult_name');

            this.divNoLargePic = this.divQuickView.find('.no_pic_large');
            this.divLargePic = this.divQuickView.find('.htl_pic_large');
            this.ulSmallPic = this.divQuickView.find('.htl_pic_small');

            this.ulComment = this.divQuickView.find('.user_comment');
            this.ulTraffic = this.divQuickView.find('.htl_symbol');

            this.lnkMapDetail = $('#lnkMapDetail')[0];
        },

        show: function (position, htlName, hotelId, masterHotelId, cityId, index) {
            var self = this;

            if (!this._inited) {
                this._initElements();

                this._inited = true;
            }

            S.show(this.divQuickView);
            this.divQuickView.mask(true, function () {
                S.hide(self.divQuickView);
            });

            this._showTitle(hotelId, index);
            this._showPics(hotelId, cityId);
            this._showMap(position, hotelId, htlName);
            this._showComment(hotelId, masterHotelId);
            this._showTraffic(hotelId, cityId);
        },

        hide: function (e) {
            QuickView.divQuickView.unmask(true);
        }
    }
    window.QuickView = QuickView;

});