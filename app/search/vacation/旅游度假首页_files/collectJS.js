(function (win, doc, undef) {
    var timer, times = 1, max = 100,
	PAGE_ID = 'page_id', TRACK_LOG_KEY = 'collectjs', TRACK_JS_FILE = 'collectjs.domain', //tracklog的KEY值
	hasOwn = Object.prototype.hasOwnProperty,
	keys = Object.keys || function (obj) {
	    var ret = [], i;

	    for (i in obj) {
	        if (hasOwn.call(obj, i)) {
	            ret.push(i);
	        }
	    }

	    return ret;
	};

    function getPageID() {
        var pageId = doc.getElementById(PAGE_ID);
        //pageId不存在则返回0
        return Number(pageId && pageId.value);
    }

    function getURL() {
        // 解决IE6获取location受限
        var url = '';

        try {
            url = win.location.href;
        } catch (e) {
            url = doc.URL;
        }

        return win.encodeURI(url);
    }

    function collectMods() {
        var i, mods, modsName = '', version = '';

        if (!win.cQuery) {
            return '';
        }

        for (i in mods = cQuery.mod._mods) {
            if (hasOwn.call(mods, i)) {
                modsName += (i + '-');

                version = keys(mods[i])[0];

                modsName += (version + ',');
            }
        }

        return modsName.slice(0, -1);
    }

    //收集外部引用的JS文件
    function collectUrl() {
        var urls = [],
		scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var src = scripts[i].getAttribute('src');
            if (isOtherDomain(src)) {
                urls[urls.length] = src;
            }
        }
        //判断是否是其它域名下
        function isOtherDomain(url) {
            var ourDomain = [
				/https?:\/\/192\.168\.\d{1,3}\.\d{1,3}/, 
				/https?:\/\/127\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
				/https?:\/\/172\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
				/https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}/,
				/https?:\/\/(\w|\.)+\.c-ctrip\.com/,
				/https?:\/\/(\w|\.)+\.ctrip\.com/,
				/https?:\/\/(\w|\.)+\.ctriptravel\.com/,
				/https?:\/\/localhost\//,
				/^[^h]/
			];
            if (url === null || url === '') {
                return false;
            }
            for (var i = 0; i < ourDomain.length; i++) {
                if (ourDomain[i].test(url)) {
                    return false;
                }
            }
            return true;
        }
        //去除?和#后面字符串
        for (var i = 0; i < urls.length; i++) {
            urls[i] = urls[i].split('?')[0].split('#')[0];
        }
        return urls;
    }

    function collectLibs() {
        var i, libs = {}, libsName = '';

        if (win.cQuery) {
            libs.cQuery = true;
        }
        if (win.$LAB) {
            libs.LAB = true;
        }
        if (win.jQuery) {
            libs.jQuery = win.jQuery && jQuery.fn.jquery;
        }
        if (win.$$) {
            libs.tuna = !!($$.access && $$.access.expando);
        }

        for (i in libs) {
            if (hasOwn.call(libs, i)) {
                if (libs[i]) {
                    libsName += i;
                    if (typeof libs[i] === 'string') {
                        libsName += libs[i];
                    }
                    libsName += ','
                }
            }
        }

        return libsName = libsName.slice(0, -1);
    }

    function getData() {
        var libs = collectLibs(), mods = collectMods(), url = getURL();

        return (libs + ';' + mods + ';' + url);
    }

    function arrIndexOf(source, match) {
        var len = source.length,
        iterator = match;
        fromIndex = 0;
        for (; fromIndex < len; fromIndex++) {
            if (fromIndex in source && source[fromIndex] === match) {
                return fromIndex;
            }
        }
        return -1;
    };



    function sendStart() {
        var value = getData(), pageId = getPageID(), jsSrc = collectUrl(), url = getURL(),
			url = url.split('?')[0].split('#')[0];

        if (jsSrc.length > 0) {
            for (var i = 0, len = jsSrc.length; i < len; i++) {
                win.$_bf.tracklog(TRACK_JS_FILE, url + ';' + jsSrc[i], null, pageId);
            }
        }
        setTimeout(function () {
            var js = collectUrl();
            for (var i = 0, len = js.length; i < len; i++) {
                if (arrIndexOf(jsSrc, js[i]) < 0) {
                    win.$_bf.tracklog(TRACK_JS_FILE, url + ';' + js[i], null, pageId);
                }
            }
        }, 1000);

        // 数据value的格式示例： cQuery,jQuery1.7.1;validate-1.1,tab-1.2,address-1.0;http://www.abc.com
        // 使用';'分隔JS库和JS模块，库和模块本身则使用'&'符号连接
        // 调试数据
        // console.log([TRACK_LOG_KEY, value, pageId].join('|'));
        // 数据为空则不发送
        if (value.split(';')[0] === '') {
            return;
        }


        win.$_bf.tracklog(TRACK_LOG_KEY, value, null, pageId);
    }

    function ubtStart() {
        return !!(win.$_bf && $_bf.loaded === true);
    }

    function init() {
        timer = win.setTimeout(function () {
            if (ubtStart()) {
                win.clearTimeout(timer);
                sendStart();
            } else {
                if (++times > max) {
                    // 避免在未部署UBT的页面中无休止检测
                    return;
                }
                init();
            }
        }, times * times);
        removeEvent(win, 'load', init);
    }

    // init();
    addEvent(win, 'load', init);

    //John Resig 所写的 addEvent() 函数：http://ejohn.org/projects/flexible-javascript-events/
    function addEvent(obj, type, fn) {
        if (obj.attachEvent) {
            obj['e' + type + fn] = fn;
            obj[type + fn] = function () { obj['e' + type + fn](win.event); }
            obj.attachEvent('on' + type, obj[type + fn]);
        } else
            obj.addEventListener(type, fn, false);
    }
    function removeEvent(obj, type, fn) {
        if (obj.detachEvent) {
            obj.detachEvent('on' + type, obj[type + fn]);
            obj[type + fn] = null;
        } else
            obj.removeEventListener(type, fn, false);
    }

})(window, document);