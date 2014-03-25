(function(){

	// lib fix
    var S = {
        // format the $\d width the args
        format: function (str) {
            var args = arguments;
            if (args.length == 0)
                return str;
            return str.replace(/\$(\d)/g, function (w, d) {
                return args[d] == undefined ? '' : args[d];
            });
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
		// create element with html
        create: function (html) {
            html = html.trim(); // fix TextNode bug
            // The cached element will be removed, when the function is invoked
            // and the element is not appended to the dom tree.
            var _tmpEl = document.createElement('div');
            _tmpEl.innerHTML = html;
            var ret = _tmpEl.firstChild;

            if(ret.nodeType != 1 || _tmpEl.childNodes.length > 2){
                // try to parse the html
                var rTag = /<([\w:]+)([^\>]*)>/;
                var matches = html.match(rTag);
                if(!matches) return null;
                // create tr/td element
                var tagName = matches[1];
                if(tagName == 'tr' || tagName == 'td'){
                    var htmlTable = tagName == 'tr' ?
                        "<table><tbody>" + html + "</tbody></table>" : 
                        "<table><tbody><tr>" + html + "</tr></tbody></table>";
                    var table = S.create(htmlTable);
                    return tagName == 'tr' ?
                        table.rows[0] : table.rows[0].cells[0];
                }
                
                return null;
            }

            return ret;
        }
    }
    
    // mod helper
    var Mod = {
        // show invalid tips
        showTips: function (obj, msg, hideEvent) {
            if(!Mod.formValidator)
                Mod.formValidator = $(document).regMod("validate", "1.1");
            if (typeof obj.bind !== 'function')
                obj = $(obj);
            Mod.formValidator.method("show", {
                $obj: obj,
                data: msg,
                removeErrorClass: true,
                hideEvent: hideEvent || "blur",
                isFocus: true,
				isScroll: false
            });
            return false;
        }
    };

	(function(exports){
		var HOLDER_SUPPORT = 'placeholder' in document.createElement('input');

		function hacklib () {
			var oriValue = $.fn.value;

			$.fn.value = function(val){
				var _this = this;

				var obj = this[0];
				if(!obj) return '';
				var ph = obj.getAttribute("placeholder");
				if(!ph) return oriValue.call(_this, val);

				if(typeof val === 'undefined'){
					// get
					return (obj.value == ph ? "" : obj.value);
				}else{
					// set
					if(val.trim() == '' || val.trim() == ph){
						obj.value = ph;
						obj.style.color = 'gray';
					}else{
						obj.value = val;
						obj.style.color = '';
					}
				}
			}
		}

		var PlaceHolder = function (txt, msg) {
			if(txt[0].value.trim() == '')
				txt[0].value = msg; // init default display
			// cause font color of the txt always being set in class, 
			// so I did not save it for recovering
			this.txt = txt;
			this.msg = msg;

			txt[0].setAttribute('placeholder', msg);
			if(txt[0].value == msg)
				txt.css({color: 'gray'});

			txt.bind('focus', this.hide.bind(this))
				.bind('blur', this.show.bind(this));
		}
		PlaceHolder.prototype = {
			show: function () {
				var txt = this.txt;
				if(this.msg == txt[0].value || txt[0].value.trim() == ''){
					txt[0].value = this.msg;
					txt[0].style.color = 'gray';
				}
			},
			hide: function () {
				var txt = this.txt;
				if(this.msg == txt[0].value){
					txt[0].value = '';
					txt[0].style.color = '';
				}
			}
		}

		exports.regPlaceHolder = function (txt, msg) {
			if(!txt) return;
			if(!msg) return;// compatible with empty string and undefined
			if(typeof txt.value !== 'function')
				txt = $(txt);
			if(!txt[0]) return;

			if(HOLDER_SUPPORT){
				txt[0].placeholder = msg;
			}else{
				new PlaceHolder(txt, msg);
				hacklib();
			}   
		}
	})(Mod);
	
	(function(exports){

		var EventEmitter = function () {
			this._events = {};
		}

		EventEmitter.prototype = {
			constructor: EventEmitter,

			on: function (evtName, handler) {
				if(!(evtName in this._events))
					this._events[evtName] = [];
				this._events[evtName].push(handler);
			},

			off: function (evtName, handler) {
				var events = this._events[evtName];
				if(!events) return;
				for (var i = 0, len = events.length; i < len; i++) {
					if(events[i] == handler){
						events.splice(i,1);
						return;
					}
				};
			},

			emit: function (evtName) {
				if(!this._events[evtName]) return;
				var evts = this._events[evtName];
				var args = Array.prototype.slice.apply(arguments);
				args = args.slice(1);
				for(var i=0, len = evts.length; i<len; i++){
					evts[i].apply(this, args);
				}
			}
		}

		EventEmitter.extend = function (target) {
			var eh = new EventEmitter();

			for(var k in eh){
				if(eh.hasOwnProperty(k))
					target[k] = eh[k];
			}
			for(var k in EventEmitter.prototype){
				if(k === 'constructor') continue;
				target[k] = eh[k];
			}

			return target;
		}

		exports.EventEmitter = EventEmitter;
	})(Mod);
	
	var HistoryKeeper = {
		_key: 'FHXSearch',
	
		// keeping fields
		_fields: {
			from: { id: 2, name: FHXConfig.defaultDepart, en: 'shanghai', date: new Date().addDays(2).toFormatString('yyyy-MM-dd') },
			to: { id: '', name: '', en: '', date: new Date().addDays(4).toFormatString('yyyy-MM-dd') },
			adults: 2, 
			children: 0,
		},
		
		save: function (){
			var domain = window.location.href.indexOf('ctrip.com') > 0 ? 'ctrip.com' : 'ctriptravel.com';
			var opts = { expires: 2, domain: domain };
			var key = this._key;
			
			cQuery.cookie.set(key, 'from.id',  $('#FHX_hFromID').value(), opts);
			cQuery.cookie.set(key, 'from.name',$('#FHX_txtFrom').value(), opts);
			cQuery.cookie.set(key, 'from.en',  $('#FHX_hFromPY').value(), opts);
			cQuery.cookie.set(key, 'from.date',$('#FHX_txtFromDate').value(), opts);
			cQuery.cookie.set(key, 'to.id',    $('#FHX_hToID').value(), opts);
			cQuery.cookie.set(key, 'to.name',  $('#FHX_txtTo').value(), opts);
			cQuery.cookie.set(key, 'to.en',    $('#FHX_hToPY').value(), opts);
			cQuery.cookie.set(key, 'to.date',  $('#FHX_txtToDate').value(), opts);
			cQuery.cookie.set(key, 'adults',   $('#FHX_AdultSelect').value(), opts);
			cQuery.cookie.set(key, 'children', $('#FHX_ChildrenSelect').value(), opts);
		},
		
		recover: function (){
			this.recoverFromVacationCookie();
			this.recoverFromCookie();
			this._checkDates();
			var filleds = this._fields;
			$('#FHX_hFromID').value(filleds.from.id);
			$('#FHX_txtFrom').value(filleds.from.name);
			$('#FHX_hFromPY').value(filleds.from.en);
			$('#FHX_txtFromDate').value(filleds.from.date);
			$('#FHX_hToID').value(filleds.to.id);
			$('#FHX_txtTo').value(filleds.to.name);
			$('#FHX_hToPY').value(filleds.to.en);
			$('#FHX_txtToDate').value(filleds.to.date);
			$('#FHX_AdultSelect').value(filleds.adults);
			$('#FHX_ChildrenSelect').value(filleds.children);
			
			$('#FHX_divHotelQuery li[data-hotel] input').each(function (input, i){
				switch(i){
					case 0: input.value(filleds.to.name); break;
					case 1: input.value(filleds.to.id); break;
					case 2: input.value(filleds.to.en); break;
					case 3: input.value(filleds.from.date); break;
					case 4: input.value(filleds.to.date); break;
				}
			});
		},
		
		recoverFromCookie: function (){
			var key = this._key;
		
			var fs = this._fields;
			var ret = {};
			
			for(var k in fs){
				var val = fs[k];
				
				if(typeof val === 'object'){
					ret[k] = {};
					for(var g in val){
						ret[k][g] = cQuery.cookie.get(key, k+'.'+g) || val[g];
					}
				}else{
					ret[k] = cQuery.cookie.get(key, k) || val;
				}
			}
			
			this._fields = ret;
			return ret;
		},
		
		recoverFromVacationCookie: function(){
			var startCity = cQuery.cookie.get('StartCity_Pkg');
			if(!startCity) return;
			startCity = startCity.split('=')[1];
			this._fields.from.id = startCity;
			this._fields.from.name = FHXConfig.START_CITY[startCity];
		},
		
		_checkDates: function (){
			var fromMin = new Date().toFormatString('yyyy-MM-dd');
			if(this._fields.from.date <= fromMin){
				this._fields.from.date = new Date().addDays(2).toFormatString('yyyy-MM-dd');
				this._fields.to.date = new Date().addDays(4).toFormatString('yyyy-MM-dd');
			}
		}
	}
	// 验证
	var Validator = {
		checkAddress: function (txtFrom, txtTo) {
			if(txtTo){
				if(!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[8]);
				if(!txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[9]);
				if(txtFrom.value().trim() == txtTo.value().trim()) return Mod.showTips(txtTo, FHXConfig.validate[13]);
			}else{
				if(!txtFrom.value().trim()) return Mod.showTips(txtFrom, FHXConfig.validate[10]);
			}
			return true;
		},
		// 航班时间与酒店时间限制
		checkDate: function (departDate, returnDate, checkinDate, checkoutDate) {        
			var dd = departDate.value(), rd = returnDate.value();

			if(checkinDate){
				var cid = checkinDate.value(), cod = checkoutDate.value();
				if(cid == "")
					return Mod.showTips(checkinDate, FHXConfig.validate[2]);
				if(cod == "")
					return Mod.showTips(checkoutDate, FHXConfig.validate[3]);
				if(!cid.isDate())
					return Mod.showTips(checkinDate, FHXConfig.validate[4]);
				if(!cod.isDate())
					return Mod.showTips(checkoutDate, FHXConfig.validate[4]);
				if(cid >= cod)
					return Mod.showTips(checkoutDate, FHXConfig.validate[6]);
				if(S.dateDiff(cid, cod, 'd') > 28)
					return Mod.showTips(checkoutDate, FHXConfig.validate[7]);
				
				if(cid.toDate().addDays(1) < dd.toDate())
					return Mod.showTips(checkinDate, FHXConfig.validate[11]);
				if(rd.toDate().addDays(1) < cod.toDate())
					return Mod.showTips(checkoutDate, FHXConfig.validate[12]);
			}else{
				if(dd == "")
					return Mod.showTips(departDate, FHXConfig.validate[0]);
				if(rd == "")
					return Mod.showTips(returnDate, FHXConfig.validate[1]);
				if(!dd.isDate())
					return Mod.showTips(departDate, FHXConfig.validate[4]);
				if(!rd.isDate())
					return Mod.showTips(returnDate, FHXConfig.validate[4]);
				if(dd >= rd)
					return Mod.showTips(returnDate, FHXConfig.validate[5]);
				if(S.dateDiff(dd, rd, 'd') > 28)
					return Mod.showTips(returnDate, FHXConfig.validate[7]);
			}

			return true;
		}
	}
	// 搜索
	var Searcher = {

		_textboxes: [], // store the textboxes for skiping to next when one is filled

		_hotelCount: 0,
		_hotelDateChanged: false,
		_hotelCityChanged: false,

		focusNext: true,
		
		// async(for address data check) validate search parameters 
		// callback: success callback
		validate: function (callback){

			var self = this;
			this.focusNext = false;

		   // check flight
			var ok = Validator.checkAddress(self._textboxes[0], self._textboxes[1]) &&
				Validator.checkDate(self._textboxes[2], self._textboxes[3]);
			if(!ok) return ok;
			// check hotel
			var txts = self._textboxes;
			for (var i = 4; i < txts.length; i+=3) {
				ok = Validator.checkAddress(txts[i]);
				if(!ok) return ok;
				ok = Validator.checkDate(self.txtFromDate, self.txtToDate, txts[i+1], txts[i+2]);
				if(!ok) return ok;
			} 

			callback();
		},
		getUrl: function () {
			//var checkInCity = this._textboxes[4].value();
			var checkInCity = document.getElementsByName("ToCities")[0].value;
			if(this._hotelCount > 1 || this.hToID.value() != checkInCity)
				return FHXConfig.URL.FREE_COMBINE;
			else
				return S.format(FHXConfig.URL.SINGLE_FLT_HOTEL,
							'round', this.hFromPY.value(), this.hFromID.value(),
							this.hToPY.value(), this.hToID.value()).toLowerCase();
		},
		// 搜索
		search: function (e) {
			Searcher.validate(function () {
				var url = Searcher.getUrl();
				
				HistoryKeeper.save();
				
				var fm = $('#FHX_form')[0];
				fm.action = url;
				fm.submit();
				//doPost(url, e);
			});
		},

		_splitFlightDates: function () {
			if(this._hotelDateChanged) return;

			var start = this.txtFromDate.value(),
				end   = this.txtToDate.value();
			if(!start.isDate() || !end.isDate() || start > end) return;

			var ret = [];
			var days = S.dateDiff(start, end, 'd');

			if(days < 1) return;

			if(days == 1) return [start, end];

			var avg = Math.floor(days / this._hotelCount),
				mod = days % this._hotelCount;

			start = start.toDate();
			end = end.toDate();
			var days1 = 0, days2 = 0;
			for (var i =0; i < this._hotelCount; i++) { 
				days2 = days1 + avg + (i<mod ? 1 : 0);
				if(days1 == days2) days1--;
				ret.push(
					start.addDays(days1).toFormatString('yyyy-MM-dd'),
					start.addDays(days2).toFormatString('yyyy-MM-dd')
				);
				days1 = days2;

			}
			return ret;
		},

		_updateHotelBox: function (dates) {
			// 拆日期
			if(dates){
				var index, start, end, last = dates.length - 1;
				for (var i = 0; i < this._hotelCount; i++) {
					start = dates[2 * i] ? dates[2 * i] : dates[last - 1];
					end = dates[2 * i + 1] ? dates[2 * i + 1] : dates[last];
					index = 5 + i * 3;
					this._textboxes[index].value(start);
					//this._textboxes[index].calendar.method('setWeek', this._textboxes[index]);
					this._textboxes[index + 1].value(end);
					//this._textboxes[index + 1].calendar.method('setWeek', this._textboxes[index + 1]);
					this._textboxes[index + 1].data('minDate', start.toDate().addDays(1).toStdDateString());
				};
			}
			// 更新删除/添加按钮状态
			var deletelnks = this.hotelContainer.find('a.move_htl_btn');
			deletelnks[0].className = deletelnks.length > 1 ? 'move_htl_btn' : 'move_htl_btn invisible';
			deletelnks.length >=3 ? $('#FHX_lnkAddHotel').addClass('invisible') : $('#FHX_lnkAddHotel').removeClass('invisible');
		},

		// 添加酒店
		addHotel: function () {
			if(this._hotelCount >= 3) return;

			var htmlHotel = $.tmpl.render(FHXConfig.hotelTemplate, {
				to: this.txtTo.value(), toid: this.hToID.value(), count: this._hotelCount
			});
			var divHotel = $(S.create(htmlHotel));

			//this.hotelContainer[0].appendChild(divHotel[0]);
			divHotel.insertBefore($('#FHX_lnkAddHotel').parentNode());

			divHotel.find('input[type="text"]').each(this._regHotelMods.bind(this));

			this._updateHotelBox(this._splitFlightDates());
		},
		// 删除酒店
		removeHotel: function (index) {
			this._hotelCount--;
			this._textboxes.splice(index * 3 + 4, 3);

			var k = 0;
			this.hotelContainer.find('li[data-hotel]').each(function (div, i) {
				i == index ? 
					div[0].parentNode.removeChild(div[0]) :
					div.find('a').attr('data-index', k++) ;
			});

			this._updateHotelBox(this._splitFlightDates());
		},
		
		init: function (){
			if ($('#FHX_txtFromDate').length == 0) return;
			
			HistoryKeeper.recover();
			
			Mod.EventEmitter.extend(this);
		
			this._initTxts();
			
			this._initMod();
		},
		
		_initMod: function (){
			this.hotelContainer = $('#FHX_divHotelQuery');

			this._initFlightMods();
			this._initHotelMods();
			this._initPersonSelect();
			
			$('#FHX_btnSearch').bind('click', Searcher.search.bind(Searcher));
		},
		// add functions to textboxes
		_initTxts: function () {
			this._textboxes.next = function (txt) {
				return this[ this.indexOf(txt) + 1 ];
			}
			this._textboxes.last = function (txt) {
				return this[ this.length - 1 ];
			}
		},
		
		_initFlightMods: function () {
			var self = this;
			
			['txtFrom', 'txtTo', 'txtFromDate', 'txtToDate'].each(function(item, i){
				self[item] = $('#FHX_'+item);
				Mod.regPlaceHolder(self[item], FHXConfig.placeholder[i > 1 ? 0 : 1]);
				self._textboxes.push(self[item]);
			});

			// register address mods
			var dataUrl = 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=${type}' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0');
			var rPY = /@([a-zA-Z\s]+)/

			self.hFromID = $('#FHX_hFromID'); self.hFromPY = $('#FHX_hFromPY');
			self.hToID = $('#FHX_hToID'); self.hToPY = $('#FHX_hToPY');

			var tempAddress = 
				self.txtFrom.regMod('address', '1.0', {
					name: 'txtFrom',
					isAutoCorrect: true,
					jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_start_" + cQuery.config("charset") + ".js",
					jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=1' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
					message: FHXConfig.address.message,
					template: { suggestion: FHXConfig.address.suggestion[0], suggestionIpad: FHXConfig.address.suggestionIpad[0], suggestionStyle: FHXConfig.address.suggestionStyle, suggestionStyleIpad: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle }
				});
			tempAddress.method('bind', 'change', function (_, data) {
					self.txtFrom[0].value = data.items[1].replace(/\([^\)]+\)/, '');
					self.txtFrom[0].blur();
					$.jsonp(
						dataUrl.replace("${type}", 1).replace("${key}", data.value), {
							onload: function (data) {
								self.hFromID.value(data.data.split('|')[2]);
								var py = data.data.match(rPY)[1];
								self.hFromPY.value(py);
							}
						});
				});
			self.txtFrom.address = tempAddress;

			tempAddress =
				self.txtTo.regMod('address', '1.0', {
					name: 'txtTo',
					isAutoCorrect: true,
					jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_dest_" + cQuery.config("charset") + ".js",
					jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=0' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
					message: FHXConfig.address.message,
					template: { suggestion: FHXConfig.address.suggestion[1], suggestionIpad: FHXConfig.address.suggestionIpad[1], suggestionStyle: FHXConfig.address.suggestionStyle, suggestionStyleIpad: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle }
				});
			tempAddress.method('bind', 'change', function (_, data) {
					self.txtTo[0].value = data.items[1].replace(/\([^\)]+\)/, '');
					self.txtTo[0].blur();
					$.jsonp(
						dataUrl.replace("${type}", 1).replace("${key}", data.value), {
							onload: function (data) {
								self.hToID.value(data.data.split('|')[2]);
								var py = data.data.match(rPY)[1];
								self.hToPY.value(py);

								setTimeout(function () {
									self.emit('tocitychange', self.txtTo.value(), self.hToID.value());	
								}, 10);
								
							}
					});
				});
			self.txtTo.address = tempAddress;

			// register calendar mods
			var tempCal = 
				self.txtFromDate.regMod('calendar', '3.0', {
					options: {
						minDate: new Date().addDays(1).toStdDateString(),
						showWeek: false,
						container: cQuery.container
					},
					listeners: {
						onChange: function (input, v) {
							//can not change when user type the date
							self.txtToDate.data('startDate', v.toDate().addDays(1).toStdDateString());
							self.txtToDate.data('minDate', v.toDate().addDays(1).toStdDateString());
							self.txtToDate.data('maxDate', v.toDate().addDays(28).toStdDateString());          

							if(self.focusNext && v >= self.txtToDate.value()){
								var date = v.toDate().addDays(1).toFormatString("yyyy-MM-dd");
								self.txtToDate.value(date);
								self.emit('todatechange', date, v.toDate().addDays(2).toFormatString("yyyy-MM-dd"));
							}
							// min select date
							var minDate = v.toDate().addDays(-1).toStdDateString();
							self.emit('fromdatechange', v, minDate);
							self.focusNext && self.txtToDate[0].focus();
						}
					}
				});
			//tempCal.method('setWeek', self.txtFromDate[0]);
			self.txtFromDate.calendar = tempCal;
			
			tempCal = 
				self.txtToDate.regMod('calendar', '3.0', {
					options: {
						minDate: self.txtFromDate.value().toDate().addDays(1).toStdDateString(),
						maxDate: self.txtFromDate.value().toDate().addDays(28).toStdDateString(),
						showWeek: false
					},
					listeners: {
						onChange: function (input, v) {
							// max select date
							var maxDate = v.toDate().addDays(1).toStdDateString();
							self.emit('todatechange', v, maxDate);
						}
					}
				});
			//tempCal.method('setWeek', self.txtToDate[0]);
			self.txtToDate.calendar = tempCal;
		},

		_initHotelMods: function (isReset) {
			var self = this;

			this.hotelContainer
					.find('li[data-hotel] input[type="text"]')
					.each(this._regHotelMods.bind(this));

			if(isReset) return;
			// bind events
			this.hotelContainer.bind('click', function (e) {
				if(e.target.nodeName != 'A') return;
				var index = e.target.getAttribute('data-index');
				
				switch(e.target.className){
					case 'move_htl_btn':
						self.removeHotel(+index);
						break;
					case 'add_htl_btn':
						self.addHotel();
						break;
				}
			});
		},
		
		_initPersonSelect: function (){
			var selectOptions = [];
			["AdultSelect", "ChildrenSelect"].each(function (id, index){
				var select = $('#FHX_' + id),
					options = $('#FHX_' + id + '_Options');
				selectOptions.push(options);
				
				select.bind('click', function (e){
					selectOptions.each(function(options, i){
						i == index ? options.removeClass('hidden') : options.addClass('hidden');
					});
					e.stopPropagation();
				});
				options.bind('click', function (e){
					if(e.target.nodeName != 'A') return;
					var v = +e.target.getAttribute('data-value');
					select.value(v);
					options.addClass('hidden');
					if(index == 0) limit(v);
					e.stop();
				});
			});
			
			limit(+$('#FHX_AdultSelect').value());
			
			$(document).bind('click', function (){
				selectOptions.each(function(options){
					options.addClass('hidden');
				});
			});
			
			function limit(v){
				var max = Math.min(v*2, 9-v);
				
				selectOptions[1].find('a').each(function (option, i){
					i > max ?
						option.addClass('hidden') : 
						option.removeClass('hidden');
				});
				
				var select = $('#FHX_ChildrenSelect');
				if(select.value() > max)
					select.value(0);
			}
			
		},

		_regHotelMods: function (txt, i) {
			var self = this;

			var which = i % 3;

			if(which == 0){ // reg address
				Mod.regPlaceHolder(txt, FHXConfig.placeholder[1]);
				var hDatas = txt.parentNode().find('input[type="hidden"]');
				var tempAddress = 
					txt.regMod("address", "1.0", {
						name: "cityname",
						jsonpSource: "http://webresource.c-ctrip.com/ResVacationOnline/R9/js/database/flightintl_dest_" + cQuery.config("charset") + ".js",
						jsonpFilter: 'http://vacations.ctrip.com/DIY/Ajax/AjaxGobalCity.aspx?isctrip=1&keyword=${key}',
						message: FHXConfig.address.message,
						template: {
							filter: FHXConfig.address.hotelFilter,
							filterStyle: FHXConfig.address.hotelFilterStyle,
							filterPageSize: -1,
							suggestion: FHXConfig.address.suggestion[1],
							suggestionIpad: FHXConfig.address.suggestionIpad[1],
							suggestionStyle: FHXConfig.address.suggestionStyle,
							suggestionStyleIpad: FHXConfig.address.suggestionStyle
						},
						relate: {
							2: $(hDatas[0]), // id
							3: $(hDatas[1])  // py
						}
					});
				tempAddress.method('bind', 'change', 
					function (_, data) {
						self._hotelCityChanged = true;
						hDatas[0].value = data.items[2];
					});
				txt.address = tempAddress;
				self.on('tocitychange', function (tocity, tocityId) {
					if(!self._hotelCityChanged){
						txt.value(tocity);
						var checkinCities = document.getElementsByName('ToCities');
						for (var i = 0; i < checkinCities.length; i++) {
							checkinCities[i].value = tocityId;
						};
					}
				});
				// init city changing status
				this._hotelCityChanged = this._hotelCityChanged || txt.value() != self.txtTo.value();
			}else{ // reg calendar
				Mod.regPlaceHolder(txt, FHXConfig.placeholder[0]);

				if(which == 1){
					var tempCal =
						txt.regMod('calendar', '3.0', {
							options: {
								minDate: self.txtFromDate.value().toDate().addDays(-1).toStdDateString(),
								maxDate: self.txtToDate.value().toDate().addDays(1).toStdDateString(),
								showWeek: false,
								container: cQuery.container
							},
							listeners: {
								onChange: function (input, v) {

									self._hotelDateChanged = true;
									//can not change when user type the date
									var minDate = v.toDate().addDays(1).toStdDateString();

									var next = self._textboxes.next(txt);
									next.data('startDate', minDate);
									next.data('minDate', minDate);
									setTimeout(function(){
										if(self.focusNext){
											if(v >= next.value())
												next.value(v.toDate().addDays(1).toFormatString("yyyy-MM-dd"));
											next[0].focus();
										}
									}, 30); // due to the calendar bug, I have to setTimeout here to fix the problem
									
								}
							}
						});

					self.on('fromdatechange', function (date, minDate) {
						if(!self._hotelDateChanged){
							txt.value(date);
							txt.data('minDate', minDate);
							self._updateHotelBox(self._splitFlightDates());
						} 
					});
				}else{
					var tempCal =
						txt.regMod('calendar', '3.0', {
							options: {
								minDate: (self._textboxes.last().value() || self.txtFromDate.value())
									.toDate().addDays(1).toStdDateString(),
								maxDate: self.txtToDate.value().toDate().addDays(1).toStdDateString(),
								showWeek: false
							},
							listeners: {
								onChange: function (input, v) {
									self._hotelDateChanged = true;
								}
							}
						});
					self._hotelCount ++; // +1 hotel query.

					self.on('todatechange', function (date) {
						if(!self._hotelDateChanged)
							self._updateHotelBox(self._splitFlightDates());
					});
				}

				//tempCal.method('setWeek', txt[0]);
				txt.calendar = tempCal;
				// listen to the change of flight dates
				self.on('todatechange', function (date, maxDate) {
					txt.data('maxDate', maxDate);
				});
			}
		
			self._textboxes.push(txt);
		}
	}
	
	FHX = {
		init: function (){
			$.mod.load("address", "1.0");
			$.mod.load("calendar", "3.0");
			$.mod.load("validate", "1.1");
			Searcher.init();
		}
	}
	
	FHX.init();
})();
