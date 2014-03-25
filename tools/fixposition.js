// fix element position
define(function (require, exports, module){
	exports.fixPosition = function (div, opts) {
        if(typeof div.addClass !== 'function')
            div = $(div);
    
        opts = opts || {};

        var scrollHandle, upperBound = div.offset().top;

        if (cQuery.browser.isIE6) {
            scrollHandle = function (e) {
                // 节流的视觉效果不好
                var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

                if (scrollTop > upperBound) {
                    div[0].style.position = 'absolute';
                    div[0].style.bottom = 'auto';
                    div[0].style.top = (scrollTop - upperBound) + 'px';
                    
                    if(typeof opts.onFixed === 'function')
                        opts.onFixed();
                } else if (scrollTop == 0) {
                    div[0].style.position = "static";
                    
                    if(typeof opts.onStatic === 'function')
                        opts.onStatic();
                }
            }
        } else {
            var isFixed = false;
            scrollHandle = function (e) {
                // 滚条位置
                var scrollTop = +(document.documentElement.scrollTop || document.body.scrollTop);

                if (scrollTop > upperBound) {
                    if (isFixed) return;
                    opts.fixedClass ?
                        div.addClass(opts.fixedClass) :
                        div[0].style.position = 'fixed';
                    div[0].style.top = opts.topSpace || '0'; // 上端间隙
                    isFixed = true;
                    
                    if(typeof opts.onFixed === 'function')
                        opts.onFixed();
                } else {
                    opts.fixedClass ?
                        div.removeClass(opts.fixedClass) :
                        div[0].style.position = '';
                    div[0].style.top = '';
                    isFixed = false;
                    
                    if(typeof opts.onStatic === 'function')
                        opts.onStatic();
                }
            }
        }

        $(window).bind('scroll', scrollHandle);
       
        return {
            updateUpper: function (){
                if(cQuery.browser.isIE6){
                    div[0].style.position = "static";
                    upperBound = div.offset().top;
                }else{
                    opts.fixedClass ?
                        div.removeClass(opts.fixedClass) :
                        div[0].style.position = '';
                    upperBound = div.offset().top;
                }
				isFixed = false;
                scrollHandle();
            }
        }
    }
});
