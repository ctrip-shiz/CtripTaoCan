define(function (require, exports, module) {

    var SS = require('tools/common').S;
    var Mod = require('tools/common').Mod;
    require('mods');
    Mod.DropDownList = require('tools/dropdownlist.js');
    Mod.EventEmitter = require('tools/eventemitter.js');
    Mod.placeholder = require('tools/placeholder.js');
    Mod.placeholder.init();
    Mod.fixPosition = require('tools/fixposition.js')
    $.mod.load("validate", "1.1", function () { })
    //require.async('mods');
    var ENUM = SSHConfig.ENUM;
    var MSG = SSHConfig.validate;

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
            if (cellphone.length != 11 || !Validator.rCellphone.test(cellphone)) {
                return false;
            }
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
                if (SSHConfig.data.traditionalChs.indexOf(chars[i]) >= 0) {
                    return true;
                }
            }
            return false;
        },

        // 包含生僻字
        hasRareChs: function (v) {
            var chars = v.split("");
            for (var i = 0; i < chars.length; i++) {
                if (SSHConfig.data.rareChs.indexOf(chars[i]) >= 0) {
                    return true;
                }
            }
            return false;
        },


        rules: {
            //姓名
            name: {
                elems: null, // txtName
                format: [
                    { check: 'empty', msgs: [MSG.name[0]] },
                    { check: [2, 26], msgs: [MSG.name[1]] }
                ],
                logic: [{
                    check: function (txtName) {
                        var result = { ok: true, pos: txtName }
                        var name = txtName.value().trim();
                        if (Validator.rChsChar.test(name)) {
                            result.ok = Validator.rChinese.test(name);
                            result.msg = MSG.name[2];
                        } else {
                            result.ok = Validator.rEnglish.test(name);
                            result.msg = MSG.name[3];
                        }
                        return result;
                    }
                }]
            },
            eName: {
                elems: null, // txtName
                format: [
                    { check: 'empty', msgs: [MSG.name[0]] },
                    { check: [2, 26], msgs: [MSG.name[1]] }
                ],
                logic: [{
                    check: function (txtName) {
                        var result = { ok: true, pos: txtName }
                        var name = txtName.value().trim();
                        result.ok = Validator.rEnglish.test(name);
                        result.msg = MSG.name[3];
                        return result;
                    }
                }]
            },
            cName: {
                elems: null, // txtName
                format: [
                    { check: 'empty', msgs: [MSG.name[0]] },
                    { check: [2, 26], msgs: [MSG.name[1]] }
                ],
                logic: [{
                    check: function (txtName) {
                        var result = { ok: true, pos: txtName }
                        var name = txtName.value().trim();
                        if (Validator.rChsChar.test(name)) {
                            result.ok = Validator.rChinese.test(name);
                            result.msg = MSG.name[2];
                        }
                        else {
                            result.ok = false;
                            result.msg = MSG.name[2]
                        }
                        return result;
                    }
                }]
            },
            //日期
            date: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.date[0]] },
                ],
                logic: [{
                    check: function (dateInput) {
                        var result = { ok: true, pos: dateInput, msg: MSG.date[1] };
                        var date = dateInput.value().trim();
                        result.ok = Validator.isDate(date);
                        return result;
                    }
                }
                ]
            },
            //手机号
            phoneNum: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.cellPhone[0]], elems: 0 },
                    { check: 'cellphone', msgs: [MSG.cellPhone[1]], elems: 0 }
                ]
            },

            //证件类型
            passengerCard: {
                elems: null, //txtCardType, txtCardId
                args: null, //passengerType, cardTypeText
                format: [
                    { check: 'empty', msgs: [MSG.passageCard[0]], elems: 1 },
                    { check: [1, 30], msgs: [MSG.passageCard[1]], elems: 1 },
                ],
                logic: [{
                    check: function (txtCardType, txtCardId) {
                        var cardId = txtCardId.value().trim(),
                            cardType = txtCardType.value();

                        var result = { ok: true };
                        //身份证
                        if (cardType == ENUM.cardtype.identity) {
                            var result = { ok: true, pos: txtCardId, msg: MSG.passageCard[2] };
                            // 18位身份证
                            result.ok = Validator.isChinaIDCard(cardId);
                            return result;
                        }
                        // 军人证
                        if (cardType == ENUM.cardtype.military) {
                            result = {
                                ok: Validator.rMilitary.test(cardId),
                                msg: MSG.passageCard[3],
                                pos: txtCardId
                            }
                            return result;
                        }
                        //台胞证
                        if (cardType == ENUM.cardtype.taiwan) {
                            result = {
                                ok: Validator.rTaiwan.test(cardId),
                                msg: MSG.passageCard[4],
                                pos: txtCardId
                            }
                            return result;
                        }
                        // 基本格式校验
                        result = {
                            ok: Validator.rNormal.test(cardId),
                            msg: SS.format(MSG.passageCard[5], cardType),
                            pos: txtCardId
                        }
                        return result;
                    }
                }]
            },


            //联系人
            contact: {
                elems: null, //txtName, txtCellphone, txtPhoneArea, txtPhoneMain, txtPhoneExt, txtEmail
                format: [
                    { check: 'empty', msgs: MSG.contact.slice(0, 2), elems: function (els) { return els.slice(0, 2); } },
                    { check: [2, 26], msgs: [MSG.contact[2]], elems: 0 },
                    { check: 'cellphone', msgs: [MSG.contact[3]], elems: 1 },
                    //{ check: 'phoneArea', msgs: [MSG.format[8]], elems: 2, required: false },
                    //{ check: 'phone', msgs: [MSG.format[9]], elems: 3, required: false },
                    //{ check: 'phoneExt', msgs: [MSG.format[10]], elems: 4, required: false },
                    { check: 'email', msgs: [MSG.contact[4]], elems: 2, required: false }
                ]
            },
            //发票
            invoice: {
                elems: null, //txtTitle, txtDetail
                format: [
                    { check: 'empty', msgs: MSG.invoice.slice(0, 1) }
                ]
            },
            //配送
            delivery: {
                elems: null, // txtDeliveryArea, txtDeliveryAddress
                format: [
                    { check: 'empty', msgs: MSG.empty.slice(10, 12) }
                ]
            },
            //快递
            ems: { // txtReciever,  txtProvince, txtCity, txtArea, txtAddress ,txtZipcode, txtCellphone
                elems: null,
                format: [
                    { check: 'empty', msgs: MSG.ems.slice(0, 6), elems: function (els) { return els.slice(0, 6); } },
                    { check: 'zipcode', msgs: [MSG.ems[6]], elems: 5 },
                    //{ check: 'cellphone', msgs: [MSG.format[6]], elems: 6, required: false }
                ]
            },
            //性别
            gender: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.gender[0]] }
                ]
            },
            //国籍
            nationality: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.nationality[0]] }
                ]
            },
            //证件有效期
            effectiveDate: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.effectiveDate[0]] }
                ],
                logic: [
                    {
                        check: function (dateInput) {
                            var result = { ok: true, pos: dateInput, msg: MSG.effectiveDate[1] };
                            var date = dateInput.value().trim();
                            result.ok = Validator.isDate(date);
                            return result;
                        }
                    }
                ]
            },
            //出生地
            birthPlace: {
                elems: null,
                format: [
                    { check: 'empty', msgs: [MSG.birthPlace[0]] }
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
                    $(SS.prev(divDelivery)).find('.btn_submit>a').trigger('click');
                    setTimeout(function () {
                        showError();
                    }, 100);
                    return false;
                }
            }
            return true;
        }
    }






    var PersonManage = {
        wrap: $("#ticket"),
        //需要收集出行人信息总数
        travelerInfoAmount: 0,
        //所有可选项
        options: [],
        //所有必选门票
        required: [],
        //所有可选门票
        selectable: [],
        needIDCard: false,
        init: function () {
            var self = this;
            var allItem = this.wrap.find("table");
            allItem.each(function (item, i) {
                var type = item.attr("goodsType");
                var usePerson = item.attr("data-person");
                if (!type) {
                    return;
                }
                self[type].push(item);
                //goodsType:optoins可选项，required必选资源,selectable可选门票
                //ticketType:1为一单一人，2为一张一人
                item.goodsType = type;
                item.usePerson = usePerson || 1;
                item.dateInput = item.find(".input_range");
                item.copies = item.find(".s_num");
                //所有的门票部分的日历输入框注册日历
                item.dateInput.regMod("calendar", "3.0", {
                    options: {
                        showWeek: false
                    }
                });
                //必选门票从1开始
                if (type == "required") {
                    shortList.reg([item.copies, $(getNext(item.copies[0]))], function (e) {
                        var oldValue = item.copies.value();
                        var newValue = e.target.getAttribute("t_id");
                        if (oldValue != newValue) {
                            item.copies.value(newValue);
                            SS.trigger(item.copies, "change");
                            //item.copies.trigger("change");
                        }
                    });
                }
                //可选门票从0开始
                if (type == "selectable") {
                    shortList2.reg([item.copies, $(getNext(item.copies[0]))], function (e) {
                        var oldValue = item.copies.value();
                        var newValue = e.target.getAttribute("t_id");
                        if (oldValue != newValue) {
                            item.copies.value(newValue);
                            SS.trigger(item.copies, "change");
                            //item.copies.trigger("change");
                        }
                    });
                }
            });
        },
        //计算出行人具体个数
        countPerson: function () {
            function getMax(array) {
                array.push(0);
                return Math.max.apply(null, array);
            }
            //必选门票数量
            var requiredCopies = [];
            for (var i = 0, PR = PersonManage.required, l = PR.length; i < l; i++) {
                var num = PR[i].copies.value() * PR[i].usePerson;
                requiredCopies.push(num);
            }
            var maxRequired = getMax(requiredCopies);
            //可选门票数量
            var selectableCopies = [];
            for (var i = 0, PS = PersonManage.selectable, l = PS.length; i < l; i++) {
                selectableCopies.push(PS[i].copies.value() * PS[i].usePerson);
            }
            var maxSelectable = getMax(selectableCopies);
            //可选项数量
            var optionsCopies = [];
            for (var i = 0, PO = PersonManage.options, l = PO.length; i < l; i++) {
                optionsCopies.push(PO[i].copies.value() * PO[i].usePerson);
            }
            var maxOPtions = getMax(optionsCopies);

            var maxRequire = getMax([maxRequired, maxOPtions]);
            var maxAll = maxRequire + maxSelectable;
            this.travelerAmount = this.travelerInfoAmount = maxAll;
            //如果一单一人
            if (SSHConfig.ticketInf.noTicket == 0 && SSHConfig.ticketInf.type == 1) {
                this.travelerInfoAmount = 1;
            }
        },
        createPerson: function () {
            //计算个数
            this.countPerson();
            //用户修改后的出行人数量
            var needLength = this.travelerInfoAmount;
            //当前出行人的数量
            var curLength = Person.traveler.length;
            if (curLength < needLength) {
                setTimeout(function () {
                    while (curLength++ != needLength) {
                        var aPerson = new Person("traveler");
                        if (Person.savedInf.length) {
                            var aContace = Person.savedInf.pop();
                            if (aContace.map) {
                                aContace = aContace.map;
                                aContace.filledForm = aPerson;
                                aContace.filledForm.quickBtn = aContace;
                                $("#divCustomerList [data-index=" + aContace.index + "]")[0].checked = "checked";
                            }
                            aPerson.fill(aContace);
                        }
                    }
                }, 30)
            }
            else {
                while (curLength-- != needLength) {
                    Person.traveler.pop().delPerson();
                }
            }
        },
        createProposer: function () {
            //用户期望保险数
            var needProposer = Number(Insurance.selectedInsurance.value);
            //需额外创建的保险数
            var extraProposer = needProposer - PersonManage.travelerInfoAmount;
            if (extraProposer < 0) {
                extraProposer = 0;
            }
            //当前已有的保险数
            var curProposer = Person.proposer.length;
            if (extraProposer > curProposer) {
                setTimeout(function () {
                    while (extraProposer != curProposer++) {
                        var aProposer = new Person("proposer");
                        if (Person.savedInf.length) {
                            var aContace = Person.savedInf.pop();
                            if (aContace.map) {
                                aContace = aContace.map;
                                aContace.filledForm = aProposer;
                                aContace.filledForm.quickBtn = aContace;
                                $("#divCustomerList [data-index=" + aContace.index + "]")[0].checked = "checked";
                            }
                            aProposer.fill(aContace);
                        }
                    }
                }, 30)
            }
            else {
                while (extraProposer != curProposer--) {
                    Person.proposer.pop().delPerson();
                }
            }
            Scroll.confirmFixer.updateUpper();
        },
        //只能身份证
        limitNeedIDCard: function () {
            this.wrap.find("select")[0].options.length = 0;
        },
        //需要证件
        limitCard: function () {
            this.wrap.find("select").html(SSHConfig.HTML.allCardType)
        }
    }





    function Person(type) {
        //type：出行人还是保险
        this.filled = false;
        this.quickBtn = null;
        var self = this;
        wrap = document.createElement("div");
        wrap.className = "tickets_input tickets_input_border layoutfix";
        this.wrap = $(wrap);
        var traveler = Person.traveler;
        var proposer = Person.proposer;
        if (type == "traveler") {
            if (Insurance.needInsurance) {
                wrap.innerHTML = SSHConfig.HTML.noTicket2;
            }
            else {
                if (PersonManage.required.concat(PersonManage.selectable).length == 0) {
                    wrap.innerHTML = SSHConfig.HTML.noTicket;
                }
                else {
                    wrap.innerHTML = SSHConfig.HTML.person;
                }
            }
            //第一个出行人
            if (!traveler.length) {
                this.isfirstPerson();
                if (proposer.length == 0) {
                    $(".input_info")[0].appendChild(wrap);
                }
                else {
                    this.wrap.insertBefore(proposer[0].wrap);
                }
            }
            else {
                this.wrap.insertAfter(traveler[traveler.length - 1].wrap);
            }
            traveler.push(this);
        }
        if (type == "proposer") {
            wrap.innerHTML = SSHConfig.HTML.proposer;
            if (!proposer.length) {
                $(".input_info")[0].appendChild(wrap);
            }
            else {
                this.wrap.insertAfter(proposer[proposer.length - 1].wrap);
            }
            Person.proposer.push(this);
        }
        this.allInputs = this.wrap.find("input[type=text]");
        this.allInputs.each(function (item) {
            var inputName = item[0].name;
            self[inputName] = item;
        });
        this.cardType = this.wrap.find("select");
        this.initEvent();
        Mod.placeholder.enable(wrap);


        if (this.nationality) {
            regNationality(this.nationality, "nationality", SSHConfig.texts.titles[0])
        }
        function regNationality(target, name, title) {

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
                    suggestion: SSHConfig.data.nationalitySuggestion,
                    data: SSHConfig.data.nationalityData
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
        }
    }
    Person.prototype = {
        //初始化事件
        initEvent: function () {
            var self = this;
            this.wrap.bind("click", function (e) {
                var target = $(e.target);
                if (target.hasClass("multiple_btn2")) {
                    self.clearAll();
                }
            })
            this.wrap.find("input[type=text]").bind("change", function () {
                self.filled = false;
                $(self.wrap).find("input[type=text]").each(function (item, i) {
                    if (item.value()) {
                        self.filled = true;
                    }
                });
                if (!self.filled) {
                    self.clearAll();
                }
            })
        },
        //限制为身份证
        limitNeedIDCard: function () {
            this.wrap.find("select")[0].length = 1;
        },
        //需要证件
        limitNeedCard: function () {
            this.wrap.find("select").html(SSHConfig.allCardType);
        },
        //第一个人
        isfirstPerson: function () {
            var liList = this.wrap.find("li");
            var notice = SS.create(SSHConfig.HTML.firstPerson);
            if (this.wrap.find("[name=phoneNum]").length == 0) {
                var phoneNum = SS.create(SSHConfig.HTML.phoneNum);
                $(phoneNum).insertAfter(liList[liList.length - 1])
            }
            if (this.wrap.find("[name=phoneNum]")[0]) {
                var cellPhoneLi = getParent(this.wrap.find("[name=phoneNum]")[0], "li");
                $(cellPhoneLi).find("label").removeClass("lab");
            }
            if ($(liList[0]).find("[name=name]").length) {
                $(notice).insertAfter($(liList[0]).find("[name=name]"));
            }
        },
        //清空表单内容
        clearAll: function () {
            var allInput = this.wrap.find("ul input");
            allInput.each(function (item) {
                item.value("");
            })
            this.filled = false;
            this.clearQuickBtn();
        },
        //清除表单与常用联系人之间的关联
        clearQuickBtn: function () {
            if (this.quickBtn) {
                $('#divCustomerList').find('input[type="checkbox"]:eq(' + (this.quickBtn.index) + ')')[0].checked = false;
                this.quickBtn = null;
            }
        },
        //填充联系人信息
        fill: function (contact) {
            var self = this;
            var allOptions = this.wrap.find("option");
            this.wrap.find("input[type=text]").each(function (item) {
                var name = item[0].name;
                if (name == "cardId") {
                    var cardType = contact.cardType;
                    if (cardType) {
                        for (var i = 0, l = allOptions.length; i < l; i++) {
                            if (cardType == allOptions[i].value) {
                                self.cardType.value(cardType);
                                item.value(contact.cardId);
                            }
                        }
                    }
                }
                else if (name == "cName" || name == "eName" || name == "name") {
                    switch (name) {
                        case "cName": item.value(contact.name || contact.ename || contact.cname);
                            break;
                        case "eName": item.value(contact.ename || contact.name || contact.cname);
                            break;
                        case "name": item.value(contact.name || contact.ename || contact.cname);
                            break;
                    }
                }
                else {
                    item.value(contact[name] || "");
                }
            });
            this.filled = true;
            if (contact.index === 0 || contact.index) {
                this.quickBtn = contact;
            }
        },
        //更改出行人证件
        changeCardType: function (e) {
            if (this.birthday.length && this.cardType.value() == ENUM.cardtype.identity) {
                $(this.birthday[0].parentNode).addClass("hidden");
            }
            else if (this.birthday.length) {
                $(this.birthday[0].parentNode).removeClass("hidden");
            }
            if (this.quickBtn && this.cardType.value() == this.quickBtn.cardType) {
                this.cardId.value(this.quickBtn.cardId)
            }
        },
        //删除联系人
        delPerson: function () {
            if (this.filled) {
                this.savePerson();
            }
            this.wrap.remove();
            this.clearQuickBtn();
        },
        savePerson: function () {
            var oneInf = {};
            if (this.quickBtn) {
                oneInf.map = this.quickBtn;
            }
            else {
                var allInf = this.wrap.find("[name]");
                allInf.each(function (item) {
                    var name = item[0].name;
                    if (name == "cName" || name == "eName") {
                        name = name.toLowerCase();
                    }
                    oneInf[name] = item.value();
                })
            }
            Person.savedInf.push(oneInf);
        },
        //验证
        validate: function (isShallow) {
            if (isShallow) {
                return this.name.value().trim() != '';
            } else {
                // 深层验证
                var bv = BookValidator;
                var list = Person.traveler.concat(Person.proposer);
                var result = true;
                var self = this;
                this.allInputs.each(function (item) {
                    var name = item[0].name;
                    if (result) {
                        switch (name) {
                            case "cardId": result = bv.validate('passengerCard', [self.cardType, self.cardId]);
                                break;
                            case "birthday": result = bv.validate("date", [self.birthday]);
                                break;
                            default: result = bv.validate(name, [self[name]]);
                                break;
                        }
                    }
                })
                return result;
            }
        }
    }



    Person.validate = function () {
        var boxes = Person.traveler.concat(Person.proposer),
        passengerType = false,
        ticket = { name: [], eName: [], cName: [] },
        name, pos;

        for (var i = 0, len = boxes.length; i < len; i++) {
            passengerType = boxes[i].validate(false);
            if (!passengerType) {
                return false;
            }
            // check whether there are same name.
            for (var name in ticket) {
                if (boxes[i][name]) {
                    nameValue = boxes[i][name].value().trim();
                    if (ticket[name].length > 0 && ticket[name].indexOf(nameValue) > -1)
                        return Mod.showTips(boxes[i][name], MSG.name[4]);
                    ticket[name].push(nameValue);
                }
            }
        }
        return true;
    }



    //存储出行人
    Person.traveler = [];
    //存储投保人
    Person.proposer = [];
    //用户填写的信息
    Person.savedInf = [];




    var ContactList = {

        init: function (fnLimit) {
            var self = this;
            Mod.EventEmitter.extend(this);
            setTimeout(function () {
                self._initList();
            }, 400)

            this.fnLimit = fnLimit || function () {
                return false;
            }; // default: no limit;
        },

        _events: { check: [] },

        _initList: function () {
            var self = this;
            this.txtFilterContact = $('#txtFilterContact');
            //Mod.regPlaceHolder(this.txtFilterContact, SSHConfig.placeholder[15]);
            $.ajax(SSHConfig.URL.PASSENGER_INFO, {
                method: "POST",
                context: { uid: $("#hUid").value() },
                onsuccess: function (xhr, res) {
                    var divCustomerList = self.container = $('#divCustomerList');
                    self.container.html(res);
                    var dataStr = self.container.find("script").html();
                    self.contacts = SSHConfig.data.contacts = cQuery.parseJSON(dataStr);
                    if (divCustomerList.length == 0 || self.contacts.length == 0 || divCustomerList.find("li").length == 0) {
                        SS.hide(divCustomerList);
                        return; // 无联系人处理
                    }
                    Scroll.confirmFixer.updateUpper();
                    self._bindEvents(divCustomerList.find('ul'));
                },
                onerror: function () {

                }
            })
        },


        _bindEvents: function (contactList) {
            var _this = this;
            this.contactList = contactList;
            // 联系人勾选
            contactList.bind('click', function (e) {
                var target = e.target;
                if (target.nodeName == 'UL') return;
                if (target.nodeName != 'INPUT') {
                    if (target.nodeName == 'SPAN') {
                        target = SS.prev(target);
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
            // 常用联系人筛选
            require.async('typer.js', function (Typer) {
                new Typer(_this.txtFilterContact, _this.filter.bind(_this));
            });
        },
        //筛选联系人
        filter: function (keyword) {
            var contacts = this.contacts;
            this.contactList.find('input').each(function (chk, i) {
                var li = SS.parent(chk, 'li');
                (contacts[i].name.indexOf(keyword) > -1 ||
                    (contacts[i].ename && contacts[i].ename.indexOf(keyword) > -1)) ?
                    SS.show(li) : SS.hide(li);
            });
            Scroll.confirmFixer.updateUpper();
        },
        //勾选
        check: function (index, target) {
            var contact = this.contacts[index];

            var personList = Person.traveler.concat(Person.proposer);
            if (target.checked) {
                for (var i = 0, l = personList.length; i < l; i++) {
                    if (!personList[i].filled) {
                        personList[i].fill(contact);
                        contact.checked = true;
                        contact.filledForm = personList[i];
                        contact.filledForm.quickBtn = contact;
                        break;
                    }
                }
                if (i == l) {
                    Mod.showTips(target, MSG.logic[0])
                    target.checked = false;
                    return;
                }
            }
            else {
                contact.filledForm.clearAll();
            }
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

    var ContactScroll = {
        wrap: $("#divCustomerList"),
        init: function () {
            this.eventInit();
        },
        lastPosition: 0,
        step: 44,
        eventInit: function () {
            this.wrap.bind("scroll", this.fixPosition.bind(this));
        },
        fixPosition: function () {
            var newPosition = this.wrap[0].scrollTop;
            var des = newPosition - this.lastPosition;
            if (des == 0) {
                return;
            }
            this.wrap[0].scrollTop = this.lastPosition + (des / Math.abs(des)) * this.step;
            this.lastPosition = this.wrap[0].scrollTop;
        }
    }


    /**@class 联系人填写框 */
    var ContactBox = {
        init: function () {
            var container = $('#ContactInf');
            this._initElements(container);
        },

        _initElements: function (container) {
            var textboxes = container.find('input[type="text"]'),
                members = ['txtContact', 'txtContactPhone', 'txtEmail', 'txtPhoneArea', 'txtPhoneMain', 'txtPhoneExt'],
                self = this;

            // notice
            textboxes.each(function (txt, i) {
                self[members[i]] = txt;
                //Mod.regPlaceHolder(txt, SSHConfig.placeholder[i + 5]);
            });
        },

        validate: function () {
            // From MDN
            // Iterates over the enumerable properties of an object, in arbitrary order. 
            return BookValidator.validate('contact',
                    [this.txtContact, this.txtContactPhone, this.txtEmail]);
        }
    }




    var shortList = new Mod.DropDownList($("#shortList"));
    var shortList2 = new Mod.DropDownList($("#shortList2"));
    var longList = new Mod.DropDownList($("#longList"));


    //信息确认部分
    var Confirm = {
        wrap: $(".product_select"),
        init: function () {
            this.eventInit()
        },
        eventInit: function () {
            this.wrap.bind("click", function (e) {
                var target = e.target;
                var cTarget = $(target);
                //e.preventDefault();
                //点击到标题
                if (target.nodeName == "A" && (cTarget.hasClass("recom_type") || getParent(target, "td") && $(getParent(target, "td")).hasClass("col_1"))) {
                    var cur = getParent(target, "tr");
                    var next = $(getNext(cur));
                    if (next.hasClass("hidden")) {
                        next.removeClass("hidden");
                    }
                    else {
                        next.addClass("hidden");
                    }
                }
                //点击到收起
                if (cTarget.hasClass("btn_up") || cTarget.hasClass("pack_up")) {
                    var cur = $(getParent(target, "tr"));
                    cur.addClass("hidden");
                }
                if (target.nodeName == "B") {
                    cTarget = $(getParent(target, "A"));
                }
                //点击到更多保险
                if (cTarget.hasClass("other_tickets")) {
                    var wrap = $("#insurance");
                    cTarget.addClass("hidden");
                    wrap.find("table tr:even").removeClass("hidden");
                    wrap.find(".other_tickets2").removeClass("hidden");
                }
                //点击到收起保险
                if (cTarget.hasClass("other_tickets2")) {
                    cTarget.addClass("hidden");
                    var wrap = $("#insurance");
                    wrap.find("table tr").addClass("hidden");
                    $(getParent(Insurance.selectedInsurance, "tr")).removeClass("hidden");
                    wrap.find(".other_tickets").removeClass("hidden");
                }
                Scroll.confirmFixer.updateUpper();
            })
        }
    }



    var AjaxManage = {
        //存储获取计算价格需要请求的ajax数量
        needAjaxTimes: 2,
        //存储已经请求成功的ajax数量
        getAjaxReady: 0,
        firstRefresh: true,
        isLoading: false,
        ajaxPrice: function () {
            this.showLoading();
            var self = this;
            var data = {};
            data.peggingParams = document.getElementById("hPeggingParams").value;
            var allType = ["ticket", "hotelOption", "hotel", "insurance"];
            allType.each(function (item) {
                data[item] = "";
                var wrap = $("#" + item);
                var allCopies = wrap.find(".s_num");
                allCopies.each(function (copy) {
                    data[item] += (copy.value() + ",");
                })
                data[item] = data[item].substring(0, data[item].length - 1)
                var allDate = wrap.find(".input_range");
                if (allDate.length) {
                    data[item + "Date"] = "";
                    allDate.each(function (dateInput) {
                        data[item + "Date"] += (dateInput.value() + ",");
                    })
                    data[item + "Date"] = data[item + "Date"].substring(0, data[item + "Date"].length - 1);
                }
            })

            $.ajax(SSHConfig.URL.ORDER_PRICE, {
                context: data,
                method: "POST",
                onsuccess: function (xhr, res) {
                    var hasValue = res.replace(/\s+/g, "");
                    if (!hasValue) {
                        return BookManager.cantBook();
                    }
                    self.hideLoading();
                    PriceManage.basePrise = res.split("|")[0];
                    PriceManage.displayAllPrice(res);
                }
            })
        },
        //获取所有产品详细信息
        ajaxAllInfo: function () {
            var self = this;
            $.ajax(SSHConfig.URL.PRODUCT_INFO, {
                context: { PeggingParams: $("#hPeggingParams").value() },
                method: "POST",
                onsuccess: function (xhr, res) {
                    var data = new Function("return " + res.replace(/\t|\n|\r/g, ''))();
                    var tickets = { dates: [] };
                    var insurances = {};
                    //门票部分
                    var ticketContainer = $("#ticket").find(".hidden_content");
                    ticketContainer.each(function (item, i) {
                        var obj = data[item.attr("data-id")];
                        //确认部分提示
                        var str = $.tmpl.render(SSHConfig.templ.ticket, obj);
                        item.find("div").html(str);
                        tickets.dates.push(obj);
                    })
                    var insuranceContainer = $("#insurance").find(".hidden_content");
                    insuranceContainer.each(function (item, i) {
                        var obj = data[item.attr("data-id")];
                        var str = $.tmpl.render(SSHConfig.templ.insurance, obj);
                        item.find("div").html(str);
                        insurances[item.attr("data-id")] = obj;
                    });
                    //底部提示
                    var str1 = $.tmpl.render(SSHConfig.templ.ticketAll, tickets);
                    var str2 = $.tmpl.render(SSHConfig.templ.insuranceAll, insurances);
                    document.getElementById("ticketNote").innerHTML = str1;
                    document.getElementById("insuranceNote").innerHTML = str2;
                    Insurance.controlDetail();
                }
            })
        },

        ajaxHotel: function () {
            this.showLoading();
            var self = this;
            var data = {};
            var wrap = document.getElementById("divHidden");
            var allInput = $(wrap).find("input");
            allInput.each(function (item) {
                var name = item[0].name;
                data[name] = item.value();
            });
            var inputs = $("#hotel").find("input[type=text]");
            data.checkInDate = inputs[0] ? inputs[0].value : document.getElementById("hCheckInDate").value;
            data.roomCount = inputs[1] ? inputs[1].value : document.getElementById("hRoomCount").value;
            $.ajax(SSHConfig.URL.HOTEL_INFO, {
                method: "POST",
                context: data,
                async: true,
                onsuccess: function (xhr, res) {
                    var hasValue = res.replace(/\s+/g, "");
                    if (!hasValue) {
                        return BookManager.cantBook();
                    }
                    Hotel.wrap.html(res);
                    self.fillHotelNote()
                    Hotel.reset();
                    self.ajaxSuccess();
                }
            })
        },

        ajaxHotelOption: function () {
            this.showLoading();
            var self = this;
            var copies = [];
            var useDate = [];
            $("#hotelOption").find(".s_num").each(function (item, i) {
                copies.push(item.value());
            })
            $("#hotelOption").find(".input_range").each(function (item, i) {
                useDate.push(item.value());
            })
            $.ajax(SSHConfig.URL.HOTEL_OPTION, {
                method: "POST",
                async: true,
                context: {
                    PeggingParams: $("#hPeggingParams").value(),
                    quantity: copies.join("|"),
                    useDate: useDate.join("|") || (HotelOption.firstReflesh ? document.getElementById("hCheckInDate").value : Hotel.dateInput.value())
                },
                onsuccess: function (xhr, res) {
                    HotelOption.wrap.html(res);
                    HotelOption.reset();
                    self.ajaxSuccess();
                }
            })
        },
        ajaxGetTicketType: function () {
            var allCopies = Ticket.wrap.find(".s_num");
            var quantity = [];
            allCopies.each(function (item, i) {
                quantity.push(item.value());
            })
            quantity = quantity.join(",");
            $.ajax(SSHConfig.URL.TICKET_TYPE, {
                method: "POST",
                async: true,
                context: {
                    PeggingParams: $("#hPeggingParams").value(),
                    quantity: quantity
                },
                onsuccess: function (xhr, res) {
                    SSHConfig.ticketInf.type = Number(res);
                    SS.trigger(Insurance.selectedInsurance, "change")
                    //$(Insurance.selectedInsurance).trigger("change");
                }
            })
        },

        fillHotelNote: function () {
            var hotelNote = $("#hotelNote");
            var hotelAddInfo = $("#hotelAddInfo");
            hotelNote.html(hotelAddInfo.html());
            hotelAddInfo.remove();
        },

        ajaxSuccess: function () {
            this.getAjaxReady++;
            if (this.getAjaxReady == this.needAjaxTimes) {
                this.getAjaxReady = 0;
                Insurance.changeInsuranceOption();
                PersonManage.createPerson();
                PersonManage.createProposer();
                Scroll.confirmFixer.updateUpper();

                //限制可选项使用日期
                var selectedDate = Hotel.dateInput.value();
                var dateObj = selectedDate.toDate().addDays(1);
                var tomorrow = dateObj.toFormatString("yyyy-MM-dd");

                HotelOption.dateInput.each(function (item) {
                    item.data("maxDate", tomorrow);
                    item.data("minDate", selectedDate);
                });

                AjaxManage.ajaxPrice();
            }
        },
        showLoading: function () {
            if (!this.isLoading) {
                this.isLoading = true;
                var wrap = document.getElementById("confirmInf");
                var needHiddenEle = $("#confirmInf .tickets_select");
                var oldHeight = SS.height(wrap);
                needHiddenEle.addClass("hidden");
                newHeight = SS.height(wrap);
                var height = oldHeight - newHeight;
                var paddingTop = Math.abs((height - 60) / 2);
                var style = { paddingTop: paddingTop + "px", height: (height - paddingTop) + "px", width: "auto" };
                Mod.showLoading(wrap, undefined, style);
                //$("#confirmInf .tickets_select").addClass("hidden");
                Scroll.confirmFixer.updateUpper();
            }
        },
        hideLoading: function () {
            this.isLoading = false;
            Mod.hideLoading(document.getElementById("confirmInf"));
            $("#confirmInf .tickets_select,#confirmInf .product_intro").removeClass("hidden");
            $("#traverInf").removeClass("hidden");

            //控制可选项是否显示
            var hasValue = HotelOption.wrap.html().replace(/\s*/g, "")
            if (!hasValue) {
                HotelOption.wrap.addClass("hidden");
            }
            else {
                HotelOption.wrap.removeClass("hidden");
            }
            Scroll.confirmFixer.updateUpper();
        }
    }



    //门票确认部分
    var Ticket = {
        wrap: $("#ticket"),
        init: function () {
            this.copiesInput = this.wrap.find(".s_num");
            this.dateInput = this.wrap.find(".input_range");
            this.eventInit();
        },
        eventInit: function () {
            var self = this;
            this.copiesInput.bind("change", function () { self.inputChangeFn(this) });
        },
        inputChangeFn: function (target) {
            //如果是必选门票
            if (getParent(target, "table").getAttribute("goodstype") == "required") {
                target.value = limitRange(target.value, { max: 99, min: 1 });
                Insurance.changeInsuranceOption();

                SS.trigger(Insurance.selectedInsurance, "change");
                //$(Insurance.selectedInsurance).trigger("change");
            }
            else {
                target.value = limitRange(target.value, { max: 99, min: 0 });
                AjaxManage.ajaxGetTicketType();
                Insurance.changeInsuranceOption();
            }
        }
    }

    //酒店确认部分
    var Hotel = {
        wrap: $("#hotel"),
        init: function () {
            var dateRange = $("#hDateRange").value().split("|");
            this.startDate = dateRange[0];
            this.endDate = dateRange[1];
            this.refreshData();
        },
        refreshData: function () {
            AjaxManage.ajaxHotelOption();
            setTimeout(function () {
                AjaxManage.ajaxHotel();
            }, 100)
        },
        inputChangeFn: function (e) {
            var target = e.target;
            target.value = limitRange(target.value, { max: 20, min: 1 })
        },
        reset: function () {
            var self = this;
            //酒店日期输入框
            this.dateInput = this.wrap.find(".input_range");
            //酒店份数输入框
            this.copies = this.wrap.find(".s_num");
            //酒店日期注册
            this.dateInput.each(function (item, i) {
                var maxDate = new Date().addDays(30);
                item.regMod("calendar", "3.0", {
                    options: {
                        showWeek: false,
                        minDate: self.startDate,
                        maxDate: self.endDate
                    }
                });
            });
            //酒店份数注册
            this.copies.each(function (item, i) {
                var allEles = [item, $(getNext(item[0]))]
                shortList.reg(allEles, function (e) {
                    var oldValue = item.value();
                    var newValue = e.target.getAttribute("t_id");
                    if (oldValue != newValue) {
                        item.value(newValue);
                        SS.trigger(item,"change")
                        //item.trigger("change");
                    }
                });
            });

            //限制门票使用日期
            var selectedDate = Hotel.dateInput.value();
            var dateObj = selectedDate.toDate().addDays(1);
            var tomorrow = dateObj.toFormatString("yyyy-MM-dd");
            Ticket.dateInput.each(function (item) {
                item.value(selectedDate);
                item.data("maxDate", tomorrow);
                item.data("minDate", selectedDate);
            })
            //酒店日期改变
            this.dateInput.bind("change", function () {
                var selectedDate = Hotel.dateInput.value();
                //重新调整可选项，门票使用日期
                Ticket.wrap.find(".input_range").each(function (item) {
                    item.value(selectedDate);
                });
                HotelOption.wrap.find(".input_range").each(function (item) {
                    item.value(selectedDate);
                });
                AjaxManage.needAjaxTimes = 2;
                AjaxManage.getAjaxReady = 0;
                self.refreshData();
            })
            //酒店份数改变
            this.copies.bind("change", function (e) {
                self.inputChangeFn(e);
                var _this = this;
                HotelOption.wrap.find(".s_num").each(function (item) {
                    item.value(_this.value)
                })
                Insurance.changeInsuranceOption();
                SS.trigger(Insurance.selectedInsurance, "change")
                //$(Insurance.selectedInsurance).trigger("change");
            })
        }
    }
    //酒店可选项确认部分
    var HotelOption = {
        firstReflesh: true,
        wrap: $("#hotelOption"),
        reset: function () {
            var self = this;
            if (this.firstReflesh) {
                this.firstReflesh = false;
            }
            this.dateInput = this.wrap.find(".input_range");
            this.copies = this.wrap.find(".s_num")
            PersonManage.options = [];
            this.wrap.find("table").each(function (item, i) {
                PersonManage.options.push(item);
                item.copies = self.wrap.find(".s_num");
                item.dateInput = self.wrap.find(".input_range");
                item.usePerson = item.attr("data-person") || 1;
            });
            PersonManage.options.each(function (item, i) {
                //var item = item.copies;
                //注册下拉列表
                //var allEles = [item.copies, $(getNext(item.copies[0]))]
                //shortList.reg(allEles, function (e) {
                //    var oldValue = item.copies.value();
                //    var newValue = e.target.getAttribute("t_id");
                //    if (oldValue != newValue) {
                //        item.copies.value(newValue);
                //        item.copies.trigger("change");
                //    }
                //});
                //注册日历
                item.dateInput.regMod("calendar", "3.0", {
                    options: {
                        showWeek: false
                    }
                });
                //绑定事件
                item.dateInput.bind("change", function () {
                    AjaxManage.needAjaxTimes = 1;
                    AjaxManage.getAjaxReady = 0;
                    AjaxManage.ajaxHotelOption();
                });
                item.copies.bind("change", function (e) {
                    var target = e.target
                    target.value = limitRange(target.value, { max: 99, min: 1 });
                    Insurance.changeInsuranceOption();
                    SS.trigger(Insurance.selectedInsurance, "change")
                    //$(Insurance.selectedInsurance).trigger("change");
                })
            });
        }
    }

    //保险确认部分
    var Insurance = {
        wrap: $("#insurance"),
        needInsurance: true,
        amount: 0,

        init: function () {
            this.selectedInsurance = $("#insurance").find(".s_num")[0];
            var inputs = this.wrap.find(".s_num");
            inputs.each(function (item) {
                var allEles = [item, $(getNext(item[0]))];
                longList.reg(allEles, function (e) {
                    var oldValue = item.value();
                    var newValue = e.target.getAttribute("t_id");
                    if (oldValue != newValue) {
                        item.value(newValue);
                        SS.trigger(item, "change")
                        //item.trigger("change");
                    }
                })
            })
            this.eventInit();
            this.getInsuranceNum();
        },
        eventInit: function () {
            var self = this;
            var allInputs = this.wrap.find(".s_num");
            allInputs.each(function (item, i) {
                item.bind("change", function (e) {
                    self.selectedInsurance = allInputs[i];
                    self.controlDetail();
                    allInputs.each(function (item1) {
                        if (item1[0] != self.selectedInsurance) {
                            item1.value(0);
                        }
                    })
                    if (self.needInsurance != (self.selectedInsurance.value != "0")) {
                        self.resetTraveler();
                        self.needInsurance = (self.selectedInsurance.value != "0");
                    }
                    PersonManage.createPerson();
                    PersonManage.createProposer();
                    self.wrap.find(".col_4").html("");
                    var curTd = getParent(this, "td");
                    if (self.needInsurance) {
                        getNext(curTd).innerHTML = "<b class='icon_selected'></b>";
                    }
                    AjaxManage.ajaxPrice();
                })
            })
        },
        controlDetail: function () {
            var self = this;
            var preTr = getParent(this.selectedInsurance, "tr");
            var curInsuranceId = $(getNext(preTr)).find(".hidden_content").attr("data-id");
            if (curInsuranceId) {
                var allInsurance = $("#insuranceNote").find("[data-id]");
                allInsurance.each(function (item, i) {
                    if (item.attr("data-id") == curInsuranceId && self.selectedInsurance.value != 0) {
                        item.removeClass("hidden");
                    }
                    else {
                        item.addClass("hidden");
                    }
                })
            }
        },
        getInsuranceNum: function () {
            this.amount = parseInt(this.selectedInsurance.value.trim());
        },
        resetTraveler: function () {
            var PP= Person.proposer.length
            if (PP != 0) {
                while (PP--) {
                    Person.proposer.pop().delPerson();
                }
            }
            var PL = Person.traveler.length
            if (PL != 0) {
                while (PL--) {
                    Person.traveler.pop().delPerson();
                }
            }
        },
        changeInsuranceOption: function () {
            var tempString = '<a href="###;" t_id="0"><span></span>0</a>';
            PersonManage.countPerson();
            var i = PersonManage.travelerAmount;
            if (i > 999) {
                i = 999;
            }
            for (var l = 0; l <= 9; l++) {
                tempString += '<a href="###;" t_id="' + (Number(i) + l) + '"><span></span>' + (Number(i) + l) + '</a>';
                if ((Number(i) + l) > 999) {
                    break;
                }
            }
            $("#longList").html(tempString);
            Insurance.selectedInsurance.value = i;
        }
    }
    //价格管理
    var PriceManage = {
        basePrise: 0,
        totlePriceEle: null,
        savePriceEle: null,
        insurancePriceEle: null,
        priceHidden: null,
        init: function () {
            this.totlePriceEle = $(".total_num em,.total_price,#divPriceChange .prices");
            this.insurancePriceEle = $("#insurance .sgap");
            this.savePriceEle = $(".tit_price");
            this.priceHidden = $("#hPrice");
        },
        displayAllPrice: function (str) {
            var allPrice = str.split("|");
            if (document.getElementById("invoiceInf").getElementsByTagName("input")[0].checked) {
                allPrice[0] = Number(this.basePrise) + 20;
            }
            this.savePriceEle.each(function (item, i) {
                item.html(item.html().replace(/\d+|undefined/, allPrice[1]));
            })
            this.insurancePriceEle.each(function (item, i) {
                item.html(item.html().replace(/\d+|undefined/, allPrice[2 + Number(i)]))
            })
            this.totlePriceEle.each(function (item, i) {
                item.html(item.html().replace(/\d+|undefined/g, allPrice[0]));
            })
            this.priceHidden.value(allPrice.slice(0, 2).join("|"));
        },
        displayChangePrice: function (price) {
            var priceArray = this.priceHidden.value().split("|");
            this.totlePriceEle.each(function (item, i) {
                item.html(item.html().replace(/\d+|undefined/, price));
            });
            priceArray[0] = price;
            this.priceHidden.value(priceArray.join("|"));
        }
    }

    //联系人信息
    var ContactInf = {
        index: 1,
        wrap: $("#ContactInf"),
        init: function () {
            this._initElements();
        },
        _initElements: function () {
            var textboxes = this.wrap.find('input[type="text"]'),
                members = ['txtContact', 'txtContactPhone', 'txtEmail'],
                self = this;
            // notice
            textboxes.each(function (txt, i) {
                self[members[i]] = txt;
                //Mod.regPlaceHolder(txt, SSHConfig.placeholder[i + 5]);
            });
        },
        validate: function () {
            // From MDN
            // Iterates over the enumerable properties of an object, in arbitrary order. 
            return BookValidator.validate('contact', [this.txtContact, this.txtContactPhone, this.txtEmail]);
        }
    }

    //发票信息
    var InvoiceInf = {
        index: 2,
        wrap: $("#invoiceInf"),

        init: function () {
            var textboxes = this.wrap.find('input[type="text"]');
            this.txtTitle = $(textboxes[0]);
            this.eventInit();
        },
        validate: function () {
            return BookValidator.validate('invoice', [this.txtTitle]);
        },
        eventInit: function () {
            var self = this;
            var radio = this.wrap.find(":radio");
            var label = this.wrap.find(".radio");
            radio.bind("click", function () {
                var priceString = $("#hPrice").value();
                var priceArray = priceString.split("|");
                //是否需要发票
                radio.each(function (item) {
                    if (item[0].checked) {
                        if (parseInt(item[0].value)) {
                            self.wrap.find(".bill_box li:gt(0)").removeClass("hidden");
                            DeliveryInf.wrap.removeClass("hidden");
                            if (BookManager.checkModules.indexOf(self) == -1) {
                                BookManager.checkModules.push(self);
                            }
                            if (DeliveryInf.showStatu) {
                                if (BookManager.checkModules.indexOf(DeliveryInf) == -1) {
                                    BookManager.checkModules.push(DeliveryInf);
                                }
                            }
                            priceArray[0] = Number(PriceManage.basePrise) + 20;
                        }
                        else {
                            self.wrap.find(".bill_box li:gt(0)").addClass("hidden");
                            DeliveryInf.wrap.addClass("hidden");
                            self.removeModule();
                            DeliveryInf.removeModule();
                            priceArray[0] = PriceManage.basePrise;
                        }
                    }
                })
                $("#hPrice").value(priceArray.join("|"));
                $(".total_num em,.total_price,#divPriceChange .prices").each(function (item, i) {
                    item.html(item.html().replace(/\d+|undefined/g, priceArray[0]));
                })
                Scroll.confirmFixer.updateUpper();
            });
        },
        removeModule: function () {
            var index = BookManager.checkModules.indexOf(this);
            if (index != -1) {
                BookManager.checkModules.splice(index, 1);
            }
        }
    }
    //配送信息
    var DeliveryInf = {
        index: 3,
        showStatu: false,
        wrap: $("#deliveryInf"),

        init: function () {
            //所有联系人wrap
            this.maskDiv = $(".mask_popup");
            //部分联系人wrap
            this.addressList = this.wrap.find(".address_list");
            //所有联系人
            this.allAddress = this.maskDiv.find(":radio");
            //选中的联系人
            this.selectedAddress = $(this.addressList.find("li")[0]).find("input").attr("address-data");
            //登录用户的默认配送地址
            this.header = this.wrap.find("ul.input_box");
            //用户可修改的地址部分
            this.modify = this.wrap.find("div.input_box");
            this.otherBtn = this.wrap.find(".btn a");
            //if (this.allAddress.length <= 3) {
            //    this.otherBtn.filter(":not(.btn_submit)").addClass("hidden");
            //}
            this.detailInput = this.modify.find(".hide_options");
            if (!SSHConfig.needInitDelivery) {
                this.showStatu = true;
                this.wrap.find(">ul,.tit,.address_list,.btn").addClass("hidden");
                this.modify.removeClass("hidden");
                this.detailInput.removeClass("hidden");
            }
            this._initEMS();
            this.eventInit();
        },
        validate: function () {
            return BookValidator.validate('ems',
                [this.txtReciever,
                this.txtProvince,
                this.txtCity,
                this.txtArea,
                this.txtAddress,
                this.txtZipcode,
                this.txtCellphone]);
        },
        _initEMS: function () {
            var self = this;
            var textboxes = this.wrap.find('.hide_options :input');
            var members = ['txtReciever', 'txtProvince', 'txtCity', 'txtArea', 'txtAddress', 'txtZipcode', 'txtCellphone'];
            textboxes.each(function (item, i) {
                self[members[i]] = item;
            });
        },
        eventInit: function () {
            var self = this;
            this.otherBtn.bind("click", function (e) { self.chooseOtherAdderss(e) })
            this.addressList.bind("click", function (e) { self.clickAdressList(e) })
            this.maskDiv.bind("click", function (e) { self.clickAllAdress(e) })
        },
        chooseOtherAdderss: function (e) {
            var self = this;
            if (!$(e.target).hasClass("btn_submit")) {
                //使用其他地址
                this.detailInput.addClass("hidden");
                this.maskDiv.removeClass("hidden");
                this.maskDiv.mask();
                this.addressList.find(":radio").each(function (item) {
                    item[0].checked = false;
                })
                this.maskDiv.find("label").each(function (item, i) {
                    if (item.find("input").attr("address-data") == self.selectedAddress) {
                        item.trigger("click");
                        item.find(":radio")[0].checked = true;
                    }
                })
                this.showStatu = false;
                this.removeModule();
            }
            else {
                //使用新地址
                this.detailInput.removeClass("hidden");
                this.addressList.find(":radio").each(function (item, i) {
                    item[0].checked = false;
                })

                this.showStatu = true;
                BookManager.checkModules.push(self);
            }
            Scroll.confirmFixer.updateUpper();
        },
        clickAllAdress: function (e) {
            var target = e.target;
            var self = this;
            if (target.nodeName == "A") {
                if ($(target).hasClass("btn_blue")) {
                    var selected = this.allAddress.filter(":checked");
                    this.selectedAddress = selected.attr("address-data");
                    var node = getParent(selected[0], "li").cloneNode(true);
                    var has = false;
                    this.addressList.find(":radio").each(function (item, i) {
                        if (item.attr("address-data") == self.selectedAddress) {
                            item[0].checked = "checked";
                            has = true;
                        }
                    })
                    if (!has) {
                        $(node).insertBefore($(this.addressList.find("li")[0]));
                        var lastAddress = this.addressList.find("li:last")[0];
                        lastAddress.parentNode.removeChild(lastAddress);
                        $(node).find(":radio")[0].checked = "checked";
                    }
                    this.fillData(this.allAddress.filter(":checked"));
                }
                else {
                    this.addressList.find(":radio").each(function (item, i) {
                        if (item.attr("address-data") == self.selectedAddress) {
                            item[0].checked = true;
                        }
                    })
                }
                this.allAddress.each(function (item) {
                    item[0].checked = false;
                })
                this.maskDiv.unmask();
                this.maskDiv.addClass("hidden");
                e.preventDefault();
            }
            if (target.nodeName == "LI" || getParent(target, "li")) {
                target = target.nodeName == "LI" ? target : getParent(target, "li");
                this.maskDiv.find("li").removeClass("check");
                $(target).addClass("check");
            }
        },
        clickAdressList: function (e) {
            var targetName = e.target.nodeName;
            if (targetName == "LABEL" || targetName == "LI" || targetName == "INPUT") {
                this.detailInput.addClass("hidden");
                this.selectedAddress = this.addressList.find(":checked").attr("address-data");
                this.fillData(this.addressList.find(":checked"));
                this.showStatu = false;
                this.removeModule();
            }
        },
        removeModule: function () {
            var index = BookManager.checkModules.indexOf(this);
            if (index != -1) {
                BookManager.checkModules.splice(index, 1);
            }
        },
        fillData: function (info) {
            var allInfo = info.attr("address-data");
            if (!allInfo) {
                return;
            }
            allInfo = allInfo.split("|");
            var city = allInfo.shift().split(",");
            var textInput = this.detailInput.find("input");
            var select = this.detailInput.find("select");
            textInput.each(function (item, i) {
                item.value(allInfo[i] || "");
            })
            select.each(function (item, i) {
                //item[0].options.length = 1;
                var hasValue = false;
                var options = item[0].options;
                var optionsLength = options.length;
                for (var k = 0; k < optionsLength; k++) {
                    if (options[k].value == city[i]) {
                        options[k].selected = true;
                        hasValue = true;
                        break;
                    }
                }
                if (!hasValue) {
                    options[optionsLength] = new Option(city[i], city[i]);
                    options[optionsLength].selected = true;
                }
            })
        }
    }


    //确定部分
    var Scroll = {};
    Scroll.confirmFixer = Mod.fixPosition.fixPosition($("#scroll"));


    var BookManager = {
        needInitContact: SSHConfig.needInitContact,
        needInitDelivery: SSHConfig.needInitDelivery,
        checkModules: [], // 需要验证的模块
        init: function () {
            var self = this;
            $(document).regMod('jmp', '1.0');
            //等待数据this._initOrderNote();
            Hotel.init();
            Insurance.init();
            PersonManage.init();
            PriceManage.init();
            this._bindModifyEvents();
            this._bindConfirmEvent();
            //this._eventInit();
            Confirm.init();

            ContactList.init();
            ContactScroll.init();

            ContactBox.init();

            Ticket.init();

            ContactInf.init();
            DeliveryInf.init();
            InvoiceInf.init();
            setTimeout(function () {
                AjaxManage.ajaxAllInfo();
            }, 600)
            setTimeout(function () {
                self._initOrderCheck();
            }, 800)
        },


        // 预订信息的修改与对应模块初始化
        _bindModifyEvents: function () {
            var self = this;
            var modules = [ContactInf, InvoiceInf, DeliveryInf];
            $("#divOrderInfo").find(".revise").each(function (item, i) {
                item.bind("click", function (e) {
                    var parent = getParent(item[0], "ul");
                    var next = getNext(parent);
                    $(parent).addClass("hidden");
                    $(next).removeClass("hidden");
                    var radio = $(next).find("[type=radio]");
                    self.checkModules.push(modules[i]);
                    if (radio.length) {
                        radio[0].checked = true;
                        $(radio[0]).trigger("click");
                    }
                    //当点击发票时同时显示出配送方式
                    if (i == 1) {
                        $("#deliveryInf").removeClass("hidden");
                        if (!BookManager.needInitDelivery) {
                            if (BookManager.checkModules.indexOf(DeliveryInf) == -1) {
                                BookManager.checkModules.push(DeliveryInf);
                            }
                        }
                        else {
                            var firstBtn = $("#deliveryInf .address_list").find("input")[0]
                            firstBtn.checked = true;
                            DeliveryInf.fillData($(firstBtn))
                        }
                        CascadeSelector.reg([$('#emsProvince'), $('#emsCity'), $('#emsCanton')]);
                    }

                    Scroll.confirmFixer.updateUpper();
                })
                if (i == 0 && BookManager.needInitContact) {
                    item.trigger("click");
                }
            })

        },

        _bindConfirmEvent: function () {
            var self = this;
            var btnBook = $('#btnBook');

            function submit(e) {
                if ($('#chkNote')[0]&&!$('#chkNote')[0].checked) {
                    return Mod.showTips($('#chkNote'), MSG.rule[10]);
                }

                var isPass = Person.validate();
                e.preventDefault();
                //将要检查的模块按从上到下进行排序
                self.checkModules.sort(function (a, b) {
                    return a.index - b.index;
                })
                self.checkModules.each(function (mod, i) {
                    if (!isPass) return false;
                    isPass = mod.validate();
                });
                if (!isPass) return false;

                self.ajaxBooking();
            }

            btnBook.bind('click', submit);
        },

        // 可订检查
        _initOrderCheck: function () {
            var spanSecond = $('#divSaleOut').find('span.second');
            var timer;

            function render(res) {
                var title = res.split("|");
                title = title.join(",");
                //if (!title) title = type;
                var divSaleOut = $('#divSaleOut');
                SS.show(divSaleOut);
                divSaleOut.mask();
                divSaleOut.find('h4').html(title);

                divSaleOut.bind('click', function (e) {
                    if (e.target.nodeName != 'A') return;
                    clearTimeout(timer);
                    loading();
                    BookManager.goBack(1);
                });
            }

            function goBack() {
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
                    BookManager.goBack(1);
                }, 5000);
            }

            function loading() {
                setTimeout(function () {
                    spanSecond[0].innerHTML = '<img style="vertical-align: middle;" src="http://pic.c-ctrip.com/vacation_v1/loading_transparent.gif">';
                }, 10);
            }

            var url = SSHConfig.URL.ORDER_CHECK;
            $.ajax(url, {
                method: cQuery.AJAX_METHOD_POST,
                context: {
                    PeggingParams: $('#hPeggingParams').value()
                },
                onsuccess: function (xhr, res) {
                    if (!res || res.indexOf('<') != -1) return;
                    if (BookManager._booking) return;
                    if (!$('#divSaleOut').hasClass("hidden")) {
                        return;
                    }
                    render(res);
                    goBack();
                }
            });
        },
        cantBook: function () {

            var spanSecond = $('#divSaleOut').find('span.second');
            var timer;
            if (!$('#divSaleOut').hasClass("hidden")) {
                return false;
            }
            render();
            goBack();
            function render() {
                var divSaleOut = $('#divSaleOut');
                SS.show(divSaleOut);
                divSaleOut.mask();
                divSaleOut.find('h4').html(SSHConfig.cantBook);

                divSaleOut.bind('click', function (e) {
                    if (e.target.nodeName != 'A') return;
                    clearTimeout(timer);
                    loading();
                    BookManager.goBack(1);
                });
            }

            function goBack() {
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
                    BookManager.goBack(1);
                }, 5000);
            }

            function loading() {
                setTimeout(function () {
                    spanSecond[0].innerHTML = '<img style="vertical-align: middle;" src="http://pic.c-ctrip.com/vacation_v1/loading_transparent.gif">';
                }, 10);
            }
        },

        _eventInit: function () {
            var self = this;
            $("#scroll .prev_stop").bind("click", function (e) { self.goBack() })
        },

        //goBack: function (e) {
        //    var target = e.target;
        //    if ($(target).hasClass("prev_stop") || (target.nodeName == "B" && $(target.parentNode).hasClass("prev_stop"))) {
        //        e.preventDefault();
        //        doPost(target);
        //    }
        //},

        goBack: function (type) {
            SS.postForm((type && type == '1') ? SSHConfig.URL.ORDER_LAST : SSHConfig.URL.PACKAGE_LIST);
            //SS.postForm(SSHConfig.URL.PACKAGE_LIST);
        },

        ajaxBooking: function () {
            if (this._booking) return;
            this._booking = true;

            var timeout;
            var btnBook = $('#btnBook');
            btnBook.html(SSHConfig.submitText.loading);

            function gotoNext(data) {
                //btnBook.html(SSHConfig.submitText.start);
                $('#hOrderId').value(data.orderId);
                //$('#hPrice').value(data.price);
                fm.action = SSHConfig.URL.ORDER_PAYMENT;
                fm.submit();
            }

            function gotoError(error) {
                btnBook.html(SSHConfig.submitText.start);
                var hErrorInfo = SS.create('<input type="hidden" name="SSHError" value="' + error.errorInfo + '"/>');
                var hErrorInfoShow = SS.create('<input type="hidden" name="ErrorInfoShow" value="' + error.errorInfoShow + '"/>');
                var divHidden = $('#divHidden')[0];
                divHidden.appendChild(hErrorInfo);
                divHidden.appendChild(hErrorInfoShow);
                fm.action = SSHConfig.URL.ORDER_RESULT;
                fm.submit();
            }

            function showChangeDialog(data) {
                var divPriceChange = $('#divPriceChange');
                divPriceChange.removeClass('hidden').mask();
                PriceManage.displayChangePrice(data.currentPrice);
                divPriceChange.bind('click', function (e) {
                    if (e.target.nodeName != 'A') return;
                    divPriceChange.unmask();
                    if (e.target.className == 'base_btn_change') {
                        gotoNext(data);
                    }
                });
            }

            $.ajax(SSHConfig.URL.ORDER_BOOKING, {
                context: SS.formSerialize(fm),
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

                    switch (data.result) {
                        case 1: gotoNext(data);
                            break;
                        case 2: showChangeDialog(data);
                            break;
                        case 3: gotoError(data);
                    }
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
        },
        //加载预订须知
        _initOrderNote: function () {
            var url = SSHConfig.URL.X_NOTE + "?ProductIds=" + $("#hProductIds").value();
            $.ajax(url, {
                method: cQuery.AJAX_METHOD_GET,
                onsuccess: function (xhr, res) {
                    var div = $('#divNote')[0];
                    div.innerHTML = div.innerHTML + res;
                }
            });
        }
    }




    function getParent(ele, parentString) {
        var parent = ele.parentNode;
        while (parent && parent.nodeName != "BODY" && parent.nodeName != parentString.toUpperCase() && !$(parent).hasClass(parentString)) {
            parent = parent.parentNode;
        }
        return parent;
    }

    function getNext(ele) {
        var next = ele.nextSibling;
        while (next && next.nodeType != 1) {
            next = next.nextSibling;
        }
        return next;
    }

    function limitRange(value, obj) {
        value = parseInt(value);
        if (!value) {
            value = 0;
        }
        var max = parseFloat(obj.max) || Number.MAX_VALUE;
        var min = parseFloat(obj.min) == 0 ? 0 : parseFloat(obj.min) || Number.MIN_VALUE;
        if (min > max) {
            var temp = min;
            min = max;
            max = temp;
        }
        if (value >= max) {
            value = max;
        }
        if (value <= min) {
            value = min;
        }
        return value;
    }

    // 省市区级联选择器
    var CascadeSelector = {
        inited: false,
        _data: null,
        selected: [],

        levels: ["P", "C", "Z"],
        init: function (elems) {
            var self = this;

            $.ajax(SSHConfig.URL.LOCATION_DATA, {
                method: cQuery.AJAX_METHOD_GET,
                cache: true,
                onsuccess: function (xhr, dataStr) {
                    self._data = dataStr;
                    self._initAllEle(0, elems, true);
                },
                onerror: function () {
                    self._data = undefined;
                }
            });
        },
        reg: function (elems) {
            if (!this.inited) {
                this.init(elems);
                this.inited = true;
            }
            this._bindEvent(elems);
        },
        _bindEvent: function (elems) {
            var self = this;
            elems.each(function (item, i) {
                item.bind("change", self._initAllEle.bind(self, i, elems, false));
            });
        },
        _initAllEle: function (curLevel, elems, startCurLevel) {
            var length = elems.length;
            var k = startCurLevel ? curLevel : curLevel + 1;
            for (; k < length; k++) {
                parentId = this.getParentId(k, elems);
                if (parentId == null) {
                    elems[k - 1][0].selectedIndex = 0;
                    elems[k - 1].trigger("change");
                    return;
                }
                var list = this._createList(k, parentId);
                var optionIndex = i = 0, l = list.length;
                if (startCurLevel && elems[k][0].options.length) {
                    for (; i < l; optionIndex++, i++) {
                        if (list[i].value == elems[k][0].options[0].value) {
                            optionIndex--;
                            continue;
                        }
                        elems[k][0].options[optionIndex + 1] = list[i];
                    }
                }
                else {
                    elems[k][0].options.length = 0;
                    for (; i < l; i++) {
                        elems[k][0].options[i] = list[i];
                    }
                }
                elems[k].selectedIndex = 0;
            }
        },
        getParentId: function (curLevel, elems) {
            var parentId = "";
            if (curLevel > 0) {
                parentId = elems[curLevel - 1].attr("placeID");
                if (!parentId) {
                    var reg = new RegExp("@" + this.levels[curLevel - 1] + "(\\d+)\\|\\d*\\|" + elems[curLevel - 1][0].value);
                    var result = this._data.match(reg)
                    parentId = result && result[1];
                }
            }
            return parentId;
        },
        _createList: function (level, parentId) {
            var reg = new RegExp("@" + this.levels[level] + "(\\d+)\\|" + parentId + "\\|([^\\|@]+)", "g");
            var data = this._data;
            var list = []
            data.replace(reg, function (_, placeId, placeName) {
                list.push(new Option(placeName, placeName));
                list[list.length - 1].setAttribute("placeId", placeId);
            });
            return list;
        }
    }

    BookManager.init();

})