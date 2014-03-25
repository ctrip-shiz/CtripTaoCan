// html5 place holder shim
define(function (require, exports, module) {

    function hacklib() {
        var oriValue = $.fn.value;

        $.fn.value = function (val) {
            var _this = this;

            var obj = this[0];
            if (!obj) return '';
            var ph = obj.getAttribute("placeholder");
            if (!ph) return oriValue.call(_this, val);

            if (typeof val === 'undefined') {
                // get
                return (obj.value == ph ? "" : obj.value);
            } else {
                // set
                if (val.trim() == '' || val.trim() == ph) {
                    obj.value = ph;
                    obj.style.color = 'gray';
                } else {
                    obj.value = val;
                    obj.style.color = '';
                }
            }
        }
    }

    var PlaceHolder = function (txt, msg) {
        if (txt[0].value.trim() == '')
            txt[0].value = msg; // init default display
        // cause font color of the txt always being set in class, 
        // so I did not save it for recovering
        this.txt = txt;
        this.msg = msg;

        txt[0].setAttribute('placeholder', msg);
        if (txt[0].value == msg)
            txt.css({ color: 'gray' });

        txt.bind('focus', this.hide.bind(this))
            .bind('blur', this.show.bind(this));
    }
    PlaceHolder.prototype = {
        show: function () {
            var txt = this.txt;
            if (this.msg == txt[0].value || txt[0].value.trim() == '') {
                txt[0].value = this.msg;
                txt[0].style.color = 'gray';
            }
        },
        hide: function () {
            var txt = this.txt;
            if (this.msg == txt[0].value) {
                txt[0].value = '';
                txt[0].style.color = '';
            }
        }
    }

    var inited = false;
    exports.init = function () {

        if (inited) return;

        if (!('placeholder' in document.createElement('input'))) {

            $('input[type="text"]').each(function (txt) {
                var msg = txt.attr('placeholder');
                if (!msg) return;
                new PlaceHolder(txt, msg);
            });

            hacklib();
        }

        inited = true;
    }
});
