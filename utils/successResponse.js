const SuccessResponse = (data = null, resultCount, message = 'Success') => {
  return {
    success: true,
    data,
    resultCount,
    message
  };
}

module.exports = SuccessResponse;