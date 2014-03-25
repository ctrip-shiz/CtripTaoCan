/*
* author:shiz@ctrip.com
* date:2013-12-16
*/
define(function(require, exports, module) {

    var S = require('common').S;
    var Mod = require('common').Mod;

    require('webresource/publicNavTempNew');

    require('webresource/ssh_startCities');


    var Banner = {

        $container: $('#divBanner'),

        init: function () {
            this._initElements();
            this._bindEvents();
            this.start();
        },

        _initElements: function () {
            this.$banners = 
                this.$container.find('[data-banner="content"] a');
            this.$controls = 
                this.$container.find('[data-banner="control"] a');

            this._current = 0;
            this._count = this.$banners.length;
        },

        _bindEvents: function () {
            var self = this;
            this.$controls.each(function (item, i) {
                item.bind('click', self.show.bind(self, i));
            });
        },

        forward: function () {
            var index =
                (this._current == this._count - 1) ? 0 : (this._current + 1);
            this.show(index);
        },

        show: function (index) {
            S.hide(this.$banners[this._current]);
            S.show(this.$banners[index]);
            this.$controls[this._current].className = "";
            this.$controls[index].className = "cur";
            this._current = index;  
        },

        start: function () {
            setInterval(this.forward.bind(this), 5000);
        }
    }

    // marquee
    ;(function (exports) {
        require.async('tools/animate');

        var Marquee = function ($container) {
            this.$content = $container.find('[data-marquee="content"]');
            this.$prev = $container.find('[data-marquee="prev"]');
            this.$next = $container.find('[data-marquee="next"]');

            // Initializing the stepSize and stepCount in the contructor may cause a responsive problem, 
            // but I think few people will adjust the window during their browsering.
            var els = this.$content.find('>*');
            this.stepSize = S.width(this.$content.parentNode());
            this.stepCount = Math.ceil(els[0].offsetWidth * els.length / this.stepSize);
            this.stepIndex = 0;

            this._bindEvents();
            this.start();
        }

        Marquee.prototype = {
            constructor: Marquee,

            _bindEvents: function () {
                this.$prev.bind('click', this.backward.bind(this));
                this.$next.bind('click', this.forward.bind(this));
            },

            start: function () {
                setInterval(this.forward.bind(this), 10000);
            },

            forward: function () {
                this.stepIndex ++;
                if(this.stepIndex == this.stepCount) this.stepIndex = 0;
                this._move();
            },

            backward: function () {
                if(this.stepIndex == 0) return;
                this.stepIndex --;
                this._move();
            },

            _move: function () {
                this.$content.animate({left: -1 * this.stepSize * this.stepIndex + "px" });
            }
        }

        exports.Marquee = Marquee;

    })(Mod);

    var SSH = {
        init: function () {
            Banner.init();

            this._initNav();
            this._initHotSale();
            this._initCitySelect();
        },

        _initNav: function () {
            var current, curClass = 'nav_cur';

            var enter = function (item) {
                item.addClass(curClass);
                if(current){
                    current.removeClass(curClass);
                    current = item;    
                }
            }

            var leave = function (item) {
                item.removeClass(curClass);
                if(current){
                    current.removeClass(curClass);
                    current = undefined;    
                }
            }

            $('#divNav dl').each(function (item, i) {
                if(i == 2) return; //最后一个不出浮层
                item.bind('mouseenter', enter.bind(this, item))
                    .bind('mouseleave', leave.bind(this, item));
            });
        },

        _initHotSale: function () {
            if(!$('#divHotSale').length) return;
            new Mod.Marquee($('#divHotSale'));
        },

        _initCitySelect: function () {
            var $citySelect = $('#CitySelect>dt');
            if(!$citySelect.length) return;

            var $content, inited = false;
            $('#CitySelect').bind('click', function () {
                if($content) S.show($content);

                if(inited) return;
                setTimeout(init, 200);
            });

            function init () {
                $content = $('#CitySelect>dd');

                $content.bind('click', function (e) {
                    if(e.target.nodeName != 'A') return;

                    $citySelect.html('<i></i>' + e.target.innerHTML + '<span>站</span><b></b>');
                    $citySelect.parentNode().removeClass('city_spread');
                    S.hide($content);

                    e.preventDefault();
                });

                inited = true;
            }
        }
    }

    SSH.init();
});
