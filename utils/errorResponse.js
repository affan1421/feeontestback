class ErrorResponse extends Error {
	constructor(message, statusCode) {
		super(message);
		this.statusCode = statusCode;
	}

	toJSON() {
		return {
			statusCode: this.statusCode,
			message: this.message,
		};
	}
}

module.exports = ErrorResponse;
