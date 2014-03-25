/*
* author:shiz@ctrip.com
* date:2013-12-16
*/
define(function(require, exports, module) {

	var S = require('common').S;
	var Mod = require('common').Mod;
	Mod.EventEmitter = require('tools/eventemitter.js');
	require.async('mods');

	// tip
	(function (exports) {

		var EventEmitter = require('tools/eventemitter.js');

        var ALIGNMODE = {
            topleft    : 1,
            topright   : 2,
            bottomright: 3,
            bottomleft : 4
        }

    	var defaults = {
    		$tip: undefined, // tip element
    		$arrow: undefined, // arrow element
    		triggerEvt: 'mouseenter',
    		alignMode: undefined,
    		delay: 500,
    		bounds: dimension(document.body), // tip visual boundaries
    		tipDim: undefined,
    		arrowDim: { height: 0, width: 0},
    		_timer: undefined
    	}

        var Tip = function (options) {

            EventEmitter.extend(this);

        	$.extend(true, this, defaults, options);

            this.$tip.css({'position': 'absolute', 'top': '-999px'});

            this._events = { beforeShow: [], show: [], hide: [] };

            this._bindEvents();
        }

        Tip.prototype = {
            constructor: Tip,

            _computeDimensions: function () {
                this.tipDim = dimension(this.$tip[0]);
            },

            _bindEvents: function (triggers) {
            	var self = this;

            	// bind events to triggers
            	if(triggers){
            		if(this.triggerEvt == 'mouseenter')
	            		triggers.each(function (trigger) {
	                    	trigger.bind('mouseenter', self.show.bind(self))
	                    		.bind('mouseleave', self.hide.bind(self));
	                    });
	            	else
	            		triggers.each(function (trigger) {
	                    	trigger.bind(self.triggerEvt, self.show.bind(self));
	                    });
	            	return;
            	}                

            	// init tip events
            	if(this.triggerEvt == 'mouseenter'){
                    this.$tip.bind('mouseenter', function () {
               			clearTimeout(self._timer);
                    }).bind('mouseleave', this.hide.bind(this));
                }else{
                	$(document.body).on('click', this.hide.bind(this));
                }

            },

            show: function (e) {
                var self = this;

                clearTimeout(self._timer);

                var trigger = e.target;
                var triggerDim = dimension(trigger);

                this._computeDimensions();

                var pos = this._calPos(triggerDim, this.alignMode);
                this._render(pos, e);
            },

            hide: function (e) {
                var self = this;
                this._timer =
                    setTimeout(function () {
                        self.$tip.css({'top': '-999px'});
                        self._events.hide.each(function (handler) {
                            handler(self, e);
                        });  
                    }, this.delay);
            },

            reg: function (triggers, container) {
            	this.bounds = container ? dimension(container) : this.bounds;
            	!triggers.length && (triggers = [triggers]);
            	this._bindEvents(triggers);
            },

            _calPos: function (triggerDim, alignMode) {

                var tipDim = this.tipDim,
                    arrowDim = this.arrowDim,
                    bounds = this.bounds;

                var top, left, arrowTop, arrowLeft;
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

                }else if(alignMode == ALIGNMODE.bottomleft || (posFit.bottom && posFit.right)){

                    // put it on bottom align to left
                    top = triggerDim.bottom,
                    left = triggerDim.left;
                    arrowLeft = triggerDim.width / 2 - arrowDim.width / 2 ;
                    arrowTop = - (arrowDim.height + tipDim.border);

                }else if(alignMode == ALIGNMODE.topright || posFit.left){ // ignore the narrow bounds
                
                    // put it on top align to right
                    top = triggerDim.top - tipDim.height,
                    left = triggerDim.right - tipDim.width;
                    arrowLeft = tipDim.width - (triggerDim.width / 2 + arrowDim.width / 2) ;
                    arrowTop = tipDim.height + tipDim.border;
                    
                }else{
                
                    // put it on top align to left
                    top = triggerDim.top - tipDim.height,
                    left = triggerDim.left;
                    arrowLeft = triggerDim.width / 2 - arrowDim.width / 2 ;
                    arrowTop = tipDim.height + tipDim.border;
                    
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
                        left: arrowLeft
                    }
                }
            },

            _render: function (pos, e) {
            	this._events.beforeShow.each(function (handler) {
                    handler(self, pos, e);
                });

                this.$tip.css({'top': pos.tip.top + 'px', 'left': pos.tip.left + 'px'});

                this._events.show.each(function (handler) {
                    handler(self, pos, e);
                });
            }
        }

        Tip.ALIGNMODE = ALIGNMODE;

        // get the dimension of the specified element
        function dimension(el){
            var dim = el.getBoundingClientRect();
            
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

        function hacklib () {
		    var orginBind = $.fn.bind;

		    var mapping = {
		        'mouseenter': 'mouseover',
		        'mouseleave': 'mouseout' 
		    }

		    $.fn.bind = function (evtName, fn) {
		        var args = Array.prototype.slice.call(arguments);
		        if(evtName !== 'mouseenter' && evtName !== 'mouseleave')
		            return orginBind.apply(this, args);
		        
		        var target = this[0];

		        var fnWrapper = function (e) {
		            var related = e.relatedTarget;
		            if ( !related || (related !== target && !(target.compareDocumentPosition(related) & 16)) )
		                fn(e);
		        }

		        return orginBind.apply(this, [mapping[evtName], fnWrapper]);
		    }
		}

		if( !('onmouseenter' in document.createElement('div')) )
		    hacklib();

        exports.Tip = Tip;
	})(window);
	// 景点图片查看
	var SceneViewer = {

		$container: $('#divSceneViewer'),

		tmpls: {
			thumbnail: '\
				<a title="${title}" href="javascript:;" data-index="${index}">\
			        <img width="82px" height="46px" alt="${title}" src="${thumbnail}">\
			    </a>'
		},

		init: function () {
			if(!this.$container.length) return;

			require.async('tools/animate');

			this._current = 0;
			this._count = 1;
			this._pageSize = 5;
			this._pageIndex = 0;
			this._pageCount = 1;
			this._timer = undefined;
			this._data = SSHConfig.imageData;

			this._init();
		},

		_initElements: function () {
			var self = this;
			["view", "title", "play", "next", "prev", "list", "nextPage", "prevPage"]
				.each(function (item) {
					self["$"+item] = self.$container.find('[data-sv="'+item+'"]');
				});
			// compute pageCount
			this._count = this._data.length;
			this._pageCount = Math.ceil(this._count / this._pageSize);
		},

		_bindEvents: function () {
			this.$play.bind('click', this._play.bind(this));
			this.$next.bind('click', this.forward.bind(this));
			this.$prev.bind('click', this.backward.bind(this));
			this.$list.bind('click', this._itemClick.bind(this));
			this.$nextPage.bind('click', this.nextPage.bind(this));
			this.$prevPage.bind('click', this.prevPage.bind(this));
			
			this.$next.bind('click', this.stop.bind(this));
			this.$prev.bind('click', this.stop.bind(this));
		},

		_play: function (e) {
			(e.target.className == 'control-stop')?
				this.stop() : this.start();
		},

		_itemClick: function (e) {
			var target = e.target;
			if(target.nodeName == 'IMG') target = target.parentNode;
			if(target.nodeName != 'A') return;
			var index = +target.getAttribute('data-index');
			this.show(index);
			this.stop();
		},

		_init: function () {
			this._initElements();
			this._render();
			this._bindEvents();

			this.show(0);

			this.start();
		},

		_render: function () {
			// render
			var data = this._data,
				tmpl = this.tmpls.thumbnail,
				html = "", 
				groups = [],
				group = [], 
				groupSize = 5;

			data.each(function (item, i) {
				item.index = i;
				group.push($.tmpl.render(tmpl, item));

				if(i % groupSize == 4){
					groups.push("<li>"+group.join("")+"</li>");
					group = [];
				}
			});

			if(data.length % groupSize != 0)
				groups.push("<li>"+group.join("")+"</li>");

			this.$list.html(groups.join(""));

			this.$viewList = this.$list.find('a');

			if(data.length > groupSize)
				this.$nextPage.removeClass('pkg-circle-next-disable');
		},

		fetch: function () {
			var self = this;
			var url = SSHConfig.URL.SIGHT_PICTURE + '?sightId=' + $('#hSightId').value();
			$.ajax(url, {
				method: cQuery.AJAX_METHOD_GET,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(!res) return;
                    self._data = cQuery.parseJSON(res);
                    self._init();
                }
			});
		},

		// stop auto switch
		stop: function () {
			clearInterval(this._timer);
			// update ui
			this.$play[0].className = 'control-play';
		},
		// start auto switch
		start: function () {
			var self = this;
			this._timer = 
				setInterval(function () {
					if(self._current == self._count - 1){
						self.show(0);
						self.gotoPage(0);
					}else{
						self.forward();
					}
				}, 5000);
			// update ui
			this.$play[0].className = 'control-stop';
		},
		// next image view
		forward: function () {
			var cur = this._current;
			this.show( cur + 1 );
		},
		// prev image view
		backward: function () {
			var cur = this._current;
			this.show( cur - 1 );
		},
		// change large view
		show: function (index) {
			if(index >= this._count) return;

			var cur = this._current;
			this.$viewList[cur].className = '';
			this.$viewList[index].className = 'current';
			this.$view[0].src = this._data[index].bigurl;
		    this.$title[0].innerHTML = (index + 1) + '/' + this._count + this._data[index].title;

			this._current = index;

			// update page dispaly
			var pageIndex = Math.floor(this._current / this._pageSize);
			(pageIndex != this._pageIndex) && this.gotoPage(pageIndex);
		},
		// next page of images
		nextPage: function () {
			this.gotoPage(this._pageIndex + 1);
		},
		// prev page of images
		prevPage: function () {
			this.gotoPage(this._pageIndex - 1);
		},
		// switch to the specified page
		gotoPage: function (index) {
			if(index >= this._pageCount) return;

			var viewport = this.$list.parentNode();
			viewport.animate({
				scrollLeft: index * 84,
				_onDom: true
			});

			this._pageIndex = index;

			// update arrow display
			this.$prevPage.removeClass('pkg-circle-prev-disable');
			this.$nextPage.removeClass('pkg-circle-next-disable');
			if(this._pageIndex == 0)
				this.$prevPage.addClass('pkg-circle-prev-disable');
			if(this._pageIndex == this._pageCount - 1)
				this.$nextPage.addClass('pkg-circle-next-disable');
		}
	}

	// followed menu
	;(function (exports) {
		
		var FollowedMenu = function (opts) {
			this.$menu 	  = $(opts.menu);
			this.$tabs	  = this.$menu.find('[data-tab]');
			this.$contents = $(opts.content + ' [data-tab]');

			this.classes = opts.classes;

			this.menuHeight = S.height(this.$menu);
			this.threshold = this.$menu.offset().top;
			this.isFixed = false;

			var self = this;
			require.async('tools/eventemitter.js', function (EventEmitter) {
	            EventEmitter.extend(self);
	        });

			this._bindEvents();

			this.follow();
		}

		FollowedMenu.prototype = {
			constructor: FollowedMenu,

			_bindEvents: function () {
				var self = this;

				$(window).bind('scroll', this.follow.bind(this));

				this.$tabs.each(function (tab, i) {
					tab.bind('click', self.scrollTo.bind(self, tab.attr('data-tab')));
				});
			},
			// follow the user scrolling to switch the display of the menu
			follow: function () {
				var st = +(document.documentElement.scrollTop || document.body.scrollTop);
				(st > this.threshold) ? this.fixMenu(st) : this.unfixMenu(st);
				this.switchTab(st);
			},

			fixMenu: function (st) {
				var menu = this.$menu;
				if(!cQuery.browser.isIE6){
					if(this.isFixed) return;
					this.classes.fixed ?
	                    menu.addClass(this.classes.fixed) :
	                    (menu[0].style.position = 'fixed') ;	
                }else{
                	menu.css({
                		position: 'absolute',
                		bottom: 'auto',
                		top: st + 'px',
                		zIndex: 100
                	});
                }
                // 上端间隙

				this.isFixed = true;

				this.emit('fix');
			},
			
			unfixMenu: function (st) {
				if(!this.isFixed) return;

				var menu = this.$menu;
				if(!cQuery.browser.isIE6){
					this.classes.fixed ?
                        menu.removeClass(this.classes.fixed) :
                        (menu[0].style.position = '') ;	
                }else{
                	menu[0].style.position = "static";
                }

				this.isFixed = false;

				this.emit('static');
			},
			// highlight the tab with the scrollTop
			switchTab: function (st) {
				var curStyle = this.classes.current;
				var tabs = this.$tabs;
				var i = this.$contents.length - 1,
					isSet = false;

				while(i >= 0){
					if(!this.$contents[i] || !this.$contents[i].parentNode){
						i--;
						continue; // 判断结点是否存在
					}
						
					var top = this._getPos($(this.$contents[i]));
					if(!isSet && st >= Math.floor(top) ){
						$(tabs[i]).addClass(curStyle);
						isSet = true;
					}else{
						$(tabs[i]).removeClass(curStyle);
					}
					i--;
				}

				if(!isSet) $(tabs[0]).addClass(curStyle);
			},
			// scroll to the content with the specified tab
			scrollTo: function (tabName) {
				var content;
				this.$contents.each(function (item, i) {
					if(item.attr('data-tab') == tabName)
						content = item;
				});

				var status = this.isFixed;

				window.scrollTo(0, this._getPos(content));
 
				var self = this;
				setTimeout(function () { // executing the adjustment when the scroll event is finished
					// adjust the position when the menu fixed status changed
					if(status != self.isFixed) 
						window.scrollTo(0, self._getPos(content));
				}, 200);				
			},

			_getPos: function (content) {
				return content.offset().top - this.menuHeight;
			},

			update: function () {
				
			}
		}

		exports.FollowedMenu = FollowedMenu;
	})(Mod);

	var ProductList = {

		$container: $('#divProductList'),

		$txtUseDate: $('#txtUseDate'),

		_cache: {},
		// 修改日期
		_initUseDate: function () {
			var self = this;

			S.show(this.$txtUseDate);
			S.hide($('#spanUseDate'));
			S.hide($('#lnkEditUseDate'));

			var calendar =
				this.$txtUseDate.regMod('calendar', '3.0', {
					options: {
	                    minDate: this.minDate,
	                    maxDate: this.maxDate,
	                    showWeek: true
	                },
	                listeners: {
	                    onChange: function (input, v) {
	                        self.fetch(v);
	                    }
	                }
				});

			calendar.method('setWeek', this.$txtUseDate[0]);
		},

		loading: function (isShow) {
			if(isShow){
				S.hide(this.$container);
				S.show(S.next(this.$container));
			}else{
				S.show(this.$container);
				S.hide(S.next(this.$container)) ;
			}
		},

		fetch: function (date) {
			this.loading(true);

			var self = this;

			if(this._cache[date]){ // read ffrom cache
				this._fetchSuccess(this._cache[date]);
				return;
			}

			var url = SSHConfig.URL.PRODUCT_INFO + "?usedate=" + date;
			$.ajax(url, {
				method: cQuery.AJAX_METHOD_POST,
				context: {
					PackageSearchParams: $('#hPackageSearchParams').value()
				},
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(!res) return;
                    self._fetchSuccess(res);
                    self._cache[date] = res;
                }
			});
		},

		_fetchSuccess: function (res) {
			this.loading(false);
            this.$container.html(res);
			this._initProducts();
			// emit product updating event
			this.emit('update');
		},
		// 初始化产品相关模块与事件
		_initProducts: function () {
			// 绑定显示事件到立即预订上
            PriceCalendar.reg(this.$container.find('[data-role="order"]'));
            // 设置入住日期
            PriceCalendar.setDate(this.$txtUseDate.value());
            // 初始化酒店列表
            $('#divProductList li').each(function(el, i){
				var hotelId = el.attr('data-hotel');
	            if(!hotelId) return;
				Hotel.hotels[hotelId] = new Hotel(hotelId, el);
				 // X资源显示
	    		XView.reg(el.find('div.htl_con>div.recom_sce'));
			});
		},

		init: function () {
			if(!this.$container.length) return;

			require.async('tools/eventdispatcher', function (mod) {
				Mod.EventDispatcher = mod;
			});

			Mod.EventEmitter.extend(this);

			this.fetch();

			XView.init();

			this._getDates();

			this._initUseDate();
		},

		_getDates: function () {
			var range = $('#hDateRange').value().split('|');
			this.minDate = range[0];
			this.maxDate = range[1];
		}
	}

	// 酒店
	var Hotel = function (hotelId, container){
		this.hotelId = hotelId; 
	    this.roomId = 0; //选择的房型id
	    this.isGotAllRooms = false; //是否请求了所有房型
	    this.isGettingRooms = false; //是否在请求房型数据

	    this.container = container;
	    this.tbRoomList = undefined; // 房型列表
	    this.selectedBtn = undefined; //选择的选择按钮
	    this.selectedRow = undefined;// 选择的行
	    
	    // 右边价格元素
	    this.divPrice = container.find('div.price_cost');
	    // 第一个房型元素
	    this.firstRoom = container.find('div.htl_recom>em.recom_type');
	    this.roomId = this.firstRoom.attr('data-room');
	    // 更多房型
	    this.lnkMore = container.find('div.htl_recom a[data-role="allrooms"]');
	    this.lnkMore.bind('click', this.showAllRooms.bind(this));
	    // 预订
	    container.find('input[data-role="order"]').bind('click', this.order.bind(this));
	}

	Hotel.personCount = $('#hPersonCount').value();
	Hotel.hotels = {};

	Hotel.prototype = {
		constructor: Hotel,

	    _loading: function (type) {
	        var ctx = S.parent(this.lnkMore,'.htl_recom');
	        var loading = S.next(ctx);
	        if(type == 'show'){
	            S.show(ctx);
	            S.show(loading);
	        }else{
	            S.hide(loading);
	            S.hide(ctx);
	        }
	        return loading;
	    },
			
		_ajaxAllRooms: function (query, callback){
			$.ajax(SSHConfig.URL.HOTEL_ALL_ROOM + '?hotel=' + this.hotelId + '&usedate=' + $('#txtUseDate').value(), {
				method: cQuery.AJAX_METHOD_POST,
				context: {
					PackageSearchParams: $('#hPackageSearchParams').value()
				},
				cache: true,
				onerror: function () { },
				onsuccess: function (xhr, res) {
					callback(res);
				}
			});
		},

		_initAllRooms: function (query, res){
	        var loading = this._loading('hide');

	        if(res == '' || res == 'null'){
	            this.linkMore.onclick = null;
	            return;
	        }

	        try{
	            this.tbRoomList = $(S.create(res));
	            S.insertAfter(this.tbRoomList, loading);
	        }catch(ex){
	            S.show(S.parent(this.lnkMore,'.htl_recom'));
	            console && console.log('Room list data error');
	            return;
	        }

	        this.isGotAllRooms = true;
	        this.isGettingRooms = false;

	        // register event listener
	        new Mod.EventDispatcher({
	                ctx: this.tbRoomList,
	                selector: 'a, input, select',
	                event: 'click change',
	                cmds: [
	                    {selector: 'a.more_type', func: this.hideAllRooms.bind(this)},
	                    {selector: 'input',       func: this.selectRoom.bind(this)},
	                    {selector: 'select',      func: this.changePrices.bind(this)},
	                    {selector: 'a.recom_type',func: this.toggleDetails.bind(this)},
	                    {selector: 'a.btn_up',    func: this.hideDetails.bind(this)}
	                ]
	            });
	        // fix onchange for ie
	        if(cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8)
	            this.tbRoomList.find('select').bind('change', this.changePrices.bind(this));
	        // select the specified room
	        var self = this;
	        setTimeout(function () {
	            var btn = self.tbRoomList
	                .find('tr[data-room="'+self.roomId+'"]>td:last')
	                .find('input');
	            self.selectRoom(btn[0])
	        },30);
	        
		},
		
		showAllRooms: function (num, query){
			if (this.isGotAllRooms) {
	            S.show(this.tbRoomList);
	            this._loading('hide');
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
	        while(tr.hasClass('append_detail1') || tr.hasClass('append_detail2')){
	            if(tr.hasClass('append_detail1')){
	                tr.hasClass('hidden') ? tr.removeClass('hidden') : tr.addClass('hidden');
	            }
	            tr = $(S.next(tr));
	        };
	    },

	    hideDetails: function (target) {
	        var tr = S.parent(target, 'tr');
	        S.hide(tr);
	    },
		
		selectRoom: function (target){
	        this.selectedRow = S.parent(target, 'tr');
			this.roomId = this.selectedRow.getAttribute('data-room');
	        this._changeSelect(target);
	        this.changePrices();
		},
	    // 改变价格信息 
	    changePrices: function (roomId, e){
	        if(e && e.type != 'change') return; // filter out click event

	        this._changeDiffPrices();

	        var tr = this.selectedRow;
	        var prices = tr.cells[5].getAttribute('data-price');
	        prices = prices.split('|');

	       	this._toggleSavePrice(prices[1]);

            prices.splice(1, 0, 0);
	        this.divPrice.find('span.prices, div.price_per_single')
	            .each(function(item, i){
	                item[0].innerHTML = item[0].innerHTML.replace(/\d+/, prices[i]);
	            });

	        this._changeFoldDisplay();
	    },
	    // 切换节省价显示
	    _toggleSavePrice: function (saveprice) {
	    	var tr = this.divPrice.find('tr.col_oran');
	    	saveprice > 0 ? S.show(tr) : S.hide(tr);
	    },
	    // 改变差价信息
	    _changeDiffPrices: function () {
	        var self = this;
	        var tr = this.selectedRow;
	        var baseprice = +(tr.cells[5].getAttribute('data-price').split('|')[2]);
	        var rows = this.tbRoomList.find('tr:not(.append_detail1,.down)');
	        rows.each(function(row, i){
	            if(i == 0) return; // heads
	            var price = +(row[0].cells[5].getAttribute('data-price').split('|')[2]);
	            var diff = price - baseprice ;
	            row[0].cells[4].firstChild.innerHTML = 
	                (diff == 0 ? "" : (diff > 0 ? "+" : "-")) +
	                "<dfn>&yen;</dfn>" + 
	                Math.abs(diff);
	        });
	    },
	    // 改变选择按钮
		_changeSelect: function (obj) {
			var selected = this.selectedBtn;

	        if(selected){
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

	        var cellName = $(tr.cells[0]);
	        this.firstRoom[0].innerHTML = cellName.find('a.recom_type')[0] ? 
                    cellName.find('a.recom_type').text().split(" ")[0] : //去掉`礼`字
                    cellName.find('em').attr("data-master");

	        var ctx = this.firstRoom.parentNode();
	        var sps = ctx.find('span');
	        sps[0].innerHTML = tr.cells[1].innerHTML; // 床型
	        sps[1].innerHTML = tr.cells[2].firstChild.innerHTML; // 早餐
	        sps[2].innerHTML = SSHConfig.texts.room[0] + tr.cells[3].firstChild.innerHTML; // 宽带
	        sps[3].innerHTML = tr.cells[5].innerHTML + SSHConfig.texts.room[1] + "<b></b>"; // 间数

	        // strong logic
        	sps[1].className = sps[1].innerHTML != '无早' ? "strong" : "";
	        sps[2].className = sps[2].innerHTML == '宽带免费' ? "strong" : "";

	        var spanGift = $(tr).find('span.icon_gift'),
	        	giftBox  = ctx.find('div.gift_box');
	        if(spanGift[0]){
	        	var gift = $.parseJSON(spanGift.attr("data-params"));
	        	giftBox.html(spanGift.ohtml() + gift.options.content.giftdesc);
	        }else{
	        	giftBox.html("");
	        }
	    },
	    // 保存post数据
	    save: function () {
	        var xids = [];
	        this.container.find('div.htl_con>div.recom_sce').find('dd>a')
                .each(function (item, i) {
	                var id = item.attr('data-xid');
	                id && xids.push(id);
	            }); 
	        $('#hXProducts').value(xids.join('|'));

	        $('#hHotelID').value(this.hotelId);
	        $('#hRoomID').value(this.roomId);
	    },
	    // 立即预订
		order: function () {
			this.save();
			__SSO_booking('', '1');
		}
	}

	var XView = {

		cache: {},

		reg: function (xcontainer) {
			var self = this;
			xcontainer.bind('click', function (e) {
	            var target = e.target;
	            if(target.nodeName != 'A') return;

	            var xid = target.getAttribute('data-xid');
	            var xtype = target.getAttribute('data-xtype');
	            if(!xid) return;

	            self.show();
	            var cache = self.cache;

	            if(cache[xid]){
	                self.render(cache[xid][0], cache[xid][1]);
	            }else{
	                self.render(target.innerHTML, '');
	                Mod.showLoading(self.$divXProduct);
	                self.getData(xid, xtype, target.innerHTML);
	            }
	        });
		},

		init: function () {
			this.$divXProduct = $('#divXProduct');
	        this.$divXProduct.find('>a').bind('click', this.hide.bind(this));
		},

		show: function () {
			var $divXProduct = this.$divXProduct;
			S.show($divXProduct);
            $divXProduct.mask(true, function () {
                S.hide($divXProduct);
            });
		},

		hide: function () {
			this.$divXProduct.unmask(true);
		},

		render: function (title, html) {
            this.$divXProduct.find('.popup_tit')[0].innerHTML = title.replace(/（[^）]+）/,'');
            this.$divXProduct.find('.popup_con')[0].innerHTML = html;
        },

        getData: function (xid, xtype, title) {
        	var url = SSHConfig.URL.X_INFO + "?productId=" + xid + "&productType=" 
        		+ xtype + "&useDate=" + $('#txtUseDate').value();
        	var self = this;
            $.ajax(url, {
                method: cQuery.AJAX_METHOD_GET,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(!res) return;
                    var data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
                    data.name = title;
                    var html = $.tmpl.render(SSHConfig.tmpls.xdetail, data) || '';
                    self.cache[xid] = [title, html];
                    self.render(title, html);
                    Mod.hideLoading(self.$divXProduct);
                }
            });
        }
	}
	// 低价日历
	var PriceCalendar = {

		$container: $('#divCalendar'),

		classes: {
			month: ['pkg_month_2v4', 'pkg_month_3v3', 'pkg_month_4v2'],
			enable: 'on'
		},

		tmpls: SSHConfig.tmpls.calendar,

		_prices: {},

		_checkin: undefined,

		_id: undefined, // 当前显示哪家酒店的数据

		fetch: function (hotelId, roomId) {
			var self = this;
			var id = hotelId + '|' + roomId;

			this._id = id;

			if(this._prices[id]) {
				this._render(this._prices[id]);
				return self.loading(false);
			}
			
			var url = SSHConfig.URL.LOWEST_PRICE + "?hotelId=" + hotelId + "&roomId=" + roomId + "&usedate=" + $('#txtUseDate').value();
			$.ajax(url, {
				method: cQuery.AJAX_METHOD_POST,
				context: {
					PeggingParams: $('#hPeggingParams').value()
				},
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(res)
						self._prices[id] = cQuery.parseJSON(res);
					self._render(self._prices[id]); 
            		self.loading(false);        
                }
			});	
		},

		reg: function (triggers) {
			this.panel.reg(triggers);
		},
		// set highlighted date
		setDate: function (date) {
			this._checkin = date;
		},

		_drawSide: function () {
			// 因为要画6行，最大天数取当前+30，可以保证月份画得正确。
			var maxDate = new Date().addDays(30);

			var preYear = this._minDate.getFullYear(),
				preMonth = this._minDate.getMonth(),
				preDate = this._minDate.getDate(),
				preDay = this._minDate.getDay(),
				year = maxDate.getFullYear(),
				month = maxDate.getMonth(),
				date = maxDate.getDate(),
				day = maxDate.getDay();

			var preLastDate = new Date(preYear, preMonth + 1, 1).addDays(-1);
			var prePart = preDay + (7 - preLastDate.getDay()) + (preLastDate.getDate() - preDate);

			var data = {preYear: preYear, preMonth: preMonth + 1, year: year, month: month + 1};
			var monthClass = '';
			switch(prePart / 7){
				case 1:
					delete data.preYear;
					delete data.preMonth;
					break;
				case 2:
					monthClass = this.classes.month[0]; break;
				case 3:
					monthClass = this.classes.month[1]; break;
				case 4:
					monthClass = this.classes.month[2]; break;
				case 5:
					data.year = data.preYear;
					data.month = data.preMonth;
					delete data.preYear;
					delete data.preMonth;
					break;
			}

			var html = $.tmpl.render(this.tmpls.side, data);
			this.$month.addClass(monthClass);
			this.$month.html(html);
		},

		_render: function (data) {
			var start = this._minDate.getDay(),
				end = start + 30,
				startDate = this._minDate.addDays(start * -1),
				cells = this.$content.find('td'),
				tmpl = this.tmpls.cell,
				date = startDate,
				d, html;

			for (var i = 0; i < 42; i++) {
				d = {
					dateStr: date.toFormatString('yyyy-MM-dd'),
					date: date.getDate()
				};

				d.price = data ? data[date.toFormatString("yyyy-MM-dd")] : 
					(i >= start && i < end) ? "0" : undefined;

				html = $.tmpl.render(tmpl, d);
				cells[i].innerHTML = html;

				if(i >= start && i < end && d.price != "-1"){
					cells[i].className = 'on';
					cells[i].__data = d; // set data for order
				}else{
					cells[i].className = '';
					cells[i].__data = undefined;
				}

				date = date.addDays(1);
			};

			this._renderCheckIn();
		},

		_renderCheckIn: function () {
			var date = this._checkin;
			this.$container.find('td>a').each(function (lnk, i) {
				if(lnk.attr('data-date') == date)
					lnk.addClass('cur');
				else
					lnk.removeClass('cur');
			});
		},

		_initELements: function () {
			this.$month = this.$container.find('[data-cal="month"]');
			this.$content = this.$container.find('[data-cal="content"]');
			this.$loading = this.$container.find('[data-cal="loading"]');
		},
		// 日历浮层
		_initTipPanel: function () {
			var self = this;

			this.panel = new Tip({
				$tip: this.$container,
				triggerEvt: 'mouseenter',
    			alignMode: Tip.ALIGNMODE.bottomright
			});

			this.panel.on('beforeShow', this.loading.bind(this, true));
			this.panel.on('show', function (tip, pos, e) {
				var hotelId = e.target.getAttribute('data-hotel');
				var roomId = Hotel.hotels[hotelId].roomId;
				self.fetch(hotelId, roomId);
			});
		},
		// 日期范围
		_initDates: function () {
			this._curDate = undefined;
			this._minDate = ProductList.minDate.toDate();
			this._maxDate = ProductList.maxDate.toDate();
		},
		// 预订事件
		_initOrderEvents: function () {
			var self = this;
			this.$content.bind('click', function (e) {
				var target = e.target;
				if(target.nodeName != 'TD')
					target = S.parent(target, 'td');
				if(!target) return;
				var data = target.__data;
				if(!self._prices[self._id] || !data) return;
				// order
				$('#txtUseDate').value(data.dateStr);
				var hotelId = self._id.split('|')[0];
				var hotel = Hotel.hotels[hotelId];
				hotel.order();
			});
		},

		init: function () {
			if(!this.$container.length) return;

			this._initELements();
			this._initTipPanel();
			this._initDates();
			this._initOrderEvents();
			this._drawSide();
		},

		loading: function (isShow) {
			if(isShow){
				S.hide(S.parent(this.$content));
				S.show(this.$loading);
			}else{
				S.hide(this.$loading);
				S.show(S.parent(this.$content));
			}		
		}
	}

	var TrafficMap = {

		markers: undefined,

		tmpls: {
			scene: '<div class="map_mark zero"><i></i><div class="mark_tit"><span>$1</span></div></div>',
			hotel: '<div class="map_mark hotel"><i></i><div class="mark_tit"><span>$1</span></div></div>'
		},

		getPosition: function () {
			var ret = [];
			var scenicPos = $('#hScenicPosition').value().split('@');
			if(scenicPos[1]){
				ret.push({
					location: scenicPos[0], 
					name: scenicPos[1], 
					type: 'scene'
				});
			}

			$('[name="HotelPosition"]').each(function (item) {
				var hotelPos = item.value().split('@');
				if(hotelPos[1]){
					ret.push({
						location: hotelPos[0], 
						name: hotelPos[1], 
						type: 'hotel'
					});
				}
			});

			return ret;
		},

		init: function (positions) {
			if(!$('#divMap').length) return;

	        this._createMap();

	        ProductList.on('update', this._drawMarkers.bind(this));
		},

		_createMap: function () {
			var container = $('#divMap');

			var self = this;
	        
	        Mod.showLoading(container);

            require.async('tools/emap.js', function (mod) {

                self._emap = mod.regEMap(container, {autoZoom: true, iframeUrl: SSHConfig.URL.MAP_IFRAME_DETAIL});

	            self._emap.on('mapReady', function () {
	            		Mod.hideLoading(container);              	
	            		self._drawMarkers();
	            		self._emap.map.setStatus({scrollWheel: false});
			        });
            });
		},

		_drawMarkers: function () {
			if(!this._emap) return;

			this.positions = this.getPosition();

			var self = this;
			var markers = [];

        	this.positions.each(function (pos) {
        		var marker = self._createMarker(pos);
        		markers.push(marker);
        	});

            this._emap.show(markers);

            this.markers = markers;
		},

		_createMarker: function (pos) {
			var opts = {position: {}, offset: {}, icon: ''};
        
	        var location = pos.location.split('|');
	        
	        opts.position = {
	            lon: location[0],
	            lat: location[1]
	        }
	        
	        opts.offset = {
	            x: -10,
	            y: -30
	        }

            opts.content = S.format(this.tmpls[pos.type], pos.name).trim();

	        var marker = this._emap.createMarker(opts);

	        // add hover handler
	        this._emap._mapWin.AMap.event.addListener(marker, 'mouseover', this.overItem.bind(this, marker));
	        this._emap._mapWin.AMap.event.addListener(marker, 'mouseout' , this.outItem. bind(this, marker));

	        return marker;
		},

		overItem: function (mkr) {
			// 可能将来这里会有问题
			// IE6下高德的API在设置marker的Content为DOM元素的时候不起作用，所以这里我只能把它设置成html串
			var div = mkr.f.firstChild;
			div.className += '_hover';
			this.markers.each(function (mkr) {
				mkr.setzIndex(10);
			});
			mkr.setzIndex(100);
		},

		outItem: function (mkr) {
			var div = mkr.f.firstChild;
			div.className = div.className.replace('_hover', '');
			mkr.setzIndex(10);
		}
	}

	var TicketComment = {

		$container: $('#divComment'),

		sightId: $('#hSightId').value(),

		init: function () {
			if(!this.$container.length) return;
			this.$container.bind('click', this._dispatch.bind(this));
			this.fetch(1);
		},

		fetch: function (pageIndex) {
			this.loading(true);
			var sightId = this.sightId;
			var self = this;
			var url = SSHConfig.URL.TICKET_COMMENT + "?sightId=" + sightId + "&pageIndex=" + pageIndex;
			$.ajax(url, {
				method: cQuery.AJAX_METHOD_GET,
                onerror: function () { },
                onsuccess: function (xhr, res) {
                    if(!res){ // no comments
                    	self.$container.remove();
                    	$('#divFollowedMenu [data-tab="comment"]').parentNode().remove();
                    }else
                    	self.$container.html(res);
                }
			})
		},

		loading: function (isShow) {
			if(isShow){
				S.hide(this.$container.find('ul'));
				var style = {position: 'absolute', top: "1px"};
				cQuery.browser.isIE6 && (style.left = "1px");
				Mod.showLoading(this.$container, undefined, style);
				cQuery.browser.isIE6 && $("#divFollowedMenu").css({"position": "relative"});
			}
		},

		goPage: function () {
			var txtPage = $('#txtPage');
			var page  = +txtPage.value(),
				total = +txtPage.attr('data-total');
			if(isNaN(page) || Math.floor(page) != page || page < 1)
				page = 1;
			if(page > total)
				page = total
			txtPage.value(page);

			this.fetch(page);
		},

		_dispatch: function (e) {
			var index = parseInt(e.target.getAttribute('data-index'));
			if(isNaN(index)) return;
			index == -1 ? this.goPage() : this.fetch(index);
		}
	}
	// 主入口
	var SSH = {
		init: function () {
			SceneViewer.init();

			var menu = 
				new Mod.FollowedMenu({
					menu: 	 '#divFollowedMenu',
					content: '#divMainContent',
					classes: {
						fixed: 'detail_tab_fixed',
						current: 'current'
					}
				});

			ProductList.init();
			PriceCalendar.init();

			TicketComment.init();
			TrafficMap.init();

			this._initLinkTo();

			require.async('mods/quickview');
			Mod.regJMP();
		},

		_initLinkTo: function () {
			var $lnkToMap = $('#lnkToMap'),
				$lnkToComment = $('#lnkToComment'), 
				$divMap = $('#divMap'),
				$divComment = $('#divComment');

			if($divMap.length){
				$lnkToMap.bind('click', function () {
					var top = $divMap.offset().top;
					window.scrollTo(0, top - 92);
				});
			}

			if($divComment.length){
				$lnkToComment.bind('click', function () {
					if(!$divComment[0] || !$divComment[0].parentNode) return;
					var top = $divComment.offset().top;
					window.scrollTo(0, top - 72);
				});
			}
		}
	}

	SSH.init();
});