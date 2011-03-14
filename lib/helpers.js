(function() {
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var extend;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var flatten;
  exports.starts = function(string, literal, start) {
    return literal === string.substr(start, literal.length);
  };
  exports.ends = function(string, literal, back) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var len;
    len = literal.length;
    return literal === string.substr(string.length - len - (back || 0), len);
  };
  exports.compact = function(array) {
    var item, _i, _len, _results;
    _results = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      item = array[_i];
      if (item) {
        _results.push(item);
      }
    }
    return _results;
  };
  exports.count = function(string, substr) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var num;
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var pos;
    num = pos = 0;
    if (!substr.length) {
      return 1 / 0;
    }
    while (pos = 1 + string.indexOf(substr, pos)) {
      num++;
    }
    return num;
  };
  exports.merge = function(options, overrides) {
    return extend(extend({}, options), overrides);
  };
  extend = exports.extend = function(object, properties) {
    var key, val;
    for (key in properties) {
      val = properties[key];
      object[key] = val;
    }
    return object;
  };
  exports.flatten = flatten = function(array) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var flattened;
    var element, _i, _len;
    flattened = [];
    for (_i = 0, _len = array.length; _i < _len; _i++) {
      element = array[_i];
      if (element instanceof Array) {
        flattened = flattened.concat(flatten(element));
      } else {
        flattened.push(element);
      }
    }
    return flattened;
  };
  exports.del = function(obj, key) {
    /** @type {function () {
      return this.typeAnnotation;
    }} */
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };
  exports.last = function(array, back) {
    return array[array.length - (back || 0) - 1];
  };
}).call(this);
