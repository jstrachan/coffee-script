This fork of the awesome CoffeeScript adds optional static type annotations (currently only for assignments but should be most places in the language soon).

So in coffeescript you can now do stuff like this:

    foo <: String = "hey"
    bar <: Array<People> = something()
    
The "<:" symbol is used to attach a static type annotation. I went with "<:" as ":" is already taken in JS / CoffeeScript - not totally wedded to it, kinda thought it looked vaguely like the one-many relationships or set membership etc.

The JS code generated includes the comments that the [Google Closure Compiler](http://code.google.com/closure/compiler/docs/js-for-compiler.html#types) can detect and do static type checks with...

e.g. generated JS...

    /** @type {String} */
    var foo = "hey"

which supports generics too along with unions and non-null checks etc.

Users can then optionally use the type annotations and then optionally (asynchronously) perform static type checks on their code as a form of testing.