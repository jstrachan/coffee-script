(function() {
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var LONG_FLAG;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var MULTI_FLAG;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var OPTIONAL;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var OptionParser;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var SHORT_FLAG;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var buildRule;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var buildRules;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var normalizeArguments;
  exports.OptionParser = OptionParser = (function() {
    function OptionParser(rules, banner) {
      this.banner = banner;
      this.rules = buildRules(rules);
    }
    OptionParser.prototype.parse = function(args) {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var isOption;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var matchedRule;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var options;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var value;
      var arg, i, rule, _i, _len, _len2, _ref;
      options = {
        arguments: [],
        literals: []
      };
      args = normalizeArguments(args);
      for (i = 0, _len = args.length; i < _len; i++) {
        arg = args[i];
        if (arg === '--') {
          options.literals = args.slice(i + 1);
          break;
        }
        isOption = !!(arg.match(LONG_FLAG) || arg.match(SHORT_FLAG));
        matchedRule = false;
        _ref = this.rules;
        for (_i = 0, _len2 = _ref.length; _i < _len2; _i++) {
          rule = _ref[_i];
          if (rule.shortFlag === arg || rule.longFlag === arg) {
            value = rule.hasArgument ? args[i += 1] : true;
            options[rule.name] = rule.isList ? (options[rule.name] || []).concat(value) : value;
            matchedRule = true;
            break;
          }
        }
        if (isOption && !matchedRule) {
          throw new Error("unrecognized option: " + arg);
        }
        if (!isOption) {
          options.arguments = args.slice(i);
          break;
        }
      }
      return options;
    };
    OptionParser.prototype.help = function() {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var letPart;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var lines;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var spaces;
      var rule, _i, _len, _ref;
      lines = [];
      if (this.banner) {
        lines.unshift("" + this.banner + "\n");
      }
      _ref = this.rules;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        rule = _ref[_i];
        spaces = 15 - rule.longFlag.length;
        spaces = spaces > 0 ? Array(spaces + 1).join(' ') : '';
        letPart = rule.shortFlag ? rule.shortFlag + ', ' : '    ';
        lines.push('  ' + letPart + rule.longFlag + spaces + rule.description);
      }
      return "\n" + (lines.join('\n')) + "\n";
    };
    return OptionParser;
  })();
  LONG_FLAG = /^(--\w[\w\-]+)/;
  SHORT_FLAG = /^(-\w)/;
  MULTI_FLAG = /^-(\w{2,})/;
  OPTIONAL = /\[(\w+(\*?))\]/;
  buildRules = function(rules) {
    var tuple, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = rules.length; _i < _len; _i++) {
      tuple = rules[_i];
      if (tuple.length < 3) {
        tuple.unshift(null);
      }
      _results.push(buildRule.apply(null, tuple));
    }
    return _results;
  };
  buildRule = function(shortFlag, longFlag, description, options) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var match;
    if (options == null) {
      options = {};
    }
    match = longFlag.match(OPTIONAL);
    longFlag = longFlag.match(LONG_FLAG)[1];
    return {
      name: longFlag.substr(2),
      shortFlag: shortFlag,
      longFlag: longFlag,
      description: description,
      hasArgument: !!(match && match[1]),
      isList: !!(match && match[2])
    };
  };
  normalizeArguments = function(args) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var match;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var result;
    var arg, l, _i, _j, _len, _len2, _ref;
    args = args.slice(0);
    result = [];
    for (_i = 0, _len = args.length; _i < _len; _i++) {
      arg = args[_i];
      if (match = arg.match(MULTI_FLAG)) {
        _ref = match[1].split('');
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          l = _ref[_j];
          result.push('-' + l);
        }
      } else {
        result.push(arg);
      }
    }
    return result;
  };
}).call(this);
