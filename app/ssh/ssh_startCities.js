/*
* author:shiz@ctrip.com
* date:2013-12-16
*/
define(function(require, exports, module) {

	var S = require('common').S;

	var $startCity = $('#CitySelect');
	var isStartCityReady = false;
	var $startBox = undefined;

    var $hotDest = $('#DHotDest');
    var isHotDestReady = false;
    // 拉取出发站数据
	function fetch () {
	    $.ajax( SSHConfig.startCities.url, {
	        method: cQuery.AJAX_METHOD_GET,
	        onsuccess: function (xhr, res) {
	            if (!res) return;
	            var data = cQuery.parseJSON(res);
	            render(data);
                if($hotDest.length)
                    bindCitySwitch();
	        }
	    });
	}
    // 渲染出发站列表
    function render (data) {
    	var hotCities = extractHotCities(data);
    	var htmHot = renderLinks(hotCities);

    	var data = groupByAlphabet(data);
    	var htmList = renderList(data);

    	var html = S.format(SSHConfig.startCities.tmpls.box, htmHot, htmList);
    	var box = S.create(html);
    	$startCity[0].appendChild(box);

    	$startBox = $(box);
    }
    // 提取热门城市
    function extractHotCities (data) {
    	var ret = data.filter(function (item) {
    		return item.IsHot;
    	});
    	return ret;
    }
    // 生成城市连接
    function renderLinks (data) {
    	var tmpl = SSHConfig.startCities.tmpls.city;
    	var ret = '';
    	data.each(function (item) {
    		ret += $.tmpl.render(tmpl, item);
    	});
    	return ret;
    }
    // 按字母分组出发站数据
    function groupByAlphabet (data) {
    	var ret = {};
    	// group
    	data.each(function (item) {
    		var firstLetter = item.FromCityEName.substring(0,1).toUpperCase();
    		if(!(firstLetter in ret)){
    			ret[firstLetter] = [];
    		}
    		ret[firstLetter].push(item);
    	});
    	// sort
    	for(var l in ret){
    		if(!ret.hasOwnProperty(l)) continue;
    		ret[l].sort(function (a, b) {
    			a.Sort > b.Sort ? 1 : -1;
    		});
    	}

    	return ret;
    }
    // 生成字母分组城市列表
    function renderList (data) {
    	var ret = '';

    	for(var l in data){
    		if(!data.hasOwnProperty(l)) continue;
    		ret += '<li><span>' + l + '</span>' + renderLinks(data[l]) + '</li>';
    	}

    	return ret;
    }
    // 切换出发站城市列表显示
    function toggleCity () {
        $startCity.hasClass('city_spread') ? $startCity.removeClass('city_spread') : $startCity.addClass('city_spread');
    	if(!isStartCityReady){
    		fetch();
            isStartCityReady = true;
    	}
    }
    // 更换热门目的地
    function changeDest (cityId) {
        var url = SSHConfig.hotDests.url + "&FromCity=" + cityId;
        $.ajax(url, {
            method: cQuery.AJAX_METHOD_GET,
            onsuccess: function (xhr, res) {
                if (!res) return;
                var data = cQuery.parseJSON(res);
                renderHotDest(data);
            }
        })
    }
    // 渲染热门目的
    function renderHotDest (data) {
        var $destList = $hotDest.find('dd');
        var list = S.create($.tmpl.render(SSHConfig.hotDests.tmpl, data));
        if($destList.length){
            $hotDest[0].replaceChild($destList[0], list);
        }else{
            $hotDest[0].appendChild(list);
        }
    }
    // 绑定选定出发站后更换热门城市列表
    function bindCitySwitch () {
        $startCity.find('dd').bind('click', function (e) {
            var target = e.target;
            if(target.nodeName != 'A') return;
            var id = target.getAttribute('data-id');
            changeDest(id);
            e.preventDefault();
        });
    }
    // 切换热门目的地显示
    function toggleDest () {
        $hotDest.hasClass('dest_spread') ? $hotDest.removeClass('dest_spread') : $hotDest.addClass('dest_spread');
        if(!isHotDestReady){
            changeDest($$.StartCity);
            isHotDestReady = true;
        }
    }
    // init
    $startCity.bind('click', toggleCity);
    $hotDest.bind('click', toggleDest);
});
