var g = {
    input:null,
    inputLength: 0,
    tokenCurLine: 1,
    tokenLineStart: 0,
    tokenEnd: 0,
    tokenType: null,
    tokenPos: 0,
    tokenStart: 0,
    tokenLastStart: 0,
    tokenLastEnd: 0,
    tokenValue: 0,
    nextLineStart: nextLineStart(),
    tokenComments: null
}
var Rule = {
    cnChar: /[\u3220-\uFA29]/,
    lineBreak : /\r\n?|[\n\r\u2028\u2029]/g,
    digit : /\d/
}
var labels;
// token类型
var _name = {type: 'name'}, _eof={type:'eof'};
var _num = {type:'num'}, _string = {type:'string'};
var _var = { type:'var'}, _eq={ type: 'eq', isAssign: true,value:'='}, _semi={ type: ';'};
var _while = {keyword: 'while', isLoop: true}, _function = {keyword: 'function'}, _return = {keyword: "return", beforeExpr: true};
var _comma = {type: ','}, _if = {keyword: 'if'},_else = {keyword: 'else', beforeExpr: true};
var _parenL = {type: '(', beforeExpr: true},_parenR = {type: ')'};
var _braceL = {type: '{', beforeExpr: true},_braceR = {type: '}'};
var  _dot = {type: "."};
var KeyWordsEnum = {
    '变量': _var,
    '如果': _if,
    '否则': _else,
    '循环': _while,
    '函数': _function,
    '返回': _return
};
var OptEnum = {
    '赋值': _eq,
    '设置': _eq,
    '加': { binop: 9, prefix: true, beforeExpr: true, value:'+'},
    '减': { binop: 9, prefix: true, beforeExpr: true, value:'-'},
    '乘': { beforeExpr:true, binop:10, value: '*'},
    '除': { beforeExpr:true, binop:10, value: '/'},
    '不等于': { beforeExpr:true, binop:6, value: '!=' },
    '小于':{ beforeExpr:true, binop:7 , value: '<'},
    '小于等于':{ beforeExpr:true, binop:7 , value: '<='},
    '大于': { beforeExpr:true, binop:7 , value: '>' },
    '大于等于': { beforeExpr:true, binop:7 , value: '>=' },
    '等于': {beforeExpr:true, binop:6, value: '=='},
    "非": { beforeExpr:true, prefix:true, value: '!' },
    "或": { beforeExpr:true, binop:1, value: '||'},
    "与": { beforeExpr:true, binop:1, value: '&&'}
};
var PuncTypesEnum = {
    '止': _semi,
    '完': _semi,
    '完成': _semi,
    '了': _semi,
    '(': _parenL,
    ')': _parenR,
    '开始': _parenL,
    '结束':_parenR,
    '开': _parenL,
    '阖': _parenR,
    '始': _braceL, 
    '终': _braceR, 
    '{':_braceL,
    '}':_braceL,
    '的': _dot, 
    '有': _dot, 
    '用': _dot,
    '逗号':_comma,
    ',':_comma
};

function parse(input){
    initTokenState();
    labels = [];
    g.input = String(input);
    g.inputLength = input.length;
    skipSpace();
    readToken();
    var node = createStartAstNode();
    node.body = [];
    while(g.tokenType != _eof) {
        var stmt = parseStatement();
        node.body.push(stmt);
    }
    return finishNode(node,'Program');
}

function initTokenState(){
    g = {
        input:null,
        inputLength: 0,
        tokenCurLine: 1,
        tokenLineStart: 0,
        tokenEnd: 0,
        tokenType: null,
        tokenPos: 0,
        tokenStart: 0,
        tokenLastStart: 0,
        tokenLastEnd: 0,
        tokenValue: 0,
        nextLineStart: nextLineStart(),
        tokenComments: null
    }
}
function parseStatement (){
    var starttype = g.tokenType, node = startNode();
    switch(starttype){
        case _var:
            readNextToken();
            node = Statement.parseVar(node);
            semicolon();
            return node;
        case _if:
            readNextToken();
            node.test = Statement.parseParenExpression();
            node.consequent = parseStatement();
            node.alternate = eat(_else) ? parseStatement() : null;
            return finishNode(node, 'IfStatement');   
        case _braceL:
            return Statement.parseBlock();
        case _while:
            readNextToken();    
            node.test = Statement.parseParenExpression();
            labels.push({kind: 'loop'});
            node.body = parseStatement();
            labels.pop();
            return finishNode(node, 'WhileStatement');
        case _function:
            readNextToken();
            return Statement.parseFunction(node, true);
        case _return:
            readNextToken();
            node.argument = Statement.parseExpression(); 
            semicolon();
            return finishNode(node, "ReturnStatement");
        default:
            var expr = Statement.parseExpression()
            node.expression = expr;
            semicolon();
            return finishNode(node, 'ExpressionStatement');

    }
}

var Statement = {
    parseFunction: function(node,isStatement) {
        if (g.tokenType === _name) {
            node.id = Statement.parseIdent();
        }
        node.params = [];
      
        var first = true;
        expect(_parenL);
        while (!eat(_parenR)) {
            if (!first) {
                expect(_comma)
            } else{
                first = false;
            }
            node.params.push(Statement.parseIdent());
        }
        var oldLabels = labels;
        labels = []
        node.body = Statement.parseBlock(true);
        labels = oldLabels;
        return finishNode(node, isStatement? 'FunctionDeclaration':'FunctionExpression');
    },
    parseVar: function(node) {
        node.declarations = [];
        node.kind = 'var';
        for (;;) {
            var decl = startNode();
            decl.id = Statement.parseIdent();
            decl.init = eat(_eq) ? Statement.parseExpression(true) : null;
            node.declarations.push(finishNode(decl, 'VariableDeclarator'));
            if (!eat(_comma)) break;
        }
        return finishNode(node, 'VariableDeclaration');
    },
    parseBlock: function(){
        var node = startNode();
        node.body = [];
        expect(_braceL);
        while(!eat(_braceR)) {
            var stmt = parseStatement();
            node.body.push(stmt);
        }
        return finishNode(node, 'BlockStatement');
    },
    parseParenExpression:function(){
        expect(_parenL);
        var val = Statement.parseExpression();
        expect(_parenR);
        return val;
    },
    parseExpression: function(noComma) {
        var expr = Statement.parseMaybeAssign();
        return expr;
    },
    parseMaybeAssign: function() {
        var left = Statement.parseMaybeConditional();
        if(g.tokenType.isAssign) {
            var node = startNodeFrom(left);
            node.operator = g.tokenType.value;
            node.left = left;
            readNextToken();
            node.right = Statement.parseMaybeAssign();
            return finishNode(node, 'AssignmentExpression')
        }
        return left;
    },
    parseMaybeConditional: function(){
        var expr = Statement.parseExprOps();
        return expr;
    },
    parseExprOps: function(){
        return Statement.parseExprOp(Statement.parseMaybeUnary(), -1);
    },
    parseExprOp: function(left, minPrec) {
        var prec = g.tokenType.binop;
        if (prec != null) {
          if (prec > minPrec) {
            var node = startNodeFrom(left);
            node.left = left;
            node.operator = g.tokenType.value;
            readNextToken();
            node.right = Statement.parseExprOp(Statement.parseMaybeUnary(), prec);
            var node = finishNode(node, 'BinaryExpression');
            return Statement.parseExprOp(node, minPrec);
          }
        }
        return left;
    },
    parseMaybeUnary:function(){
        var expr = Statement.parseExprSubscripts(true);
        return expr;
    },
    parseExprSubscripts:function(){
        return Statement.parseSubscripts(Statement.parseExprAtom());
    },
    parseExprList:function(close){
        var elts = [], first = true;
        while (!eat(close)) {
          if (!first) {
            expect(_comma);
            if (eat(close)) break;
          } else first = false;
    
          if (g.tokenType === _comma) elts.push(null);
          else elts.push(Statement.parseExpression());
        }
        return elts;
    },
    parseSubscripts: function(base){
        if(eat(_dot)){
            var node = startNodeFrom(base);
            node.object = base;
            node.property = Statement.parseIdent();
            node.computed = false;
            return Statement.parseSubscripts(finishNode(node, "MemberExpression"));
        }else if(eat(_parenL)){
            var node = startNodeFrom(base);
            node.callee = base;
            node.arguments = Statement.parseExprList(_parenR, false);
            return Statement.parseSubscripts(finishNode(node, 'CallExpression'));
        }else{
            return base;
        }
        
    },
    parseExprAtom:function(){
        switch(g.tokenType){
            case _num:
                var node = startNode();
                node.value = g.tokenValue;
                readNextToken();
                return finishNode(node, 'NumberLiteral'); 
            case _string:
                var node = startNode();
                node.value = g.tokenValue;
                readNextToken();
                return finishNode(node, 'StringLiteral');
            case _name:
                return Statement.parseIdent();
            case _function:
                var node = startNode();
                readNextToken();
                return Statement.parseFunction(node, false);
            default:
                unexpected();
        }
    },
    parseIdent: function(){
        var node = startNode();
        if(g.tokenType == _name) {
            node.name = g.tokenValue;
            readNextToken();
            return finishNode(node, 'Identifier');
        }else{
            unexpected()
        }
        
    }
}

function semicolon() {
    if (!eat(_semi)) unexpected();
}
function canInsertSemicolon() {

}
function expect(type) {
    if (g.tokenType === type){
        readNextToken();
    }else{
        unexpected();
    }
}
function eat(type){
    if (g.tokenType === type) {
        readNextToken();
        return true;
    }
}

function startNode() {
    var node = {type: null, start: g.tokenStart};
    return node;
}

function startNodeFrom(other) {
    var node = {type: null, start: other.start};
    return node;
}

function readToken() {
    g.tokenStart = g.tokenPos;
    if(g.tokenPos >= g.inputLength) return finishToken(_eof);
    var ch = g.input.charAt(g.tokenPos);
    if(ch === '"' || ch === "'") {
        return readString(ch);
    }
    if (Rule.digit.test(ch)) {
      return readNumber(ch);
    }
    if(Rule.cnChar.test(ch)) {
        return readCNWord()
    }
    if(KeyWordsEnum[ch]) {
        return finishToken(KeyWordsEnum[ch], ch);
    }else if(OptEnum[ch]){
        return finishToken(OptEnum[ch], ch);
    }else if(PuncTypesEnum[ch]){
        return finishToken(PuncTypesEnum[ch], ch);
    }
    raise(g.tokenPos, "不支持的字符 '" + ch + "'");
    console.log(ch)
}

function readNextToken() {
    g.tokenLastStart = g.tokenStart;
    g.tokenLastEnd = g.tokenEnd;
    readToken();
}

function readNumber() {
    var str = '';
    for(;;){
        if (g.tokenPos >= g.inputLength) raise(g.tokenStart, 'Unterminated number constant');
        var ch = g.input.charAt(g.tokenPos);
        ++g.tokenPos;
        if (!Rule.digit.test(ch)) {
            return finishToken(_num, parseInt(str));
        }
        str += ch;
    }
}
function readString(quote){
    g.tokenPos++;
    var str = '';
    for(;;){
        if (g.tokenPos >= g.inputLength) raise(g.tokenStart, 'Unterminated string constant');
        var ch = g.input.charAt(g.tokenPos);
        ++g.tokenPos;
        if (ch === quote) {
            return finishToken(_string, str);
        }
        str += ch;
    }
}

function readCNWord() {
    var word = '';
    var finishReadWord = false;
    while(!finishReadWord) {
        ch = g.input.charAt(g.tokenPos);
        if(Rule.cnChar.test(ch)) {
            word += ch;
            ++g.tokenPos;
        }else{
            finishReadWord = true;
        }
    }
    if(KeyWordsEnum[word]) {
        finishToken(KeyWordsEnum[word], word);
    }else if(OptEnum[word]){
        finishToken(OptEnum[word], word);
    }else if(PuncTypesEnum[word]){
        finishToken(PuncTypesEnum[word], word);
    }else{
        finishToken(_name, word);
    }
}

function nextLineStart() {
}

function skipSpace(){
    while (g.tokenPos < g.inputLength) {
      var ch = g.input.charAt(g.tokenPos);
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' ||
                 ch === '\xa0' || ch === '\x0b') {
        ++g.tokenPos;
      } else {
        break;
      }
    }
}

function createStartAstNode(){
    var node = { type: null, start: g.tokenStart }
    return node;
}

function finishToken(type, val){
    g.tokenEnd = g.tokenPos;
    g.tokenType = type;
    skipSpace();
    g.tokenValue = val;
}

function finishNode(node, type){
    if (type != null) node.type = type;
    node.end = g.tokenLastEnd;
    return node;
}

function unexpected() {
    raise(g.tokenStart, '不是预期的词');
}
function raise(pos, message) {
    if (typeof pos == 'number') pos = getLineInfo(g.input, pos);
    message += ' : 第 ' + pos.line + ' 行, 第 ' + pos.column + ' 列';
    throw new SyntaxError(message);
}

function getLineInfo(input, pos){
    for (var line = 1, cur = 0;;) {
        Rule.lineBreak.lastIndex = cur;
        var match = Rule.lineBreak.exec(input);
        if (match && match.index < pos) {
          ++line;
          cur = match.index + match[0].length;
        } else break;
    }
    return {line: line, column: pos - cur};    
}

function generateCode(node) {
    switch(node.type) {
        case 'Program':
            return node.body.map(generateCode).join('\n');
        case 'VariableDeclaration':
            return 'var ' + node.declarations.map(generateCode).join(',') + ';\n';
        case 'VariableDeclarator':
            return node.id.name + (node.init ? (' = ' + generateCode(node.init)) : '');
        case 'BinaryExpression':
            return generateCode(node.left) + ' ' + node.operator + ' ' + generateCode(node.right);
        case 'NumberLiteral':
            return node.value;
        case 'IfStatement':
            return 'if(' + generateCode(node.test)  + ')' + generateCode(node.consequent) + (node.alternate ? 'else ' + generateCode(node.alternate) : '');
        case 'StringLiteral':
            return '"' + node.value + '"';    
        case 'WhileStatement':
            return 'while(' + generateCode(node.test) + ')' + generateCode(node.body);
        case 'BlockStatement':
            return '\n{\n' + node.body.map((b)=>{ return ('  ' + generateCode(b)) }).join('\n') +' \n}\n';
        case 'Identifier':
            return node.name;
        case 'ExpressionStatement':
            return generateCode(node.expression);
        case 'CallExpression':
            return generateCode(node.callee) + '(' + (node.arguments && node.arguments.map(generateCode).join(',')) + ')'    
        case 'FunctionExpression':
            return 'function(' + (node.params && node.params.map(generateCode).join(',')) + ')' + generateCode(node.body);
        case 'FunctionDeclaration':
            return 'function '+ generateCode(node.id) + '(' + (node.params && node.params.map(generateCode).join(',')) + ')' + generateCode(node.body);
        case 'AssignmentExpression':
            return (node.left ? generateCode(node.left) : '') + ' '+ node.operator + ' ' + (node.right?  generateCode(node.right) :'') + ';';
        case 'MemberExpression':
            return generateCode(node.object) + '.' + generateCode(node.property)
        case 'ReturnStatement':
            return 'return ' + generateCode(node.argument) + ';'
        default:
            throw new TypeError(node.type);
    }
}