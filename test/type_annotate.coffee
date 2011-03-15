# Type Annotate
# -------------

# TODO: check that type annotations parse

test "type annotations do not break statements", ->
  x <: String = "Blah"
  foo <: Bar = "Hey"
  eq foo, "Hey"

  x = "Bah"
  eq x, "Bah"
