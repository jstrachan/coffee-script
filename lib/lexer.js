(function() {
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var ASSIGNED;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var BOOL;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var CALLABLE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var CODE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var COFFEE_ALIASES;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var COFFEE_KEYWORDS;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var COMMENT;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var COMPARE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var COMPOUND_ASSIGN;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var HEREDOC;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var HEREDOC_ILLEGAL;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var HEREDOC_INDENT;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var HEREGEX;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var HEREGEX_OMIT;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var IDENTIFIER;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var INDEXABLE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var JSTOKEN;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var JS_FORBIDDEN;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var JS_KEYWORDS;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var LINE_BREAK;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var LINE_CONTINUER;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var LOGIC;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var Lexer;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var MATH;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var MULTILINER;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var MULTI_DENT;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var NOT_REGEX;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var NOT_SPACED_REGEX;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var NO_NEWLINE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var NUMBER;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var OPERATOR;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var REGEX;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var RELATION;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var RESERVED;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var Rewriter;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var SHIFT;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var SIMPLESTR;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var TRAILING_SPACES;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var TYPE_ANNOTATE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var UNARY;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var WHITESPACE;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var compact;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var count;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var last;
  /** @type {function () {
      return this.typeAnnotation;
    }} */
  var starts;
  var op, _ref;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var colon;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var forcedIdentifier;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var id;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var input;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tag;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref2;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var number;
      if (!(match = NUMBER.exec(this.chunk))) {
        return 0;
      }
      number = match[0];
      this.token('NUMBER', number);
      return number.length;
    };
    Lexer.prototype.stringToken = function() {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var string;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var doc;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var heredoc;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var quote;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var comment;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var here;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var script;
      if (!(this.chunk.charAt(0) === '`' && (match = JSTOKEN.exec(this.chunk)))) {
        return 0;
      }
      this.token('JS', (script = match[0]).slice(1, -1));
      return script.length;
    };
    Lexer.prototype.regexToken = function() {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var regex;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var body;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var flags;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var heregex;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var re;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tag;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tokens;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var value;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref3;
      var _i, _len, _ref, _ref2, _ref4;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var diff;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var indent;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var noNewlines;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var size;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var dent;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var len;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var nline;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tag;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var value;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref2;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref3;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref4;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var attempt;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var herecomment;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var indent;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var match;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var i;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var stack;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tok;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tokens;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var letter;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var stack;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
      var i;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var expr;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var heredoc;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var i;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var inner;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var interpolated;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var len;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var letter;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var nested;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var pi;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var regex;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tag;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tokens;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var value;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var _ref;
      var _len, _ref2, _ref3;
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
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tok;
      return (tok = last(this.tokens, index)) && (tag ? tok[0] = tag : tok[0]);
    };
    Lexer.prototype.value = function(index, val) {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var tok;
      return (tok = last(this.tokens, index)) && (val ? tok[1] = val : tok[1]);
    };
    Lexer.prototype.unfinished = function() {
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var prev;
      /** @type {function () {
      return this.typeAnnotation;
    }} */
      var value;
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
