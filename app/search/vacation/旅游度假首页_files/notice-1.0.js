;window.replace=function(){return ''};(function(c){function e(a,b){this._init(a,b)}var d={name:"notice",version:"1.0",init:function(){},uninit:function(){},module:e};(function(){var a=cQuery.fn.value;cQuery.fn.value=function(b){if(b==cQuery.undefined){var c=this[0];if(!c)return"";if(c.getAttribute("_cqnotice")===cQuery.undefined)return a.call(this,b);b=c.value;return (b==c.getAttribute("_cqnotice")||""==b?"":b)}return a.call(this,b)}})();c.extend(e.prototype,{target:null,target_get:function(){return this.target},name:null,name_get:function(){return this.name},
name_set:function(a){this.name=a;this._checkEnable()},tips:null,tips_get:function(){return this.tips},tips_set:function(a){this.tips=a},defaultClass:null,defaultClass_get:function(){return this.defaultClass},defaultClass_set:function(a){this.defaultClass=a},selClass:null,selClass_get:function(){return this.selClass},selClass_set:function(a){this.selClass=a},_init:function(a,b){(!b.name||"string"!=c.type(name)?cQuery.error("mod ("+d.name+","+d.version+") init","invalid name "+name):(this.target=c(a),
this.name=b.name,this.selClassText=b.selClassText||" ",this.selClass=b.selClass||" ",this.tips=b.tips,this.target[0].setAttribute("_cqnotice",b.tips),c.bindMethod(this),this._showTips(),this.bindEvent()))},_checkValue:function(){return""==this.target.value().trim()||this.target.value()==this.tips},_showTips:function(){if(this._checkValue()){var a=this.tips;this.target.addClass(this.selClass);this.target[0].style.cssText+=this.selClassText;this.target.value(a)}},_hideTips:function(){if(this._checkValue()){var a=
this.selClassText;this.target.removeClass(this.selClass);this.target[0].style.cssText=this.target[0].style.cssText.replace(a,"","g");this.target[0].value=""}},isEmpty:function(){return this._checkValue()},resetValue:function(){this.target.value("");this._showTips()},checkValue:function(){var a=this.selClass;(this.isEmpty()?(this.target.value(this.tips),this.target.addClass(a)):this.target.removeClass(a))},setRealValue:function(){this.isEmpty()&&this.target.value("")},bindEvent:function(){this.target.bind("focus",
this._hideTips,{priority:10});this.target.bind("blur",this._showTips,{priority:100})}});c.mod.reg(d)})(cQuery);