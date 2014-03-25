/*
* author:shiz@ctrip.com
* date:2013-09-23
*/
define(function (require, exports, module) {

    var Tools = (function () {
        var ret = {};

        // browser detect
        var ie_ua =  navigator.userAgent.toLowerCase().match(/msie (\d+)/);
        if(ie_ua)
            ret.IE = +ie_ua[1];

        ret.matchesSelector = function (el, expr) {
            var matchesSelector = (
                document.documentElement.webkitMatchesSelector ||
                document.documentElement.mozMatchesSelector ||
                document.documentElement.oMatchesSelector ||
                document.documentElement.msMatchesSelector
            );
            return matchesSelector ? 
                matchesSelector.call(el, expr) : 
                Sizzle.matchesSelector(el, expr);
        }

        // find the parentNode which matchs the expression
        ret.parent = function (el, expr) {
            var elem;
            elem = el.parentNode;
            while ((elem && elem.nodeType != 1) || (elem && expr && !ret.matchesSelector(elem, expr))) {
                elem = elem.parentNode;
            }

            return elem;
        }

        // set class to vml shape in ie
        ret.setIEClass = function (shape) {
            if(!ret.IE || ret.IE > 8) return;
            var classes = shape.attr('class');
            if(!classes) return;
            classes.split(' ').forEach(function (c, i) {
                var classObj = VML_CLASS[c];
                for(var k in classObj){
                    if(classObj.hasOwnProperty(k))
                        shape.attr(k, classObj[k]);
                }
            });
        }

        return ret;
    })();

    (function(exports){

        // get the dimension of the specified element
        function dimension(el){
            try{
                var dim = el.getBoundingClientRect();
            }catch(ie_r2d3_ex){
                var dim = el.domNode.getBoundingClientRect();
            }
            
            var docElem = document.documentElement;
            var pageXOffset = ( window.pageXOffset || docElem.scrollLeft )  - ( docElem.clientLeft  || 0 ),
                pageYOffset = ( window.pageYOffset || docElem.scrollTop )  - ( docElem.clientTop  || 0 );

            return {
                left  : dim.left + pageXOffset,
                top   : dim.top + pageYOffset,
                right : dim.right + pageXOffset,
                bottom: dim.bottom + pageYOffset,
                width : isNaN(dim.width) ? dim.right - dim.left : dim.width,
                height: isNaN(dim.height) ? dim.bottom - dim.top : dim.height
            }
        }

        var ALIGNMODE = {
            topleft    : 1,
            topright   : 2,
            bottomright: 3,
            bottomleft : 4
        }

        var Tip = function (options) {
            // for match the trigger elements
            this.selector = options.selector || "*[data-role='tip']";
            // settle down the align mode ignoring the bounds of container
            this.alignMode = options.alignMode;
            // the event bind on trigger for showing tip
            this.triggerEvt = options.triggerEvt;
            // data convert function: convert the __data__ to the tmpl data
            this.dataConverter = options.dataConverter;
            // hide delay time
            this.delay = options.delay || 100;

            this.container = options.container || d3.select('body');
            this.tipEl = options.tipEl;

            this.tipEl.style({'position': 'absolute', 'top': '-999px'});

            this._initTemplate();

            this.arrowSelector = options.arrowSelector;
            this.arrowClass = (options.arrowClass || "").split(' ');

            this.data = undefined;

            this._events = { show: [], hide: [] };

            this._bindEvents();
        }

        Tip.prototype = {
            constructor: Tip,

            _computeDimensions: function () {
                this.bounds = dimension(this.container.node());
                this.tipDim = dimension(this.tipEl.node());
                this.tipDim.border = parseInt(this.tipEl.style('border-top-width')) || 0;
                
                this.arrowDim = { height: 0, width: 0};
                if(this.arrowEl){
                    this.arrowDim = dimension(this.arrowEl.node());
                    this.arrowEl.style({'position': 'absolute'});
                }
            },

            _initTemplate: function () {
                if(!(this.tipEl.attr('data-tmpl') == 1)) return;
                // read the tmpl function from attribute
                this.createContent = this.tipEl.node().__createContent;
                if(this.createContent) return;
                // extract template from the inner script
                var tmpl = this.tipEl.select('script').html();
                this.createContent = Tools.T.compile(tmpl);
                this.tipEl.node().__createContent = this.createContent;
            },

            _getEvts: function (triggerEvt) {
                if(!triggerEvt) return ['mouseenter', 'mouseleave'];

                var suffix = triggerEvt.indexOf('.');

                if(suffix != -1){
                    var d3_suffix = triggerEvt.substring(suffix);
                    triggerEvt = triggerEvt.substring(0, suffix);
                }

                var ret = triggerEvt == 'mouseover' ? ['mouseover', 'mouseout'] : ['mouseenter', 'mouseleave'];

                return (suffix != -1) ? ret.map(function (evt) { return evt + d3_suffix; }) : ret;
            },

            _bindEvents: function () {
                var triggers = typeof this.selector === 'string' ?
                    this.container.selectAll(this.selector) : 
                    this.selector;

                var evts = this._getEvts(this.triggerEvt);

                if(!this.triggerEvt || evts[0].indexOf('mouseover') != -1){
                    triggers.on(evts[0], this.show.bind(this));
                    triggers.on(evts[1], this.hide.bind(this));

                    var self = this;
                    this.tipEl.on('mouseenter', function () {
                        setTimeout(function () {
                            clearTimeout(self.tipEl.node()._hideTimer);    
                        }, 30);
                    }).on('mouseleave', this.hide.bind(this));
                }else{
                    triggers.on(this.triggerEvt, this.show.bind(this));
                    d3.select('body').on('click', this.hide.bind(this));
                }
            },

            on: function (evt, handler) {
                this._events[evt].push(handler);
                return this;
            },

            show: function (d) {
                var self = this;

                clearTimeout(this.tipEl.node()._hideTimer);

                var trigger = d3.event.target;
                trigger = typeof this.selector !== 'string' ? trigger : Tools.matchesSelector(trigger, this.selector) ? trigger : trigger.parentNode;
                var triggerDim = dimension(trigger);

                if(this.createContent){
                    var success = this._updateContent(d);
                    if(!success) return;
                }
                this.arrowSelector && (this.arrowEl = d3.select(this.arrowSelector));

                this._computeDimensions();

                var pos = this._calPos(triggerDim, this.alignMode);
                this._render(pos);
                
                this._events.show.forEach(function (handler) {
                    handler(self, pos, d3.event);
                });

                d3.event.stopPropagation();
            },

            hide: function () {
                var self = this;
                var e = d3.event;
                // bind hide timer with the tip element
                // to avoid the mystical hidden
                this.tipEl.node()._hideTimer =
                    setTimeout(function () {
                        self.tipEl.style({'top': '-999px'});
                        self._events.hide.forEach(function (handler) {
                            handler(self, e);
                        });  
                    }, this.delay);
            },

            _calPos: function (triggerDim, alignMode) {

                var tipDim = this.tipDim,
                    arrowDim = this.arrowDim,
                    bounds = this.bounds,
                    arrowClass = this.arrowClass;

                var top, left, arrowTop, arrowLeft, arrow = arrowClass[0];
                var posFit = {};

                if(!alignMode){
                    posFit = {
                        top   : triggerDim.top - tipDim.height > bounds.top,
                        right : triggerDim.left + tipDim.width < bounds.right,
                        bottom: triggerDim.bottom + tipDim.height < bounds.bottom,
                        left  : triggerDim.right - tipDim.width > bounds.left
                    }
                }
                
                if(alignMode == ALIGNMODE.bottomright || (posFit.bottom && posFit.left)){

                    // put it on bottom align to right
                    top = triggerDim.bottom,
                    left = triggerDim.right - tipDim.width;
                    arrowLeft = tipDim.width - (triggerDim.width / 2 + arrowDim.width / 2) ;
                    arrowTop = - (arrowDim.height + tipDim.border);
                    arrowClass.length > 1 && (arrow = arrowClass[1]);

                }else if(alignMode == ALIGNMODE.bottomleft || (posFit.bottom && posFit.right)){

                    // put it on bottom align to left
                    top = triggerDim.bottom,
                    left = triggerDim.left;
                    arrowLeft = triggerDim.width / 2 - arrowDim.width / 2 ;
                    arrowTop = - (arrowDim.height + tipDim.border);
                    arrowClass.length > 1 && (arrow = arrowClass[1]);

                }else if(alignMode == ALIGNMODE.topright || posFit.left){ // ignore the narrow bounds
                
                    // put it on top align to right
                    top = triggerDim.top - tipDim.height,
                    left = triggerDim.right - tipDim.width;
                    arrowLeft = tipDim.width - (triggerDim.width / 2 + arrowDim.width / 2) ;
                    arrowTop = tipDim.height + tipDim.border;
                    arrow = arrowClass[0];
                    
                }else{
                
                    // put it on top align to left
                    top = triggerDim.top - tipDim.height,
                    left = triggerDim.left;
                    arrowLeft = triggerDim.width / 2 - arrowDim.width / 2 ;
                    arrowTop = tipDim.height + tipDim.border;
                    arrow = arrowClass[0];
                    
                }
                // adjust tip and arrow left when trigger is smaller than arrow
                if(arrowLeft < 0){
                    left = left + arrowLeft;
                    arrowLeft = 0;
                }else if(arrowLeft + arrowDim.width > tipDim.width){
                    left = left + arrowLeft - (tipDim.width - arrowDim.width);
                    arrowLeft = tipDim.width - arrowDim.width;
                }

                return {
                    tip: {
                        top : top,
                        left: left
                    },
                    arrow: {
                        top : arrowTop,
                        left: arrowLeft,
                        className: arrow
                    }
                }
            },

            _render: function (pos) {
                this.tipEl.style({'top': pos.tip.top + 'px', 'left': pos.tip.left + 'px'});
                if(this.arrowEl){
                    this.arrowEl.style({'top': pos.arrow.top + 'px', 'left': pos.arrow.left + 'px'});
                    this.arrowEl.attr('class', pos.arrow.className);
                }
            },

            _updateContent: function (d) {
                var data = d, html;
                this.data = this.tipEl.node().__data__ = data;
                try{
                    this.dataConverter && (data = this.dataConverter(data));
                    html = this.createContent(data);
                }catch(ex){
                    // null or invalid data
                    this.hide();
                    return false;
                }
                html && this.tipEl.html(html);
                return true;
            }
        }

        Tip.ALIGNMODE = ALIGNMODE;

        exports.Tip = Tip;

    })(window);

    if(Tools.IE && Tools.IE < 9){
        require.async(['es5', 'r2d3', 'tools/template'], function (a, b, T) {
            Tools.T = T;
            PriceBoard.init();
        });
    }else{
        require.async(['d3', 'tools/template'], function (a, T) {
            Tools.T = T;
            PriceBoard.init();
        });
    }

    var PriceBoard = {

        data: undefined,

        nightsList: [2,3,4,5],

        selectedStar: 0, // all

        isCalendarInited: false,
        isChartInited: false,

        _events: { filter: [] },

        formatDate: undefined, // function stringify date, init when d3 loaded

        holidays: ["2013-09-19", "2013-09-20", "2013-09-21", "2013-10-01", "2013-10-02", "2013-10-03", "2013-10-04", "2013-10-05", "2013-10-06", "2013-10-07", "2013-12-30", "2013-12-31", "2014-01-01", "2014-01-30", "2014-01-31", "2014-02-01", "2014-02-02", "2014-02-03", "2014-02-04", "2014-02-05", "2014-04-05", "2014-04-06", "2014-04-07", "2014-05-01", "2014-05-02", "2014-05-03", "2014-05-31", "2014-06-01", "2014-06-02", "2014-09-06", "2014-09-07", "2014-09-08", "2014-10-01", "2014-10-02", "2014-10-03", "2014-10-04", "2014-10-05", "2014-10-06", "2014-10-07"],

        search: function (data, days, star) {
            star = star || this.selectedStar;

            var params = {
                type: 'round',
                from: data.flights[0].formpy,
                to  : data.flights[0].topy,
                fromid: data.flights[0].fromid,
                toid  : data.flights[0].toid,
                fromtime: data.flights[0].departdate,
                totime: data.flights[0].returndate,
                price: data.price
            }

            var index = window.location.href.toLowerCase().indexOf('diy');
            var url = window.location.href.substring(0, index - 1) +
                "/DIY/{type}-{from}{fromid}-{to}{toid}/{star0}?{fromtime=}&{totime=}&{price=}&source=1";

            var trace = days == 7 ? "va_lst_s*_prf_0_0_0_0" : "va_lst_s*_prf_1_0_0_0";
            trace = trace.replace('*', params.fromid);
            url += ("#ctm_ref=" + trace);

            url = url.replace(/\{([^\}]+)\}/g, function(_, key){

                if(key.indexOf(0) != -1){
                    // process star filter
                    return star ? 'star' + star : '';
                }else if(key.indexOf('=') != -1){
                    // process post data
                    return key + params[key.substring(0, key.length-1)];
                }else{
                    return params[key];
                }
            });

            window.open(url.toLowerCase());
        },

        showLoading: function () {
            d3.select('#divLoading').classed('hidden', false);
        },

        hideLoading: function () {
            d3.select('#divLoading').classed('hidden', true);
            setTimeout(function () {
                d3.select('#pnlStar').classed('hidden', false);
                d3.select('#tipPrice').classed('hidden', false);    
            }, ChartHelper.duration * 2);  
        },

        _toViewData: function (data) {
            // compute the average price for show
            for(var nights in data){
                for (var i = data[nights].length - 1; i >= 0; i--) {
                    data[nights][i].avgprice = Math.floor(data[nights][i].price / 2);
                }
            }
            return data;
        },

        requestData: function (days, callback) {
            var self = this;

            self.showLoading();

            var url = Config.URL + "&days=" + days;
            d3.xhr(url, function (err, xhr) {
                if(err){
                    return ;
                }

                var data = (new Function('return ' + xhr.responseText.replace(/\t|\n|\r/g,'') + ';'))();
                self.data = self._toViewData(data);

                if(!data || data.length) return;

                self.hideLoading();
                callback();
            });
        },

        init: function () {
            var self = this;

            self.requestData(30, function () {

                var display = 
                self._initSwitch();
                self._initStarSelect();
                self._bindEvents();

                if( Config.days == 7 ){
                    display(true);
                    PriceCalender.init();
                    self.isCalendarInited = true;
                }else{
                    display(false);
                    PriceChart.init();
                    self.isChartInited = true;
                }
            });

            this.formatDate = d3.time.format('%Y-%m-%d');
        },

        on: function (evtName, handler) {
            this._events[evtName].push(handler);
        },

        _initSwitch: function () {
            var self = this;

            var tabCalendar = d3.select('#tabCalendar'),
                tabChart = d3.select('#tabChart'),
                pnlCalendar = d3.select('#divCalendar'),
                pnlChart = d3.select('#divChart');


            function display(isCalendar) {
                if(isCalendar){
                    tabCalendar.classed('cursor', true);
                    tabChart.classed('cursor', false);
                    pnlCalendar.classed('hidden', false);
                    pnlChart.classed('hidden', true);
                }else{
                    tabCalendar.classed('cursor', false);
                    tabChart.classed('cursor', true);
                    pnlCalendar.classed('hidden', true);
                    pnlChart.classed('hidden', false);
                }
            }

            tabCalendar.on('click', function () {
                display(true);
                if(!self.isCalendarInited){
                    PriceCalender.init();
                    self.isCalendarInited = true;
                }
            });

            tabChart.on('click', function () {
                display(false);
                if(!self.isChartInited){
                    PriceChart.init();
                    self.isChartInited = true;
                }
            });

            return display;
        },

        _initStarSelect: function () {
            var lblStar = d3.select('#lblStar'),
                pnlStar = d3.select('#pnlStar');

            var tip = new Tip({
                    selector: '#lblStar',
                    tipEl: pnlStar,
                    alignMode: Tip.ALIGNMODE.bottomleft,
                    triggerEvt: 'click'
                });

            tip.on('show', function () {
                var html = lblStar.html().replace('down', 'up');
                lblStar.html(html);
                lblStar.classed('star_cursor', true);   
            }).on('hide', function () {
                var html = lblStar.html().replace('up', 'down');
                lblStar.html(html);
                lblStar.classed('star_cursor', false);
            });

            var self = this;
            pnlStar.on('click', function () {
                var e = d3.event;

                tip.hide();
                var html = lblStar.html().replace(/[\u0100-\uffff\/]+/, e.target.innerHTML);
                lblStar.html(html);

                self.selectedStar = e.target.getAttribute('data-star');
                self._events.filter.forEach(function (handler) {
                    handler(self.selectedStar);
                })
            });
        },

        _bindEvents: function () {
            var self = this;
            var classes = ['bg_w', 'bg_h'];
            var tip = d3.select('#tipPrice');
            tip.on('click', function () {
                var data = tip.node().__data__;
                var days = 7;
                if(data.d){ // chart search
                    data = data.d;
                    days = 30;
                }
                self.search(data, days);
            }).on('mouseenter.hover', function () {
                tip.select('#tipArrow').selectAll('b')
                    .attr('class', function (d, i) {
                        return classes[i]+' '+classes[i]+'_hover';
                    });
            }).on('mouseleave.hover', function () {
                tip.select('#tipArrow').selectAll('b')
                    .attr('class', function (d, i) {
                        return classes[i];
                    });
            });
        }
    }

    var PriceCalender = {

        page: -1,

        dates: undefined, // dates on show

        init: function () {
            this.container = d3.select('#divCalendar');
            this.calDates  = d3.select('#calDates').selectAll('dd');
            this.calNights = d3.select('#calNights').selectAll('dd').data(PriceBoard.nightsList);
            this.calTable  = this.container.select('table');
            this.calCells  = this.calTable.selectAll('td');

            this.calPrev = this.container.select('a.arrow_l');
            this.calNext = this.container.select('a.arrow_r');

            this.createContent = Tools.T.compile(Config.TMPLS.cell);

            this.switchData(true);// render data of page zero

            this._bindEvents();
            this._initTip();
        },

        _initTip: function () {
            new Tip({
                container: this.calTable,
                selector: 'td',
                tipEl: d3.select('#tipPrice'),
                arrowSelector: '#tipArrow',
                arrowClass: "fh_jmp_arrow fh_jmp_boult"
            });
        },

        _bindEvents: function () {
            // prev/next control
            this.calPrev.on('click', this.switchData.bind(this, false));
            this.calNext.on('click', this.switchData.bind(this, true));
            // click goto result
            this.calTable.selectAll('td')
                // display function when hover a data
                .on('mouseenter.hoverData', this._hoverData.bind(this))
                // click goto result
                .on('click', this._goTo);
            // filter star event
            PriceBoard.on('filter', this.updateContent.bind(this));
        },

        _goTo: function (d) {
            if(!d) return;
            PriceBoard.search(d, 7);
        },

        switchData: function (forward) {

            this.calPrev.classed("hidden", false);
            this.calNext.classed("hidden", false);

            if(forward){
                if(this.page == 4) return;
                this.page ++;
            }else{
                if(this.page == 0) return;
                this.page --;
            }

            this.page == 0 && this.calPrev.classed("hidden", true);
            this.page == 4 && this.calNext.classed("hidden", true);

            this.updateDates();
            this.updateContent();
        },

        _hoverData: function () {
            var e = d3.event;
            var data = e.target.__data__;
            if(!data) return;
            //flthtl_side_bg
            this.calNights.classed('flthtl_side_bg', 
                function (d) {
                    return d == data.nights;
                });
            this.calDates.classed('flthtl_side_bg', 
                function (d) {
                    d = PriceBoard.formatDate(d);
                    return d == data.date;
                });
            // flthtl_side_bg cursor
            this.calCells.attr('class', function (d) {
                if(!d) return '';
                if(d.date == data.date && d.nights == data.nights) return 'flthtl_side_bg cursor';
                if(d.date == data.date || d.nights == data.nights) return 'flthtl_side_bg';
                return '';
            });

        },

        updateDates: function () {
            var self = this;

            var page = this.page;
            var offset = page >= 4 ? (30 - 7) : (page * 7); // last page cannot fill 7 days

            var today = d3.time.day(new Date()),//PriceBoard.formatDate.parse('2013-09-24'), //d3.time.day(new Date()),
                start = d3.time.day.offset(today, 2 + offset),
                end   = d3.time.day.offset(today, 9 + offset);

            this.dates = d3.time.days(start, end);
            
            function createDate (d) {
                var week =  Config.TEXTS.weeks[d.getDay()];
                var holiday = PriceBoard.holidays.indexOf(PriceBoard.formatDate(d)) == -1 ? '' : '<i></i>';
                return d3.time.format(week + "<strong>%m/%d</strong>" + holiday)(d);
            }

            this.calDates.data(this.dates).html(createDate);
        },

        updateContent: function () {
            var self = this;

            var dates = this.dates.map(function (d) {
                    return d3.time.format("%Y-%m-%d")(d);
                });

            var data = 
                PriceBoard
                    .data[PriceBoard.selectedStar]
                    .filter(function (d) {
                        if(dates.indexOf(d.date) != -1) return true;
                    });

            var nightsList = PriceBoard.nightsList,
                cells      = this.calCells,
                viewData   = [],
                lowest     = [];

            nightsList.forEach(function (nights) {
                lowest = [];
                dates.forEach(function (date) {
                    // query the viewdata
                    var content = 
                        data.filter(function (d) {
                            if(d.date == date && d.nights == nights) return true;
                        });
                    // null handle
                    content = content[0] ? content[0] : { date: date, nights: nights };
                    viewData.push(content);
                    // count lowest price
                    if(content.price){
                        var ok = false;
                        if(lowest.length == 0){
                            lowest.push(content);
                        }else{
                            if(content.price == lowest[0].price) lowest.push(content);
                            if(content.price <  lowest[0].price) lowest = [content];
                        }
                    }
                });
                // mark lowest price
                viewData.forEach(function (d, i) {
                    if(lowest.indexOf(d) != -1)
                        viewData[i].islowest = true;
                });
            });

            this.calCells
                .data(viewData)
                .html(function (d) {
                    return d.price ? self.createContent(d) : Config.TMPLS.cell_empty;
                });
        }
    }

    var PriceChart = {

        days: 30,

        dates: undefined,

        chosenNights: [2],

        shapes: {},

        heights: {
            datebar: 30,
            scrollbar: 5
        },

        init: function () {
            var container = d3.select('#divChart');

            var width = parseInt(container.select('.flthtl_svg').style('width')),
                height = 354;

            this._initContext(container, width, height);

            this.dates = this._createDates();
            var points = this._createPoints();

            this.renderBackgound(points);
            this.render(points);

            this._bindFilterEvents(container);
            this._bindLineEvents(this.chosenNights[0]);
            // filter star event
            PriceBoard.on('filter', this.reRender.bind(this));
        },

        _bindFilterEvents: function (container) {
            var self = this;

            container.selectAll('dl.flthtl_see_day input').on('click', filterNights);

            function filterNights () {
                var target = d3.event.target,
                    parent = target.parentNode;
                parent.className = target.checked ? 
                    parent.getAttribute('data-class') : '';
                self.filter(+parent.getAttribute('data-nights'), target.checked);
            }
        },

        _bindLineEvents: function (nights) {
            var self = this;

            setTimeout(function () {
                
                self.shapes.actions[nights] = 
                    new PriceChart.Action(nights);

            }, ChartHelper.duration + 50)
        },

        _initContext: function (container, width, height) {
            var svg = 
                container.select('.flthtl_svg')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height);

            ChartHelper.svg = svg;

            // height partition
            //  50 -- padding * 2
            //  auto -- chart height
            //  30 -- dates bar
            //  5  -- scroll bar
            var datebar = this.heights.datebar, 
                scrollbar = this.heights.scrollbar,
                stepWidth = width / this.days,
                chartHeight = height - datebar,// - scrollbar,
                chartWidth  = width - stepWidth;

            ChartHelper.bounds = {
                minX: stepWidth / 2, 
                maxX: stepWidth / 2 + chartWidth,
                minY: 0, 
                maxY: chartHeight,
                steps: this.days,
                padding: 50
            }

            this.shapes = {
                baselines: [],
                boundlines: [],
                lines: {},
                backlines: {},
                points: {},
                actions: {}
            }
        },

        filter: function (nights, isChecked) {
            if(isChecked){
                this.chosenNights.push(nights);
            }else{
                var index = this.chosenNights.indexOf(nights);
                this.chosenNights.splice(index, 1);
                this.removeLine(nights);
            }

            var points = this._createPoints();
            this.render(points);

            if(isChecked){
                this._bindLineEvents(nights);
            }
        },

        removeLine: function (nights) {
            var backlines = this.shapes.backlines[nights],
                lines = this.shapes.lines[nights],
                points = this.shapes.points[nights];
            backlines.forEach(function(line){
                line.remove();
            });
            lines.forEach(function(line){
                line.remove();
            });
            points.remove();

            delete this.shapes.backlines[nights];
            delete this.shapes.lines[nights];
            delete this.shapes.points[nights];
            delete this.shapes.actions[nights];
        },

        renderBackgound: function (points) {
            this._drawBaselines(points);
            this._drawDates(points, this.dates);
        },

        render: function (points) {
            var chosenNights = this.chosenNights;
            this._drawBoundLine(points);
            this._drawLine(points, chosenNights);
            this._drawPoints(points, chosenNights);
        },

        reRender: function (star) {
            var self = this;
            var chosenNights = this.chosenNights;
            chosenNights.forEach(function (nights, i) {
                self.removeLine(nights);
            });

            var points = this._createPoints();
            this.render(points);

            chosenNights.forEach(function (nights, i) {
                self._bindLineEvents(nights);
            }); 
        },

        _createDates: function () {
            var today = d3.time.day(new Date()), //PriceBoard.formatDate.parse('2013-09-24'), //d3.time.day(new Date()),
                start = d3.time.day.offset(today, 2),
                end   = d3.time.day.offset(today, 2 + 30);
            return d3.time.days(start, end);
        },

        _createPoints: function () {
            var star = PriceBoard.selectedStar, 
                nightsList = this.chosenNights, 
                dates = this.dates;

            var ret = [];

            nightsList.forEach(function (nights) {
                var data = 
                    PriceBoard.data[star].filter(function (d) {
                        return d.nights == nights;
                    });  
                // fill in the empty data
                dates.forEach(function (date) {
                    date = PriceBoard.formatDate(date);
                    var d = data.filter(function (d) {
                            return d.date == date;
                        });
                    (!d[0]) && data.push({price: null, date: date});
                });
                // sort by date
                data = data.sort(function (d1, d2) {
                        // compare function: -1 0 1
                        return d1.date > d2.date ? 1 : -1;
                    });

                Array.prototype.push.apply(ret, data);
            });

            ret = ChartHelper.locate(ret, function (d) {
                    return d.price;
                });
            return ret;
        },

        _drawBaselines: function (points) {
            var self = this;
            var basestyle = "line_base", line;
            var days = this.days;
            var pair = [
                {X: 0, Y: ChartHelper.bounds.minY},
                {X: 0, Y: ChartHelper.bounds.maxY}
            ];
            self.shapes.baselines = [];
            points.forEach(function (point, i) {
                pair[0].X = pair[1].X = point.X;
                line = ChartHelper.line(pair, basestyle);
                line.X = point.X;
                self.shapes.baselines.push(line);
            });
        },

        _drawDates: function (points, dates) {
            var fnFormat = d3.time.format('%e');

            var textY = ChartHelper.bounds.maxY + 15,
                textX, text;
            var rectWidth = ChartHelper.bounds.minX * 2,
                rectHeight = this.heights.datebar,
                rectY = ChartHelper.bounds.maxY,
                rectX;
            var dateClass, holidays = [], first;


            points.forEach(function (p, i) {
                // date background
                rectX = p.X - rectWidth / 2;
                ChartHelper.rect(rectWidth + 0.1, rectHeight, rectX, rectY, "rect_date");
                // weekend
                dateClass = (dates[i].getDay() == 6 || dates[i].getDay() == 0) ? 
                    'weekend' : "date";
                textX = p.X - 5;
                if(dates[i].getDate() == 1){
                    // date number
                    first = [p, dates[i]]
                }else{
                    ChartHelper.text(fnFormat(dates[i]), textX, textY, dateClass);
                    // holidays
                    if(PriceBoard.holidays.indexOf(PriceBoard.formatDate(dates[i])) != -1)
                        holidays.push(p);
                }
            });
            // first date
            if(first[0])
                drawFirstDay(first[0].X, textY, first[1]);

            holidays.forEach(function (p, i) {
                ChartHelper.image(12, 12, p.X + 5, rectY - 5, 'http://pic.c-ctrip.com/vacation_v1/icon_festival.png');    
            });

            function drawFirstDay (x, y, date) {
                var isHoliday = (PriceBoard.holidays.indexOf(PriceBoard.formatDate(date)) != -1);
                var rectY = (Tools.IE && Tools.IE < 9) ? (y - 9) : (y -12);
                ChartHelper.rect(rectWidth + 2, 16, x - rectWidth / 2, rectY, isHoliday ? 'first_date_holiday' : 'first_rect');
                ChartHelper.text(date.getMonth() + 1 + '月', x - 12, y, 'first_date');
            }
        },

        _drawBoundLine: function (points) {
            var max, min;
            for (var i = points.length - 1; i >= 0; i--) {
                if(!isNaN(points[i].Y)){
                    !min && (min = points[i]);
                    !max && (max = points[i]);
                    if(points[i].Y < min.Y)
                        min = points[i];
                    if(points[i].Y > max.Y)
                        max = points[i];
                }
            }

            var boundlines = this.shapes.boundlines;
            var width = ChartHelper.bounds.maxX + ChartHelper.bounds.minX;
            var pair, text, line;
            var dollar = "￥";

            if(!max){
                boundlines[0].text('');
                boundlines[2].text('');
                return;
            }

            if(boundlines.length){ // redraw
                pair = [{X: 0, Y: min.Y}, {X: width, Y: min.Y}];
                boundlines[0].text(dollar+min.d.avgprice).attr('y', min.Y - 10, 'boundery_price');
                ChartHelper.line(pair, 'line_bound', boundlines[1]);
                pair = [{X: 0, Y: max.Y}, {X: width, Y: max.Y}];
                boundlines[2].text(dollar+max.d.avgprice).attr('y', max.Y + 20, 'boundery_price');
                ChartHelper.line(pair, 'line_bound', boundlines[3]);
            }else{ // create
                pair = [{X: 0, Y: min.Y}, {X: width, Y: min.Y}];
                text = ChartHelper.text(dollar+min.d.avgprice, 5, min.Y - 10, 'boundery_price');
                line = ChartHelper.line(pair, 'line_bound');
                this.shapes.boundlines.push(text);
                this.shapes.boundlines.push(line);

                pair = [{X: 0, Y: max.Y}, {X: width, Y: max.Y}];
                text = ChartHelper.text(dollar+max.d.avgprice, 5, max.Y + 20, 'boundery_price');
                line = ChartHelper.line(pair, 'line_bound');
                this.shapes.boundlines.push(text);
                this.shapes.boundlines.push(line);                
            }
        },

        _drawLine: function (points, nightsList) {
            var self = this;

            var pairing = false, dataPoints = [], nullPoint, 
                lineIndex = 0, j = 0, nights = nightsList[j], 
                backlines = self.shapes.backlines[nights] || [],
                lines = self.shapes.lines[nights] || [],
                lastpoint = points[j * 30 + self.days - 1];

            for (var i = 0, l = points.length-1; i < l; i++) {      
                if(i % this.days == 29){
                    self.shapes.backlines[nights] = backlines;// save backlines
                    self.shapes.lines[nights] = lines;// save lines
                    beginNextLine();
                    continue;
                }

                drawDataLine(points[i], points[i+1]);
                drawDashLine(points[i], points[i+1]);
            }
            self.shapes.backlines[nights] = backlines;// save backlines
            self.shapes.lines[nights] = lines;// save lines

            function beginNextLine () {
                // reset the line drawing paramters
                pairing = false, dataPoints = [], nullPoint = undefined,
                j++, lineIndex = 0, nights = nightsList[j], 
                backlines = self.shapes.backlines[nights] || [],
                lines = self.shapes.lines[nights] || [],
                lastpoint = points[j * 30 + self.days - 1];
            }

            function drawDataLine (pointA, pointB) {
                if(!isNaN(pointA.Y)) // push data point to dataline
                    dataPoints.push(pointA);

                if(!isNaN(pointA.Y) && (isNaN(pointB.Y) || pointB == lastpoint)){ // dataline end
                    if(!isNaN(pointB.Y) && pointB == lastpoint)
                         dataPoints.push(pointB);
                    if(dataPoints.length > 1){ 
                        var className = 'nights' + nights + ' line',
                            backClassName = 'line_back' + nights + ' line';
                        drawLine(dataPoints, [backClassName, className]);
                    }
                    dataPoints = []; //reset data points
                }
            }

            function drawDashLine (pointA, pointB) {
                if(!isNaN(pointA.Y) && isNaN(pointB.Y)){ // dashline start
                    pairing = true;
                    nullPoint = pointA;
                }
                if(pairing && isNaN(pointA.Y) && !isNaN(pointB.Y)){ // dashline end
                    pairing = false;
                    var className =  'nights' + nights + ' line dash',
                        backClassName = 'line_back' + nights + ' line dash';
                    drawLine([nullPoint, pointB], [backClassName, className]);
                }
            }

            function drawLine (points, classNames) {
                var backline = ChartHelper.line(points, classNames[0], backlines[lineIndex]),
                    line = ChartHelper.line(points, classNames[1], lines[lineIndex]);
                !backlines[lineIndex] && backlines.push(backline); // save the created backline
                !lines[lineIndex] && lines.push(line); // save the created line
                lineIndex ++;
            }
        },

        _drawPoints: function (points, nightsList) {
            var self = this;
            nightsList.forEach(function (nights, i) {
                // get the points of target nights
                var ps = points.slice(i*self.days, (i + 1)*self.days);
                if(self.shapes.points[nights]){
                    // update
                    ChartHelper.circle(ps, 4, null, self.shapes.points[nights]);
                }else{
                    // create
                    var circles = 
                        ChartHelper.circle(ps, 4, 'nights'+nights + ' point');
                    self.shapes.points[nights] = circles;
                }
            });
            
        }
    }

    PriceChart.Action = function (nights) {
        this.nights = nights;
        this.points = PriceChart.shapes.points[nights];
        this.baselines = PriceChart.shapes.baselines;
        this.lines = PriceChart.shapes.backlines;
        this._initTip();
        this._initEvents();
    }
    PriceChart.Action.last = undefined; // the last point and data shared between action
    PriceChart.Action.prototype = {
        constructor: PriceChart.Action,

        over: function (p, d) {
            // point over
            p.classed('point_hover', true);
            p.attr('r', 7);
            Tools.setIEClass(p);
            // highlight baselines
            var bl = this.baselines.filter(function (line, i) {
                    return line.X == d.X;
                })[0];
            bl.attr('class', 'line_base_bold');
            Tools.setIEClass(bl);
            // highlight line
            var lines = this.lines[d.d.nights];
            lines.forEach(function (line, i) {
                line.classed('highlight', true);
                Tools.setIEClass(line);
            });
        },

        out: function () {
            var p = PriceChart.Action.last[0];
            var d = PriceChart.Action.last[1];
            // cancel when last line is removed
            if(!this.lines[d.d.nights]) return;
            // point out
            p.classed('point_hover', false);
            p.attr('r', 4);
            Tools.setIEClass(p);
            // normalize baseline
            var bl = this.baselines.filter(function (line, i) {
                    return line.X == p.attr('cx');
                })[0];
            bl.attr('class', 'line_base');                        
            Tools.setIEClass(bl);
            // normalize line
            var lines = this.lines[d.d.nights];
            lines.forEach(function (line, i) {
                line.classed('highlight', false);
                Tools.setIEClass(line);
            });
        },

        _initTip: function () {
            var self = this;

            this.tip = new Tip({
                container: d3.select('#divChart').select('.flthtl_svg'), // ChartHelper.svg
                selector:  PriceChart.shapes.points[this.nights],  //'circle.nights' + this.nights,
                tipEl: d3.select('#tipPrice'),
                arrowSelector: '#tipArrow',
                arrowClass: "fh_jmp_arrow fh_jmp_boult",
                triggerEvt: 'mouseover.nights' + this.nights,
                delay: 500,
                dataConverter: function(data){
                    return data.d;
                }
            });

            this.tip.on('show', function (tip, pos, event) {
                adjustTipPos(tip, pos);

                // make last point to out status
                PriceChart.Action.last && self.out();
                // save last
                var target = (Tools.IE && Tools.IE < 9) ? d3.select(event._target) : d3.select(event.target);
                PriceChart.Action.last = [target, tip.data];
                // show over point  effect
                self.over.apply(self, PriceChart.Action.last);
            }).on('hide', function (tip) {
                // make point to out status
                PriceChart.Action.last && self.out();
            });

            function adjustTipPos (tip, pos) {
                // adjust the tip position
                var left = pos.tip.left,  top = pos.tip.top;
                // left adjust
                if(pos.arrow.left <= 10){
                    left = left - 10
                }else{
                    left = left + 8;
                    arrowLeft = tip.tipDim.width - 24;
                    tip.arrowEl.style({left: arrowLeft+'px'});
                }
                // top adjust
                top = top + (pos.arrow.className == 'fh_jmp_arrow' ? -6 : 6);
                tip.tipEl.style({top: top + 'px', left: left + 'px'});
            }
        },

        _initEvents: function () {
            // https://github.com/mbostock/d3/wiki/Selections#wiki-on
            this.points && this.points.on('click.chart',  function(d){ PriceBoard.search(d.d) });
        }
    }

    var ChartHelper = {
        
        svg: undefined, // the svg to draw the chart needed to be inited.

        mainCoord: 'Y', // the coordinate which the data change in irregularly

        duration: 800,
        delay: 0,

        bounds: {
            minX: 0, maxX: 100,
            minY: 0, maxY: 100,
            steps: 10, // specified the number of parts the sub coordinate(x axis) divide into 
            padding: 0 // the padding between 0 and the minvalue 
        },

        // compute the factors which are used to map an array to coordinate values in the chart
        // data: the data array
        // method: the method to locate the data  --optional
        //  'l' for the linear function which's default
        //  'c' for the circle function
        factor: function (array, method) {
            // to do with `method`
            
            var bounds = {
                    max: this.bounds['max'+this.mainCoord] - this.bounds.padding,
                    min: this.bounds['min'+this.mainCoord] + this.bounds.padding
                };
            // filter out the non-number data
            array = array.filter(function (d) {
                    return typeof d === 'number';
                });

            var min = Math.min.apply(null, array),
                max = Math.max.apply(null, array);

            if(max == min) min = max - 100; // fault tolerant

            // method of undetermined coefficients
            var k = (bounds.max - bounds.min) / (min - max);
            var b = (bounds.max * max - bounds.min * min) / (max - min);
            return {k: k, b: b};
        },

        // map data to points in the chart
        // data: the data array
        // key: the function to get the key property to draw --optional
        locate: function(data, key) {
            var y = this.mainCoord,
                x = y == 'Y' ? 'X' : 'Y';
            var arr;

            if(key) arr = data.map(key);
            // main coordinate
            var factors = this.factor(arr);
            // sub coordinate
            var xmin = this.bounds['min'+x],
                steps = this.bounds.steps,
                xstep = (this.bounds['max'+x] - xmin)/(steps - 1);

            return (
                arr.map(function (item, i) {
                    var ret = {d: data[i]};
                    if(typeof item === 'number')// only deal with number
                        ret[y] = factors.k * item + factors.b;
                    ret[x] = xstep * (i % steps) + xmin;
                    return ret;
                })
            );
        },

        // draw line
        // points: the points in the line
        // className: the line class --optional
        // line: thie line to be update --optional
        line: function(points, className, line) {
            var isCreate = !!!line;
            var line = line || this.svg.append('polyline');

            // filter out the invalid points
            points = points.filter(function (p) {
                return !isNaN(p.X + p.Y);
            });

            var y = this.mainCoord, 
                x = y == 'Y' ? 'X' : 'Y';

            var bounds = this.bounds;
            var startY = y == 'Y' ? bounds.maxY : bounds.minX;

            var starts = points.map(function (p) {
                return p[x] + ' ' + startY;
            });
            var ends = points.map(function (p) {
                return p[x] + ' ' + p[y];
            });
            
            if(className){
                line.attr('class', className);
                Tools.setIEClass(line);
            }
            
            if(isCreate)
                line.attr('points', starts.join(','));

            line.transition()
                .duration(this.duration)
                .attr('points', ends.join(','));

            return line;
        },

        // draw circle
        // points: the circle centers
        // r: the radius of circle
        // className: the circle class --optional
        // circles: the circles to be updated --optional
        circle: function (points, r, className, circles) {
            // filter out the invalid points
            points = points.filter(function (p) {
                return !isNaN(p.X + p.Y);
            });

            var y = this.mainCoord, 
                x = y == 'Y' ? 'X' : 'Y';

            if(circles){
                circles
                    .data(points)
                    .transition(this.duration)
                    .attr('cx', function(d){ return d[x]; })
                    .attr('cy', function(d){ return d[y]; })
                    .attr('r' , r);
                className && circles.attr('class', className);
            }else{
                circles = this.svg.append('g')
                    .selectAll('circle')
                    .data(points)
                    .enter()
                    .append('circle')
                    .attr('cx', function(d){ return d[x]; })
                    .attr('cy', function(d){ return d[y]; })
                    .attr('r' , 1);

                if(className){
                    circles.attr('class', className);
                    circles.each(function () {
                        Tools.setIEClass(d3.select(this));
                    });
                }
                
                circles.transition(this.duration).attr('r', r);
            }

            return circles;
        },

        // draw text
        text: function (text, x, y, className) {
            var text = this.svg.append('text')
                .text(text)
                .attr('x', x)
                .attr('y', y)

            if(className){
                text.attr('class', className);
                Tools.setIEClass(text);
            }

            return text;
        },

        // draw rect
        rect: function (width, height, x, y, className, rx, ry) {
            var rect = this.svg.append('rect')
                .attr('width', width)
                .attr('height', height);
            !isNaN(x)  && rect.attr('x', x).attr('y', y);
            !isNaN(rx) && rect.attr('rx',rx).attr('ry', ry);

            if(className){
                rect.attr('class', className);
                Tools.setIEClass(rect);
            }

            return rect;
        },

        // draw image
        image: function (width, height, x, y, src, className) {
            var img = this.svg.append('image')
                .attr('width', width)
                .attr('height', height)
                .attr('x', x)
                .attr('y', y)
                .attr('xlink:href', src);
            return img;
        }
    }
});


/** Data Specification
{
    "0" : [// 星级不限
        {
            id : 12, //低价id
            date : "2013-08-12", //出发日期
            nights : 4, // 晚数
            price : 2674, //总价
            speicalsale: 1, // 特惠: 1=是 0=否
            flights : [{
                    from : "上海",
                    to : "北京",
                    fromid : 2,
                    toid : 1,
                    formpy : "shanghai",
                    topy : "beijing",
                    departflight : "东方航空",
                    returnflight : "上海航空",
                    departdate : "2013-08-12",
                    returndate : "2013-08-16"
                }
            ],
            hotels : [{
                    city : "上海",
                    cityid : 2,
                    checkin : "2013-08-12",
                    checkout : "2013-08-16",
                    name: "如家快捷",
                    nights : 3
                }
            ]
        }
    ],
    "5" : [// 五星级
        {
            id : 13,
            date : "2013-08-12",
            nights : 4,
            speicalsale: 0,
            price : 0,
            flight : null, // 没有数据时 null or []
            hotels : null
        }
    ]
}

// http://vacations.ctrip.com/diy/round-shanghai2-beijing1/?low=12 
// http://vacations.ctrip.com/diy/round-shanghai2-beijing1/star4?low=14

*/