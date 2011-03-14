# Type Annotate
# -------------

# TODO: check that type annotations parse

test "type annotations do not break statements", ->
  # TODO
  # foo type String = "Hey"
  # foo <: String = "Hey"
  foo = "Hey"
  eq foo, "Hey"

