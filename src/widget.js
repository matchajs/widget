define(function(require, exports, module) {
    var $ = require('jquery');
    var Backbone = require('backbone');
    var Handlebars = require('handlebars');

    var cachedInstances = {};

    var defaultAttr = {
        // 默认模板
        template: null,

        // 默认模版数据模型
        templateModel: null,

        // 组件的默认父节点
        parentNode: document.body
    };

    var compiledTemplates = {};

    var protectedProps = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

    var Widget = Backbone.View.extend({

        _renderElement: function(template, templateModel) {
            var self = this;

            template || (template = self.get('template'));

            templateModel || (templateModel = self.get('templateModel')) || (templateModel = {});
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
            var $template, template = self.get('template');
            if (/^#/.test(template) &&
                ($template = $(template))) {

                template = $template.html();
                self.set('template', template);
            }

            self.el = self._renderElement(template);
        },

        /**
         * 覆盖方法
         * @private
         */
        _ensureElement: function() {},

        /**
         * 构建element
         * @private
         */
        _parseElement: function() {
            var self = this;

            // 未传入 el 时，从 template 构建
            if (!self.el && self.get('template')) {
                self._parseElementFromTemplate();
                self.setElement(self.el, false);
            } else {
                Backbone.View.prototype._ensureElement.apply(self);
            }

            // 如果对应的 DOM 元素不存在，则报错
            if (!self.$el || !self.$el[0]) {
                throw new Error('element is invalid');
            }
        },

        // 让 element 与 Widget 实例建立关联
        _stamp: function() {
            var self = this;
            var cid = self.cid;

            cachedInstances[cid] = self;
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

            // 筛选出其他属性，用作模型数据
            var attrs = $.extend(true, {}, defaultAttr, (self.attrs || {}), options);
            attrs = filterSpecialProps(protectedProps, attrs);

            self._attrsModel = new (Backbone.Model.extend({
                defaults: attrs
            }));

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
         * @returns {*|String|string|Object}
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
        setup: function() {
        },

        /**
         * 渲染
         * @returns {Widget}
         */
        render: function() {
            var self = this;

            if (!self.rendered) {
                self.rendered = true;
            }

            var parentNode = self.get('parentNode');
            if (parentNode && !isInDocument(self.el)) {
                self.$el.appendTo(parentNode);
            }

            return self;
        },

        remove: function() {
            var self = this;
            delete self.cachedInstances[self.cid];

            Backbone.View.prototype.remove.apply(self);

            return self;
        }
    });

    module.exports = Widget;

    // For memory leak
    $(window).unload(function() {
        var cid;
        for (cid in cachedInstances) {
            cachedInstances[cid].remove();
        }
    });

    // Helps
    function isFunction(o) {
        return $.isFunction(o);
    }

    function isInDocument(element) {
        return $.contains(document.documentElement, element);
    }

    function compilePartial(partials) {
        if (!partials) return {};

        var result = {},
            name, partial;
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
});
