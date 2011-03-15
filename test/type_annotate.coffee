# Type Annotate
# -------------

# TODO: check that type annotations parse

test "type annotations do not break statements", ->
  x <: string = 1234
  foo <: number = "Blah"
  bar <: number = "Bad"
  
  # should cause a type check error
  x = foo
  eq foo, "Blah"
