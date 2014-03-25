// 这个脚本在机票机推酒页面引入

(function(){
	document.domain = location.host.replace('flights.', '');

	var host = location.protocol + "//" + location.host.replace('flights', 'vacations');

	var html = '\
	<iframe id="ifrAirHotel" width="100%" scrolling="no" height="680" frameborder="0" src="'+ host +'/DIY/AirRecommendHotel/DataPost.aspx"></iframe>\
	<div id="divQuickView" style="width: 815px; position: absolute;z-index:1000; display:none; left: 425.5px; top: 300px;">\
	    <iframe id="divQuickViewIframe" allowtransparency="true" src="'+ host +'/DIY/AirRecommendHotel/ARHQuickView.aspx" frameborder="0" width="815px" height="720px" scrolling="no"></iframe>\
	</div>\
	<div style="width: 720px; position: absolute;z-index:1000; display:none ; left: 425.5px; top: 300px;" id="divXProduct"></div>';

	$("#divRecommendHotel").html(html);
})();