/**
 * Created by bmiller on 3/19/15.
 * Heavily Modfied by ethanchewy on 2016 
    Merges code written by ethanchewy in javascript.js => https://github.com/ethanchewy/PythonBuddy/commit/25b9e7246e863713086a7ddcd1783716196713a0
 => Created real python compilation + run, add syntax checking with own custom code.
 Removed Skulpt <= Replaced with real Python Execute
 */

var isMouseDown = false;
document.onmousedown = function() { isMouseDown = true };
document.onmouseup   = function() { isMouseDown = false };

var edList = {};

ActiveCode.prototype = new RunestoneBase();

// separate into constructor and init

function ActiveCode(opts) {
    if (opts) {
        this.init(opts);
        }
    }

ActiveCode.prototype.init = function(opts) {
    RunestoneBase.apply( this, arguments );  // call parent constructor
    var suffStart = -1;
    var orig = opts.orig;
    this.useRunestoneServices = opts.useRunestoneServices;
    this.python3 = opts.python3;
    this.alignVertical = opts.vertical;
    this.origElem = orig;
    this.divid = orig.id;
    this.code = $(orig).text() || "\n\n\n\n\n";
    this.language = $(orig).data('lang');
    this.timelimit = $(orig).data('timelimit');
    this.includes = $(orig).data('include');
    this.hidecode = $(orig).data('hidecode');
    this.sid = opts.sid;
    this.graderactive = opts.graderactive;
    this.runButton = null;
    this.saveButton = null;
    this.loadButton = null;
    this.outerDiv = null;
    this.output = null; // create pre for output
    this.graphics = null; // create div for turtle graphics
    this.codecoach = null;
    this.codelens = null;
    this.controlDiv = null;
    this.historyScrubber = null;
    this.timestamps = ["Original"]
    this.autorun = $(orig).data('autorun');

    if(this.graderactive) {
        this.hidecode = false;
    }

    if(this.includes !== undefined) {
        this.includes = this.includes.split(/\s+/);
    }

    suffStart = this.code.indexOf('====');
    if (suffStart > -1) {
        this.suffix = this.code.substring(suffStart+5);
        this.code = this.code.substring(0,suffStart);
    }

    this.history = [this.code]
    this.createEditor();
    this.createOutput();
    this.createControls();
    if ($(orig).data('caption')) {
        this.caption = $(orig).data('caption');
    } else {
        this.caption = ""
    }
    this.addCaption();

    if (this.autorun) {
        $(document).ready(this.runProg.bind(this));
    }
};

ActiveCode.prototype.createEditor = function (index) {
    this.containerDiv = document.createElement('div');
    var linkdiv = document.createElement('div')
    linkdiv.id = this.divid.replace(/_/g,'-').toLowerCase();  // :ref: changes _ to - so add this as a target
    $(this.containerDiv).addClass("ac_section alert alert-warning");
    var codeDiv = document.createElement("div");
    $(codeDiv).addClass("ac_code_div col-md-12");
    this.codeDiv = codeDiv;
    this.containerDiv.id = this.divid;
    this.containerDiv.lang = this.language;
    this.outerDiv = this.containerDiv;

    $(this.origElem).replaceWith(this.containerDiv);
    if (linkdiv.id !== this.divid) {  // Don't want the 'extra' target if they match.
        this.containerDiv.appendChild(linkdiv);
    }
    /*Ethan Chiu Code*/
    this.containerDiv.appendChild(codeDiv);
    var editor = CodeMirror(codeDiv, {
        value: this.code, 
        mode: {name: "python",
               version: 2,
               singleLineStringErrors: false},
        lineNumbers: true,
        indentUnit: 4,
        matchBrackets: true,
        lint:true,
        styleActiveLine:true,
        gutters: ["CodeMirror-lint-markers"],
        lintWith: {
            "getAnnotations": CodeMirror.remoteValidator,
            "async" : true,
            "check_cb":check_syntax
        },
    });
    //Example Code, based on Skulpt website
    var exampleCode = function (id, text) {
        $(id).click(function (e) {
            console.log("sdf");
            editor.setValue(text);
            editor.focus(); // so that F5 works, hmm
        });
    };

    exampleCode('#codeexample1', "methods = []\nfor i in range(10):\n    methodds.append(lambda x: x + i)\nprint methods[0](10)");
    exampleCode('#codeexample2', "for i in range(5):\n    print i\n");
    exampleCode('#codeexample3', "print [x*x for x in range(20) if x % 2 == 0]");
    exampleCode('#codeexample4', "print 45**123");
    exampleCode('#codeexample5', "print \"%s:%r:%d:%x\\n%#-+37.34o\" % (\n        \"dog\",\n        \"cat\",\n        23456,\n        999999999999L,\n        0123456702345670123456701234567L)");
    exampleCode('#codeexample6', "def genr(n):\n    i = 0\n    while i < n:\n        yield i\n        i += 1\n\nprint list(genr(12))\n");
    exampleCode('#codeexample7', "# obscure C3 MRO example from Python docs\nclass O(object): pass\nclass A(O): pass\nclass B(O): pass\nclass C(O): pass\nclass D(O): pass\nclass E(O): pass\nclass K1(A,B,C): pass\nclass K2(D,B,E): pass\nclass K3(D,A): pass\nclass Z(K1,K2,K3): pass\nprint Z.__mro__\n");
    exampleCode('#codeexample8', "import document\n\npre = document.getElementById('edoutput')\npre.innerHTML = '''\n<h1> Skulpt can also access DOM! </h1>\n''' \n");

    /*End of Ethan Chiu's code*/


    // Make the editor resizable
    $(editor.getWrapperElement()).resizable({
        resize: function() {
            editor.setSize($(this).width(), $(this).height());
            editor.refresh();
        }
    });

    // give the user a visual cue that they have changed but not saved
    editor.on('change', (function () {
        if (editor.acEditEvent == false || editor.acEditEvent === undefined) {
            $(editor.getWrapperElement()).css('border-top', '2px solid #b43232');
            $(editor.getWrapperElement()).css('border-bottom', '2px solid #b43232');
            this.logBookEvent({'event': 'activecode', 'act': 'edit', 'div_id': this.divid});
    }
        editor.acEditEvent = true;
        }).bind(this));  // use bind to preserve *this* inside the on handler.

    this.editor = editor;
    if (this.hidecode) {
        $(this.codeDiv).css("display","none");
    }
};

/*Ethan Chiu's code */
function check_syntax(code, result_cb)
{   
    console.log("hi1");
    //Example error for guideline
    var error_list = [{
        line_no: null,
        column_no_start: null,
        column_no_stop: null,
        fragment: null,
        message: null,
        severity: null
    }];
    
    //Push and replace errors
    function check(errors){
        console.log("hi2");
        //Split errors individually by line => list
        //var tokens = errors.split(/\r?\n/);
        var number,message, severity, severity_color, id;
        //Regex for fetching number
        
        //Clear array.
        error_list = [{
            line_no: null,
            column_no_start: null,
            column_no_stop: null,
            fragment: null,
            message: null,
            severity: null
        }];
        //console.log(errors);
        document.getElementById('errorslist').innerHTML = '';
        $('#errorslist').append("<tr>"+"<th>Line</th>"+"<th>Severity</th>"+
            "<th>Error</th>"+ "<th>More Info</th>"+"</tr>");

        for(var x = 2; x < errors.length; x+=2){

            //Sorting into line_no, etc.
            //var match_number = errors[x].match(/\d+/);
            //number = parseInt(match_number[0], 10);
            //severity = errors[x].charAt(0);
            //Split code based on colon
            var message_split = errors[x].split(':');
            //console.log(message_split);

            number = message_split[1];

            //Get severity after second colon
            severity = message_split[2].charAt(2);

            //Get message id by splitting
            id = message_split[2].substring(2,7);

            //Split to get message
            message_split = message_split[2].split("]");
            message = message_split[1];

            //Set severity to necessary parameters
            if(severity=="E"){
                console.log("error");
                severity="error";
                severity_color="red";
            } else if(severity=="W"){
                console.log("error");
                severity="warning";
                severity_color="yellow";
            }
            //Push to error list        
            error_list.push({
                line_no: number, 
                column_no_start: null,
                column_no_stop: null,
                fragment: null,
                message: message, 
                severity: severity
            });

            //Get help message for each id
            var moreinfo = getHelp(id);
            //Append all data to table
            $('#errorslist').append("<tr>"+"<td>" + number + "</td>"
                +"<td style=\"background-color:"+severity_color+";\"" + 
                ">" + severity + "</td>"
                +"<td>" + message + "</td>"
                +"<td>" + moreinfo + "</td>"+"</tr>");
            

        }
        
        console.log("error_list"+error_list.toString());
        result_cb(error_list);

    }
    //AJAX call to pylint
    $.getJSON('/check_code', {
      text :  code
    }, function(data) {
        console.log(data);
        current_text = data;
        //Check Text
        check(current_text);
        return false;
    });
}
function getHelp(id){
    //From https://docs.pylint.org/en/1.6.0/features.html
    var list = [
        //Imports Checker Messages
        ["E0401","Used when pylint has been unable to import a module."],
        ["W0406","Used when a module is importing itself."],
        ["W0404","Used when a module is reimported multiple times."],
        ["W0403","Used when an import relative to the package directory is detected."],
        ["W0402","Used a module marked as deprecated is imported."],
        ["W0401","Used when from module import * is detected."],
        ["W0410","Python 2.5 and greater require __future__ import to be the first non docstring statement in the module."],
        ["R0401","Used when a cyclic import between two or more modules is detected."],
        ["C0411","Used when PEP8 import order is not respected (standard imports first, then third-party libraries, then local imports)"],
        ["C0413","Used when code and imports are mixed."],
        ["C0412","Used when imports are not grouped by packages."],
        ["C0410","Used when import statement importing multiple modules is detected."],
        //Variables Checker Messages
        ["E0633","Used when something which is not a sequence is used in an unpack assignment."],
        ["E0604","Used when an invalid (non-string) object occurs in __all__."],
        ["E0611","Used when a name cannot be found in a module."],
        ["E0632","Used when there is an unbalanced tuple unpacking in assignment."],
        ["E0602","Used when an undefined variable is accessed."],
        ["E0603","Used when an undefined variable name is referenced in __all__."],
        ["E0601","Used when a local variable is accessed before it’s assignment."],
        ["W0640","A variable used in a closure is defined in a loop. This will result in all closures using the same value for the closed-over variable."],
        ["W0601","Used when a variable is defined through the “global” statement but the variable is not defined in the module scope."],
        ["W0622","Used when a variable or function override a built-in."],
        ["W0623","Used when an exception handler assigns the exception to an existing name"],
        ["W0621","Used when a variable’s name hide a name defined in the outer scope."],
        ["W0611","Used when an imported module or variable is not used."],
        ["W0613","Used when a function or method argument is not used."],
        ["W0614","Used when an imported module or variable is not used from a ‘from X import *’ style import."],
        ["W0612","Used when a variable is defined but not used."],
        ["W0602","Used when a variable is defined through the “global” statement but no assignment to this variable is done."],
        ["W0631","Used when an loop variable (i.e. defined by a for loop or a list comprehension or a generator expression) is used outside the loop."],
        ["W0603","Used when you use the “global” statement to update a global variable. Pylint just try to discourage this usage. That doesn’t mean you can not use it !"],
        ["W0604","Used when you use the “global” statement at the module level since it has no effect."],
        //Design Checker
        ["R0903","Used when class has too few public methods, so be sure it’s really worth it."],
        ["R0901","Used when class has too many parent classes, try to reduce this to get a simpler (and so easier to use) class."],
        ["R0913","Used when a function or method takes too many arguments."],
        ["R0916","Used when a if statement contains too many boolean expressions."],
        ["R0912","Used when a function or method has too many branches, making it hard to follow."],
        ["R0902","Used when class has too many instance attributes, try to reduce this to get a simpler (and so easier to use) class."],
        ["R0914","Used when a function or method has too many local variables."],
        ["R0904","Used when class has too many public methods, try to reduce this to get a simpler (and so easier to use) class."],
        ["R0911","Used when a function or method has too many return statement, making it hard to follow."],
        ["R0915","Used when a function or method has too many statements. You should then split it in smaller functions / methods."],
        //stdlib checker
        ["W1501","Python supports: r, w, a[, x] modes with b, +, and U (only with r) options. See http://docs.python.org/2/library/functions.html#open"],
        ["W1503","The first argument of assertTrue and assertFalse is a condition. If a constant is passed as parameter, that condition will be always true. In this case a warning should be emitted."],
        ["W1502","Using datetime.time in a boolean context can hide subtle bugs when the time they represent matches midnight UTC. This behaviour was fixed in Python 3.5. See http://bugs.python.org/issue13936 for reference. This message can’t be emitted when using Python >= 3.5."],
        ["W1505","The method is marked as deprecated and will be removed in a future version of Python. Consider looking for an alternative in the documentation."],
        //String Constant checker
        ["W1402","Used when an escape like u is encountered in a byte string where it has no effect."],
        ["W1401","Used when a backslash is in a literal string but not as an escape."],
        //Basic checker
        ["E0103","Used when break or continue keywords are used outside a loop."],
        ["E0102","Used when a function / class / method is redefined."],
        ["E0116","Emitted when the continue keyword is found inside a finally clause, which is a SyntaxError."],
        ["E0110","Used when an abstract class with abc.ABCMeta as metaclass has abstract methods and is instantiated."],
        ["E0114","Emitted when a star expression is not used in an assignment target. This message can’t be emitted when using Python < 3.0."],
        ["E0108","Duplicate argument names in function definitions are syntax errors."],
        ["E0101","Used when the special class method __init__ has an explicit return value."],
        ["E0112","Emitted when there are more than one starred expressions (*x) in an assignment. This is a SyntaxError. This message can’t be emitted when using Python < 3.0."],
        ["E0115","Emitted when a name is both nonlocal and global. This message can’t be emitted when using Python < 3.0."],
        ["E0104","Used when a “return” statement is found outside a function or method."],
        ["E0106","Used when a “return” statement with an argument is found outside in a generator function or method (e.g. with some “yield” statements). This message can’t be emitted when using Python >= 3.3."],
        ["E0113","Emitted when a star expression is used as a starred assignment target. This message can’t be emitted when using Python < 3.0."],
        ["E0111","Used when the first argument to reversed() builtin isn’t a sequence (does not implement __reversed__, nor __getitem__ and __len__ ."],
        ["E0107","Used when you attempt to use the C-style pre-increment orpre-decrement operator – and ++, which doesn’t exist in Python."],
        ["E0105","Used when a “yield” statement is found outside a function or method."],
        ["E0100","Used when the special class method __init__ is turned into a generator by a yield in its body."],
        ["E0117","Emitted when a nonlocal variable does not have an attached name somewhere in the parent scopes This message can’t be emitted when using Python < 3.0."],
        ["W0150","Used when a break or a return statement is found inside the finally clause of a try...finally block: the exceptions raised in the try clause will be silently swallowed instead of being re-raised."],
        ["W0199","A call of assert on a tuple will always evaluate to true if the tuple is not empty, and will always evaluate to false if it is."],
        ["W0102","Used when a mutable value as list or dictionary is detected in a default value for an argument."],
        ["W0109","Used when a dictionary expression binds the same key multiple times."],
        ["W0120","Loops should only have an else clause if they can exit early with a break statement, otherwise the statements under else should be on the same scope as the loop itself."],
        ["W0106","Used when an expression that is not a function call is assigned to nothing. Probably something else was intended."],
        ["W0124","Emitted when a with statement component returns multiple values and uses name binding with as only for a part of those values, as in with ctx() as a, b. This can be misleading, since it’s not clear if the context manager returns a tuple or if the node without a name binding is another context manager."],
        ["W0108","Used when the body of a lambda expression is a function call on the same argument list as the lambda itself; such lambda expressions are in all but a few cases replaceable with the function being called in the body of the lambda."],
        ["W0104","Used when a statement doesn’t have (or at least seems to) any effect."],
        ["W0105","Used when a string is used as a statement (which of course has no effect). This is a particular case of W0104 with its own message so you can easily disable it if you’re using those strings as documentation, instead of comments."],
        ["W0107","Used when a “pass” statement that can be avoided is encountered."],
        ["W0101","Used when there is some code behind a “return” or “raise” statement, which will never be accessed."],
        ["W0123","Used when you use the “eval” function, to discourage its usage. Consider using ast.literal_eval for safely evaluating strings containing Python expressions from untrusted sources."],
        ["W0122","Used when you use the “exec” statement (function for Python 3), to discourage its usage. That doesn’t mean you can not use it !"],
        ["W0125","Emitted when a conditional statement (If or ternary if) uses a constant value for its test. This might not be what the user intended to do."],
        ["W0110","Used when a lambda is the first argument to “map” or “filter”. It could be clearer as a list comprehension or generator expression. This message can’t be emitted when using Python >= 3.0."],
        ["C0102","Used when the name is listed in the black list (unauthorized names)."],
        ["C0122","Comparison should be %s Used when the constant is placed on the left sideof a comparison. It is usually clearer in intent to place it in the right hand side of the comparison."],
        ["C0121","Used when an expression is compared to singleton values like True, False or None."],
        ["C0113","Used when a boolean expression contains an unneeded negation."],
        ["C0201","Emitted when the keys of a dictionary are iterated through the .keys() method. It is enough to just iterate through the dictionary itself, as in “for key in dictionary”."],
        ["C0200","Emitted when code that iterates with range and len is encountered. Such code can be simplified by using the enumerate builtin."],
        ["C0112","Used when a module, function, class or method has an empty docstring (it would be too easy ;)."],
        ["C0103","Used when the name doesn’t match the regular expression associated to its type (constant, variable, class...)."],
        ["C0111","Used when a module, function, class or method has no docstring.Some special methods like __init__ doesn’t necessary require a docstring."],
        ["C0123","The idiomatic way to perform an explicit typecheck in Python is to use isinstance(x, Y) rather than type(x) == Y, type(x) is Y. Though there are unusual situations where these give different results."],
        // Newstyle checker
        ["E1003"," Used when another argument than the current class is given as first argument of the super builtin."],
        ["E1004","Used when the super builtin didn’t receive an argument. This message can’t be emitted when using Python >= 3.0."],
        ["E1001","Used when an old style class uses the __slots__ attribute. This message can’t be emitted when using Python >= 3.0."],
        ["E1002","Used when an old style class uses the super builtin. This message can’t be emitted when using Python >= 3.0."],
        ["W1001","Used when Pylint detect the use of the builtin “property” on an old style class while this is relying on new style classes features. This message can’t be emitted when using Python >= 3.0."],
        ["C1001","Used when a class is defined that does not inherit from anotherclass and does not inherit explicitly from “object”. This message can’t be emitted when using Python >= 3.0."],
        //Iterable Check checker
        ["E1133","Used when a non-iterable value is used in place whereiterable is expected."],
        ["E1134","Used when a non-mapping value is used in place wheremapping is expected."],
        //String checker
        ["E1303","Used when a format string that uses named conversion specifiers is used with an argument that is not a mapping."],
        ["E1301","Used when a format string terminates before the end of a conversion specifier."],
        ["E1304","Used when a format string that uses named conversion specifiers is used with a dictionary that doesn’t contain all the keys required by the format string."],
        ["E1302","Used when a format string contains both named (e.g. ‘%(foo)d’) and unnamed (e.g. ‘%d’) conversion specifiers. This is also used when a named conversion specifier contains * for the minimum field width and/or precision."],
        ["E1306","Used when a format string that uses unnamed conversion specifiers is given too few arguments"],
        ["E1310","The argument to a str.{l,r,}strip call contains a duplicate character,"],
        ["E1305","Used when a format string that uses unnamed conversion specifiers is given too many arguments."],
        ["E1300","Used when a unsupported format character is used in a format string."],
        ["W1305","Usen when a PEP 3101 format string contains both automatic field numbering (e.g. ‘{}’) and manual field specification (e.g. ‘{0}’). This message can’t be emitted when using Python < 2.7."],
        ["W1300","Used when a format string that uses named conversion specifiers is used with a dictionary whose keys are not all strings."],
        ["W1302","Used when a PEP 3101 format string is invalid. This message can’t be emitted when using Python < 2.7."],
        ["W1306","Used when a PEP 3101 format string uses an attribute specifier ({0.length}), but the argument passed for formatting doesn’t have that attribute. This message can’t be emitted when using Python < 2.7."],
        ["W1303","Used when a PEP 3101 format string that uses named fields doesn’t receive one or more required keywords. This message can’t be emitted when using Python < 2.7."],
        ["W1304","Used when a PEP 3101 format string that uses named fields is used with an argument that is not required by the format string. This message can’t be emitted when using Python < 2.7."],
        ["W1301","Used when a format string that uses named conversion specifiers is used with a dictionary that contains keys not required by the format string."],
        ["W1307","Used when a PEP 3101 format string uses a lookup specifier ({a[1]}), but the argument passed for formatting doesn’t contain or doesn’t have that key as an attribute. This message can’t be emitted when using Python < 2.7."],
        //Format checker
        ["W0311","Used when an unexpected number of indentation’s tabulations or spaces has been found."],
        ["W0312","Used when there are some mixed tabs and spaces in a module."],
        ["W0301","Used when a statement is ended by a semi-colon (”;”), which isn’t necessary (that’s python, not C ;)."],
        ["W0332","Used when a lower case “l” is used to mark a long integer. You should use a upper case “L” since the letter “l” looks too much like the digit “1” This message can’t be emitted when using Python >= 3.0."],
        ["C0326","Used when a wrong number of spaces is used around an operator, bracket or block opener."],
        ["C0304","Used when the last line in a file is missing a newline."],
        ["C0301","Used when a line is longer than a given number of characters."],
        ["C0327","Used when there are mixed (LF and CRLF) newline signs in a file."],
        ["C0321","Used when more than on statement are found on the same line."],
        ["C0302","Used when a module has too much lines, reducing its readability."],
        ["C0305","Used when there are trailing blank lines in a file."],
        ["C0303","Used when there is whitespace between the end of a line and the newline."],
        ["C0328","Used when there is different newline than expected."],
        ["C0325","Used when a single item in parentheses follows an if, for, or other keyword."],
        ["C0330","The preferred place to break around a binary operator is after the operator, not before it."],
        //Miscellaneous checker
        ["C0403","Used when a word in docstring cannot be checked by enchant."],
        ["C0401","Used when a word in comment is not spelled correctly."],
        ["C0402","Used when a word in docstring is not spelled correctly."],
        //Python3 checker
        ["E1603","Python3 will not allow implicit unpacking of exceptions in except clauses. See http://www.python.org/dev/peps/pep-3110/ This message can’t be emitted when using Python >= 3.0."],
        ["E1609","Used when the import star syntax is used somewhere else than the module level. This message can’t be emitted when using Python >= 3.0."],
        ["E1602","Used when parameter unpacking is specified for a function(Python 3 doesn’t allow it) This message can’t be emitted when using Python >= 3.0."],
        ["E1606","Used when “l” or “L” is used to mark a long integer. This will not work in Python 3, since int and long types have merged. This message can’t be emitted when using Python >= 3.0."],
        ["E1608","Usen when encountering the old octal syntax, removed in Python 3. To use the new syntax, prepend 0o on the number. This message can’t be emitted when using Python >= 3.0."],
        ["E1607","Used when the deprecated “<>” operator is used instead of ”!=”. This is removed in Python 3. This message can’t be emitted when using Python >= 3.0."],
        ["E1605","Used when the deprecated “``” (backtick) operator is used instead of the str() function. This message can’t be emitted when using Python >= 3.0."],
        ["E1604","Used when the alternate raise syntax ‘raise foo, bar’ is used instead of ‘raise foo(bar)’. This message can’t be emitted when using Python >= 3.0."],
        ["E1601","Used when a print statement is used (print is a function in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1623","Used when a metaclass is specified by assigning to __metaclass__ (Python 3 specifies the metaclass as a class statement argument) This message can’t be emitted when using Python >= 3.0."],
        ["W1622","Used when an object’s next() method is called (Python 3 uses the next() built- in function) This message can’t be emitted when using Python >= 3.0."],
        ["W1620","Used for calls to dict.iterkeys(), itervalues() or iteritems() (Python 3 lacks these methods) This message can’t be emitted when using Python >= 3.0."],
        ["W1621","Used for calls to dict.viewkeys(), viewvalues() or viewitems() (Python 3 lacks these methods) This message can’t be emitted when using Python >= 3.0."],
        ["W1624","Indexing exceptions will not work on Python 3. Use exception.args[index] instead. This message can’t be emitted when using Python >= 3.0."],
        ["W1625","Used when a string exception is raised. This will not work on Python 3. This message can’t be emitted when using Python >= 3.0."],
        ["W1611","Used when the StandardError built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1640","Using the cmp argument for list.sort or the sorted builtin should be avoided, since it was removed in Python 3. Using either key or functools.cmp_to_key should be preferred. This message can’t be emitted when using Python >= 3.0."],
        ["W1630","Used when a __cmp__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1614","Used when a __coerce__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1615","Used when a __delslice__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1616","Used when a __getslice__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1628","Used when a __hex__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1629","Used when a __nonzero__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1627","Used when a __oct__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1617","Used when a __setslice__ method is defined (method is not used by Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1601","Used when the apply built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1602","Used when the basestring built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1603","Used when the buffer built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1604","Used when the cmp built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1605","Used when the coerce built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1619","Used for non-floor division w/o a float literal or from __future__ import division (Python 3 returns a float for int division unconditionally) This message can’t be emitted when using Python >= 3.0."],
        ["W1606","Used when the execfile built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1607","Used when the file built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1639","Used when the filter built-in is referenced in a non-iterating context (returns an iterator in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1618","Used when an import is not accompanied by from __future__ import absolute_import (default behaviour in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1632","Used when the input built-in is referenced (backwards-incompatible semantics in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1634","Used when the intern built-in is referenced (Moved to sys.intern in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1608","Used when the long built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1636","Used when the map built-in is referenced in a non-iterating context (returns an iterator in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1638","Used when the range built-in is referenced in a non-iterating context (returns an iterator in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1609","Used when the raw_input built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1610","Used when the reduce built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1626","Used when the reload built-in function is referenced (missing from Python 3). You can use instead imp.reload or importlib.reload. This message can’t be emitted when using Python >= 3.0."],
        ["W1633","Used when the round built-in is referenced (backwards-incompatible semantics in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1635","Used when the unichr built-in is referenced (Use chr in Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1612","Used when the unicode built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1613","Used when the xrange built-in function is referenced (missing from Python 3) This message can’t be emitted when using Python >= 3.0."],
        ["W1637","Used when the zip built-in is referenced in a non-iterating context (returns an iterator in Python 3) This message can’t be emitted when using Python >= 3.0."],
        //Logging checker
        ["E1201","Used when a logging statement format string terminates before the end of a conversion specifier."],
        ["E1206","Used when a logging format string is given too many arguments."],
        ["E1205","Used when a logging format string is given too few arguments."],
        ["E1200","Used when an unsupported format character is used in a logging statement format string."],
        ["W1201","Used when a logging statement has a call form of “logging.<logging method>(format_string % (format_args...))”. Such calls should leave string interpolation to the logging method itself and be written “logging.<logging method>(format_string, format_args...)” so that the program may avoid incurring the cost of the interpolation in those cases in which no message will be logged. For more, see http://www.python.org/dev/peps/pep-0282/."],
        ["W1202","Used when a logging statement has a call form of “logging.<logging method>(format_string.format(format_args...))”. Such calls should use % formatting instead, but leave interpolation to the logging function by passing the parameters as arguments."],
        //Typecheck checker
        ["E1130","Emitted when an unary operand is used on an object which does not support this type of operation"],
        ["E1131","Emitted when a binary arithmetic operation between two operands is not supported."],
        ["E1101","Used when a variable is accessed for an unexistent member."],
        ["E1102","Used when an object being called has been inferred to a non callable object"],
        ["E1124","Used when a function call would result in assigning multiple values to a function parameter, one value from a positional argument and one from a keyword argument."],
        ["E1111","Used when an assignment is done on a function call but the inferred function doesn’t return anything."],
        ["E1128","Used when an assignment is done on a function call but the inferred function returns nothing but None."],
        ["E1129","Used when an instance in a with statement doesn’t implement the context manager protocol(__enter__/__exit__)."],
        ["E1132","Emitted when a function call got multiple values for a keyword."],
        ["E1125","Used when a function call does not pass a mandatory keyword-only argument. This message can’t be emitted when using Python < 3.0."],
        ["E1120","Used when a function call passes too few arguments."],
        ["E1126","Used when a sequence type is indexed with an invalid type. Valid types are ints, slices, and objects with an __index__ method."],
        ["E1127","Used when a slice index is not an integer, None, or an object with an __index__ method."],
        ["E1121","Used when a function call passes too many positional arguments."],
        ["E1123","Used when a function call passes a keyword argument that doesn’t correspond to one of the function’s parameter names."],
        ["E1135","Emitted when an instance in membership test expression doesn’timplement membership protocol (__contains__/__iter__/__getitem__)"],
        ["E1136","Emitted when a subscripted value doesn’t support subscription(i.e. doesn’t define __getitem__ method)"],
        //Classes checker
        ["E0203","Used when an instance member is accessed before it’s actually assigned."],
        ["E0202","Used when a class defines a method which is hidden by an instance attribute from an ancestor class or set by some client code."],
        ["E0237","Used when assigning to an attribute not defined in the class slots."],
        ["E0241","Used when a class has duplicate bases."],
        ["E0240","Used when a class has an inconsistent method resolutin order."],
        ["E0239","Used when a class inherits from something which is not a class."],
        ["E0238","Used when an invalid __slots__ is found in class. Only a string, an iterable or a sequence is permitted."],
        ["E0236","Used when an invalid (non-string) object occurs in __slots__."],
        ["E0211","Used when a method which should have the bound instance as first argument has no argument defined."],
        ["E0213","Used when a method has an attribute different the “self” as first argument. This is considered as an error since this is a so common convention that you shouldn’t break it!"],
        ["E0302","Emitted when a special method was defined with an invalid number of parameters. If it has too few or too many, it might not work at all."],
        ["E0301","Used when an __iter__ method returns something which is not an iterable (i.e. has no next method)."],
        ["E0303","Used when an __len__ method returns something which is not a non-negative integer."],
        ["W0212","Used when a protected member (i.e. class member with a name beginning with an underscore) is access outside the class or a descendant of the class where it’s defined."],
        ["W0221","Used when a method has a different number of arguments than in the implemented interface or in an overridden method."],
        ["W0201","Used when an instance attribute is defined outside the __init__ method."],
        ["W0232","Used when a class has no __init__ method, neither its parent classes."],
        ["W0223","Used when an abstract method (i.e. raise NotImplementedError) is not overridden in concrete class."],
        ["W0222","Used when a method signature is different than in the implemented interface or in an overridden method."],
        ["W0211","Used when a static method has “self” or a value specified in valid- classmethod-first-arg option or valid-metaclass-classmethod-first-arg option as first argument."],
        ["W0233","Used when an __init__ method is called on a class which is not in the direct ancestors for the analysed class."],
        ["W0231","Used when an ancestor class method has an __init__ method which is not called by a derived class."],
        ["R0202","Used when a class method is defined without using the decorator syntax."],
        ["R0203","Used when a static method is defined without using the decorator syntax."],
        ["R0201","Used when a method doesn’t use its bound instance, and so could be written as a function."],
        ["C0202","Used when a class method has a first argument named differently than the value specified in valid-classmethod-first-arg option (default to “cls”), recommended to easily differentiate them from regular instance methods."],
        ["C0204","Used when a metaclass class method has a first argument named differently than the value specified in valid-metaclass-classmethod-first-arg option (default to “mcs”), recommended to easily differentiate them from regular instance methods."],
        ["C0203","Used when a metaclass method has a first agument named differently than the value specified in valid-classmethod-first-arg option (default to “cls”), recommended to easily differentiate them from regular instance methods."],
        ["F0202","Used when Pylint has been unable to check methods signature compatibility for an unexpected reason. Please report this kind if you don’t make sense of it."],
        //Similarities checker
        ["E0701","Used when except clauses are not in the correct order (from the more specific to the more generic). If you don’t fix the order, some exceptions may not be catched by the most specific handler."],
        ["E0712","Used when a class which doesn’t inherit from BaseException is used as an exception in an except clause."],
        ["E0703","Used when using the syntax “raise ... from ...”, where the exception context is not an exception, nor None. This message can’t be emitted when using Python < 3.0."],
        ["E0711","Used when NotImplemented is raised instead of NotImplementedError."],
        ["E0702","Used when something which is neither a class, an instance or a string is raised (i.e. a TypeError will be raised)."],
        ["E0710","Used when a new style class which doesn’t inherit from BaseException is raised."],
        ["E0704","Used when a bare raise is not used inside an except clause. This generates an error, since there are no active exceptions to be reraised. An exception to this rule is represented by a bare raise inside a finally clause, which might work, as long as an exception is raised inside the try block, but it is nevertheless a code smell that must not be relied upon."],
        ["W0705","Used when an except catches a type that was already caught by a previous handler."],
        ["W0703","Used when an except catches a too general exception, possibly burying unrelated errors."],
        ["W0710","Used when a custom exception class is raised but doesn’t inherit from the builtin “Exception” class. This message can’t be emitted when using Python >= 3.0."],
        ["W0711","Used when the exception to catch is of the form “except A or B:”. If intending to catch multiple, rewrite as “except (A, B):”"],
        ["W0702","Used when an except clause doesn’t specify exceptions type to catch."],
        //Async checker
        ["E1701","Used when an async context manager is used with an object that does not implement the async context management protocol. This message can’t be emitted when using Python < 3.5."],
        ["E1700","Used when an yield or yield from statement is found inside an async function. This message can’t be emitted when using Python < 3.5."]
    ];
    for( var i = 0, len = list.length; i < len; i++ ) {
        if( list[i][0] === id ) {
            return list[i][1];
        }
    }
    return "No information at the moment";
}
/*End of Ethan Chiu's code*/

ActiveCode.prototype.createControls = function () {
    var ctrlDiv = document.createElement("div");
    $(ctrlDiv).addClass("ac_actions");
    $(ctrlDiv).addClass("col-md-12");
    // Run
    var butt = document.createElement("button");
    $(butt).text("Run");
    $(butt).addClass("btn btn-success run-button");
    ctrlDiv.appendChild(butt);
    this.runButton = butt;
    $(butt).click(this.runProg.bind(this));

    if (! this.hidecode) {
        var butt = document.createElement("button");
        $(butt).text("Load History");
        $(butt).addClass("btn btn-default");
        ctrlDiv.appendChild(butt);
        this.histButton = butt;
        $(butt).click(this.addHistoryScrubber.bind(this));
        if (this.graderactive) {
            this.addHistoryScrubber(true);
        }
    }


    if ($(this.origElem).data('gradebutton') && ! this.graderactive) {
        butt = document.createElement("button");
        $(butt).addClass("ac_opt btn btn-default");
        $(butt).text("Show Feedback");
        $(butt).css("margin-left","10px");
        this.gradeButton = butt;
        ctrlDiv.appendChild(butt);
        $(butt).click(this.createGradeSummary.bind(this))
    }
    // Show/Hide Code
    if (this.hidecode) {
        butt = document.createElement("button");
        $(butt).addClass("ac_opt btn btn-default");
        $(butt).text("Show/Hide Code");
        $(butt).css("margin-left", "10px");
        this.showHideButt = butt;
        ctrlDiv.appendChild(butt);
        $(butt).click( (function() { $(this.codeDiv).toggle();
            if (this.historyScrubber == null) {
                this.addHistoryScrubber(true);
            } else {
                $(this.historyScrubber.parentElement).toggle();
            }
        }).bind(this));
    }

    // CodeLens
    if ($(this.origElem).data("codelens") && ! this.graderactive) {
        butt = document.createElement("button");
        $(butt).addClass("ac_opt btn btn-default");
        $(butt).text("Show CodeLens");
        $(butt).css("margin-left", "10px");
        this.clButton = butt;
        ctrlDiv.appendChild(butt);
        $(butt).click(this.showCodelens.bind(this));
    }
    // CodeCoach
    if (this.useRunestoneServices && $(this.origElem).data("coach")) {
        butt = document.createElement("button");
        $(butt).addClass("ac_opt btn btn-default");
        $(butt).text("Code Coach");
        $(butt).css("margin-left", "10px");
        this.coachButton = butt;
        ctrlDiv.appendChild(butt);
        $(butt).click(this.showCodeCoach.bind(this));
    }

    // Audio Tour
    if ($(this.origElem).data("audio")) {
        butt = document.createElement("button");
        $(butt).addClass("ac_opt btn btn-default");
        $(butt).text("Audio Tour");
        $(butt).css("margin-left", "10px");
        this.atButton = butt;
        ctrlDiv.appendChild(butt);
        $(butt).click((function() {new AudioTour(this.divid, this.editor.getValue(), 1, $(this.origElem).data("audio"))}).bind(this));
    }


    $(this.outerDiv).prepend(ctrlDiv);
    this.controlDiv = ctrlDiv;

};

// Activecode -- If the code has not changed wrt the scrubber position value then don't save the code or reposition the scrubber
//  -- still call runlog, but add a parameter to not save the code
// add an initial load history button
// if there is no edit then there is no append   to_save (True/False)

ActiveCode.prototype.addHistoryScrubber = function (pos_last) {

    var data = {acid: this.divid};
    var deferred = jQuery.Deferred();

    if (this.sid !== undefined) {
        data['sid'] = this.sid;
    }
    jQuery.getJSON(eBookConfig.ajaxURL + 'gethist.json', data, function(data, status, whatever) {
        if (data.history !== undefined) {
            this.history = this.history.concat(data.history);
            for (t in data.timestamps) {
                this.timestamps.push( (new Date(data.timestamps[t])).toLocaleString() )
            }
        }
    }.bind(this))
        .always(function() {
            var scrubberDiv = document.createElement("div");
            $(scrubberDiv).css("display","inline-block");
            $(scrubberDiv).css("margin-left","10px");
            $(scrubberDiv).css("margin-right","10px");
            $(scrubberDiv).width("180px");
            scrubber = document.createElement("div");
            this.slideit = function() {
                this.editor.setValue(this.history[$(scrubber).slider("value")]);
                var curVal = this.timestamps[$(scrubber).slider("value")];
                //this.scrubberTime.innerHTML = curVal;
                var tooltip = '<div class="sltooltip"><div class="sltooltip-inner">' +
                    curVal + '</div><div class="sltooltip-arrow"></div></div>';
                $(scrubber).find(".ui-slider-handle").html(tooltip);
                setTimeout(function () {
                    $(scrubber).find(".sltooltip").fadeOut()
                }, 4000);
            };
            $(scrubber).slider({
                max: this.history.length-1,
                value: this.history.length-1,
                slide: this.slideit.bind(this),
                change: this.slideit.bind(this)
            });
            scrubberDiv.appendChild(scrubber);

            if (pos_last) {
                scrubber.value = this.history.length-1
                this.editor.setValue(this.history[scrubber.value]);
            } else {
                scrubber.value = 0;
            }

            $(this.histButton).remove();
            this.histButton = null;
            this.historyScrubber = scrubber;
            $(scrubberDiv).insertAfter(this.runButton)
            deferred.resolve();
        }.bind(this));
    return deferred;
}


ActiveCode.prototype.createOutput = function () {
    // Create a parent div with two elements:  pre for standard output and a div
    // to hold turtle graphics output.  We use a div in case the turtle changes from
    // using a canvas to using some other element like svg in the future.
    var outDiv = document.createElement("div");
    $(outDiv).addClass("ac_output col-md-5");
    this.outDiv = outDiv;
    this.output = document.createElement('pre');
    this.output.id = this.divid+'_stdout';
    $(this.output).css("visibility","hidden");

    this.graphics = document.createElement('div');
    this.graphics.id = this.divid + "_graphics";
    $(this.graphics).addClass("ac-canvas");
    // This bit of magic adds an event which waits for a canvas child to be created on our
    // newly created div.  When a canvas child is added we add a new class so that the visible
    // canvas can be styled in CSS.  Which a the moment means just adding a border.
    $(this.graphics).on("DOMNodeInserted", 'canvas', (function(e) {
        $(this.graphics).addClass("visible-ac-canvas");
    }).bind(this));

    outDiv.appendChild(this.output);
    outDiv.appendChild(this.graphics);
    this.outerDiv.appendChild(outDiv);

    clearDiv = document.createElement("div");
    $(clearDiv).css("clear","both");  // needed to make parent div resize properly
    this.outerDiv.appendChild(clearDiv);


    var lensDiv = document.createElement("div");
    $(lensDiv).addClass("col-md-6");
    $(lensDiv).css("display","none");
    this.codelens = lensDiv;
    this.outerDiv.appendChild(lensDiv);

    var coachDiv = document.createElement("div")
    $(coachDiv).addClass("col-md-12");
    $(coachDiv).css("display","none");
    this.codecoach = coachDiv;
    this.outerDiv.appendChild(coachDiv);


    clearDiv = document.createElement("div");
    $(clearDiv).css("clear","both");  // needed to make parent div resize properly
    this.outerDiv.appendChild(clearDiv);

};

ActiveCode.prototype.disableSaveLoad = function() {
    $(this.saveButton).addClass('disabled');
    $(this.saveButton).attr('title','Login to save your code');
    $(this.loadButton).addClass('disabled');
    $(this.loadButton).attr('title','Login to load your code');
};

ActiveCode.prototype.addCaption = function() {
    //someElement.parentNode.insertBefore(newElement, someElement.nextSibling);
    var capDiv = document.createElement('p');
    $(capDiv).html(this.caption + " (" + this.divid + ")");
    $(capDiv).addClass("ac_caption");
    $(capDiv).addClass("ac_caption_text");

    this.outerDiv.parentNode.insertBefore(capDiv, this.outerDiv.nextSibling);
};

ActiveCode.prototype.saveEditor = function () {
    var res;
    var saveSuccess = function(data, status, whatever) {
        if (data.redirect) {
            alert("Did not save!  It appears you are not logged in properly")
        } else if (data == "") {
            alert("Error:  Program not saved");
        }
        else {
            var acid = eval(data)[0];
            if (acid.indexOf("ERROR:") == 0) {
                alert(acid);
            } else {
                // use a tooltip to provide some success feedback
                var save_btn = $(this.saveButton);
                save_btn.attr('title', 'Saved your code.');
                opts = {
                    'trigger': 'manual',
                    'placement': 'bottom',
                    'delay': { show: 100, hide: 500}
                };
                save_btn.tooltip(opts);
                save_btn.tooltip('show');
                setTimeout(function () {
                    save_btn.tooltip('destroy')
                }, 4000);

                $('#' + acid + ' .CodeMirror').css('border-top', '2px solid #aaa');
                $('#' + acid + ' .CodeMirror').css('border-bottom', '2px solid #aaa');
            }
        }
    }.bind(this);

    var data = {acid: this.divid, code: this.editor.getValue()};
    data.lang = this.language;
    if (data.code.match(/^\s+$/)) {
        res = confirm("You are about to save an empty program, this will overwrite a previously saved program.  Continue?");
        if (! res) {
            return;
        }
    }
    $(document).ajaxError(function (e, jqhxr, settings, exception) {
        //alert("Request Failed for" + settings.url)
        console.log("Request Failed for" + settings.url);
    });
    jQuery.post(eBookConfig.ajaxURL + 'saveprog', data, saveSuccess);
    if (this.editor.acEditEvent) {
        this.logBookEvent({'event': 'activecode', 'act': 'edit', 'div_id': this.divid}); // Log the run event
        this.editor.acEditEvent = false;
    }
    this.logBookEvent({'event': 'activecode', 'act': 'save', 'div_id': this.divid}); // Log the run event

};

ActiveCode.prototype.loadEditor = function () {
    var loadEditor = (function (data, status, whatever) {
        // function called when contents of database are returned successfully
        var res = eval(data)[0];
        if (res.source) {
            this.editor.setValue(res.source);
            setTimeout(function() {
                this.editor.refresh();
            }.bind(this),500);
            $(this.loadButton).tooltip({'placement': 'bottom',
                             'title': "Loaded your saved code.",
                             'trigger': 'manual'
                            });
        } else {
            $(this.loadButton).tooltip({'placement': 'bottom',
                             'title': "No saved code.",
                             'trigger': 'manual'
                            });
        }
        $(this.loadButton).tooltip('show');
        setTimeout(function () {
            $(this.loadButton).tooltip('destroy')
        }.bind(this), 4000);
    }).bind(this);

    var data = {acid: this.divid};
    if (this.sid !== undefined) {
        data['sid'] = this.sid;
    }
    // This function needs to be chainable for when we want to do things like run the activecode
    // immediately after loading the previous input (such as in a timed exam)
    var dfd = jQuery.Deferred();
    this.logBookEvent({'event': 'activecode', 'act': 'load', 'div_id': this.divid}); // Log the run event
    jQuery.get(eBookConfig.ajaxURL + 'getprog', data, loadEditor).done(function () {dfd.resolve();});
    return dfd;

};

ActiveCode.prototype.createGradeSummary = function () {
    // get grade and comments for this assignment
    // get summary of all grades for this student
    // display grades in modal window
    var showGradeSummary = function (data, status, whatever) {
        var report = eval(data)[0];
        // check for report['message']
        if (report) {
            body = "<h4>Grade Report</h4>" +
                   "<p>This assignment: " + report['grade'] + "</p>" +
                   "<p>" + report['comment'] + "</p>" +
                   "<p>Number of graded assignments: " + report['count'] + "</p>" +
                   "<p>Average score: " +  report['avg'] + "</p>"

        } else {
            body = "<h4>The server did not return any grade information</h4>";
        }
        var html = '<div class="modal fade">' +
            '  <div class="modal-dialog compare-modal">' +
            '    <div class="modal-content">' +
            '      <div class="modal-header">' +
            '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
            '        <h4 class="modal-title">Assignment Feedback</h4>' +
            '      </div>' +
            '      <div class="modal-body">' +
            body +
            '      </div>' +
            '    </div>' +
            '  </div>' +
            '</div>';

        el = $(html);
        el.modal();
    };
    var data = {'div_id': this.divid};
    jQuery.get(eBookConfig.ajaxURL + 'getassignmentgrade', data, showGradeSummary);
};

ActiveCode.prototype.hideCodelens = function (button, div_id) {
    this.codelens.style.display = 'none'
};

ActiveCode.prototype.showCodelens = function () {

    if (this.codelens.style.display == 'none') {
        this.codelens.style.display = 'block';
        this.clButton.innerText = "Hide Codelens";
    } else {
        this.codelens.style.display = "none";
        this.clButton.innerText = "Show in Codelens";
        return;
    }

    var cl = this.codelens.firstChild;
    if (cl) {
        div.removeChild(cl)
    }
    var code = this.editor.getValue();
    var myVars = {};
    myVars.code = code;
    myVars.origin = "opt-frontend.js";
    myVars.cumulative = false;
    myVars.heapPrimitives = false;
    myVars.drawParentPointers = false;
    myVars.textReferences = false;
    myVars.showOnlyOutputs = false;
    myVars.rawInputLstJSON = JSON.stringify([]);
    if (this.python3) {
        myVars.py = 3;
    } else {
        myVars.py = 2;
    }
    myVars.curInstr = 0;
    myVars.codeDivWidth = 350;
    myVars.codeDivHeight = 400;
    var srcURL = '//pythontutor.com/iframe-embed.html';
    var embedUrlStr = $.param.fragment(srcURL, myVars, 2 /* clobber all */);
    var myIframe = document.createElement('iframe');
    myIframe.setAttribute("id", this.divid + '_codelens');
    myIframe.setAttribute("width", "800");
    myIframe.setAttribute("height", "500");
    myIframe.setAttribute("style", "display:block");
    myIframe.style.background = '#fff';
    //myIframe.setAttribute("src",srcURL)
    myIframe.src = embedUrlStr;
    this.codelens.appendChild(myIframe);
    this.logBookEvent({
        'event': 'codelens',
        'act': 'view',
        'div_id': this.divid
    });

};

// <iframe id="%(divid)s_codelens" width="800" height="500" style="display:block"src="#">
// </iframe>


ActiveCode.prototype.showCodeCoach = function () {
    var myIframe;
    var srcURL;
    var cl;
    var div_id = this.divid;
    if (this.codecoach === null) {
        this.codecoach = document.createElement("div");
        this.codecoach.style.display = 'block'
    }

    cl = this.codecoach.firstChild;
    if (cl) {
        this.codecoach.removeChild(cl)
    }

    srcURL = eBookConfig.app + '/admin/diffviewer?divid=' + div_id;
    myIframe = document.createElement('iframe');
    myIframe.setAttribute("id", div_id + '_coach');
    myIframe.setAttribute("width", "800px");
    myIframe.setAttribute("height", "500px");
    myIframe.setAttribute("style", "display:block");
    myIframe.style.background = '#fff';
    myIframe.style.width = "100%";
    myIframe.src = srcURL;
    this.codecoach.appendChild(myIframe);
    $(this.codecoach).show()
    this.logBookEvent({
        'event': 'coach',
        'act': 'view',
        'div_id': this.divid
    });
};


ActiveCode.prototype.toggleEditorVisibility = function () {

};

ActiveCode.prototype.addErrorMessage = function (err) {
    //logRunEvent({'div_id': this.divid, 'code': this.prog, 'errinfo': err.toString()}); // Log the run event
    var errHead = $('<h3>').html('Error');
    this.eContainer = this.outerDiv.appendChild(document.createElement('div'));
    this.eContainer.className = 'error alert alert-danger';
    this.eContainer.id = this.divid + '_errinfo';
    this.eContainer.appendChild(errHead[0]);
    var errText = this.eContainer.appendChild(document.createElement('pre'));
    var errString = err.toString();
    var to = errString.indexOf(":");
    var errName = errString.substring(0, to);
    errText.innerHTML = errString;
    $(this.eContainer).append('<h3>Description</h3>');
    var errDesc = this.eContainer.appendChild(document.createElement('p'));
    errDesc.innerHTML = errorText[errName];
    $(this.eContainer).append('<h3>To Fix</h3>');
    var errFix = this.eContainer.appendChild(document.createElement('p'));
    errFix.innerHTML = errorText[errName + 'Fix'];
    $(this.eContainer).append('<h3>More Resources</h3>');       
    var errRes = this.eContainer.appendChild(document.createElement('div'));        
    errRes.innerHTML = "<a href=" + errorText[errName + "Resource"] + '>' + errorText[errName + "Resource"] +'</a>';
    var moreInfo = '../ErrorHelp/' + errName.toLowerCase() + '.html';
    //console.log("Runtime Error: " + err.toString());
};



var errorText = {};

errorText.ParseError = "A parse error means that Python does not understand the syntax on the line the error message points out.  Common examples are forgetting commas beteween arguments or forgetting a : on a for statement";
errorText.ParseErrorFix = "To fix a parse error you just need to look carefully at the line with the error and possibly the line before it.  Make sure it conforms to all of Python's rules.";
errorText.ParseErrorResource = "https://docs.python.org/3/tutorial/errors.html#syntax-errors";
errorText.TypeError = "Type errors most often occur when an expression tries to combine two objects with types that should not be combined.  Like raising a string to a power";
errorText.TypeErrorFix = "To fix a type error you will most likely need to trace through your code and make sure the variables have the types you expect them to have.  It may be helpful to print out each variable along the way to be sure its value is what you think it should be.";
errorText.TypeErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.TypeError";
errorText.NameError = "A name error almost always means that you have used a variable before it has a value.  Often this may be a simple typo, so check the spelling carefully.";
errorText.NameErrorFix = "Check the right hand side of assignment statements and your function calls, this is the most likely place for a NameError to be found.";
errorText.NameErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.NameError";
errorText.ValueError = "A ValueError most often occurs when you pass a parameter to a function and the function is expecting one type and you pass another.";
errorText.ValueErrorFix = "The error message gives you a pretty good hint about the name of the function as well as the value that is incorrect.  Look at the error message closely and then trace back to the variable containing the problematic value.";
errorText.ValueErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.ValueError";
errorText.AttributeError = "This error message is telling you that the object on the left hand side of the dot, does not have the attribute or method on the right hand side.";
errorText.AttributeErrorFix = "The most common variant of this message is that the object undefined does not have attribute X.  This tells you that the object on the left hand side of the dot is not what you think. Trace the variable back and print it out in various places until you discover where it becomes undefined.  Otherwise check the attribute on the right hand side of the dot for a typo.";
errorText.AttributeErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.AttributeError";
errorText.TokenError = "Most of the time this error indicates that you have forgotten a right parenthesis or have forgotten to close a pair of quotes.";
errorText.TokenErrorFix = "Check each line of your program and make sure that your parenthesis are balanced.";
errorText.TokenErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.TokenError";
errorText.TimeLimitError = "Your program is running too long.  Most programs in this book should run in less than 10 seconds easily. This probably indicates your program is in an infinite loop.";
errorText.TimeLimitErrorFix = "Add some print statements to figure out if your program is in an infinte loop.  If it is not you can increase the run time with sys.setExecutionLimit(msecs)";
errorText.TimeLimitErrorResource = "http://stackoverflow.com/questions/3831341/why-does-this-go-into-an-infinite-loop?rq=1";
errorText.Error = "Your program is running for too long.  Most programs in this book should run in less than 30 seconds easily. This probably indicates your program is in an infinite loop.";
errorText.ErrorFix = "Add some print statements to figure out if your program is in an infinte loop.  If it is not you can increase the run time with sys.setExecutionLimit(msecs)";
errorText.ErrorFixResource = "http://stackoverflow.com/questions/3831341/why-does-this-go-into-an-infinite-loop?rq=1";
errorText.SyntaxError = "This message indicates that Python can't figure out the syntax of a particular statement.  Some examples are assigning to a literal, or a function call";
errorText.SyntaxErrorFix = "Check your assignment statments and make sure that the left hand side of the assignment is a variable, not a literal or a function.";
errorText.SyntaxErrorResource = "https://docs.python.org/3/tutorial/errors.html#syntax-errors";
errorText.IndexError = "This message means that you are trying to index past the end of a string or a list.  For example if your list has 3 things in it and you try to access the item at position 3 or more.";
errorText.IndexErrorFix = "Remember that the first item in a list or string is at index position 0, quite often this message comes about because you are off by one.  Remember in a list of length 3 the last legal index is 2";
errorText.IndexErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.IndexError";
errorText.URIError = "";
errorText.URIErrorFix = "";
errorText.URIErrorResource = "http://stackoverflow.com/questions/13221978/getting-error-redirect-uri-mismatch-the-redirect-uri-in-the-request-http-loc";
errorText.ImportError = "This error message indicates that you are trying to import a module that does not exist";
errorText.ImportErrorFix = "One problem may simply be that you have a typo.  It may also be that you are trying to import a module that exists in 'real' Python, but does not exist in this book.  If this is the case, please submit a feature request to have the module added.";
errorText.ImportErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.ImportError";
errorText.ReferenceError = "This is most likely an internal error, particularly if the message references the console.";
errorText.ReferenceErrorFix = "Try refreshing the webpage, and if the error continues, submit a bug report along with your code";
errorText.ReferenceErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.ReferenceError";
errorText.ZeroDivisionError = "This tells you that you are trying to divide by 0. Typically this is because the value of the variable in the denominator of a division expression has the value 0";
errorText.ZeroDivisionErrorFix = "You may need to protect against dividing by 0 with an if statment, or you may need to rexamine your assumptions about the legal values of variables, it could be an earlier statment that is unexpectedly assigning a value of zero to the variable in question.";
errorText.ZeroDivisionErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.ZeroDivisionError";
errorText.RangeError = "This message almost always shows up in the form of Maximum call stack size exceeded.";
errorText.RangeErrorFix = "This always occurs when a function calls itself.  Its pretty likely that you are not doing this on purpose. Except in the chapter on recursion.  If you are in that chapter then its likely you haven't identified a good base case.";
errorText.RangeErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.RangeError";
errorText.InternalError = "An Internal error may mean that you've triggered a bug in our Python";
errorText.InternalErrorFix = "Report this error, along with your code as a bug.";
errorText.IndentationError = "This error occurs when you have not indented your code properly.  This is most likely to happen as part of an if, for, while or def statement.";
errorText.IndentationErrorFix = "Check your if, def, for, and while statements to be sure the lines are properly indented beneath them.  Another source of this error comes from copying and pasting code where you have accidentally left some bits of code lying around that don't belong there anymore.";
errorText.IndentationErrorResource = "https://docs.python.org/2/library/exceptions.html#exceptions.IndentationError";
errorText.NotImplementedError = "This error occurs when you try to use a builtin function of Python that has not been implemented in this in-browser version of Python.";
errorText.NotImplementedErrorFix = "For now the only way to fix this is to not use the function.  There may be workarounds.  If you really need this builtin function then file a bug report and tell us how you are trying to use the function.";


ActiveCode.prototype.setTimeLimit = function (timer) {
    var timelimit = this.timelimit;
    if (timer !== undefined ) {
        timelimit = timer
    }
    // set execLimit in milliseconds  -- for student projects set this to
    // 25 seconds -- just less than Chrome's own timer.
    if (this.code.indexOf('ontimer') > -1 ||
        this.code.indexOf('onclick') > -1 ||
        this.code.indexOf('onkey') > -1  ||
        this.code.indexOf('setDelay') > -1 ) {
        Sk.execLimit = null;
    } else {
        if (timelimit === "off") {
            Sk.execLimit = null;
        } else if (timelimit) {
            Sk.execLimit = timelimit;
        } else {
            Sk.execLimit = 25000;
    }
    }

};

ActiveCode.prototype.builtinRead = function (x) {
        if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
            throw "File not found: '" + x + "'";
        return Sk.builtinFiles["files"][x];
};

ActiveCode.prototype.outputfun = function(text) {
    // bnm python 3
    pyStr = function(x) {
        if (x instanceof Array) {
            return '[' + x.join(", ") + ']';
        } else {
            return x
        }
    }

    var x = text;
    if (! this.python3 ) {
        if (x.charAt(0) == '(') {
            x = x.slice(1, -1);
            x = '[' + x + ']';
            try {
                var xl = eval(x);
                xl = xl.map(pyStr);
                x = xl.join(' ');
            } catch (err) {
            }
        }
    }
    $(this.output).css("visibility","visible");
    text = x;
    text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
        $(this.output).append(text);
    };

ActiveCode.prototype.buildProg = function() {
    // assemble code from prefix, suffix, and editor for running.
    var pretext;
    var prog = this.editor.getValue();
    this.pretext = "";
    if (this.includes !== undefined) {
        // iterate over the includes, in-order prepending to prog
        pretext = "";
        for (var x=0; x < this.includes.length; x++) {
            pretext = pretext + edList[this.includes[x]].editor.getValue();
            }
        this.pretext = pretext;
        prog = pretext + prog
    }

    if(this.suffix) {
        prog = prog + this.suffix;
}

    return prog;
};

ActiveCode.prototype.runProg = function() {
        var prog = this.buildProg();
        var saveCode = true;

        $(this.output).text('');

        $(this.eContainer).remove();
        //Ethan Chiu's Code
        console.log("sfd");
        //AJAX call to run python => to app.py
        $.getJSON('/run_code', {
          text :  this.editor.getValue()
        }, function(data) {
            print_result(data);
            return false;
        });
        
        function print_result(data){
            document.getElementById('output').innerHTML = '';
            $("#output").append("<pre>"+data+"</pre>");
        }

        /*
        Sk.configure({output : this.outputfun.bind(this),
              read   : this.builtinRead,
              python3: this.python3,
              imageProxy : 'http://image.runestone.academy:8080/320x',
              inputfunTakesPrompt: true,
        });
        Sk.divid = this.divid;
        */
        this.setTimeLimit();

        /*
        (Sk.TurtleGraphics || (Sk.TurtleGraphics = {})).target = this.graphics;
        Sk.canvas = this.graphics.id; //todo: get rid of this here and in image
    */
        //$(this.runButton).attr('disabled', 'disabled');
        $(this.codeDiv).switchClass("col-md-12","col-md-7",{duration:500,queue:false});
        $(this.outDiv).show({duration:700,queue:false});

        if (this.historyScrubber === null && !this.autorun) {
            dfd = this.addHistoryScrubber();
        } else {
            dfd = jQuery.Deferred();
            dfd.resolve();
        }

        hresolver = jQuery.Deferred();
        dfd.done((function() {
                if (this.historyScrubber && (this.history[$(this.historyScrubber).slider("value")] != this.editor.getValue())) {
                    saveCode = "True";
                    this.history.push(this.editor.getValue());
                    this.timestamps.push((new Date()).toLocaleString());
                    $(this.historyScrubber).slider("option", "max", this.history.length - 1);
                    $(this.historyScrubber).slider("option", "value", this.history.length - 1);
                } else {
                    saveCode = "False";
                }

                if (this.historyScrubber === null) {
                    saveCode = "False";
                }
                hresolver.resolve();
            }).bind(this));

        /*
        var myPromise = Sk.misceval.asyncToPromise(function() {

            return Sk.importMainWithBody("<stdin>", false, prog, true);
        });
        */


        // Make sure that the history scrubber is fully initialized AND the code has been run
        // before we start logging stuff.
        
        Promise.all([myPromise,hresolver]).then((function(mod) { // success
            $(this.runButton).removeAttr('disabled');
            //this.logRunEvent({'div_id': this.divid, 'code': this.editor.getValue(), 'errinfo': 'success', 'to_save':saveCode, 'prefix': this.pretext, 'suffix':this.suffix}); // Log the run event
        }).bind(this),
            (function(err) {  // fail
            $(this.runButton).removeAttr('disabled');
            //this.logRunEvent({'div_id': this.divid, 'code': this.editor.getValue(), 'errinfo': err.toString(), 'to_save':saveCode, 'prefix': this.pretext, 'suffix':this.suffix}); // Log the run event
            this.addErrorMessage(err);
                }).bind(this));
        


        if (typeof(allVisualizers) != "undefined") {
            $.each(allVisualizers, function (i, e) {
                e.redrawConnectors();
                });
            }
        
        
        

    };

//DELETED ALL UNNECCESSARY LANGUAGE SUPPORT 


String.prototype.replaceAll = function (target, replacement) {
    return this.split(target).join(replacement);
};

AudioTour.prototype = new RunestoneBase();

// function to display the audio tours
function AudioTour (divid, code, bnum, audio_text) {
    this.elem = null; // current audio element playing
    this.currIndex; // current index
    this.len; // current length of audio files for tour
    this.buttonCount; // number of audio tour buttons
    this.aname; // the audio file name
    this.ahash; // hash of the audio file name to the lines to highlight
    this.theDivid; // div id
    this.afile; // file name for audio
    this.playing = false; // flag to say if playing or not
    this.tourName;

    // Replacing has been done here to make sure special characters in the code are displayed correctly
    code = code.replaceAll("*doubleq*", "\"");
    code = code.replaceAll("*singleq*", "'");
    code = code.replaceAll("*open*", "(");
    code = code.replaceAll("*close*", ")");
    code = code.replaceAll("*nline*", "<br/>");
    var codeArray = code.split("\n");

    var audio_hash = new Array();
    var bval = new Array();
    var atype = audio_text.replaceAll("*doubleq*", "\"");
    var audio_type = atype.split("*atype*");
    for (var i = 0; i < audio_type.length - 1; i++) {
        audio_hash[i] = audio_type[i];
        var aword = audio_type[i].split(";");
        bval.push(aword[0]);
    }

    var first = "<pre><div id='" + divid + "_l1'>" + "1.   " + codeArray[0] + "</div>";
    num_lines = codeArray.length;
    for (var i = 1; i < num_lines; i++) {
        if (i < 9) {
            first = first + "<div id='" + divid + "_l" + (i + 1) + "'>" + (i + 1) + ".   " + codeArray[i] + "</div>";
        }
        else if (i < 99) {
            first = first + "<div id='" + divid + "_l" + (i + 1) + "'>" + (i + 1) + ".  " + codeArray[i] + "</div>";
        }
        else {
            first = first + "<div id='" + divid + "_l" + (i + 1) + "'>" + (i + 1) + ". " + codeArray[i] + "</div>";
        }
    }
    first = first + "</pre>";

    //laying out the HTML content

    var bcount = 0;
    var html_string = "<div class='modal-lightsout'></div><div class='modal-profile'><h3>Take an audio tour!</h3><div class='modal-close-profile'></div><p id='windowcode'></p><p id='" + divid + "_audiocode'></p>";
    html_string += "<p id='status'></p>";
    html_string += "<input type='image' src='../_static/first.png' width='25' id='first_audio' name='first_audio' title='Play first audio in tour' alt='Play first audio in tour' onerror=\"this.onerror=null;this.src='_static/first.png'\" disabled/>" +
                   "<input type='image' src='../_static/prev.png' width='25' id='prev_audio' name='prev_audio' title='Play previous audio in tour' alt='Play previous audio in tour' onerror=\"this.onerror=null;this.src='_static/prev.png'\" disabled/>" +
                   "<input type='image' src='../_static/pause.png' width='25' id='pause_audio' name='pause_audio' title='Pause current audio' alt='Pause current audio' onerror=\"this.onerror=null;this.src='_static/pause.png'\" disabled/>" + "" +
                   "<input type='image' src='../_static/next.png' width ='25' id='next_audio' name='next_audio' title='Play next audio in tour' alt='Play next audio in tour' onerror=\"this.onerror=null;this.src='_static/next.png'\" disabled/>" +
                   "<input type='image' src='../_static/last.png' width ='25' id='last_audio' name='last_audio' title='Play last audio in tour' alt='Play last audio in tour' onerror=\"this.onerror=null;this.src='_static/last.png'\" disabled/><br/>";
    for (var i = 0; i < audio_type.length - 1; i++) {
        html_string += "<input type='button' style='margin-right:5px;' class='btn btn-default btn-sm' id='button_audio_" + i + "' name='button_audio_" + i + "' value=" + bval[i] + " />";
        bcount++;
    }
    //html_string += "<p id='hightest'></p><p id='hightest1'></p><br/><br/><p id='test'></p><br/><p id='audi'></p></div>";
    html_string += "</div>";

    var tourdiv = document.createElement('div');
    document.body.appendChild(tourdiv);
    $(tourdiv).html(html_string);
    $('#windowcode').html(first);

    // Position modal box
    $.fn.center = function () {
        this.css("position", "absolute");
        // y position
        this.css("top", ($(window).scrollTop() + $(navbar).height() + 10 + "px"));
        // show window on the left so that you can see the output from the code still
        this.css("left", ($(window).scrollLeft() + "px"));
        return this;
    };

    $(".modal-profile").center();
    $('.modal-profile').fadeIn("slow");
    //$('.modal-lightsout').css("height", $(document).height());
    $('.modal-lightsout').fadeTo("slow", .5);
    $('.modal-close-profile').show();

    // closes modal box once close link is clicked, or if the lights out divis clicked
    $('.modal-close-profile, .modal-lightsout').click( (function () {
        if (this.playing) {
            this.elem.pause();
        }
        //log change to db
        this.logBookEvent({'event': 'Audio', 'act': 'closeWindow', 'div_id': divid});
        $('.modal-profile').fadeOut("slow");
        $('.modal-lightsout').fadeOut("slow");
        document.body.removeChild(tourdiv);
    }).bind(this));

    // Accommodate buttons for a maximum of five tours

    $('#' + 'button_audio_0').click((function () {
        this.tour(divid, audio_hash[0], bcount);
    }).bind(this));
    $('#' + 'button_audio_1').click((function () {
        this.tour(divid, audio_hash[1], bcount);
    }).bind(this));
    $('#' + 'button_audio_2').click((function () {
        this.tour(divid, audio_hash[2], bcount);
    }).bind(this));
    $('#' + 'button_audio_3').click((function () {
        this.tour(divid, audio_hash[3], bcount);
    }).bind(this));
    $('#' + 'button_audio_4').click((function () {
        this.tour(divid, audio_hash[4], bcount);
    }).bind(this));

    // handle the click to go to the next audio
    $('#first_audio').click((function () {
        this.firstAudio();
    }).bind(this));

    // handle the click to go to the next audio
    $('#prev_audio').click((function () {
        this.prevAudio();
    }).bind(this));

    // handle the click to pause or play the audio
    $('#pause_audio').click((function () {
        this.pauseAndPlayAudio();
    }).bind(this));

    // handle the click to go to the next audio
    $('#next_audio').click((function () {
        this.nextAudio();
    }).bind(this));

    // handle the click to go to the next audio
    $('#last_audio').click((function () {
        this.lastAudio();
    }).bind(this));

    // make the image buttons look disabled
    $("#first_audio").css('opacity', 0.25);
    $("#prev_audio").css('opacity', 0.25);
    $("#pause_audio").css('opacity', 0.25);
    $("#next_audio").css('opacity', 0.25);
    $("#last_audio").css('opacity', 0.25);

}

AudioTour.prototype.tour = function (divid, audio_type, bcount) {
    // set globals
    this.buttonCount = bcount;
    this.theDivid = divid;

    // enable prev, pause/play and next buttons and make visible
    $('#first_audio').removeAttr('disabled');
    $('#prev_audio').removeAttr('disabled');
    $('#pause_audio').removeAttr('disabled');
    $('#next_audio').removeAttr('disabled');
    $('#last_audio').removeAttr('disabled');
    $("#first_audio").css('opacity', 1.0);
    $("#prev_audio").css('opacity', 1.0);
    $("#pause_audio").css('opacity', 1.0);
    $("#next_audio").css('opacity', 1.0);
    $("#last_audio").css('opacity', 1.0);

    // disable tour buttons
    for (var i = 0; i < bcount; i++)
        $('#button_audio_' + i).attr('disabled', 'disabled');

    var atype = audio_type.split(";");
    var name = atype[0].replaceAll("\"", " ");
    this.tourName = name;
    $('#status').html("Starting the " + name);

    //log tour type to db
    this.logBookEvent({'event': 'Audio', 'act': name, 'div_id': divid});

    var max = atype.length;
    var str = "";
    this.ahash = new Array();
    this.aname = new Array();
    for (i = 1; i < max - 1; i++) {
        var temp = atype[i].split(":");
        var temp_line = temp[0];
        var temp_aname = temp[1];

        var akey = temp_aname.substring(1, temp_aname.length);
        var lnums = temp_line.substring(1, temp_line.length);

        //alert("akey:"+akey+"lnum:"+lnums);

        // str+="<audio id="+akey+" preload='auto'><source src='http://ice-web.cc.gatech.edu/ce21/audio/"+
        // akey+".mp3' type='audio/mpeg'><source src='http://ice-web.cc.gatech.edu/ce21/audio/"+akey+
        // ".ogg' type='audio/ogg'>Your browser does not support the audio tag</audio>";

        var dir = "http://media.interactivepython.org/" + eBookConfig.basecourse + "/audio/"
        //var dir = "../_static/audio/"
        str += "<audio id=" + akey + " preload='auto' >";
        str += "<source src='" + dir + akey + ".wav' type='audio/wav'>";
        str += "<source src='" + dir + akey + ".mp3' type='audio/mpeg'>";
        str += "<source src='" + dir + akey + ".wav' type='audio/wav'>";
        str += "<source src='" + dir + akey + ".mp3' type='audio/mpeg'>";
        str +=  "<br />Your browser does not support the audio tag</audio>";
        this.ahash[akey] = lnums;
        this.aname.push(akey);
    }
    var ahtml = "#" + divid + "_audiocode";
    $(ahtml).html(str); // set the html to the audio tags
    this.len = this.aname.length; // set the number of audio file in the tour

    // start at the first audio
    this.currIndex = 0;

    // play the first audio in the tour
    this.playCurrIndexAudio();
};

AudioTour.prototype.handlePlaying = function() {

    // if this.playing audio pause it
    if (this.playing) {

        this.elem.pause();

        // unbind current ended
        $('#' + this.afile).unbind('ended');

        // unhighlight the prev lines
        this.unhighlightLines(this.theDivid, this.ahash[this.aname[this.currIndex]]);
    }

};

AudioTour.prototype.firstAudio = function () {

    // if audio is this.playing handle it
    this.handlePlaying();

    //log change to db
    this.logBookEvent({'event': 'Audio', 'act': 'first', 'div_id': this.theDivid});


    // move to the first audio
    this.currIndex = 0;

    // start at the first audio
    this.playCurrIndexAudio();

};

AudioTour.prototype.prevAudio = function () {

    // if there is a previous audio
    if (this.currIndex > 0) {

        // if audio is this.playing handle it
        this.handlePlaying();

        //log change to db
        this.logBookEvent({'event': 'Audio', 'act': 'prev', 'div_id': this.theDivid});


        // move to previous to the current (but the current index has moved to the next)
        this.currIndex = this.currIndex - 1;

        // start at the prev audio
        this.playCurrIndexAudio();
    }

};

AudioTour.prototype.nextAudio = function () {

    // if audio is this.playing handle it
    this.handlePlaying();

    //log change to db
    this.logBookEvent({'event': 'Audio', 'act': 'next', 'div_id': this.theDivid});

    // if not at the end
    if (this.currIndex < (this.len - 1)) {
        // start at the next audio
        this.currIndex = this.currIndex + 1;
        this.playCurrIndexAudio();
    }
    else if (this.currIndex == (this.len - 1)) {
        this.handleTourEnd();
    }
};

AudioTour.prototype.lastAudio = function () {

    // if audio is this.playing handle it
    this.handlePlaying();

    //log change to db
    this.logBookEvent({'event': 'Audio', 'act': 'last', 'div_id': this.theDivid});

    // move to the last audio
    this.currIndex = this.len - 1;

    // start at last
    this.playCurrIndexAudio();

};

// play the audio at the current index
AudioTour.prototype.playCurrIndexAudio = function () {

    // set this.playing to false
    this.playing = false;

    // play the current audio and highlight the lines
    this.playaudio(this.currIndex, this.aname, this.theDivid, this.ahash);

};

// handle the end of the tour
AudioTour.prototype.handleTourEnd = function () {

    $('#status').html(" The " + this.tourName + " Ended");

    // disable the prev, pause/play, and next buttons and make them more invisible
    $('#first_audio').attr('disabled', 'disabled');
    $('#prev_audio').attr('disabled', 'disabled');
    $('#pause_audio').attr('disabled', 'disabled');
    $('#next_audio').attr('disabled', 'disabled');
    $('#last_audio').attr('disabled', 'disabled');
    $("#first_audio").css('opacity', 0.25);
    $("#prev_audio").css('opacity', 0.25);
    $("#pause_audio").css('opacity', 0.25);
    $("#next_audio").css('opacity', 0.25);
    $("#last_audio").css('opacity', 0.25);

    // enable the tour buttons
    for (var j = 0; j < this.buttonCount; j++)
        $('#button_audio_' + j).removeAttr('disabled');
};

// only call this one after the first time
AudioTour.prototype.outerAudio = function () {

    // unbind ended
    $('#' + this.afile).unbind('ended');

    // set this.playing to false
    this.playing = false;

    // unhighlight previous lines from the last audio
    this.unhighlightLines(this.theDivid, this.ahash[this.aname[this.currIndex]]);

    // increment the this.currIndex to point to the next one
    this.currIndex++;

    // if the end of the tour reset the buttons
    if (this.currIndex == this.len) {
        this.handleTourEnd();
    }

    // else not done yet so play the next audio
    else {

        // play the audio at the current index
        this.playCurrIndexAudio();
    }
};

// play the audio now that it is ready
AudioTour.prototype.playWhenReady = function (afile, divid, ahash) {
    // unbind current
    $('#' + afile).unbind('canplaythrough');
    //console.log("in playWhenReady " + elem.duration);

    $('#status').html("Playing the " + this.tourName);
    this.elem.currentTime = 0;
    this.highlightLines(divid, ahash[afile]);
    $('#' + afile).bind('ended', (function () {
        this.outerAudio();
    }).bind(this));
    this.playing = true;
    this.elem.play();

};


// play the audio at the specified index i and set the duration and highlight the lines
AudioTour.prototype.playaudio = function (i, aname, divid, ahash) {
    this.afile = aname[i];
    this.elem = document.getElementById(this.afile);

    // if this isn't ready to play yet - no duration yet then wait
    //console.log("in playaudio " + elem.duration);
    if (isNaN(this.elem.duration) || this.elem.duration == 0) {
        // set the status
        $('#status').html("Loading audio.  Please wait.   If it doesn't start soon close this window (click on the red X) and try again");
        $('#' + this.afile).bind('canplaythrough', (function () {
            this.playWhenReady(this.afile, divid, ahash);
        }).bind(this));
    }
    // otherwise it is ready so play it
    else {
        this.playWhenReady(this.afile, divid, ahash);
    }
};

// pause if this.playing and play if paused
AudioTour.prototype.pauseAndPlayAudio = function () {
    var btn = document.getElementById('pause_audio');

    // if paused and clicked then continue from current
    if (this.elem.paused) {
        // calcualte the time left to play in milliseconds
        counter = (this.elem.duration - this.elem.currentTime) * 1000;
        this.elem.play(); // start the audio from current spot
        document.getElementById("pause_audio").src = "../_static/pause.png";
        document.getElementById("pause_audio").title = "Pause current audio";
        //log change to db
        this.logBookEvent({'event': 'Audio', 'act': 'play', 'div_id': this.theDivid});
    }

    // if audio was this.playing pause it
    else if (this.playing) {
        this.elem.pause(); // pause the audio
        document.getElementById("pause_audio").src = "../_static/play.png";
        document.getElementById("pause_audio").title = "Play paused audio";
        //log change to db
        this.logBookEvent({'event': 'Audio', 'act': 'pause', 'div_id': this.theDivid});
    }

};

// process the lines
AudioTour.prototype.processLines = function (divid, lnum, color) {
    var comma = lnum.split(",");

    if (comma.length > 1) {
        for (i = 0; i < comma.length; i++) {
            this.setBackgroundForLines(divid, comma[i], color);
        }
    }
    else {
        this.setBackgroundForLines(divid, lnum, color);
    }
};

// unhighlight the lines - set the background back to transparent
AudioTour.prototype.unhighlightLines = function (divid, lnum) {
    this.processLines(divid, lnum, 'transparent');
};

// highlight the lines - set the background to a yellow color
AudioTour.prototype.highlightLines = function (divid, lnum) {
    this.processLines(divid, lnum, '#ffff99');
};

// set the background to the passed color
AudioTour.prototype.setBackgroundForLines = function (divid, lnum, color) {
    var hyphen = lnum.split("-");

    // if a range of lines
    if (hyphen.length > 1) {
        var start = parseInt(hyphen[0]);
        var end = parseInt(hyphen[1]) + 1;
        for (var k = start; k < end; k++) {
            //alert(k);
            var str = "#" + divid + "_l" + k;
            if ($(str).text() != "") {
                $(str).css('background-color', color);
            }
            //$(str).effect("highlight",{},(dur*1000)+4500);
        }
    }
    else {
        //alert(lnum);
        var str = "#" + divid + "_l" + lnum;
        $(str).css('background-color', color);
        //$(str).effect("highlight",{},(dur*1000)+4500);
    }
};

//
//

ACFactory = {};

ACFactory.createActiveCode = function (orig, lang, addopts) {
    var opts = {'orig' : orig, 'useRunestoneServices': eBookConfig.useRunestoneServices, 'python3' : eBookConfig.python3 };
    if (addopts) {
        for (var attrname in addopts) {
            opts[attrname] = addopts[attrname];
        }
    }
    if (lang === "javascript") {
        return new JSActiveCode(opts);
    } else if (lang === 'htmlmixed') {
        return new HTMLActiveCode(opts);
    } else if (['java', 'cpp', 'c', 'python3', 'python2'].indexOf(lang) > -1) {
        return new LiveCode(opts);
    } else {   // default is python
        return new ActiveCode(opts);
    }

}

// used by web2py controller(s)
ACFactory.addActiveCodeToDiv = function(outerdivid, acdivid, sid, initialcode, language) {
    var  thepre, newac;

    acdiv = document.getElementById(acdivid);
    $(acdiv).empty();
    thepre = document.createElement("textarea");
    thepre['data-component'] = "activecode";
    thepre.id = outerdivid;
    $(thepre).data('lang', language);
    $(acdiv).append(thepre);
    var opts = {'orig' : thepre, 'useRunestoneServices': true };
    addopts = {'sid': sid, 'graderactive':true};
    if(language === 'htmlmixed') {
        addopts['vertical'] = true;
    }
    newac = ACFactory.createActiveCode(thepre,language,addopts);
    savediv = newac.divid;
    //newac.divid = outerdivid;
    //newac.sid = sid;
    // if (! initialcode ) {
    //     newac.loadEditor();
    // } else {
    //     newac.editor.setValue(initialcode);
    //     setTimeout(function() {
    //             newac.editor.refresh();
    //         },500);
    // }
    newac.divid = savediv;
    newac.editor.setSize(500,300);
    setTimeout(function() {
            newac.editor.refresh();
        },500);

};

ACFactory.createScratchActivecode = function() {
    /* set up the scratch Activecode editor in the search menu */
    // use the URL to assign a divid - each page should have a unique Activecode block id.
    // Remove everything from the URL but the course and page name
    // todo:  this could probably be eliminated and simply moved to the template file
    var divid = document.URL.split('#')[0];
    if (divid.indexOf('static') > -1) {
        divid = divid.split('static')[1];
    } else {
        divid = divid.split('/');
        divid = divid.slice(-2).join("");
    }
    divid = divid.split('?')[0];  // remove any query string (e.g ?lastPosition)
    divid = divid.replaceAll('/', '').replace('.html', '').replace(':', '');
    eBookConfig.scratchDiv = divid;
    // generate the HTML
    var html = '<div id="ac_modal_' + divid + '" class="modal fade">' +
        '  <div class="modal-dialog scratch-ac-modal">' +
        '    <div class="modal-content">' +
        '      <div class="modal-header">' +
        '        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' +
        '        <h4 class="modal-title">Scratch ActiveCode</h4>' +
        '      </div> ' +
        '      <div class="modal-body">' +
        '      <textarea data-component="activecode" id="' + divid + '">' +
        '\n' +
        '\n' +
        '\n' +
        '      </textarea>' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '</div>';
    el = $(html);
    $('body').append(el);

    el.on('shown.bs.modal show.bs.modal', function () {
        el.find('.CodeMirror').each(function (i, e) {
            e.CodeMirror.refresh();
            e.CodeMirror.focus();
        });
    });

    //$(document).bind('keypress', '\\', function(evt) {
    //    ACFactory.toggleScratchActivecode();
    //    return false;
    //});
};


ACFactory.toggleScratchActivecode = function () {
    var divid = "ac_modal_" + eBookConfig.scratchDiv;
    var div = $("#" + divid);

    div.modal('toggle');

};

$(document).ready(function() {
    ACFactory.createScratchActivecode();
    $('[data-component=activecode]').each( function(index ) {
        if ($(this.parentNode).data("component") !== "timedAssessment" && $(this.parentNode.parentNode).data("component") !== "timedAssessment") {   // If this element exists within a timed component, don't render it here
            edList[this.id] = ACFactory.createActiveCode(this, $(this).data('lang'));
        }
    });
    if (loggedout) {
        for (k in edList) {
            edList[k].disableSaveLoad();
        }
    }
    

});

$(document).bind("runestone:login", function() {
    $(".run-button").text("Save & Run");
});

// This seems a bit hacky and possibly brittle, but its hard to know how long it will take to
// figure out the login/logout status of the user.  Sometimes its immediate, and sometimes its
// long.  So to be safe we'll do it both ways..
var loggedout;
$(document).bind("runestone:logout",function() { loggedout=true;});
$(document).bind("runestone:logout",function() {
    for (k in edList) {
        if (edList.hasOwnProperty(k)) {
            edList[k].disableSaveLoad();
        }
    }
});
