function notFound(_req, res) {
  res.status(404).json({ message: 'That page could not be found.' });
}

function errorHandler(error, _req, res, _next) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === 'CastError') {
    return res.status(400).json({ message: 'That identifier is not valid.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'An account with that email already exists.' });
  }
  if (error.name === 'MulterError') {
    return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be smaller than 5 MB.' : error.message });
  }
  console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong. Please try again.' });
}

module.exports = { notFound, errorHandler };
