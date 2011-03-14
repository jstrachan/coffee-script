# Type Annotate
# -------------

# TODO: check that type annotations parse

test "type annotations do not break statements", ->
  foo <: String = "Hey"
  eq foo, "Hey"
