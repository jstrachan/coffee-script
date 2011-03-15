/**
 * CoffeeScript Compiler v1.1.0-pre
 * http://coffeescript.org
 *
 * Copyright 2011, Jeremy Ashkenas
 * Released under the MIT License
 */
this.CoffeeScript = function() {
  function require(path){ return require[path]; }
  require['./helpers'] = new function() {
  var exports = this;
  (function() {
  var extend, flatten;
  exports.starts = function(string, literal, start) {
    return literal === string.substr(start, literal.length);
  };
  exports.ends = function(string, literal, back) {
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
    var num, pos;
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
    var element, flattened, _i, _len;
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
    var val;
    val = obj[key];
    delete obj[key];
    return val;
  };
  exports.last = function(array, back) {
    return array[array.length - (back || 0) - 1];
  };
}).call(this);

};require['./rewriter'] = new function() {
  var exports = this;
  (function() {
  var BALANCED_PAIRS, EXPRESSION_CLOSE, EXPRESSION_END, EXPRESSION_START, IMPLICIT_BLOCK, IMPLICIT_CALL, IMPLICIT_END, IMPLICIT_FUNC, IMPLICIT_UNSPACED_CALL, INVERSES, LINEBREAKS, SINGLE_CLOSERS, SINGLE_LINERS, left, rite, _i, _len, _ref;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  }, __slice = Array.prototype.slice;
  exports.Rewriter = (function() {
    function Rewriter() {}
    Rewriter.prototype.rewrite = function(tokens) {
      this.tokens = tokens;
      this.removeLeadingNewlines();
      this.removeMidExpressionNewlines();
      this.closeOpenCalls();
      this.closeOpenIndexes();
      this.addImplicitIndentation();
      this.tagPostfixConditionals();
      this.addImplicitBraces();
      this.addImplicitParentheses();
      this.ensureBalance(BALANCED_PAIRS);
      this.rewriteClosingParens();
      return this.tokens;
    };
    Rewriter.prototype.scanTokens = function(block) {
      var i, token, tokens;
      tokens = this.tokens;
      i = 0;
      while (token = tokens[i]) {
        i += block.call(this, token, i, tokens);
      }
      return true;
    };
    Rewriter.prototype.detectEnd = function(i, condition, action) {
      var levels, token, tokens, _ref, _ref2;
      tokens = this.tokens;
      levels = 0;
      while (token = tokens[i]) {
        if (levels === 0 && condition.call(this, token, i)) {
          return action.call(this, token, i);
        }
        if (!token || levels < 0) {
          return action.call(this, token, i - 1);
        }
        if (_ref = token[0], __indexOf.call(EXPRESSION_START, _ref) >= 0) {
          levels += 1;
        } else if (_ref2 = token[0], __indexOf.call(EXPRESSION_END, _ref2) >= 0) {
          levels -= 1;
        }
        i += 1;
      }
      return i - 1;
    };
    Rewriter.prototype.removeLeadingNewlines = function() {
      var i, tag, _len, _ref;
      _ref = this.tokens;
      for (i = 0, _len = _ref.length; i < _len; i++) {
        tag = _ref[i][0];
        if (tag !== 'TERMINATOR') {
          break;
        }
      }
      if (i) {
        return this.tokens.splice(0, i);
      }
    };
    Rewriter.prototype.removeMidExpressionNewlines = function() {
      return this.scanTokens(function(token, i, tokens) {
        var _ref;
        if (!(token[0] === 'TERMINATOR' && (_ref = this.tag(i + 1), __indexOf.call(EXPRESSION_CLOSE, _ref) >= 0))) {
          return 1;
        }
        tokens.splice(i, 1);
        return 0;
      });
    };
    Rewriter.prototype.closeOpenCalls = function() {
      var action, condition;
      condition = function(token, i) {
        var _ref;
        return ((_ref = token[0]) === ')' || _ref === 'CALL_END') || token[0] === 'OUTDENT' && this.tag(i - 1) === ')';
      };
      action = function(token, i) {
        return this.tokens[token[0] === 'OUTDENT' ? i - 1 : i][0] = 'CALL_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'CALL_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };
    Rewriter.prototype.closeOpenIndexes = function() {
      var action, condition;
      condition = function(token, i) {
        var _ref;
        return (_ref = token[0]) === ']' || _ref === 'INDEX_END';
      };
      action = function(token, i) {
        return token[0] = 'INDEX_END';
      };
      return this.scanTokens(function(token, i) {
        if (token[0] === 'INDEX_START') {
          this.detectEnd(i + 1, condition, action);
        }
        return 1;
      });
    };
    Rewriter.prototype.addImplicitBraces = function() {
      var action, condition, stack, start, startIndent;
      stack = [];
      start = null;
      startIndent = 0;
      condition = function(token, i) {
        var one, tag, three, two, _ref, _ref2;
        _ref = this.tokens.slice(i + 1, (i + 3 + 1) || 9e9), one = _ref[0], two = _ref[1], three = _ref[2];
        if ('HERECOMMENT' === (one != null ? one[0] : void 0)) {
          return false;
        }
        tag = token[0];
        return ((tag === 'TERMINATOR' || tag === 'OUTDENT') && !((two != null ? two[0] : void 0) === ':' || (one != null ? one[0] : void 0) === '@' && (three != null ? three[0] : void 0) === ':')) || (tag === ',' && one && ((_ref2 = one[0]) !== 'IDENTIFIER' && _ref2 !== 'NUMBER' && _ref2 !== 'STRING' && _ref2 !== '@' && _ref2 !== 'TERMINATOR' && _ref2 !== 'OUTDENT'));
      };
      action = function(token, i) {
        return this.tokens.splice(i, 0, ['}', '}', token[2]]);
      };
      return this.scanTokens(function(token, i, tokens) {
        var ago, idx, tag, tok, value, _ref, _ref2;
        if (_ref = (tag = token[0]), __indexOf.call(EXPRESSION_START, _ref) >= 0) {
          stack.push([(tag === 'INDENT' && this.tag(i - 1) === '{' ? '{' : tag), i]);
          return 1;
        }
        if (__indexOf.call(EXPRESSION_END, tag) >= 0) {
          start = stack.pop();
          return 1;
        }
        if (!(tag === ':' && ((ago = this.tag(i - 2)) === ':' || ((_ref2 = stack[stack.length - 1]) != null ? _ref2[0] : void 0) !== '{'))) {
          return 1;
        }
        stack.push(['{']);
        idx = ago === '@' ? i - 2 : i - 1;
        while (this.tag(idx - 2) === 'HERECOMMENT') {
          idx -= 2;
        }
        value = new String('{');
        value.generated = true;
        tok = ['{', value, token[2]];
        tok.generated = true;
        tokens.splice(idx, 0, tok);
        this.detectEnd(i + 2, condition, action);
        return 2;
      });
    };
    Rewriter.prototype.addImplicitParentheses = function() {
      var action, noCall;
      noCall = false;
      action = function(token, i) {
        var idx;
        idx = token[0] === 'OUTDENT' ? i + 1 : i;
        return this.tokens.splice(idx, 0, ['CALL_END', ')', token[2]]);
      };
      return this.scanTokens(function(token, i, tokens) {
        var callObject, current, next, prev, seenSingle, tag, _ref, _ref2, _ref3;
        tag = token[0];
        if (tag === 'CLASS' || tag === 'IF') {
          noCall = true;
        }
        _ref = tokens.slice(i - 1, (i + 1 + 1) || 9e9), prev = _ref[0], current = _ref[1], next = _ref[2];
        callObject = !noCall && tag === 'INDENT' && next && next.generated && next[0] === '{' && prev && (_ref2 = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref2) >= 0);
        seenSingle = false;
        if (__indexOf.call(LINEBREAKS, tag) >= 0) {
          noCall = false;
        }
        if (prev && !prev.spaced && tag === '?') {
          token.call = true;
        }
        if (!(callObject || (prev != null ? prev.spaced : void 0) && (prev.call || (_ref3 = prev[0], __indexOf.call(IMPLICIT_FUNC, _ref3) >= 0)) && (__indexOf.call(IMPLICIT_CALL, tag) >= 0 || !(token.spaced || token.newLine) && __indexOf.call(IMPLICIT_UNSPACED_CALL, tag) >= 0))) {
          return 1;
        }
        tokens.splice(i, 0, ['CALL_START', '(', token[2]]);
        this.detectEnd(i + 1, function(token, i) {
          var post, _ref;
          tag = token[0];
          if (!seenSingle && token.fromThen) {
            return true;
          }
          if (tag === 'IF' || tag === 'ELSE' || tag === '->' || tag === '=>') {
            seenSingle = true;
          }
          if ((tag === '.' || tag === '?.' || tag === '::') && this.tag(i - 1) === 'OUTDENT') {
            return true;
          }
          return !token.generated && this.tag(i - 1) !== ',' && __indexOf.call(IMPLICIT_END, tag) >= 0 && (tag !== 'INDENT' || (this.tag(i - 2) !== 'CLASS' && (_ref = this.tag(i - 1), __indexOf.call(IMPLICIT_BLOCK, _ref) < 0) && !((post = this.tokens[i + 1]) && post.generated && post[0] === '{')));
        }, action);
        if (prev[0] === '?') {
          prev[0] = 'FUNC_EXIST';
        }
        return 2;
      });
    };
    Rewriter.prototype.addImplicitIndentation = function() {
      return this.scanTokens(function(token, i, tokens) {
        var action, condition, indent, outdent, starter, tag, _ref, _ref2;
        tag = token[0];
        if (tag === 'TERMINATOR' && this.tag(i + 1) === 'THEN') {
          tokens.splice(i, 1);
          return 0;
        }
        if (tag === 'ELSE' && this.tag(i - 1) !== 'OUTDENT') {
          tokens.splice.apply(tokens, [i, 0].concat(__slice.call(this.indentation(token))));
          return 2;
        }
        if (tag === 'CATCH' && ((_ref = this.tag(i + 2)) === 'OUTDENT' || _ref === 'TERMINATOR' || _ref === 'FINALLY')) {
          tokens.splice.apply(tokens, [i + 2, 0].concat(__slice.call(this.indentation(token))));
          return 4;
        }
        if (__indexOf.call(SINGLE_LINERS, tag) >= 0 && this.tag(i + 1) !== 'INDENT' && !(tag === 'ELSE' && this.tag(i + 1) === 'IF')) {
          starter = tag;
          _ref2 = this.indentation(token), indent = _ref2[0], outdent = _ref2[1];
          if (starter === 'THEN') {
            indent.fromThen = true;
          }
          indent.generated = outdent.generated = true;
          tokens.splice(i + 1, 0, indent);
          condition = function(token, i) {
            var _ref;
            return token[1] !== ';' && (_ref = token[0], __indexOf.call(SINGLE_CLOSERS, _ref) >= 0) && !(token[0] === 'ELSE' && (starter !== 'IF' && starter !== 'THEN'));
          };
          action = function(token, i) {
            return this.tokens.splice((this.tag(i - 1) === ',' ? i - 1 : i), 0, outdent);
          };
          this.detectEnd(i + 2, condition, action);
          if (tag === 'THEN') {
            tokens.splice(i, 1);
          }
          return 1;
        }
        return 1;
      });
    };
    Rewriter.prototype.tagPostfixConditionals = function() {
      var condition;
      condition = function(token, i) {
        var _ref;
        return (_ref = token[0]) === 'TERMINATOR' || _ref === 'INDENT';
      };
      return this.scanTokens(function(token, i) {
        var original;
        if (token[0] !== 'IF') {
          return 1;
        }
        original = token;
        this.detectEnd(i + 1, condition, function(token, i) {
          if (token[0] !== 'INDENT') {
            return original[0] = 'POST_' + original[0];
          }
        });
        return 1;
      });
    };
    Rewriter.prototype.ensureBalance = function(pairs) {
      var close, level, levels, open, openLine, tag, token, _i, _j, _len, _len2, _ref, _ref2;
      levels = {};
      openLine = {};
      _ref = this.tokens;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        token = _ref[_i];
        tag = token[0];
        for (_j = 0, _len2 = pairs.length; _j < _len2; _j++) {
          _ref2 = pairs[_j], open = _ref2[0], close = _ref2[1];
          levels[open] |= 0;
          if (tag === open) {
            if (levels[open]++ === 0) {
              openLine[open] = token[2];
            }
          } else if (tag === close && --levels[open] < 0) {
            throw Error("too many " + token[1] + " on line " + (token[2] + 1));
          }
        }
      }
      for (open in levels) {
        level = levels[open];
        if (level > 0) {
          throw Error("unclosed " + open + " on line " + (openLine[open] + 1));
        }
      }
      return this;
    };
    Rewriter.prototype.rewriteClosingParens = function() {
      var debt, key, stack;
      stack = [];
      debt = {};
      for (key in INVERSES) {
        debt[key] = 0;
      }
      return this.scanTokens(function(token, i, tokens) {
        var inv, match, mtag, oppos, tag, val, _ref;
        if (_ref = (tag = token[0]), __indexOf.call(EXPRESSION_START, _ref) >= 0) {
          stack.push(token);
          return 1;
        }
        if (__indexOf.call(EXPRESSION_END, tag) < 0) {
          return 1;
        }
        if (debt[inv = INVERSES[tag]] > 0) {
          debt[inv] -= 1;
          tokens.splice(i, 1);
          return 0;
        }
        match = stack.pop();
        mtag = match[0];
        oppos = INVERSES[mtag];
        if (tag === oppos) {
          return 1;
        }
        debt[mtag] += 1;
        val = [oppos, mtag === 'INDENT' ? match[1] : oppos];
        if (this.tag(i + 2) === mtag) {
          tokens.splice(i + 3, 0, val);
          stack.push(match);
        } else {
          tokens.splice(i, 0, val);
        }
        return 1;
      });
    };
    Rewriter.prototype.indentation = function(token) {
      return [['INDENT', 2, token[2]], ['OUTDENT', 2, token[2]]];
    };
    Rewriter.prototype.tag = function(i) {
      var _ref;
      return (_ref = this.tokens[i]) != null ? _ref[0] : void 0;
    };
    return Rewriter;
  })();
  BALANCED_PAIRS = [['(', ')'], ['[', ']'], ['{', '}'], ['INDENT', 'OUTDENT'], ['CALL_START', 'CALL_END'], ['PARAM_START', 'PARAM_END'], ['INDEX_START', 'INDEX_END']];
  INVERSES = {};
  EXPRESSION_START = [];
  EXPRESSION_END = [];
  for (_i = 0, _len = BALANCED_PAIRS.length; _i < _len; _i++) {
    _ref = BALANCED_PAIRS[_i], left = _ref[0], rite = _ref[1];
    EXPRESSION_START.push(INVERSES[rite] = left);
    EXPRESSION_END.push(INVERSES[left] = rite);
  }
  EXPRESSION_CLOSE = ['CATCH', 'WHEN', 'ELSE', 'FINALLY'].concat(EXPRESSION_END);
  IMPLICIT_FUNC = ['IDENTIFIER', 'SUPER', ')', 'CALL_END', ']', 'INDEX_END', '@', 'THIS'];
  IMPLICIT_CALL = ['IDENTIFIER', 'NUMBER', 'STRING', 'JS', 'REGEX', 'NEW', 'PARAM_START', 'CLASS', 'IF', 'TRY', 'SWITCH', 'THIS', 'BOOL', 'UNARY', 'SUPER', '@', '->', '=>', '[', '(', '{', '--', '++'];
  IMPLICIT_UNSPACED_CALL = ['+', '-'];
  IMPLICIT_BLOCK = ['->', '=>', '{', '[', ','];
  IMPLICIT_END = ['POST_IF', 'FOR', 'WHILE', 'UNTIL', 'WHEN', 'BY', 'LOOP', 'TERMINATOR', 'INDENT'];
  SINGLE_LINERS = ['ELSE', '->', '=>', 'TRY', 'FINALLY', 'THEN'];
  SINGLE_CLOSERS = ['TERMINATOR', 'CATCH', 'FINALLY', 'ELSE', 'OUTDENT', 'LEADING_WHEN'];
  LINEBREAKS = ['TERMINATOR', 'INDENT', 'OUTDENT'];
}).call(this);

};require['./lexer'] = new function() {
  var exports = this;
  (function() {
  var ASSIGNED, BOOL, CALLABLE, CODE, COFFEE_ALIASES, COFFEE_KEYWORDS, COMMENT, COMPARE, COMPOUND_ASSIGN, HEREDOC, HEREDOC_ILLEGAL, HEREDOC_INDENT, HEREGEX, HEREGEX_OMIT, IDENTIFIER, INDEXABLE, JSTOKEN, JS_FORBIDDEN, JS_KEYWORDS, LINE_BREAK, LINE_CONTINUER, LOGIC, Lexer, MATH, MULTILINER, MULTI_DENT, NOT_REGEX, NOT_SPACED_REGEX, NO_NEWLINE, NUMBER, OPERATOR, REGEX, RELATION, RESERVED, Rewriter, SHIFT, SIMPLESTR, TRAILING_SPACES, TYPE_ANNOTATE, UNARY, WHITESPACE, compact, count, last, op, starts, _ref;
  var __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  Rewriter = require('./rewriter').Rewriter;
  _ref = require('./helpers'), count = _ref.count, starts = _ref.starts, compact = _ref.compact, last = _ref.last;
  exports.Lexer = Lexer = (function() {
    function Lexer() {}
    Lexer.prototype.tokenize = function(code, opts) {
      var i;
      if (opts == null) {
        opts = {};
      }
      if (WHITESPACE.test(code)) {
        code = "\n" + code;
      }
      code = code.replace(/\r/g, '').replace(TRAILING_SPACES, '');
      this.code = code;
      this.line = opts.line || 0;
      this.indent = 0;
      this.indebt = 0;
      this.outdebt = 0;
      this.indents = [];
      this.tokens = [];
      i = 0;
      while (this.chunk = code.slice(i)) {
        i += this.identifierToken() || this.commentToken() || this.whitespaceToken() || this.lineToken() || this.heredocToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.jsToken() || this.literalToken();
      }
      this.closeIndentation();
      if (opts.rewrite === false) {
        return this.tokens;
      }
      return (new Rewriter).rewrite(this.tokens);
    };
    Lexer.prototype.identifierToken = function() {
      var colon, forcedIdentifier, id, input, match, prev, tag, _ref, _ref2;
      if (!(match = IDENTIFIER.exec(this.chunk))) {
        return 0;
      }
      input = match[0], id = match[1], colon = match[2];
      if (id === 'own' && this.tag() === 'FOR') {
        this.token('OWN', id);
        return id.length;
      }
      forcedIdentifier = colon || (prev = last(this.tokens)) && (((_ref = prev[0]) === '.' || _ref === '?.' || _ref === '::') || !prev.spaced && prev[0] === '@');
      tag = 'IDENTIFIER';
      if (__indexOf.call(JS_KEYWORDS, id) >= 0 || !forcedIdentifier && __indexOf.call(COFFEE_KEYWORDS, id) >= 0) {
        tag = id.toUpperCase();
        if (tag === 'WHEN' && (_ref2 = this.tag(), __indexOf.call(LINE_BREAK, _ref2) >= 0)) {
          tag = 'LEADING_WHEN';
        } else if (tag === 'FOR') {
          this.seenFor = true;
        } else if (tag === 'UNLESS') {
          tag = 'IF';
        } else if (__indexOf.call(UNARY, tag) >= 0) {
          tag = 'UNARY';
        } else if (__indexOf.call(RELATION, tag) >= 0) {
          if (tag !== 'INSTANCEOF' && this.seenFor) {
            tag = 'FOR' + tag;
            this.seenFor = false;
          } else {
            tag = 'RELATION';
            if (this.value() === '!') {
              this.tokens.pop();
              id = '!' + id;
            }
          }
        }
      }
      if (__indexOf.call(JS_FORBIDDEN, id) >= 0) {
        if (forcedIdentifier) {
          tag = 'IDENTIFIER';
          id = new String(id);
          id.reserved = true;
        } else if (__indexOf.call(RESERVED, id) >= 0) {
          this.identifierError(id);
        }
      }
      if (!forcedIdentifier) {
        if (COFFEE_ALIASES.hasOwnProperty(id)) {
          id = COFFEE_ALIASES[id];
        }
        tag = (function() {
          switch (id) {
            case '!':
              return 'UNARY';
            case '==':
            case '!=':
              return 'COMPARE';
            case '&&':
            case '||':
              return 'LOGIC';
            case 'true':
            case 'false':
            case 'null':
            case 'undefined':
              return 'BOOL';
            case 'break':
            case 'continue':
            case 'debugger':
              return 'STATEMENT';
            default:
              return tag;
          }
        })();
      }
      this.token(tag, id);
      if (colon) {
        this.token(':', ':');
      }
      return input.length;
    };
    Lexer.prototype.numberToken = function() {
      var match, number;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      number = match[0];
      this.token('NUMBER', number);
      return number.length;
    };
    Lexer.prototype.stringToken = function() {
      var match, string;
      switch (this.chunk.charAt(0)) {
        case "'":
          if (!(match = SIMPLESTR.exec(this.chunk))) {
            return 0;
          }
          this.token('STRING', (string = match[0]).replace(MULTILINER, '\\\n'));
          break;
        case '"':
          if (!(string = this.balancedString(this.chunk, '"'))) {
            return 0;
          }
          if (0 < string.indexOf('#{', 1)) {
            this.interpolateString(string.slice(1, -1));
          } else {
            this.token('STRING', this.escapeLines(string));
          }
          break;
        default:
          return 0;
      }
      this.line += count(string, '\n');
      return string.length;
    };
    Lexer.prototype.heredocToken = function() {
      var doc, heredoc, match, quote;
      if (!(match = HEREDOC.exec(this.chunk))) {
        return 0;
      }
      heredoc = match[0];
      quote = heredoc.charAt(0);
      doc = this.sanitizeHeredoc(match[2], {
        quote: quote,
        indent: null
      });
      if (quote === '"' && 0 <= doc.indexOf('#{')) {
        this.interpolateString(doc, {
          heredoc: true
        });
      } else {
        this.token('STRING', this.makeString(doc, quote, true));
      }
      this.line += count(heredoc, '\n');
      return heredoc.length;
    };
    Lexer.prototype.commentToken = function() {
      var comment, here, match;
      if (!(match = this.chunk.match(COMMENT))) {
        return 0;
      }
      comment = match[0], here = match[1];
      if (here) {
        this.token('HERECOMMENT', this.sanitizeHeredoc(here, {
          herecomment: true,
          indent: Array(this.indent + 1).join(' ')
        }));
        this.token('TERMINATOR', '\n');
      }
      this.line += count(comment, '\n');
      return comment.length;
    };
    Lexer.prototype.jsToken = function() {
      var match, script;
      if (!(this.chunk.charAt(0) === '`' && (match = JSTOKEN.exec(this.chunk)))) {
        return 0;
      }
      this.token('JS', (script = match[0]).slice(1, -1));
      return script.length;
    };
    Lexer.prototype.regexToken = function() {
      var match, prev, regex, _ref;
      if (this.chunk.charAt(0) !== '/') {
        return 0;
      }
      if (match = HEREGEX.exec(this.chunk)) {
        return this.heregexToken(match);
      }
      prev = last(this.tokens);
      if (prev && (_ref = prev[0], __indexOf.call((prev.spaced ? NOT_REGEX : NOT_SPACED_REGEX), _ref) >= 0)) {
        return 0;
      }
      if (!(match = REGEX.exec(this.chunk))) {
        return 0;
      }
      regex = match[0];
      this.token('REGEX', regex === '//' ? '/(?:)/' : regex);
      return regex.length;
    };
    Lexer.prototype.heregexToken = function(match) {
      var body, flags, heregex, re, tag, tokens, value, _i, _len, _ref, _ref2, _ref3, _ref4;
      heregex = match[0], body = match[1], flags = match[2];
      if (0 > body.indexOf('#{')) {
        re = body.replace(HEREGEX_OMIT, '').replace(/\//g, '\\/');
        this.token('REGEX', "/" + (re || '(?:)') + "/" + flags);
        return heregex.length;
      }
      this.token('IDENTIFIER', 'RegExp');
      this.tokens.push(['CALL_START', '(']);
      tokens = [];
      _ref = this.interpolateString(body, {
        regex: true
      });
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], tag = _ref2[0], value = _ref2[1];
        if (tag === 'TOKENS') {
          tokens.push.apply(tokens, value);
        } else {
          if (!(value = value.replace(HEREGEX_OMIT, ''))) {
            continue;
          }
          value = value.replace(/\\/g, '\\\\');
          tokens.push(['STRING', this.makeString(value, '"', true)]);
        }
        tokens.push(['+', '+']);
      }
      tokens.pop();
      if (((_ref3 = tokens[0]) != null ? _ref3[0] : void 0) !== 'STRING') {
        this.tokens.push(['STRING', '""'], ['+', '+']);
      }
      (_ref4 = this.tokens).push.apply(_ref4, tokens);
      if (flags) {
        this.tokens.push([',', ','], ['STRING', '"' + flags + '"']);
      }
      this.token(')', ')');
      return heregex.length;
    };
    Lexer.prototype.lineToken = function() {
      var diff, indent, match, noNewlines, prev, size;
      if (!(match = MULTI_DENT.exec(this.chunk))) {
        return 0;
      }
      indent = match[0];
      this.line += count(indent, '\n');
      prev = last(this.tokens, 1);
      size = indent.length - 1 - indent.lastIndexOf('\n');
      noNewlines = this.unfinished();
      if (size - this.indebt === this.indent) {
        if (noNewlines) {
          this.suppressNewlines();
        } else {
          this.newlineToken();
        }
        return indent.length;
      }
      if (size > this.indent) {
        if (noNewlines) {
          this.indebt = size - this.indent;
          this.suppressNewlines();
          return indent.length;
        }
        diff = size - this.indent + this.outdebt;
        this.token('INDENT', diff);
        this.indents.push(diff);
        this.outdebt = this.indebt = 0;
      } else {
        this.indebt = 0;
        this.outdentToken(this.indent - size, noNewlines);
      }
      this.indent = size;
      return indent.length;
    };
    Lexer.prototype.outdentToken = function(moveOut, noNewlines, close) {
      var dent, len;
      while (moveOut > 0) {
        len = this.indents.length - 1;
        if (this.indents[len] === void 0) {
          moveOut = 0;
        } else if (this.indents[len] === this.outdebt) {
          moveOut -= this.outdebt;
          this.outdebt = 0;
        } else if (this.indents[len] < this.outdebt) {
          this.outdebt -= this.indents[len];
          moveOut -= this.indents[len];
        } else {
          dent = this.indents.pop() - this.outdebt;
          moveOut -= dent;
          this.outdebt = 0;
          this.token('OUTDENT', dent);
        }
      }
      if (dent) {
        this.outdebt -= moveOut;
      }
      if (!(this.tag() === 'TERMINATOR' || noNewlines)) {
        this.token('TERMINATOR', '\n');
      }
      return this;
    };
    Lexer.prototype.whitespaceToken = function() {
      var match, nline, prev;
      if (!((match = WHITESPACE.exec(this.chunk)) || (nline = this.chunk.charAt(0) === '\n'))) {
        return 0;
      }
      prev = last(this.tokens);
      if (prev) {
        prev[match ? 'spaced' : 'newLine'] = true;
      }
      if (match) {
        return match[0].length;
      } else {
        return 0;
      }
    };
    Lexer.prototype.newlineToken = function() {
      if (this.tag() !== 'TERMINATOR') {
        this.token('TERMINATOR', '\n');
      }
      return this;
    };
    Lexer.prototype.suppressNewlines = function() {
      if (this.value() === '\\') {
        this.tokens.pop();
      }
      return this;
    };
    Lexer.prototype.literalToken = function() {
      var match, prev, tag, value, _ref, _ref2, _ref3, _ref4;
      if (match = OPERATOR.exec(this.chunk)) {
        value = match[0];
        if (CODE.test(value)) {
          this.tagParameters();
        }
      } else {
        value = this.chunk.charAt(0);
      }
      tag = value;
      prev = last(this.tokens);
      if (value === '=' && prev) {
        if (!prev[1].reserved && (_ref = prev[1], __indexOf.call(JS_FORBIDDEN, _ref) >= 0)) {
          this.assignmentError();
        }
        if ((_ref2 = prev[1]) === '||' || _ref2 === '&&') {
          prev[0] = 'COMPOUND_ASSIGN';
          prev[1] += '=';
          return value.length;
        }
      }
      if (value === ';') {
        tag = 'TERMINATOR';
      } else if (__indexOf.call(MATH, value) >= 0) {
        tag = 'MATH';
      } else if (__indexOf.call(COMPARE, value) >= 0) {
        tag = 'COMPARE';
      } else if (__indexOf.call(COMPOUND_ASSIGN, value) >= 0) {
        tag = 'COMPOUND_ASSIGN';
      } else if (__indexOf.call(UNARY, value) >= 0) {
        tag = 'UNARY';
      } else if (__indexOf.call(SHIFT, value) >= 0) {
        tag = 'SHIFT';
      } else if (__indexOf.call(TYPE_ANNOTATE, value) >= 0) {
        tag = 'TYPE_ANNOTATE';
      } else if (__indexOf.call(LOGIC, value) >= 0 || value === '?' && (prev != null ? prev.spaced : void 0)) {
        tag = 'LOGIC';
      } else if (prev && !prev.spaced) {
        if (value === '(' && (_ref3 = prev[0], __indexOf.call(CALLABLE, _ref3) >= 0)) {
          if (prev[0] === '?') {
            prev[0] = 'FUNC_EXIST';
          }
          tag = 'CALL_START';
        } else if (value === '[' && (_ref4 = prev[0], __indexOf.call(INDEXABLE, _ref4) >= 0)) {
          tag = 'INDEX_START';
          switch (prev[0]) {
            case '?':
              prev[0] = 'INDEX_SOAK';
              break;
            case '::':
              prev[0] = 'INDEX_PROTO';
          }
        }
      }
      this.token(tag, value);
      return value.length;
    };
    Lexer.prototype.sanitizeHeredoc = function(doc, options) {
      var attempt, herecomment, indent, match, _ref;
      indent = options.indent, herecomment = options.herecomment;
      if (herecomment) {
        if (HEREDOC_ILLEGAL.test(doc)) {
          throw new Error("block comment cannot contain \"*/\", starting on line " + (this.line + 1));
        }
        if (doc.indexOf('\n') <= 0) {
          return doc;
        }
      } else {
        while (match = HEREDOC_INDENT.exec(doc)) {
          attempt = match[1];
          if (indent === null || (0 < (_ref = attempt.length) && _ref < indent.length)) {
            indent = attempt;
          }
        }
      }
      if (indent) {
        doc = doc.replace(RegExp("\\n" + indent, "g"), '\n');
      }
      if (!herecomment) {
        doc = doc.replace(/^\n/, '');
      }
      return doc;
    };
    Lexer.prototype.tagParameters = function() {
      var i, stack, tok, tokens;
      if (this.tag() !== ')') {
        return this;
      }
      stack = [];
      tokens = this.tokens;
      i = tokens.length;
      tokens[--i][0] = 'PARAM_END';
      while (tok = tokens[--i]) {
        switch (tok[0]) {
          case ')':
            stack.push(tok);
            break;
          case '(':
          case 'CALL_START':
            if (stack.length) {
              stack.pop();
            } else if (tok[0] === '(') {
              tok[0] = 'PARAM_START';
              return this;
            }
        }
      }
      return this;
    };
    Lexer.prototype.closeIndentation = function() {
      return this.outdentToken(this.indent);
    };
    Lexer.prototype.identifierError = function(word) {
      throw SyntaxError("Reserved word \"" + word + "\" on line " + (this.line + 1));
    };
    Lexer.prototype.assignmentError = function() {
      throw SyntaxError("Reserved word \"" + (this.value()) + "\" on line " + (this.line + 1) + " can't be assigned");
    };
    Lexer.prototype.balancedString = function(str, end) {
      var i, letter, prev, stack, _ref;
      stack = [end];
      for (i = 1, _ref = str.length; (1 <= _ref ? i < _ref : i > _ref); (1 <= _ref ? i += 1 : i -= 1)) {
        switch (letter = str.charAt(i)) {
          case '\\':
            i++;
            continue;
          case end:
            stack.pop();
            if (!stack.length) {
              return str.slice(0, i + 1);
            }
            end = stack[stack.length - 1];
            continue;
        }
        if (end === '}' && (letter === '"' || letter === "'")) {
          stack.push(end = letter);
        } else if (end === '}' && letter === '{') {
          stack.push(end = '}');
        } else if (end === '"' && prev === '#' && letter === '{') {
          stack.push(end = '}');
        }
        prev = letter;
      }
      throw new Error("missing " + (stack.pop()) + ", starting on line " + (this.line + 1));
    };
    Lexer.prototype.interpolateString = function(str, options) {
      var expr, heredoc, i, inner, interpolated, len, letter, nested, pi, regex, tag, tokens, value, _len, _ref, _ref2, _ref3;
      if (options == null) {
        options = {};
      }
      heredoc = options.heredoc, regex = options.regex;
      tokens = [];
      pi = 0;
      i = -1;
      while (letter = str.charAt(i += 1)) {
        if (letter === '\\') {
          i += 1;
          continue;
        }
        if (!(letter === '#' && str.charAt(i + 1) === '{' && (expr = this.balancedString(str.slice(i + 1), '}')))) {
          continue;
        }
        if (pi < i) {
          tokens.push(['NEOSTRING', str.slice(pi, i)]);
        }
        inner = expr.slice(1, -1);
        if (inner.length) {
          nested = new Lexer().tokenize(inner, {
            line: this.line,
            rewrite: false
          });
          nested.pop();
          if (((_ref = nested[0]) != null ? _ref[0] : void 0) === 'TERMINATOR') {
            nested.shift();
          }
          if (len = nested.length) {
            if (len > 1) {
              nested.unshift(['(', '(']);
              nested.push([')', ')']);
            }
            tokens.push(['TOKENS', nested]);
          }
        }
        i += expr.length;
        pi = i + 1;
      }
      if ((i > pi && pi < str.length)) {
        tokens.push(['NEOSTRING', str.slice(pi)]);
      }
      if (regex) {
        return tokens;
      }
      if (!tokens.length) {
        return this.token('STRING', '""');
      }
      if (tokens[0][0] !== 'NEOSTRING') {
        tokens.unshift(['', '']);
      }
      if (interpolated = tokens.length > 1) {
        this.token('(', '(');
      }
      for (i = 0, _len = tokens.length; i < _len; i++) {
        _ref2 = tokens[i], tag = _ref2[0], value = _ref2[1];
        if (i) {
          this.token('+', '+');
        }
        if (tag === 'TOKENS') {
          (_ref3 = this.tokens).push.apply(_ref3, value);
        } else {
          this.token('STRING', this.makeString(value, '"', heredoc));
        }
      }
      if (interpolated) {
        this.token(')', ')');
      }
      return tokens;
    };
    Lexer.prototype.token = function(tag, value) {
      return this.tokens.push([tag, value, this.line]);
    };
    Lexer.prototype.tag = function(index, tag) {
      var tok;
      return (tok = last(this.tokens, index)) && (tag ? tok[0] = tag : tok[0]);
    };
    Lexer.prototype.value = function(index, val) {
      var tok;
      return (tok = last(this.tokens, index)) && (val ? tok[1] = val : tok[1]);
    };
    Lexer.prototype.unfinished = function() {
      var prev, value;
      return LINE_CONTINUER.test(this.chunk) || (prev = last(this.tokens, 1)) && prev[0] !== '.' && (value = this.value()) && !value.reserved && NO_NEWLINE.test(value) && !CODE.test(value) && !ASSIGNED.test(this.chunk);
    };
    Lexer.prototype.escapeLines = function(str, heredoc) {
      return str.replace(MULTILINER, heredoc ? '\\n' : '');
    };
    Lexer.prototype.makeString = function(body, quote, heredoc) {
      if (!body) {
        return quote + quote;
      }
      body = body.replace(/\\([\s\S])/g, function(match, contents) {
        if (contents === '\n' || contents === quote) {
          return contents;
        } else {
          return match;
        }
      });
      body = body.replace(RegExp("" + quote, "g"), '\\$&');
      return quote + this.escapeLines(body, heredoc) + quote;
    };
    return Lexer;
  })();
  JS_KEYWORDS = ['true', 'false', 'null', 'this', 'new', 'delete', 'typeof', 'in', 'instanceof', 'return', 'throw', 'break', 'continue', 'debugger', 'if', 'else', 'switch', 'for', 'while', 'do', 'try', 'catch', 'finally', 'class', 'extends', 'super'];
  COFFEE_KEYWORDS = ['undefined', 'then', 'unless', 'until', 'loop', 'of', 'by', 'when'];
  for (op in COFFEE_ALIASES = {
    and: '&&',
    or: '||',
    is: '==',
    isnt: '!=',
    not: '!',
    yes: 'true',
    no: 'false',
    on: 'true',
    off: 'false'
  }) {
    COFFEE_KEYWORDS.push(op);
  }
  RESERVED = ['case', 'default', 'function', 'var', 'void', 'with', 'const', 'let', 'enum', 'export', 'import', 'native', '__hasProp', '__extends', '__slice', '__bind', '__indexOf'];
  JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
  exports.RESERVED = RESERVED.concat(JS_KEYWORDS).concat(COFFEE_KEYWORDS);
  IDENTIFIER = /^([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*)([^\n\S]*:(?!:))?/;
  NUMBER = /^0x[\da-f]+|^(?:\d+(\.\d+)?|\.\d+)(?:e[+-]?\d+)?/i;
  HEREDOC = /^("""|''')([\s\S]*?)(?:\n[^\n\S]*)?\1/;
  OPERATOR = /^(?:[-=]>|[-+*\/%<>&|^!?=]=|>>>=?|([-+:])\1|([&|<>])\2=?|<:|\?\.|\.{2,3})/;
  WHITESPACE = /^[^\n\S]+/;
  COMMENT = /^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)?$)|^(?:\s*#(?!##[^#]).*)+/;
  CODE = /^[-=]>/;
  MULTI_DENT = /^(?:\n[^\n\S]*)+/;
  SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
  JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
  REGEX = /^\/(?!\s)[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/[imgy]{0,4}(?!\w)/;
  HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
  HEREGEX_OMIT = /\s+(?:#.*)?/g;
  MULTILINER = /\n/g;
  HEREDOC_INDENT = /\n+([^\n\S]*)/g;
  HEREDOC_ILLEGAL = /\*\//;
  ASSIGNED = /^\s*@?([$A-Za-z_][$\w\x7f-\uffff]*|['"].*['"])[^\n\S]*?[:=][^:=>]/;
  LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|::)/;
  TRAILING_SPACES = /\s+$/;
  NO_NEWLINE = /^(?:[-+*&|\/%=<>!.\\][<>=&|]*|and|or|is(?:nt)?|n(?:ot|ew)|delete|typeof|instanceof)$/;
  COMPOUND_ASSIGN = ['-=', '+=', '/=', '*=', '%=', '||=', '&&=', '?=', '<<=', '>>=', '>>>=', '&=', '^=', '|='];
  UNARY = ['!', '~', 'NEW', 'TYPEOF', 'DELETE', 'DO'];
  LOGIC = ['&&', '||', '&', '|', '^'];
  SHIFT = ['<<', '>>', '>>>'];
  COMPARE = ['==', '!=', '<', '>', '<=', '>='];
  MATH = ['*', '/', '%'];
  TYPE_ANNOTATE = ['<:'];
  RELATION = ['IN', 'OF', 'INSTANCEOF'];
  BOOL = ['TRUE', 'FALSE', 'NULL', 'UNDEFINED'];
  NOT_REGEX = ['NUMBER', 'REGEX', 'BOOL', '++', '--', ']'];
  NOT_SPACED_REGEX = NOT_REGEX.concat(')', '}', 'THIS', 'IDENTIFIER', 'STRING');
  CALLABLE = ['IDENTIFIER', 'STRING', 'REGEX', ')', ']', '}', '?', '::', '@', 'THIS', 'SUPER'];
  INDEXABLE = CALLABLE.concat('NUMBER', 'BOOL');
  LINE_BREAK = ['INDENT', 'OUTDENT', 'TERMINATOR'];
}).call(this);

};require['./parser'] = new function() {
  var exports = this;
  /* Jison generated parser */
var parser = (function(){
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Root":3,"Body":4,"Block":5,"TERMINATOR":6,"Line":7,"Expression":8,"Statement":9,"Return":10,"Throw":11,"Comment":12,"STATEMENT":13,"Value":14,"Invocation":15,"Code":16,"Operation":17,"Assign":18,"If":19,"Try":20,"While":21,"For":22,"Switch":23,"Class":24,"INDENT":25,"OUTDENT":26,"Identifier":27,"IDENTIFIER":28,"AlphaNumeric":29,"NUMBER":30,"STRING":31,"Literal":32,"JS":33,"REGEX":34,"BOOL":35,"Assignable":36,"=":37,"AssignObj":38,"ObjAssignable":39,":":40,"ThisProperty":41,"RETURN":42,"HERECOMMENT":43,"PARAM_START":44,"ParamList":45,"PARAM_END":46,"FuncGlyph":47,"->":48,"=>":49,"OptComma":50,",":51,"Param":52,"ParamVar":53,"...":54,"Array":55,"Object":56,"Splat":57,"SimpleAssignable":58,"TYPE_ANNOTATE":59,"Accessor":60,"Parenthetical":61,"Range":62,"This":63,".":64,"?.":65,"::":66,"Index":67,"INDEX_START":68,"IndexValue":69,"INDEX_END":70,"INDEX_SOAK":71,"INDEX_PROTO":72,"Slice":73,"{":74,"AssignList":75,"}":76,"CLASS":77,"EXTENDS":78,"OptFuncExist":79,"Arguments":80,"SUPER":81,"FUNC_EXIST":82,"CALL_START":83,"CALL_END":84,"ArgList":85,"THIS":86,"@":87,"[":88,"]":89,"RangeDots":90,"..":91,"Arg":92,"SimpleArgs":93,"TRY":94,"Catch":95,"FINALLY":96,"CATCH":97,"THROW":98,"(":99,")":100,"WhileSource":101,"WHILE":102,"WHEN":103,"UNTIL":104,"Loop":105,"LOOP":106,"ForBody":107,"FOR":108,"ForStart":109,"ForSource":110,"ForVariables":111,"OWN":112,"ForValue":113,"FORIN":114,"FOROF":115,"BY":116,"SWITCH":117,"Whens":118,"ELSE":119,"When":120,"LEADING_WHEN":121,"IfBlock":122,"IF":123,"POST_IF":124,"UNARY":125,"-":126,"+":127,"--":128,"++":129,"?":130,"MATH":131,"SHIFT":132,"COMPARE":133,"LOGIC":134,"RELATION":135,"COMPOUND_ASSIGN":136,"$accept":0,"$end":1},
terminals_: {2:"error",6:"TERMINATOR",13:"STATEMENT",25:"INDENT",26:"OUTDENT",28:"IDENTIFIER",30:"NUMBER",31:"STRING",33:"JS",34:"REGEX",35:"BOOL",37:"=",40:":",42:"RETURN",43:"HERECOMMENT",44:"PARAM_START",46:"PARAM_END",48:"->",49:"=>",51:",",54:"...",59:"TYPE_ANNOTATE",64:".",65:"?.",66:"::",68:"INDEX_START",70:"INDEX_END",71:"INDEX_SOAK",72:"INDEX_PROTO",74:"{",76:"}",77:"CLASS",78:"EXTENDS",81:"SUPER",82:"FUNC_EXIST",83:"CALL_START",84:"CALL_END",86:"THIS",87:"@",88:"[",89:"]",91:"..",94:"TRY",96:"FINALLY",97:"CATCH",98:"THROW",99:"(",100:")",102:"WHILE",103:"WHEN",104:"UNTIL",106:"LOOP",108:"FOR",112:"OWN",114:"FORIN",115:"FOROF",116:"BY",117:"SWITCH",119:"ELSE",121:"LEADING_WHEN",123:"IF",124:"POST_IF",125:"UNARY",126:"-",127:"+",128:"--",129:"++",130:"?",131:"MATH",132:"SHIFT",133:"COMPARE",134:"LOGIC",135:"RELATION",136:"COMPOUND_ASSIGN"},
productions_: [0,[3,0],[3,1],[3,2],[4,1],[4,3],[4,2],[7,1],[7,1],[9,1],[9,1],[9,1],[9,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[8,1],[5,2],[5,3],[27,1],[29,1],[29,1],[32,1],[32,1],[32,1],[32,1],[18,3],[18,5],[38,1],[38,3],[38,5],[38,1],[39,1],[39,1],[39,1],[10,2],[10,1],[12,1],[16,5],[16,2],[47,1],[47,1],[50,0],[50,1],[45,0],[45,1],[45,3],[52,1],[52,2],[52,3],[53,1],[53,1],[53,1],[53,1],[57,2],[58,1],[58,3],[58,2],[58,2],[58,1],[36,1],[36,1],[36,1],[14,1],[14,1],[14,1],[14,1],[14,1],[60,2],[60,2],[60,2],[60,1],[60,1],[67,3],[67,2],[67,2],[69,1],[69,1],[56,4],[75,0],[75,1],[75,3],[75,4],[75,6],[24,1],[24,2],[24,3],[24,4],[24,2],[24,3],[24,4],[24,5],[15,3],[15,3],[15,1],[15,2],[79,0],[79,1],[80,2],[80,4],[63,1],[63,1],[41,2],[55,2],[55,4],[90,1],[90,1],[62,5],[73,3],[73,2],[73,2],[85,1],[85,3],[85,4],[85,4],[85,6],[92,1],[92,1],[93,1],[93,3],[20,2],[20,3],[20,4],[20,5],[95,3],[11,2],[61,3],[61,5],[101,2],[101,4],[101,2],[101,4],[21,2],[21,2],[21,2],[21,1],[105,2],[105,2],[22,2],[22,2],[22,2],[107,2],[107,2],[109,2],[109,3],[113,1],[113,1],[113,1],[111,1],[111,3],[110,2],[110,2],[110,4],[110,4],[110,4],[110,6],[110,6],[23,5],[23,7],[23,4],[23,6],[118,1],[118,2],[120,3],[120,4],[122,3],[122,5],[19,1],[19,3],[19,3],[19,3],[17,2],[17,2],[17,2],[17,2],[17,2],[17,2],[17,2],[17,2],[17,3],[17,3],[17,3],[17,3],[17,3],[17,3],[17,3],[17,3],[17,5],[17,3]],
performAction: function anonymous(yytext,yyleng,yylineno,yy,yystate,$$) {

var $0 = $$.length - 1;
switch (yystate) {
case 1:return this.$ = new yy.Block;
break;
case 2:return this.$ = $$[$0];
break;
case 3:return this.$ = $$[$0-1];
break;
case 4:this.$ = yy.Block.wrap([$$[$0]]);
break;
case 5:this.$ = $$[$0-2].push($$[$0]);
break;
case 6:this.$ = $$[$0-1];
break;
case 7:this.$ = $$[$0];
break;
case 8:this.$ = $$[$0];
break;
case 9:this.$ = $$[$0];
break;
case 10:this.$ = $$[$0];
break;
case 11:this.$ = $$[$0];
break;
case 12:this.$ = new yy.Literal($$[$0]);
break;
case 13:this.$ = $$[$0];
break;
case 14:this.$ = $$[$0];
break;
case 15:this.$ = $$[$0];
break;
case 16:this.$ = $$[$0];
break;
case 17:this.$ = $$[$0];
break;
case 18:this.$ = $$[$0];
break;
case 19:this.$ = $$[$0];
break;
case 20:this.$ = $$[$0];
break;
case 21:this.$ = $$[$0];
break;
case 22:this.$ = $$[$0];
break;
case 23:this.$ = $$[$0];
break;
case 24:this.$ = new yy.Block;
break;
case 25:this.$ = $$[$0-1];
break;
case 26:this.$ = new yy.Literal($$[$0]);
break;
case 27:this.$ = new yy.Literal($$[$0]);
break;
case 28:this.$ = new yy.Literal($$[$0]);
break;
case 29:this.$ = $$[$0];
break;
case 30:this.$ = new yy.Literal($$[$0]);
break;
case 31:this.$ = new yy.Literal($$[$0]);
break;
case 32:this.$ = (function () {
        /** @type {function () {
      return this.typeAnnotation;
    }} */
        var val;
        val = new yy.Literal($$[$0]);
        if ($$[$0] === 'undefined') {
          val.isUndefined = true;
        }
        return val;
      }());
break;
case 33:this.$ = new yy.Assign($$[$0-2], $$[$0]);
break;
case 34:this.$ = new yy.Assign($$[$0-4], $$[$0-1]);
break;
case 35:this.$ = new yy.Value($$[$0]);
break;
case 36:this.$ = new yy.Assign(new yy.Value($$[$0-2]), $$[$0], 'object');
break;
case 37:this.$ = new yy.Assign(new yy.Value($$[$0-4]), $$[$0-1], 'object');
break;
case 38:this.$ = $$[$0];
break;
case 39:this.$ = $$[$0];
break;
case 40:this.$ = $$[$0];
break;
case 41:this.$ = $$[$0];
break;
case 42:this.$ = new yy.Return($$[$0]);
break;
case 43:this.$ = new yy.Return;
break;
case 44:this.$ = new yy.Comment($$[$0]);
break;
case 45:this.$ = new yy.Code($$[$0-3], $$[$0], $$[$0-1]);
break;
case 46:this.$ = new yy.Code([], $$[$0], $$[$0-1]);
break;
case 47:this.$ = 'func';
break;
case 48:this.$ = 'boundfunc';
break;
case 49:this.$ = $$[$0];
break;
case 50:this.$ = $$[$0];
break;
case 51:this.$ = [];
break;
case 52:this.$ = [$$[$0]];
break;
case 53:this.$ = $$[$0-2].concat($$[$0]);
break;
case 54:this.$ = new yy.Param($$[$0]);
break;
case 55:this.$ = new yy.Param($$[$0-1], null, true);
break;
case 56:this.$ = new yy.Param($$[$0-2], $$[$0]);
break;
case 57:this.$ = $$[$0];
break;
case 58:this.$ = $$[$0];
break;
case 59:this.$ = $$[$0];
break;
case 60:this.$ = $$[$0];
break;
case 61:this.$ = new yy.Splat($$[$0-1]);
break;
case 62:this.$ = new yy.Value($$[$0]);
break;
case 63:this.$ = (new yy.Value($$[$0-2])).typeAnnotate($$[$0]);
break;
case 64:this.$ = $$[$0-1].push($$[$0]);
break;
case 65:this.$ = new yy.Value($$[$0-1], [$$[$0]]);
break;
case 66:this.$ = $$[$0];
break;
case 67:this.$ = $$[$0];
break;
case 68:this.$ = new yy.Value($$[$0]);
break;
case 69:this.$ = new yy.Value($$[$0]);
break;
case 70:this.$ = $$[$0];
break;
case 71:this.$ = new yy.Value($$[$0]);
break;
case 72:this.$ = new yy.Value($$[$0]);
break;
case 73:this.$ = new yy.Value($$[$0]);
break;
case 74:this.$ = $$[$0];
break;
case 75:this.$ = new yy.Access($$[$0]);
break;
case 76:this.$ = new yy.Access($$[$0], 'soak');
break;
case 77:this.$ = new yy.Access($$[$0], 'proto');
break;
case 78:this.$ = new yy.Access(new yy.Literal('prototype'));
break;
case 79:this.$ = $$[$0];
break;
case 80:this.$ = $$[$0-1];
break;
case 81:this.$ = yy.extend($$[$0], {
          soak: true
        });
break;
case 82:this.$ = yy.extend($$[$0], {
          proto: true
        });
break;
case 83:this.$ = new yy.Index($$[$0]);
break;
case 84:this.$ = new yy.Slice($$[$0]);
break;
case 85:this.$ = new yy.Obj($$[$0-2], $$[$0-3].generated);
break;
case 86:this.$ = [];
break;
case 87:this.$ = [$$[$0]];
break;
case 88:this.$ = $$[$0-2].concat($$[$0]);
break;
case 89:this.$ = $$[$0-3].concat($$[$0]);
break;
case 90:this.$ = $$[$0-5].concat($$[$0-2]);
break;
case 91:this.$ = new yy.Class;
break;
case 92:this.$ = new yy.Class(null, null, $$[$0]);
break;
case 93:this.$ = new yy.Class(null, $$[$0]);
break;
case 94:this.$ = new yy.Class(null, $$[$0-1], $$[$0]);
break;
case 95:this.$ = new yy.Class($$[$0]);
break;
case 96:this.$ = new yy.Class($$[$0-1], null, $$[$0]);
break;
case 97:this.$ = new yy.Class($$[$0-2], $$[$0]);
break;
case 98:this.$ = new yy.Class($$[$0-3], $$[$0-1], $$[$0]);
break;
case 99:this.$ = new yy.Call($$[$0-2], $$[$0], $$[$0-1]);
break;
case 100:this.$ = new yy.Call($$[$0-2], $$[$0], $$[$0-1]);
break;
case 101:this.$ = new yy.Call('super', [new yy.Splat(new yy.Literal('arguments'))]);
break;
case 102:this.$ = new yy.Call('super', $$[$0]);
break;
case 103:this.$ = false;
break;
case 104:this.$ = true;
break;
case 105:this.$ = [];
break;
case 106:this.$ = $$[$0-2];
break;
case 107:this.$ = new yy.Value(new yy.Literal('this'));
break;
case 108:this.$ = new yy.Value(new yy.Literal('this'));
break;
case 109:this.$ = new yy.Value(new yy.Literal('this'), [new yy.Access($$[$0])], 'this');
break;
case 110:this.$ = new yy.Arr([]);
break;
case 111:this.$ = new yy.Arr($$[$0-2]);
break;
case 112:this.$ = 'inclusive';
break;
case 113:this.$ = 'exclusive';
break;
case 114:this.$ = new yy.Range($$[$0-3], $$[$0-1], $$[$0-2]);
break;
case 115:this.$ = new yy.Range($$[$0-2], $$[$0], $$[$0-1]);
break;
case 116:this.$ = new yy.Range($$[$0-1], null, $$[$0]);
break;
case 117:this.$ = new yy.Range(null, $$[$0], $$[$0-1]);
break;
case 118:this.$ = [$$[$0]];
break;
case 119:this.$ = $$[$0-2].concat($$[$0]);
break;
case 120:this.$ = $$[$0-3].concat($$[$0]);
break;
case 121:this.$ = $$[$0-2];
break;
case 122:this.$ = $$[$0-5].concat($$[$0-2]);
break;
case 123:this.$ = $$[$0];
break;
case 124:this.$ = $$[$0];
break;
case 125:this.$ = $$[$0];
break;
case 126:this.$ = [].concat($$[$0-2], $$[$0]);
break;
case 127:this.$ = new yy.Try($$[$0]);
break;
case 128:this.$ = new yy.Try($$[$0-1], $$[$0][0], $$[$0][1]);
break;
case 129:this.$ = new yy.Try($$[$0-2], null, null, $$[$0]);
break;
case 130:this.$ = new yy.Try($$[$0-3], $$[$0-2][0], $$[$0-2][1], $$[$0]);
break;
case 131:this.$ = [$$[$0-1], $$[$0]];
break;
case 132:this.$ = new yy.Throw($$[$0]);
break;
case 133:this.$ = new yy.Parens($$[$0-1]);
break;
case 134:this.$ = new yy.Parens($$[$0-2]);
break;
case 135:this.$ = new yy.While($$[$0]);
break;
case 136:this.$ = new yy.While($$[$0-2], {
          guard: $$[$0]
        });
break;
case 137:this.$ = new yy.While($$[$0], {
          invert: true
        });
break;
case 138:this.$ = new yy.While($$[$0-2], {
          invert: true,
          guard: $$[$0]
        });
break;
case 139:this.$ = $$[$0-1].addBody($$[$0]);
break;
case 140:this.$ = $$[$0].addBody(yy.Block.wrap([$$[$0-1]]));
break;
case 141:this.$ = $$[$0].addBody(yy.Block.wrap([$$[$0-1]]));
break;
case 142:this.$ = $$[$0];
break;
case 143:this.$ = new yy.While(new yy.Literal('true')).addBody($$[$0]);
break;
case 144:this.$ = new yy.While(new yy.Literal('true')).addBody(yy.Block.wrap([$$[$0]]));
break;
case 145:this.$ = new yy.For($$[$0-1], $$[$0]);
break;
case 146:this.$ = new yy.For($$[$0-1], $$[$0]);
break;
case 147:this.$ = new yy.For($$[$0], $$[$0-1]);
break;
case 148:this.$ = {
          source: new yy.Value($$[$0])
        };
break;
case 149:this.$ = (function () {
        $$[$0].own = $$[$0-1].own;
        $$[$0].name = $$[$0-1][0];
        $$[$0].index = $$[$0-1][1];
        return $$[$0];
      }());
break;
case 150:this.$ = $$[$0];
break;
case 151:this.$ = (function () {
        $$[$0].own = true;
        return $$[$0];
      }());
break;
case 152:this.$ = $$[$0];
break;
case 153:this.$ = new yy.Value($$[$0]);
break;
case 154:this.$ = new yy.Value($$[$0]);
break;
case 155:this.$ = [$$[$0]];
break;
case 156:this.$ = [$$[$0-2], $$[$0]];
break;
case 157:this.$ = {
          source: $$[$0]
        };
break;
case 158:this.$ = {
          source: $$[$0],
          object: true
        };
break;
case 159:this.$ = {
          source: $$[$0-2],
          guard: $$[$0]
        };
break;
case 160:this.$ = {
          source: $$[$0-2],
          guard: $$[$0],
          object: true
        };
break;
case 161:this.$ = {
          source: $$[$0-2],
          step: $$[$0]
        };
break;
case 162:this.$ = {
          source: $$[$0-4],
          guard: $$[$0-2],
          step: $$[$0]
        };
break;
case 163:this.$ = {
          source: $$[$0-4],
          step: $$[$0-2],
          guard: $$[$0]
        };
break;
case 164:this.$ = new yy.Switch($$[$0-3], $$[$0-1]);
break;
case 165:this.$ = new yy.Switch($$[$0-5], $$[$0-3], $$[$0-1]);
break;
case 166:this.$ = new yy.Switch(null, $$[$0-1]);
break;
case 167:this.$ = new yy.Switch(null, $$[$0-3], $$[$0-1]);
break;
case 168:this.$ = $$[$0];
break;
case 169:this.$ = $$[$0-1].concat($$[$0]);
break;
case 170:this.$ = [[$$[$0-1], $$[$0]]];
break;
case 171:this.$ = [[$$[$0-2], $$[$0-1]]];
break;
case 172:this.$ = new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        });
break;
case 173:this.$ = $$[$0-4].addElse(new yy.If($$[$0-1], $$[$0], {
          type: $$[$0-2]
        }));
break;
case 174:this.$ = $$[$0];
break;
case 175:this.$ = $$[$0-2].addElse($$[$0]);
break;
case 176:this.$ = new yy.If($$[$0], yy.Block.wrap([$$[$0-2]]), {
          type: $$[$0-1],
          statement: true
        });
break;
case 177:this.$ = new yy.If($$[$0], yy.Block.wrap([$$[$0-2]]), {
          type: $$[$0-1],
          statement: true
        });
break;
case 178:this.$ = new yy.Op($$[$0-1], $$[$0]);
break;
case 179:this.$ = new yy.Op('-', $$[$0]);
break;
case 180:this.$ = new yy.Op('+', $$[$0]);
break;
case 181:this.$ = new yy.Op('--', $$[$0]);
break;
case 182:this.$ = new yy.Op('++', $$[$0]);
break;
case 183:this.$ = new yy.Op('--', $$[$0-1], null, true);
break;
case 184:this.$ = new yy.Op('++', $$[$0-1], null, true);
break;
case 185:this.$ = new yy.Existence($$[$0-1]);
break;
case 186:this.$ = new yy.Op('+', $$[$0-2], $$[$0]);
break;
case 187:this.$ = new yy.Op('-', $$[$0-2], $$[$0]);
break;
case 188:this.$ = new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
break;
case 189:this.$ = new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
break;
case 190:this.$ = new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
break;
case 191:this.$ = new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
break;
case 192:this.$ = (function () {
        if ($$[$0-1].charAt(0) === '!') {
          return new yy.Op($$[$0-1].slice(1), $$[$0-2], $$[$0]).invert();
        } else {
          return new yy.Op($$[$0-1], $$[$0-2], $$[$0]);
        }
      }());
break;
case 193:this.$ = new yy.Assign($$[$0-2], $$[$0], $$[$0-1]);
break;
case 194:this.$ = new yy.Assign($$[$0-4], $$[$0-1], $$[$0-3]);
break;
case 195:this.$ = new yy.Extends($$[$0-2], $$[$0]);
break;
}
},
table: [{1:[2,1],3:1,4:2,5:3,7:4,8:6,9:7,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,5],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[3]},{1:[2,2],6:[1,71]},{6:[1,72]},{1:[2,4],6:[2,4],26:[2,4],100:[2,4]},{4:74,7:4,8:6,9:7,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,26:[1,73],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,7],6:[2,7],26:[2,7],100:[2,7],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,8],6:[2,8],26:[2,8],100:[2,8],101:87,102:[1,62],104:[1,63],107:88,108:[1,65],109:66,124:[1,86]},{1:[2,13],6:[2,13],25:[2,13],26:[2,13],46:[2,13],51:[2,13],54:[2,13],60:90,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],70:[2,13],71:[1,97],72:[1,98],76:[2,13],79:89,82:[1,91],83:[2,103],84:[2,13],89:[2,13],91:[2,13],100:[2,13],102:[2,13],103:[2,13],104:[2,13],108:[2,13],116:[2,13],124:[2,13],126:[2,13],127:[2,13],130:[2,13],131:[2,13],132:[2,13],133:[2,13],134:[2,13],135:[2,13]},{1:[2,14],6:[2,14],25:[2,14],26:[2,14],46:[2,14],51:[2,14],54:[2,14],60:100,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],70:[2,14],71:[1,97],72:[1,98],76:[2,14],79:99,82:[1,91],83:[2,103],84:[2,14],89:[2,14],91:[2,14],100:[2,14],102:[2,14],103:[2,14],104:[2,14],108:[2,14],116:[2,14],124:[2,14],126:[2,14],127:[2,14],130:[2,14],131:[2,14],132:[2,14],133:[2,14],134:[2,14],135:[2,14]},{1:[2,15],6:[2,15],25:[2,15],26:[2,15],46:[2,15],51:[2,15],54:[2,15],70:[2,15],76:[2,15],84:[2,15],89:[2,15],91:[2,15],100:[2,15],102:[2,15],103:[2,15],104:[2,15],108:[2,15],116:[2,15],124:[2,15],126:[2,15],127:[2,15],130:[2,15],131:[2,15],132:[2,15],133:[2,15],134:[2,15],135:[2,15]},{1:[2,16],6:[2,16],25:[2,16],26:[2,16],46:[2,16],51:[2,16],54:[2,16],70:[2,16],76:[2,16],84:[2,16],89:[2,16],91:[2,16],100:[2,16],102:[2,16],103:[2,16],104:[2,16],108:[2,16],116:[2,16],124:[2,16],126:[2,16],127:[2,16],130:[2,16],131:[2,16],132:[2,16],133:[2,16],134:[2,16],135:[2,16]},{1:[2,17],6:[2,17],25:[2,17],26:[2,17],46:[2,17],51:[2,17],54:[2,17],70:[2,17],76:[2,17],84:[2,17],89:[2,17],91:[2,17],100:[2,17],102:[2,17],103:[2,17],104:[2,17],108:[2,17],116:[2,17],124:[2,17],126:[2,17],127:[2,17],130:[2,17],131:[2,17],132:[2,17],133:[2,17],134:[2,17],135:[2,17]},{1:[2,18],6:[2,18],25:[2,18],26:[2,18],46:[2,18],51:[2,18],54:[2,18],70:[2,18],76:[2,18],84:[2,18],89:[2,18],91:[2,18],100:[2,18],102:[2,18],103:[2,18],104:[2,18],108:[2,18],116:[2,18],124:[2,18],126:[2,18],127:[2,18],130:[2,18],131:[2,18],132:[2,18],133:[2,18],134:[2,18],135:[2,18]},{1:[2,19],6:[2,19],25:[2,19],26:[2,19],46:[2,19],51:[2,19],54:[2,19],70:[2,19],76:[2,19],84:[2,19],89:[2,19],91:[2,19],100:[2,19],102:[2,19],103:[2,19],104:[2,19],108:[2,19],116:[2,19],124:[2,19],126:[2,19],127:[2,19],130:[2,19],131:[2,19],132:[2,19],133:[2,19],134:[2,19],135:[2,19]},{1:[2,20],6:[2,20],25:[2,20],26:[2,20],46:[2,20],51:[2,20],54:[2,20],70:[2,20],76:[2,20],84:[2,20],89:[2,20],91:[2,20],100:[2,20],102:[2,20],103:[2,20],104:[2,20],108:[2,20],116:[2,20],124:[2,20],126:[2,20],127:[2,20],130:[2,20],131:[2,20],132:[2,20],133:[2,20],134:[2,20],135:[2,20]},{1:[2,21],6:[2,21],25:[2,21],26:[2,21],46:[2,21],51:[2,21],54:[2,21],70:[2,21],76:[2,21],84:[2,21],89:[2,21],91:[2,21],100:[2,21],102:[2,21],103:[2,21],104:[2,21],108:[2,21],116:[2,21],124:[2,21],126:[2,21],127:[2,21],130:[2,21],131:[2,21],132:[2,21],133:[2,21],134:[2,21],135:[2,21]},{1:[2,22],6:[2,22],25:[2,22],26:[2,22],46:[2,22],51:[2,22],54:[2,22],70:[2,22],76:[2,22],84:[2,22],89:[2,22],91:[2,22],100:[2,22],102:[2,22],103:[2,22],104:[2,22],108:[2,22],116:[2,22],124:[2,22],126:[2,22],127:[2,22],130:[2,22],131:[2,22],132:[2,22],133:[2,22],134:[2,22],135:[2,22]},{1:[2,23],6:[2,23],25:[2,23],26:[2,23],46:[2,23],51:[2,23],54:[2,23],70:[2,23],76:[2,23],84:[2,23],89:[2,23],91:[2,23],100:[2,23],102:[2,23],103:[2,23],104:[2,23],108:[2,23],116:[2,23],124:[2,23],126:[2,23],127:[2,23],130:[2,23],131:[2,23],132:[2,23],133:[2,23],134:[2,23],135:[2,23]},{1:[2,9],6:[2,9],26:[2,9],100:[2,9],102:[2,9],104:[2,9],108:[2,9],124:[2,9]},{1:[2,10],6:[2,10],26:[2,10],100:[2,10],102:[2,10],104:[2,10],108:[2,10],124:[2,10]},{1:[2,11],6:[2,11],26:[2,11],100:[2,11],102:[2,11],104:[2,11],108:[2,11],124:[2,11]},{1:[2,12],6:[2,12],26:[2,12],100:[2,12],102:[2,12],104:[2,12],108:[2,12],124:[2,12]},{1:[2,70],6:[2,70],25:[2,70],26:[2,70],37:[1,101],46:[2,70],51:[2,70],54:[2,70],64:[2,70],65:[2,70],66:[2,70],68:[2,70],70:[2,70],71:[2,70],72:[2,70],76:[2,70],82:[2,70],83:[2,70],84:[2,70],89:[2,70],91:[2,70],100:[2,70],102:[2,70],103:[2,70],104:[2,70],108:[2,70],116:[2,70],124:[2,70],126:[2,70],127:[2,70],130:[2,70],131:[2,70],132:[2,70],133:[2,70],134:[2,70],135:[2,70]},{1:[2,71],6:[2,71],25:[2,71],26:[2,71],46:[2,71],51:[2,71],54:[2,71],64:[2,71],65:[2,71],66:[2,71],68:[2,71],70:[2,71],71:[2,71],72:[2,71],76:[2,71],82:[2,71],83:[2,71],84:[2,71],89:[2,71],91:[2,71],100:[2,71],102:[2,71],103:[2,71],104:[2,71],108:[2,71],116:[2,71],124:[2,71],126:[2,71],127:[2,71],130:[2,71],131:[2,71],132:[2,71],133:[2,71],134:[2,71],135:[2,71]},{1:[2,72],6:[2,72],25:[2,72],26:[2,72],46:[2,72],51:[2,72],54:[2,72],64:[2,72],65:[2,72],66:[2,72],68:[2,72],70:[2,72],71:[2,72],72:[2,72],76:[2,72],82:[2,72],83:[2,72],84:[2,72],89:[2,72],91:[2,72],100:[2,72],102:[2,72],103:[2,72],104:[2,72],108:[2,72],116:[2,72],124:[2,72],126:[2,72],127:[2,72],130:[2,72],131:[2,72],132:[2,72],133:[2,72],134:[2,72],135:[2,72]},{1:[2,73],6:[2,73],25:[2,73],26:[2,73],46:[2,73],51:[2,73],54:[2,73],64:[2,73],65:[2,73],66:[2,73],68:[2,73],70:[2,73],71:[2,73],72:[2,73],76:[2,73],82:[2,73],83:[2,73],84:[2,73],89:[2,73],91:[2,73],100:[2,73],102:[2,73],103:[2,73],104:[2,73],108:[2,73],116:[2,73],124:[2,73],126:[2,73],127:[2,73],130:[2,73],131:[2,73],132:[2,73],133:[2,73],134:[2,73],135:[2,73]},{1:[2,74],6:[2,74],25:[2,74],26:[2,74],46:[2,74],51:[2,74],54:[2,74],64:[2,74],65:[2,74],66:[2,74],68:[2,74],70:[2,74],71:[2,74],72:[2,74],76:[2,74],82:[2,74],83:[2,74],84:[2,74],89:[2,74],91:[2,74],100:[2,74],102:[2,74],103:[2,74],104:[2,74],108:[2,74],116:[2,74],124:[2,74],126:[2,74],127:[2,74],130:[2,74],131:[2,74],132:[2,74],133:[2,74],134:[2,74],135:[2,74]},{1:[2,101],6:[2,101],25:[2,101],26:[2,101],46:[2,101],51:[2,101],54:[2,101],64:[2,101],65:[2,101],66:[2,101],68:[2,101],70:[2,101],71:[2,101],72:[2,101],76:[2,101],80:102,82:[2,101],83:[1,103],84:[2,101],89:[2,101],91:[2,101],100:[2,101],102:[2,101],103:[2,101],104:[2,101],108:[2,101],116:[2,101],124:[2,101],126:[2,101],127:[2,101],130:[2,101],131:[2,101],132:[2,101],133:[2,101],134:[2,101],135:[2,101]},{27:107,28:[1,70],41:108,45:104,46:[2,51],51:[2,51],52:105,53:106,55:109,56:110,74:[1,67],87:[1,111],88:[1,112]},{5:113,25:[1,5]},{8:114,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:116,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:117,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{14:119,15:120,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:121,41:60,55:47,56:48,58:118,61:25,62:26,63:27,74:[1,67],81:[1,28],86:[1,55],87:[1,56],88:[1,54],99:[1,53]},{14:119,15:120,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:121,41:60,55:47,56:48,58:122,61:25,62:26,63:27,74:[1,67],81:[1,28],86:[1,55],87:[1,56],88:[1,54],99:[1,53]},{1:[2,67],6:[2,67],25:[2,67],26:[2,67],37:[2,67],46:[2,67],51:[2,67],54:[2,67],64:[2,67],65:[2,67],66:[2,67],68:[2,67],70:[2,67],71:[2,67],72:[2,67],76:[2,67],78:[1,126],82:[2,67],83:[2,67],84:[2,67],89:[2,67],91:[2,67],100:[2,67],102:[2,67],103:[2,67],104:[2,67],108:[2,67],116:[2,67],124:[2,67],126:[2,67],127:[2,67],128:[1,123],129:[1,124],130:[2,67],131:[2,67],132:[2,67],133:[2,67],134:[2,67],135:[2,67],136:[1,125]},{1:[2,174],6:[2,174],25:[2,174],26:[2,174],46:[2,174],51:[2,174],54:[2,174],70:[2,174],76:[2,174],84:[2,174],89:[2,174],91:[2,174],100:[2,174],102:[2,174],103:[2,174],104:[2,174],108:[2,174],116:[2,174],119:[1,127],124:[2,174],126:[2,174],127:[2,174],130:[2,174],131:[2,174],132:[2,174],133:[2,174],134:[2,174],135:[2,174]},{5:128,25:[1,5]},{5:129,25:[1,5]},{1:[2,142],6:[2,142],25:[2,142],26:[2,142],46:[2,142],51:[2,142],54:[2,142],70:[2,142],76:[2,142],84:[2,142],89:[2,142],91:[2,142],100:[2,142],102:[2,142],103:[2,142],104:[2,142],108:[2,142],116:[2,142],124:[2,142],126:[2,142],127:[2,142],130:[2,142],131:[2,142],132:[2,142],133:[2,142],134:[2,142],135:[2,142]},{5:130,25:[1,5]},{8:131,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,132],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,91],5:133,6:[2,91],14:119,15:120,25:[1,5],26:[2,91],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:121,41:60,46:[2,91],51:[2,91],54:[2,91],55:47,56:48,58:135,61:25,62:26,63:27,70:[2,91],74:[1,67],76:[2,91],78:[1,134],81:[1,28],84:[2,91],86:[1,55],87:[1,56],88:[1,54],89:[2,91],91:[2,91],99:[1,53],100:[2,91],102:[2,91],103:[2,91],104:[2,91],108:[2,91],116:[2,91],124:[2,91],126:[2,91],127:[2,91],130:[2,91],131:[2,91],132:[2,91],133:[2,91],134:[2,91],135:[2,91]},{1:[2,43],6:[2,43],8:136,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,26:[2,43],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],100:[2,43],101:39,102:[2,43],104:[2,43],105:40,106:[1,64],107:41,108:[2,43],109:66,117:[1,42],122:37,123:[1,61],124:[2,43],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:137,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,44],6:[2,44],25:[2,44],26:[2,44],51:[2,44],76:[2,44],100:[2,44],102:[2,44],104:[2,44],108:[2,44],124:[2,44]},{1:[2,68],6:[2,68],25:[2,68],26:[2,68],37:[2,68],46:[2,68],51:[2,68],54:[2,68],64:[2,68],65:[2,68],66:[2,68],68:[2,68],70:[2,68],71:[2,68],72:[2,68],76:[2,68],82:[2,68],83:[2,68],84:[2,68],89:[2,68],91:[2,68],100:[2,68],102:[2,68],103:[2,68],104:[2,68],108:[2,68],116:[2,68],124:[2,68],126:[2,68],127:[2,68],130:[2,68],131:[2,68],132:[2,68],133:[2,68],134:[2,68],135:[2,68]},{1:[2,69],6:[2,69],25:[2,69],26:[2,69],37:[2,69],46:[2,69],51:[2,69],54:[2,69],64:[2,69],65:[2,69],66:[2,69],68:[2,69],70:[2,69],71:[2,69],72:[2,69],76:[2,69],82:[2,69],83:[2,69],84:[2,69],89:[2,69],91:[2,69],100:[2,69],102:[2,69],103:[2,69],104:[2,69],108:[2,69],116:[2,69],124:[2,69],126:[2,69],127:[2,69],130:[2,69],131:[2,69],132:[2,69],133:[2,69],134:[2,69],135:[2,69]},{1:[2,29],6:[2,29],25:[2,29],26:[2,29],46:[2,29],51:[2,29],54:[2,29],64:[2,29],65:[2,29],66:[2,29],68:[2,29],70:[2,29],71:[2,29],72:[2,29],76:[2,29],82:[2,29],83:[2,29],84:[2,29],89:[2,29],91:[2,29],100:[2,29],102:[2,29],103:[2,29],104:[2,29],108:[2,29],116:[2,29],124:[2,29],126:[2,29],127:[2,29],130:[2,29],131:[2,29],132:[2,29],133:[2,29],134:[2,29],135:[2,29]},{1:[2,30],6:[2,30],25:[2,30],26:[2,30],46:[2,30],51:[2,30],54:[2,30],64:[2,30],65:[2,30],66:[2,30],68:[2,30],70:[2,30],71:[2,30],72:[2,30],76:[2,30],82:[2,30],83:[2,30],84:[2,30],89:[2,30],91:[2,30],100:[2,30],102:[2,30],103:[2,30],104:[2,30],108:[2,30],116:[2,30],124:[2,30],126:[2,30],127:[2,30],130:[2,30],131:[2,30],132:[2,30],133:[2,30],134:[2,30],135:[2,30]},{1:[2,31],6:[2,31],25:[2,31],26:[2,31],46:[2,31],51:[2,31],54:[2,31],64:[2,31],65:[2,31],66:[2,31],68:[2,31],70:[2,31],71:[2,31],72:[2,31],76:[2,31],82:[2,31],83:[2,31],84:[2,31],89:[2,31],91:[2,31],100:[2,31],102:[2,31],103:[2,31],104:[2,31],108:[2,31],116:[2,31],124:[2,31],126:[2,31],127:[2,31],130:[2,31],131:[2,31],132:[2,31],133:[2,31],134:[2,31],135:[2,31]},{1:[2,32],6:[2,32],25:[2,32],26:[2,32],46:[2,32],51:[2,32],54:[2,32],64:[2,32],65:[2,32],66:[2,32],68:[2,32],70:[2,32],71:[2,32],72:[2,32],76:[2,32],82:[2,32],83:[2,32],84:[2,32],89:[2,32],91:[2,32],100:[2,32],102:[2,32],103:[2,32],104:[2,32],108:[2,32],116:[2,32],124:[2,32],126:[2,32],127:[2,32],130:[2,32],131:[2,32],132:[2,32],133:[2,32],134:[2,32],135:[2,32]},{4:138,7:4,8:6,9:7,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,139],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:140,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,144],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],85:142,86:[1,55],87:[1,56],88:[1,54],89:[1,141],92:143,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,107],6:[2,107],25:[2,107],26:[2,107],46:[2,107],51:[2,107],54:[2,107],64:[2,107],65:[2,107],66:[2,107],68:[2,107],70:[2,107],71:[2,107],72:[2,107],76:[2,107],82:[2,107],83:[2,107],84:[2,107],89:[2,107],91:[2,107],100:[2,107],102:[2,107],103:[2,107],104:[2,107],108:[2,107],116:[2,107],124:[2,107],126:[2,107],127:[2,107],130:[2,107],131:[2,107],132:[2,107],133:[2,107],134:[2,107],135:[2,107]},{1:[2,108],6:[2,108],25:[2,108],26:[2,108],27:146,28:[1,70],46:[2,108],51:[2,108],54:[2,108],64:[2,108],65:[2,108],66:[2,108],68:[2,108],70:[2,108],71:[2,108],72:[2,108],76:[2,108],82:[2,108],83:[2,108],84:[2,108],89:[2,108],91:[2,108],100:[2,108],102:[2,108],103:[2,108],104:[2,108],108:[2,108],116:[2,108],124:[2,108],126:[2,108],127:[2,108],130:[2,108],131:[2,108],132:[2,108],133:[2,108],134:[2,108],135:[2,108]},{25:[2,47]},{25:[2,48]},{1:[2,62],6:[2,62],25:[2,62],26:[2,62],37:[2,62],46:[2,62],51:[2,62],54:[2,62],59:[1,147],64:[2,62],65:[2,62],66:[2,62],68:[2,62],70:[2,62],71:[2,62],72:[2,62],76:[2,62],78:[2,62],82:[2,62],83:[2,62],84:[2,62],89:[2,62],91:[2,62],100:[2,62],102:[2,62],103:[2,62],104:[2,62],108:[2,62],116:[2,62],124:[2,62],126:[2,62],127:[2,62],128:[2,62],129:[2,62],130:[2,62],131:[2,62],132:[2,62],133:[2,62],134:[2,62],135:[2,62],136:[2,62]},{1:[2,66],6:[2,66],25:[2,66],26:[2,66],37:[2,66],46:[2,66],51:[2,66],54:[2,66],64:[2,66],65:[2,66],66:[2,66],68:[2,66],70:[2,66],71:[2,66],72:[2,66],76:[2,66],78:[2,66],82:[2,66],83:[2,66],84:[2,66],89:[2,66],91:[2,66],100:[2,66],102:[2,66],103:[2,66],104:[2,66],108:[2,66],116:[2,66],124:[2,66],126:[2,66],127:[2,66],128:[2,66],129:[2,66],130:[2,66],131:[2,66],132:[2,66],133:[2,66],134:[2,66],135:[2,66],136:[2,66]},{8:148,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:149,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:150,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{5:151,8:152,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,5],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{27:157,28:[1,70],55:158,56:159,62:153,74:[1,67],88:[1,54],111:154,112:[1,155],113:156},{110:160,114:[1,161],115:[1,162]},{6:[2,86],12:166,25:[2,86],27:167,28:[1,70],29:168,30:[1,68],31:[1,69],38:164,39:165,41:169,43:[1,46],51:[2,86],75:163,76:[2,86],87:[1,111]},{1:[2,27],6:[2,27],25:[2,27],26:[2,27],40:[2,27],46:[2,27],51:[2,27],54:[2,27],64:[2,27],65:[2,27],66:[2,27],68:[2,27],70:[2,27],71:[2,27],72:[2,27],76:[2,27],82:[2,27],83:[2,27],84:[2,27],89:[2,27],91:[2,27],100:[2,27],102:[2,27],103:[2,27],104:[2,27],108:[2,27],116:[2,27],124:[2,27],126:[2,27],127:[2,27],130:[2,27],131:[2,27],132:[2,27],133:[2,27],134:[2,27],135:[2,27]},{1:[2,28],6:[2,28],25:[2,28],26:[2,28],40:[2,28],46:[2,28],51:[2,28],54:[2,28],64:[2,28],65:[2,28],66:[2,28],68:[2,28],70:[2,28],71:[2,28],72:[2,28],76:[2,28],82:[2,28],83:[2,28],84:[2,28],89:[2,28],91:[2,28],100:[2,28],102:[2,28],103:[2,28],104:[2,28],108:[2,28],116:[2,28],124:[2,28],126:[2,28],127:[2,28],130:[2,28],131:[2,28],132:[2,28],133:[2,28],134:[2,28],135:[2,28]},{1:[2,26],6:[2,26],25:[2,26],26:[2,26],37:[2,26],40:[2,26],46:[2,26],51:[2,26],54:[2,26],59:[2,26],64:[2,26],65:[2,26],66:[2,26],68:[2,26],70:[2,26],71:[2,26],72:[2,26],76:[2,26],78:[2,26],82:[2,26],83:[2,26],84:[2,26],89:[2,26],91:[2,26],100:[2,26],102:[2,26],103:[2,26],104:[2,26],108:[2,26],114:[2,26],115:[2,26],116:[2,26],124:[2,26],126:[2,26],127:[2,26],128:[2,26],129:[2,26],130:[2,26],131:[2,26],132:[2,26],133:[2,26],134:[2,26],135:[2,26],136:[2,26]},{1:[2,6],6:[2,6],7:170,8:6,9:7,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,26:[2,6],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],100:[2,6],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,3]},{1:[2,24],6:[2,24],25:[2,24],26:[2,24],46:[2,24],51:[2,24],54:[2,24],70:[2,24],76:[2,24],84:[2,24],89:[2,24],91:[2,24],96:[2,24],97:[2,24],100:[2,24],102:[2,24],103:[2,24],104:[2,24],108:[2,24],116:[2,24],119:[2,24],121:[2,24],124:[2,24],126:[2,24],127:[2,24],130:[2,24],131:[2,24],132:[2,24],133:[2,24],134:[2,24],135:[2,24]},{6:[1,71],26:[1,171]},{1:[2,185],6:[2,185],25:[2,185],26:[2,185],46:[2,185],51:[2,185],54:[2,185],70:[2,185],76:[2,185],84:[2,185],89:[2,185],91:[2,185],100:[2,185],102:[2,185],103:[2,185],104:[2,185],108:[2,185],116:[2,185],124:[2,185],126:[2,185],127:[2,185],130:[2,185],131:[2,185],132:[2,185],133:[2,185],134:[2,185],135:[2,185]},{8:172,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:173,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:174,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:175,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:176,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:177,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:178,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:179,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,141],6:[2,141],25:[2,141],26:[2,141],46:[2,141],51:[2,141],54:[2,141],70:[2,141],76:[2,141],84:[2,141],89:[2,141],91:[2,141],100:[2,141],102:[2,141],103:[2,141],104:[2,141],108:[2,141],116:[2,141],124:[2,141],126:[2,141],127:[2,141],130:[2,141],131:[2,141],132:[2,141],133:[2,141],134:[2,141],135:[2,141]},{1:[2,146],6:[2,146],25:[2,146],26:[2,146],46:[2,146],51:[2,146],54:[2,146],70:[2,146],76:[2,146],84:[2,146],89:[2,146],91:[2,146],100:[2,146],102:[2,146],103:[2,146],104:[2,146],108:[2,146],116:[2,146],124:[2,146],126:[2,146],127:[2,146],130:[2,146],131:[2,146],132:[2,146],133:[2,146],134:[2,146],135:[2,146]},{8:180,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,140],6:[2,140],25:[2,140],26:[2,140],46:[2,140],51:[2,140],54:[2,140],70:[2,140],76:[2,140],84:[2,140],89:[2,140],91:[2,140],100:[2,140],102:[2,140],103:[2,140],104:[2,140],108:[2,140],116:[2,140],124:[2,140],126:[2,140],127:[2,140],130:[2,140],131:[2,140],132:[2,140],133:[2,140],134:[2,140],135:[2,140]},{1:[2,145],6:[2,145],25:[2,145],26:[2,145],46:[2,145],51:[2,145],54:[2,145],70:[2,145],76:[2,145],84:[2,145],89:[2,145],91:[2,145],100:[2,145],102:[2,145],103:[2,145],104:[2,145],108:[2,145],116:[2,145],124:[2,145],126:[2,145],127:[2,145],130:[2,145],131:[2,145],132:[2,145],133:[2,145],134:[2,145],135:[2,145]},{80:181,83:[1,103]},{1:[2,64],6:[2,64],25:[2,64],26:[2,64],37:[2,64],46:[2,64],51:[2,64],54:[2,64],64:[2,64],65:[2,64],66:[2,64],68:[2,64],70:[2,64],71:[2,64],72:[2,64],76:[2,64],78:[2,64],82:[2,64],83:[2,64],84:[2,64],89:[2,64],91:[2,64],100:[2,64],102:[2,64],103:[2,64],104:[2,64],108:[2,64],116:[2,64],124:[2,64],126:[2,64],127:[2,64],128:[2,64],129:[2,64],130:[2,64],131:[2,64],132:[2,64],133:[2,64],134:[2,64],135:[2,64],136:[2,64]},{83:[2,104]},{27:182,28:[1,70]},{27:183,28:[1,70]},{1:[2,78],6:[2,78],25:[2,78],26:[2,78],27:184,28:[1,70],37:[2,78],46:[2,78],51:[2,78],54:[2,78],64:[2,78],65:[2,78],66:[2,78],68:[2,78],70:[2,78],71:[2,78],72:[2,78],76:[2,78],78:[2,78],82:[2,78],83:[2,78],84:[2,78],89:[2,78],91:[2,78],100:[2,78],102:[2,78],103:[2,78],104:[2,78],108:[2,78],116:[2,78],124:[2,78],126:[2,78],127:[2,78],128:[2,78],129:[2,78],130:[2,78],131:[2,78],132:[2,78],133:[2,78],134:[2,78],135:[2,78],136:[2,78]},{1:[2,79],6:[2,79],25:[2,79],26:[2,79],37:[2,79],46:[2,79],51:[2,79],54:[2,79],64:[2,79],65:[2,79],66:[2,79],68:[2,79],70:[2,79],71:[2,79],72:[2,79],76:[2,79],78:[2,79],82:[2,79],83:[2,79],84:[2,79],89:[2,79],91:[2,79],100:[2,79],102:[2,79],103:[2,79],104:[2,79],108:[2,79],116:[2,79],124:[2,79],126:[2,79],127:[2,79],128:[2,79],129:[2,79],130:[2,79],131:[2,79],132:[2,79],133:[2,79],134:[2,79],135:[2,79],136:[2,79]},{8:186,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],54:[1,190],55:47,56:48,58:36,61:25,62:26,63:27,69:185,73:187,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],90:188,91:[1,189],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{67:191,68:[1,96],71:[1,97],72:[1,98]},{67:192,68:[1,96],71:[1,97],72:[1,98]},{80:193,83:[1,103]},{1:[2,65],6:[2,65],25:[2,65],26:[2,65],37:[2,65],46:[2,65],51:[2,65],54:[2,65],64:[2,65],65:[2,65],66:[2,65],68:[2,65],70:[2,65],71:[2,65],72:[2,65],76:[2,65],78:[2,65],82:[2,65],83:[2,65],84:[2,65],89:[2,65],91:[2,65],100:[2,65],102:[2,65],103:[2,65],104:[2,65],108:[2,65],116:[2,65],124:[2,65],126:[2,65],127:[2,65],128:[2,65],129:[2,65],130:[2,65],131:[2,65],132:[2,65],133:[2,65],134:[2,65],135:[2,65],136:[2,65]},{8:194,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,195],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,102],6:[2,102],25:[2,102],26:[2,102],46:[2,102],51:[2,102],54:[2,102],64:[2,102],65:[2,102],66:[2,102],68:[2,102],70:[2,102],71:[2,102],72:[2,102],76:[2,102],82:[2,102],83:[2,102],84:[2,102],89:[2,102],91:[2,102],100:[2,102],102:[2,102],103:[2,102],104:[2,102],108:[2,102],116:[2,102],124:[2,102],126:[2,102],127:[2,102],130:[2,102],131:[2,102],132:[2,102],133:[2,102],134:[2,102],135:[2,102]},{8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,144],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],84:[1,196],85:197,86:[1,55],87:[1,56],88:[1,54],92:143,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{46:[1,199],51:[1,200]},{46:[2,52],51:[2,52]},{37:[1,202],46:[2,54],51:[2,54],54:[1,201]},{37:[2,57],46:[2,57],51:[2,57],54:[2,57]},{37:[2,58],46:[2,58],51:[2,58],54:[2,58]},{37:[2,59],46:[2,59],51:[2,59],54:[2,59]},{37:[2,60],46:[2,60],51:[2,60],54:[2,60]},{27:146,28:[1,70]},{8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,144],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],85:142,86:[1,55],87:[1,56],88:[1,54],89:[1,141],92:143,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,46],6:[2,46],25:[2,46],26:[2,46],46:[2,46],51:[2,46],54:[2,46],70:[2,46],76:[2,46],84:[2,46],89:[2,46],91:[2,46],100:[2,46],102:[2,46],103:[2,46],104:[2,46],108:[2,46],116:[2,46],124:[2,46],126:[2,46],127:[2,46],130:[2,46],131:[2,46],132:[2,46],133:[2,46],134:[2,46],135:[2,46]},{1:[2,178],6:[2,178],25:[2,178],26:[2,178],46:[2,178],51:[2,178],54:[2,178],70:[2,178],76:[2,178],84:[2,178],89:[2,178],91:[2,178],100:[2,178],101:84,102:[2,178],103:[2,178],104:[2,178],107:85,108:[2,178],109:66,116:[2,178],124:[2,178],126:[2,178],127:[2,178],130:[1,75],131:[2,178],132:[2,178],133:[2,178],134:[2,178],135:[2,178]},{101:87,102:[1,62],104:[1,63],107:88,108:[1,65],109:66,124:[1,86]},{1:[2,179],6:[2,179],25:[2,179],26:[2,179],46:[2,179],51:[2,179],54:[2,179],70:[2,179],76:[2,179],84:[2,179],89:[2,179],91:[2,179],100:[2,179],101:84,102:[2,179],103:[2,179],104:[2,179],107:85,108:[2,179],109:66,116:[2,179],124:[2,179],126:[2,179],127:[2,179],130:[1,75],131:[2,179],132:[2,179],133:[2,179],134:[2,179],135:[2,179]},{1:[2,180],6:[2,180],25:[2,180],26:[2,180],46:[2,180],51:[2,180],54:[2,180],70:[2,180],76:[2,180],84:[2,180],89:[2,180],91:[2,180],100:[2,180],101:84,102:[2,180],103:[2,180],104:[2,180],107:85,108:[2,180],109:66,116:[2,180],124:[2,180],126:[2,180],127:[2,180],130:[1,75],131:[2,180],132:[2,180],133:[2,180],134:[2,180],135:[2,180]},{1:[2,181],6:[2,181],25:[2,181],26:[2,181],46:[2,181],51:[2,181],54:[2,181],64:[2,67],65:[2,67],66:[2,67],68:[2,67],70:[2,181],71:[2,67],72:[2,67],76:[2,181],82:[2,67],83:[2,67],84:[2,181],89:[2,181],91:[2,181],100:[2,181],102:[2,181],103:[2,181],104:[2,181],108:[2,181],116:[2,181],124:[2,181],126:[2,181],127:[2,181],130:[2,181],131:[2,181],132:[2,181],133:[2,181],134:[2,181],135:[2,181]},{60:90,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],71:[1,97],72:[1,98],79:89,82:[1,91],83:[2,103]},{60:100,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],71:[1,97],72:[1,98],79:99,82:[1,91],83:[2,103]},{1:[2,70],6:[2,70],25:[2,70],26:[2,70],46:[2,70],51:[2,70],54:[2,70],64:[2,70],65:[2,70],66:[2,70],68:[2,70],70:[2,70],71:[2,70],72:[2,70],76:[2,70],82:[2,70],83:[2,70],84:[2,70],89:[2,70],91:[2,70],100:[2,70],102:[2,70],103:[2,70],104:[2,70],108:[2,70],116:[2,70],124:[2,70],126:[2,70],127:[2,70],130:[2,70],131:[2,70],132:[2,70],133:[2,70],134:[2,70],135:[2,70]},{1:[2,182],6:[2,182],25:[2,182],26:[2,182],46:[2,182],51:[2,182],54:[2,182],64:[2,67],65:[2,67],66:[2,67],68:[2,67],70:[2,182],71:[2,67],72:[2,67],76:[2,182],82:[2,67],83:[2,67],84:[2,182],89:[2,182],91:[2,182],100:[2,182],102:[2,182],103:[2,182],104:[2,182],108:[2,182],116:[2,182],124:[2,182],126:[2,182],127:[2,182],130:[2,182],131:[2,182],132:[2,182],133:[2,182],134:[2,182],135:[2,182]},{1:[2,183],6:[2,183],25:[2,183],26:[2,183],46:[2,183],51:[2,183],54:[2,183],70:[2,183],76:[2,183],84:[2,183],89:[2,183],91:[2,183],100:[2,183],102:[2,183],103:[2,183],104:[2,183],108:[2,183],116:[2,183],124:[2,183],126:[2,183],127:[2,183],130:[2,183],131:[2,183],132:[2,183],133:[2,183],134:[2,183],135:[2,183]},{1:[2,184],6:[2,184],25:[2,184],26:[2,184],46:[2,184],51:[2,184],54:[2,184],70:[2,184],76:[2,184],84:[2,184],89:[2,184],91:[2,184],100:[2,184],102:[2,184],103:[2,184],104:[2,184],108:[2,184],116:[2,184],124:[2,184],126:[2,184],127:[2,184],130:[2,184],131:[2,184],132:[2,184],133:[2,184],134:[2,184],135:[2,184]},{8:203,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,204],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:205,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{5:206,25:[1,5],123:[1,207]},{1:[2,127],6:[2,127],25:[2,127],26:[2,127],46:[2,127],51:[2,127],54:[2,127],70:[2,127],76:[2,127],84:[2,127],89:[2,127],91:[2,127],95:208,96:[1,209],97:[1,210],100:[2,127],102:[2,127],103:[2,127],104:[2,127],108:[2,127],116:[2,127],124:[2,127],126:[2,127],127:[2,127],130:[2,127],131:[2,127],132:[2,127],133:[2,127],134:[2,127],135:[2,127]},{1:[2,139],6:[2,139],25:[2,139],26:[2,139],46:[2,139],51:[2,139],54:[2,139],70:[2,139],76:[2,139],84:[2,139],89:[2,139],91:[2,139],100:[2,139],102:[2,139],103:[2,139],104:[2,139],108:[2,139],116:[2,139],124:[2,139],126:[2,139],127:[2,139],130:[2,139],131:[2,139],132:[2,139],133:[2,139],134:[2,139],135:[2,139]},{1:[2,147],6:[2,147],25:[2,147],26:[2,147],46:[2,147],51:[2,147],54:[2,147],70:[2,147],76:[2,147],84:[2,147],89:[2,147],91:[2,147],100:[2,147],102:[2,147],103:[2,147],104:[2,147],108:[2,147],116:[2,147],124:[2,147],126:[2,147],127:[2,147],130:[2,147],131:[2,147],132:[2,147],133:[2,147],134:[2,147],135:[2,147]},{25:[1,211],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{118:212,120:213,121:[1,214]},{1:[2,92],6:[2,92],25:[2,92],26:[2,92],46:[2,92],51:[2,92],54:[2,92],70:[2,92],76:[2,92],84:[2,92],89:[2,92],91:[2,92],100:[2,92],102:[2,92],103:[2,92],104:[2,92],108:[2,92],116:[2,92],124:[2,92],126:[2,92],127:[2,92],130:[2,92],131:[2,92],132:[2,92],133:[2,92],134:[2,92],135:[2,92]},{14:215,15:120,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:121,41:60,55:47,56:48,58:216,61:25,62:26,63:27,74:[1,67],81:[1,28],86:[1,55],87:[1,56],88:[1,54],99:[1,53]},{1:[2,95],5:217,6:[2,95],25:[1,5],26:[2,95],46:[2,95],51:[2,95],54:[2,95],64:[2,67],65:[2,67],66:[2,67],68:[2,67],70:[2,95],71:[2,67],72:[2,67],76:[2,95],78:[1,218],82:[2,67],83:[2,67],84:[2,95],89:[2,95],91:[2,95],100:[2,95],102:[2,95],103:[2,95],104:[2,95],108:[2,95],116:[2,95],124:[2,95],126:[2,95],127:[2,95],130:[2,95],131:[2,95],132:[2,95],133:[2,95],134:[2,95],135:[2,95]},{1:[2,42],6:[2,42],26:[2,42],100:[2,42],101:84,102:[2,42],104:[2,42],107:85,108:[2,42],109:66,124:[2,42],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,132],6:[2,132],26:[2,132],100:[2,132],101:84,102:[2,132],104:[2,132],107:85,108:[2,132],109:66,124:[2,132],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[1,71],100:[1,219]},{4:220,7:4,8:6,9:7,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,123],25:[2,123],51:[2,123],54:[1,222],89:[2,123],90:221,91:[1,189],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,110],6:[2,110],25:[2,110],26:[2,110],37:[2,110],46:[2,110],51:[2,110],54:[2,110],64:[2,110],65:[2,110],66:[2,110],68:[2,110],70:[2,110],71:[2,110],72:[2,110],76:[2,110],82:[2,110],83:[2,110],84:[2,110],89:[2,110],91:[2,110],100:[2,110],102:[2,110],103:[2,110],104:[2,110],108:[2,110],114:[2,110],115:[2,110],116:[2,110],124:[2,110],126:[2,110],127:[2,110],130:[2,110],131:[2,110],132:[2,110],133:[2,110],134:[2,110],135:[2,110]},{6:[2,49],25:[2,49],50:223,51:[1,224],89:[2,49]},{6:[2,118],25:[2,118],26:[2,118],51:[2,118],84:[2,118],89:[2,118]},{8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,144],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],85:225,86:[1,55],87:[1,56],88:[1,54],92:143,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,124],25:[2,124],26:[2,124],51:[2,124],84:[2,124],89:[2,124]},{1:[2,109],6:[2,109],25:[2,109],26:[2,109],37:[2,109],40:[2,109],46:[2,109],51:[2,109],54:[2,109],64:[2,109],65:[2,109],66:[2,109],68:[2,109],70:[2,109],71:[2,109],72:[2,109],76:[2,109],78:[2,109],82:[2,109],83:[2,109],84:[2,109],89:[2,109],91:[2,109],100:[2,109],102:[2,109],103:[2,109],104:[2,109],108:[2,109],116:[2,109],124:[2,109],126:[2,109],127:[2,109],128:[2,109],129:[2,109],130:[2,109],131:[2,109],132:[2,109],133:[2,109],134:[2,109],135:[2,109],136:[2,109]},{27:226,28:[1,70]},{5:227,25:[1,5],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,135],6:[2,135],25:[2,135],26:[2,135],46:[2,135],51:[2,135],54:[2,135],70:[2,135],76:[2,135],84:[2,135],89:[2,135],91:[2,135],100:[2,135],101:84,102:[1,62],103:[1,228],104:[1,63],107:85,108:[1,65],109:66,116:[2,135],124:[2,135],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,137],6:[2,137],25:[2,137],26:[2,137],46:[2,137],51:[2,137],54:[2,137],70:[2,137],76:[2,137],84:[2,137],89:[2,137],91:[2,137],100:[2,137],101:84,102:[1,62],103:[1,229],104:[1,63],107:85,108:[1,65],109:66,116:[2,137],124:[2,137],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,143],6:[2,143],25:[2,143],26:[2,143],46:[2,143],51:[2,143],54:[2,143],70:[2,143],76:[2,143],84:[2,143],89:[2,143],91:[2,143],100:[2,143],102:[2,143],103:[2,143],104:[2,143],108:[2,143],116:[2,143],124:[2,143],126:[2,143],127:[2,143],130:[2,143],131:[2,143],132:[2,143],133:[2,143],134:[2,143],135:[2,143]},{1:[2,144],6:[2,144],25:[2,144],26:[2,144],46:[2,144],51:[2,144],54:[2,144],70:[2,144],76:[2,144],84:[2,144],89:[2,144],91:[2,144],100:[2,144],101:84,102:[1,62],103:[2,144],104:[1,63],107:85,108:[1,65],109:66,116:[2,144],124:[2,144],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,148],6:[2,148],25:[2,148],26:[2,148],46:[2,148],51:[2,148],54:[2,148],70:[2,148],76:[2,148],84:[2,148],89:[2,148],91:[2,148],100:[2,148],102:[2,148],103:[2,148],104:[2,148],108:[2,148],116:[2,148],124:[2,148],126:[2,148],127:[2,148],130:[2,148],131:[2,148],132:[2,148],133:[2,148],134:[2,148],135:[2,148]},{114:[2,150],115:[2,150]},{27:157,28:[1,70],55:158,56:159,74:[1,67],88:[1,112],111:230,113:156},{51:[1,231],114:[2,155],115:[2,155]},{51:[2,152],114:[2,152],115:[2,152]},{51:[2,153],114:[2,153],115:[2,153]},{51:[2,154],114:[2,154],115:[2,154]},{1:[2,149],6:[2,149],25:[2,149],26:[2,149],46:[2,149],51:[2,149],54:[2,149],70:[2,149],76:[2,149],84:[2,149],89:[2,149],91:[2,149],100:[2,149],102:[2,149],103:[2,149],104:[2,149],108:[2,149],116:[2,149],124:[2,149],126:[2,149],127:[2,149],130:[2,149],131:[2,149],132:[2,149],133:[2,149],134:[2,149],135:[2,149]},{8:232,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:233,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,49],25:[2,49],50:234,51:[1,235],76:[2,49]},{6:[2,87],25:[2,87],26:[2,87],51:[2,87],76:[2,87]},{6:[2,35],25:[2,35],26:[2,35],40:[1,236],51:[2,35],76:[2,35]},{6:[2,38],25:[2,38],26:[2,38],51:[2,38],76:[2,38]},{6:[2,39],25:[2,39],26:[2,39],40:[2,39],51:[2,39],76:[2,39]},{6:[2,40],25:[2,40],26:[2,40],40:[2,40],51:[2,40],76:[2,40]},{6:[2,41],25:[2,41],26:[2,41],40:[2,41],51:[2,41],76:[2,41]},{1:[2,5],6:[2,5],26:[2,5],100:[2,5]},{1:[2,25],6:[2,25],25:[2,25],26:[2,25],46:[2,25],51:[2,25],54:[2,25],70:[2,25],76:[2,25],84:[2,25],89:[2,25],91:[2,25],96:[2,25],97:[2,25],100:[2,25],102:[2,25],103:[2,25],104:[2,25],108:[2,25],116:[2,25],119:[2,25],121:[2,25],124:[2,25],126:[2,25],127:[2,25],130:[2,25],131:[2,25],132:[2,25],133:[2,25],134:[2,25],135:[2,25]},{1:[2,186],6:[2,186],25:[2,186],26:[2,186],46:[2,186],51:[2,186],54:[2,186],70:[2,186],76:[2,186],84:[2,186],89:[2,186],91:[2,186],100:[2,186],101:84,102:[2,186],103:[2,186],104:[2,186],107:85,108:[2,186],109:66,116:[2,186],124:[2,186],126:[2,186],127:[2,186],130:[1,75],131:[1,78],132:[2,186],133:[2,186],134:[2,186],135:[2,186]},{1:[2,187],6:[2,187],25:[2,187],26:[2,187],46:[2,187],51:[2,187],54:[2,187],70:[2,187],76:[2,187],84:[2,187],89:[2,187],91:[2,187],100:[2,187],101:84,102:[2,187],103:[2,187],104:[2,187],107:85,108:[2,187],109:66,116:[2,187],124:[2,187],126:[2,187],127:[2,187],130:[1,75],131:[1,78],132:[2,187],133:[2,187],134:[2,187],135:[2,187]},{1:[2,188],6:[2,188],25:[2,188],26:[2,188],46:[2,188],51:[2,188],54:[2,188],70:[2,188],76:[2,188],84:[2,188],89:[2,188],91:[2,188],100:[2,188],101:84,102:[2,188],103:[2,188],104:[2,188],107:85,108:[2,188],109:66,116:[2,188],124:[2,188],126:[2,188],127:[2,188],130:[1,75],131:[2,188],132:[2,188],133:[2,188],134:[2,188],135:[2,188]},{1:[2,189],6:[2,189],25:[2,189],26:[2,189],46:[2,189],51:[2,189],54:[2,189],70:[2,189],76:[2,189],84:[2,189],89:[2,189],91:[2,189],100:[2,189],101:84,102:[2,189],103:[2,189],104:[2,189],107:85,108:[2,189],109:66,116:[2,189],124:[2,189],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[2,189],133:[2,189],134:[2,189],135:[2,189]},{1:[2,190],6:[2,190],25:[2,190],26:[2,190],46:[2,190],51:[2,190],54:[2,190],70:[2,190],76:[2,190],84:[2,190],89:[2,190],91:[2,190],100:[2,190],101:84,102:[2,190],103:[2,190],104:[2,190],107:85,108:[2,190],109:66,116:[2,190],124:[2,190],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[2,190],134:[2,190],135:[1,82]},{1:[2,191],6:[2,191],25:[2,191],26:[2,191],46:[2,191],51:[2,191],54:[2,191],70:[2,191],76:[2,191],84:[2,191],89:[2,191],91:[2,191],100:[2,191],101:84,102:[2,191],103:[2,191],104:[2,191],107:85,108:[2,191],109:66,116:[2,191],124:[2,191],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[2,191],135:[1,82]},{1:[2,192],6:[2,192],25:[2,192],26:[2,192],46:[2,192],51:[2,192],54:[2,192],70:[2,192],76:[2,192],84:[2,192],89:[2,192],91:[2,192],100:[2,192],101:84,102:[2,192],103:[2,192],104:[2,192],107:85,108:[2,192],109:66,116:[2,192],124:[2,192],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[2,192],134:[2,192],135:[2,192]},{1:[2,177],6:[2,177],25:[2,177],26:[2,177],46:[2,177],51:[2,177],54:[2,177],70:[2,177],76:[2,177],84:[2,177],89:[2,177],91:[2,177],100:[2,177],101:84,102:[1,62],103:[2,177],104:[1,63],107:85,108:[1,65],109:66,116:[2,177],124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,176],6:[2,176],25:[2,176],26:[2,176],46:[2,176],51:[2,176],54:[2,176],70:[2,176],76:[2,176],84:[2,176],89:[2,176],91:[2,176],100:[2,176],101:84,102:[1,62],103:[2,176],104:[1,63],107:85,108:[1,65],109:66,116:[2,176],124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,99],6:[2,99],25:[2,99],26:[2,99],46:[2,99],51:[2,99],54:[2,99],64:[2,99],65:[2,99],66:[2,99],68:[2,99],70:[2,99],71:[2,99],72:[2,99],76:[2,99],82:[2,99],83:[2,99],84:[2,99],89:[2,99],91:[2,99],100:[2,99],102:[2,99],103:[2,99],104:[2,99],108:[2,99],116:[2,99],124:[2,99],126:[2,99],127:[2,99],130:[2,99],131:[2,99],132:[2,99],133:[2,99],134:[2,99],135:[2,99]},{1:[2,75],6:[2,75],25:[2,75],26:[2,75],37:[2,75],46:[2,75],51:[2,75],54:[2,75],64:[2,75],65:[2,75],66:[2,75],68:[2,75],70:[2,75],71:[2,75],72:[2,75],76:[2,75],78:[2,75],82:[2,75],83:[2,75],84:[2,75],89:[2,75],91:[2,75],100:[2,75],102:[2,75],103:[2,75],104:[2,75],108:[2,75],116:[2,75],124:[2,75],126:[2,75],127:[2,75],128:[2,75],129:[2,75],130:[2,75],131:[2,75],132:[2,75],133:[2,75],134:[2,75],135:[2,75],136:[2,75]},{1:[2,76],6:[2,76],25:[2,76],26:[2,76],37:[2,76],46:[2,76],51:[2,76],54:[2,76],64:[2,76],65:[2,76],66:[2,76],68:[2,76],70:[2,76],71:[2,76],72:[2,76],76:[2,76],78:[2,76],82:[2,76],83:[2,76],84:[2,76],89:[2,76],91:[2,76],100:[2,76],102:[2,76],103:[2,76],104:[2,76],108:[2,76],116:[2,76],124:[2,76],126:[2,76],127:[2,76],128:[2,76],129:[2,76],130:[2,76],131:[2,76],132:[2,76],133:[2,76],134:[2,76],135:[2,76],136:[2,76]},{1:[2,77],6:[2,77],25:[2,77],26:[2,77],37:[2,77],46:[2,77],51:[2,77],54:[2,77],64:[2,77],65:[2,77],66:[2,77],68:[2,77],70:[2,77],71:[2,77],72:[2,77],76:[2,77],78:[2,77],82:[2,77],83:[2,77],84:[2,77],89:[2,77],91:[2,77],100:[2,77],102:[2,77],103:[2,77],104:[2,77],108:[2,77],116:[2,77],124:[2,77],126:[2,77],127:[2,77],128:[2,77],129:[2,77],130:[2,77],131:[2,77],132:[2,77],133:[2,77],134:[2,77],135:[2,77],136:[2,77]},{70:[1,237]},{54:[1,190],70:[2,83],90:238,91:[1,189],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{70:[2,84]},{8:239,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{13:[2,112],28:[2,112],30:[2,112],31:[2,112],33:[2,112],34:[2,112],35:[2,112],42:[2,112],43:[2,112],44:[2,112],48:[2,112],49:[2,112],70:[2,112],74:[2,112],77:[2,112],81:[2,112],86:[2,112],87:[2,112],88:[2,112],94:[2,112],98:[2,112],99:[2,112],102:[2,112],104:[2,112],106:[2,112],108:[2,112],117:[2,112],123:[2,112],125:[2,112],126:[2,112],127:[2,112],128:[2,112],129:[2,112]},{13:[2,113],28:[2,113],30:[2,113],31:[2,113],33:[2,113],34:[2,113],35:[2,113],42:[2,113],43:[2,113],44:[2,113],48:[2,113],49:[2,113],70:[2,113],74:[2,113],77:[2,113],81:[2,113],86:[2,113],87:[2,113],88:[2,113],94:[2,113],98:[2,113],99:[2,113],102:[2,113],104:[2,113],106:[2,113],108:[2,113],117:[2,113],123:[2,113],125:[2,113],126:[2,113],127:[2,113],128:[2,113],129:[2,113]},{1:[2,81],6:[2,81],25:[2,81],26:[2,81],37:[2,81],46:[2,81],51:[2,81],54:[2,81],64:[2,81],65:[2,81],66:[2,81],68:[2,81],70:[2,81],71:[2,81],72:[2,81],76:[2,81],78:[2,81],82:[2,81],83:[2,81],84:[2,81],89:[2,81],91:[2,81],100:[2,81],102:[2,81],103:[2,81],104:[2,81],108:[2,81],116:[2,81],124:[2,81],126:[2,81],127:[2,81],128:[2,81],129:[2,81],130:[2,81],131:[2,81],132:[2,81],133:[2,81],134:[2,81],135:[2,81],136:[2,81]},{1:[2,82],6:[2,82],25:[2,82],26:[2,82],37:[2,82],46:[2,82],51:[2,82],54:[2,82],64:[2,82],65:[2,82],66:[2,82],68:[2,82],70:[2,82],71:[2,82],72:[2,82],76:[2,82],78:[2,82],82:[2,82],83:[2,82],84:[2,82],89:[2,82],91:[2,82],100:[2,82],102:[2,82],103:[2,82],104:[2,82],108:[2,82],116:[2,82],124:[2,82],126:[2,82],127:[2,82],128:[2,82],129:[2,82],130:[2,82],131:[2,82],132:[2,82],133:[2,82],134:[2,82],135:[2,82],136:[2,82]},{1:[2,100],6:[2,100],25:[2,100],26:[2,100],46:[2,100],51:[2,100],54:[2,100],64:[2,100],65:[2,100],66:[2,100],68:[2,100],70:[2,100],71:[2,100],72:[2,100],76:[2,100],82:[2,100],83:[2,100],84:[2,100],89:[2,100],91:[2,100],100:[2,100],102:[2,100],103:[2,100],104:[2,100],108:[2,100],116:[2,100],124:[2,100],126:[2,100],127:[2,100],130:[2,100],131:[2,100],132:[2,100],133:[2,100],134:[2,100],135:[2,100]},{1:[2,33],6:[2,33],25:[2,33],26:[2,33],46:[2,33],51:[2,33],54:[2,33],70:[2,33],76:[2,33],84:[2,33],89:[2,33],91:[2,33],100:[2,33],101:84,102:[2,33],103:[2,33],104:[2,33],107:85,108:[2,33],109:66,116:[2,33],124:[2,33],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{8:240,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,105],6:[2,105],25:[2,105],26:[2,105],46:[2,105],51:[2,105],54:[2,105],64:[2,105],65:[2,105],66:[2,105],68:[2,105],70:[2,105],71:[2,105],72:[2,105],76:[2,105],82:[2,105],83:[2,105],84:[2,105],89:[2,105],91:[2,105],100:[2,105],102:[2,105],103:[2,105],104:[2,105],108:[2,105],116:[2,105],124:[2,105],126:[2,105],127:[2,105],130:[2,105],131:[2,105],132:[2,105],133:[2,105],134:[2,105],135:[2,105]},{6:[2,49],25:[2,49],50:241,51:[1,224],84:[2,49]},{6:[2,123],25:[2,123],26:[2,123],51:[2,123],54:[1,242],84:[2,123],89:[2,123],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{47:243,48:[1,57],49:[1,58]},{27:107,28:[1,70],41:108,52:244,53:106,55:109,56:110,74:[1,67],87:[1,111],88:[1,112]},{46:[2,55],51:[2,55]},{8:245,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,193],6:[2,193],25:[2,193],26:[2,193],46:[2,193],51:[2,193],54:[2,193],70:[2,193],76:[2,193],84:[2,193],89:[2,193],91:[2,193],100:[2,193],101:84,102:[2,193],103:[2,193],104:[2,193],107:85,108:[2,193],109:66,116:[2,193],124:[2,193],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{8:246,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,195],6:[2,195],25:[2,195],26:[2,195],46:[2,195],51:[2,195],54:[2,195],70:[2,195],76:[2,195],84:[2,195],89:[2,195],91:[2,195],100:[2,195],101:84,102:[2,195],103:[2,195],104:[2,195],107:85,108:[2,195],109:66,116:[2,195],124:[2,195],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,175],6:[2,175],25:[2,175],26:[2,175],46:[2,175],51:[2,175],54:[2,175],70:[2,175],76:[2,175],84:[2,175],89:[2,175],91:[2,175],100:[2,175],102:[2,175],103:[2,175],104:[2,175],108:[2,175],116:[2,175],124:[2,175],126:[2,175],127:[2,175],130:[2,175],131:[2,175],132:[2,175],133:[2,175],134:[2,175],135:[2,175]},{8:247,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,128],6:[2,128],25:[2,128],26:[2,128],46:[2,128],51:[2,128],54:[2,128],70:[2,128],76:[2,128],84:[2,128],89:[2,128],91:[2,128],96:[1,248],100:[2,128],102:[2,128],103:[2,128],104:[2,128],108:[2,128],116:[2,128],124:[2,128],126:[2,128],127:[2,128],130:[2,128],131:[2,128],132:[2,128],133:[2,128],134:[2,128],135:[2,128]},{5:249,25:[1,5]},{27:250,28:[1,70]},{118:251,120:213,121:[1,214]},{26:[1,252],119:[1,253],120:254,121:[1,214]},{26:[2,168],119:[2,168],121:[2,168]},{8:256,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],93:255,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,93],5:257,6:[2,93],25:[1,5],26:[2,93],46:[2,93],51:[2,93],54:[2,93],60:90,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],70:[2,93],71:[1,97],72:[1,98],76:[2,93],79:89,82:[1,91],83:[2,103],84:[2,93],89:[2,93],91:[2,93],100:[2,93],102:[2,93],103:[2,93],104:[2,93],108:[2,93],116:[2,93],124:[2,93],126:[2,93],127:[2,93],130:[2,93],131:[2,93],132:[2,93],133:[2,93],134:[2,93],135:[2,93]},{1:[2,67],6:[2,67],25:[2,67],26:[2,67],46:[2,67],51:[2,67],54:[2,67],64:[2,67],65:[2,67],66:[2,67],68:[2,67],70:[2,67],71:[2,67],72:[2,67],76:[2,67],82:[2,67],83:[2,67],84:[2,67],89:[2,67],91:[2,67],100:[2,67],102:[2,67],103:[2,67],104:[2,67],108:[2,67],116:[2,67],124:[2,67],126:[2,67],127:[2,67],130:[2,67],131:[2,67],132:[2,67],133:[2,67],134:[2,67],135:[2,67]},{1:[2,96],6:[2,96],25:[2,96],26:[2,96],46:[2,96],51:[2,96],54:[2,96],70:[2,96],76:[2,96],84:[2,96],89:[2,96],91:[2,96],100:[2,96],102:[2,96],103:[2,96],104:[2,96],108:[2,96],116:[2,96],124:[2,96],126:[2,96],127:[2,96],130:[2,96],131:[2,96],132:[2,96],133:[2,96],134:[2,96],135:[2,96]},{14:258,15:120,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:121,41:60,55:47,56:48,58:216,61:25,62:26,63:27,74:[1,67],81:[1,28],86:[1,55],87:[1,56],88:[1,54],99:[1,53]},{1:[2,133],6:[2,133],25:[2,133],26:[2,133],46:[2,133],51:[2,133],54:[2,133],64:[2,133],65:[2,133],66:[2,133],68:[2,133],70:[2,133],71:[2,133],72:[2,133],76:[2,133],82:[2,133],83:[2,133],84:[2,133],89:[2,133],91:[2,133],100:[2,133],102:[2,133],103:[2,133],104:[2,133],108:[2,133],116:[2,133],124:[2,133],126:[2,133],127:[2,133],130:[2,133],131:[2,133],132:[2,133],133:[2,133],134:[2,133],135:[2,133]},{6:[1,71],26:[1,259]},{8:260,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,61],13:[2,113],25:[2,61],28:[2,113],30:[2,113],31:[2,113],33:[2,113],34:[2,113],35:[2,113],42:[2,113],43:[2,113],44:[2,113],48:[2,113],49:[2,113],51:[2,61],74:[2,113],77:[2,113],81:[2,113],86:[2,113],87:[2,113],88:[2,113],89:[2,61],94:[2,113],98:[2,113],99:[2,113],102:[2,113],104:[2,113],106:[2,113],108:[2,113],117:[2,113],123:[2,113],125:[2,113],126:[2,113],127:[2,113],128:[2,113],129:[2,113]},{6:[1,262],25:[1,263],89:[1,261]},{6:[2,50],8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[2,50],26:[2,50],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],84:[2,50],86:[1,55],87:[1,56],88:[1,54],89:[2,50],92:264,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,49],25:[2,49],26:[2,49],50:265,51:[1,224]},{1:[2,63],6:[2,63],25:[2,63],26:[2,63],37:[2,63],46:[2,63],51:[2,63],54:[2,63],64:[2,63],65:[2,63],66:[2,63],68:[2,63],70:[2,63],71:[2,63],72:[2,63],76:[2,63],78:[2,63],82:[2,63],83:[2,63],84:[2,63],89:[2,63],91:[2,63],100:[2,63],102:[2,63],103:[2,63],104:[2,63],108:[2,63],116:[2,63],124:[2,63],126:[2,63],127:[2,63],128:[2,63],129:[2,63],130:[2,63],131:[2,63],132:[2,63],133:[2,63],134:[2,63],135:[2,63],136:[2,63]},{1:[2,172],6:[2,172],25:[2,172],26:[2,172],46:[2,172],51:[2,172],54:[2,172],70:[2,172],76:[2,172],84:[2,172],89:[2,172],91:[2,172],100:[2,172],102:[2,172],103:[2,172],104:[2,172],108:[2,172],116:[2,172],119:[2,172],124:[2,172],126:[2,172],127:[2,172],130:[2,172],131:[2,172],132:[2,172],133:[2,172],134:[2,172],135:[2,172]},{8:266,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:267,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{114:[2,151],115:[2,151]},{27:157,28:[1,70],55:158,56:159,74:[1,67],88:[1,112],113:268},{1:[2,157],6:[2,157],25:[2,157],26:[2,157],46:[2,157],51:[2,157],54:[2,157],70:[2,157],76:[2,157],84:[2,157],89:[2,157],91:[2,157],100:[2,157],101:84,102:[2,157],103:[1,269],104:[2,157],107:85,108:[2,157],109:66,116:[1,270],124:[2,157],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,158],6:[2,158],25:[2,158],26:[2,158],46:[2,158],51:[2,158],54:[2,158],70:[2,158],76:[2,158],84:[2,158],89:[2,158],91:[2,158],100:[2,158],101:84,102:[2,158],103:[1,271],104:[2,158],107:85,108:[2,158],109:66,116:[2,158],124:[2,158],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[1,273],25:[1,274],76:[1,272]},{6:[2,50],12:166,25:[2,50],26:[2,50],27:167,28:[1,70],29:168,30:[1,68],31:[1,69],38:275,39:165,41:169,43:[1,46],76:[2,50],87:[1,111]},{8:276,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,277],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,80],6:[2,80],25:[2,80],26:[2,80],37:[2,80],46:[2,80],51:[2,80],54:[2,80],64:[2,80],65:[2,80],66:[2,80],68:[2,80],70:[2,80],71:[2,80],72:[2,80],76:[2,80],78:[2,80],82:[2,80],83:[2,80],84:[2,80],89:[2,80],91:[2,80],100:[2,80],102:[2,80],103:[2,80],104:[2,80],108:[2,80],116:[2,80],124:[2,80],126:[2,80],127:[2,80],128:[2,80],129:[2,80],130:[2,80],131:[2,80],132:[2,80],133:[2,80],134:[2,80],135:[2,80],136:[2,80]},{8:278,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,70:[2,116],74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{70:[2,117],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{26:[1,279],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[1,262],25:[1,263],84:[1,280]},{6:[2,61],25:[2,61],26:[2,61],51:[2,61],84:[2,61],89:[2,61]},{5:281,25:[1,5]},{46:[2,53],51:[2,53]},{46:[2,56],51:[2,56],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{26:[1,282],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{5:283,25:[1,5],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{5:284,25:[1,5]},{1:[2,129],6:[2,129],25:[2,129],26:[2,129],46:[2,129],51:[2,129],54:[2,129],70:[2,129],76:[2,129],84:[2,129],89:[2,129],91:[2,129],100:[2,129],102:[2,129],103:[2,129],104:[2,129],108:[2,129],116:[2,129],124:[2,129],126:[2,129],127:[2,129],130:[2,129],131:[2,129],132:[2,129],133:[2,129],134:[2,129],135:[2,129]},{5:285,25:[1,5]},{26:[1,286],119:[1,287],120:254,121:[1,214]},{1:[2,166],6:[2,166],25:[2,166],26:[2,166],46:[2,166],51:[2,166],54:[2,166],70:[2,166],76:[2,166],84:[2,166],89:[2,166],91:[2,166],100:[2,166],102:[2,166],103:[2,166],104:[2,166],108:[2,166],116:[2,166],124:[2,166],126:[2,166],127:[2,166],130:[2,166],131:[2,166],132:[2,166],133:[2,166],134:[2,166],135:[2,166]},{5:288,25:[1,5]},{26:[2,169],119:[2,169],121:[2,169]},{5:289,25:[1,5],51:[1,290]},{25:[2,125],51:[2,125],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,94],6:[2,94],25:[2,94],26:[2,94],46:[2,94],51:[2,94],54:[2,94],70:[2,94],76:[2,94],84:[2,94],89:[2,94],91:[2,94],100:[2,94],102:[2,94],103:[2,94],104:[2,94],108:[2,94],116:[2,94],124:[2,94],126:[2,94],127:[2,94],130:[2,94],131:[2,94],132:[2,94],133:[2,94],134:[2,94],135:[2,94]},{1:[2,97],5:291,6:[2,97],25:[1,5],26:[2,97],46:[2,97],51:[2,97],54:[2,97],60:90,64:[1,92],65:[1,93],66:[1,94],67:95,68:[1,96],70:[2,97],71:[1,97],72:[1,98],76:[2,97],79:89,82:[1,91],83:[2,103],84:[2,97],89:[2,97],91:[2,97],100:[2,97],102:[2,97],103:[2,97],104:[2,97],108:[2,97],116:[2,97],124:[2,97],126:[2,97],127:[2,97],130:[2,97],131:[2,97],132:[2,97],133:[2,97],134:[2,97],135:[2,97]},{100:[1,292]},{89:[1,293],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,111],6:[2,111],25:[2,111],26:[2,111],37:[2,111],46:[2,111],51:[2,111],54:[2,111],64:[2,111],65:[2,111],66:[2,111],68:[2,111],70:[2,111],71:[2,111],72:[2,111],76:[2,111],82:[2,111],83:[2,111],84:[2,111],89:[2,111],91:[2,111],100:[2,111],102:[2,111],103:[2,111],104:[2,111],108:[2,111],114:[2,111],115:[2,111],116:[2,111],124:[2,111],126:[2,111],127:[2,111],130:[2,111],131:[2,111],132:[2,111],133:[2,111],134:[2,111],135:[2,111]},{8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],92:294,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:198,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,25:[1,144],27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,57:145,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],85:295,86:[1,55],87:[1,56],88:[1,54],92:143,94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[2,119],25:[2,119],26:[2,119],51:[2,119],84:[2,119],89:[2,119]},{6:[1,262],25:[1,263],26:[1,296]},{1:[2,136],6:[2,136],25:[2,136],26:[2,136],46:[2,136],51:[2,136],54:[2,136],70:[2,136],76:[2,136],84:[2,136],89:[2,136],91:[2,136],100:[2,136],101:84,102:[1,62],103:[2,136],104:[1,63],107:85,108:[1,65],109:66,116:[2,136],124:[2,136],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,138],6:[2,138],25:[2,138],26:[2,138],46:[2,138],51:[2,138],54:[2,138],70:[2,138],76:[2,138],84:[2,138],89:[2,138],91:[2,138],100:[2,138],101:84,102:[1,62],103:[2,138],104:[1,63],107:85,108:[1,65],109:66,116:[2,138],124:[2,138],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{114:[2,156],115:[2,156]},{8:297,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:298,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:299,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,85],6:[2,85],25:[2,85],26:[2,85],37:[2,85],46:[2,85],51:[2,85],54:[2,85],64:[2,85],65:[2,85],66:[2,85],68:[2,85],70:[2,85],71:[2,85],72:[2,85],76:[2,85],82:[2,85],83:[2,85],84:[2,85],89:[2,85],91:[2,85],100:[2,85],102:[2,85],103:[2,85],104:[2,85],108:[2,85],114:[2,85],115:[2,85],116:[2,85],124:[2,85],126:[2,85],127:[2,85],130:[2,85],131:[2,85],132:[2,85],133:[2,85],134:[2,85],135:[2,85]},{12:166,27:167,28:[1,70],29:168,30:[1,68],31:[1,69],38:300,39:165,41:169,43:[1,46],87:[1,111]},{6:[2,86],12:166,25:[2,86],26:[2,86],27:167,28:[1,70],29:168,30:[1,68],31:[1,69],38:164,39:165,41:169,43:[1,46],51:[2,86],75:301,87:[1,111]},{6:[2,88],25:[2,88],26:[2,88],51:[2,88],76:[2,88]},{6:[2,36],25:[2,36],26:[2,36],51:[2,36],76:[2,36],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{8:302,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{70:[2,115],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,34],6:[2,34],25:[2,34],26:[2,34],46:[2,34],51:[2,34],54:[2,34],70:[2,34],76:[2,34],84:[2,34],89:[2,34],91:[2,34],100:[2,34],102:[2,34],103:[2,34],104:[2,34],108:[2,34],116:[2,34],124:[2,34],126:[2,34],127:[2,34],130:[2,34],131:[2,34],132:[2,34],133:[2,34],134:[2,34],135:[2,34]},{1:[2,106],6:[2,106],25:[2,106],26:[2,106],46:[2,106],51:[2,106],54:[2,106],64:[2,106],65:[2,106],66:[2,106],68:[2,106],70:[2,106],71:[2,106],72:[2,106],76:[2,106],82:[2,106],83:[2,106],84:[2,106],89:[2,106],91:[2,106],100:[2,106],102:[2,106],103:[2,106],104:[2,106],108:[2,106],116:[2,106],124:[2,106],126:[2,106],127:[2,106],130:[2,106],131:[2,106],132:[2,106],133:[2,106],134:[2,106],135:[2,106]},{1:[2,45],6:[2,45],25:[2,45],26:[2,45],46:[2,45],51:[2,45],54:[2,45],70:[2,45],76:[2,45],84:[2,45],89:[2,45],91:[2,45],100:[2,45],102:[2,45],103:[2,45],104:[2,45],108:[2,45],116:[2,45],124:[2,45],126:[2,45],127:[2,45],130:[2,45],131:[2,45],132:[2,45],133:[2,45],134:[2,45],135:[2,45]},{1:[2,194],6:[2,194],25:[2,194],26:[2,194],46:[2,194],51:[2,194],54:[2,194],70:[2,194],76:[2,194],84:[2,194],89:[2,194],91:[2,194],100:[2,194],102:[2,194],103:[2,194],104:[2,194],108:[2,194],116:[2,194],124:[2,194],126:[2,194],127:[2,194],130:[2,194],131:[2,194],132:[2,194],133:[2,194],134:[2,194],135:[2,194]},{1:[2,173],6:[2,173],25:[2,173],26:[2,173],46:[2,173],51:[2,173],54:[2,173],70:[2,173],76:[2,173],84:[2,173],89:[2,173],91:[2,173],100:[2,173],102:[2,173],103:[2,173],104:[2,173],108:[2,173],116:[2,173],119:[2,173],124:[2,173],126:[2,173],127:[2,173],130:[2,173],131:[2,173],132:[2,173],133:[2,173],134:[2,173],135:[2,173]},{1:[2,130],6:[2,130],25:[2,130],26:[2,130],46:[2,130],51:[2,130],54:[2,130],70:[2,130],76:[2,130],84:[2,130],89:[2,130],91:[2,130],100:[2,130],102:[2,130],103:[2,130],104:[2,130],108:[2,130],116:[2,130],124:[2,130],126:[2,130],127:[2,130],130:[2,130],131:[2,130],132:[2,130],133:[2,130],134:[2,130],135:[2,130]},{1:[2,131],6:[2,131],25:[2,131],26:[2,131],46:[2,131],51:[2,131],54:[2,131],70:[2,131],76:[2,131],84:[2,131],89:[2,131],91:[2,131],96:[2,131],100:[2,131],102:[2,131],103:[2,131],104:[2,131],108:[2,131],116:[2,131],124:[2,131],126:[2,131],127:[2,131],130:[2,131],131:[2,131],132:[2,131],133:[2,131],134:[2,131],135:[2,131]},{1:[2,164],6:[2,164],25:[2,164],26:[2,164],46:[2,164],51:[2,164],54:[2,164],70:[2,164],76:[2,164],84:[2,164],89:[2,164],91:[2,164],100:[2,164],102:[2,164],103:[2,164],104:[2,164],108:[2,164],116:[2,164],124:[2,164],126:[2,164],127:[2,164],130:[2,164],131:[2,164],132:[2,164],133:[2,164],134:[2,164],135:[2,164]},{5:303,25:[1,5]},{26:[1,304]},{6:[1,305],26:[2,170],119:[2,170],121:[2,170]},{8:306,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{1:[2,98],6:[2,98],25:[2,98],26:[2,98],46:[2,98],51:[2,98],54:[2,98],70:[2,98],76:[2,98],84:[2,98],89:[2,98],91:[2,98],100:[2,98],102:[2,98],103:[2,98],104:[2,98],108:[2,98],116:[2,98],124:[2,98],126:[2,98],127:[2,98],130:[2,98],131:[2,98],132:[2,98],133:[2,98],134:[2,98],135:[2,98]},{1:[2,134],6:[2,134],25:[2,134],26:[2,134],46:[2,134],51:[2,134],54:[2,134],64:[2,134],65:[2,134],66:[2,134],68:[2,134],70:[2,134],71:[2,134],72:[2,134],76:[2,134],82:[2,134],83:[2,134],84:[2,134],89:[2,134],91:[2,134],100:[2,134],102:[2,134],103:[2,134],104:[2,134],108:[2,134],116:[2,134],124:[2,134],126:[2,134],127:[2,134],130:[2,134],131:[2,134],132:[2,134],133:[2,134],134:[2,134],135:[2,134]},{1:[2,114],6:[2,114],25:[2,114],26:[2,114],46:[2,114],51:[2,114],54:[2,114],64:[2,114],65:[2,114],66:[2,114],68:[2,114],70:[2,114],71:[2,114],72:[2,114],76:[2,114],82:[2,114],83:[2,114],84:[2,114],89:[2,114],91:[2,114],100:[2,114],102:[2,114],103:[2,114],104:[2,114],108:[2,114],116:[2,114],124:[2,114],126:[2,114],127:[2,114],130:[2,114],131:[2,114],132:[2,114],133:[2,114],134:[2,114],135:[2,114]},{6:[2,120],25:[2,120],26:[2,120],51:[2,120],84:[2,120],89:[2,120]},{6:[2,49],25:[2,49],26:[2,49],50:307,51:[1,224]},{6:[2,121],25:[2,121],26:[2,121],51:[2,121],84:[2,121],89:[2,121]},{1:[2,159],6:[2,159],25:[2,159],26:[2,159],46:[2,159],51:[2,159],54:[2,159],70:[2,159],76:[2,159],84:[2,159],89:[2,159],91:[2,159],100:[2,159],101:84,102:[2,159],103:[2,159],104:[2,159],107:85,108:[2,159],109:66,116:[1,308],124:[2,159],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,161],6:[2,161],25:[2,161],26:[2,161],46:[2,161],51:[2,161],54:[2,161],70:[2,161],76:[2,161],84:[2,161],89:[2,161],91:[2,161],100:[2,161],101:84,102:[2,161],103:[1,309],104:[2,161],107:85,108:[2,161],109:66,116:[2,161],124:[2,161],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,160],6:[2,160],25:[2,160],26:[2,160],46:[2,160],51:[2,160],54:[2,160],70:[2,160],76:[2,160],84:[2,160],89:[2,160],91:[2,160],100:[2,160],101:84,102:[2,160],103:[2,160],104:[2,160],107:85,108:[2,160],109:66,116:[2,160],124:[2,160],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[2,89],25:[2,89],26:[2,89],51:[2,89],76:[2,89]},{6:[2,49],25:[2,49],26:[2,49],50:310,51:[1,235]},{26:[1,311],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{26:[1,312]},{1:[2,167],6:[2,167],25:[2,167],26:[2,167],46:[2,167],51:[2,167],54:[2,167],70:[2,167],76:[2,167],84:[2,167],89:[2,167],91:[2,167],100:[2,167],102:[2,167],103:[2,167],104:[2,167],108:[2,167],116:[2,167],124:[2,167],126:[2,167],127:[2,167],130:[2,167],131:[2,167],132:[2,167],133:[2,167],134:[2,167],135:[2,167]},{26:[2,171],119:[2,171],121:[2,171]},{25:[2,126],51:[2,126],101:84,102:[1,62],104:[1,63],107:85,108:[1,65],109:66,124:[1,83],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[1,262],25:[1,263],26:[1,313]},{8:314,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{8:315,9:115,10:19,11:20,12:21,13:[1,22],14:8,15:9,16:10,17:11,18:12,19:13,20:14,21:15,22:16,23:17,24:18,27:59,28:[1,70],29:49,30:[1,68],31:[1,69],32:24,33:[1,50],34:[1,51],35:[1,52],36:23,41:60,42:[1,44],43:[1,46],44:[1,29],47:30,48:[1,57],49:[1,58],55:47,56:48,58:36,61:25,62:26,63:27,74:[1,67],77:[1,43],81:[1,28],86:[1,55],87:[1,56],88:[1,54],94:[1,38],98:[1,45],99:[1,53],101:39,102:[1,62],104:[1,63],105:40,106:[1,64],107:41,108:[1,65],109:66,117:[1,42],122:37,123:[1,61],125:[1,31],126:[1,32],127:[1,33],128:[1,34],129:[1,35]},{6:[1,273],25:[1,274],26:[1,316]},{6:[2,37],25:[2,37],26:[2,37],51:[2,37],76:[2,37]},{1:[2,165],6:[2,165],25:[2,165],26:[2,165],46:[2,165],51:[2,165],54:[2,165],70:[2,165],76:[2,165],84:[2,165],89:[2,165],91:[2,165],100:[2,165],102:[2,165],103:[2,165],104:[2,165],108:[2,165],116:[2,165],124:[2,165],126:[2,165],127:[2,165],130:[2,165],131:[2,165],132:[2,165],133:[2,165],134:[2,165],135:[2,165]},{6:[2,122],25:[2,122],26:[2,122],51:[2,122],84:[2,122],89:[2,122]},{1:[2,162],6:[2,162],25:[2,162],26:[2,162],46:[2,162],51:[2,162],54:[2,162],70:[2,162],76:[2,162],84:[2,162],89:[2,162],91:[2,162],100:[2,162],101:84,102:[2,162],103:[2,162],104:[2,162],107:85,108:[2,162],109:66,116:[2,162],124:[2,162],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{1:[2,163],6:[2,163],25:[2,163],26:[2,163],46:[2,163],51:[2,163],54:[2,163],70:[2,163],76:[2,163],84:[2,163],89:[2,163],91:[2,163],100:[2,163],101:84,102:[2,163],103:[2,163],104:[2,163],107:85,108:[2,163],109:66,116:[2,163],124:[2,163],126:[1,77],127:[1,76],130:[1,75],131:[1,78],132:[1,79],133:[1,80],134:[1,81],135:[1,82]},{6:[2,90],25:[2,90],26:[2,90],51:[2,90],76:[2,90]}],
defaultActions: {57:[2,47],58:[2,48],72:[2,3],91:[2,104],187:[2,84]},
parseError: function parseError(str, hash) {
    throw new Error(str);
},
parse: function parse(input) {
    var self = this,
        stack = [0],
        vstack = [null], // semantic value stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        recovering = 0,
        TERROR = 2,
        EOF = 1;

    //this.reductionCount = this.shiftCount = 0;

    this.lexer.setInput(input);
    this.lexer.yy = this.yy;
    this.yy.lexer = this.lexer;

    if (typeof this.yy.parseError === 'function')
        this.parseError = this.yy.parseError;

    function popStack (n) {
        stack.length = stack.length - 2*n;
        vstack.length = vstack.length - n;
    }

    function lex() {
        var token;
        token = self.lexer.lex() || 1; // $end = 1
        // if token isn't its numeric value, convert
        if (typeof token !== 'number') {
            token = self.symbols_[token] || token;
        }
        return token;
    };

    var symbol, preErrorSymbol, state, action, a, r, yyval={},p,len,newState, expected;
    while (true) {
        // retreive state number from top of stack
        state = stack[stack.length-1];

        // use default actions if available
        if (this.defaultActions[state]) {
            action = this.defaultActions[state];
        } else {
            if (symbol == null)
                symbol = lex();
            // read action for current state and first input
            action = table[state] && table[state][symbol];
        }

        // handle parse error
        if (typeof action === 'undefined' || !action.length || !action[0]) {

            if (!recovering) {
                // Report error
                expected = [];
                for (p in table[state]) if (this.terminals_[p] && p > 2) {
                    expected.push("'"+this.terminals_[p]+"'");
                }
                var errStr = '';
                if (this.lexer.showPosition) {
                    errStr = 'Parse error on line '+(yylineno+1)+":\n"+this.lexer.showPosition()+'\nExpecting '+expected.join(', ');
                } else {
                    errStr = 'Parse error on line '+(yylineno+1)+": Unexpected " +
                                  (symbol == 1 /*EOF*/ ? "end of input" :
                                              ("'"+(this.terminals_[symbol] || symbol)+"'"));
                }
                this.parseError(errStr,
                    {text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, expected: expected});
            }

            // just recovered from another error
            if (recovering == 3) {
                if (symbol == EOF) {
                    throw new Error(errStr || 'Parsing halted.');
                }

                // discard current lookahead and grab another
                yyleng = this.lexer.yyleng;
                yytext = this.lexer.yytext;
                yylineno = this.lexer.yylineno;
                symbol = lex();
            }

            // try to recover from error
            while (1) {
                // check for error recovery rule in this state
                if ((TERROR.toString()) in table[state]) {
                    break;
                }
                if (state == 0) {
                    throw new Error(errStr || 'Parsing halted.');
                }
                popStack(1);
                state = stack[stack.length-1];
            }
            
            preErrorSymbol = symbol; // save the lookahead token
            symbol = TERROR;         // insert generic error symbol as new lookahead
            state = stack[stack.length-1];
            action = table[state] && table[state][TERROR];
            recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
        }

        // this shouldn't happen, unless resolve defaults are off
        if (action[0] instanceof Array && action.length > 1) {
            throw new Error('Parse Error: multiple actions possible at state: '+state+', token: '+symbol);
        }

        switch (action[0]) {

            case 1: // shift
                //this.shiftCount++;

                stack.push(symbol);
                vstack.push(this.lexer.yytext);
                stack.push(action[1]); // push state
                symbol = null;
                if (!preErrorSymbol) { // normal execution/no error
                    yyleng = this.lexer.yyleng;
                    yytext = this.lexer.yytext;
                    yylineno = this.lexer.yylineno;
                    if (recovering > 0)
                        recovering--;
                } else { // error just occurred, resume old lookahead f/ before error
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;

            case 2: // reduce
                //this.reductionCount++;

                len = this.productions_[action[1]][1];

                // perform semantic action
                yyval.$ = vstack[vstack.length-len]; // default to $$ = $1
                r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack);

                if (typeof r !== 'undefined') {
                    return r;
                }

                // pop off stack
                if (len) {
                    stack = stack.slice(0,-1*len*2);
                    vstack = vstack.slice(0, -1*len);
                }

                stack.push(this.productions_[action[1]][0]);    // push nonterminal (reduce)
                vstack.push(yyval.$);
                // goto new state = table[STATE][NONTERMINAL]
                newState = table[stack[stack.length-2]][stack[stack.length-1]];
                stack.push(newState);
                break;

            case 3: // accept
                return true;
        }

    }

    return true;
}};
return parser;
})();
if (typeof require !== 'undefined') {
exports.parser = parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); }
exports.main = function commonjsMain(args) {
    if (!args[1])
        throw new Error('Usage: '+args[0]+' FILE');
    if (typeof process !== 'undefined') {
        var source = require('fs').readFileSync(require('path').join(process.cwd(), args[1]), "utf8");
    } else {
        var cwd = require("file").path(require("file").cwd());
        var source = cwd.join(args[1]).read({charset: "utf-8"});
    }
    return exports.parser.parse(source);
}
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(typeof process !== 'undefined' ? process.argv.slice(1) : require("system").args);
}
}
};require['./scope'] = new function() {
  var exports = this;
  (function() {
  var Scope, extend, last, _ref;
  _ref = require('./helpers'), extend = _ref.extend, last = _ref.last;
  exports.Scope = Scope = (function() {
    Scope.root = null;
    function Scope(parent, expressions, method) {
      this.parent = parent;
      this.expressions = expressions;
      this.method = method;
      this.variables = [
        {
          name: 'arguments',
          type: 'arguments'
        }
      ];
      this.positions = {};
      if (!this.parent) {
        Scope.root = this;
      }
    }
    Scope.prototype.normalize = function(value) {
      if (typeof value === 'string') {
        return {
          kind: value
        };
      } else {
        return value;
      }
    };
    Scope.prototype.add = function(name, type, immediate) {
      var pos;
      if (this.shared && !immediate) {
        return this.parent.add(name, type, immediate);
      }
      type = this.normalize(type);
      if (typeof (pos = this.positions[name]) === 'number') {
        return this.variables[pos].type = type;
      } else {
        return this.positions[name] = this.variables.push({
          name: name,
          type: type
        }) - 1;
      }
    };
    Scope.prototype.find = function(name, options) {
      if (this.check(name, options)) {
        return true;
      }
      this.add(name, 'var');
      return false;
    };
    Scope.prototype.parameter = function(name) {
      if (this.shared && this.parent.check(name, true)) {
        return;
      }
      return this.add(name, 'param');
    };
    Scope.prototype.check = function(name, immediate) {
      var found, _ref;
      found = !!this.type(name);
      if (found || immediate) {
        return found;
      }
      return !!((_ref = this.parent) != null ? _ref.check(name) : void 0);
    };
    Scope.prototype.temporary = function(name, index) {
      if (name.length > 1) {
        return '_' + name + (index > 1 ? index : '');
      } else {
        return '_' + (index + parseInt(name, 36)).toString(36).replace(/\d/g, 'a');
      }
    };
    Scope.prototype.type = function(name) {
      var v, _i, _len, _ref;
      _ref = this.variables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v.name === name) {
          return v.type;
        }
      }
      return null;
    };
    Scope.prototype.freeVariable = function(type) {
      var index, temp;
      index = 0;
      while (this.check((temp = this.temporary(type, index)), true)) {
        index++;
      }
      this.add(temp, 'var', true);
      return temp;
    };
    Scope.prototype.assign = function(name, value) {
      this.add(name, {
        value: value,
        assigned: true
      });
      return this.hasAssignments = true;
    };
    Scope.prototype.hasDeclarations = function() {
      return !!this.declaredVariables().length;
    };
    Scope.prototype.declaredVariables = function() {
      var realVars, tempVars, v, _i, _len, _ref;
      realVars = [];
      tempVars = [];
      _ref = this.variables;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v.type.kind === 'var') {
          (v.name.charAt(0) === '_' ? tempVars : realVars).push(v.name);
        }
      }
      return realVars.sort().concat(tempVars.sort());
    };
    Scope.prototype.assignedVariables = function() {
      var v, _i, _len, _ref, _results;
      _ref = this.variables;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        v = _ref[_i];
        if (v.type.assigned) {
          _results.push("" + v.name + " = " + v.type.value);
        }
      }
      return _results;
    };
    return Scope;
  })();
}).call(this);

};require['./nodes'] = new function() {
  var exports = this;
  (function() {
  var Access, Arr, Assign, Base, Block, Call, Class, Closure, Code, Comment, Existence, Extends, For, IDENTIFIER, IS_STRING, If, In, Index, LEVEL_ACCESS, LEVEL_COND, LEVEL_LIST, LEVEL_OP, LEVEL_PAREN, LEVEL_TOP, Literal, NEGATE, NO, Obj, Op, Param, Parens, Push, Range, Return, SIMPLENUM, Scope, Slice, Splat, Switch, TAB, THIS, Throw, Try, UTILITIES, Value, While, YES, compact, del, ends, extend, flatten, last, merge, multident, starts, unfoldSoak, utility, _ref;
  var __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  }, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  Scope = require('./scope').Scope;
  _ref = require('./helpers'), compact = _ref.compact, flatten = _ref.flatten, extend = _ref.extend, merge = _ref.merge, del = _ref.del, starts = _ref.starts, ends = _ref.ends, last = _ref.last;
  exports.extend = extend;
  YES = function() {
    return true;
  };
  NO = function() {
    return false;
  };
  THIS = function() {
    return this;
  };
  NEGATE = function() {
    this.negated = !this.negated;
    return this;
  };
  exports.Base = Base = (function() {
    function Base() {}
    Base.prototype.compile = function(o, lvl) {
      var node;
      o = extend({}, o);
      if (lvl) {
        o.level = lvl;
      }
      node = this.unfoldSoak(o) || this;
      node.tab = o.indent;
      if (o.level === LEVEL_TOP || !node.isStatement(o)) {
        return node.compileNode(o);
      } else {
        return node.compileClosure(o);
      }
    };
    Base.prototype.compileClosure = function(o) {
      if (this.jumps() || this instanceof Throw) {
        throw SyntaxError('cannot use a pure statement in an expression.');
      }
      o.sharedScope = true;
      return Closure.wrap(this).compileNode(o);
    };
    Base.prototype.cache = function(o, level, reused) {
      var ref, sub;
      if (!this.isComplex()) {
        ref = level ? this.compile(o, level) : this;
        return [ref, ref];
      } else {
        ref = new Literal(reused || o.scope.freeVariable('ref'));
        sub = new Assign(ref, this);
        if (level) {
          return [sub.compile(o, level), ref.value];
        } else {
          return [sub, ref];
        }
      }
    };
    Base.prototype.compileLoopReference = function(o, name) {
      var src, tmp, _ref;
      src = tmp = this.compile(o, LEVEL_LIST);
      if (!((-Infinity < (_ref = +src) && _ref < Infinity) || IDENTIFIER.test(src) && o.scope.check(src, true))) {
        src = "" + (tmp = o.scope.freeVariable(name)) + " = " + src;
      }
      return [src, tmp];
    };
    Base.prototype.makeReturn = function() {
      return new Return(this);
    };
    Base.prototype.typeAnnotate = function(typeExp) {
      this.typeAnnotation = typeExp;
      return this;
    };
    Base.prototype.contains = function(pred) {
      var contains;
      contains = false;
      this.traverseChildren(false, function(node) {
        if (pred(node)) {
          contains = true;
          return false;
        }
      });
      return contains;
    };
    Base.prototype.containsType = function(type) {
      return this instanceof type || this.contains(function(node) {
        return node instanceof type;
      });
    };
    Base.prototype.lastNonComment = function(list) {
      var i;
      i = list.length;
      while (i--) {
        if (!(list[i] instanceof Comment)) {
          return list[i];
        }
      }
      return null;
    };
    Base.prototype.toString = function(idt, name) {
      var tree;
      if (idt == null) {
        idt = '';
      }
      if (name == null) {
        name = this.constructor.name;
      }
      tree = '\n' + idt + name;
      if (this.soak) {
        tree += '?';
      }
      this.eachChild(function(node) {
        return tree += node.toString(idt + TAB);
      });
      return tree;
    };
    Base.prototype.eachChild = function(func) {
      var attr, child, _i, _j, _len, _len2, _ref, _ref2;
      if (!this.children) {
        return this;
      }
      _ref = this.children;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        attr = _ref[_i];
        if (this[attr]) {
          _ref2 = flatten([this[attr]]);
          for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
            child = _ref2[_j];
            if (func(child) === false) {
              return this;
            }
          }
        }
      }
      return this;
    };
    Base.prototype.traverseChildren = function(crossScope, func) {
      return this.eachChild(function(child) {
        if (func(child) === false) {
          return false;
        }
        return child.traverseChildren(crossScope, func);
      });
    };
    Base.prototype.invert = function() {
      return new Op('!', this);
    };
    Base.prototype.unwrapAll = function() {
      var node;
      node = this;
      while (node !== (node = node.unwrap())) {
        continue;
      }
      return node;
    };
    Base.prototype.children = [];
    Base.prototype.isStatement = NO;
    Base.prototype.jumps = NO;
    Base.prototype.isComplex = YES;
    Base.prototype.isChainable = NO;
    Base.prototype.isAssignable = NO;
    Base.prototype.unwrap = THIS;
    Base.prototype.unfoldSoak = NO;
    Base.prototype.assigns = NO;
    return Base;
  })();
  exports.Block = Block = (function() {
    __extends(Block, Base);
    function Block(nodes) {
      this.expressions = compact(flatten(nodes || []));
    }
    Block.prototype.children = ['expressions'];
    Block.prototype.push = function(node) {
      this.expressions.push(node);
      return this;
    };
    Block.prototype.pop = function() {
      return this.expressions.pop();
    };
    Block.prototype.unshift = function(node) {
      this.expressions.unshift(node);
      return this;
    };
    Block.prototype.unwrap = function() {
      if (this.expressions.length === 1) {
        return this.expressions[0];
      } else {
        return this;
      }
    };
    Block.prototype.isEmpty = function() {
      return !this.expressions.length;
    };
    Block.prototype.isStatement = function(o) {
      var exp, _i, _len, _ref;
      _ref = this.expressions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        exp = _ref[_i];
        if (exp.isStatement(o)) {
          return true;
        }
      }
      return false;
    };
    Block.prototype.jumps = function(o) {
      var exp, _i, _len, _ref;
      _ref = this.expressions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        exp = _ref[_i];
        if (exp.jumps(o)) {
          return exp;
        }
      }
    };
    Block.prototype.makeReturn = function() {
      var expr, len;
      len = this.expressions.length;
      while (len--) {
        expr = this.expressions[len];
        if (!(expr instanceof Comment)) {
          this.expressions[len] = expr.makeReturn();
          if (expr instanceof Return && !expr.expression) {
            this.expressions.splice(len, 1);
          }
          break;
        }
      }
      return this;
    };
    Block.prototype.compile = function(o, level) {
      if (o == null) {
        o = {};
      }
      if (o.scope) {
        return Block.__super__.compile.call(this, o, level);
      } else {
        return this.compileRoot(o);
      }
    };
    Block.prototype.compileNode = function(o) {
      var code, codes, node, top, _i, _len, _ref;
      this.tab = o.indent;
      top = o.level === LEVEL_TOP;
      codes = [];
      _ref = this.expressions;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        node = node.unwrapAll();
        node = node.unfoldSoak(o) || node;
        if (top) {
          node.front = true;
          code = node.compile(o);
          codes.push(node.isStatement(o) ? code : this.tab + code + ';');
        } else {
          codes.push(node.compile(o, LEVEL_LIST));
        }
      }
      if (top) {
        return codes.join('\n');
      }
      code = codes.join(', ') || 'void 0';
      if (codes.length > 1 && o.level >= LEVEL_LIST) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    Block.prototype.compileRoot = function(o) {
      var code;
      o.indent = this.tab = o.bare ? '' : TAB;
      o.scope = new Scope(null, this, null);
      o.level = LEVEL_TOP;
      code = this.compileWithDeclarations(o);
      if (o.bare) {
        return code;
      } else {
        return "(function() {\n" + code + "\n}).call(this);\n";
      }
    };
    Block.prototype.compileWithDeclarations = function(o) {
      var code, exp, i, name, noTypeVars, post, rest, scope, t, tn, _i, _len, _len2, _ref, _ref2, _ref3;
      code = post = '';
      _ref = this.expressions;
      for (i = 0, _len = _ref.length; i < _len; i++) {
        exp = _ref[i];
        exp = exp.unwrap();
        if (!(exp instanceof Comment || exp instanceof Literal)) {
          break;
        }
      }
      o = merge(o, {
        level: LEVEL_TOP
      });
      if (i) {
        rest = this.expressions.splice(i, this.expressions.length);
        code = this.compileNode(o);
        this.expressions = rest;
      }
      post = this.compileNode(o);
      scope = o.scope;
      if (scope.expressions === this) {
        if (!o.globals && o.scope.hasDeclarations()) {
          noTypeVars = [];
          _ref2 = o.scope.declaredVariables();
          for (_i = 0, _len2 = _ref2.length; _i < _len2; _i++) {
            name = _ref2[_i];
            t = o.scope.type(name);
            tn = (_ref3 = t.typeAnnotation) != null ? _ref3.value : void 0;
            if (tn != null) {
              code += "" + this.tab + "/** @type {" + tn + "} */\n";
              code += "" + this.tab + "var " + name + ";\n";
            } else {
              noTypeVars.push(name);
            }
          }
          if (!!noTypeVars.length) {
            code += "" + this.tab + "var " + (noTypeVars.join(', ')) + ";\n";
          }
        }
        if (scope.hasAssignments) {
          code += "" + this.tab + "var " + (multident(scope.assignedVariables().join(', '), this.tab)) + ";\n";
        }
      }
      return code + post;
    };
    Block.wrap = function(nodes) {
      if (nodes.length === 1 && nodes[0] instanceof Block) {
        return nodes[0];
      }
      return new Block(nodes);
    };
    return Block;
  })();
  exports.Literal = Literal = (function() {
    __extends(Literal, Base);
    function Literal(value) {
      this.value = value;
    }
    Literal.prototype.makeReturn = function() {
      if (this.isStatement()) {
        return this;
      } else {
        return new Return(this);
      }
    };
    Literal.prototype.isAssignable = function() {
      return IDENTIFIER.test(this.value);
    };
    Literal.prototype.isStatement = function() {
      var _ref;
      return (_ref = this.value) === 'break' || _ref === 'continue' || _ref === 'debugger';
    };
    Literal.prototype.isComplex = NO;
    Literal.prototype.assigns = function(name) {
      return name === this.value;
    };
    Literal.prototype.jumps = function(o) {
      if (!this.isStatement()) {
        return false;
      }
      if (!(o && (o.loop || o.block && (this.value !== 'continue')))) {
        return this;
      } else {
        return false;
      }
    };
    Literal.prototype.compileNode = function(o) {
      var code;
      code = this.isUndefined ? o.level >= LEVEL_ACCESS ? '(void 0)' : 'void 0' : this.value.reserved ? "\"" + this.value + "\"" : this.value;
      if (this.isStatement()) {
        return "" + this.tab + code + ";";
      } else {
        return code;
      }
    };
    Literal.prototype.toString = function() {
      return ' "' + this.value + '"';
    };
    return Literal;
  })();
  exports.Return = Return = (function() {
    __extends(Return, Base);
    function Return(expr) {
      if (expr && !expr.unwrap().isUndefined) {
        this.expression = expr;
      }
    }
    Return.prototype.children = ['expression'];
    Return.prototype.isStatement = YES;
    Return.prototype.makeReturn = THIS;
    Return.prototype.jumps = THIS;
    Return.prototype.compile = function(o, level) {
      var expr, _ref;
      expr = (_ref = this.expression) != null ? _ref.makeReturn() : void 0;
      if (expr && !(expr instanceof Return)) {
        return expr.compile(o, level);
      } else {
        return Return.__super__.compile.call(this, o, level);
      }
    };
    Return.prototype.compileNode = function(o) {
      return this.tab + ("return" + (this.expression ? ' ' + this.expression.compile(o, LEVEL_PAREN) : '') + ";");
    };
    return Return;
  })();
  exports.Value = Value = (function() {
    __extends(Value, Base);
    function Value(base, props, tag) {
      if (!props && base instanceof Value) {
        return base;
      }
      this.base = base;
      this.properties = props || [];
      if (tag) {
        this[tag] = true;
      }
      return this;
    }
    Value.prototype.children = ['base', 'properties'];
    Value.prototype.push = function(prop) {
      this.properties.push(prop);
      return this;
    };
    Value.prototype.hasProperties = function() {
      return !!this.properties.length;
    };
    Value.prototype.isArray = function() {
      return !this.properties.length && this.base instanceof Arr;
    };
    Value.prototype.isComplex = function() {
      return this.hasProperties() || this.base.isComplex();
    };
    Value.prototype.isAssignable = function() {
      return this.hasProperties() || this.base.isAssignable();
    };
    Value.prototype.isSimpleNumber = function() {
      return this.base instanceof Literal && SIMPLENUM.test(this.base.value);
    };
    Value.prototype.isAtomic = function() {
      var node, _i, _len, _ref;
      _ref = this.properties.concat(this.base);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        if (node.soak || node instanceof Call) {
          return false;
        }
      }
      return true;
    };
    Value.prototype.isStatement = function(o) {
      return !this.properties.length && this.base.isStatement(o);
    };
    Value.prototype.assigns = function(name) {
      return !this.properties.length && this.base.assigns(name);
    };
    Value.prototype.jumps = function(o) {
      return !this.properties.length && this.base.jumps(o);
    };
    Value.prototype.isObject = function(onlyGenerated) {
      if (this.properties.length) {
        return false;
      }
      return (this.base instanceof Obj) && (!onlyGenerated || this.base.generated);
    };
    Value.prototype.isSplice = function() {
      return last(this.properties) instanceof Slice;
    };
    Value.prototype.makeReturn = function() {
      if (this.properties.length) {
        return Value.__super__.makeReturn.call(this);
      } else {
        return this.base.makeReturn();
      }
    };
    Value.prototype.unwrap = function() {
      if (this.properties.length) {
        return this;
      } else {
        return this.base;
      }
    };
    Value.prototype.cacheReference = function(o) {
      var base, bref, name, nref;
      name = last(this.properties);
      if (this.properties.length < 2 && !this.base.isComplex() && !(name != null ? name.isComplex() : void 0)) {
        return [this, this];
      }
      base = new Value(this.base, this.properties.slice(0, -1));
      if (base.isComplex()) {
        bref = new Literal(o.scope.freeVariable('base'));
        base = new Value(new Parens(new Assign(bref, base)));
      }
      if (!name) {
        return [base, bref];
      }
      if (name.isComplex()) {
        nref = new Literal(o.scope.freeVariable('name'));
        name = new Index(new Assign(nref, name.index));
        nref = new Index(nref);
      }
      return [base.push(name), new Value(bref || base.base, [nref || name])];
    };
    Value.prototype.compileNode = function(o) {
      var code, prop, props, _i, _len;
      this.base.front = this.front;
      props = this.properties;
      code = this.base.compile(o, props.length ? LEVEL_ACCESS : null);
      if (props[0] instanceof Access && this.isSimpleNumber()) {
        code = "(" + code + ")";
      }
      for (_i = 0, _len = props.length; _i < _len; _i++) {
        prop = props[_i];
        code += prop.compile(o);
      }
      return code;
    };
    Value.prototype.unfoldSoak = function(o) {
      var fst, i, ifn, prop, ref, snd, _len, _ref;
      if (ifn = this.base.unfoldSoak(o)) {
        Array.prototype.push.apply(ifn.body.properties, this.properties);
        return ifn;
      }
      _ref = this.properties;
      for (i = 0, _len = _ref.length; i < _len; i++) {
        prop = _ref[i];
        if (prop.soak) {
          prop.soak = false;
          fst = new Value(this.base, this.properties.slice(0, i));
          snd = new Value(this.base, this.properties.slice(i));
          if (fst.isComplex()) {
            ref = new Literal(o.scope.freeVariable('ref'));
            fst = new Parens(new Assign(ref, fst));
            snd.base = ref;
          }
          return new If(new Existence(fst), snd, {
            soak: true
          });
        }
      }
      return null;
    };
    return Value;
  })();
  exports.Comment = Comment = (function() {
    __extends(Comment, Base);
    function Comment(comment) {
      this.comment = comment;
    }
    Comment.prototype.isStatement = YES;
    Comment.prototype.makeReturn = THIS;
    Comment.prototype.compileNode = function(o, level) {
      var code;
      code = '/*' + multident(this.comment, this.tab) + '*/';
      if ((level || o.level) === LEVEL_TOP) {
        code = o.indent + code;
      }
      return code;
    };
    return Comment;
  })();
  exports.Call = Call = (function() {
    __extends(Call, Base);
    function Call(variable, args, soak) {
      this.args = args != null ? args : [];
      this.soak = soak;
      this.isNew = false;
      this.isSuper = variable === 'super';
      this.variable = this.isSuper ? null : variable;
    }
    Call.prototype.children = ['variable', 'args'];
    Call.prototype.newInstance = function() {
      var base;
      base = this.variable.base || this.variable;
      if (base instanceof Call) {
        base.newInstance();
      } else {
        this.isNew = true;
      }
      return this;
    };
    Call.prototype.superReference = function(o) {
      var method, name;
      method = o.scope.method;
      if (!method) {
        throw SyntaxError('cannot call super outside of a function.');
      }
      name = method.name;
      if (!name) {
        throw SyntaxError('cannot call super on an anonymous function.');
      }
      if (method.klass) {
        return "" + method.klass + ".__super__." + name;
      } else {
        return "" + name + ".__super__.constructor";
      }
    };
    Call.prototype.unfoldSoak = function(o) {
      var call, ifn, left, list, rite, _i, _len, _ref, _ref2;
      if (this.soak) {
        if (this.variable) {
          if (ifn = unfoldSoak(o, this, 'variable')) {
            return ifn;
          }
          _ref = new Value(this.variable).cacheReference(o), left = _ref[0], rite = _ref[1];
        } else {
          left = new Literal(this.superReference(o));
          rite = new Value(left);
        }
        rite = new Call(rite, this.args);
        rite.isNew = this.isNew;
        left = new Literal("typeof " + (left.compile(o)) + " == \"function\"");
        return new If(left, new Value(rite), {
          soak: true
        });
      }
      call = this;
      list = [];
      while (true) {
        if (call.variable instanceof Call) {
          list.push(call);
          call = call.variable;
          continue;
        }
        if (!(call.variable instanceof Value)) {
          break;
        }
        list.push(call);
        if (!((call = call.variable.base) instanceof Call)) {
          break;
        }
      }
      _ref2 = list.reverse();
      for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
        call = _ref2[_i];
        if (ifn) {
          if (call.variable instanceof Call) {
            call.variable = ifn;
          } else {
            call.variable.base = ifn;
          }
        }
        ifn = unfoldSoak(o, call, 'variable');
      }
      return ifn;
    };
    Call.prototype.filterImplicitObjects = function(list) {
      var node, nodes, obj, prop, properties, _i, _j, _len, _len2, _ref;
      nodes = [];
      for (_i = 0, _len = list.length; _i < _len; _i++) {
        node = list[_i];
        if (!((typeof node.isObject == "function" ? node.isObject() : void 0) && node.base.generated)) {
          nodes.push(node);
          continue;
        }
        obj = null;
        _ref = node.base.properties;
        for (_j = 0, _len2 = _ref.length; _j < _len2; _j++) {
          prop = _ref[_j];
          if (prop instanceof Assign) {
            if (!obj) {
              nodes.push(obj = new Obj(properties = [], true));
            }
            properties.push(prop);
          } else {
            nodes.push(prop);
            obj = null;
          }
        }
      }
      return nodes;
    };
    Call.prototype.compileNode = function(o) {
      var arg, args, code, _ref;
      if ((_ref = this.variable) != null) {
        _ref.front = this.front;
      }
      if (code = Splat.compileSplattedArray(o, this.args, true)) {
        return this.compileSplat(o, code);
      }
      args = this.filterImplicitObjects(this.args);
      args = ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = args.length; _i < _len; _i++) {
          arg = args[_i];
          _results.push(arg.compile(o, LEVEL_LIST));
        }
        return _results;
      })()).join(', ');
      if (this.isSuper) {
        return this.superReference(o) + (".call(this" + (args && ', ' + args) + ")");
      } else {
        return (this.isNew ? 'new ' : '') + this.variable.compile(o, LEVEL_ACCESS) + ("(" + args + ")");
      }
    };
    Call.prototype.compileSuper = function(args, o) {
      return "" + (this.superReference(o)) + ".call(this" + (args.length ? ', ' : '') + args + ")";
    };
    Call.prototype.compileSplat = function(o, splatArgs) {
      var base, fun, idt, name, ref;
      if (this.isSuper) {
        return "" + (this.superReference(o)) + ".apply(this, " + splatArgs + ")";
      }
      if (this.isNew) {
        idt = this.tab + TAB;
        return "(function(func, args, ctor) {\n" + idt + "ctor.prototype = func.prototype;\n" + idt + "var child = new ctor, result = func.apply(child, args);\n" + idt + "return typeof result == \"object\" ? result : child;\n" + this.tab + "})(" + (this.variable.compile(o, LEVEL_LIST)) + ", " + splatArgs + ", function() {})";
      }
      base = new Value(this.variable);
      if ((name = base.properties.pop()) && base.isComplex()) {
        ref = o.scope.freeVariable('ref');
        fun = "(" + ref + " = " + (base.compile(o, LEVEL_LIST)) + ")" + (name.compile(o));
      } else {
        fun = base.compile(o, LEVEL_ACCESS);
        if (SIMPLENUM.test(fun)) {
          fun = "(" + fun + ")";
        }
        if (name) {
          ref = fun;
          fun += name.compile(o);
        } else {
          ref = 'null';
        }
      }
      return "" + fun + ".apply(" + ref + ", " + splatArgs + ")";
    };
    return Call;
  })();
  exports.Extends = Extends = (function() {
    __extends(Extends, Base);
    function Extends(child, parent) {
      this.child = child;
      this.parent = parent;
    }
    Extends.prototype.children = ['child', 'parent'];
    Extends.prototype.compile = function(o) {
      utility('hasProp');
      return new Call(new Value(new Literal(utility('extends'))), [this.child, this.parent]).compile(o);
    };
    return Extends;
  })();
  exports.Access = Access = (function() {
    __extends(Access, Base);
    function Access(name, tag) {
      this.name = name;
      this.name.asKey = true;
      this.proto = tag === 'proto' ? '.prototype' : '';
      this.soak = tag === 'soak';
    }
    Access.prototype.children = ['name'];
    Access.prototype.compile = function(o) {
      var name;
      name = this.name.compile(o);
      return this.proto + (IS_STRING.test(name) ? "[" + name + "]" : "." + name);
    };
    Access.prototype.isComplex = NO;
    return Access;
  })();
  exports.Index = Index = (function() {
    __extends(Index, Base);
    function Index(index) {
      this.index = index;
    }
    Index.prototype.children = ['index'];
    Index.prototype.compile = function(o) {
      return (this.proto ? '.prototype' : '') + ("[" + (this.index.compile(o, LEVEL_PAREN)) + "]");
    };
    Index.prototype.isComplex = function() {
      return this.index.isComplex();
    };
    return Index;
  })();
  exports.Range = Range = (function() {
    __extends(Range, Base);
    Range.prototype.children = ['from', 'to'];
    function Range(from, to, tag) {
      this.from = from;
      this.to = to;
      this.exclusive = tag === 'exclusive';
      this.equals = this.exclusive ? '' : '=';
    }
    Range.prototype.compileVariables = function(o) {
      var parts, _ref, _ref2, _ref3;
      o = merge(o, {
        top: true
      });
      _ref = this.from.cache(o, LEVEL_LIST), this.from = _ref[0], this.fromVar = _ref[1];
      _ref2 = this.to.cache(o, LEVEL_LIST), this.to = _ref2[0], this.toVar = _ref2[1];
      _ref3 = [this.fromVar.match(SIMPLENUM), this.toVar.match(SIMPLENUM)], this.fromNum = _ref3[0], this.toNum = _ref3[1];
      parts = [];
      if (this.from !== this.fromVar) {
        parts.push(this.from);
      }
      if (this.to !== this.toVar) {
        return parts.push(this.to);
      }
    };
    Range.prototype.compileNode = function(o) {
      var compare, idx, incr, intro, step, stepPart, vars;
      this.compileVariables(o);
      if (!o.index) {
        return this.compileArray(o);
      }
      if (this.fromNum && this.toNum) {
        return this.compileSimple(o);
      }
      idx = del(o, 'index');
      step = del(o, 'step');
      vars = ("" + idx + " = " + this.from) + (this.to !== this.toVar ? ", " + this.to : '');
      intro = "(" + this.fromVar + " <= " + this.toVar + " ? " + idx;
      compare = "" + intro + " <" + this.equals + " " + this.toVar + " : " + idx + " >" + this.equals + " " + this.toVar + ")";
      stepPart = step ? step.compile(o) : '1';
      incr = step ? "" + idx + " += " + stepPart : "" + intro + " += " + stepPart + " : " + idx + " -= " + stepPart + ")";
      return "" + vars + "; " + compare + "; " + incr;
    };
    Range.prototype.compileSimple = function(o) {
      var from, idx, step, to, _ref;
      _ref = [+this.fromNum, +this.toNum], from = _ref[0], to = _ref[1];
      idx = del(o, 'index');
      step = del(o, 'step');
      step && (step = "" + idx + " += " + (step.compile(o)));
      if (from <= to) {
        return "" + idx + " = " + from + "; " + idx + " <" + this.equals + " " + to + "; " + (step || ("" + idx + "++"));
      } else {
        return "" + idx + " = " + from + "; " + idx + " >" + this.equals + " " + to + "; " + (step || ("" + idx + "--"));
      }
    };
    Range.prototype.compileArray = function(o) {
      var body, clause, i, idt, post, pre, range, result, vars, _i, _ref, _ref2, _results;
      if (this.fromNum && this.toNum && Math.abs(this.fromNum - this.toNum) <= 20) {
        range = (function() {
          _results = [];
          for (var _i = _ref = +this.fromNum, _ref2 = +this.toNum; _ref <= _ref2 ? _i <= _ref2 : _i >= _ref2; _ref <= _ref2 ? _i += 1 : _i -= 1){ _results.push(_i); }
          return _results;
        }).apply(this, arguments);
        if (this.exclusive) {
          range.pop();
        }
        return "[" + (range.join(', ')) + "]";
      }
      idt = this.tab + TAB;
      i = o.scope.freeVariable('i');
      result = o.scope.freeVariable('results');
      pre = "\n" + idt + result + " = [];";
      if (this.fromNum && this.toNum) {
        o.index = i;
        body = this.compileSimple(o);
      } else {
        vars = ("" + i + " = " + this.from) + (this.to !== this.toVar ? ", " + this.to : '');
        clause = "" + this.fromVar + " <= " + this.toVar + " ?";
        body = "var " + vars + "; " + clause + " " + i + " <" + this.equals + " " + this.toVar + " : " + i + " >" + this.equals + " " + this.toVar + "; " + clause + " " + i + " += 1 : " + i + " -= 1";
      }
      post = "{ " + result + ".push(" + i + "); }\n" + idt + "return " + result + ";\n" + o.indent;
      return "(function() {" + pre + "\n" + idt + "for (" + body + ")" + post + "}).apply(this, arguments)";
    };
    return Range;
  })();
  exports.Slice = Slice = (function() {
    __extends(Slice, Base);
    Slice.prototype.children = ['range'];
    function Slice(range) {
      this.range = range;
      Slice.__super__.constructor.call(this);
    }
    Slice.prototype.compileNode = function(o) {
      var compiled, from, fromStr, to, toStr, _ref;
      _ref = this.range, to = _ref.to, from = _ref.from;
      fromStr = from && from.compile(o, LEVEL_PAREN) || '0';
      compiled = to && to.compile(o, LEVEL_PAREN);
      if (to && !(!this.range.exclusive && +compiled === -1)) {
        toStr = ', ' + (this.range.exclusive ? compiled : SIMPLENUM.test(compiled) ? (+compiled + 1).toString() : "(" + compiled + " + 1) || 9e9");
      }
      return ".slice(" + fromStr + (toStr || '') + ")";
    };
    return Slice;
  })();
  exports.Obj = Obj = (function() {
    __extends(Obj, Base);
    function Obj(props, generated) {
      this.generated = generated != null ? generated : false;
      this.objects = this.properties = props || [];
    }
    Obj.prototype.children = ['properties'];
    Obj.prototype.compileNode = function(o) {
      var i, idt, indent, join, lastNoncom, node, obj, prop, props, _i, _len;
      props = this.properties;
      if (!props.length) {
        if (this.front) {
          return '({})';
        } else {
          return '{}';
        }
      }
      if (this.generated) {
        for (_i = 0, _len = props.length; _i < _len; _i++) {
          node = props[_i];
          if (node instanceof Value) {
            throw new Error('cannot have an implicit value in an implicit object');
          }
        }
      }
      idt = o.indent += TAB;
      lastNoncom = this.lastNonComment(this.properties);
      props = (function() {
        var _len, _results;
        _results = [];
        for (i = 0, _len = props.length; i < _len; i++) {
          prop = props[i];
          join = i === props.length - 1 ? '' : prop === lastNoncom || prop instanceof Comment ? '\n' : ',\n';
          indent = prop instanceof Comment ? '' : idt;
          if (prop instanceof Value && prop["this"]) {
            prop = new Assign(prop.properties[0].name, prop, 'object');
          }
          if (!(prop instanceof Comment)) {
            if (!(prop instanceof Assign)) {
              prop = new Assign(prop, prop, 'object');
            }
            (prop.variable.base || prop.variable).asKey = true;
          }
          _results.push(indent + prop.compile(o, LEVEL_TOP) + join);
        }
        return _results;
      })();
      props = props.join('');
      obj = "{" + (props && '\n' + props + '\n' + this.tab) + "}";
      if (this.front) {
        return "(" + obj + ")";
      } else {
        return obj;
      }
    };
    Obj.prototype.assigns = function(name) {
      var prop, _i, _len, _ref;
      _ref = this.properties;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        prop = _ref[_i];
        if (prop.assigns(name)) {
          return true;
        }
      }
      return false;
    };
    return Obj;
  })();
  exports.Arr = Arr = (function() {
    __extends(Arr, Base);
    function Arr(objs) {
      this.objects = objs || [];
    }
    Arr.prototype.children = ['objects'];
    Arr.prototype.filterImplicitObjects = Call.prototype.filterImplicitObjects;
    Arr.prototype.compileNode = function(o) {
      var code, obj, objs;
      if (!this.objects.length) {
        return '[]';
      }
      o.indent += TAB;
      objs = this.filterImplicitObjects(this.objects);
      if (code = Splat.compileSplattedArray(o, objs)) {
        return code;
      }
      code = ((function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = objs.length; _i < _len; _i++) {
          obj = objs[_i];
          _results.push(obj.compile(o, LEVEL_LIST));
        }
        return _results;
      })()).join(', ');
      if (code.indexOf('\n') >= 0) {
        return "[\n" + o.indent + code + "\n" + this.tab + "]";
      } else {
        return "[" + code + "]";
      }
    };
    Arr.prototype.assigns = function(name) {
      var obj, _i, _len, _ref;
      _ref = this.objects;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        obj = _ref[_i];
        if (obj.assigns(name)) {
          return true;
        }
      }
      return false;
    };
    return Arr;
  })();
  exports.Class = Class = (function() {
    __extends(Class, Base);
    function Class(variable, parent, body) {
      this.variable = variable;
      this.parent = parent;
      this.body = body != null ? body : new Block;
      this.boundFuncs = [];
      this.body.classBody = true;
    }
    Class.prototype.children = ['variable', 'parent', 'body'];
    Class.prototype.determineName = function() {
      var decl, tail;
      if (!this.variable) {
        return null;
      }
      decl = (tail = last(this.variable.properties)) ? tail instanceof Access && tail.name.value : this.variable.base.value;
      return decl && (decl = IDENTIFIER.test(decl) && decl);
    };
    Class.prototype.setContext = function(name) {
      return this.body.traverseChildren(false, function(node) {
        if (node.classBody) {
          return false;
        }
        if (node instanceof Literal && node.value === 'this') {
          return node.value = name;
        } else if (node instanceof Code) {
          node.klass = name;
          if (node.bound) {
            return node.context = name;
          }
        }
      });
    };
    Class.prototype.addBoundFunctions = function(o) {
      var bname, bvar, _i, _len, _ref, _results;
      if (this.boundFuncs.length) {
        _ref = this.boundFuncs;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          bvar = _ref[_i];
          bname = bvar.compile(o);
          _results.push(this.ctor.body.unshift(new Literal("this." + bname + " = " + (utility('bind')) + "(this." + bname + ", this);")));
        }
        return _results;
      }
    };
    Class.prototype.addProperties = function(node, name) {
      var assign, base, func, props, _results;
      props = node.base.properties.slice(0);
      _results = [];
      while (assign = props.shift()) {
        if (assign instanceof Assign) {
          base = assign.variable.base;
          delete assign.context;
          func = assign.value;
          if (base.value === 'constructor') {
            if (this.ctor) {
              throw new Error('cannot define more than one constructor in a class');
            }
            if (func.bound) {
              throw new Error('cannot define a constructor as a bound function');
            }
            if (func instanceof Code) {
              assign = this.ctor = func;
            } else {
              assign = this.ctor = new Assign(new Value(new Literal(name)), func);
            }
          } else {
            if (!assign.variable["this"]) {
              assign.variable = new Value(new Literal(name), [new Access(base, 'proto')]);
            }
            if (func instanceof Code && func.bound) {
              this.boundFuncs.push(base);
              func.bound = false;
            }
          }
        }
        _results.push(assign);
      }
      return _results;
    };
    Class.prototype.walkBody = function(name) {
      return this.traverseChildren(false, __bind(function(child) {
        var exps, i, node, _len, _ref;
        if (child instanceof Class) {
          return false;
        }
        if (child instanceof Block) {
          _ref = exps = child.expressions;
          for (i = 0, _len = _ref.length; i < _len; i++) {
            node = _ref[i];
            if (node instanceof Value && node.isObject(true)) {
              exps[i] = this.addProperties(node, name);
            }
          }
          return child.expressions = exps = flatten(exps);
        }
      }, this));
    };
    Class.prototype.ensureConstructor = function(name) {
      if (!this.ctor) {
        this.ctor = new Code;
        if (this.parent) {
          this.ctor.body.push(new Call('super', [new Splat(new Literal('arguments'))]));
        }
        this.body.expressions.unshift(this.ctor);
      }
      this.ctor.ctor = this.ctor.name = name;
      this.ctor.klass = null;
      return this.ctor.noReturn = true;
    };
    Class.prototype.compileNode = function(o) {
      var decl, klass, lname, name;
      decl = this.determineName();
      name = decl || this.name || '_Class';
      lname = new Literal(name);
      this.setContext(name);
      this.walkBody(name);
      if (this.parent) {
        this.body.expressions.unshift(new Extends(lname, this.parent));
      }
      this.ensureConstructor(name);
      this.body.expressions.push(lname);
      this.addBoundFunctions(o);
      klass = new Parens(Closure.wrap(this.body), true);
      if (this.variable) {
        klass = new Assign(this.variable, klass);
      }
      return klass.compile(o);
    };
    return Class;
  })();
  exports.Assign = Assign = (function() {
    __extends(Assign, Base);
    function Assign(variable, value, context, options) {
      this.variable = variable;
      this.value = value;
      this.context = context;
      this.param = options && options.param;
    }
    Assign.prototype.METHOD_DEF = /^(?:(\S+)\.prototype\.|\S+?)?\b([$A-Za-z_][$\w\x7f-\uffff]*)$/;
    Assign.prototype.children = ['variable', 'value'];
    Assign.prototype.assigns = function(name) {
      return this[this.context === 'object' ? 'value' : 'variable'].assigns(name);
    };
    Assign.prototype.unfoldSoak = function(o) {
      return unfoldSoak(o, this, 'variable');
    };
    Assign.prototype.compileNode = function(o) {
      var isValue, match, name, val, _ref;
      if (isValue = this.variable instanceof Value) {
        if (this.variable.isArray() || this.variable.isObject()) {
          return this.compilePatternMatch(o);
        }
        if (this.variable.isSplice()) {
          return this.compileSplice(o);
        }
        if ((_ref = this.context) === '||=' || _ref === '&&=' || _ref === '?=') {
          return this.compileConditional(o);
        }
      }
      name = this.variable.compile(o, LEVEL_LIST);
      if (this.value instanceof Code && (match = this.METHOD_DEF.exec(name))) {
        this.value.name = match[2];
        if (match[1]) {
          this.value.klass = match[1];
        }
      }
      val = this.value.compile(o, LEVEL_LIST);
      if (this.context === 'object') {
        return "" + name + ": " + val;
      }
      if (!this.variable.isAssignable()) {
        throw SyntaxError("\"" + (this.variable.compile(o)) + "\" cannot be assigned.");
      }
      if (!(this.context || isValue && (this.variable.namespaced || this.variable.hasProperties()))) {
        if (this.param) {
          o.scope.add(name, 'var');
        } else {
          o.scope.find(name);
        }
        if (o.scope.type(name) != null) {
          o.scope.type(name).typeAnnotation = this.variable.typeAnnotation;
        }
      }
      val = name + (" " + (this.context || '=') + " ") + val;
      if (o.level <= LEVEL_LIST) {
        return val;
      } else {
        return "(" + val + ")";
      }
    };
    Assign.prototype.compilePatternMatch = function(o) {
      var acc, assigns, code, i, idx, isObject, ivar, obj, objects, olen, ref, rest, splat, top, val, value, vvar, _len, _ref, _ref2, _ref3, _ref4;
      top = o.level === LEVEL_TOP;
      value = this.value;
      objects = this.variable.base.objects;
      if (!(olen = objects.length)) {
        if (top) {
          return false;
        }
        code = value.compile(o);
        if (o.level >= LEVEL_OP) {
          return "(" + code + ")";
        } else {
          return code;
        }
      }
      isObject = this.variable.isObject();
      if (top && olen === 1 && !((obj = objects[0]) instanceof Splat)) {
        if (obj instanceof Assign) {
          _ref = obj, idx = _ref.variable.base, obj = _ref.value;
        } else {
          if (obj.base instanceof Parens) {
            _ref2 = new Value(obj.unwrapAll()).cacheReference(o), obj = _ref2[0], idx = _ref2[1];
          } else {
            idx = isObject ? obj["this"] ? obj.properties[0].name : obj : new Literal(0);
          }
        }
        acc = IDENTIFIER.test(idx.unwrap().value || 0);
        value = new Value(value);
        value.properties.push(new (acc ? Access : Index)(idx));
        return new Assign(obj, value).compile(o);
      }
      vvar = value.compile(o, LEVEL_LIST);
      assigns = [];
      splat = false;
      if (!IDENTIFIER.test(vvar) || this.variable.assigns(vvar)) {
        assigns.push("" + (ref = o.scope.freeVariable('ref')) + " = " + vvar);
        vvar = ref;
      }
      for (i = 0, _len = objects.length; i < _len; i++) {
        obj = objects[i];
        idx = i;
        if (isObject) {
          if (obj instanceof Assign) {
            _ref3 = obj, idx = _ref3.variable.base, obj = _ref3.value;
          } else {
            if (obj.base instanceof Parens) {
              _ref4 = new Value(obj.unwrapAll()).cacheReference(o), obj = _ref4[0], idx = _ref4[1];
            } else {
              idx = obj["this"] ? obj.properties[0].name : obj;
            }
          }
        }
        if (!splat && obj instanceof Splat) {
          val = "" + olen + " <= " + vvar + ".length ? " + (utility('slice')) + ".call(" + vvar + ", " + i;
          if (rest = olen - i - 1) {
            ivar = o.scope.freeVariable('i');
            val += ", " + ivar + " = " + vvar + ".length - " + rest + ") : (" + ivar + " = " + i + ", [])";
          } else {
            val += ") : []";
          }
          val = new Literal(val);
          splat = "" + ivar + "++";
        } else {
          if (obj instanceof Splat) {
            obj = obj.name.compile(o);
            throw SyntaxError("multiple splats are disallowed in an assignment: " + obj + " ...");
          }
          if (typeof idx === 'number') {
            idx = new Literal(splat || idx);
            acc = false;
          } else {
            acc = isObject && IDENTIFIER.test(idx.unwrap().value || 0);
          }
          val = new Value(new Literal(vvar), [new (acc ? Access : Index)(idx)]);
        }
        assigns.push(new Assign(obj, val, null, {
          param: this.param
        }).compile(o, LEVEL_TOP));
      }
      if (!top) {
        assigns.push(vvar);
      }
      code = (compact(assigns)).join(', ');
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    Assign.prototype.compileConditional = function(o) {
      var left, rite, _ref;
      _ref = this.variable.cacheReference(o), left = _ref[0], rite = _ref[1];
      return new Op(this.context.slice(0, -1), left, new Assign(rite, this.value, '=')).compile(o);
    };
    Assign.prototype.compileSplice = function(o) {
      var code, exclusive, from, fromDecl, fromRef, name, to, valDef, valRef, _ref, _ref2, _ref3;
      _ref = this.variable.properties.pop().range, from = _ref.from, to = _ref.to, exclusive = _ref.exclusive;
      name = this.variable.compile(o);
      _ref2 = (from != null ? from.cache(o, LEVEL_OP) : void 0) || ['0', '0'], fromDecl = _ref2[0], fromRef = _ref2[1];
      if (to) {
        if ((from != null ? from.isSimpleNumber() : void 0) && to.isSimpleNumber()) {
          to = +to.compile(o) - +fromRef;
          if (!exclusive) {
            to += 1;
          }
        } else {
          to = to.compile(o) + ' - ' + fromRef;
          if (!exclusive) {
            to += ' + 1';
          }
        }
      } else {
        to = "9e9";
      }
      _ref3 = this.value.cache(o, LEVEL_LIST), valDef = _ref3[0], valRef = _ref3[1];
      code = "[].splice.apply(" + name + ", [" + fromDecl + ", " + to + "].concat(" + valDef + ")), " + valRef;
      if (o.level > LEVEL_TOP) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    return Assign;
  })();
  exports.Code = Code = (function() {
    __extends(Code, Base);
    function Code(params, body, tag) {
      this.params = params || [];
      this.body = body || new Block;
      this.bound = tag === 'boundfunc';
      if (this.bound) {
        this.context = 'this';
      }
    }
    Code.prototype.children = ['params', 'body'];
    Code.prototype.isStatement = function() {
      return !!this.ctor;
    };
    Code.prototype.jumps = NO;
    Code.prototype.compileNode = function(o) {
      var code, exprs, i, idt, lit, p, param, ref, splats, v, val, vars, wasEmpty, _i, _j, _len, _len2, _len3, _ref, _ref2, _ref3;
      o.scope = new Scope(o.scope, this.body, this);
      o.scope.shared = del(o, 'sharedScope');
      o.indent += TAB;
      delete o.bare;
      delete o.globals;
      vars = [];
      exprs = [];
      _ref = this.params;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        param = _ref[_i];
        if (param.splat) {
          if (param.name.value) {
            o.scope.add(param.name.value, 'var');
          }
          splats = new Assign(new Value(new Arr((function() {
            var _i, _len, _ref, _results;
            _ref = this.params;
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              p = _ref[_i];
              _results.push(p.asReference(o));
            }
            return _results;
          }).call(this))), new Value(new Literal('arguments')));
          break;
        }
      }
      _ref2 = this.params;
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        param = _ref2[_j];
        if (param.isComplex()) {
          val = ref = param.asReference(o);
          if (param.value) {
            val = new Op('?', ref, param.value);
          }
          exprs.push(new Assign(new Value(param.name), val, '=', {
            param: true
          }));
        } else {
          ref = param;
          if (param.value) {
            lit = new Literal(ref.name.value + ' == null');
            val = new Assign(new Value(param.name), param.value, '=');
            exprs.push(new If(lit, val));
          }
        }
        if (!splats) {
          vars.push(ref);
        }
      }
      wasEmpty = this.body.isEmpty();
      if (splats) {
        exprs.unshift(splats);
      }
      if (exprs.length) {
        (_ref3 = this.body.expressions).unshift.apply(_ref3, exprs);
      }
      if (!splats) {
        for (i = 0, _len3 = vars.length; i < _len3; i++) {
          v = vars[i];
          o.scope.parameter(vars[i] = v.compile(o));
        }
      }
      if (!(wasEmpty || this.noReturn)) {
        this.body.makeReturn();
      }
      idt = o.indent;
      code = 'function';
      if (this.ctor) {
        code += ' ' + this.name;
      }
      code += '(' + vars.join(', ') + ') {';
      if (!this.body.isEmpty()) {
        code += "\n" + (this.body.compileWithDeclarations(o)) + "\n" + this.tab;
      }
      code += '}';
      if (this.ctor) {
        return this.tab + code;
      }
      if (this.bound) {
        return utility('bind') + ("(" + code + ", " + this.context + ")");
      }
      if (this.front || (o.level >= LEVEL_ACCESS)) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    Code.prototype.traverseChildren = function(crossScope, func) {
      if (crossScope) {
        return Code.__super__.traverseChildren.call(this, crossScope, func);
      }
    };
    return Code;
  })();
  exports.Param = Param = (function() {
    __extends(Param, Base);
    function Param(name, value, splat) {
      this.name = name;
      this.value = value;
      this.splat = splat;
    }
    Param.prototype.children = ['name', 'value'];
    Param.prototype.compile = function(o) {
      return this.name.compile(o, LEVEL_LIST);
    };
    Param.prototype.asReference = function(o) {
      var node;
      if (this.reference) {
        return this.reference;
      }
      node = this.name;
      if (node["this"]) {
        node = node.properties[0].name;
        if (node.value.reserved) {
          node = new Literal('_' + node.value);
        }
      } else if (node.isComplex()) {
        node = new Literal(o.scope.freeVariable('arg'));
      }
      node = new Value(node);
      if (this.splat) {
        node = new Splat(node);
      }
      return this.reference = node;
    };
    Param.prototype.isComplex = function() {
      return this.name.isComplex();
    };
    return Param;
  })();
  exports.Splat = Splat = (function() {
    __extends(Splat, Base);
    Splat.prototype.children = ['name'];
    Splat.prototype.isAssignable = YES;
    function Splat(name) {
      this.name = name.compile ? name : new Literal(name);
    }
    Splat.prototype.assigns = function(name) {
      return this.name.assigns(name);
    };
    Splat.prototype.compile = function(o) {
      if (this.index != null) {
        return this.compileParam(o);
      } else {
        return this.name.compile(o);
      }
    };
    Splat.compileSplattedArray = function(o, list, apply) {
      var args, base, code, i, index, node, _len;
      index = -1;
      while ((node = list[++index]) && !(node instanceof Splat)) {
        continue;
      }
      if (index >= list.length) {
        return '';
      }
      if (list.length === 1) {
        code = list[0].compile(o, LEVEL_LIST);
        if (apply) {
          return code;
        }
        return "" + (utility('slice')) + ".call(" + code + ")";
      }
      args = list.slice(index);
      for (i = 0, _len = args.length; i < _len; i++) {
        node = args[i];
        code = node.compile(o, LEVEL_LIST);
        args[i] = node instanceof Splat ? "" + (utility('slice')) + ".call(" + code + ")" : "[" + code + "]";
      }
      if (index === 0) {
        return args[0] + (".concat(" + (args.slice(1).join(', ')) + ")");
      }
      base = (function() {
        var _i, _len, _ref, _results;
        _ref = list.slice(0, index);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          node = _ref[_i];
          _results.push(node.compile(o, LEVEL_LIST));
        }
        return _results;
      })();
      return "[" + (base.join(', ')) + "].concat(" + (args.join(', ')) + ")";
    };
    return Splat;
  })();
  exports.While = While = (function() {
    __extends(While, Base);
    function While(condition, options) {
      this.condition = (options != null ? options.invert : void 0) ? condition.invert() : condition;
      this.guard = options != null ? options.guard : void 0;
    }
    While.prototype.children = ['condition', 'guard', 'body'];
    While.prototype.isStatement = YES;
    While.prototype.makeReturn = function() {
      this.returns = true;
      return this;
    };
    While.prototype.addBody = function(body) {
      this.body = body;
      return this;
    };
    While.prototype.jumps = function() {
      var expressions, node, _i, _len;
      expressions = this.body.expressions;
      if (!expressions.length) {
        return false;
      }
      for (_i = 0, _len = expressions.length; _i < _len; _i++) {
        node = expressions[_i];
        if (node.jumps({
          loop: true
        })) {
          return node;
        }
      }
      return false;
    };
    While.prototype.compileNode = function(o) {
      var body, code, rvar, set;
      o.indent += TAB;
      set = '';
      body = this.body;
      if (body.isEmpty()) {
        body = '';
      } else {
        if (o.level > LEVEL_TOP || this.returns) {
          rvar = o.scope.freeVariable('results');
          set = "" + this.tab + rvar + " = [];\n";
          if (body) {
            body = Push.wrap(rvar, body);
          }
        }
        if (this.guard) {
          body = Block.wrap([new If(this.guard, body)]);
        }
        body = "\n" + (body.compile(o, LEVEL_TOP)) + "\n" + this.tab;
      }
      code = set + this.tab + ("while (" + (this.condition.compile(o, LEVEL_PAREN)) + ") {" + body + "}");
      if (this.returns) {
        code += "\n" + this.tab + "return " + rvar + ";";
      }
      return code;
    };
    return While;
  })();
  exports.Op = Op = (function() {
    var CONVERSIONS, INVERSIONS;
    __extends(Op, Base);
    function Op(op, first, second, flip) {
      var call;
      if (op === 'in') {
        return new In(first, second);
      }
      if (op === 'do') {
        call = new Call(first, first.params || []);
        call["do"] = true;
        return call;
      }
      if (op === 'new') {
        if (first instanceof Call && !first["do"]) {
          return first.newInstance();
        }
        if (first instanceof Code && first.bound || first["do"]) {
          first = new Parens(first);
        }
      }
      this.operator = CONVERSIONS[op] || op;
      this.first = first;
      this.second = second;
      this.flip = !!flip;
      return this;
    }
    CONVERSIONS = {
      '==': '===',
      '!=': '!==',
      'of': 'in'
    };
    INVERSIONS = {
      '!==': '===',
      '===': '!=='
    };
    Op.prototype.children = ['first', 'second'];
    Op.prototype.isSimpleNumber = NO;
    Op.prototype.isUnary = function() {
      return !this.second;
    };
    Op.prototype.isChainable = function() {
      var _ref;
      return (_ref = this.operator) === '<' || _ref === '>' || _ref === '>=' || _ref === '<=' || _ref === '===' || _ref === '!==';
    };
    Op.prototype.invert = function() {
      var allInvertable, curr, fst, op, _ref;
      if (this.isChainable() && this.first.isChainable()) {
        allInvertable = true;
        curr = this;
        while (curr && curr.operator) {
          allInvertable && (allInvertable = curr.operator in INVERSIONS);
          curr = curr.first;
        }
        if (!allInvertable) {
          return new Parens(this).invert();
        }
        curr = this;
        while (curr && curr.operator) {
          curr.invert = !curr.invert;
          curr.operator = INVERSIONS[curr.operator];
          curr = curr.first;
        }
        return this;
      } else if (op = INVERSIONS[this.operator]) {
        this.operator = op;
        if (this.first.unwrap() instanceof Op) {
          this.first.invert();
        }
        return this;
      } else if (this.second) {
        return new Parens(this).invert();
      } else if (this.operator === '!' && (fst = this.first.unwrap()) instanceof Op && ((_ref = fst.operator) === '!' || _ref === 'in' || _ref === 'instanceof')) {
        return fst;
      } else {
        return new Op('!', this);
      }
    };
    Op.prototype.unfoldSoak = function(o) {
      var _ref;
      return ((_ref = this.operator) === '++' || _ref === '--' || _ref === 'delete') && unfoldSoak(o, this, 'first');
    };
    Op.prototype.compileNode = function(o) {
      var code;
      if (this.isUnary()) {
        return this.compileUnary(o);
      }
      if (this.isChainable() && this.first.isChainable()) {
        return this.compileChain(o);
      }
      if (this.operator === '?') {
        return this.compileExistence(o);
      }
      this.first.front = this.front;
      code = this.first.compile(o, LEVEL_OP) + ' ' + this.operator + ' ' + this.second.compile(o, LEVEL_OP);
      if (o.level <= LEVEL_OP) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    Op.prototype.compileChain = function(o) {
      var code, fst, shared, _ref;
      _ref = this.first.second.cache(o), this.first.second = _ref[0], shared = _ref[1];
      fst = this.first.compile(o, LEVEL_OP);
      code = "" + fst + " " + (this.invert ? '&&' : '||') + " " + (shared.compile(o)) + " " + this.operator + " " + (this.second.compile(o, LEVEL_OP));
      return "(" + code + ")";
    };
    Op.prototype.compileExistence = function(o) {
      var fst, ref;
      if (this.first.isComplex()) {
        ref = o.scope.freeVariable('ref');
        fst = new Parens(new Assign(new Literal(ref), this.first));
      } else {
        fst = this.first;
        ref = fst.compile(o);
      }
      return new Existence(fst).compile(o) + (" ? " + ref + " : " + (this.second.compile(o, LEVEL_LIST)));
    };
    Op.prototype.compileUnary = function(o) {
      var op, parts;
      parts = [op = this.operator];
      if ((op === 'new' || op === 'typeof' || op === 'delete') || (op === '+' || op === '-') && this.first instanceof Op && this.first.operator === op) {
        parts.push(' ');
      }
      if (op === 'new' && this.first.isStatement(o)) {
        this.first = new Parens(this.first);
      }
      parts.push(this.first.compile(o, LEVEL_OP));
      if (this.flip) {
        parts.reverse();
      }
      return parts.join('');
    };
    Op.prototype.toString = function(idt) {
      return Op.__super__.toString.call(this, idt, this.constructor.name + ' ' + this.operator);
    };
    return Op;
  })();
  exports.In = In = (function() {
    __extends(In, Base);
    function In(object, array) {
      this.object = object;
      this.array = array;
    }
    In.prototype.children = ['object', 'array'];
    In.prototype.invert = NEGATE;
    In.prototype.compileNode = function(o) {
      if (this.array instanceof Value && this.array.isArray()) {
        return this.compileOrTest(o);
      } else {
        return this.compileLoopTest(o);
      }
    };
    In.prototype.compileOrTest = function(o) {
      var cmp, cnj, i, item, ref, sub, tests, _ref, _ref2;
      _ref = this.object.cache(o, LEVEL_OP), sub = _ref[0], ref = _ref[1];
      _ref2 = this.negated ? [' !== ', ' && '] : [' === ', ' || '], cmp = _ref2[0], cnj = _ref2[1];
      tests = (function() {
        var _len, _ref, _results;
        _ref = this.array.base.objects;
        _results = [];
        for (i = 0, _len = _ref.length; i < _len; i++) {
          item = _ref[i];
          _results.push((i ? ref : sub) + cmp + item.compile(o, LEVEL_OP));
        }
        return _results;
      }).call(this);
      tests = tests.join(cnj);
      if (o.level < LEVEL_OP) {
        return tests;
      } else {
        return "(" + tests + ")";
      }
    };
    In.prototype.compileLoopTest = function(o) {
      var code, ref, sub, _ref;
      _ref = this.object.cache(o, LEVEL_LIST), sub = _ref[0], ref = _ref[1];
      code = utility('indexOf') + (".call(" + (this.array.compile(o, LEVEL_LIST)) + ", " + ref + ") ") + (this.negated ? '< 0' : '>= 0');
      if (sub === ref) {
        return code;
      }
      code = sub + ', ' + code;
      if (o.level < LEVEL_LIST) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    In.prototype.toString = function(idt) {
      return In.__super__.toString.call(this, idt, this.constructor.name + (this.negated ? '!' : ''));
    };
    return In;
  })();
  exports.Try = Try = (function() {
    __extends(Try, Base);
    function Try(attempt, error, recovery, ensure) {
      this.attempt = attempt;
      this.error = error;
      this.recovery = recovery;
      this.ensure = ensure;
    }
    Try.prototype.children = ['attempt', 'recovery', 'ensure'];
    Try.prototype.isStatement = YES;
    Try.prototype.jumps = function(o) {
      var _ref;
      return this.attempt.jumps(o) || ((_ref = this.recovery) != null ? _ref.jumps(o) : void 0);
    };
    Try.prototype.makeReturn = function() {
      if (this.attempt) {
        this.attempt = this.attempt.makeReturn();
      }
      if (this.recovery) {
        this.recovery = this.recovery.makeReturn();
      }
      return this;
    };
    Try.prototype.compileNode = function(o) {
      var catchPart, errorPart;
      o.indent += TAB;
      errorPart = this.error ? " (" + (this.error.compile(o)) + ") " : ' ';
      catchPart = this.recovery ? " catch" + errorPart + "{\n" + (this.recovery.compile(o, LEVEL_TOP)) + "\n" + this.tab + "}" : !(this.ensure || this.recovery) ? ' catch (_e) {}' : void 0;
      return ("" + this.tab + "try {\n" + (this.attempt.compile(o, LEVEL_TOP)) + "\n" + this.tab + "}" + (catchPart || '')) + (this.ensure ? " finally {\n" + (this.ensure.compile(o, LEVEL_TOP)) + "\n" + this.tab + "}" : '');
    };
    return Try;
  })();
  exports.Throw = Throw = (function() {
    __extends(Throw, Base);
    function Throw(expression) {
      this.expression = expression;
    }
    Throw.prototype.children = ['expression'];
    Throw.prototype.isStatement = YES;
    Throw.prototype.jumps = NO;
    Throw.prototype.makeReturn = THIS;
    Throw.prototype.compileNode = function(o) {
      return this.tab + ("throw " + (this.expression.compile(o)) + ";");
    };
    return Throw;
  })();
  exports.Existence = Existence = (function() {
    __extends(Existence, Base);
    function Existence(expression) {
      this.expression = expression;
    }
    Existence.prototype.children = ['expression'];
    Existence.prototype.invert = NEGATE;
    Existence.prototype.compileNode = function(o) {
      var code, sym;
      code = this.expression.compile(o, LEVEL_OP);
      code = IDENTIFIER.test(code) && !o.scope.check(code) ? this.negated ? "typeof " + code + " == \"undefined\" || " + code + " === null" : "typeof " + code + " != \"undefined\" && " + code + " !== null" : (sym = this.negated ? '==' : '!=', "" + code + " " + sym + " null");
      if (o.level <= LEVEL_COND) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Existence;
  })();
  exports.Parens = Parens = (function() {
    __extends(Parens, Base);
    function Parens(body) {
      this.body = body;
    }
    Parens.prototype.children = ['body'];
    Parens.prototype.unwrap = function() {
      return this.body;
    };
    Parens.prototype.isComplex = function() {
      return this.body.isComplex();
    };
    Parens.prototype.makeReturn = function() {
      return this.body.makeReturn();
    };
    Parens.prototype.compileNode = function(o) {
      var bare, code, expr;
      expr = this.body.unwrap();
      if (expr instanceof Value && expr.isAtomic()) {
        expr.front = this.front;
        return expr.compile(o);
      }
      code = expr.compile(o, LEVEL_PAREN);
      bare = o.level < LEVEL_OP && (expr instanceof Op || expr instanceof Call || (expr instanceof For && expr.returns));
      if (bare) {
        return code;
      } else {
        return "(" + code + ")";
      }
    };
    return Parens;
  })();
  exports.For = For = (function() {
    __extends(For, Base);
    function For(body, source) {
      var _ref;
      this.source = source.source, this.guard = source.guard, this.step = source.step, this.name = source.name, this.index = source.index;
      this.body = Block.wrap([body]);
      this.own = !!source.own;
      this.object = !!source.object;
      if (this.object) {
        _ref = [this.index, this.name], this.name = _ref[0], this.index = _ref[1];
      }
      if (this.index instanceof Value) {
        throw SyntaxError('index cannot be a pattern matching expression');
      }
      this.range = this.source instanceof Value && this.source.base instanceof Range && !this.source.properties.length;
      this.pattern = this.name instanceof Value;
      if (this.range && this.index) {
        throw SyntaxError('indexes do not apply to range loops');
      }
      if (this.range && this.pattern) {
        throw SyntaxError('cannot pattern match over range loops');
      }
      this.returns = false;
    }
    For.prototype.children = ['body', 'source', 'guard', 'step'];
    For.prototype.isStatement = YES;
    For.prototype.jumps = While.prototype.jumps;
    For.prototype.makeReturn = function() {
      this.returns = true;
      return this;
    };
    For.prototype.compileNode = function(o) {
      var body, defPart, forPart, guardPart, idt1, index, ivar, lastJumps, lvar, name, namePart, ref, resultPart, returnResult, rvar, scope, source, stepPart, svar, varPart, _ref;
      body = Block.wrap([this.body]);
      lastJumps = (_ref = last(body.expressions)) != null ? _ref.jumps() : void 0;
      if (lastJumps && lastJumps instanceof Return) {
        this.returns = false;
      }
      source = this.range ? this.source.base : this.source;
      scope = o.scope;
      name = this.name && this.name.compile(o, LEVEL_LIST);
      index = this.index && this.index.compile(o, LEVEL_LIST);
      if (name && !this.pattern) {
        scope.find(name, {
          immediate: true
        });
      }
      if (index) {
        scope.find(index, {
          immediate: true
        });
      }
      if (this.returns) {
        rvar = scope.freeVariable('results');
      }
      ivar = (this.range ? name : index) || scope.freeVariable('i');
      if (this.pattern) {
        name = ivar;
      }
      varPart = '';
      guardPart = '';
      defPart = '';
      idt1 = this.tab + TAB;
      if (this.range) {
        forPart = source.compile(merge(o, {
          index: ivar,
          step: this.step
        }));
      } else {
        svar = this.source.compile(o, LEVEL_LIST);
        if ((name || this.own) && !IDENTIFIER.test(svar)) {
          defPart = "" + this.tab + (ref = scope.freeVariable('ref')) + " = " + svar + ";\n";
          svar = ref;
        }
        if (name && !this.pattern) {
          namePart = "" + name + " = " + svar + "[" + ivar + "]";
        }
        if (!this.object) {
          lvar = scope.freeVariable('len');
          stepPart = this.step ? "" + ivar + " += " + (this.step.compile(o, LEVEL_OP)) : "" + ivar + "++";
          forPart = "" + ivar + " = 0, " + lvar + " = " + svar + ".length; " + ivar + " < " + lvar + "; " + stepPart;
        }
      }
      if (this.returns) {
        resultPart = "" + this.tab + rvar + " = [];\n";
        returnResult = "\n" + this.tab + "return " + rvar + ";";
        body = Push.wrap(rvar, body);
      }
      if (this.guard) {
        body = Block.wrap([new If(this.guard, body)]);
      }
      if (this.pattern) {
        body.expressions.unshift(new Assign(this.name, new Literal("" + svar + "[" + ivar + "]")));
      }
      defPart += this.pluckDirectCall(o, body);
      if (namePart) {
        varPart = "\n" + idt1 + namePart + ";";
      }
      if (this.object) {
        forPart = "" + ivar + " in " + svar;
        if (this.own) {
          guardPart = "\n" + idt1 + "if (!" + (utility('hasProp')) + ".call(" + svar + ", " + ivar + ")) continue;";
        }
      }
      body = body.compile(merge(o, {
        indent: idt1
      }), LEVEL_TOP);
      if (body) {
        body = '\n' + body + '\n';
      }
      return "" + defPart + (resultPart || '') + this.tab + "for (" + forPart + ") {" + guardPart + varPart + body + this.tab + "}" + (returnResult || '');
    };
    For.prototype.pluckDirectCall = function(o, body) {
      var base, defs, expr, fn, idx, ref, val, _len, _ref, _ref2, _ref3, _ref4, _ref5, _ref6;
      defs = '';
      _ref = body.expressions;
      for (idx = 0, _len = _ref.length; idx < _len; idx++) {
        expr = _ref[idx];
        expr = expr.unwrapAll();
        if (!(expr instanceof Call)) {
          continue;
        }
        val = expr.variable.unwrapAll();
        if (!((val instanceof Code) || (val instanceof Value && ((_ref2 = val.base) != null ? _ref2.unwrapAll() : void 0) instanceof Code && val.properties.length === 1 && ((_ref3 = (_ref4 = val.properties[0].name) != null ? _ref4.value : void 0) === 'call' || _ref3 === 'apply')))) {
          continue;
        }
        fn = ((_ref5 = val.base) != null ? _ref5.unwrapAll() : void 0) || val;
        ref = new Literal(o.scope.freeVariable('fn'));
        base = new Value(ref);
        if (val.base) {
          _ref6 = [base, val], val.base = _ref6[0], base = _ref6[1];
          args.unshift(new Literal('this'));
        }
        body.expressions[idx] = new Call(base, expr.args);
        defs += this.tab + new Assign(ref, fn).compile(o, LEVEL_TOP) + ';\n';
      }
      return defs;
    };
    return For;
  })();
  exports.Switch = Switch = (function() {
    __extends(Switch, Base);
    function Switch(subject, cases, otherwise) {
      this.subject = subject;
      this.cases = cases;
      this.otherwise = otherwise;
    }
    Switch.prototype.children = ['subject', 'cases', 'otherwise'];
    Switch.prototype.isStatement = YES;
    Switch.prototype.jumps = function(o) {
      var block, conds, _i, _len, _ref, _ref2, _ref3;
      if (o == null) {
        o = {
          block: true
        };
      }
      _ref = this.cases;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        _ref2 = _ref[_i], conds = _ref2[0], block = _ref2[1];
        if (block.jumps(o)) {
          return block;
        }
      }
      return (_ref3 = this.otherwise) != null ? _ref3.jumps(o) : void 0;
    };
    Switch.prototype.makeReturn = function() {
      var pair, _i, _len, _ref, _ref2;
      _ref = this.cases;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        pair = _ref[_i];
        pair[1].makeReturn();
      }
      if ((_ref2 = this.otherwise) != null) {
        _ref2.makeReturn();
      }
      return this;
    };
    Switch.prototype.compileNode = function(o) {
      var block, body, code, cond, conditions, expr, i, idt1, idt2, _i, _len, _len2, _ref, _ref2, _ref3, _ref4;
      idt1 = o.indent + TAB;
      idt2 = o.indent = idt1 + TAB;
      code = this.tab + ("switch (" + (((_ref = this.subject) != null ? _ref.compile(o, LEVEL_PAREN) : void 0) || false) + ") {\n");
      _ref2 = this.cases;
      for (i = 0, _len = _ref2.length; i < _len; i++) {
        _ref3 = _ref2[i], conditions = _ref3[0], block = _ref3[1];
        _ref4 = flatten([conditions]);
        for (_i = 0, _len2 = _ref4.length; _i < _len2; _i++) {
          cond = _ref4[_i];
          if (!this.subject) {
            cond = cond.invert();
          }
          code += idt1 + ("case " + (cond.compile(o, LEVEL_PAREN)) + ":\n");
        }
        if (body = block.compile(o, LEVEL_TOP)) {
          code += body + '\n';
        }
        if (i === this.cases.length - 1 && !this.otherwise) {
          break;
        }
        expr = this.lastNonComment(block.expressions);
        if (expr instanceof Return || (expr instanceof Literal && expr.jumps() && expr.value !== 'debugger')) {
          continue;
        }
        code += idt2 + 'break;\n';
      }
      if (this.otherwise && this.otherwise.expressions.length) {
        code += idt1 + ("default:\n" + (this.otherwise.compile(o, LEVEL_TOP)) + "\n");
      }
      return code + this.tab + '}';
    };
    return Switch;
  })();
  exports.If = If = (function() {
    __extends(If, Base);
    function If(condition, body, options) {
      this.body = body;
      if (options == null) {
        options = {};
      }
      this.condition = options.type === 'unless' ? condition.invert() : condition;
      this.elseBody = null;
      this.isChain = false;
      this.soak = options.soak;
    }
    If.prototype.children = ['condition', 'body', 'elseBody'];
    If.prototype.bodyNode = function() {
      var _ref;
      return (_ref = this.body) != null ? _ref.unwrap() : void 0;
    };
    If.prototype.elseBodyNode = function() {
      var _ref;
      return (_ref = this.elseBody) != null ? _ref.unwrap() : void 0;
    };
    If.prototype.addElse = function(elseBody) {
      if (this.isChain) {
        this.elseBodyNode().addElse(elseBody);
      } else {
        this.isChain = elseBody instanceof If;
        this.elseBody = this.ensureBlock(elseBody);
      }
      return this;
    };
    If.prototype.isStatement = function(o) {
      var _ref;
      return (o != null ? o.level : void 0) === LEVEL_TOP || this.bodyNode().isStatement(o) || ((_ref = this.elseBodyNode()) != null ? _ref.isStatement(o) : void 0);
    };
    If.prototype.jumps = function(o) {
      var _ref;
      return this.body.jumps(o) || ((_ref = this.elseBody) != null ? _ref.jumps(o) : void 0);
    };
    If.prototype.compileNode = function(o) {
      if (this.isStatement(o)) {
        return this.compileStatement(o);
      } else {
        return this.compileExpression(o);
      }
    };
    If.prototype.makeReturn = function() {
      this.body && (this.body = new Block([this.body.makeReturn()]));
      this.elseBody && (this.elseBody = new Block([this.elseBody.makeReturn()]));
      return this;
    };
    If.prototype.ensureBlock = function(node) {
      if (node instanceof Block) {
        return node;
      } else {
        return new Block([node]);
      }
    };
    If.prototype.compileStatement = function(o) {
      var body, child, cond, ifPart;
      child = del(o, 'chainChild');
      cond = this.condition.compile(o, LEVEL_PAREN);
      o.indent += TAB;
      body = this.ensureBlock(this.body).compile(o);
      if (body) {
        body = "\n" + body + "\n" + this.tab;
      }
      ifPart = "if (" + cond + ") {" + body + "}";
      if (!child) {
        ifPart = this.tab + ifPart;
      }
      if (!this.elseBody) {
        return ifPart;
      }
      return ifPart + ' else ' + (this.isChain ? (o.indent = this.tab, o.chainChild = true, this.elseBody.unwrap().compile(o, LEVEL_TOP)) : "{\n" + (this.elseBody.compile(o, LEVEL_TOP)) + "\n" + this.tab + "}");
    };
    If.prototype.compileExpression = function(o) {
      var alt, body, code, cond;
      cond = this.condition.compile(o, LEVEL_COND);
      body = this.bodyNode().compile(o, LEVEL_LIST);
      alt = this.elseBodyNode() ? this.elseBodyNode().compile(o, LEVEL_LIST) : 'void 0';
      code = "" + cond + " ? " + body + " : " + alt;
      if (o.level >= LEVEL_COND) {
        return "(" + code + ")";
      } else {
        return code;
      }
    };
    If.prototype.unfoldSoak = function() {
      return this.soak && this;
    };
    return If;
  })();
  Push = {
    wrap: function(name, exps) {
      if (exps.isEmpty() || last(exps.expressions).jumps()) {
        return exps;
      }
      return exps.push(new Call(new Value(new Literal(name), [new Access(new Literal('push'))]), [exps.pop()]));
    }
  };
  Closure = {
    wrap: function(expressions, statement, noReturn) {
      var args, call, func, mentionsArgs, meth;
      if (expressions.jumps()) {
        return expressions;
      }
      func = new Code([], Block.wrap([expressions]));
      args = [];
      if ((mentionsArgs = expressions.contains(this.literalArgs)) || expressions.contains(this.literalThis)) {
        meth = new Literal(mentionsArgs ? 'apply' : 'call');
        args = [new Literal('this')];
        if (mentionsArgs) {
          args.push(new Literal('arguments'));
        }
        func = new Value(func, [new Access(meth)]);
      }
      func.noReturn = noReturn;
      call = new Call(func, args);
      if (statement) {
        return Block.wrap([call]);
      } else {
        return call;
      }
    },
    literalArgs: function(node) {
      return node instanceof Literal && node.value === 'arguments' && !node.asKey;
    },
    literalThis: function(node) {
      return (node instanceof Literal && node.value === 'this' && !node.asKey) || (node instanceof Code && node.bound);
    }
  };
  unfoldSoak = function(o, parent, name) {
    var ifn;
    if (!(ifn = parent[name].unfoldSoak(o))) {
      return;
    }
    parent[name] = ifn.body;
    ifn.body = new Value(parent);
    return ifn;
  };
  UTILITIES = {
    "extends": 'function(child, parent) {\n  for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }\n  function ctor() { this.constructor = child; }\n  ctor.prototype = parent.prototype;\n  child.prototype = new ctor;\n  child.__super__ = parent.prototype;\n  return child;\n}',
    bind: 'function(fn, me){ return function(){ return fn.apply(me, arguments); }; }',
    indexOf: 'Array.prototype.indexOf || function(item) {\n  for (var i = 0, l = this.length; i < l; i++) {\n    if (this[i] === item) return i;\n  }\n  return -1;\n}',
    hasProp: 'Object.prototype.hasOwnProperty',
    slice: 'Array.prototype.slice'
  };
  LEVEL_TOP = 1;
  LEVEL_PAREN = 2;
  LEVEL_LIST = 3;
  LEVEL_COND = 4;
  LEVEL_OP = 5;
  LEVEL_ACCESS = 6;
  TAB = '  ';
  IDENTIFIER = /^[$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff]*$/;
  SIMPLENUM = /^[+-]?\d+$/;
  IS_STRING = /^['"]/;
  utility = function(name) {
    var ref;
    ref = "__" + name;
    Scope.root.assign(ref, UTILITIES[name]);
    return ref;
  };
  multident = function(code, tab) {
    return code.replace(/\n/g, '$&' + tab);
  };
}).call(this);

};require['./coffee-script'] = new function() {
  var exports = this;
  (function() {
  var Lexer, RESERVED, compile, fs, lexer, parser, path, _ref;
  fs = require('fs');
  path = require('path');
  _ref = require('./lexer'), Lexer = _ref.Lexer, RESERVED = _ref.RESERVED;
  parser = require('./parser').parser;
  if (require.extensions) {
    require.extensions['.coffee'] = function(module, filename) {
      var content;
      content = compile(fs.readFileSync(filename, 'utf8'));
      return module._compile(content, filename);
    };
  } else if (require.registerExtension) {
    require.registerExtension('.coffee', function(content) {
      return compile(content);
    });
  }
  exports.VERSION = '1.1.0-pre';
  exports.RESERVED = RESERVED;
  exports.helpers = require('./helpers');
  exports.compile = compile = function(code, options) {
    if (options == null) {
      options = {};
    }
    try {
      return (parser.parse(lexer.tokenize(code))).compile(options);
    } catch (err) {
      if (options.filename) {
        err.message = "In " + options.filename + ", " + err.message;
      }
      throw err;
    }
  };
  exports.tokens = function(code, options) {
    return lexer.tokenize(code, options);
  };
  exports.nodes = function(source, options) {
    if (typeof source === 'string') {
      return parser.parse(lexer.tokenize(source, options));
    } else {
      return parser.parse(source);
    }
  };
  exports.run = function(code, options) {
    var root;
    root = module;
    while (root.parent) {
      root = root.parent;
    }
    root.filename = process.argv[1] = options.filename ? fs.realpathSync(options.filename) : '.';
    if (root.moduleCache) {
      root.moduleCache = {};
    }
    if (path.extname(root.filename) !== '.coffee' || require.extensions) {
      return root._compile(compile(code, options), root.filename);
    } else {
      return root._compile(code, root.filename);
    }
  };
  exports.eval = function(code, options) {
    var __dirname, __filename;
    __filename = module.filename = process.argv[1] = options.filename;
    __dirname = path.dirname(__filename);
    return eval(compile(code, options));
  };
  lexer = new Lexer;
  parser.lexer = {
    lex: function() {
      var tag, _ref;
      _ref = this.tokens[this.pos++] || [''], tag = _ref[0], this.yytext = _ref[1], this.yylineno = _ref[2];
      return tag;
    },
    setInput: function(tokens) {
      this.tokens = tokens;
      return this.pos = 0;
    },
    upcomingInput: function() {
      return "";
    }
  };
  parser.yy = require('./nodes');
}).call(this);

};require['./browser'] = new function() {
  var exports = this;
  (function() {
  var CoffeeScript, runScripts;
  CoffeeScript = require('./coffee-script');
  CoffeeScript.require = require;
  CoffeeScript.eval = function(code, options) {
    return eval(CoffeeScript.compile(code, options));
  };
  CoffeeScript.run = function(code, options) {
    if (options == null) {
      options = {};
    }
    options.bare = true;
    return Function(CoffeeScript.compile(code, options))();
  };
  if (typeof window == "undefined" || window === null) {
    return;
  }
  CoffeeScript.load = function(url, options) {
    var xhr;
    xhr = new (window.ActiveXObject || XMLHttpRequest)('Microsoft.XMLHTTP');
    xhr.open('GET', url, true);
    if ('overrideMimeType' in xhr) {
      xhr.overrideMimeType('text/plain');
    }
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        return CoffeeScript.run(xhr.responseText, options);
      }
    };
    return xhr.send(null);
  };
  runScripts = function() {
    var script, _i, _len, _ref;
    _ref = document.getElementsByTagName('script');
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      script = _ref[_i];
      if (script.type === 'text/coffeescript') {
        if (script.src) {
          CoffeeScript.load(script.src);
        } else {
          CoffeeScript.run(script.innerHTML);
        }
      }
    }
    return null;
  };
  if (window.addEventListener) {
    addEventListener('DOMContentLoaded', runScripts, false);
  } else {
    attachEvent('onload', runScripts);
  }
}).call(this);

};
  return require['./coffee-script']
}()