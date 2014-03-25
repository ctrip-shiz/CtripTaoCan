/*
* author:shiz@ctrip.com
* date:2012-07-20
*/
$.mod.multiLoad({
    "jmp": "1.0",
    "calendar": "3.0",
    "notice": "1.0",
    "address": "1.0",
    "validate": "1.1",
    "allyes": "1.0"
});

window.fm = document.forms[0];
var charset = cQuery.config("charset");
var releaseNo = $('#_releaseNo_').value();

// mod helper
var Mod = {
    CITY_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/flthotel/packageDomestic_' + charset + '.js?v=' + releaseNo + '.js',
    CITY_POSITION_DATA: 'http://webresource.c-ctrip.com/code/cquery/resource/address/hotel/index/city_position_' + charset + '.js?v=' + releaseNo + '.js',

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
	setCalValue: function (cal, value){
		// I hate arguments validation
		cal[0].value = value;
		
		if(value == ''){
			cal.css('background-image:none');
		}else{
			S.trigger(cal, 'focus');
			S.trigger(cal, 'change');
			S.trigger(cal, 'blur');
		}
	},
	
	/*
	 * @function 
		show loading in target context
	 * @param {DomElement} target context
	 * @param {String} loading message
	 */
	showLoading: function (ctx, msg){
		if(typeof ctx.bind === 'function')
			ctx = ctx[0];
		var h = ctx.clientHeight || ctx.offsetHeight,
			w = ctx.clientWidth || ctx.offsetWidth,
			paddingTop = Math.abs((h - 80) / 2),
			h2 = Math.abs(h - paddingTop);
		if (ctx._loading) { // 
			ctx._loading.style.width = w + 'px';
            ctx._loading.style.height = h + 'px';
			ctx._loading.style.paddingTop = paddingTop + 'px';
			S.show(ctx._loading);
		} else {
            // the fix method using position absolute depends on the container style
            // this method appending the loading div to the container needs childnodes of the container to be hidden
			var tmplLoading = 
				'<div style="width:$1px;padding-top:$2px;height:$3px;text-align:center;background-color:#fff;">\
					<img src="http://pic.c-ctrip.com/common/loading_50.gif" /><br />$4</div>\
				</div>';
			ctx._loading = S.create(S.format(tmplLoading, w, paddingTop, h, msg || FHConfig.texts.loading));
			ctx.appendChild(ctx._loading);
		}
	},
	
	hideLoading: function (ctx){
        if(typeof ctx.bind === 'function')
            ctx = ctx[0];
		ctx._loading && S.hide(ctx._loading);
	}
};

// city position module
; (function (exports) {
    var CITY_POSITION = {}; //位置数据

    var _hotelPosTitle = undefined;
    var _targetAddress = undefined;
    var _isPositionReady = false;

    /*
    * @function 检查指定城市的指定类型（eg:地铁）数据集合是否初始化了
    * @param {string} 城市id
    * @param {string} 指定类型（可选值：zone,location,metro,spot,all）
    */
    function checkExist(cid, key) {
        if (typeof CITY_POSITION[cid] == "undefined") {
            CITY_POSITION[cid] = {};
            CITY_POSITION[cid][key] = [];
        }
        if (typeof CITY_POSITION[cid][key] == "undefined") {
            CITY_POSITION[cid][key] = [];
        }
        return true;
    }
    /*
    * @function 解析原始数据
    * @param {boolean} 是否包含地铁数据（居然有这种需求。。）
    */
    function parseRawData(isMetroIncluded) {
        ['zone', 'location'].each(function (o, i) {
            var rawName = 'CHINA_HOTEL_' + o.toString().toUpperCase() + '_RAW_DATA';
            window[rawName] = window[rawName].replace(/@(\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY) { //@Huhehaote|呼和浩特|103|hhht@
                checkExist(cid, o);
                checkExist(cid, "all");
                CITY_POSITION[cid][o].push({
                    "display": name,
                    "data": [pingYing, name, id, PY, (o == 'zone' ? 'zoneId' : 'locationId')].join("|")
                });
                CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, (o == 'zone' ? 'zoneId' : 'locationId')].join("|"));
                return '';
            });
        });

        if (!isMetroIncluded)
            return;

        CHINA_HOTEL_METRO_RAW_DATA = CHINA_HOTEL_METRO_RAW_DATA.replace(/@(\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY, alias) {
            checkExist(cid, "metro");
            CITY_POSITION[cid]["metro"].push({
                "display": name,
                "data": [pingYing, name, id, PY, "metroId"].join("|")
            });
            CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, "metroId"].join("|"));
            return '';
        });
        CHINA_HOTEL_SPOT_RAW_DATA = CHINA_HOTEL_SPOT_RAW_DATA.replace(/@(\w\d+)\|([1-9]\d*)\|\s*([^\|]+)\|\s*([^\|]*)\|\s*([^@]*)/g, function (_, id, cid, name, pingYing, PY, alias) {
            checkExist(cid, "spot");
            CITY_POSITION[cid]["spot"].push({
                "display": name,
                "data": [pingYing, name, id, PY, "landMarkId", alias].join("|")
            });
            CITY_POSITION[cid]["all"].push([pingYing, name, id, PY, "landMarkId", alias].join("|"));
            return '';
        });
    }
    /*
    * @function 设置 targetAddress 的数据源
    * @param {string} 城市id
    */
    function setSource(cityId) {
        var sourcesuggestion = {};

        var data = CITY_POSITION[cityId];

        if (typeof data == "undefined") {
            _targetAddress.set("source", {
                suggestion: null,
                data: "@@"
            });
            return;
        }

        for (var key in _hotelPosTitle) {
            var t = _hotelPosTitle[key];
            if (typeof key === "string") {
                sourcesuggestion[t] = [];
                if (typeof data[key] !== "undefined") {
                    sourcesuggestion[t] = data[key];
                } else {
                    delete sourcesuggestion[t];
                }

            }
        }
        _targetAddress.set("source", {
            suggestion: sourcesuggestion,
            data: "@" + data["all"].join("@") + "@"
        });
    }

    function reg(target, opt) {
        var which = opt.which,
		name = opt.name,
		relate = opt.relate,
		hCity = opt.hCity,
		isMetroIncluded = opt.isMetroIncluded;

        _hotelPosTitle = FHConfig.addressMessage[which]["titles"];

        _targetAddress = target.regMod('address', '1.0', {
            name: name,
            isFocusNext: false,
            isAutoCorrect: true,
            relate: relate,
            source: {
                data: "@@"
            },
            template: {
                suggestion: '\
						<div class="c_address_box">\
							<div class="c_address_hd">${message.suggestion}</div>\
							<div class="c_address_bd">\
								<ol class="c_address_ol">\
									{{enum(key) data}}\
										<li><span>${key}</span></li>\
									{{/enum}}\
								</ol>\
								{{enum(key,arr) data}}\
									<ul class="c_address_ul layoutfix">\
										{{each arr}}\
											<li><a data="${data}" title="${display}" href="javascript:void(0);">${display}</a></li>\
										{{/each}}\
									</ul>\
								{{/enum}}\
							</div>\
						</div>\
					',
                suggestionStyle: '\
						.c_address_box { background-color: #fff; font-size: 12px; width: 505px; }\
						.c_address_box a { text-decoration: none; }\
						.c_address_hd { height: 24px; border-color: #2C7ECF; border-style: solid; border-width: 1px 1px 0; background-color: #67A1E2; color:#CEE3FC; line-height: 24px; padding-left: 10px; }\
						.c_address_bd { border-color: #999999; border-style: solid; border-width: 0 1px 1px; overflow: hidden; padding:10px; }\
						.c_address_ol { margin:0; padding:0 0 24px; border-bottom: 2px solid #CCC; }\
						.c_address_ol li { color: #16B; cursor: pointer; float: left; height: 24px; line-height: 24px; list-style-type: none; text-align: center; margin-top:1px;}\
						.c_address_ol li span { padding:0 8px; white-space:nowrap; display:block; }\
						.c_address_ol li .hot_selected { background:url(http://pic.ctrip.com/hotelcommon/hotel_region.gif) no-repeat 4px bottom; padding-bottom: 4px;}\
						.c_address_ul { width: 100%; margin:0; padding: 4px 0 0; }\
						.c_address_ul li { float: left; height: 24px; overflow: hidden; width: 120px; }\
						.c_address_ul li a { display: block; height: 22px; width: 106px; padding:0 5px; border: 1px solid #FFF; color: #000; line-height: 22px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;}\
						.c_address_ul li a:hover { background-color: #E8F4FF; border: 1px solid #ACCCEF; text-decoration: none; }\
					'
            },
            message: {
                suggestion: FHConfig.addressMessage[which]["suggestion"]
            },
            offset: 5
        });

        // bind focus show
        target.bind("focus", function () {
            var cityId = hCity.value();

            if (cityId == "")
                return false;

            if (!_isPositionReady) {
                var param = {
                    type: 'text/javascript', //类型
                    async: true, //是否异步加载
                    onload: function (response) { //加载成功的回调函数
                        parseRawData(isMetroIncluded);
                        setSource(cityId);
                    }
                }
                cQuery.loader.js(Mod.CITY_POSITION_DATA, param);
                _isPositionReady = true;
            } else {
                setSource(cityId);
            }
        }, {
            priority: 20
        });

        // bind clear event
        target.bind("change", function () {
            if (target.value().trim() == "") {
                for (var k in relate) {
                    relate[k].value("");
                }
            }
        });
    }

    exports.regPosition = function (target, name, which, hCity, isMetroIncluded, relate) {
        reg(target, {
            name: name,
            which: which,
            hCity: hCity,
            isMetroIncluded: isMetroIncluded,
            relate: relate
        });
    }

})(Mod);
// electronic map
; (function (exports, IFRAME_URL) {
    var DEFAULT_ZOOM_LEVEL = 15;

    var Map = function (container, opts) {
        if (typeof container.bind === 'function')
            container = container[0];
        opts = opts || {};
            
        this.ctx = container;
        this.map = undefined;
        this._mapWin = undefined;
        this._mapIfm = undefined;
        this._autoZoom = opts.autoZoom;
        
        this._lastZoomLevel = DEFAULT_ZOOM_LEVEL;
        this._lastCenter = undefined;

        this._events = { 'mapReady': [] };

        if (opts.noIframe) {
            this._mapWin = window;
            this._createMap();
        } else {
            this._createMapIframe();
        }

    }

    Map.prototype = {
        constructor: Map,

        show: function (overlays, center) {
            this.map.clearMap();
            this._renderOverlays(overlays, center);
            // auto zoom after the overlays are added
            if(this._autoZoom){
                this.map.setFitView();
                this._lastZoomLevel = this.map.getZoom();
                this._lastCenter = center || overlays[0].getPosition();
            }
        },

        // return back to the status of the lastest calling of show function
        resetDisplay: function (){
            this.map.setZoom(this._lastZoomLevel);
            this._lastCenter && this.center(this._lastCenter);
        },

        center: function (point, isTransitional) {
            if (point.constructor != this._mapWin.AMap.LngLat)
                point = new this._mapWin.AMap.LngLat(point.lon, point.lat);
                
            if(isTransitional){
                this.map.panTo(point);
            }else{
                this.map.setCenter(point);
            }
        },

        createMarker: function (opts) {
            var AMap = this._mapWin.AMap;			
            opts.position = opts.position && new AMap.LngLat(opts.position.lon, opts.position.lat);
            opts.offset = opts.offset && {x: opts.offset.x, y: opts.offset.y};
            return new AMap.Marker(opts);// not support for complex icon
        },

        bindEventToMarker: function (mkr, evtName, func) {
            this._mapWin.AMap.event.addListener(mkr, evtName, func);
        },

        on: function (evtName, func) {
            this._events[evtName].push(func);
        },

        _renderOverlays: function (overlays, center) {
            if ($.type(overlays) != 'array')
                overlays = [overlays];

            var self = this;

            overlays.each(function (overlay, i) {
                if (!overlay) return;
                overlay.setMap(self.map);
            });

            centerPoint = center ?
                new this._mapWin.AMap.LngLat(center.lon, center.lat) :
                overlays[0].getPosition();
            this.center(centerPoint);
        },

        reCreate: function (container) {
            // 由于cQuery mask函数原理，map地图需要重建
            this._events['mapReady'] = [];
            $(this.ctx).find('iframe').remove();
            this._createMapIframe();
        },

        _createMapIframe: function () {

            var ctx = this.ctx,
                self = this,
                h = S.height(ctx),
                w = S.width(ctx);
            var ifm = document.createElement('iframe');
            ifm.width = w;
            ifm.height = h;
            ifm.frameBorder = 'none';
            ifm.style.border = 'none';
            ifm.style.overflow = 'hidden';
            ifm.src = IFRAME_URL;

            ctx.appendChild(ifm);

            var win = (ifm.window || ifm.contentWindow);
            this._mapWin = win;
            this._mapIfm = ifm;

            if (cQuery.browser.isIE6) {
                win.attachEvent('onload', function () {
                    self._createMap();
                });
            } else {
                win.onload = function () {
                    self._createMap();
                }
            }

        },

        _createMap: function () {
            var win = this._mapWin,
                mapEl = win.document.getElementById('map');

            mapEl.style.width = S.width(this.ctx) + 'px';
            mapEl.style.height = $(this.ctx).css('height');

            var AMap = win.AMap;
            var position = new AMap.LngLat(116.404,39.915);
            var map = new AMap.Map("map",{
                    center: position, 
                    level: DEFAULT_ZOOM_LEVEL,
                    resizeEnable: true
                });
            
            var self = this;
            map.plugin(["AMap.ToolBar","AMap.OverView","AMap.Scale"],function(){  
                //加载工具条  
                var tool = new AMap.ToolBar();  
                map.addControl(tool);  
                  
                //加载鹰眼  
                var view = new AMap.OverView();  
                map.addControl(view);  
                  
                //加载比例尺  
                var scale = new AMap.Scale();  
                map.addControl(scale);  
                
                // remove copyright
                var cr = $(mapEl).find('img.amap-logo');
                cr[0].style.display = 'none';
                cr = $(mapEl).find('div.amap-copyright');
                cr[0].style.display = 'none';
                
                self._events['mapReady'].each(function (func, i) {
                    func.call(self);
                });
            });

            this.map = map;
        }
    }

    exports.regEMap = function (container, opts) {
        container.EMap = new Map(container, opts);
        return container.EMap;
    }
})(Mod, FHConfig.URL.MAP_IFRAME_DETAIL);
// traffic map
;(function (exports) {
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
    function processData (rawData) {
        var ret = [], data = {};
        for(var i in rawData){
            if(rawData[i].start in data)
                data[rawData[i].start].push(rawData[i]);
            else
                data[rawData[i].start] = [rawData[i]];
        }
        var isFull = false;
        for(var j = 0; j < FHConfig.texts.traffic.length && !isFull; j++){
            var k = FHConfig.texts.traffic[j];
            if(data[k] && !isFull){
                for (var i = 0, len = data[k].length; i < len; i++) {
                    ret.push(data[k][i]);
                    if(ret.length >= limit){
                        isFull = true;
                        break;
                    }
                };
            }
        }
        return ret;
    }

    function clearList () {
        var el = S.next(elNoData);
        while(el){
            el.parentNode.removeChild(el);
            el = S.next(elNoData);
        }
    }

    function render (data) {
        clearList();

        var html = cQuery.tmpl.render(tmpl, data);
        var div = document.createElement('div');
        div.innerHTML = html;
        S.toArray(div.childNodes).each(function(item, i){
            container[0].appendChild(item);
        });

        S.hide(elNoData);
    }

    function onSuccess (data, hotelId, noProcess) {
        if(data && !noProcess)
            data = processData(data);
        if(!data || data.length == 0){
            data = null;
            clearList();
            S.show(elNoData);
        }else{
            cache[hotelId] = data;
            render(data);
        }

        ajaxCallback && ajaxCallback(data, hotelId);
    }

    function getData (hotelId, cityId, count) {
        limit = count || 3;
        if(hotelId in cache){
            onSuccess(cache[hotelId], hotelId, true);
            return;
        }
        cache[hotelId] = null;
        var addr = FHConfig.URL.HOTEL_TRAFFIC + '?hotel=' + hotelId + '&CityID=' + cityId;
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
;(function (exports) {
    var data, tmpl, limit,
        cache = {},
        elNoData,
        container,
        ajaxCallback;

    function clearList () {
        var el = S.next(elNoData);
        while(el){
            el.parentNode.removeChild(el);
            el = S.next(elNoData);
        }
    }

    function render (data) {
        clearList();

        var html = cQuery.tmpl.render(tmpl, data);
        var div = document.createElement('div');
        div.innerHTML = html;
        S.toArray(div.childNodes).each(function(item, i){
            container[0].appendChild(item);
        });

        S.hide(elNoData);
    }

    function onSuccess (data, hotelId, masterHotelId) {
        if(!data || cQuery.isEmptyObject(data) || data.data.length == 0){
            data = null;
            clearList();
            S.show(elNoData);
        }else{
            cache[hotelId] = data;
            // 剔除limit之外的数据
            render(data.data.slice(0,limit));
        }

        ajaxCallback && ajaxCallback(data, hotelId);
    }

	// data example: {data: [{"UserCode":"288001****","CommentContent":"好～～～～～～"},{"UserCode":"_M1588877****","CommentContent":"很舒服的一个酒店！浓浓的美式田园风！位置很好，在半山腰上，空气清新！环境优美！"},{"UserCode":"E0565****","CommentContent":"推荐，还会带家人朋友过来"}]}
    function getData (hotelId, masterHotelId, count) {
        limit = count || 3;
        if(hotelId in cache){
            onSuccess(cache[hotelId], hotelId, masterHotelId);
            return;
        }
        cache[hotelId] = null;
        var addr = FHConfig.URL.HOTEL_COMMENT + '?hotel=' + hotelId + '&MasterHotelId=' + masterHotelId;
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
// event dispatcher 
;(function (exports){
	var EventDispatcher = function (ctx, defaultFunc, opts) {
		var defaults = {
			id   : '',
			tag  : 'A',
			style: '',
			event: 'click',
			level: 1
		}

		opts = opts ? $.extend(defaults, opts) : defaults;
		opts.defaultFunc = defaultFunc;

		var self = this;
		ctx.bind(opts.event, function (e) {
			self.dispatchEvent(e, opts);
			e.preventDefault(); // Should it be here? Maybe in handle function.
		});
	}

	EventDispatcher.prototype.dispatchEvent = function (e, opts) {
		var target = e.target;

		target = this.matchNode(target, opts);
		if(!target) return;

		var params = this.getParams(e, target);

		var func = this.matchFunc(target, opts.cmds) || opts.defaultFunc;

		func.apply(target, params);
	}

	EventDispatcher.prototype.getParams = function (e, target) {
		var params = target.getAttribute('data-params');
		params = params ? $.parseJSON('[' + params + ']') : [];
		params.push(e, target);
		return params;
	}

	EventDispatcher.prototype.matchNode = function (element, opts) {
		var target = element, isMatch = false, i = -1;

		opts.level = typeof opts.level === 'number' && opts.level > 0 ? opts.level : 0;

		while(i++ <= opts.level){
			if(opts.tag && target.nodeName != opts.tag){
				target = target.parentNode;
				continue;
			}
			
			if(opts.style && target.className.indexOf(opts.style) == -1){
				target = target.parentNode;
				continue;
			}

			if(opts.id && target.id != opts.id){
				target = target.parentNode;
				continue;	
			}

			isMatch = true;
		}

		if(opts.level == 0)
			return isMatch ? element : null;

		return isMatch ? target : null;
	}

	EventDispatcher.prototype.matchFunc = function (element, cmds) {
		for (var i = 0, len = cmds.length; i < len; i++) {
			if(this.matchNode(element, cmds[i])){
				return cmds[i].func;
			}
		};

	}

	Mod.EventDispatcher = EventDispatcher;
})(Mod);
// inline script
;(function (exports){
	exports.InlineScript = {
		_getMethod: function (target) {
			var jsMethod = target.getAttribute('data-method');
			if (!jsMethod)
				return undefined;

			var method = jsMethod.split('.'), ctx = window;

			for (var i = 0, len = method.length - 1; i < len; i++) {
				ctx = ctx[method[i]];
			}
			return { ctx: ctx, func: ctx[method[len]] };
		},
		_getParams: function (target) {
			var jsParams = target.getAttribute('data-params');
			if (!jsParams)
				return undefined;

			try {
				var params = cQuery.parseJSON('[' + jsParams + ']');
				return params
			} catch (e) {
				return undefined;
			}

		},
		_exec: function (target, e) {
			var method = this._getMethod(target);
			if (method) {
				var params = this._getParams(target) || [];
				params.push(target, e);
				method.func.apply(method.ctx, params);
			}
		},
		/*
		 * @function 
			init inline script mod
		 * @param {dom} the context where the inline scripts are handled 
		 * @param {string} bound event name
		 */
		init: function (ctx, evtName) {
			ctx = ctx || document;
			evtName = evtName || 'click';
			if(typeof ctx.bind !== 'function')
				ctx = $(ctx);
				
			var _this = this;
			ctx.bind(evtName, function (e) {
				var target = e.target;

				// test that the target is an anchor or input
				// for most of time, the inline script is written on an anchor or input
				// and the event target may be a tag in the target anchor,
				// here I just search up once for the nested element
				if (target.nodeName != 'A' && target.nodeName != 'INPUT') {
					target = target.parentNode;
					if (!target || target.nodeName != 'A')
						return true;
				}

				_this._exec(target, e);
			});
		}
	};
})(Mod);

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
    * @param {date} date
    * @param {date} date
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

    /**
    *@function to post data to specified url
    *@param { string | object  | null} the url or the element or null(it will post back)
    *@param { object } the event
    */
    postForm: function (foo, event) {
        if (event) {
            var evt = S.fix(event);
            evt.preventDefault();
            evt.stopPropagation();
        }

        fm.target = '_self';

        var url;
        if (typeof foo === "string")
            url = foo;
        else {
            if (!foo || (!foo.href && !foo.getAttribute('href')))
                url = fm.action;
            else {
                url = foo.href || foo.getAttribute('href');
                fm.target = foo.target || '_self';
            }
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

    // create element with html
    create: function (html) {
        // if the tmpEl is cached, 
        // the created element will be removed 
        // when the function is called and the element is not appended to the dom 
        var _tmpEl = document.createElement('div');
        _tmpEl.innerHTML = html.trim(); // fix TextNode bug
        return _tmpEl.firstChild;
    },

    // get the value of the input with notice mod
    noticeVal: function (el) {
        if (typeof el.bind === 'function')
            el = el[0];
        return el.value.trim() == '' || el.value == el.getAttribute('_cqnotice') ? '' : el.value.trim();
    },
    
	// get element height
	height: function (el) {
		if (typeof el.css !== 'function')
			el = $(el);
		var height = parseInt(el.css('height'));
		isNaN(height) && (height = el[0].offsetHeight);
		return height;
	},
	// get element width
	width: function (el) {
		if (typeof el.css !== 'function')
			el = $(el);
		var width = parseInt(el.css('width'));
		isNaN(width) && (width = el[0].offsetWidth);
		return width;
	}
};

// 回发函数
function doPostBack(foo, event) {
    $('#divLoading').removeClass('hidden').mask();
    if (cQuery.browser.isIE) {
        setTimeout(function () {
            $('#divLoading').find('p')[0].style.backgroundImage = 'url(http://pic.c-ctrip.com/common/loading.gif)';
        }, 20);
    }
    S.postForm(foo, event)
}

function doPost(target, event, url){
	var key = target.getAttribute('data-key'),
		val = target.getAttribute('data-value');
	key && $('#h' + key).value(val);
	doPostBack(url ? url : target, event);
}

// 排序函数 -写死-
function rankList(){
	var args = S.toArray(arguments);
	["Sort","SortType"].each(function(item, i){
		$('#h'+item).value(args[i+1] || "");
	});
	doPostBack(window.location.href, args[0]);
}

// main
(function (exports){

// 搜索类型 0-往返 1-单程 2-自由组合
var SEARCH_TYPE = {
	ROUND: 0,
	ONEWAY: 1,
	FREE_COMBINE: 2
}

// namespace flt hotel
var FH = {
    _searchType: SEARCH_TYPE.ROUND,

    _bookHotelId: undefined, // 预订的酒店id
	
	isPageSelect: $('#hSelectHotel').length, // 是否是选择酒店页
	
	isIntl: $('#tabRound').length == 0 && !$('#hSelectHotel').length, //是否是海外搜索列表

    // 初始化某些页面元素以备使用
    _initElements: function () {
        $('#divLoading').addClass('hidden');
    },
    // 用户原声
    _initUserVoice: function () {
        $.mod.load('sideBar', '2.0', function (){
			var sidebar = $(document).regMod('sideBar', '2.0', {
				url: {
					feedBackURL: 'http://accounts.ctrip.com/MyCtrip/Community/CommunityAdvice.aspx?productType=12'
				},
				HTML: '<div class="side_fixed" id="sidebar"> <a class="to_top" title="${backTop}" href="javascript:;" id="gotop2"> </a> <a target="_blank" class="c_sidebar" href="${feedBackURL}" title="${feedBack}">${feedBack}</a></div>'
			});
		});
    },

    _initWayTab: function () {
        // tab switch
        var tabRound = $('#tabRound'),
			tabOneWay = $('#tabOneWay'),
			tabTheWay = $('#tabTheWay'),
			curTab = tabRound;

        if (tabRound.length == 0)
            return;
			
        tabRound.bind('click', function () {
            curTab.removeClass('current');
            tabRound.addClass('current');

            Searcher.switchDisplay(false);

            curTab = tabRound;
            FH._searchType = SEARCH_TYPE.ROUND;
        });
        tabOneWay.bind('click', function () {
            curTab.removeClass('current');
            tabOneWay.addClass('current');

            Searcher.switchDisplay(true);

            curTab = tabOneWay;
            FH._searchType = SEARCH_TYPE.ONEWAY;
        });
        tabTheWay.bind('click', function () {
            FH._searchType = SEARCH_TYPE.FREE_COMBINE;
            fm.action = FHConfig.URL.FLTHOTEL_DEFAULT;
            fm.submit();
            return false;
        });

        // init the selected tab
        // test the url to get the tabIndex
        var url = window.location.href;
        if (url.indexOf('oneway') > -1) {
            S.trigger(tabOneWay, 'click');
        }
    },
	
	_initHotelMap: function (){
        // 修改自酒店搜索页 Legacy code - START  @fltHotel
		var _tmpNode = S.create('<div class="hidden"></div>');
        document.body.appendChild(_tmpNode);
		
        var MadCat = function (fn, cfg) {
            this.events = {};
            fn && fn.call(this, cfg)
        };
		$.extend(MadCat.prototype, {
            set: function () { },
            get: function () {
                return null
            },
            evt: function (key, fn) {
                this.events[key] = fn
            },
            init: function () { }
        });

        /**
        * Area Map ( 修改了显示逻辑 for using cQuery mask  @fltHotel )
        * @module
        */
        window.AMap = new MadCat(function (C) {
            var el,
				cur,
				curCity,
				pop_el,
				divAMap;
            var cityId,
				cityPY;
            var hash = {},
				cityHash = {};
            var popTmpl = '<b class="${cls}" style="left: ${left}px;"></b><a class="ico_delete2" href="javascript:;" onclick="AMap.hidePop()"></a><strong>${name}</strong><p>${desc}</p><div class="searchresult_mapjump_bom"></div>';
            var mapTmpl = '<area shape="poly" onclick="AMap.showPop(${id}, true)" coords="${coords}" id="zone_${id}" href="javascript:;"/>';
            this.init = function (city) {
                if (!el) {
                    el = $('#amap');
                    pop_el = $('#divAMapJump')[0],
						divAMap = $('#divAMap')[0],
						cityId = $('#A_city')[0],
						cityPY = $('#A_city_py')[0];
                }
                curCity = city || cityId.getAttribute('_defaultValue');
                if (cityHash[curCity]) {
                    divAMap.innerHTML = '';
                    Mod.showLoading(S.lastChild(el));
                    this.parse(cityHash[curCity]);
                } else {
                    Mod.showLoading(S.lastChild(el));
                    divAMap.innerHTML = '';
                    cQuery.loader.js(FHConfig.URL.CITY_ZONE + '?city=' + curCity);
                }
            };
            this.showPop = function (id, f, city) {
                cur = id;
                if (this.inited && !city && (!f || curCity == city)) {
                    S.show(el);
                    el.mask();
                    this.setPop()
                } else {
                    this.init(city);
                }
                var a = arguments.callee.caller.arguments[0];
                S.fix(a).preventDefault()
            };
            this.hidePop = function () {
                S.hide(pop_el)
            };
            this.parse = function (data) {
                cityHash[curCity] = data;
                var res = ['<img style="-webkit-user-select:none;-moz-user-select:none;" src="', data.map_image, '" usemap="#m_hotmap" /><map id="m_hotmap" name="m_hotmap">'];
                var last = S.lastChild(el);
                var d = data.data;
                if (!d) {
                    return;
                }
                for (var i = 0, l = d.length; i < l; i++) {
                    var item = d[i];
                    hash[item.id] = item;
                    res.push(cQuery.tmpl.render(mapTmpl, item))
                }
                res.push('</map>');
                Mod.hideLoading(last);
                divAMap.innerHTML = res.join('');
                setTimeout(function () {
                    S.show(el);
                    el.mask();
                }, 50)
                setTimeout(this.setPop, 100);
                this.inited = true
            };
            this.setPop = function () {
                var curZone = hash[cur];
                if (!curZone) {
                    S.hide(pop_el);
                    return;
                }
                if (!hash[cur].coords)
                    return;
                var coords = hash[cur].coords.split(',');
                var odd = [],
					even = [];
                for (var i = 0, l = coords.length; i < l; i++) {
                    i % 2 ? even.push(coords[i]) : odd.push(coords[i])
                }
                var x1 = Math.min.apply(null, odd),
					x2 = Math.max.apply(null, odd),
					y1 = Math.min.apply(null, even),
					y2 = Math.max.apply(null, even);
                var x = x1 + (x2 - x1) / 2,
					y = y1 + (y2 - y1) / 2;
                var cls = 'tri_b',
					left = 50;
                var st = S.lastChild(el).scrollTop;
                if ((y - st) < 150) {
                    cls = 'tri_t';
                    y += 20
                } else {
                    y -= 165
                }
                if (x > 366) {
                    x -= 272;
                    left = 272
                } else {
                    x -= 50
                }
                if (x < 10) {
                    left = 20;
                    x += 30
                }
                if (x > 373) {
                    left = 302;
                    x -= 30
                }
                pop_el.innerHTML = cQuery.tmpl.render(popTmpl, $.extend(curZone, {
                    left: left,
                    cls: cls
                }));
                pop_el.style.left = x + 'px';
                pop_el.style.top = y + 'px';
                S.show(pop_el)
            };
            this.click = function (id) {
                var fm = document.forms[0];
                if (curCity != cityId.getAttribute('_defaultValue')) {
                    fm.action = S.format(C.ajaxAddress.linkZone, cityPY.value, cityId.value, id);
                } else {
                    fm.action = S.format(C.ajaxAddress.linkZone, cityPY.getAttribute('_defaultValue'), cityId.getAttribute('_defaultValue'), id);
                }
                if (fm.__VIEWSTATE)
                    fm.__VIEWSTATE.name = "NOVIEWSTATE";
                fm.target = "_self";
                fm.submit();
            }
            // 补充的函数（ adapt to the cQuery mask ）
            this.unmask = function () {
                if (el) {
                    el.unmask();
                    S.hide(el);
                }
            }
        });

        // 根据机酒项目要求进行了相应修改  @fltHotel
        window.HotelRoom = new MadCat(function () {

            this.hideDetails = function (obj) {
                Hotel.hideDetails(obj);
            };

            this.onNameClick = function (obj) {
                var tr = obj.parentNode.parentNode;
                Hotel.toggleDetails(tr);
            };

        });
        // 修改自酒店搜索页 Legacy code - END
	},

    _initBookLogin: function () {
        window.bookHotel = function (hotelId, type) {
            FH._bookHotelId = hotelId;
            return __SSO_booking('', type);
        }
		window.__SSO_submit = function (a, t) {
            var queryStr =
				['HotelID=' + FH._bookHotelId,
				'RoomID=' + HotelList.hotels[FH._bookHotelId].selectedRoomId]
			.join('&');

            fm.action = FHConfig.URL.BOOK_FLTHOTEL + '?' + queryStr;
            fm.submit();
        }
    },

    _initFlightSelect: function () {
        var fltSelectBtns = $('#divHotelList table.tb_hotel_room a.flt_hotel_btn3');

        if (fltSelectBtns.length == 0)
            return; // 与酒店选择页共享

        function selectFlight(e) {
			// 恢复表单
			Searcher.reset();

            // 保存下滚动条位置以便下次恢复
            FH.saveScrollPos();

            var target = e.target;
            var hotelId = S.parent(target, 'li').getAttribute('data-hotel');

            var hHotelID = $('#hHotelID'), hRoomID = $('#hRoomID');
            hHotelID.value(hotelId);
			hRoomID.value(HotelList.hotels[hotelId].selectedRoomId);

            var params = ['byWay=' + target.getAttribute('data-ByWay')];

            var returnUrl = target.getAttribute('data-ReturnUrl'),
			hReturnUrl = S.create(S.format('<input name="ReturnUrl" type="hidden" value="$1"/>', returnUrl));
            target.parentNode.appendChild(hReturnUrl);

            var url = (target.getAttribute('data-ByWay').toLowerCase() == 'oneway' ? FHConfig.URL.SELECT_ONEWAY_FLIGHT : FHConfig.URL.SELECT_ROUND_FLIGHT)
				+ '?' + params.join('&');
            doPostBack(url);

            e.preventDefault();
        }
        fltSelectBtns.each(function (el) {
            el.bind('click', selectFlight);
        });
    },

    _initNewbieGuide: function () {
        if($('#divNotFound').length > 0)
            return; // not show guide when not found hotels

        var isGuided = cQuery.cookie.get('NewbieGuide');
        if(isGuided) return;

        var divGuide = $('#divGuide');

        // 房型名字长度处理，以解决更多房型对上位置
        var RoomNameChanger = {
            firstStrong: $('table.tb_hotel_room:first').find('div.room_type_box strong')[0],
            originalText: '',
            change: function () {
                this.originalText = this.firstStrong.innerHTML;
                this.firstStrong.innerHTML = this.firstStrong.innerHTML.substring(0, 5);
            },
            recover: function () {
                this.firstStrong.innerHTML = this.originalText;
            }
        }

        function show () {
            S.show(divGuide);
            divGuide.mask();
            RoomNameChanger.change();

            var pos = $('#divHotelList').offset();
            divGuide.css({left: (+pos.left + 9) + 'px', top: (+pos.top - 79) + 'px'});

            divGuide.find('a').bind('click', function (e) {
                RoomNameChanger.recover();
                hide();
                cQuery.cookie.set('NewbieGuide', null, 1, {path: '/', expires: 700});
            });
        }

        function hide () {
            divGuide.unmask();
            divGuide.remove();
        }

        show();
    },

    _initAds: function () {
        // head ad
        var banner = $('#banner');
		if(banner.length == 0) return;
        banner.regMod('allyes', '1.0', {
            "mod_allyes_user": banner[0].getAttribute('mod_allyes_user')
        });
    },

    init: function () {
        FH._initElements();
        FH._initWayTab();
        FH._initHotelMap();
        HotelList.init();
        Searcher.init();
		Filter.init();
        FH._initBookLogin();
        FH._initFlightSelect();
        FH._initUserVoice();
		FH._initAds();

        FH.recoverScrollPos();

		Mod.InlineScript.init();
		
        // limit form submit
        S.limitSubmit(fm);
        // register jmp module
        $(document).regMod('jmp', '1.0');
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
        if(dd.value().toDate() > cid.value().toDate())
            return Mod.showTips(cid, FHConfig.validateMessage.hotel[13]);
        if(rd.value() && rd.value().toDate() < cod.value().toDate())
            return Mod.showTips(cod, FHConfig.validateMessage.hotel[14]);
        return true;
    }
}
// 搜索
var Searcher = {

	_isInitMod: false,
	
	_switch: undefined, // 单程往返切换用对象

	validate: function (){
		if(!this._isInitMod) return true;
		
		this.txtDepartCity.address.method('validate');
		this.txtArriveCity.address.method('validate');

        FH._searchType == SEARCH_TYPE.ONEWAY && this.txtReturnDate.value('');
		return Validator.isFlightPass(
					this.txtDepartCity, 
					this.txtArriveCity, 
					this.txtDepartDate, 
					FH._searchType == SEARCH_TYPE.ROUND ? this.txtReturnDate : undefined
				) && Validator.isHotelPass(this.txtArriveCity, this.txtCheckInDate, this.txtCheckOutDate) &&
                     Validator.isDatePass(this.txtDepartDate, this.txtReturnDate, this.txtCheckInDate, this.txtCheckOutDate);

		return true;
	},
	//生成SEO FHConfig.URL
	generateUrl: function (){
		var searchType = ['round', 'oneway', 'theway'][FH._searchType];
		// 根据返回时间再设置一次searchType
		if (this.txtRDate.value() == '')
			searchType = 'oneway';
			
		if(!this.hDCityPY){
			this.hDCity = $("#D_city");
			this.hACity = $("#A_city");
			this.hDCityPY = $('#D_city_py');
			this.hACityPY = $('#A_city_py');
		}

		return S.format(FHConfig.URL.FLTHOTEL_SEARCH, searchType, 
					this.hDCityPY.value(), this.hDCity.value(), this.hACityPY.value(), this.hACity.value())
				.toLowerCase();
	},
	// 恢复用户修改前的状态
	reset: function (){
		if(!this._isInitMod) return;
	
		this.toggleModifyDisplay();
	
		this.txtDepartCity.value(this.txtDepartCity[0].getAttribute('_defaultValue'));
		this.txtArriveCity.value(this.txtArriveCity[0].getAttribute('_defaultValue'));
		
		Mod.setCalValue(this.txtDepartDate, this.txtDepartDate[0].getAttribute('_defaultValue'));
        Mod.setCalValue(this.txtReturnDate, this.txtReturnDate[0].getAttribute('_defaultValue'));
        Mod.setCalValue(this.txtCheckInDate, this.txtCheckInDate[0].getAttribute('_defaultValue'));
		Mod.setCalValue(this.txtCheckOutDate, this.txtCheckOutDate[0].getAttribute('_defaultValue'));
		
		this.selectChildren.value(this.selectChildren[0].getAttribute('_defaultValue'));
		this.selectRoom.value(this.selectRoom[0].getAttribute('_defaultValue'));
		this.selectAdult.value(this.selectAdult[0].getAttribute('_defaultValue'));
		
		// 触发限制
		S.trigger(this.selectAdult, 'change');
	},
    // 切换更改面板显示
    toggleModifyDisplay: function(){
        var divSearchBox = $('#divSearchBox');
        divSearchBox.find('table').each(function (el, i) {
            el.hasClass('hidden') ? el.removeClass('hidden') : el.addClass('hidden');
        });
        divSearchBox.find('div').each(function (el, i) {
            el.hasClass('hidden') ? el.removeClass('hidden') : el.addClass('hidden');
        });
    },
	
	init: function (){
		var txtRDate = this.txtRDate = $('#txtRDate');

        if (txtRDate.length == 0) return;

        // 初始化 下拉列表的选择项
        var selectAdult = this.selectAdult = $('#AdultSelect'),
			selectChildren = this.selectChildren = $('#ChildrenSelect'),
			selectRoom = this.selectRoom = $('#RoomSelect');
        selectAdult.value(selectAdult[0].getAttribute('_defaultValue'));
        selectChildren.value(selectChildren[0].getAttribute('_defaultValue'));
        selectRoom.value(selectRoom[0].getAttribute('_defaultValue'));
		
		var self = this;
        $('#lnkChangeSearch').bind('click', function (e) {
            self.toggleModifyDisplay();
			
			// image would not be loaded when it's hidden
			if (!self._isInitMod){
                self._initMod(selectAdult, selectChildren, selectRoom);
				self._isInitMod = true;
			}

            e.preventDefault();
            return false;
        });
	},
	
	_initMod: function (selectAdult, selectChildren, selectRoom){
		var txtDepartCity = this.txtDepartCity = $('#txtDCity'),
			txtArriveCity = this.txtArriveCity = $('#txtACity'),
			txtDepartDate = this.txtDepartDate = $('#txtDDate'),
			txtReturnDate = this.txtReturnDate = $('#txtRDate'),
			txtCheckInDate = this.txtCheckInDate = $('#txtCheckInDate'),
			txtCheckOutDate = this.txtCheckOutDate = $('#txtCheckOutDate');

        //notice
        Mod.regNotice(txtDepartCity, 'txtDCity', 1);
        Mod.regNotice(txtArriveCity, 'txtACity', 1);
        Mod.regNotice(txtDepartDate, 'txtDDate', 0);
        Mod.regNotice(txtReturnDate, 'txtRDate', 0);
        //address
        this._initAddressMod(txtDepartCity, txtArriveCity);
        //calendar
        this._initDateMod(txtDepartDate, txtReturnDate, txtCheckInDate, txtCheckOutDate);

        //init limit between adult\children\room select lists
        FH.SelectListLimit.regAdultChildBond(
			selectAdult,
			selectChildren);
        FH.SelectListLimit.regAdultRoomBond(
			selectAdult,
			selectRoom);
        // init input limit on txtNight
        // FH._bindNightEvent(txtNight, txtDepartDate, txtReturnDate);

        function submit(e) {
            if (Searcher.validate()) {
                $('#hSearch').value("");
                $('#hScrollPosition').value(0);
                doPostBack(Searcher.generateUrl());
            }
        }

		function cancel(){
			Searcher.reset();
		}
		
        $('#lnkSearch').bind('click', submit);
        $('#lnkCancel').bind('click', cancel);
	},
	
	_initAddressMod: function (txtDepartCity, txtArriveCity){
		var hDCity = this.hDCity = $("#D_city"),
			hACity = this.hACity = $("#A_city"),
			hDCityPY = this.hDCityPY = $('#D_city_py'),
			hACityPY = this.hACityPY = $('#A_city_py'),
			hDCitySZM = $('#D_city_szm'),
			hACitySZM = $('#A_city_szm');
	
		Mod.regAddress(txtDepartCity, 'txtDCity', 'homecity_name', {
            'code': hDCity,
            'szm': hDCitySZM,
            'name_py': hDCityPY
        });
        Mod.regAddress(txtArriveCity, 'txtACity', 'destcity_name', {
            'code': hACity,
            'szm': hACitySZM,
            'name_py': hACityPY
        });
		
		/* 香港 58 Hong Kong, 澳门 59 Macau */
	},
	
	_initDateMod: function (txtDepartDate, txtReturnDate, txtCheckInDate, txtCheckOutDate){
		var strongNight1 = $('#strongNight1'),
			strongNight2 = $('#strongNight2'),
			hNight = $('#hNight');

        function countNights() {
            var d1, d2;
			d1 = txtCheckInDate.value();
			d2 = txtCheckOutDate.value();

            return (d1.isDate() && d2.isDate() && d2.toDate() > d1.toDate()) ?
					S.dateDiff(d1.toDate(), d2.toDate(), 'd') : '--';
        }

        function setNights() {
			var night = countNights();
            strongNight1[0].innerHTML = strongNight2[0].innerHTML = night;
            hNight.value(night);
        }
		
		function onDepartDateChange(input, value, isInit){
			//can not change when user type the date
			txtReturnDate.data('startDate', value);
			txtReturnDate.data('minDate', value);
			
			// min select date
			txtCheckInDate.data('startDate', value);
			txtCheckInDate.data('minDate', value);
			txtCheckOutDate.data('startDate', value);
			txtCheckOutDate.data('minDate', value);
			
			if(!isInit){
				Mod.setCalValue(txtCheckInDate, value);
				Mod.setCalValue(txtCheckOutDate, value.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
				setNights();
				
				if (FH._searchType == SEARCH_TYPE.ROUND)
					setTimeout(function (){ // 给日历组件反应时间
						txtReturnDate[0].focus();
					}, 1);
			}
		}
		
		function onReturnDateChange(input, value, isInit){
			// max select date
			txtCheckInDate.data('maxDate', value);
			txtCheckOutDate.data('maxDate', value);
			
			if(!isInit){
				Mod.setCalValue(txtCheckOutDate, value);
				setNights();
			}
		}
		
        txtDepartDate.regMod('calendar', '3.0', {
            options: {
                minDate: new Date().addDays(1).toStdDateString(),
                showWeek: true,
                container: cQuery.container
            },
            listeners: {
                onChange: onDepartDateChange
            }
        }).method('setWeek', txtDepartDate[0]);
		
        txtReturnDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtDepartDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtDDate"
            },
            listeners: {
                onChange: onReturnDateChange
            }
        }).method('setWeek', txtReturnDate[0]);
		
        txtCheckInDate.regMod('calendar', '3.0', {
			options: {
				minDate: new Date().addDays(1).toStdDateString(),
				showWeek: true,
				container: cQuery.container
			},
			listeners: {
				onChange: function (input, value) {
					//can not change when user type the date
					txtCheckOutDate.data('startDate', value);
					txtCheckOutDate.data('minDate', value);
					txtCheckOutDate[0].focus();

					setNights();
				}
			}
        }).method('setWeek', txtCheckInDate[0]);
		
        txtCheckOutDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtCheckInDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtCheckInDate"
            },
            listeners: {
                onChange: function (input, value) {
                    setNights();
                }
            }
        }).method('setWeek', txtCheckOutDate[0]);
		
		// init limitation and display of the checkin/checkout calendar
		onDepartDateChange(txtDepartDate[0], txtDepartDate[0].value, true);
		if(FH._searchType == SEARCH_TYPE.ROUND)
			onReturnDateChange(txtReturnDate[0], txtReturnDate[0].value, true);
	},
    // 切换单程往返显示
	switchDisplay: function (isOneWay){
		var _switch = {};
        if (!this._switch) {
            _switch.lblRDate = $('#lblRDate'),
			_switch.lblRDateInput = $('#lblRDateInput'),
			_switch.lblRouteType = $('#lblRouteType')[0];
            this._switch = _switch;
        }

        _switch = this._switch;

        if (isOneWay) {
            S.hide(_switch.lblRDate);
            S.hide(_switch.lblRDateInput);
        } else {
            S.show(_switch.lblRDate);
            S.show(_switch.lblRDateInput);
        }
		
		var html = _switch.lblRouteType.innerHTML,
			texts = isOneWay ? FHConfig.texts.routeType : [FHConfig.texts.routeType[1], FHConfig.texts.routeType[0]];
		_switch.lblRouteType.innerHTML = html.replace(texts[0], texts[1]);

        if (this._isInitMod) {
            this._switchDate(isOneWay);
        }
	},
	
	_switchDate: function (isOneWay){
		Mod.setCalValue(this.txtReturnDate, '');
		this.txtReturnDate.notice.method('checkValue');
		// change the minDate and maxDate of the calendar mod
		if(this.txtReturnDate.value() == ''){
			this.txtCheckInDate.data('maxDate', '');
			this.txtCheckOutDate.data('maxDate', '');
		}
	}
}
// 国际搜索
if(FH.isIntl){
	Searcher._initAddressMod = function (txtDepartCity, txtArriveCity){
		var hDCity = this.hDCity = $("#D_city"),
			hACity = this.hACity = $("#A_city"),
			hDCityPY = this.hDCityPY = $('#D_city_py'),
			hACityPY = this.hACityPY = $('#A_city_py'),
			hDCitySZM = this.hDCitySZM = $('#D_city_szm'),
			hACitySZM = this.hACitySZM = $('#A_city_szm');
	
		Mod.regAddress(txtDepartCity, 'txtDCity', 'homecity_name', {
            'code': hDCity,
            'szm': hDCitySZM,
            'name_py': hDCityPY
        });
		
		var rdoAcities = this.rdoAcities = [$('#rdoAcity1'), $('#rdoAcity2')];
		var self = this, cities = FHConfig.intlCities;
		rdoAcities.each(function(rdo, i){
			rdo.bind('click',function (e){
				var selectedACity = cities[i];
				self.hACity.value(selectedACity.id);
				self.hACitySZM.value(selectedACity.szm);
				self.hACityPY.value(selectedACity.py);
			});
			
			if(rdo[0].checked)
				rdo.trigger('click');
		});

	}
	
	Searcher._initDateMod = function (txtDepartDate, txtReturnDate){
		var strongNight1 = $('#strongNight1'),
			strongNight2 = $('#strongNight2'),
			hNight = $('#hNight');

        function countNights() {
            var d1, d2;
			d1 = txtDepartDate.value();
			d2 = txtReturnDate.value();

            return (d1.isDate() && d2.isDate() && d2.toDate() > d1.toDate()) ?
					S.dateDiff(d1.toDate(), d2.toDate(), 'd') : '--';
        }

        function setNights() {
			var night = countNights();
            strongNight1[0].innerHTML = strongNight2[0].innerHTML = night;
            hNight.value(night);
        }
		
		function onDepartDateChange(input, value, isInit){
			//can not change when user type the date
			txtReturnDate.data('startDate', value);
			txtReturnDate.data('minDate', value);
			
			if(!isInit){
				setNights();
				
				if (FH._searchType == SEARCH_TYPE.ROUND)
					setTimeout(function (){ // 给日历组件反应时间
						txtReturnDate[0].focus();
					}, 1);
			}
		}
		
		function onReturnDateChange(input, value, isInit){
			// max select date
			if(!isInit){
				setNights();
			}
		}
		
        txtDepartDate.regMod('calendar', '3.0', {
            options: {
                minDate: new Date().addDays(1).toStdDateString(),
                showWeek: true,
                container: cQuery.container
            },
            listeners: {
                onChange: onDepartDateChange
            }
        }).method('setWeek', txtDepartDate[0]);
		
        txtReturnDate.regMod('calendar', '3.0', {
            options: {
                minDate: txtDepartDate.value() || new Date().addDays(1).toStdDateString(),
                showWeek: true,
                reference: "#txtDDate"
            },
            listeners: {
                onChange: onReturnDateChange
            }
        }).method('setWeek', txtReturnDate[0]);
		
		// init limitation and display of the checkin/checkout calendar
		onDepartDateChange(txtDepartDate[0], txtDepartDate[0].value, true);
		if(FH._searchType == SEARCH_TYPE.ROUND)
			onReturnDateChange(txtReturnDate[0], txtReturnDate[0].value, true);
	}
	
	Searcher.reset = function (){
		if(!this._isInitMod) return;
	
		this.toggleModifyDisplay();
	
		this.txtDepartCity.value(this.txtDepartCity[0].getAttribute('_defaultValue'));
		
		if(this.rdoAcities[0][0].getAttribute('_defaultValue') == this.rdoAcities[0].value())
			this.rdoAcities[0].trigger('click');
		else
			this.rdoAcities[1].trigger('click');
		
		Mod.setCalValue(this.txtDepartDate, this.txtDepartDate[0].getAttribute('_defaultValue'));
        Mod.setCalValue(this.txtReturnDate, this.txtReturnDate[0].getAttribute('_defaultValue'));
		
		this.selectChildren.value(this.selectChildren[0].getAttribute('_defaultValue'));
		this.selectRoom.value(this.selectRoom[0].getAttribute('_defaultValue'));
		this.selectAdult.value(this.selectAdult[0].getAttribute('_defaultValue'));
		
		// 触发限制
		S.trigger(this.selectAdult, 'change');
	}
	
	Searcher.validate = function (){
		if(!this._isInitMod) return true;
		
		this.txtDepartCity.address.method('validate');

		return Validator.isFlightPass(
					this.txtDepartCity, 
					this.rdoAcities[0], 
					this.txtDepartDate, 
					this.txtReturnDate
				);
	}
}

// 酒店
var Hotel = function (hotelId, container){
	this.isShowAll = false; //是否展示了所有房型
	this.selectedRoomId = 0;
	this.hotelId = hotelId; 
	this.isGotAllRooms = false; //是否请求了所有房型
    this.selected = undefined; //选择的按钮

    this.container = container;

    this.roomsHolder = undefined;
    this.tbRoomList = undefined;
	
	this._init(container);
}
// static method
Hotel.toggleDetails = function (tr){
	var rows = [];
	var nxt = S.next(tr);
	while (nxt && /\bunexpanded\b/.test(nxt.className)) {
		nxt = S.next(nxt);
	}
	rows.push(nxt);
	while (nxt && /\bexpanded\b/.test(nxt.className)) {
		nxt = S.next(nxt);
		rows.push(nxt);
	}
	if (tr.isExpanded) {
		if (rows.length > 1) {
			$(tr).removeClass('expandedBaseRoom');
		}
		rows.each(S.hide);
		tr.isExpanded = false;
	} else {
		if (rows.length > 1) {
			$(tr).addClass('expandedBaseRoom');
		}
		rows.each(S.show);
		if (typeof tr.isExpanded == 'undefined' && rows[rows.length - 1]) {
			var imgs = rows[rows.length - 1].getElementsByTagName('a');
			for (var i = 0, l = imgs.length; i < l; i++) {
				var img = imgs[i];
				if (img.className == 'link') {
					img.style.backgroundImage = 'url(' + img.getAttribute('_src') + ')';
				}
			}
		}
		tr.isExpanded = true;
	}
}
Hotel.hideDetails = function (link){
	var tr = link.parentNode.parentNode.parentNode;
	var roomRow = S.prev(tr);
	while (roomRow && /\bexpanded\b|\bunexpanded\b/.test(roomRow.className)) {
		roomRow = S.prev(roomRow);
	}
	Hotel.toggleDetails(roomRow);
}

Hotel.prototype = {
	constructor: Hotel,
    
	_init: function (container){
		this.strongSelectedRoom = container.find('div.room_type_box strong');
		// 右边信息
		this.divPrice = container.find('div.price_cost');

        var params = cQuery.parseJSON(this.strongSelectedRoom[0].getAttribute('data-params'));
        this.selectedRoomId = params.splice(0,1);
        if(!FH.isPageSelect)
            this._changePrices.apply(this, params);

        if(this.hotelId == HotelList.selectedHotel && this.selectedRoomId != HotelList.selectedRoom){
            var self = this;
            setTimeout(function () { // init is not completed yet
                S.trigger(S.next(self.strongSelectedRoom[0]), 'click');
            },10);
        }
	},
    
	_toggleRoomsShow: function (){
		var _this = this;
		var holder = this.roomsHolder;
		if (this.isShowAll) {
            this.tbRoomList.className += ' hidden';
		} else {
            this.tbRoomList.className = this.tbRoomList.className.replace(' hidden','');
		}

		this.isShowAll = !this.isShowAll;
	},
	
	_toggleLinkShowAll: function (link, num){
		var spaceSpan = this.isShowAll ? '<span class="show_unfold"></span>' : '<span class="show_fold"></span>';
		link.innerHTML = this.isShowAll ? FHConfig.texts.room[0] + spaceSpan : FHConfig.texts.room[1] + spaceSpan;		
		if (num) {
			link.innerHTML = this.isShowAll ? FHConfig.texts.room[2].replace("$1", num) + spaceSpan : FHConfig.texts.room[1] + spaceSpan;
		}
        if(link.other){
            link.other.innerHTML = link.innerHTML;
            var otherShowAllDiv = link.isSecond ? $(link.parentNode) : $(link.other.parentNode);
            this.isShowAll ? S.hide(otherShowAllDiv) : S.show(otherShowAllDiv);
        }
	},
		
	_ajaxAllRooms: function (hotelId, query, callback){
		$.ajax(FHConfig.URL.HOTEL_ALL_ROOM + '?hotel=' + hotelId + '&' + (query || ''), {
			method: cQuery.AJAX_METHOD_GET,
			cache: true,
			onerror: function () { },
			onsuccess: function (xhr, res) {
				callback(res);
			}
		});
	},

    _triggerSelect: function () {
        var btn, btnExpr = 'input.base_btn_confirm';
        btn = this.hotelId == HotelList.selectedHotel ?
            $(this.tbRoomList).find(btnExpr + '[data-room='+ HotelList.selectedRoom +']') :
            $(this.tbRoomList).find(btnExpr + ':first');
        S.trigger(btn, 'click');
    },

    _createOtherShowAll: function (link) {
        link = $(link);
        var html = link.ohtml();
        html.replace(/onclick=\"([^\"]+)\"/, function(_, w, i){
            html = w;
        });
        var div = S.create('<div class="float_right"><a class="" onclick="' + html +
         '" href="javascript:;">' + FHConfig.texts.room[1] + '<span class="show_fold"></span></a></div>');

        var otherLink = $(div).find('a');
        otherLink[0].isSecond = true;
        link[0].other = otherLink[0];
        otherLink[0].other = link[0];

        return div;
    },

	_initAllRooms: function (query, link){
        var loading = S.next(link);
		S.hide(link);
		S.show(loading);
		
		var _this = this;
		var spaceSpan = this.isShowAll ? '<span class="show_unfold"></span>' : '<span class="show_fold"></span>',
            otherShowAll = _this._createOtherShowAll(link),
			holder = this.roomsHolder;

		this._ajaxAllRooms(this.hotelId, query, function (res){

            link.innerHTML = FHConfig.texts.room[1] + spaceSpan;
            S.hide(S.next(link));
            S.show(link);

            if(res == '' || res == 'null'){
                link.onclick = null;
                return;
            }
		
			_this.isShowAll = true;
			_this.isGotAllRooms = true;

            _this.tbRoomList = S.create(res);
            holder.appendChild(_this.tbRoomList);
            holder.appendChild(otherShowAll);
            _this._triggerSelect();
		});
	},
	
	showAllRooms: function (link, num, query){
        this.roomsHolder = S.parent(link, 'div.hotel_info_box');
		if (this.isGotAllRooms) {
			this._toggleLinkShowAll(link, num);
			this._toggleRoomsShow();
		} else {
			this._initAllRooms(query, link);
		}
	},
	
	selectRoom: function (roomId, totalprice, discount, saveprice, isRoomRecommended, obj){
		this.selectedRoomId = roomId;
        this._changePrices(totalprice, discount, saveprice, isRoomRecommended);
		this._modifyDiffPrices(obj);
		this._changeSelect(obj);
		this.strongSelectedRoom[0].innerHTML = obj.getAttribute('data-name');
	},
	
    _changePrices: function (totalprice, discount, saveprice, isRoomRecommended){
        var rPrice = /<dfn>[^>]+<\/dfn>(<span[^>]+>)?\d+(<\/span>)?/gi;
        var totalprice = (+totalprice) + HotelList.flightPrice,
            i = 0,
            prices = [
                totalprice + (+saveprice), 
                saveprice, 
                totalprice,
                Math.floor(totalprice / HotelList.numOfPeople)
            ];
        this.divPrice[0].innerHTML = 
            this.divPrice[0].innerHTML.replace(rPrice, function(_, a, b){
                return '<dfn>&yen;<\/dfn>' + (a || '') + prices[i++] + (b || '');
            });
        
        if(cQuery.browser.isIE6){
			if(!this.divPrice._needFixed){
				this.divPrice._needFixed = true;
			}else{
				this.divPrice.css({'right': '-32px'});
				this.divPrice.find('table').css({'width':'200px', 'margin-left': '32px'});
			}
		}

        var widths = ['95px', '5px', 'auto'];
        if(saveprice == 0){
            this.divPrice.find('table').find('tr').each(function(item, i){
                if(i > 1){
                    item.find('td').each(function(td, j){
                        td.css({width: widths[j]});
                    });
                }else{
                    S.hide(item);
                }
            });
        }else{
            this.divPrice.find('table').find('tr').each(function(item, i){
                S.show(item);
            });
        }
    },

	_changeSelect: function (obj) {
		var selected = this.selected;

        if(selected){
    		S.hide(S.prev(selected));
    		S.show(selected);
        }

		var selectSpan = S.prev(obj);
		if (!selectSpan) {
			selectSpan = document.createElement('span');
			selectSpan.className = 'base_txtgray';
            selectSpan.innerHTML = FHConfig.texts.roomSelect;
			S.insertBefore(selectSpan, obj);
		}
		S.show(selectSpan);
		S.hide(obj);

		this.selected = obj;
	},
	
	_rDiffPrice: /([\+\-])|(\d+)/g,
    //差价处理
	_modifyDiffPrices: function (obj) {
		var baseDiffPrice = this._praseDiffPrice(
				$(S.parent(obj, 'tr')).find('span.base_price')[0].innerHTML
			);
		var table = S.parent(obj, 'table');
		var spans = $(table).find('span.base_price');
		var _this = this, price;
		// 比价超有问题
		spans.each(function (el, i) {
			price = _this._praseDiffPrice(el[0].innerHTML);
			price = price - baseDiffPrice;
			el[0].innerHTML = _this._htmlDiffPrice(el[0].innerHTML, price);
		});
	},
	_praseDiffPrice: function (html) {
		var matches = html.match(this._rDiffPrice);
		if(matches.length == 2){
			var ret = matches[0] == '-' ? -1 : 1;
			return ret * (+ matches[1]);
		}else{
			return + matches[0];
		}
	},
	_htmlDiffPrice: function (html, price) {
        var sign = price == 0 ? '' : (price > 0 ? '+' : '-');
		var needAddSign = false;
		html = html.replace(this._rDiffPrice, function (w) {
			needAddSign = w == '0' ? true : false;
			return isNaN(+w) ? sign : Math.abs(price);
		});
		return needAddSign ? html.replace(/<strong><\/strong>/i, '<strong>'+sign+'</strong>') : html;
	}
}
window.Hotel = Hotel;
// 酒店列表
var HotelList = {

	flightPrice: $('#flightPrice').value() - 0,
	flightIsSpecial: !!$('#flightIsSpecial').value(), // 特机

    selectedHotel: $('#hHotelID').value(),
    selectedRoom: $('#hRoomID').value(),

    numOfPeople: $('#AdultSelect').length ? +$('#AdultSelect')[0].getAttribute('_defaultValue') + (+$('#ChildrenSelect')[0].getAttribute('_defaultValue')) : 0,

	hotelSelectInited: false,
	
	hotels: {},
	
	init: function (){
		var self = this;
		$('#divHotelList li').each(function(el, i){
			var hotelId = el[0].getAttribute('data-hotel');
			self.hotels[hotelId] = new Hotel(hotelId, el);
		});
	},
	// 展开更多房型-行内函数
    onShowAllLinkClick:  function (hotelId, obj, num, query) {
        var hotel = HotelList.hotels[hotelId];
        hotel.showAllRooms(obj, num, query); 
    },
	// 酒店房型勾选-行内函数
	onSelectHotelButtonClick: function (hotelId, roomId, totalprice, discount, saveprice, isRoomRecommended, obj){
		HotelList.hotels[hotelId]['selectRoom'](roomId, totalprice, discount, saveprice, !!isRoomRecommended, obj);
	}
}
window.HotelList = HotelList;

if(FH.isIntl){
    HotelList.onSelectHotelButtonClick = function (type, hotelId, roomId, totalprice, discount, saveprice, isRoomRecommended, obj){
		HotelList.hotels[hotelId]['selectRoom'](roomId, totalprice, discount, saveprice, !!isRoomRecommended, obj);
	}
}

if(FH.isPageSelect){
	
    // fix element position
    ;(function (exports){
        exports.fixPosition = function (div, opts) {
            if(typeof div.addClass !== 'function')
                div = $(div);
        
            opts = opts || {};

            var upperBound = div.offset().top,
            scrollHandle;

            if (cQuery.browser.isIE6) {
                scrollHandle = function (e) {
                    // 节流的视觉效果不好
                    var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

                    if (scrollTop > upperBound) {
                        div[0].style.position = 'absolute';
                        div[0].style.bottom = 'auto';
                        div[0].style.top = (scrollTop - upperBound) + 'px';
                    } else if (scrollTop == 0) {
                        div[0].style.position = "static";
                    }
                }
            } else {
                var isFixed = false;
                scrollHandle = function (e) {
                    // 滚条位置
                    var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

                    if (scrollTop > upperBound) {
                        if (isFixed) return;
                        opts.fixedClass ?
                            div.addClass(opts.fixedClass) :
                            div[0].style.position = 'fixed';
                        div[0].style.top = opts.topSpace || '0'; // 上端间隙
                        isFixed = true;
                    } else {
                        opts.fixedClass ?
                            div.removeClass(opts.fixedClass) :
                            div[0].style.position = '';
                        div[0].style.top = '';
                        isFixed = false;
                    }
                }
            }

            $(window).bind('scroll', scrollHandle);
            scrollHandle();
        }
    })(window);
    
    // fix side
	fixPosition($('#divSideBox'), {
		topSpace: '8px'
	});
    
	FH.isInitRoomSelect = false;
	
	Hotel.prototype.selectRoom = function (roomId, totalprice, discount, saveprice, person, obj){
		this.selectedRoomId = roomId;
		this._changeSelect(obj);
		this.strongSelectedRoom[0].innerHTML = obj.getAttribute('data-name');
		
		if(!FH.isInitRoomSelect)
			this._goBack(person, obj);
	}
	
	Hotel.prototype._triggerSelect = function (){
		if(this.hotelId != HotelList.selectedHotel) return;
		var btn, btnExpr = 'input.base_btn_confirm';
        btn = $(this.tbRoomList).find(btnExpr + '[data-room='+ HotelList.selectedRoom +']');
		FH.isInitRoomSelect = true;
        S.trigger(btn, 'click');
        FH.isInitRoomSelect = false;
	}
	
	Hotel.prototype._goBack = function (person, obj){
		var hPerson = S.create(S.format('<input type="hidden" name="person" value="$1"/>', person));
		obj.parentNode.appendChild(hPerson);
		var returnUrl = $('#hReturnURL').value();
		fm.action = returnUrl + '&' + ['RHotelID=' + this.hotelId, "RRoomID=" + this.selectedRoomId].join('&');
		fm.submit();
	}
}

// 酒店筛选
// 该对象可以复用的前提：
// 1. 条件生成逻辑后台进行，状态后台维护
// 2. 筛选一个条件后，该条件从条件列表中移除
var Filter = {

	multiChooseDic: {},
	
	allHidden: $('#divFilterData').find('input'),

	init: function () {
		var divFilter = $('#ulFilter'), divFilterResult = $('#divFilterResult');
		
		if(divFilter.length == 0) return;

		new Mod.EventDispatcher(divFilter, Filter.selectOption, {
				cmds: [
					{style: 'multiple_choice', func: Filter.openMultiChoose},
					{style: 'more_choice',     func: Filter.openBox},
					{style: 'btn_confirm',     func: Filter.confirmChoice},
					{style: 'btn_cancel',      func: Filter.cancelChocie}
				]
			});
		
		if(divFilterResult.length){
			new Mod.EventDispatcher(divFilterResult, Filter.cancelResult, {
					cmds: [
						{style: 'clear_all', func: Filter.clearChocie}
					]
				});
		}
		
		// init breadcrumb navigation
        window.breadcrumbNav = function (obj, e) {
            $('#hStarList').value = '';
            doPostBack(obj, e);
        };
	},
	
	getURL: function (keyIndex, target, isClear){
		var url = window.location.href;
		
		url = url.replace(/p\d+/, ''); // remove paging info
		
		var key    = FHConfig.filter.keys[keyIndex],
			value  = $('#h' + key).value(), 
			seoKey = FHConfig.filter.seo[keyIndex], 
			rSeoItem = new RegExp(seoKey + '\\d+','gi'); //seo value is a number

		if(isClear && keyIndex == -1){
            for (var i = 0; i < FHConfig.filter.seo.length; i++) {
                seoKey = FHConfig.filter.seo[i];
                rSeoItem = new RegExp(seoKey + '\\d+','gi');
			    url = url.replace(rSeoItem, '');
            }
            return url;
        }

		if(isClear && seoKey){
			url = url.replace(rSeoItem, '');
			return url;
		}
			
		if(FH.isIntl && seoKey){
			var seoString = '';
			value.split(',').each(function(v, i){
				seoString += (seoKey + v);
			});
			url = url.replace(rSeoItem, '').replace(/#\w+/,'').replace(/\?.+/,'');
			
			var rSeoExp = new RegExp('(' + FHConfig.filter.seo.join('|') + ')\\d+', 'gi');
			var isInserted = false, rankIndex = FHConfig.filter.seorank.indexOf(seoKey);
			url = url.replace(rSeoExp, function (match, key, i){
				if(isInserted) return match;
				var pos = FHConfig.filter.seorank.indexOf(key);
				if(pos > rankIndex){
					isInserted = true;
					return seoString + match;
				}else
                    return match;
			});
			if(!isInserted)
				url += seoString;
			return url;
		}
		
		if(value.split(',').length == 1 && seoKey) // so dirty
            return target.href == 'javascript:void(0);' ? (url.replace(/#\w+/,'') + seoKey + value) : target.href.replace(/p\d+/, '');
		
		return url;
	},

	resetOthers: function (key){
		Filter.allHidden.each(function(item, i){
			if(item[0].id.substring(1) == key)
				return;
			item.value(item[0].getAttribute('_defaultValue'));
		});
	},
	
	openBox: function (e, target) {
		$(target).addClass('hidden');
		var li = $(target.parentNode);
		li.addClass('current');
		li.find('a:first').addClass('hidden');
		li.find('div.filter_btn_box').removeClass('hidden');
		if(cQuery.browser.isIE6){
			setTimeout(function(){
				li.find('div.filter_btn_box')[0].style.zoom = 1;
				li[0].style.zoom = 1;
			}, 10);
		}
		
	},

	openMultiChoose: function (keyIndex, e, target) {
		var key = FHConfig.filter.keys[keyIndex];
		Filter.openBox(e, target);
		// update status
		Filter.multiChooseDic[key] = true;
	},

	confirmChoice: function (keyIndex, e, target) {
		var key = FHConfig.filter.keys[keyIndex];
		
		if($('#h' + key).value().trim().length == 0)
			return; // select nothing 
			
		// update datas
		Filter.resetOthers(key);
        
		$('#hSearch').value(1);
		// post data
		var url = Filter.getURL(keyIndex, target);
		doPostBack(url);
	},

	cancelChocie: function (keyIndex, e, target) {
		var key = FHConfig.filter.keys[keyIndex];
		// update style
		var li = $(target.parentNode.parentNode);
		li.removeClass('current');
		li.find('div.filter_btn_box').addClass('hidden');
		var items = li.find('>a');
		items.each(function(item, i){
			(i == 0 || i == items.length - 1) ? item.removeClass('hidden') : item.removeClass('selected');
		});
		// cause brand html structure is different from others
		if(key == 'HotelBrandIds'){
			items = li.find('div.brand_name_list>a');
			items.push(li.find('>a')[0]);
		}
		items.each(function(item, i){
			(i == 0 || i == items.length - 1) ? item.removeClass('hidden') : item.removeClass('selected');
		});
		// update datas
		var hData = $('#h' + key);
		hData.value(hData[0].getAttribute('_defaultValue'));
		
		Filter.multiChooseDic[key] = false;
	},

	cancelResult: function (keyIndex, e, target){
		var key = FHConfig.filter.keys[keyIndex];
		// update datas
		var hData = $('#h' + key);
		hData.value(''); // default value is empty (but should be configed)
		var url = Filter.getURL(keyIndex, target, true);
		doPostBack(url);
	},
	
	clearChocie: function (e, target){
		Filter.allHidden.each(function(item, i){
			item.value('');
		});
		var url = Filter.getURL(-1, target, true);
		doPostBack(url);
	},
	
	selectOption: function (keyIndex, value, e, target) {
		var key = FHConfig.filter.keys[keyIndex];
		
		Filter.resetOthers(key);
		
		target = $(target);
		var isMultiChoose = key in Filter.multiChooseDic && Filter.multiChooseDic[key];
		var isChecked = target.hasClass('selected');
		var hData = $('#h' + key);
		
		if(isMultiChoose){
			// checkbox
			isChecked ? target.removeClass('selected') : target.addClass('selected');
			
			var rValue = new RegExp('\\b' + value + '\\b');
			if(isChecked)
				hData.value(hData.value().replace(rValue, ''));
			else
				!rValue.test(hData.value()) && hData.value(hData.value() + ',' + value);
			// normalize value
			hData.value(hData.value().split(',').filter(function(item){return item != ''}).join(','));
		}else{
			target.addClass('selected');
			hData.value(value);
			$('#hSearch').value(1);
			var url = Filter.getURL(keyIndex, target[0]);
			doPostBack(url);
		}
	}
}

// quick view of hotel
var QuickView = {

    divQuickView: undefined,

    _emap: undefined,
    _tmap: undefined,
    _comment: undefined,
    
    _markers: {},
    
    _inited: false,
       
    _showTitle: function (hotelId, htlName) {
        this.divViewTitle[0].innerHTML = '';

        var divHotel = HotelList.hotels[hotelId].container;

        var divName = divHotel.find('div.searchresult_name'),
            htmlSpanMedal = divName.find('span').ohtml(),
            htmlSpanStar  = S.next(divName).innerHTML.trim(),
            htmlName = '<h2>' + htlName + '</h2>';

        var divGrade; 
        divHotel.find('div.searchresult_judge_box')
            .each(function(item, i){
                item[0].style.display == 'block' && (divGrade = $(item));
            });
        var spansGrade = divGrade.find('a>span'),
            lnkGrade;
        if(spansGrade.length){
            var htmlInnerGrade = $(spansGrade[0]).ohtml() + $(spansGrade[1]).ohtml();
            lnkGrade = divGrade.find('a');
            lnkGrade = lnkGrade.clone();
            lnkGrade[0].innerHTML = htmlInnerGrade;
        }
        var htmlLinkGrade = lnkGrade ? lnkGrade.ohtml() : '';

        htmlLinkGrade = htmlLinkGrade.replace('href', '__href')
                        .replace(/_href/g, 'href').replace('_target', 'target');

        this.divViewTitle[0].innerHTML = 
            htmlSpanMedal + htmlName + htmlSpanStar + htmlLinkGrade;
    },

    _createHotelMarker: function (position, htlName){
        var opts = {position: {}, offset: {}, icon: ''};
        
        var pos = position.split('|');
		
        opts.position = {
			lon: pos[0],
			lat: pos[1]
		}
        
		opts.offset = {
			x: -10,
			y: -30
		}
		
		if (!cQuery.browser.isIE6){
			opts.content = S.format(
				'<div><img src="$1" style="position:absolute"/><img src="$2" style="position:absolute;top:5px;"/>\
					<div class="searchresult_popname box_shadow" style="left:30px;"><span>$3</span></div></div>',
				"http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
				'http://pic.c-ctrip.com/hotels081118/marker_shadow.png',
				htlName);
		}else{
			opts.content = S.format(
				'<div><img src="$1" style="position:absolute"/>\
					<div class="searchresult_popname box_shadow" style="left:30px;"><span>$2</span></div></div>',
				"http://pic.c-ctrip.com/hotels110127/hotel_pointer." + ($.browser.isIE6 ? 'gif' : 'png'),
				htlName);
		}

        var marker = this._emap.createMarker(opts);
        
        return marker;
    },

    _showMap: function (position, hotelId, htlName){
        var divMap = this.divQuickView.find('.htl_map');
	
        var self = this;
        function mapReady () {            
            var marker = self._markers[hotelId] || self._createHotelMarker(position, htlName);
            self._markers[hotelId] = marker;
            self._emap.show(marker);
			Mod.hideLoading(divMap);
        }
		
		Mod.showLoading(divMap);

        if (this._emap)
            this._emap.reCreate(); // will trigger mapReady
        else
            this._emap = Mod.regEMap(divMap);
        
        this._emap.on('mapReady', mapReady);
    },

    _showComment: function (hotelId, masterHotelId, callback) {
        if(!this._comment){
            this._comment = Mod.regHtlComment(this.ulComment, FHConfig.tmpls.htlcomment, callback);
            this._comment.getData(hotelId, masterHotelId);
        }else{
            this._comment.getData(hotelId, masterHotelId);
        }
    },

    _showTraffic: function (hotelId, count, callback) {
        if(!this._tmap){
            this._tmap = Mod.regTMap(this.ulTraffic, FHConfig.tmpls.traffic, callback);
            this._tmap.getData(hotelId, $('#A_city')[0].getAttribute('_defaultValue'), count);
        }else{
            this._tmap.getData(hotelId, $('#A_city')[0].getAttribute('_defaultValue'), count);
        }
    },

    _showCommentAndTraffic: function (hotelId, masterHotelId) {
        var self = this;

        this.divCommentAndTraffic.css({
            width: this.divCommentAndTraffic.css('width')
        }); // fix loading problem
        if(cQuery.browser.isIE6 || cQuery.browser.isIE7)
            this.divCommentAndTraffic.css({ width: '371px' });// 根据css
        
        S.hide(this.ulComment);
        S.hide(this.ulTraffic);
        Mod.showLoading(this.divCommentAndTraffic);

        this._showComment(hotelId, masterHotelId, onCommentShow);

        function onCommentShow (data, hotelId) {
            self._showTraffic(hotelId, 6 + 2*(data ? (3-data.length) : 2), adjustHeight);
        }

        function adjustHeight() {
            Mod.hideLoading(self.divCommentAndTraffic); // hide loading
            S.show(self.ulComment);
            S.show(self.ulTraffic);

            var totalHeight = 320,//parseInt(self.divCommentAndTraffic.css('height')), // 根据css
                commentHeight = self.ulComment[0].offsetHeight;
            self.ulTraffic.css({height: (totalHeight - commentHeight + 10) + 'px' });
        }
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

        if(!this.ulSmallPic.isBondEvent){
            function onPicClick (e) {
                var target = e.target;
                if(e.target.nodeName == 'LI'){
                    target = e.target.getElementsByTagName('img');
                    if(!target || target.length == 0)
                        return;
                    target = target[0];
                }
                if(target.nodeName != 'IMG') return;

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

    _showPics: function (hotelId) {
        
        var self = this;

        S.hide(this.divLargePic);
        S.hide(this.ulSmallPic);
        S.show(this.divNoLargePic);
        Mod.showLoading(this.divNoLargePic);

		var txtCheckInDate = $('#txtCheckInDate'),
			txtCheckOutDate = $('#txtCheckOutDate');
		txtCheckInDate.length == 0 && (txtCheckInDate = $('#txtDDate'));
		txtCheckOutDate.length == 0 && (txtCheckOutDate = $('#txtRDate'));
		
        var params = [
            'hotel=' + hotelId, 
            'city=' + $('#A_city')[0].getAttribute('_defaultValue'), 
            'CheckInDate=' + txtCheckInDate[0].getAttribute('_defaultValue'), 
            'CheckOutDate=' + txtCheckOutDate[0].getAttribute('_defaultValue')
        ]
        $.ajax(FHConfig.URL.HOTEL_PIC + '?' + params.join('&'), {
            method: cQuery.AJAX_METHOD_GET,
            cache: true,
            onsuccess: function (xhr, res) {
                if(res)
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

        this.divCommentAndTraffic = this.divQuickView.find('.comment_symbol');
        this.ulComment = this.divCommentAndTraffic.find('ul:first');
        this.ulTraffic = this.divCommentAndTraffic.find('ul:last');

        this.lnkMoreDetail = $('#lnkMoreDetail')[0];
        this.lnkMapDetail = $('#lnkMapDetail')[0];
    },

    show: function (position, htlName, hotelId, masterHotelId, detailUrl){
        var self = this;
        
        if(!this._inited)
            this._initElements();

        S.show(this.divQuickView);
        this.divQuickView.mask();
        
        if(!this._inited)
            this._inited = true;

        this._showTitle(hotelId, htlName);
        // detail more link
        this.lnkMoreDetail.href = detailUrl;
        this.lnkMapDetail.href = detailUrl;

        this._showPics(hotelId);

        // 由于cQuery mask函数原理，map地图需要重建
        this._showMap(position, hotelId, htlName);

        this._showCommentAndTraffic(hotelId, masterHotelId);
        
    },

    hide: function (){
        this.divQuickView.unmask();
        S.hide(this.divQuickView);
    }
}
window.QuickView = QuickView;

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

FH.init();

})(window);
