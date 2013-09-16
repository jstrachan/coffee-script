UPDATE
======

My hope when I started hacking UberScript was to eventually get the changes merged into CoffeeScript & slowly persuade CoffeeScript folks that a bit of type inferencing and the odd optional type annotation isn't that big a deal - and can be very useful; though its looking like thats never gonna happen.

Since I started UberScript; [TypeScript](http://www.typescriptlang.org/) has come along; with type inference, type checking, optional type annotations, generics, source maps and various other features of ES6 all in a nice compiler along with great tooling in Intellij / WebStorm.

While I refer the high level syntax of CoffeeScript (the use of whitespace indentation instead of "{" and the more ruby-ish general syntax and lack of semi-colons) the type inference and optional static types of TypeScript and Intellij tooling for me are a pretty awesome combination of writing scalable JavaScript; the use of "{" and ";" is a small price to pay for the lovely benefits of TypeScript!

So if you're writing JavaScript (and don't want a language leaky abstraction like GWT/Dart et al) and want some type inferencing/type checking/optional static types, I'd highly recommend you check out [TypeScript](http://www.typescriptlang.org/)!

If you want to see a TypeScript / AngularJS project I'm working on a lot these days, please do check out [hawtio](http://hawt.io/)

Background
==========

Increasingly as developers we're spending more of our development effort on the client side; whether iPhone/iPad/iPod, Android, mobile phones, tablets & set top boxes, web applications and native desktop applications. In many ways the client side UI is getting much bigger & more complex and the server side is often becoming more simple (e.g. server side might be SimpleDb/BigTable/CouchDb et al). So far the clear leader in a universal language & platform for rich UIs is HTML + CSS + JavaScript particularly with frameworks like [Appcelerator](http://www.appcelerator.com/) and [PhoneGap](http://www.phonegap.com/). (Ducks flamewars - if you only create iOS apps then maybe Objective-C is right for you; but wouldn't you rather a nicer, more reusable language? ;).

As many of us are aware JavaScript [has some issues](http://oreilly.com/catalog/9780596517748) such as == not working, lexical scoping being broken etc. However [CoffeeScript](http://jashkenas.github.com/coffee-script/) creates a simple & elegant ruby/python style language syntax that compiles quickly direct to native JS; such that you can read the JS and understand what its doing (handy for debugging until browsers support CoffeeScript debugging). So no weird Java wrappers to use some JavaScript library required or slow compilation steps like GWT etc. We're aiming at a very rapid RAD UI development platform which you want to save code your editor/IDE then your [browser automatically reloads ](http://blog.envylabs.com/2010/07/livereload-screencast/) in milliseconds. 


UberScript
==========
 
This fork of the [CoffeeScript language](http://jashkenas.github.com/coffee-script/) adds optional type annotations.  Ideally we'd like these fairly minor changes to get merged back into  [CoffeeScript](http://jashkenas.github.com/coffee-script/), though if thats not an option we need another name for this fork. Current working name is UberScript (as it supports various points on the religious dynamic-static type checking debate ;).

We've added optional type annotations to every point of the language AST; we've only added them so far to the grammar for assignments - but they should be most places in the language soon such as function arguments & object properties etc.

UberScript is a superset of CoffeeScript; in UberScript you can now do stuff like this:

    foo <: String = "hey"
    bar <: Array<People> = something()
    
The "<:" symbol is used to attach a static type annotation. I went with "<:" as ":" and most other ASCII single tokens are all taken in JS / CoffeeScript - am not totally wedded to it, kinda thought it looked vaguely like the one-many relationships or set membership etc.

The UberScript compiler then generates the following JS code which includes the comments that the [Google Closure Compiler](http://code.google.com/closure/compiler/docs/js-for-compiler.html#types) can detect and do static type checks with...

e.g. generated JS...

    /** @type {String} */
    var foo = "hey"

[Google Closure Compiler](http://code.google.com/closure/compiler/docs/js-for-compiler.html#types) supports static type checking, unions, generics, structural type checking and non-null checks etc.


So why the type annotations?
----------------------------

The type annotations are completely optional; they provide a consise syntax that can be used to surf various parts of the dynamic-static type continuum based on your needs and tastes...

* do nothing; stick to really fast to load & parse JS code
* purely for documentation to help folks grok APIs and the actual expected types
* to generate runtime type checking assertions which could be enabled in debugging/testing but disabled in production. This lets you use the compiler to do more work for you, if you want.
* to perform actual static type checking using [Google Closure Compiler](http://code.google.com/closure/compiler/docs/js-for-compiler.html#types) as an optional, asynchronous build system; kinda like another set of tests if you like; they don't have to get in your way hacking that awesome UI code but can run on your CI system in the background.
* as optimisation metadata for V8 and other JavaScript VMs to do some wacky optimisation when you're running UberScript on the server side (e.g. in node.js)
* potentially we could generate fast static bytecode on a JVM if you want to reuse UberScript classes on the server side along with JVM libraries and frameworks; possibly using [Rhino](http://www.mozilla.org/rhino/) or [Mirah](http://www.mirah.org/)


What if I don't want to use them?
---------------------------------

Thats totally fine! In many ways lots of JavaScript pages are quite simple; doing a bit of Ajax + DOM manipulation with jQuery and whatnot; the help type checking (dynamic or static) brings to small & simple scripts doesn't help hugely. 

However increasingly folks are writing bigger and bigger codebases in CoffeeScript; to run both on the client and server side; so type annotations can help you scale your code across different teams & help catch refactoring bugs earlier. Though YMMV so relax, don't worry - just enjoy CoffeeScript / UberScript and see if/when you wanna annotate some code with type annotations.

We hope to keep UberScript syntax 100% compatible with regular CoffeeScript (but just with the optional type annotations added) so you should be able to mix and match CoffeeScript, UberScript, JavaScript and even Java (via GWT) on a project.


