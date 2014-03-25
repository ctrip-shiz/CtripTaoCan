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

		focusNext: true,

		// async(for address data check) validate search parameters 
		// callback: success callback
		validate: function (callback){
			var self = this;
			this.focusNext = false;

		    // check flight
			var ok = Validator.checkAddress(self.txtFrom, self.txtTo) &&
				Validator.checkDate(self.txtFromDate, self.txtToDate);
			if(!ok) return ok;

			callback();
		},
		getUrl: function () {
			if(this._hotelCount > 1)
				return FHXConfig.URL.FREE_COMBINE;
			else
				return S.format(FHXConfig.URL.SINGLE_FLT_HOTEL,
							'round', this.hFromPY.value(), this.hFromID.value(),
							this.hToPY.value(), this.hToID.value()).toLowerCase();
		},
		// 搜索
		search: function (e) {
			var self = this;
			Searcher.validate(function () {
				var url = Searcher.getUrl();
				self.txtFromDate.attr('value', self.txtFromDate.value());
				self.txtToDate.attr('value', self.txtToDate.value());		
				var form = document.createElement('form');
				form.action = url;
				form.method = 'post';
				form.innerHTML = $('#FHX_SearchBox')[0].innerHTML.replace(/FHX_/g, '');
				document.body.appendChild(form);
				form.submit();
			});
		},
		
		init: function (){
			if ($('#FHX_txtFromDate').length == 0) return;
			
			this._initFlightMods();
			
			$('#FHX_btnSearch').bind('click', Searcher.search.bind(Searcher));
		},
		
		_initFlightMods: function () {
			var self = this;
			
			['txtFrom', 'txtTo', 'txtFromDate', 'txtToDate'].each(function(item, i){
				self[item] = $('#FHX_'+item);
				Mod.regPlaceHolder(self[item], FHXConfig.placeholder[i > 1 ? 0 : 1]);
				//self._textboxes.push(self[item]);
			});

			// register address mods
			self.hFromID = $('#FHX_hFromID'); self.hFromPY = $('#FHX_hFromPY');
			self.hToID = $('#FHX_hToID'); self.hToPY = $('#FHX_hToPY');

			var tempAddress = 
				self.txtFrom.regMod('address', hotelPluginsVersion.address, {
					name: 'FHX_txtFrom',
					isAutoCorrect: true,
					jsonpSource: webResourcePath + "flightintl_start_" + cQuery.config("charset") + ".js",
					//jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=1' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
					message: FHXConfig.address.message,
					template: { suggestion: FHXConfig.address.suggestion[0], suggestionStyle: FHXConfig.address.suggestionStyle, suggestionIpad: FHXConfig.address.suggestionIpad[0], suggestionStyleIpad: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle },
					relate: {
						0: this.hFromPY,
						2: this.hFromID
					}
				});
			self.txtFrom.address = tempAddress;

			tempAddress =
				self.txtTo.regMod('address', hotelPluginsVersion.address, {
					name: 'FHX_txtTo',
					isAutoCorrect: true,
					jsonpSource: webResourcePath + "flightintl_dest_" + cQuery.config("charset") + ".js",
					//jsonpFilter: 'http://flights.ctrip.com/international/tools/GetCities.ashx?s=${key}&a=0' + '&t=' + ($.config('charset') == 'big5' ? '1' : '0'),
					message: FHXConfig.address.message,
					template: { suggestion: FHXConfig.address.suggestion[1], suggestionStyle: FHXConfig.address.suggestionStyle, suggestionIpad: FHXConfig.address.suggestionIpad[1], suggestionStyleIpad: FHXConfig.address.suggestionStyle, filter: FHXConfig.address.filter, filterStyle: FHXConfig.address.filterStyle },
					relate: {
						0: this.hToPY,
						2: this.hToID
					}
				});
			self.txtTo.address = tempAddress;

			// register calendar mods
			var tempCal = 
				self.txtFromDate.regMod('calendar', hotelPluginsVersion.calendar, {
					options: {
						minDate: new Date().addDays(1).toStdDateString(),
						showWeek: true,
						container: cQuery.container
					},
					listeners: {
						onChange: function (input, v) {
							//can not change when user type the date
							self.txtToDate.data('startDate', v.toDate().addDays(1).toStdDateString());
							self.txtToDate.data('minDate', v.toDate().addDays(1).toStdDateString());
							self.txtToDate.data('maxDate', v.toDate().addDays(28).toStdDateString());
							self.focusNext && self.txtToDate[0].focus();
						}
					}
				});
			tempCal.method('setWeek', self.txtFromDate[0]);
			self.txtFromDate.calendar = tempCal;
			
			tempCal = 
				self.txtToDate.regMod('calendar', hotelPluginsVersion.calendar, {
					options: {
						minDate: self.txtFromDate.value().toDate().addDays(1).toStdDateString(),
						maxDate: self.txtFromDate.value().toDate().addDays(28).toStdDateString(),
						showWeek: true
					}
				});
			tempCal.method('setWeek', self.txtToDate[0]);
			self.txtToDate.calendar = tempCal;
		}
	}
	
	window.FHX = {
		init: function(){
			Searcher.init();
		},
		
		setWeek: function(){
			var txtFromDate = Searcher.txtFromDate,
				txtToDate = Searcher.txtToDate;
			txtFromDate.calendar.method('setWeek', txtFromDate[0]);
			txtToDate.calendar.method('setWeek', txtToDate[0]);
		}
		
	}
})();
