/**
 * 初始化上下文供使用
 */
(function(){
    var doc = window.document;
    var global = {};
    var outputContext = doc.getElementById('output');
    var astContext = doc.getElementById('ast');
    var demosContext = doc.getElementById('demos');

    function getAstHtml(node) {
        return '<pre>' + JSON.stringify(node,null, 4) + '</pre>';
    }

    global.methods = {
        showAst: function(node) {
            astContext.innerHTML= getAstHtml(node)
        },
        log: function (msg) {
            var msg = 'CCC >> ' + msg;
            var div = doc.createElement('div');
            div.style.fontSize="12px";
            var text = doc.createTextNode(msg);
            div.appendChild(text);
            outputContext.appendChild(div);
        },
        err: function (msg) {
            var msg = 'CCC >> ' + msg;
            var div = doc.createElement('div');
            div.style.color="#EC0000";
            div.style.fontSize="12px";
            var text = doc.createTextNode(msg);
            div.appendChild(text);
            outputContext.appendChild(div);    
        },
        clearOutPut: function(){
            outputContext.innerHTML = '';
        }
    }
    global.initDemo = function() {
        window.editor.setValue(demoLists[0].code);
        for(var i = 0 ; i < demoLists.length; i++){
            var li = doc.createElement('li')
            var text = doc.createTextNode(demoLists[i].name);
            li.appendChild(text);
            li.style.cursor="pointer"
            li.setAttribute('index', i);
            demosContext.appendChild(li);
            li.addEventListener('click',function(){
                var index = this.getAttribute('index')
                window.editor.setValue(demoLists[index].code);
            });
        }
    }
    window.global = global;
    window.弹框 = alert;
    window.打印 = window.global.methods.log;
    window.道 = {};
    window.定时器 = window.setInterval;

})(window)
