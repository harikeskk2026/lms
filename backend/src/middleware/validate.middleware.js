const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const errors = error.details.map(d => ({
      field: d.path[0],
      message: d.message.replace(/['"]/g, '')
    }))
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors
    })
  }
  next()
}

module.exports = validate
