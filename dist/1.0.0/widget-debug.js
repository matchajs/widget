define("matcha/widget/1.0.0/widget-debug", [ "jquery-debug", "utility/underscore/1.6.0/underscore-debug", "utility/backbone/1.1.2/backbone-debug", "utility/handlebars/1.3.0/handlebars-debug" ], function(require, exports, module) {
    var $ = require("jquery-debug");
    require("utility/underscore/1.6.0/underscore-debug");
    // 让combo一并加载
    var Backbone = require("utility/backbone/1.1.2/backbone-debug");
    var Handlebars = require("utility/handlebars/1.3.0/handlebars-debug");
    // 实例缓存
    var cachedInstances = {};
    /**
     * 默认属性
     * @type {{id: null, className: null, template: null, templateModel: null, parentNode: HTMLElement}}
     */
    var defaultAttr = {
        // 基本属性
        id: null,
        className: null,
        // 默认模板
        template: null,
        // 默认模版数据模型
        templateModel: null,
        // 组件的默认父节点
        parentNode: document.body
    };
    // 编译过的模版缓存
    var compiledTemplates = {};
    // 受保护的props，确保它们不会出现attrs模型上
    // 这些值会被Backbone.View初始化时复制到实例上
    var protectedProps = [ "model", "collection", "el", "attributes", "events" ];
    var Widget = Backbone.View.extend({
        /**
         * 渲染Handlebars模版
         * @param template
         * @param templateModel
         * @returns {*}
         * @private
         */
        _renderElement: function(template, templateModel) {
            var self = this;
            template || (template = self.get("template"));
            // 模版套入的数据
            templateModel || (templateModel = self.get("templateModel")) || (templateModel = {});
            if (templateModel.toJSON) {
                templateModel = templateModel.toJSON();
            }
            if (isFunction(template)) {
                return template(templateModel, {
                    helpers: self.templateHelpers,
                    partials: compilePartial(self.templatePartials)
                });
            }
            var helpers = self.templateHelpers;
            var partials = self.templatePartials;
            // 注册 helpers
            if (helpers) {
                var helper;
                for (helper in helpers) {
                    if (helpers.hasOwnProperty(helper)) {
                        Handlebars.registerHelper(helper, helpers[helper]);
                    }
                }
            }
            // 注册 partials
            if (partials) {
                var partial;
                for (partial in partials) {
                    if (partials.hasOwnProperty(partial)) {
                        Handlebars.registerPartial(partial, partials[partial]);
                    }
                }
            }
            var compiledTemplate = compiledTemplates[template];
            if (!compiledTemplate) {
                compiledTemplate = compiledTemplates[template] = Handlebars.compile(template);
            }
            // 生成 html
            var html = compiledTemplate(templateModel);
            // 卸载 helpers
            if (helpers) {
                var helper;
                for (helper in helpers) {
                    if (helpers.hasOwnProperty(helper)) {
                        delete Handlebars.helpers[helper];
                    }
                }
            }
            // 卸载 partials
            if (partials) {
                var partial;
                for (partial in partials) {
                    if (partials.hasOwnProperty(partial)) {
                        delete Handlebars.partials[partial];
                    }
                }
            }
            return html;
        },
        /**
         * 从模版上制造element
         * @private
         */
        _parseElementFromTemplate: function() {
            var self = this;
            // template 支持 id 选择器
            var $template, template = self.get("template");
            if (/^#/.test(template) && ($template = $(template))) {
                template = $template.html();
                self.set("template", template);
            }
            self.el = self._renderElement(template);
        },
        /**
         * 覆盖方法(Backbone.View._ensureElement)
         * @private
         */
        _ensureElement: function() {},
        /**
         * 构建element
         * @private
         */
        _parseElement: function() {
            var self = this;
            var isTemplate = !self.el && self.get("template");
            // 未传入 el 时，从 template 构建
            if (isTemplate) {
                self._parseElementFromTemplate();
                self.setElement(self.el, false);
                // 是否由 template 初始化
                self._isTemplate = true;
            } else {
                Backbone.View.prototype._ensureElement.apply(self);
            }
            // 如果对应的 DOM 元素不存在，则报错
            if (!self.$el || !self.$el[0]) {
                throw new Error("element is invalid");
            }
        },
        /**
         * 让 element 与 Widget 实例建立关联
         * @private
         */
        _stamp: function() {
            var self = this;
            var cid = self.cid;
            cachedInstances[cid] = self;
        },
        /**
         * 属性创建和改变时，触发创建的函数
         * @private
         */
        _bindAttrsChange: function() {
            var self = this;
            var attributes = self._attrsModel.attributes;
            var attr;
            for (attr in attributes) {
                if (!attributes.hasOwnProperty(attr)) {
                    continue;
                }
                var eventName = "_onChange" + ucfirst(attr);
                if (self[eventName]) {
                    var val = self.get(attr);
                    // 让属性的初始值生效。注：默认空值不触发
                    if (!isEmptyAttrValue(val)) {
                        self[eventName](val, undefined, {
                            create: true
                        });
                    }
                    // 将 _onRenderXx 自动绑定到 change:xx 事件上
                    (function(eventName) {
                        self.on("change:" + attr, function(model, value, options) {
                            self[eventName](value, model.previous(attr), options);
                        });
                    })(eventName);
                }
            }
        },
        // 模型属性对应的回调函数
        _onChangeId: function(value) {
            this.$el.attr("id", value);
        },
        _onChangeClassName: function(value) {
            this.$el.addClass(value);
        },
        /**
         * Handlebars 的 helpers
         */
        templateHelpers: null,
        /**
         * Handlebars 的 partials
         */
        templatePartials: null,
        /**
         * 初始化
         * @param options
         * @returns {Widget}
         */
        initialize: function(options) {
            options || (options = {});
            var self = this;
            // attrs 处理
            var inheritedAttrs = mergeInheritedAttrs(self);
            var attrs = $.extend(true, {}, defaultAttr, inheritedAttrs, self.attrs || {}, options);
            // 筛选出其他属性，用作模型数据
            var modelDefaults = filterSpecialProps(protectedProps, attrs);
            self._attrsModel = new (Backbone.Model.extend({
                defaults: modelDefaults
            }))();
            // 兼容 backbone.view
            var elementId = self.get("id");
            if (elementId) {
                self.id = elementId;
            }
            var elementClassName = self.get("className");
            if (elementClassName) {
                self.className = elementClassName;
            }
            // 构建 element
            self._parseElement();
            // 子类自定义的初始化
            self.setup();
            // 保存实例信息
            self._stamp();
            return self;
        },
        /**
         * 模型: 获取属性
         * @returns {*}
         */
        get: function() {
            var self = this;
            return self._attrsModel.get.apply(self._attrsModel, arguments);
        },
        /**
         * 模型: 设置属性
         * @returns {Widget}
         */
        set: function() {
            var self = this;
            self._attrsModel.set.apply(self._attrsModel, arguments);
            return self;
        },
        /**
         * 模型: 注册事件
         * @returns {Widget}
         */
        on: function() {
            var self = this;
            self._attrsModel.on.apply(self._attrsModel, arguments);
            return self;
        },
        /**
         * 模型: 注销事件
         * @returns {Widget}
         */
        off: function() {
            var self = this;
            self._attrsModel.off.apply(self._attrsModel, arguments);
            return self;
        },
        /**
         * 模型: 触发事件
         * @returns {Widget}
         */
        trigger: function() {
            var self = this;
            self._attrsModel.trigger.apply(self._attrsModel, arguments);
            return self;
        },
        /**
         * 提供给子类覆盖的初始化方法
         */
        setup: function() {},
        /**
         * 渲染
         * @returns {Widget}
         */
        render: function() {
            var self = this;
            if (!self.rendered) {
                self._bindAttrsChange();
                self.rendered = true;
            }
            var parentNode = self.get("parentNode");
            if (parentNode && !isInDocument(self.el)) {
                self.$el.appendTo(parentNode);
            }
            return self;
        },
        /**
         * 移除
         * @returns {Widget}
         */
        remove: function() {
            var self = this;
            delete cachedInstances[self.cid];
            Backbone.View.prototype.remove.apply(self);
            return self;
        },
        /**
         * 销毁实例
         * @returns {Widget}
         */
        destroy: function() {
            var self = this;
            for (var p in self) {
                if (self.hasOwnProperty(p)) {
                    delete self[p];
                }
            }
            // 此方法只能运行一次
            self.destroy = function() {};
            return self;
        }
    });
    module.exports = Widget;
    // For memory leak
    $(window).unload(function() {
        var cid, instance;
        for (cid in cachedInstances) {
            instance = cachedInstances[cid];
            instance && instance.remove();
        }
    });
    // Helps
    function isFunction(o) {
        return $.isFunction(o);
    }
    function isWindow(o) {
        return o != null && o == o.window;
    }
    function isInDocument(element) {
        return $.contains(document.documentElement, element);
    }
    function ucfirst(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
    }
    // 对于 attrs 的 value 来说，以下值都认为是空值： null, undefined
    function isEmptyAttrValue(o) {
        return o == null || o === undefined;
    }
    var toString = Object.prototype.toString;
    function isEmptyObject(o) {
        if (!o || toString.call(o) !== "[object Object]" || o.nodeType || isWindow(o) || !o.hasOwnProperty) {
            return false;
        }
        for (var p in o) {
            if (o.hasOwnProperty(p)) return false;
        }
        return true;
    }
    function compilePartial(partials) {
        if (!partials) return {};
        var result = {}, name, partial;
        for (name in partials) {
            partial = partials[name];
            result[name] = isFunction(partial) ? partial : Handlebars.compile(partial);
        }
        return result;
    }
    function filterSpecialProps(specialProps, supplier) {
        for (var i = 0, len = specialProps.length; i < len; i++) {
            var key = specialProps[i];
            if (supplier.hasOwnProperty(key)) {
                delete supplier[key];
            }
        }
        return supplier;
    }
    function mergeInheritedAttrs(instance) {
        var proto = instance.constructor.prototype;
        var inherited = [];
        while (proto) {
            // 不要拿到 prototype 上的 && 为空时不添加
            if (proto.hasOwnProperty("attrs") && !isEmptyObject(proto.attrs)) {
                inherited.unshift(proto.attrs);
            }
            // 向上回溯一级
            proto = proto.constructor.__super__;
        }
        inherited.unshift({});
        inherited.unshift(true);
        return $.extend.apply($, inherited);
    }
});
