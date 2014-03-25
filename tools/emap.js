// electronic map
define(function (require, exports, module) {

    var S = require('common').S;

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
        this._iframeUrl = opts.iframeUrl;

        this._lastZoomLevel = DEFAULT_ZOOM_LEVEL;
        this._lastCenter = undefined;

        this._events = { 'mapReady': [] };

        if (opts.iframeUrl) {
            this._createMapIframe();
        } else {
            this._mapWin = window;
            this._createMap();
        }

    }

    Map.prototype = {
        constructor: Map,

        show: function (overlays, center) {
            this.map.clearMap();
            this._renderOverlays(overlays, center);
            // auto zoom after the overlays are added
            if (this._autoZoom) {
                this.map.setFitView();
                this._lastZoomLevel = this.map.getZoom();
                this._lastCenter = center || overlays[0].getPosition();
            }
        },

        // return back to the status of the lastest calling of show function
        resetDisplay: function () {
            this.map.setZoom(this._lastZoomLevel);
            this._lastCenter && this.center(this._lastCenter);
        },

        center: function (point, isTransitional) {
            if (typeof point.getLat != 'function')
                point = new this._mapWin.AMap.LngLat(point.lon, point.lat);

            if (isTransitional) {
                this.map.panTo(point);
            } else {
                this.map.setCenter(point);
            }
        },

        createMarker: function (opts) {
            var AMap = this._mapWin.AMap;
            opts.position = opts.position && new AMap.LngLat(opts.position.lon, opts.position.lat);
            opts.offset = opts.offset && { x: opts.offset.x, y: opts.offset.y };
            return new AMap.Marker(opts); // not support for complex icon
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
            var self = this;
            // the function will be called after iframe ready
            window.onMapReady = function () {
                self._createMap();
            };

            var ctx = this.ctx,
                h = S.height(ctx),
                w = S.width(ctx);
            var ifm = document.createElement('iframe');
            ifm.width = w;
            ifm.height = h;
            ifm.frameBorder = 'none';
            ifm.style.border = 'none';
            ifm.style.overflow = 'hidden';
            ifm.src = this._iframeUrl;

            ctx.appendChild(ifm);

            var win = (ifm.window || ifm.contentWindow);
            this._mapWin = win;
            this._mapIfm = ifm;
        },

        _createMap: function () {
            var win = this._mapWin,
                mapEl = win.document.getElementById('map');

            mapEl.style.width = S.width(this.ctx) + 'px';
            mapEl.style.height = $(this.ctx).css('height');

            var AMap = win.AMap;
            var position = new AMap.LngLat(116.404, 39.915);
            var map = new AMap.Map("map", {
                center: position,
                level: DEFAULT_ZOOM_LEVEL,
                resizeEnable: true
            });

            var self = this;
            map.plugin(["AMap.ToolBar", "AMap.OverView", "AMap.Scale"], function () {
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
});
