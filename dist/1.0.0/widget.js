define("matcha/widget/1.0.0/widget",["jquery","utility/underscore/1.6.0/underscore","utility/backbone/1.1.2/backbone","utility/handlebars/1.3.0/handlebars"],function(a,b,c){function d(a){return m.isFunction(a)}function e(a){return null!=a&&a==a.window}function f(a){return m.contains(document.documentElement,a)}function g(a){return a.charAt(0).toUpperCase()+a.substring(1)}function h(a){return null==a||void 0===a}function i(a){if(!a||"[object Object]"!==u.call(a)||a.nodeType||e(a)||!a.hasOwnProperty)return!1;for(var b in a)if(a.hasOwnProperty(b))return!1;return!0}function j(a){if(!a)return{};var b,c,e={};for(b in a)c=a[b],e[b]=d(c)?c:o.compile(c);return e}function k(a,b){for(var c=0,d=a.length;d>c;c++){var e=a[c];b.hasOwnProperty(e)&&delete b[e]}return b}function l(a){for(var b=a.constructor.prototype,c=[];b;)b.hasOwnProperty("attrs")&&!i(b.attrs)&&c.unshift(b.attrs),b=b.constructor.__super__;return c.unshift({}),c.unshift(!0),m.extend.apply(m,c)}var m=a("jquery");a("utility/underscore/1.6.0/underscore");var n=a("utility/backbone/1.1.2/backbone"),o=a("utility/handlebars/1.3.0/handlebars"),p={},q={id:null,className:null,template:null,templateModel:null,parentNode:document.body},r={},s=["model","collection","el","attributes","events"],t=n.View.extend({_renderElement:function(a,b){var c=this;if(a||(a=c.get("template")),b||(b=c.get("templateModel"))||(b={}),b.toJSON&&(b=b.toJSON()),d(a))return a(b,{helpers:c.templateHelpers,partials:j(c.templatePartials)});var e=c.templateHelpers,f=c.templatePartials;if(e){var g;for(g in e)e.hasOwnProperty(g)&&o.registerHelper(g,e[g])}if(f){var h;for(h in f)f.hasOwnProperty(h)&&o.registerPartial(h,f[h])}var i=r[a];i||(i=r[a]=o.compile(a));var k=i(b);if(e){var g;for(g in e)e.hasOwnProperty(g)&&delete o.helpers[g]}if(f){var h;for(h in f)f.hasOwnProperty(h)&&delete o.partials[h]}return k},_parseElementFromTemplate:function(){var a,b=this,c=b.get("template");/^#/.test(c)&&(a=m(c))&&(c=a.html(),b.set("template",c)),b.el=b._renderElement(c)},_ensureElement:function(){},_parseElement:function(){var a=this,b=!a.el&&a.get("template");if(b?(a._parseElementFromTemplate(),a.setElement(a.el,!1),a._isTemplate=!0):n.View.prototype._ensureElement.apply(a),!a.$el||!a.$el[0])throw new Error("element is invalid")},_stamp:function(){var a=this,b=a.cid;p[b]=a},_bindAttrsChange:function(){var a,b=this,c=b._attrsModel.attributes;for(a in c)if(c.hasOwnProperty(a)){var d="_onChange"+g(a);if(b[d]){var e=b.get(a);h(e)||b[d](e,{create:!0}),function(c){b.on("change:"+a,function(a,d,e){b[c](d,e)})}(d)}}},_onChangeId:function(a){this.$el.attr("id",a)},_onChangeClassName:function(a){this.$el.addClass(a)},templateHelpers:null,templatePartials:null,initialize:function(a){a||(a={});var b=this,c=l(b),d=m.extend(!0,{},q,c,b.attrs||{},a),e=k(s,d);b._attrsModel=new(n.Model.extend({defaults:e}));var f=b.get("id");f&&(b.id=f);var g=b.get("className");return g&&(b.className=g),b._parseElement(),b.setup(),b._stamp(),b},get:function(){var a=this;return a._attrsModel.get.apply(a._attrsModel,arguments)},set:function(){var a=this;return a._attrsModel.set.apply(a._attrsModel,arguments),a},on:function(){var a=this;return a._attrsModel.on.apply(a._attrsModel,arguments),a},off:function(){var a=this;return a._attrsModel.off.apply(a._attrsModel,arguments),a},trigger:function(){var a=this;return a._attrsModel.trigger.apply(a._attrsModel,arguments),a},setup:function(){},render:function(){var a=this;a.rendered||(a._bindAttrsChange(),a.rendered=!0);var b=a.get("parentNode");return b&&!f(a.el)&&a.$el.appendTo(b),a},remove:function(){var a=this;return delete p[a.cid],n.View.prototype.remove.apply(a),a}});c.exports=t,m(window).unload(function(){var a,b;for(a in p)b=p[a],b&&b.remove()});var u=Object.prototype.toString});