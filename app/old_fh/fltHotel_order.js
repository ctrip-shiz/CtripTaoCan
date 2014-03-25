/**
* author: shiz@ctrip.com
* date: 2012-07-20
* desciption:
*	for a better practise there should be a namespace to organize the code,
* but you know I am too lazy to do that, forgive me, god !
*/

$.mod.multiLoad({
    "jmp": "1.0",
    "calendar": "3.0",
    "notice": "1.0",
    "address": "1.0",
    "validate": "1.1",
    "allyes": "1.0"
});

// mod helper
var Mod = {
    formValidator: $(document).regMod("validate", "1.1"),
    // show invalid tips
    showTips: function (obj, msg) {
        if (typeof obj.bind !== 'function')
            obj = $(obj);
        Mod.formValidator.method("show", {
            $obj: obj,
            data: msg,
            removeErrorClass: true,
            //hideEvent: "blur",
            isFocus: true
        });
        return false;
    },

    regNotice: function (target, name, i, withNotice) {
        var notice = target.regMod('notice', '1.0', {
            name: name,
            tips: noticeConfig[i],
            selClass: "inputSel"
        });
        // 把notice挂在target上，以便后面调用其中的方法
        // notice模块没有绑定change事件，只能调notice的resetValue函数
        withNotice && (target.notice = notice);
        return notice;
    }
};

// user type listener mod
;(function (exports){
/*
* @class a listner which will create a real-time timer to get what the user type
* @constructor
* @param the target textbox
* @param the function which will be called when the input changed (params: inputText)
*/
var TypeListener = function (textbox, callback) {
    if (!textbox || typeof callback !== 'function')
        return null;
    this._textbox = typeof textbox.bind === 'function' ? textbox : $(textbox);
    this._callback = callback;
    this._input = '';
    this._timer = undefined;

    this._init();
}
TypeListener.interval = 200;
TypeListener.prototype = {
    constructor: TypeListener,

    _init: function () {
        var _this = this;
        this._textbox.bind('focus', function (e) {
            _this.start();
        });
        this._textbox.bind('blur', function (e) {
            _this.stop();
        });
    },

    _tick: function () {
        var oldInput = this._input;
        this._input = this._textbox.value().trim();
        if (oldInput != this._input && typeof this._callback === 'function') {
            this._callback(this._input);
        }

        this._timer = setTimeout(
				(function (me) {
				    return function () {
				        me._tick();
				    }
				})(this),
				TypeListener.interval);
    },

    start: function () {
        var _this = this;
        this.stop();
        this._input = this._textbox.value().trim();
        this._timer = setTimeout(
				(function (me) {
				    return function () {
				        me._tick();
				    }
				})(this),
				TypeListener.interval);
    },

    stop: function () {
        var _this = this;
        // clear later for getting the last input
        setTimeout(function () {
            clearTimeout(this._timer);
        }, TypeListener.interval);
    }
}

exports.TypeListener = TypeListener;

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

    // change the HtmlCollection or NodeList or arguments to array
    toArray: function (list) {
        try {
            return Array.prototype.slice.apply(list);
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
        }

        var url;
        if (typeof foo === "string")
            url = foo;
        else {
            if (!foo || (!foo.href && !foo.getAttribute('href')))
                url = fm.action;
            else
                url = foo.href || foo.getAttribute('href');
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

    _tmpEl: document.createElement('div'),
    // create element with html
    create: function (html) {
        S._tmpEl.innerHTML = html.trim(); // fix TextNode bug
        return S._tmpEl.firstChild;
    },

    // get the value of the input with notice mod
    noticeVal: function (el) {
        if (typeof el.value === 'function')
            el = el[0];
        return el.value.trim() == '' || el.value == el.getAttribute('_cqnotice') ? '' : el.value.trim();
    },

    // serialize form
    formSerialize: function (fm) {
        var rInput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i;
        var rSelectTextarea = /^(?:select|textarea)/i;

        var els = fm.elements ? S.toArray(fm.elements) : [];
        var ret = {};
        els.each(function (el, i) {
            if (el.name && !el.disabled && (el.checked || rSelectTextarea.test(el.nodeName) || rInput.test(el.type))) {
                if (ret[el.name]) {
                    ret[el.name] += (',' + el.value);
                } else {
                    ret[el.name] = el.value;
                }
            }
        });
        return ret;

    }
};

var fm = document.forms[0];

var passengerTypeEnum = {
    notAMan: 0,
    littleBaby: 1, //未满14天
    baby: 2, // <=2岁
    child: 3, // <12岁
    twelve: 4, //12岁 (成人票、青年特价)
    teenager: 5, // <=16岁
    youth: 6, // <=23岁
    adult: 7,
    midOlder: 8, // >55 中老年 (中老年特价)
    older: 9 // >=70 老年
}

var confirmTypeEnum = {
    noNeed: 'non',
    tel: 'tel',
    email: 'email',
    sms: 'sms'
}

/**@class 乘客验证器(单例) */
var BookValidator = {
    // normal validate
    rNormal: /[^A-Za-z0-9]/,
    // 军人证
    rMilitary: /[^\u4e00-\u9fa5A-Za-z0-9]/,
    // 台胞证
    rTaiwan: /[^A-Za-z0-9()（）]/,
    // 包含中文字
    rChsChar: /[\u0100-\uffff]/,
    // 中文姓名
    rChinese: /^[\u4e00-\u9fa5a-zA-Z-]+$/,
    // 英文姓名
    rEnglish: /^[A-Za-z]{1}[A-Za-z\s]+\/[A-Za-z]{1}[A-Za-z\s]+$/,
    // 电子邮箱
    rEmail: /^[\w_\-\.]+@[\w_\-\.]+\.[A-Za-z]{2,4}$/,
    // 手机
    rCellphone: /^1[3458]\d{9}$/,
    //区号   
    rPhoneArea: /^\d{3,4}$/,
    // 电话
    rPhone: /^\d{7,8}$/,
    // 分机号
    rPhoneExt: /^\d{1,6}$/,
    // 邮编
    rZipcode: /^\d{6}$/,

    lenLimits: {
        cardId: [0, 30],
        name: [2, 26]
    },

    // 包含繁体字
    hasTraditionalChs: function (v) {
        //繁体字库
        var chars = v.split("");
        for (var i = 0; i < chars.length; i++) {
            if (WordLib.traditionalChs.indexOf(chars[i]) >= 0) {
                return true;
            }
        }
        return false;
    },

    // 包含生僻字
    hasRareChs: function (v) {
        var chars = v.split("");
        for (var i = 0; i < chars.length; i++) {
            if (WordLib.rareChs.indexOf(chars[i]) >= 0) {
                return true;
            }
        }
        return false;
    },

    // 验证身份证
    isChinaIDCard: function (v) {
        var a = v.toLowerCase().match(/\w/g);
        if (v.match(/^\d{17}[\dx]$/i)) {
            for (var b = 0, c = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2], d = 0; 17 > d; d++)
                b += parseInt(a[d], 10) * c[d];
            return "10x98765432".charAt(b % 11) != a[17] ? false : !!v.replace(/^\d{6}(\d{4})(\d{2})(\d{2}).+$/, "$1-$2-$3").isDate()
        }
        return false;
    },
    //手机验证
    isCellphone: function (cellphone) {
        if (cellphone.length == 12) {
            if (cellphone.substring(0, 1) == '0') //长途
                cellphone = cellphone.substring(1, 11);
            else
                return false;
        }
        if (cellphone.length != 11 || !this.rCellphone.test(cellphone))
            return false;

        return true;
    },

    getPassengerType: function (strBirthDay, strDepartDate) {
        var birthday = strBirthDay.toDate(),
			departTime = strDepartDate.toDate().getTime();

        if (birthday.addDays(14).getTime() > departTime)
            return passengerTypeEnum.littleBaby;

        // 岁数是向下取整的
        if (birthday.addYears(2).getTime() > departTime)
            return passengerTypeEnum.baby;  // 2岁以下

        if (birthday.addYears(12).getTime() > departTime)
            return passengerTypeEnum.child;

        if (birthday.addYears(12).getTime() == departTime || birthday.addYears(13).getTime() > departTime)
            return passengerTypeEnum.twelve;

        if (birthday.addYears(16).getTime() > departTime)
            return passengerTypeEnum.teenager; // 16岁以下

        if (birthday.addYears(24).getTime() > departTime)
            return passengerTypeEnum.youth; // 23岁以下

        if (birthday.addYears(55).getTime() > departTime)
            return passengerTypeEnum.adult;

        if (birthday.addYears(70).getTime() > departTime)
            return passengerTypeEnum.midOlder;

        return passengerTypeEnum.older;
    },

	getPassengerBirthday: function (txtCardId, txtBirthday, selectCardType){
		var birthday;
		 // 身份证
        if (S.noticeVal(selectCardType) == certificateTypeEnum.identity) {
			var v = S.noticeVal(txtCardId);
			if (v.length == 15) {
				birthday = '19' + v.slice(6, 8) + '-' + v.slice(8, 10) + '-' + v.slice(10, 12);
			} else {
				birthday = v.slice(6, 10) + '-' + v.slice(10, 12) + '-' + v.slice(12, 14);
			}
            return birthday;
        }
		
		return S.noticeVal(txtBirthday);
	},
	
	/*
	 * @function the common portal of bussiness validate function
	 * @param {string} which business aspect you want to validate
	 * @param {array} the array of validated object
	 * @param {arguments} conditional arguments which the validation need
	 * @return {boolean} result (pass or not pass)
	 */
	validate: function (type, objs){
		var args = S.toArray(arguments);
		args.splice(0,2);
		
		if(objs){
			args.unshift.apply(
				args, 
				objs.map(function (obj, i){
					return S.noticeVal(obj);
				})
			);
		}
		
		var result = BookValidator['validate' + type].apply(BookValidator, args);
		if(typeof result === 'boolean')
			return result;
		else
			return Mod.showTips(objs[result[0]], result[1]);
	},

    /**
    * @function 验证乘客基本证件信息
    * @param {string} 证件号/证件类型/国籍/出生日期
    * @return {array|number}
    *	不通过->数组 [应该在哪个参数上显示提示，提示内容]
    *	通过-> true
    */
    validateCardInfo: function (cardId, cardType, nationality, birthday) {
		var v = cardId;
	
        if (v == '')
            return [0, validateMessageConfig.empty[1]];
        // length limit
        if (v.length > this.lenLimits.cardId[1])
            return [0, validateMessageConfig.format[1]];

        // 身份证
        if (cardType == certificateTypeEnum.identity) {
			return this.isChinaIDCard(v) ? true : [0, validateMessageConfig.format[0]];
        }

        // if (nationality == '')
            // return [2, validateMessageConfig.empty[2]];

        if (birthday == '')
            return [3, validateMessageConfig.empty[4]];

        if (!birthday.isDate()) {
            return [3, validateMessageConfig.format[9]];
        }

        // 证件类型-国籍验证
        // if (nationality == nationalityEnum.china_taiwan &&
			// (cardType != certificateTypeEnum.taiwan && cardType != certificateTypeEnum.travel && cardType != certificateTypeEnum.other)) {
            // // 中国台湾只能台胞、旅行、其它
            // return [1, validateMessageConfig.logic[2]];
        // }

        //非大陆居民不能使用户口簿\出生证明\军人证
        // if (nationality != nationalityEnum.china_mainland) {
            // switch (cardType) {
                // case certificateTypeEnum.booklet:
                    // return [1, validateMessageConfig.logic[3]];
                // case certificateTypeEnum.military:
                    // return [1, validateMessageConfig.logic[4]];
                // case certificateTypeEnum.birth:
                    // return [1, validateMessageConfig.logic[5]];
                // default:
                    // break;
            // }
        // }
		
		return true;
    },
	/**
    * @function 验证乘客类型
    * @param {string} 证件号/证件类型/国籍/乘客类型/证件类型文本
    * @return {array|number}
    *	不通过->数组 [应该在哪个参数上显示提示，提示内容]
    *	通过-> true
    */
    validatePassengerType: function (cardId, cardType, nationality, passengerType, cardTypeText){
		// 军人证
        if (cardType == certificateTypeEnum.military) {
            if (this.rMilitary.test(cardId)) {
                return [0, validateMessageConfig.format[3]];
            }
            if (passengerType <= passengerTypeEnum.child) {
                return [1, validateMessageConfig.logic[8]];
            }
            return true;
        }

        // 台胞证
        // if (cardType == certificateTypeEnum.taiwan) {
            // if (nationality != nationalityEnum.china_taiwan) {
                // return [2, validateMessageConfig.logic[6]];
            // } else if (this.rTaiwan.test(cardId)) {
                // return [0, validateMessageConfig.format[2]];
            // }
            // return passengerType;
        // }

        // 基本格式校验
        if (this.rNormal.test(cardId)) {
            return [0, S.format(validateMessageConfig.format[4], cardTypeText)];
        }

        // 回乡证
        // if (cardType == certificateTypeEnum.homeReturn && nationality != nationalityEnum.china_hongkong &&
			// nationality != nationalityEnum.china_macao) {
            // return [2, validateMessageConfig.logic[7]];
        // }

        // 户口薄
        if (cardType == certificateTypeEnum.booklet && passengerType > passengerTypeEnum.teenager) {
            return [1, validateMessageConfig.logic[10]];
        }

        // 出生证明
        if (cardType == certificateTypeEnum.birth && passengerType >= passengerTypeEnum.twelve) {
            return [1, validateMessageConfig.logic[9]];
        }

		return true;
	},
	/**
    * @function 验证乘客姓名
    * @param {string} 名字/国籍/证件类型
    * @return {array|boolean} 不通过->数组 [应该在哪个参数上显示提示，提示内容] 通过->布尔 true
    */
    validateName: function (v, nationality, cardType) {
        if (v == '')
            return [0, validateMessageConfig.empty[0]];
        if (v.length < this.lenLimits.name[0])
            return [0, validateMessageConfig.format[7]];
        if (v.length >= this.lenLimits.name[1])
            return [0, validateMessageConfig.format[8]];

        if (this.rChsChar.test(v)) {
            // if (cardType != certificateTypeEnum.identity && nationality == '') {
                // return [1, validateMessageConfig.empty[2]];
            // }

            //非中国 不能使用中文名
            // if (cardType != certificateTypeEnum.identity && nationality.indexOf(nationalityEnum.china) < 0) {
                // return [0, validateMessageConfig.rule[4]];
            // }

            // //中文 生僻字
            // if (!this.rChinese.test(v) || this.hasTraditionalChs(v)) {
            // return [0, validateMessageConfig.format[18]];
            // }

            return true;
        } else {
            if (!this.rEnglish.test(v)) {
                return [0, validateMessageConfig.format[5]];
            }

            return true;
        }

    },
    /**
    * @function 验证乘客是否满足航班规定
    * @param {number}  证件类型
	* @param {string} 乘客姓名
	* @param {array} 提示位置的两个 cardId与birthday
	* @param {array} 提示位置的两个 cardId与birthday
	* @param {number} 乘客类型
	* @param {array} 航班属性 [ 是否青年特价, 是否中老年特价, 是否是春秋, 是否是国内航空, 成人, 儿童, 婴儿, 进藏 ]
    * @return {array|boolean} 不通过->数组 [应该在哪个参数上显示提示，提示内容] 通过->布尔 true
    */
    validateFltRule: function (cardType, name, cardId, birthday, passengerType, fltAttr) {
        var tipPos = cardType == certificateTypeEnum.identity ? 2 : 3;

        if (passengerType <= passengerTypeEnum.littleBaby) {
            return [tipPos, validateMessageConfig.rule[0]];
        }

        if (!!fltAttr[0] && (passengerType < passengerTypeEnum.twelve || passengerType > passengerTypeEnum.youth)) {
            return [tipPos, validateMessageConfig.rule[1]];
        }

        if (!!fltAttr[1] && passengerType <= passengerTypeEnum.adult) {
            return [tipPos, validateMessageConfig.rule[2]];
        }

        if (!!fltAttr[2] && passengerType >= passengerTypeEnum.older) {
            return [tipPos, validateMessageConfig.rule[3]];
        }

        if (!!fltAttr[3] && this.hasTraditionalChs(name)) {
            return [1, validateMessageConfig.rule[5]];
        }

        if (!!fltAttr[7] && cardType != certificateTypeEnum.identity && cardType != certificateTypeEnum.booklet)
            return [0, validateMessageConfig.rule[9]];
        
        return true;
    },
    /**
    * @function 验证联系人信息
    * @param {string} 姓名/确认方式/手机/固话/邮箱
    * @return {array|boolean} 不通过->数组 [应该在哪个参数上显示提示，提示内容] 通过->布尔 true
    */
    validateContact: function (name, confirmType, cellphone, phoneArea, phoneMain, phoneExt, email, isOrderDirectly) {
        if (name == '')
            return [0, validateMessageConfig.empty[7]];
        if (name.length < this.lenLimits.name[0])
            return [0, validateMessageConfig.format[7]];
        if (name.length >= this.lenLimits.name[1])
            return [0, validateMessageConfig.format[8]];

        if (cellphone.length > 0 && !this.isCellphone(cellphone))
            return [2, validateMessageConfig.format[11]];

        if (phoneArea.length > 0 && !this.rPhoneArea.test(phoneArea)) {
            return [3, validateMessageConfig.format[15]];
        }
        if (phoneMain.length > 0 && !this.rPhone.test(phoneMain)) {
            return [4, validateMessageConfig.format[16]];
        }
        if (phoneExt.length > 0 && !this.rPhoneExt.test(phoneExt)) {
            return [5, validateMessageConfig.format[17]];
        }

        if (email.length > 0 && !this.rEmail.test(email))
            return [6, validateMessageConfig.format[10]];

		if(isOrderDirectly && cellphone == '') // 直接预订判断
			return [2, validateMessageConfig.empty[6]];
			
        if (confirmType == confirmTypeEnum.sms && cellphone == '')
            return [2, validateMessageConfig.empty[13]];

        if (confirmType == confirmTypeEnum.tel || confirmType == confirmTypeEnum.noNeed) {
            if (cellphone == '' && phoneMain == '')
                return [2, validateMessageConfig.empty[14]];
        }

        if (confirmType == confirmTypeEnum.email && email == '')
            return [6, validateMessageConfig.empty[12]];

        return true;
    },
    /**
    * @function 验证入住人名字
    * @param {string} 姓名/是否是海外酒店
    * @return {array|boolean} 不通过->数组 [应该在哪个参数上显示提示，提示内容] 通过->布尔 true
    */
    validateCheckInPerson: function (name, isIntl) {
        var result = [0, validateMessageConfig.format[13]];
        if (name == '')
            return result;
        if (name.length < this.lenLimits.name[0])
            return [0, validateMessageConfig.format[7]];
        if (name.length >= this.lenLimits.name[1])
            return [0, validateMessageConfig.format[8]];

        if (isIntl && !this.rEnglish.test(name))
            return [0, validateMessageConfig.logic[12]]; ;

        if (this.rChsChar.test(name)) {
            if (!this.rChinese.test(name))
                return result;
        } else {
            if (!this.rEnglish.test(name))
                return result;
        }

        return true;
    },
    /**
    * @function 验证发票信息
    * @param {string} 是否是EMS/抬头/姓名/EMS手机/邮编/地址
    * @return {array|boolean} 不通过->数组 [应该在哪个参数上显示提示，提示内容] 通过->布尔 true
    */
    validateInvoice: function (title, receiver, phone, zipcode, address, isEMS) {
        if (title == '')
            return [0, validateMessageConfig.empty[8]];

        if (receiver == '')
            return [1, validateMessageConfig.empty[9]];
        if (receiver.length < this.lenLimits.name[0])
            return [1, validateMessageConfig.format[7]];
        if (receiver.length >= this.lenLimits.name[1])
            return [1, validateMessageConfig.format[8]];

        if (isEMS) {
            if (phone == '')
                return [2, validateMessageConfig.empty[6]];
            if (!this.isCellphone(phone))
                return [2, validateMessageConfig.format[11]];
        }

        if (zipcode == '')
            return [3, validateMessageConfig.empty[10]];
        if (zipcode.length > 0 && (zipcode.length != 6 || !this.rZipcode.test(zipcode)))
            return [3, validateMessageConfig.format[14]];

        if (address == '')
            return [4, validateMessageConfig.empty[11]];

        return true;
    }
}

/**@class 联系人*/
var Contact = function (uid, name, cardId, phone, a) {
    this.uid = uid;
    this.name = name;
    this.cardId = cardId;
    this.phone = phone;
    this.a = a ? $(a) : undefined; // 联系人A标签
    this.selected = false;
}
Contact.prototype = {
    constructor: Contact,

    select: function () {
        this.selected = true;
        this.a.addClass('selected');
    },
    cancel: function () {
        this.selected = false;
        this.a.removeClass('selected');
    },

    show: function () {
        this.a[0].parentNode.className = '';
    },
    hide: function () {
        this.a[0].parentNode.className = 'hidden';
    }
}

/**@class 联系人列表框*/
var ContactList = {

    _div: undefined,
    _onCheck: undefined,
    _fnLimit: undefined,

    contacts: {},
    /*
    * @function init the contact list
    * @param {boolean} init the data only without the choose and search function
    * @param {function} the upper boundary judge function
    * @param {function} check event optional for only init data (params: contact, selected)
    */
    init: function (isDataOnly, fnLimit, onCheck) {
        this._onCheck = onCheck;
        this._fnLimit = fnLimit || function () {
            return false;
        }; // default: no limit;

        this._initList(isDataOnly);
        !isDataOnly && this._initSearcher();
    },

    _initList: function (isDataOnly) {
        var contactList = $('#customerList');

        var lnks = contactList.find('a');
        var uid, name, props;
        for (var i = 0, len = lnks.length; i < len; i++) {
            uid = lnks[i].getAttribute('uid');
            name = lnks[i].getAttribute('title');
            props = lnks[i].getAttribute('props') && lnks[i].getAttribute('props') != '' ?
				lnks[i].getAttribute('props').split('|') : [undefined, undefined];
            this.contacts[uid] = new Contact(uid, name, props[0], props[1], lnks[i]);
        }

        // 自由组合情况不需要联系人勾选
        (lnks.length > 0 && !isDataOnly) && this._bindContactCheckEvent(contactList);
    },

    _initSearcher: function () {
        var _this = this;
        var txtNameFilter = $('#txtNameFilter');

        Mod.regNotice(txtNameFilter, 'txtNameFilter', 11);

        var typeListener = new Mod.TypeListener(txtNameFilter, function (v) {
            var contact;
            for (var k in _this.contacts) {
                contact = _this.contacts[k];
                if (v == '') {
                    contact.show();
                } else if (contact.name.indexOf(v) > -1) {
                    contact.show();
                } else {
                    contact.hide();
                }
            }
        });
    },

    _bindContactCheckEvent: function (contactList) {
        var _this = this;
        contactList.bind('click', function (e) {
            var target = e.target || e.srcElement;
            if (target.nodeName != 'A')
                return;

            var uid = target.getAttribute('uid');

            _this.check(uid);
        });
    },
    // 勾选
    check: function (uid) {
        var contact = this.contacts[uid],
		selected;

        if (contact.selected) {
            contact.cancel();
            selected = false;
        } else {
            if (!this._fnLimit()) { // 是否人满
                contact.select();
                selected = true;
            } else {
                // 人满提示
                Mod.formValidator.method("show", {
                    $obj: contact.a,
                    data: validateMessageConfig.logic[11],
                    position: 'lm_bm',
                    errorClass: '',
                    show: function (o) {
                        var l, t;
                        if (o.iframe == o.doc) {
                            l = parseFloat(o.$tip[0].style.left),
							t = parseFloat(o.$tip[0].style.top);
                            o.$tip[0].style.left = (l + 20) + 'px';
                            o.$tip[0].style.top = (t - 10) + 'px';
                        } else {
                            // fix ie6 bug 
                            l = parseFloat(o.iframe.style.left),
							t = parseFloat(o.iframe.style.top);
                            o.iframe.style.left = (l + 20) + 'px';
                            o.iframe.style.top = (t - 10) + 'px';
                        }
                    }
                });
                return;
            }
        }

        (typeof this._onCheck === 'function') && this._onCheck(contact, selected);
    },

    findContact: function (name, type) {
        type = type || 'name';

        if (type == 'uid') {
            return this.contacts[name];
        }

        for (var k in this.contacts) {
            if (this.contacts[k].name == name) {
                return this.contacts[k];
            }
        }
        return null;
    }
}

/**@class 乘客填写框
*@param {cDom}
*@param {function} onclear event (params: uid,name)
*	this event happens after the clear action is done.
*	就目前来说 由于组件间交互的需要及实际需求, uid与name是等效的
*/
var PassengerBox = function (div, onClear) {
    this.uid = undefined;
    this.div = $(div);
    // 航程信息
    this.routeInfo = [];
    // 清空事件绑定
    this.onClear = onClear;

    this._initRouteInfo();
    this._initElements();
}
PassengerBox.focusOne = undefined; // 当前填写的PassengerBox (对象之间共享)
PassengerBox.prototype = {
    constructor: PassengerBox,

    _initRouteInfo: function () {
        var _this = this;
        var ul = S.prev(this.div, 'ul'),
		routeNo = ul.getAttribute('_routeNo') - 0,
		fltAttr = ul.getAttribute('_fltAttr'),
		strDepartDate = ul.getAttribute('_departDate');
        this.routeInfo.push(routeNo);
        this.routeInfo.push(strDepartDate);
        fltAttr.split('|').each(function (attr) {
            attr != "" && _this.routeInfo.push(+attr);
        });
        // [ 航程序号, 出发时间, 是否青年特价, 是否中老年特价, 是否是春秋, 是否是国内航空, 成人数, 儿童数, 婴儿数 ]
    },

    _initElements: function () {
        var textboxes = this.div.find('input[type="text"]'),
		selects = this.div.find('select');
        this.txtName = $(textboxes[0]);
        this.txtNationality = textboxes[1];
        this.txtCardId = textboxes[2];
        this.txtBirthday = textboxes[3];
        this.selectCardType = selects[0];
        this.selectGender = selects[1];

        this._initNameInput();
        this._initMoreInput();
        this._initClearLink();

        // focus bind ( low priority )
        var focusFn = (function (_this) {
            return function () {
                _this.focusOn();
            }
        })(this);
        textboxes.each(function (txt) {
            txt.bind('focus', focusFn);
        });
        selects.each(function (sel) {
            sel.bind('focus', focusFn);
        });
    },

    _initNameInput: function () {
        var _this = this;
        // name notice
        this.txtName[0].setAttribute('_cqnotice', noticeConfig[0]);
        if (S.noticeVal(this.txtName) == '')
            this.addNameNotice();
        this.txtName.bind('focus', function () {
            if (S.noticeVal(_this.txtName) == '') {
                _this.removeNameNotice();
            }
            _this.focusOn();
        });
        this.txtName.bind('blur', function () {
            if (_this.txtName.value().trim() == '') {
                _this.addNameNotice();
            }
        });
    },

    _initMoreInput: function () {
        var _this = this;
        // card type select
        this.toggleMoreInput();
        $(this.selectCardType).bind('change', function (el) {
            _this.toggleMoreInput();
        });
        // nationality select
        // Mod.regNotice($(this.txtNationality), 'txtNationality', 1);
        // this.regNationality($(this.txtNationality), 'txtNationality', inputPassengerConfig.titles[0]);
        // birthday
        Mod.regNotice($(this.txtBirthday), 'txtBirthday', 2);
    },

    _initClearLink: function () {
        this.lnkClear = this.div.find('div.title a');
        var _this = this;
        $(this.lnkClear).bind('click', function () {
            var uid = _this.uid,
			name = _this.txtName.value();
            _this.unbindContact();
            if (typeof _this.onClear === 'function')
                _this.onClear(uid, name);
        });
    },

    regNationality: function (target, name, title) {

        var list, links; // suggestion list and links

        function updown(e) {
            if (!list) return;

            links = links || list.find('a');

            switch (e.keyCode) {
                case 13:
                    var hoverOne = list.find('a.hover')[0];
                    if (hoverOne)
                        target[0].value = hoverOne.getAttribute('data').split('|')[1];
                    e.stop();
                    return false;
                    break;
                case 38: //preview selection
                case 40: //next selection
                    var hoverOne = list.find('a.hover')[0];
                    var i = (hoverOne ? links.indexOf(hoverOne) : -1) + e.keyCode - 39;
                    i = i < 0 ? 0 : (i >= links.length ? links.length - 1 : i);

                    hoverOne && (hoverOne.className = '');
                    links[i].className = 'hover';
                    e.stop();
                    return false;
                    break;
            }
        }


        target.regMod('address', '1.0', {
            name: name,
            source: {
                suggestion: nationalitySuggestion,
                data: nationalityData
            },
            template: {
                suggestion: '\
					<div style="width: 222px; height: 355px;" id="tuna_address" class="c_address_select">\
						<div class="c_address_wrap">\
							<div class="c_address_hd">' + title + '</div>\
							<div class="c_address_list" style="">\
								{{each data}}\
									<a href="javascript:void(0);" data="${data}" style="display: block;"><span>${eng}</span>${chs}</a>\
								{{/each}}\
							</div>\
						</div>\
					</div>\
					',
                suggestionStyle: '\
					.c_address_hd { height: 24px; border-color: #2C7ECF; border-style: solid; border-width: 1px 1px 0; background-color: #67A1E2; color: #fff; line-height: 24px; padding-left: 10px; }\
					.c_address_bd { border-color: #999999; border-style: solid; border-width: 0 1px 1px; overflow: hidden; padding:10px; }\
					.c_address_select { width:222px; height:355px; font-family: Arial, Simsun; font-size: 12px; }\
					.c_address_wrap { width: 220px; min-height: 305px; margin: 0; padding: 0 0 4px; border: 1px solid #969696; background:#fff; text-align: left; }\
					.c_address_select .c_address_hd { margin:-1px; }\
					.c_address_select .c_address_list { margin: 0; min-height: 277px; padding: 0; }\
					.c_address_select .c_address_list span { float: right; font: 10px/22px verdana; margin: 0; overflow: hidden; padding: 0; text-align: right; white-space: nowrap; width: 110px; }\
					.c_address_select .c_address_list a { border-bottom: 1px solid #FFFFFF; border-top: 1px solid #FFFFFF; color: #0055AA; cursor: pointer; display: block; height: 22px; line-height: 22px; min-height: 22px; overflow: hidden; padding: 1px 9px 0; text-align: left; text-decoration: none; }\
					.c_address_select .c_address_list a:hover { background: none repeat scroll 0 0 #E8F4FF; border-bottom: 1px solid #7F9DB9; border-top: 1px solid #7F9DB9; }\
					.c_address_list a.hover { background: none repeat scroll 0 0 #E8F4FF; border-bottom: 1px solid #7F9DB9; border-top: 1px solid #7F9DB9; }\
					.c_address_select .address_selected { background: none repeat scroll 0 0 #FFE6A6; color: #FFFFFF; height: 22px; }\
					.c_address_select a.address_current { color: #000; text-decoration: none; }\
					',
                suggestionInit: function (obj) {

                    list = obj.find('.c_address_list');

                    target.unbind('keydown', updown);

                    target.bind('keydown', updown);
                }
            },
            isFocusNext: false,
            isAutoCorrect: true,
            message: {
                filterResult: title
            },
            offset: 5
        });
    },

    addNameNotice: function () {
        this.txtName.addClass('inputSel');
        this.txtName.value(noticeConfig[0]);
    },
    removeNameNotice: function () {
        this.txtName.removeClass('inputSel');
        this.txtName.value('');
    },

    focusOn: function () {
        if (PassengerBox.focusOne)
            PassengerBox.focusOne.focusOut();
        PassengerBox.focusOne = this;
        this.div.addClass('detail_customer_hover');
    },
    focusOut: function () {
        this.div.removeClass('detail_customer_hover');
    },

    toggleMoreInput: function () {
        var cardType = this.selectCardType.value;
        if (cardType == certificateTypeEnum.identity) {
            // this.txtNationality.parentNode.className = 'hidden';
            // S.prev(this.txtNationality.parentNode).className = 'hidden';
            // this.selectGender.parentNode.className = 'hidden';
            // S.prev(this.selectGender.parentNode).className = 'hidden';
            this.txtBirthday.parentNode.className = 'hidden';
            S.prev(this.txtBirthday.parentNode).className = 'hidden';
        } else {
            // this.txtNationality.parentNode.className = '';
            // S.prev(this.txtNationality.parentNode).className = '';
            // this.selectGender.parentNode.className = '';
            // S.prev(this.selectGender.parentNode).className = '';
            this.txtBirthday.parentNode.className = '';
            S.prev(this.txtBirthday.parentNode).className = '';
        }
    },

    bindContact: function (contact) {
        this.uid = contact.uid;

        this.removeNameNotice();
        this.txtName[0].value = contact.name;
        this.txtCardId.value = contact.cardId;
        this.selectCardType.value = 1; // 默认选中身份证
        // control the display of the more input manually
        this.toggleMoreInput();
    },
    unbindContact: function () {
        this.uid = undefined;

        this.addNameNotice();
        this.txtCardId.value = '';
        this.selectCardType.value = 1; // 默认选中身份证

        this.toggleMoreInput();
    },

    validate: function (isShallow) {
        if (isShallow) {
            if (S.noticeVal(this.txtName) == '')
                return false;
            else
                return true;
        } else {
            // 深层验证
			var inputs1 = [this.txtName, this.txtNationality, this.selectCardType],
				inputs2 = [this.txtCardId, this.selectCardType, this.txtNationality, this.txtBirthday],
				inputs3 = [this.txtCardId, this.selectCardType, this.txtNationality],
				inputs4 = [this.selectCardType, this.txtName, this.txtCardId, this.txtBirthday],
				cardTypeText = this.selectCardType.options[this.selectCardType.selectedIndex].text,
				validator = BookValidator;
				
			if(validator.validate('Name', inputs1) && validator.validate('CardInfo', inputs2)){
				var birthday      = validator.getPassengerBirthday(this.txtCardId, this.txtBirthday, this.selectCardType);
				var passengerType = validator.getPassengerType(birthday, this.routeInfo[1]);
				if(validator.validate('PassengerType', inputs3, passengerType, cardTypeText) &&
					validator.validate('FltRule', inputs4, passengerType, this.routeInfo.slice(2)))
					return passengerType; 
			}
			
			return false;
        }
    }
}

/**@class 乘客填写框列表 */
var PassengerList = {
    boxList: [],

    init: function () {
        // prepare the alert divs
        this.divAlerts = $('ul.adv_detail_item + div.book_alert2');
        this.hChildAsAdult = $('#hChildAsAdult');

        this._initBoxes();
        this._initTicketChange();

    },

    _initBoxes: function (boxes) {
        var passengerBox, boxes = $('div.detail_customer_free');
        for (var i = 0, len = boxes.length; i < len; i++) {
            passengerBox = new PassengerBox(boxes[i]);
            this.boxList.push(passengerBox);
        }
    },

    _initTicketChange: function () {
        var divTicketChange = $('#divTicketChange'),
			btns = divTicketChange.find('input'),
			divs = divTicketChange.find('>div'),
			priceSpans = $(divs[0]).find('span'),
			rPrice = /(\d+\.?\d*)/,
			_this = this;

        function change(i) {
            priceSpans.each(function (span, i) {
                var price = span[0].getAttribute('data-price');
                span[0].innerHTML = span[0].innerHTML.replace(rPrice, function (_, price2, i) {
                    span[0].setAttribute('data-price', price2);
                    return price;
                })
            });

            if (!i) {
                $(divs[1]).addClass('hidden');
                $(divs[2]).removeClass('hidden');
            } else {
                $(divs[2]).addClass('hidden');
                $(divs[1]).removeClass('hidden');
            }

            _this.hChildAsAdult.value(!!i ? 0 : 1);
        }

        btns.each(function (btn, i) {
            btn.bind('click', function (e) {
                change(i);
            });
        });

        // init
        if (this.hChildAsAdult.value() == '1')
            change(1);

        this._fixSide(divTicketChange);
    },

    _fixSide: function (div) {
        var upperBound = div.offset().top,
			fixClass = 'book_side_fixed',
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
                var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

                if (scrollTop > upperBound) {
                    if (isFixed) return;
                    $(div).addClass(fixClass);
                    div[0].style.top = '6px';
                    isFixed = true;
                } else {
                    $(div).removeClass(fixClass);
                    div[0].style.top = '';
                    isFixed = false;
                }
            }
        }

        window.onscroll = scrollHandle;
        scrollHandle();
    },

    showTicketsError: function (routeNo, msg) {
        this.divAlerts[routeNo - 1].innerHTML = msg;
        $(this.divAlerts[routeNo - 1]).removeClass('hidden');
        this.divAlerts[routeNo - 1].focus();
        return false;
    },

    hideTicketsError: function () {
        this.divAlerts.each(function (el, i) {
            el.addClass('hidden');
        });
    },

    validate: function () {
        var boxes = this.boxList,
			result = false,
			routeTickets = {}, ticket,
			routeNo, oldNo = boxes[0].routeInfo[0],
			types, routePeople, routeOk = false,
			name, i;

        this.hideTicketsError();

        var _this = this;
        function validateTypes(i, routeNo) {
            routePeople = boxes[i - 1].routeInfo.slice(6);
            types = routeTickets[routeNo].types;
            routeOk = types[0] == routePeople[0] && types[1] == routePeople[1] && types[2] == routePeople[2];
            return routeOk ? true : _this.showTicketsError(routeNo, validateMessageConfig.rule[6]);
        }

        for (i = 0, len = boxes.length; i < len; i++) {
            result = boxes[i].validate(false);
            if (!result)
                return false;

            routeNo = boxes[i].routeInfo[0];

            // the ticket infoes of current 
            if (!routeTickets[routeNo]) {
                ticket = { names: [], types: [0, 0, 0] }
                routeTickets[routeNo] = ticket;
            }

            // check whether there are same name.
            name = boxes[i].txtName.value().trim();
            if (ticket.names.length > 0 && ticket.names.indexOf(name) > -1)
                return this.showTicketsError(routeNo, validateMessageConfig.rule[7]);
            ticket.names.push(name);

            if (routeNo != oldNo) {
                // 验证这一程 票种比例
                if (validateTypes(i, oldNo))
                    oldNo = routeNo;
                else
                    return false;
            }

            if (result <= passengerTypeEnum.baby)
                ticket.types[2]++;
            else if (result <= passengerTypeEnum.child)
                ticket.types[1]++;
            else
                ticket.types[0]++;

        }
        // 最后一程验证
        return validateTypes(i, routeNo);
    },

    firstEmptyBox: function () {
        var box;
        for (var i = 0, len = this.boxList.length; i < len; i++) {
            box = this.boxList[i]; // txtName 校验非联系人乘客
            if (!box.validate(true)) {
                return box;
            }
        }
        return null;
    },

    findBox: function (uid, type) {
        type = type || 'name';

        var boxes = this.boxList,
		val;

        for (var i = 0, len = boxes.length; i < len; i++) {
            if (type == 'uid') {
                val = boxes[i].uid;
            } else {
                val = boxes[i].txtName.value();
            }

            if (val == uid)
                return boxes[i];
        }

        return null;
    }
}

/**@class 订单联系人管理器（单例）
* 一个组件交互的控制器 ContactList PassengerList ContactSelect
*/
var OrderBookManager = {

    bookContact: {}, // 订单联系人
    bookInvoice: {}, // 发票
    divAlerts: undefined, //每程提示面板
    isFreeOrder: undefined, // 是否是对自由组合下单

    init: function () {
        // 这货太找打了，你说你直接给个bool的会死啊
        this.isFreeOrder = $('#hIsFree').value() == 'block' ? false : true;

        PassengerList.init();
        this._initPassengerRelate();

        ContactList.init(this.isFreeOrder, function () {
            return !PassengerList.firstEmptyBox();
        }, this._onCheckContact);

        if (this.isFreeOrder) {
            this._initCheckInPersonSelect();
        }

        this._initMoreNeed();
        this._initContactInput();
        this._initInvoice();

        this._bindConfirmEvent();
    },

    // 创建乘客框与其它组件的关联
    _initPassengerRelate: function () {
        var _this = this;
        if (_this.isFreeOrder) {
            // name select contact
            PassengerList.boxList.each(function (passengerBox, i) {
                ContactSelect.reg(passengerBox.txtName, function (contact) {
                    passengerBox.bindContact(contact);
                }, textsConfig.pop_titles[1]);
            });
        } else {
            // connect with contact list
            var contact = null,
			box = null;
            PassengerList.boxList.each(function (passengerBox, i) {

                passengerBox.onClear = _this._onBoxClear;

                var typeListener = new Mod.TypeListener(passengerBox.txtName, function (v) {
                    contact = ContactList.findContact(v);
                    if (contact) {
                        !contact.selected && contact.select();
                        //如果输入的name=contact.name, 绑定uid到box上
                        //但如果是ContactSelect或其它非输入方式，uid与name还是会不同步
                        passengerBox.bindContact(contact);
                    } else {
                        if (!passengerBox.uid)
                            return;

                        contact = ContactList.findContact(passengerBox.uid, 'uid');
                        box = PassengerList.findBox(contact.name);

                        passengerBox.uid = undefined; // unbindContact or not, there is not reference in prd.
                        if (!box && contact.selected) {
                            contact.cancel();
                        }
                    }
                });
            });
        }
    },

    // 勾选联系人
    _onCheckContact: function (contact, isChecked) {
        var _this = PassengerList;
        if (isChecked) {
            // 将信息绑定到第一个可填写的PassengerBox上
            var box = PassengerList.firstEmptyBox();
            box.bindContact(contact);
        } else {
            // 清空所有相关的乘客信息
            // uid的方案不能在任何情况下保持boxlist与contactlist的同步
            // 故此处使用name方案
            var name = contact.name;
            for (var i = 0, len = _this.boxList.length; i < len; i++) {
                if (_this.boxList[i].txtName.value() == name)
                    _this.boxList[i].unbindContact();
            }
        }
    },

    // 乘客栏清空
    _onBoxClear: function (uid, name) {
        if (!name)
            return;

        var box = PassengerList.findBox(name);
        if (!box) {
            var contact = ContactList.findContact(name);
            if (contact && contact.selected) {
                contact.cancel();
            }
        }
    },

    _initCheckInPersonSelect: function () {
        var hotelInputs = $('dl.free_book_hotel input[type="text"]');
        hotelInputs.each(function (el, i) {
            ContactSelect.reg(el, function (contact) {
                el.value(contact.name);
            }, textsConfig.pop_titles[1]);
        });
    },
	// 联系填写
    _initContactInput: function () {
        var txtContact = $('#txtContact'),
		container = $(txtContact[0].parentNode.parentNode.parentNode),
		txtInputs = container.find('input[type="text"]'),
		txtContactPhone = txtInputs[1];

        //Mod.regNotice(txtContact, 'txtContact', 0);

        // register notice
        for (var i = 2, len = txtInputs.length; i < len; i++) {
            Mod.regNotice($(txtInputs[i]), txtInputs[i].name, i + 5);
        }

        ContactSelect.reg(txtContact, function (contact) {
            txtContact.value(contact.name);
            txtContact.removeClass('inputSel');
            txtContactPhone.value = contact.phone;
        });

        this.bookContact.txtContact = txtContact[0];
        this.bookContact.selectConfirmType = container.find('select')[0];
        this.bookContact.txtContactPhone = txtContactPhone;
        this.bookContact.txtPhoneArea = txtInputs[2];
        this.bookContact.txtPhoneMain = txtInputs[3];
        this.bookContact.txtPhoneExt = txtInputs[4];
        this.bookContact.txtEmail = txtInputs[5];
    },

    _initMoreNeed: function () {
        var txtRemark = $('#txtRemark');
        // length limit
        var maxLength = txtRemark[0].getAttribute('maxlength') - 0 || 500;
        txtRemark.bind('blur', function (e) {
            (txtRemark[0].value.length > maxLength) && (txtRemark[0].value = txtRemark[0].value.substring(0, maxLength));
        });

        if (!this.isFreeOrder) {
            // 床型选择
            var bedSelect = $('#bedSelect')[0];
            $('#chkBedStyle').bind('click', function (e) {
                var target = e.target;
                if (target.checked) {
                    bedSelect.disabled = false;
                } else {
                    bedSelect.disabled = true;
                }
            });

            // 补充说明
            $('#lnkMoreNeed').bind('click', function (e) {
                txtRemark.hasClass('hidden') ? txtRemark.removeClass('hidden') : txtRemark.addClass('hidden');
            });
        }
    },
	// 发票信息填写
    _initInvoice: function () {
        var self_contact = this.bookContact;
        var rdoInvoiceNo = $('#rdoInvoiceNo'),
			rdoInvoiceYes = $('#rdoInvoiceYes'),
			divInvoicePhone = $('#divInvoicePhone'),
			divInvoice = $('#divInvoice'),
			inputs = divInvoice.find('input'); // 平信 EMS Title Receiver Phone Zipcode Address
        rdoInvoiceNo.bind('click', function () {
            divInvoice.addClass('hidden');
        });
        rdoInvoiceYes.bind('click', function () {
            divInvoice.removeClass('hidden');

            // 联系人信息读下来
            inputs[3].value = self_contact.txtContact.value;
            inputs[4].value = self_contact.txtContactPhone.value;
            inputs[3].className = inputs[3].className.replace(' inputSel', '');
        });
        $(inputs[0]).bind('click', function (e) {
            divInvoicePhone.addClass('hidden');
        });
        $(inputs[1]).bind('click', function (e) {
            divInvoicePhone.removeClass('hidden');
        });

        rdoInvoiceNo[0].checked ? divInvoice.addClass('hidden') : divInvoice.removeClass('hidden');
        inputs[0].checked ? divInvoicePhone.addClass('hidden') : divInvoicePhone.removeClass('hidden');

        //notice
        for (var i = 2, len = inputs.length; i < len; i++) {
            if (i == 4) continue;
            Mod.regNotice($(inputs[i]), inputs[i].id, (i < 4 ? i + 1 : i));
        }

        // reg Selector
        // ReceiptInfo.reg($(inputs[3]), function (value){
        // var j;
        // for(var i=0, len = 4; i<len; i++){
        // j = i+3;
        // inputs[j].value = value[i];
        // inputs[j].className = inputs[j].className.replace(' inputSel', '');
        // }
        // });

        ContactSelect.reg(inputs[3], function (contact) {
            inputs[3].value = contact.name;
            contact.phone.length > 0 && (inputs[4].value = contact.phone);
            inputs[3].className = inputs[3].className.replace(' inputSel', '');
        });

        this.bookInvoice.rdoInvoiceYes = rdoInvoiceYes[0];
        this.bookInvoice.rdoEMS = inputs[1];
        this.bookInvoice.txtTitle = inputs[2];
        this.bookInvoice.txtReciever = inputs[3];
        this.bookInvoice.txtPhone = inputs[4];
        this.bookInvoice.txtZipcode = inputs[5];
        this.bookInvoice.txtAddress = inputs[6];
    },

    _bindConfirmEvent: function () {
        var _this = this;
        var btnBook = $('#btnBook');
        btnBook.bind('click', function () {
            var isPass = PassengerList.validate() && _this.validateCheckInPeople() &&
				_this.validateContact() && _this.validateInvoice();
            if (isPass) {
                _this.ajaxBooking(btnBook);
            };
            return false;
        });
    },

    ajaxBooking: function (btnBook) {
        var loading = $(S.next(btnBook));
        loading.removeClass('invisible');
        btnBook[0].className = 'btn_book_next_disable';

        function gotoCheck(searchWay) {
            btnBook[0].className = 'btn_book_next';
            loading.addClass('invisible');
            fm.action = URL.ORDER_CHECK + searchWay;
            fm.submit();
        }

        function gotoError(error) {
            btnBook[0].className = 'btn_book_next';
            loading.addClass('invisible');
            var hErrorInfo = S.create('<input type="hidden" name="ErrorInfo" value="' + error.ErrorInfo + '"/>');
            var hErrorInfoShow = S.create('<input type="hidden" name="ErrorInfoShow" value="' + error.ErrorInfoShow + '"/>');
            var divHidden = $('#divHidden')[0];
            divHidden.appendChild(hErrorInfo);
            divHidden.appendChild(hErrorInfoShow);
            fm.action = URL.ORDER_ERROR;
            fm.submit();
        }

        function gotoDefaultError() {
            gotoError({
                ErrorInfo: orderBookConfig.defaultError,
                ErrorInfoShow: ''
            });
        }

        $.ajax(URL.ORDER_BOOKING, {
            context: S.formSerialize(fm),
            method: cQuery.AJAX_METHOD_POST,
            onsuccess: function (xhr, res) {
                var data;
                try {	
					// remove carriage return char
                    data = (new Function('return ' + res.replace(/\t|\n|\r/g,'')))();
                } catch (e) {
                    gotoDefaultError();
                }

                if (data.Result) {
                    gotoCheck(data.SearchWay);
                } else {
                    gotoError(data);
                }
            },
            onerror: function (xhr, res) {
                gotoDefaultError();
            }
        });

        // 超时
        setTimeout(function () {
            gotoDefaultError();
        }, 60 * 1000);
    },

    validateCheckInPeople: function () {
        if (!this.isFreeOrder)
            return true; // 自由组合才要求输入入住人

        var txtInputs, emptyCount, checkInName, result, roomNum, emptyInput, isIntl;

        var hotelDls = $('dl.free_book_hotel');
        for (var i = 0, len = hotelDls.length; i < len; i++) {
            emptyCount = 0;
            emptyInput = undefined;
            roomNum = +hotelDls[i].getAttribute('data-rooms');
            txtInputs = $(hotelDls[i]).find('input[type="text"]');
            isIntl = !!(+hotelDls[i].getAttribute('data-isintl'));

            for (var j = 0, len2 = txtInputs.length; j < len2; j++) {
                checkInName = S.noticeVal(txtInputs[j]);
                if (checkInName == '') {
                    emptyCount++;
                    emptyInput || (emptyInput = txtInputs[j]);
                } else {
                    if (!BookValidator.validate('CheckInPerson', [txtInputs[j]], isIntl))
						return false;
                }
            }

            if (emptyCount + roomNum > txtInputs.length) {
                return Mod.showTips(emptyInput, validateMessageConfig.empty[5]);
            }
        }

        return true;
    },

    validateContact: function () {
		var contact = this.bookContact;
		
		// From MDN
		// Iterates over the enumerable properties of an object, in arbitrary order. 
        return BookValidator.validate('Contact',
				[contact.txtContact,
				contact.selectConfirmType,
				contact.txtContactPhone,
				contact.txtPhoneArea, 
				contact.txtPhoneMain, 
				contact.txtPhoneExt,
				contact.txtEmail],
                orderBookConfig.isOrderDirectly);
    },

    validateInvoice: function () {
        if (this.bookInvoice.rdoInvoiceYes.checked) {
			var invoice = this.bookInvoice;
            return BookValidator.validate(
					'Invoice',
					[invoice.txtTitle,
					invoice.txtReciever,
					invoice.txtPhone,
					invoice.txtZipcode,
					invoice.txtAddress],
					this.bookInvoice.rdoEMS.checked);
        }
        return true;
    }
}

/**@class 常用联系人|旅客下拉选择器（单例）*/
var ContactSelect = {
    _pnlPop: $('#pnlPop'),
    _pTitle: $('#pnlPop').find('p')[1],
    _divPeople: $('#pnlPop').find('div')[0],
    _lnkTmpl: '<a href="javascript:;" uid="$1" cardId="$4">$2<span>$3</span></a>',
    _checkInInputs: $('dl.free_book_hotel input[type="text"]'),
    // hide timer id
    _hideTimer: undefined,
    // current input
    _current: undefined,

    // 创建旅客信息
    _createPeopleLinks: function () {
        var list1 = PassengerList.boxList,
			list2 = this._checkInInputs,
			i, objs = [], existed = false;

        for (i = 0, len = list1.length; i < len; i++) {
            if (list1[i].validate(true)) {
                objs.push({
                    uid: list1[i].uid,
                    name: list1[i].txtName.value(),
                    cardId: list1[i].txtCardId.value
                });
            }
        }
        for (i = 0, len = list2.length; i < len; i++) {
            if (list2[i].value.trim() == '')
                continue;
            objs.push({
                name: list2[i].value
            });
        }
        objs = this._distinct(objs);

        var lnks = [];
        for (i = 0, len = objs.length; i < len; i++) {
            lnks.push(S.format(this._lnkTmpl,
					objs[i].uid ? objs[i].uid : '',
					objs[i].name,
					objs[i].phone ? objs[i].phone : '',
					objs[i].cardId ? objs[i].cardId : ''));
        }
        return lnks.join('');
    },
    _distinct: function (objs) {
        var dic = {}, name;
        for (var i = 0, len = objs.length; i < len; i++) {
            name = objs[i].name;
            if (!dic[name])
                dic[name] = objs[i];
        }
        objs = [];
        for (var name in dic) {
            objs.push(dic[name]);
        }
        dic = null;
        return objs;
    },

    changeTitle: function (text) {
        this._pTitle.innerHTML = text;
    },

    show: function (target, onSelect) {
        var html = this._createPeopleLinks();
        this._divPeople.innerHTML = html;

        S.insertAfter(this._pnlPop, target);
        this._pnlPop.removeClass('hidden');

        target.onSelect = onSelect;
        this._current = target;
    },
    hide: function () {
        this._pnlPop.addClass('hidden');
    },

    /*
    * @function reg the contact select on the txt input
    * @param {cDom} the specified txt input
    * @param {function} the fn which will be triggered when the 'someone' is selected
    * @param {string} optional the title text
    */
    reg: function (target, onSelect, title) {
        if (typeof target.bind !== 'function')
            target = $(target);
        title = title || textsConfig.pop_titles[0]; //没办法，受到万恶中文限制
        var _this = this;
        target.bind('focus', function () {
            clearTimeout(_this._hideTimer);
            _this.changeTitle(title);
            _this.show(target, onSelect);
        });
        target.bind('blur', function () {
            _this._hideTimer = setTimeout(function () {
                _this.hide();
            }, 200);
        });
    },

    select: function (el) {
        var phone,
		uid = el.getAttribute('uid'),
		cardId = el.getAttribute('cardId');
        // use the i mode to fix the upper case problem of ie.
        var name = el.innerHTML.replace(/<span>([^<]*)<\/span>/i, function (w, m, i) {
            phone = m;
            return '';
        });

        this.hide();

        var fn = this._current.onSelect;
        if (typeof fn === 'function')
            fn({
                uid: uid,
                name: name,
                phone: phone,
                cardId: cardId
            });
    },

    init: function () {
        // 初始化常用联系人部分HTML
        var contacts = ContactList.contacts,
		lnks = [];

        var contact_count = 0;
        for (var k in contacts) {
            if (contact_count++ > 8) break; // 最常用的9个
            lnks.push(S.format(this._lnkTmpl, contacts[k].uid, contacts[k].name, contacts[k].phone, contacts[k].cardId));
        }
        this._pnlPop.find('div')[1].innerHTML = lnks.join('');

        //将选择事件绑到pnlPop上
        var _this = this;
        this._pnlPop.bind('click', function (e) {
            var obj = e.target,
			nodeName = obj.nodeName;
            if (nodeName != 'A' && nodeName != 'SPAN')
                return;

            var el = nodeName == 'A' ? obj : obj.parentNode;

            _this.select(el);
        });

        if (cQuery.browser.isIE6)
            this._fixIE6PopPanelBug();
    },

    //针对IE6进行特殊处理以使浮层置于select之上
    _fixIE6PopPanelBug: function () {
        var strIframe = '<iframe frameborder="none" style="position: absolute; z-index: -1; filter: mask(); border: 0; margin: 0; padding: 0; top: 0; left: 0; width: 9999px;height: 9999px; overflow: hidden;"></iframe>';
        var ifr = S.create(strIframe);
        this._pnlPop[0].appendChild(ifr);
    }
};

// limit sumbit count
S.limitSubmit(fm);

// register jmp module
$(document).regMod('jmp', '1.0');

OrderBookManager.init();
ContactSelect.init();

if($('#banner')[0]){
	$('#banner').regMod('allyes', '1.0', {
		"mod_allyes_user": $('#banner')[0].getAttribute('mod_allyes_user')
	});
}
// var PopSelector = function (opts) {
    // var divPop = opts.divPop;
    // this.divPop = divPop;

    // this.activeClass = opts.activeClass;
    // this.selectValue = undefined;
    // this.target = undefined;
    // this.onSelect = undefined;
    // this.fnInit = opts.fnInit;

    // this._init = false;
// }
// PopSelector.prototype = {
    // constructor: PopSelector,

    // reg: function (target, onSelect) {
        // var self = this;
        // target.bind('focus', function (e) {
            // self.show();
        // }).bind('blur', function (e) {
            // //给选择反应时间
            // setTimeout(function () {
                // self.hide();
            // }, 100);
        // });

        // this.target = target;
        // this.onSelect = onSelect;
    // },

    // show: function () {
        // if (!this._init) {
            // this.fnInit(this, this.divPop);
            // this._init = true;
        // }

        // S.insertAfter(this.divPop, this.target);
        // this.divPop.removeClass('hidden');
    // },

    // hide: function () {
        // this.divPop.addClass('hidden');
    // }
// }

// 邮寄收件人选择浮层
// var ReceiptInfo = new PopSelector({
    // divPop: $('#divReceiptInfo'),
    // activeClass: 'active',
    // fnInit: function (self, divPop) {
        // function fixIE6Cover(div) {
            // var strIframe = '<iframe frameborder="none" style="position: absolute; z-index: -1; filter: mask(); border: 0; margin: 0; padding: 0; top: 0; left: 0; width: 9999px;height: 9999px; overflow: hidden;"></iframe>';
            // var ifr = S.create(strIframe);
            // div.appendChild(ifr);
        // }

        // var ul = $(divPop.find('ul'));

        // function select(e) {
            // var target = e.target;
            // if (target.nodeName != 'LI') {
                // var parent = S.parent(e.target, 'LI');
                // if (!parent) return;
                // target = parent;
            // }

            // target = $(target);

            // self.selectValue = [];
            // target.find('span').each(function (el, i) {
                // if (i == 0) {
                    // self.selectValue[0] = el[0].innerHTML;
                    // self.selectValue[1] = el[0].getAttribute('phone');
                // } else {
                    // self.selectValue[i + 1] = el[0].innerHTML;
                // }
            // });

            // ul.find('.' + self.activeClass).removeClass(self.activeClass);
            // target.addClass(self.activeClass);

            // self.hide();
            // self.onSelect(self.selectValue);
        // }

        // ul.bind('click', select);

        // if (cQuery.browser.isIE6)
            // fixIE6Cover(divPop[0]);
    // }
// });