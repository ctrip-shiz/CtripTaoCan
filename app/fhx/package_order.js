/**
* author: shiz@ctrip.com
* date: 2012-07-20
*/
define(function (require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;
    Mod.DropDownList = require('tools/dropdownlist.js');
    Mod.EventEmitter = require('tools/eventemitter.js');
    require('tools/placeholder.js').init();
    require.async('mods');

    var ENUM = FHXConfig.ENUM;
    var MSG = FHXConfig.validate;

    var Validator = {
        // normal validate
        rNormal: /^[A-Za-z0-9]+$/,
        // 军人证
        rMilitary: /^[\u4e00-\u9fa5A-Za-z0-9]+$/,
        // 台胞证
        rTaiwan: /^[A-Za-z0-9()（）]+$/,
        // 包含中文字
        rChsChar: /[\u0100-\uffff]/,
        // 中文姓名
        rChinese: /^[\u4e00-\u9fa5a-zA-Z-]+$/,
        // 英文姓名
        rEnglish: /^[A-Za-z]+\/[A-Za-z]{1}[A-Za-z\s]+$/,
        // 英文名
        rEngName: /^[A-Za-z]{1}[A-Za-z\s]+$/,
        // 电子邮箱
        rEmail: /^[\w_\-\.]+@[\w_\-\.]+\.[A-Za-z]{2,4}$/,
        // 手机
        rCellphone: /^1[3458]\d{9}$/,
        // 区号   
        rPhoneArea: /^\d{3,4}$/,
        // 电话
        rPhone: /^\d{7,8}$/,
        // 分机号
        rPhoneExt: /^\d{1,6}$/,
        // 邮编
        rZipcode: /^\d{6}$/,

        isNotEmpty: function (v) {
            return v.length != 0;
        },

        isInRange: function (v, range) {
            return range[0] <= v.length && v.length <= range[1];
        },

        isMatch: function (v, reg) {
            return reg.test(v);
        },

        isDate: function (v) {
            return v.isDate();
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
            if (cellphone.length != 11 || !Validator.rCellphone.test(cellphone))
                return false;

            return true;
        },

        validate: function (rules, or) {
            if (!rules) return;
            if ($.type(rules) !== 'array')
                rules = [rules];

            var self = this;
            var rule = rules[0], i = 0, result = { ok: true };

            while ((or || result.ok) && rule && i++ < rules.length) {
                var elems = rule.elems; // the default elems the rule checked on 
                var args = rule.args; // the default arguments for logic rule
                var itemElems;

                if ($.type(rule.format) === 'array') {
                    rule.format.each(function (item, i) {
                        if (!result.ok) return;
                        itemElems = self._getELems(elems, item.elems);
                        if ($.type(elems) !== 'array') return;
                        result = self.checkFormat(item, itemElems);
                    });
                }

                if (result.ok && $.type(rule.logic) === 'array') {
                    rule.logic.each(function (item, i) {
                        if (!result.ok) return;
                        itemElems = self._getELems(elems, item.elems);
                        if ($.type(elems) !== 'array') return;
                        itemElems = itemElems.concat(item.args || args)
                        result = item.check.apply(item, itemElems);
                    });
                }

                rule = rules[i];
            }

            return result;
        },

        checkFormat: function (rule, elems) {
            var el = elems[0], i = 0, result = { ok: true };
            var check = this._getCheckFunction(rule.check);
            var isCheckFunc = typeof check === 'function';

            while (result.ok && el && i < elems.length) {
                var v = el.value().trim();
                result.ok = isCheckFunc ? check(v, rule.check) : check.test(v);
                result.msg = rule.msgs[i];
                result.pos = el;
                // Ignore the result when the item isnot required.
                if ('required' in rule && !rule.required && v.length == 0)
                    result.ok = true;
                i++;
                el = elems[i];
            }
            return result;
        },

        _getELems: function (rule_elems, item_elems) {
            return typeof item_elems === 'function' ?
                    item_elems(rule_elems) :
                    (typeof item_elems === 'number' ?
                        [rule_elems[item_elems]] :
                        (item_elems || rule_elems));
        },

        _getCheckFunction: function (check) {
            var checkType = $.type(check);
            if (checkType === 'array')
                return this.isInRange;
            if (checkType === 'string')
                return this._checkDic[check];
            return check;
        }
    }

    ; (function (Validator) {
        Validator._checkDic = {
            'empty': Validator.isNotEmpty,
            'date': Validator.isDate,
            'cellphone': Validator.isCellphone,
            'identity': Validator.isChinaIDCard,
            'email': Validator.rEmail,
            'zipcode': Validator.rZipcode,
            'phoneArea': Validator.rPhoneArea,
            'phone': Validator.rPhone,
            'phoneExt': Validator.rPhoneExt,
            'chs_name': Validator.rChinese,
            'eng_name': Validator.rEnglish,
            'normal': Validator.rNormal,
            'military': Validator.rMilitary,
            'taiwan': Validator.rTaiwan
        }
    })(Validator);

    /**** 业务模块 ****/

    /**@class 乘客验证器(单例) */
    var BookValidator = {

        lenLimits: {
            cardId: [0, 30],
            name: [2, 26]
        },

        // 包含繁体字
        hasTraditionalChs: function (v) {
            //繁体字库
            var chars = v.split("");
            for (var i = 0; i < chars.length; i++) {
                if (FHXConfig.data.traditionalChs.indexOf(chars[i]) >= 0) {
                    return true;
                }
            }
            return false;
        },

        // 包含生僻字
        hasRareChs: function (v) {
            var chars = v.split("");
            for (var i = 0; i < chars.length; i++) {
                if (FHXConfig.data.rareChs.indexOf(chars[i]) >= 0) {
                    return true;
                }
            }
            return false;
        },

        //根据出生时期与出发时间获得乘客类型
        getPassengerType: function (strBirthDay, strDepartDate) {
            var birthday = strBirthDay.toDate(),
            departTime = strDepartDate.toDate().getTime();

            if (birthday.addDays(14).getTime() > departTime)
                return ENUM.passengerType.littleBaby;

            // 岁数是向下取整的
            if (birthday.addYears(2).getTime() > departTime)
                return ENUM.passengerType.baby;  // 2岁以下

            if (birthday.addYears(12).getTime() > departTime)
                return ENUM.passengerType.child;

            if (birthday.addYears(12).getTime() == departTime || birthday.addYears(13).getTime() > departTime)
                return ENUM.passengerType.twelve;

            if (birthday.addYears(16).getTime() > departTime)
                return ENUM.passengerType.teenager; // 16岁以下

            if (birthday.addYears(24).getTime() > departTime)
                return ENUM.passengerType.youth; // 23岁以下

            if (birthday.addYears(55).getTime() > departTime)
                return ENUM.passengerType.adult;

            if (birthday.addYears(70).getTime() > departTime)
                return ENUM.passengerType.midOlder;

            return ENUM.passengerType.older;
        },

        getPassengerBirthday: function (txtCardId, txtBirthday, txtCardType) {
            var birthday;
            // 身份证
            if (txtCardType.value() == ENUM.cardtype.identity) {
                var v = txtCardId.value();
                if (v.length == 15) {
                    birthday = '19' + v.slice(6, 8) + '-' + v.slice(8, 10) + '-' + v.slice(10, 12);
                } else {
                    birthday = v.slice(6, 10) + '-' + v.slice(10, 12) + '-' + v.slice(12, 14);
                }
                return birthday;
            }

            return txtBirthday.value();
        },

        rules: {
            name: {
                elems: null, // txtName
                format: [
                    { check: 'empty', msgs: MSG.empty.name },
                    { check: [2, 26], msgs: [MSG.length[0]] }
                ],
                logic: [{
                    check: function (txtName) {
                        var result = { ok: true, pos: txtName }
                        var name = txtName.value().trim();

                        if (FHXConfig.IsMultiCountry) {
                            if (txtName.attr('name') == 'CName') {
                                result.ok = Validator.rChinese.test(name);
                                result.msg = MSG.format[0];
                            }
                            if (txtName.attr('name') == 'EName') {
                                result.ok = Validator.rEnglish.test(name);
                                result.msg = MSG.format[1];
                            }
                        } else {
                            if (Validator.rChsChar.test(name)) {
                                if (FHXConfig.isIntl) {
                                    result.ok = false;
                                    result.msg = MSG.format[1];
                                } else {
                                    result.ok = Validator.rChinese.test(name);
                                    result.msg = MSG.format[0];
                                }
                            } else {
                                result.ok = Validator.rEnglish.test(name);
                                result.msg = MSG.format[1];
                            }
                        }

                        return result;
                    }
                }]
            },

            passenger: {
                elems: null, // txtCardType, txtCardId, txtBirthday, txtNationality, txtGender
                format: [
                    { check: 'empty', msgs: MSG.empty.passenger },
                    { check: [1, 30], msgs: [MSG.length[1]], elems: 0 },
                    { check: 'date', msgs: [MSG.format[3]], elems: 2 }
                ],
                logic: [{
                    check: function (txtCardType, txtCardId) {
                        var result = { ok: true, pos: txtCardId, msg: MSG.format[2] };
                        var id = txtCardId.value().trim();
                        // 18位身份证
                        if (txtCardType.value() == ENUM.cardtype.identity) {
                            result.ok = Validator.isChinaIDCard(id);
                        }
                        return result;
                    }
                }]
            },

            passengerCard: {
                elems: null, //txtCardType, txtCardId
                args: null, //passengerType, cardTypeText
                logic: [{
                    check: function (txtCardType, txtCardId, passengerType, cardTypeText) {
                        var cardId = txtCardId.value().trim(),
                        cardType = txtCardType.value();

                        var result = { ok: true };

                        // 军人证
                        if (cardType == ENUM.cardtype.military) {
                            result = {
                                ok: Validator.rMilitary.test(cardId),
                                msg: MSG.format[4],
                                pos: txtCardId
                            }
                            if (!result.ok) return result;
                            result = {
                                ok: passengerType > ENUM.passengerType.child,
                                msg: MSG.logic[0],
                                pos: txtCardType
                            }
                            return result;
                        }
                        //台胞证
                        if (cardType == ENUM.cardtype.taiwan) {
                            result = {
                                ok: Validator.rTaiwan.test(cardId),
                                msg: MSG.format[5],
                                pos: txtCardId
                            }
                            return result;
                        }
                        // 基本格式校验
                        result = {
                            ok: Validator.rNormal.test(cardId),
                            msg: S.format(MSG.format[6], cardTypeText),
                            pos: txtCardId
                        }
                        if (!result.ok) return result;
                        // 户口薄
                        result = {
                            ok: !(cardType == ENUM.cardtype.booklet && passengerType > ENUM.passengerType.teenager),
                            msg: MSG.logic[1],
                            pos: txtCardType
                        }
                        if (!result.ok) return result;
                        // 出生证明
                        result = {
                            ok: !(cardType == ENUM.cardtype.birth && passengerType >= ENUM.passengerType.twelve),
                            msg: MSG.logic[2],
                            pos: txtCardType
                        }
                        return result;
                    }
                }]
            },

            flight: {
                elems: null, //txtCardType, txtName, txtCardId, txtBirthday
                args: null, //passengerType, fltAttr
                logic: [{
                    check: function (txtCardType, txtName, txtCardId, txtBirthday, passengerType, fltAttr) {
                        var cardType = txtCardType.value(),
                        name = txtName.value().trim(),
                        cardId = txtCardId.value().trim(),
                        birthday = txtBirthday.value().trim();

                        var result = { ok: true, pos: cardType == ENUM.cardtype.identity ? txtCardId : txtBirthday };

                        for (var i = 0; i < 6; i++) {
                            result.msg = MSG.rule[i];
                            switch (i) {
                                // 婴儿 
                                case 0: result.ok = !(passengerType <= ENUM.passengerType.littleBaby); break;
                                // 青年特价 
                                case 1: result.ok = !(!!fltAttr[0] && (passengerType < ENUM.passengerType.twelve || passengerType > ENUM.passengerType.youth)); break;
                                // 中老年特价 
                                case 2: result.ok = !(!!fltAttr[1] && passengerType <= ENUM.passengerType.adult); break;
                                // 春秋航空 
                                case 3: result.ok = !(!!fltAttr[2] && passengerType >= ENUM.passengerType.older); break;
                                // 国内航空 
                                case 4:
                                    result.ok = !(!!fltAttr[3] && BookValidator.hasTraditionalChs(name));
                                    result.pos = txtName;
                                    break;
                                // 进藏 
                                case 5:
                                    result.ok = !(!!fltAttr[4] && cardType != ENUM.cardtype.identity && cardType != ENUM.cardtype.booklet)
                                    result.pos = txtCardType;
                                    break;
                                default: break;
                            }

                            if (!result.ok) return result;
                        }

                        return result;
                    }
                }]
            },

            contact: {
                elems: null, //txtName, txtCellphone, txtPhoneArea, txtPhoneMain, txtPhoneExt, txtEmail
                format: [
                    { check: 'empty', msgs: MSG.empty.contact, elems: function (els) { return els.slice(0, 3); } },
                    { check: [2, 26], msgs: [MSG.length[0]], elems: 0 },
                    { check: 'cellphone', msgs: [MSG.format[7]], elems: 1 },
                    { check: 'email', msgs: [MSG.format[8]], elems: 2, required: false },
                    { check: 'phoneArea', msgs: [MSG.format[9]], elems: 3, required: false },
                    { check: 'phone', msgs: [MSG.format[10]], elems: 4, required: false },
                    { check: 'phoneExt', msgs: [MSG.format[11]], elems: 5, required: false }
                ]
            },

            invoice: {
                elems: null, //txtTitle, txtDetail
                format: [
                    { check: 'empty', msgs: MSG.empty.invoice }
                ]
            },

            delivery: {
                elems: null, // txtDeliveryArea, txtDeliveryAddress
                format: [
                    { check: 'empty', msgs: MSG.empty.delivery }
                ]
            },

            ems: { // txtReciever, txtZipcode, txtCellphone, txtProvince, txtCity, txtArea, txtAddress
                elems: null,
                format: [
                    { check: 'empty', msgs: MSG.empty.ems, elems: function (els) { return els.slice(0, 2).concat(els.slice(3, 7)); } },
                    { check: 'zipcode', msgs: [MSG.format[12]], elems: 1 },
                    { check: 'cellphone', msgs: [MSG.format[7]], elems: 2, required: false }
                ]
            }
        },

        validate: function (type, els, args) {
            var rule = this.rules[type];
            rule.elems = els;
            args && (rule.args = args);
            var result = Validator.validate(rule);
            return result.ok || Mod.showTips(result.pos, result.msg);
        },

        checkInvoiceDelivery: function (modules) {
            if (modules.indexOf(InvoiceBox) != -1 && InvoiceBox.rdoNeedInvoices[0].checked) {
                function showError() {
                    var dl = $(divDelivery.find('dl:not(.hidden)')[1]);
                    var rdo = dl.find('input[type="radio"]:first');
                    return Mod.showTips(rdo, MSG.logic[5]);
                }
                var divDelivery = $('#divDelivery');
                if (modules.indexOf(DeliveryBox) != -1) {
                    if (DeliveryBox.selectedIndex == 0)
                        return showError();
                } else {
                    $(S.prev(divDelivery)).find('.btn_submit>a').trigger('click');
                    setTimeout(function () {
                        showError();
                    }, 100);
                    return false;
                }
            }
            return true;
        }
    }
    /**@class 联系人列表框*/
    var ContactList = {

        _events: { check: [] },

        fnLimit: undefined,

        contacts: FHXConfig.data.contacts,
        /*
        * @function init the contact list
        * @param {function} the upper boundary judge function
        */
        init: function (fnLimit) {
            Mod.EventEmitter.extend(this);

            this._initList();

            this.fnLimit = fnLimit || function () {
                return false;
            }; // default: no limit;
        },

        _initList: function () {
            var divCustomerList = this.container = $('#divCustomerList');
            if (divCustomerList.length == 0 || this.contacts.length == 0) {
                S.hide(divCustomerList);
                return; // 无联系人处理
            }

            var lnkMore = divCustomerList.find('a.more_type');
            if (this.contacts.length <= 6)
                S.hide(lnkMore);

            this.txtFilterContact = $('#txtFilterContact');

            this._bindEvents(divCustomerList.find('ul'), lnkMore);
        },

        _bindEvents: function (contactList, lnkMore) {
            var _this = this;
            this.contactList = contactList;
            // 联系人勾选
            contactList.bind('click', function (e) {
                var target = e.target;
                if (target.nodeName == 'UL') return;
                if (target.nodeName != 'INPUT') {
                    if (target.nodeName == 'SPAN') {
                        target = S.prev(target);
                        //因为不是label,所以要手动修改checkbox状态
                        target.checked = !target.checked;
                    } else {
                        target = $(target).find('input')[0];
                        target && (target.checked = !target.checked);
                    }
                }
                if (!target || target.nodeName != 'INPUT')
                    return;

                var index = target.getAttribute('data-index');

                _this.check(index, target);
            });
            // 显示更多
            lnkMore.bind('click', this.toggleMore.bind(this));
            // 常用联系人筛选
            require.async('tools/typer.js', function (Typer) {
                new Typer(_this.txtFilterContact, _this.filter.bind(_this));
            });
        },
        // 筛选联系人
        filter: function (keyword) {
            var contacts = this.contacts;
            this.contactList.find('input').each(function (chk, i) {
                var li = S.parent(chk, 'li');
                (contacts[i].name.indexOf(keyword) > -1 ||
                (contacts[i].ename && contacts[i].ename.indexOf(keyword) > -1)) ?
                S.show(li) : S.hide(li);
            });
        },
        // 显示更多
        toggleMore: function (e) {
            if (this.container[0].style.height == '60px') {
                e.target.innerHTML = FHXConfig.texts.contact[1];
                this.container[0].style.height = '';
            } else {
                e.target.innerHTML = FHXConfig.texts.contact[0];
                this.container[0].style.height = '60px';
            }
        },
        // 勾选
        check: function (index, target) {
            var contact = this.contacts[index];

            if (target.checked && this.fnLimit(contact.isAdult)) { // 是否人满
                Mod.formValidator = Mod.formValidator || $(document).regMod("validate", "1.1");
                // 人满提示
                Mod.formValidator.method("show", {
                    $obj: $(target),
                    data: MSG.logic[contact.isAdult ? 3 : 4],
                    position: 'lm_bm',
                    errorClass: '',
                    endshow: function () { }, // make scrollbar not scroll
                    show: function (o) {
                        var l, t;
                        if (o.iframe == o.doc) {
                            l = parseFloat(o.$tip[0].style.left),
                        t = parseFloat(o.$tip[0].style.top);
                            o.$tip[0].style.left = (l + 10) + 'px';
                            o.$tip[0].style.top = (t - 10) + 'px';
                        } else {
                            // fix ie6 bug 
                            l = parseFloat(o.iframe.style.left),
                        t = parseFloat(o.iframe.style.top);
                            o.iframe.style.left = (l + 10) + 'px';
                            o.iframe.style.top = (t - 10) + 'px';
                        }
                    }
                });
                target.checked = false;
                return;
            }

            this._events.check.each(function (fn, i) {
                fn(contact, target.checked);
            });
        },

        cancel: function (name) {
            var contact = this.findContact(name);
            if (!contact) return;
            this.container.find('input[type="checkbox"]:eq(' + contact.index + ')')[0].checked = false;
        },

        findContact: function (name, type) {
            type = type || 'name';

            if (type == 'index') {
                return this.contacts[name];
            }

            this.contacts.each(function (contact, i) {
                if (contact.name == name) {
                    return contact;
                }
            });
            return null;
        }
    }
    /**@class 乘客填写框*/
    var PassengerBox = function (div, data) {
        Mod.EventEmitter.extend(this);

        this.index = undefined;
        this.div = $(div);
        // 航程信息
        // [ 航程号, 出发日期, 是否青年特价, 是否中老年特价, 是否是春秋, 是否是国内航空, 进藏限制, 成人数, 儿童数, 婴儿数 ]
        this.routeInfo = [0].concat(data);

        // this._initRouteInfo();
        this._initElements();
    }
    PassengerBox.prototype = {
        constructor: PassengerBox,

        _initElements: function () {
            var self = this;

            var textboxes = this.div.find('input[type="text"]');

			if (FHXConfig.IsMultiCountry) { // 同时有国内与海外
                self.txtEName = textboxes.splice(1, 1);
            }

            var members = ['txtName', 'txtCardType', 'txtCardId', 'txtNationality', 'txtGender', 'txtBirthday'];

            textboxes.each(function (item, i) {
                self[members[i]] = item;
            });
            // cardType
            this._initCardTypeList();
            // clear link
            this._initClearLink();
            if (FHXConfig.isIntl || FHXConfig.IsMultiCountry) {
                // nationality
                this.regNationality(this.txtNationality, 'txtNationality', FHXConfig.texts.titles[0]);
                // gender
                this._initGenderList();
            }
        },

        _initCardTypeList: function () {
            var self = this;
            var triggers = [this.txtCardType, $(S.next(this.txtCardType, 'b'))];
            CardTypeList.reg(triggers, function (e) {
                var cardIds = self.txtCardId.data('cardIds');
                self.txtCardType.value(e.target.innerHTML);
                self.txtCardId.value(cardIds && cardIds[e.target.innerHTML] || "");
                self.toggleBirthday();
            }, 'click');
        },

        _initGenderList: function () {
            var self = this;
            GenderList.reg(this.txtGender, function (e) {
                self.txtGender.value(e.target.innerHTML);
            }, 'click');
        },

        toggleBirthday: function () {
            var dd = $(S.parent(this.txtBirthday, 'dd'));
            (this.txtCardType.value() != ENUM.cardtype.identity
                && this.txtCardType.value() != '') ?
                dd.removeClass('hidden') : dd.addClass('hidden');
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7 || cQuery.browser.isIE8) {
                setTimeout(function () {
                    dd[0].style.zoom = '1';
                }, 50);
            }
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
                    suggestion: FHXConfig.data.nationalitySuggestion,
                    data: FHXConfig.data.nationalityData
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

        _initClearLink: function () {
            var self = this;
            var lnkClear = this.div.find('dd.btn_submit>input');
            lnkClear.bind('click', function () {
                self.unbindContact.bind();
                self.emit('clear', self);
            });
        },

        bindContact: function (contact) {
            var selected = contact.cardIds.selected;
            this.txtCardId.value(contact.cardIds[selected]);
            this.txtCardType.value(selected);
            this.txtCardId.data('cardIds', contact.cardIds);

            this.index = contact.index;
            this.txtName.value(contact.name);
            this.txtBirthday.value(contact.birthday);
            this.txtNationality.value(contact.nationality);
            this.txtGender.value(contact.gender);
            this.toggleBirthday();
            this.txtEName && this.txtEName.value(contact.ename);
        },
        unbindContact: function () {
            this.txtCardId.data('cardIds', null);

            this.index = undefined;
            this.txtName.value("");
            this.txtCardId.value("");
            this.txtCardType.value("");
            this.txtBirthday.value("");
            this.txtNationality.value("");
            this.txtGender.value("");
            this.toggleBirthday();
            this.txtEName && this.txtEName.value("");
        },

        validate: function (isShallow) {
            if (isShallow) {
                return this.txtName.value().trim() != '';
            } else {
                // 深层验证
                var bv = BookValidator;
                var passengerElems = [this.txtCardType, this.txtCardId, this.txtBirthday, this.txtNationality, this.txtGender];
                if (!FHXConfig.isIntl) {
                    passengerElems = (this.txtCardType.value().trim() == ENUM.cardtype.identity) ?
                    passengerElems.slice(0, 2) : passengerElems.slice(0, 3);
                }

                if (FHXConfig.IsMultiCountry) {
                    if (!bv.validate('name', [this.txtEName]))
                        return false;
                }

                if (bv.validate('name', [this.txtName]) && bv.validate('passenger', passengerElems)) {

                    var birthday = bv.getPassengerBirthday(this.txtCardId, this.txtBirthday, this.txtCardType);
                    var pType = bv.getPassengerType(birthday, this.routeInfo[1]);
                    var cardType = this.txtCardType.value();
                    var fltValidateElems = [this.txtCardType, this.txtName, this.txtCardId, this.txtBirthday];

                    if (bv.validate('passengerCard', passengerElems.slice(0, 2), [pType, cardType]) &&
                    bv.validate('flight', fltValidateElems, [pType, this.routeInfo.slice(2)]))
                        return pType;
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
            this.hChildAsAdult = $('#hChildAsAdult');

            this._initBoxes();
            // this._initTicketChange();
        },

        _initBoxes: function (boxes) {
            var self = this;
            $('#divList>dl.per_write').each(function (box, i) {
                var passengerBox = new PassengerBox(box, FHXConfig.data.routeInfoes[0]);
                self.boxList.push(passengerBox);
            });
        },

        validate: function () {
            var boxes = this.boxList,
            passengerType = false,
            ticket = { names: [] },
            name, pos;

            for (var i = 0, len = boxes.length; i < len; i++) {

                passengerType = boxes[i].validate(false);
                if (!passengerType)
                    return false;

                // check whether there are same name.
                name = boxes[i].txtName.value().trim();
                if (ticket.names.length > 0 && ticket.names.indexOf(name) > -1)
                    return Mod.showTips(boxes[i].txtName, MSG.rule[6]);
                ticket.names.push(name);

                pos = boxes[i].txtCardType.value().trim() == ENUM.cardtype.identity ?
                boxes[i].txtCardId : boxes[i].txtBirthday;

                // 成人票
                if (i < boxes[i].routeInfo[7] && passengerType <= ENUM.passengerType.child)
                    return Mod.showTips(pos, MSG.rule[7]);
                // 儿童票
                if (i >= boxes[i].routeInfo[7] && passengerType > ENUM.passengerType.child)
                    return Mod.showTips(pos, MSG.rule[8]);
                // 婴儿
                if (passengerType <= ENUM.passengerType.baby)
                    return Mod.showTips(pos, MSG.rule[9]);

            }
            return true;
        },

        firstEmptyBox: function (isAdult) {
            var box = this.boxList[0],
            adults = box.routeInfo[7];
            for (var i = 0, len = this.boxList.length; i < len; i++) {
                // test the passenger type
                if (isAdult) {
                    if (i >= adults) break;
                } else {
                    if (i < adults) continue;
                }
                // find empty
                box = this.boxList[i]; // txtName 校验非联系人乘客
                if (!box.validate(true)) {
                    return box;
                }
            }
            return null;
        }
    }
    /**@class 联系人填写框 */
    var ContactBox = {
        init: function () {
            var container = $('#divContactBox');

            this._initElements(container);
        },

        _initElements: function (container) {
            var textboxes = container.find('input[type="text"]'),
            members = ['txtContact', 'txtContactPhone', 'txtEmail', 'txtPhoneArea', 'txtPhoneMain', 'txtPhoneExt'],
            self = this;

            // notice
            textboxes.each(function (txt, i) {
                self[members[i]] = txt;
            });

            // contact selector
            ContactSelect.reg(this.txtContact, function (contact) {
                self.txtContact.value(contact.name);
                self.txtContactPhone.value(contact.phone);
            });
        },

        validate: function () {
            // From MDN
            // Iterates over the enumerable properties of an object, in arbitrary order. 
            return BookValidator.validate('contact',
                [this.txtContact, this.txtContactPhone, this.txtEmail,
                this.txtPhoneArea, this.txtPhoneMain, this.txtPhoneExt]);
        }
    }
    /**@class 发票填写框 */
    var InvoiceBox = {

        init: function () {
            var divInvoice = $('#divInvoice');

            this.rdoNeedInvoices = divInvoice.find('input[type="radio"]');
            this.rdoNeedInvoices[0].checked = true;

            var textboxes = divInvoice.find('input[type="text"]');
            this.txtTitle = $(textboxes[0]);
            this.txtDetail = $(textboxes[1]);
            // detal drop down list
            (new Mod.DropDownList(divInvoice.find('div.person_floatlist'))).reg(
            [$(textboxes[1]), $(S.next(textboxes[1], 'b'))],
            function (e) {
                textboxes[1].value = e.target.innerHTML;
            },
            'click'
        );

            this._bindEvents(divInvoice);
        },

        _bindEvents: function (divInvoice) {
            var dds = divInvoice.find('dd');
            $(this.rdoNeedInvoices[0]).bind('click', function (e) {
                dds[2].className = '';
                dds[3].className = '';
                dds[4].className = '';
            });
            $(this.rdoNeedInvoices[1]).bind('click', function (e) {
                dds[2].className = 'hidden';
                dds[3].className = 'hidden';
                dds[4].className = 'hidden';
            });
        },

        validate: function () {
            return this.rdoNeedInvoices[1].checked ||
            BookValidator.validate('invoice', [this.txtTitle, this.txtDetail]);
        }
    }
    /**@class 配送方式填写框 */
    var DeliveryBox = {

        selectedIndex: 0, // 选中项

        validate: function () {
            var rdoes = S.toArray(fm["delivery"]);
            if (rdoes[1].checked)
                return BookValidator.validate('delivery', [this.txtDeliveryArea, this.txtDeliveryAddress]);

            if (rdoes[3].checked)
                return BookValidator.validate('ems',
                [this.txtReciever,
                this.txtZipcode,
                this.txtCellphone,
                this.txtProvince,
                this.txtCity,
                this.txtArea,
                this.txtAddress]);

            return true;

        },

        init: function () {
            var divDelivery = $('#divDelivery');

            var self = this;
            divDelivery.find('dl').each(function (dl, i) {
                switch (i) {
                    case 1: self._initCityDelivery(dl); break;
                    case 3: self._initEMS(dl); break;
                }
            });

            this._bindDeliverySelect(divDelivery);
            this._initDeliverySelect(divDelivery);
        },

        _initDeliverySelect: function (divDelivery) {
            var rdo = divDelivery.find('dl:not(.hidden):first').find("input[type='radio']:first");
            rdo.trigger('click');
            rdo[0].checked = true;
        },

        _initCityDelivery: function (container) {
            var textboxes = container.find('input[type="text"]');
            // area drop down list
            (new Mod.DropDownList(container.find('div.person_floatlist'))).reg(
            $(textboxes[0]),
            function (e) {
                textboxes[0].value = e.target.innerHTML;
            },
            'click'
        );

            var divRecentAddress = $('#divRecentAddress');
            // select a recent address
            divRecentAddress.find('a.base_btn_change').bind('click', function (e) {
                var selected = divRecentAddress.find('input[type="radio"]:checked');
                textboxes[0].value = selected[0].getAttribute('data-area') || textboxes[0].value;
                textboxes[1].value = selected[0].value || textboxes[1].value;
                divRecentAddress.unmask();
            });
            // show recent address panel
            container.find('#lnkRecentAddress').bind('click', function (e) {
                S.show(divRecentAddress);
                divRecentAddress.mask();
            });
            // close
            divRecentAddress.find('a.base_btn_change,a.delete').each(function (btn, i) {
                btn.bind('click', function () {
                    divRecentAddress.unmask();
                    S.hide(divRecentAddress);
                });
            });

            this.txtDeliveryArea = $(textboxes[0]);
            this.txtDeliveryAddress = $(textboxes[1]);
        },

        _initEMS: function (container) {
            var self = this;

            var textboxes = container.find('input[type="text"]');

            var members = ['txtReciever', 'txtZipcode', 'txtCellphone', 'txtProvince', 'txtCity', 'txtArea', 'txtAddress'];
            textboxes.each(function (item, i) {
                self[members[i]] = item;
            });

            var divEMSAddress = $('#divEMSAddress');
            // select a ems address
            divEMSAddress.find('a.base_btn_change').bind('click', function (e) {
                var selected = divEMSAddress.find('input[type="radio"]:checked');
                var row = S.parent(selected, 'tr');
                textboxes[0].value = row.cells[1].innerHTML.trim() || textboxes[0].value; // recipient
                textboxes[1].value = row.cells[2].innerHTML.trim() || textboxes[1].value; // zipcode
                textboxes[2].value = row.cells[5].innerHTML.trim() || textboxes[2].value; // cellphone
                textboxes[6].value = row.cells[4].innerHTML.trim() || textboxes[6].value; // address
                divEMSAddress.unmask();
            });
            // show ems address panel
            container.find('#lnkEMSAddress').bind('click', function (e) {
                S.show(divEMSAddress);
                divEMSAddress.mask();
            });
            // close
            divEMSAddress.find('a.base_btn_change,a.delete').each(function (btn, i) {
                btn.bind('click', function () {
                    divEMSAddress.unmask();
                    S.hide(divEMSAddress);
                });
            });

            CascadeSelector.reg([self.txtProvince, self.txtCity, self.txtArea]);
        },

        _bindDeliverySelect: function (divDelivery) {
            var price1 = $('#spanTotalPrice1')[0],
            price2 = $('#spanTotalPrice2')[0];
            var itemList = divDelivery.find('dl');

            var total = +price1.innerHTML.match(/\d+/)[0];

            var self = this;
            divDelivery.find('input[name="delivery"]').each(function (item, i) {
                item.bind('click', function () {
                    self.selectedIndex = i;
                    // select delivery
                    divDelivery.find('dl.cur_dl').removeClass('cur_dl');
                    $(itemList[i]).addClass('cur_dl');
                    // change prices 
                    if (i == 3) {
                        price1.innerHTML = price1.innerHTML.replace(/(\d+)/, (total + 20));
                        price2.innerHTML = price2.innerHTML.replace(/(\d+)/, (total + 20));
                    } else {
                        price1.innerHTML = price1.innerHTML.replace(/(\d+)/, total);
                        price2.innerHTML = price2.innerHTML.replace(/(\d+)/, total);
                    }
                });
            });
        }
    }

    /**@class 订单联系人管理器（单例）*/
    var BookManager = {

        _booking: false, //是否在预订

        isIntl: FHXConfig.isIntl,
        needInitContact: FHXConfig.needInitContact,
        needInitDelivery: FHXConfig.needInitDelivery,

        checkModules: [], // 需要验证的模块

        init: function () {
            this._initOrderNote();

            PassengerList.init();
            ContactList.init();
            ContactSelect.init();

            this._bindModifyEvents();
            this._bindConfirmEvent();
            this._bindToggleDetail();
            this._bindToggleMoreDetail();
            this._bindEvents();

            this._initModulesBound();
            this._initOrderCheck();

            // limit sumbit count
            S.limitSubmit(fm);
            // register jmp module
            Mod.regJMP();
        },

        goBack: function (type) {
            S.postForm((type && type == '1') ? FHXConfig.URL.ORDER_CONFIRM : FHXConfig.URL.PACKAGE_LIST);
        },

        _bindEvents: function () {
            $('#lnkBack').bind('click', function (e) {
                BookManager.goBack(1);
            });
        },

        // 可订检查
        _initOrderCheck: function () {
            var spanSecond = $('#divSaleOut').find('span.second');
            var timer;

            function showAdditions (data) {
                var tmpl = '<table width="730" border="0" cellspacing="0" cellpadding="0" class="htl_add_condition">\
                                <colgroup>\
                                    <col style="width:200px">\
                                    <col>\
                                    <col style="width:150px">\
                                    <col style="width:150px">\
                                </colgroup>\
                                <tbody>\
                                  {{each $data}}\
                                  <tr>\
                                    <td>${hotelName}</td>\
                                    <td>${roomName}</td>\
                                    <td><span class="address">\
                                    {{if bedType.length}}\
                                        <select class="input_text_o" name="bedType">\
                                            <option value="${roomId}|-1">任何床型</option>\
                                        {{each bedType}}\
                                            <option value="${sRoomId}|${id}">${desc}</option>\
                                        {{/each}}\
                                        </select>\
                                    {{/if}}\
                                    </span></td>\
                                    <td><span class="address">\
                                    {{if smoke.length}}\
                                        <select class="input_text_o" name="smoke">\
                                            <option value="${roomId}|-1">吸烟需求</option>\
                                        {{each smoke}}\
                                            <option value="${sRoomId}|${id}">${desc}</option>\
                                        {{/each}}\
                                        </select>\
                                    {{/if}}\
                                    </span></td>\
                                  </tr>\
                                  {{/each}}\
                                </tbody>\
                            </table>';

                $('#divHotelAdditions div.htl_add_lis')[0].innerHTML = 
                    $.tmpl.render(tmpl, data);
                $('#divHotelAdditions').addClass("per_write traveller_write");
                S.show($('#divHotelAdditions'))
            }

            function render(type) {
                var title = FHXConfig.texts.check[type];
                if (!title) title = type;
                var divSaleOut = $('#divSaleOut');
                S.show(divSaleOut);
                divSaleOut.mask();
                divSaleOut.find('h4').html(title);

                divSaleOut.bind('click', function (e) {
                    if (e.target.nodeName != 'A') return;
                    clearTimeout(timer);
                    loading();
                    BookManager.goBack(type);
                });
            }

            function goBack(type) {
                // count down
                var second = 6;
                function countDown() {
                    if (--second < 1) return;
                    spanSecond[0].innerHTML = second;
                    timer = setTimeout(countDown, 1000);
                }
                countDown();
                setTimeout(function () {
                    loading();
                    BookManager.goBack(type);
                }, 5000);
            }

            function loading() {
                setTimeout(function () {
                    spanSecond[0].innerHTML = '<img style="vertical-align: middle;" src="http://pic.c-ctrip.com/vacation_v1/loading_transparent.gif">';
                }, 10);
            }

            var url = FHXConfig.URL.FLIGHT_CHECK;
            $.ajax(url, {
                method: cQuery.AJAX_METHOD_POST,
                context: {
                    PeggingParams: $('#hPeggingParams').value(),
                    TempOrderId: $('#hTempOrderId').value(),
                    Uid: $('#hUid').value()
                },
                onsuccess: function (xhr, res) {
                    if (!res || res.indexOf('<') != -1) return;
                    if (BookManager._booking) return;

                    res = cQuery.parseJSON(res);
                    if(typeof res === 'object'){
                        showAdditions(res);
                    }else{
                        render(res);
                        goBack(res);
                    }
                }
            });
        },

        _bindToggleMoreDetail: function () {
            function toggleMoreDetail(e) {
                var target = e.target,
                tr = S.parent(target, 'tr'),
                displayed = tr.getAttribute('data-show'),
                next = S.next(tr);

                if (target.nodeName == 'B')
                    target = target.parentNode;

                if (displayed) {
                    $(target).parentNode().removeClass('cur');
                    target.innerHTML = target.innerHTML.replace('down', 'up');
                    while (next && next.className == 'append_detail2') {
                        S.hide(next);
                        next = S.next(next);
                    }
                    tr.setAttribute('data-show', '');
                } else {
                    $(target).parentNode().addClass('cur');
                    target.innerHTML = target.innerHTML.replace('up', 'down');
                    while (next && next.className == 'append_detail2 hidden') {
                        S.show(next);
                        next = S.next(next);
                    }
                    tr.setAttribute('data-show', 'T');
                }
            }
            $('span[data-role="moredetail"]').each(function (item, i) {
                item.bind('click', toggleMoreDetail);
            });
        },

        // 预订须知数据
        _initOrderNote: function () {
            var url = FHXConfig.URL.X_NOTE + "?ProductIds=" + $("#hProductIds").value();
            $.ajax(url, {
                method: cQuery.AJAX_METHOD_GET,
                onsuccess: function (xhr, res) {
                    var div = $('#divNote')[0];
                    div.innerHTML = div.innerHTML + res;
                }
            });
        },

        // 初始化模块间的绑定
        _initModulesBound: function () {
            var _this = this;

            /** ContactList and PassengerList bound */
            ContactList.fnLimit = function (isAdult) { return !PassengerList.firstEmptyBox(isAdult); }
            ContactList.on('check', this._onCheckContact);
            // var contact = null, box = null;
            PassengerList.boxList.each(function (passengerBox, i) {
                passengerBox.on('clear', _this._onPassengerClear.bind(_this));
            });
        },

        // 勾选联系人
        _onCheckContact: function (contact, isChecked) {
            var _this = PassengerList;
            if (isChecked) {
                // 将信息绑定到第一个可填写的PassengerBox上
                var box = PassengerList.firstEmptyBox(contact.isAdult);
                box.bindContact(contact);
            } else {
                // 清空所有相关的乘客信息
                _this.boxList.each(function (box, i) {
                    if (box.txtName.value() == contact.name)
                        box.unbindContact();
                });
            }
        },

        // 乘客栏清空
        _onPassengerClear: function (passenger) {
            if (!passenger) return;
            ContactList.cancel(passenger.txtName.value().trim());
        },

        // 详情信息显示
        _bindToggleDetail: function () {
            var lnkDetail = $('#lnkDetail');
            var divDetail = $(S.next(lnkDetail, 'div.cate_fliter'));
            lnkDetail.bind('click', function (e) {
                if (divDetail.hasClass('hidden')) {
                    lnkDetail.addClass('more_type_up');
                    divDetail.removeClass('hidden');
                    lnkDetail[0].innerHTML = FHXConfig.texts.detail[1];
                } else {
                    lnkDetail.removeClass('more_type_up');
                    divDetail.addClass('hidden');
                    lnkDetail[0].innerHTML = FHXConfig.texts.detail[0];
                }
            });
        },

        // 预订信息的修改与对应模块初始化
        _bindModifyEvents: function () {
            var self = this;
            var modules = [ContactBox, InvoiceBox, DeliveryBox];
            $('#divOrderInfo').find('dl.bg_sty2').each(function (dl, i) {
                var lnk = dl.find('.btn_submit>a');
                lnk.bind('click', function (e) {
                    dl.addClass('hidden');
                    $(S.next(dl)).removeClass('hidden');
                    if (self.checkModules.indexOf(modules[i]) != -1) return;
                    modules[i].init();
                    self.checkModules.push(modules[i]);
                });
                if ((i == 0 && BookManager.needInitContact) ||
                (i == 2 && BookManager.needInitDelivery))
                    lnk.trigger('click');
            });
        },

        _bindConfirmEvent: function () {
            var self = this;
            var btnBook = $('#lnkBook');

            function submit() {
                // note read
                if (!$('#chkNote')[0].checked)
                    return Mod.showTips($('#chkNote'), MSG.rule[10]);
                // passenger
                var isPass = PassengerList.validate();
                if (!isPass) return;
                // modules
                self.checkModules.each(function (mod, i) {
                    if (!isPass) return;
                    isPass = mod.validate();
                });
                if (!isPass) return;
                // invoice delivery
                isPass = BookValidator.checkInvoiceDelivery(self.checkModules);
                if (!isPass) return;

                self.ajaxBooking();
            }

            btnBook.bind('click', submit);
        },

        ajaxBooking: function () {
            if (this._booking) return;
            this._booking = true;

            var timeout;
            var btnBook = $('#lnkBook');
            btnBook.html("请稍等...");

            function gotoNext(data) {
                $('#hOrderId').value(data.orderId);
                $('#hPrice').value(data.currentPrice);
                fm.action = FHXConfig.URL.ORDER_PAYMENT;
                fm.submit();
            }

            function gotoError(error) {
                btnBook.html("");
                var hErrorInfo = S.create('<input type="hidden" name="FHXError" value="' + error.errorInfo + '"/>');
                var hErrorInfoShow = S.create('<input type="hidden" name="ErrorInfoShow" value="' + error.errorInfoShow + '"/>');
                var divHidden = $('#divHidden')[0];
                divHidden.appendChild(hErrorInfo);
                divHidden.appendChild(hErrorInfoShow);
                fm.action = FHXConfig.URL.ORDER_RESULT;
                fm.submit();
            }

            function showChangeDialog(data) {
                var divPriceChange = $('#divPriceChange');
                divPriceChange.removeClass('hidden').mask();

                var i = 0;
                var divPrices = divPriceChange.find('div.prices')[0];
                divPrices.innerHTML = divPrices.innerHTML
                .replace(/(\d+)/g, function () {
                    return i++ == 0 ? data.currentPrice : data.price;
                });

                divPriceChange.bind('click', function (e) {
                    if (e.target.nodeName != 'A') return;
                    e.target.className == 'base_btn_change' ?
                    gotoNext(data) : BookManager.goBack();
                });
            }

            $.ajax(FHXConfig.URL.ORDER_BOOKING, {
                context: S.formSerialize(fm),
                method: cQuery.AJAX_METHOD_POST,
                onsuccess: function (xhr, res) {
                    clearTimeout(timeout);
                    var data;
                    try {
                        // remove carriage return char
                        data = (new Function('return ' + res.replace(/\t|\n|\r/g, '')))();
                    } catch (e) {
                        gotoError({ errorInfo: 'Data format error', errorInfoShow: '' });
                    }

                    !data.result ? gotoError(data) :
                    (data.price ? showChangeDialog(data) : gotoNext(data));
                },
                onerror: function (xhr, res) {
                    gotoError({ errorInfo: 'Ajax error', errorInfoShow: '' });
                }
            });

            // 超时
            timeout =
            setTimeout(function () {
                gotoError({ errorInfo: 'Ajax timeout', errorInfoShow: '' });
            }, 60 * 1000);
        }
    }
    /**** 组件模块 ****/

    // 证件类型下拉列表
    var CardTypeList = new Mod.DropDownList($("#divCardType"));
    // 性别下拉列表
    var GenderList = new Mod.DropDownList($('#divGender'));
    // 常用联系人|旅客下拉选择器
    var ContactSelect = {
        _pnlPop: $('#pnlPop'),
        _pTitle: $('#pnlPop').find('p')[1],
        _divPeople: $('#pnlPop').find('div')[0],
        _lnkTmpl: '<a href="javascript:;" index="$1" cardId="$4">$2<span>$3</span></a>',
        // hide timer id
        _hideTimer: undefined,
        // current input
        _current: undefined,

        // 创建旅客信息
        _createPeopleLinks: function () {
            var list = PassengerList.boxList,
            i, objs = [], existed = false;

            for (i = 0, len = list.length; i < len; i++) {
                if (list[i].validate(true)) {
                    objs.push({
                        index: list[i].index,
                        name: list[i].txtName.value(),
                        cardId: list[i].txtCardId.value
                    });
                }
            }
            objs = this._distinct(objs);

            var lnks = [];
            for (i = 0, len = objs.length; i < len; i++) {
                lnks.push(S.format(this._lnkTmpl,
                    objs[i].index ? objs[i].index : '',
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
            title = title || FHXConfig.texts.titles[1]; //没办法，受到万恶中文限制
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
        index = el.getAttribute('index'),
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
                    index: index,
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

            for (var i = 0, len = contacts.length; i < len; i++) {
                if (contact_count++ > 8) break; // 最常用的9个
                lnks.push(S.format(this._lnkTmpl, contacts[i].index, contacts[i].name, contacts[i].phone, contacts[i].cardId));
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
    // 省市区级联选择器
    var CascadeSelector = {

        _inited: false,

        _data: undefined, //数据

        _tmpl: '<a href="javascript:void(0);" data-id="$id">$name</a>',

        _divPop: undefined,

        _currentLevel: 1, //当前浮层展现的level

        selected: [], //选中的值

        levels: ['P', 'C', 'Z'], //层级对应

        lefts: ['0', '0', '0'], //浮层出现位置 margin-left

        _bindEvents: function (elems) {
            var self = this;

            self._divPop.bind('click', function (e) {
                self._select(e, elems);
            });

            var timer;
            elems.each(function (el, i) {
                el.bind('focus', function (e) {
                    clearTimeout(timer);
                    self.show(i, el);
                });
                el.bind('blur', function (e) {
                    // 延迟隐藏，为点击与下次显示留出时间
                    timer = setTimeout(function () {
                        self.hide();
                    }, 200);
                });
            });
        },

        _select: function (e, elems) {
            var target = e.target;
            if (target.nodeName == 'LI')
                target = target.getElementsByTagName('a')[0];
            if (target.nodeName != 'A') return;

            var id = target.getAttribute('data-id'),
            level = this._currentLevel,
            selected = this.selected;

            selected[level] = id;
            elems[level].value(target.innerHTML);
            elems[level].removeClass('inputSel');

            //清空后面选择的信息
            for (var i = level + 1, len = this.levels.length; i < len; i++) {
                elems[i][0].value = '';
                selected[i] = '';
            }

            elems[level + 1] && elems[level + 1][0].focus();
        },

        reg: function (elems) {
            if (!this._inited) {
                this.init(elems);
                this._inited = true;
            }

            this._bindEvents(elems);
        },

        _initSelected: function (elems) {
            var match,
            selected = this.selected,
            levels = this.levels,
            data = this._data;

            elems.each(function (el, i) {
                if (el.value() == '') return;
                match = data.match(RegExp('@' + levels[i] + '(\\d+)\\|\\d*\\|' + el.value()));
                if (match)
                    selected[i] = match[1];
            });
        },

        init: function (elems) {
            var self = this;

            $.ajax(FHXConfig.URL.LOCATION_DATA, {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, dataStr) {
                    //self.parseData(dataStr);
                    self._data = dataStr;
                    self._initSelected(elems);
                },
                onerror: function () {
                    self._data = undefined;
                }
            });

            // create pop div
            var temp = document.createElement('div');
            temp.innerHTML = '<div class="m_address_box clearfix hidden" style="margin:5px;position:absolute;z-index:100;width:400px"><div class="m_address_bd clearfix"></div></div>';
            self._divPop = $(temp.firstChild);
            document.body.appendChild(self._divPop[0]);

            if (cQuery.browser.isIE6)
                self._divPop.cover(); // IE6 problem

            // position:absolute bug
            if (cQuery.browser.isIE6 || cQuery.browser.isIE7)
                self._divPop.css({ top: '28px', left: '0' });

        },

        _render: function (level, parentId) {
            var levelType = this.levels[level],
            data = this._data,
            tmpl = this._tmpl,
            list = [];

            var rExp = new RegExp('@' + levelType + '(\\d+)\\|' + parentId + '\\|([^\\|@]+)', 'g');

            data.replace(rExp, function (_, id, name) {
                list.push(tmpl.replace('$name', name).replace('$id', id));
            });

            return list.join('');
        },

        // 根据层级显示对应的列表
        show: function (level, elem) {
            var divPop = this._divPop,
            data = this._data,
            selected = this.selected,
            parentId = level == 0 ? '' : selected[level - 1];

            if (data) {
                var list = this._render(level, parentId);

                if (list.length == 0) {
                    divPop.addClass('hidden'); //在没有数据的时候保证不显示
                    return;
                }

                divPop.find('div').html(list);
                divPop.css({ marginLeft: this.lefts[level] });
                divPop.removeClass('hidden');
                divPop.insertAfter(elem); // 显示在对应的输入框之后

                this._currentLevel = level;
            }
        },

        hide: function () {
            this._divPop.addClass('hidden');
        }
    }

    BookManager.init();

    // user type listener mod
    ; (function (exports) {
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

});