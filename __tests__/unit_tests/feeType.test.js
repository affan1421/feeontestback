/* eslint-disable no-multi-assign */
/* eslint-disable no-undef */
const {
	create,
	getTypes,
	feeDelete,
	read,
	update,
} = require('../../controller/feeType');
const FeeType = require('../../models/feeType');
const ErrorResponse = require('../../utils/errorResponse');
const SuccessResponse = require('../../utils/successResponse');

jest.mock('../../models/feeType');
jest.mock('../../utils/errorResponse');
jest.mock('../../utils/successResponse');

const mockRequest = () => ({
	body: {},
	params: {},
	query: {},
});

const mockResponse = () => ({
	status: jest.fn().mockReturnThis(),
	json: jest.fn().mockReturnThis(),
});

const mockNext = jest.fn();

describe('Fee type controller', () => {
	describe('GET - /', () => {
		it('should return no fees type found', async () => {
			const req = (mockRequest().query = {
				query: {
					schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
					accountType: 'income',
					page: 0,
					limit: 10,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'find').mockImplementationOnce(() => ({
				skip: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValueOnce({
					length: 0,
				}),
			}));
			await getTypes(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
		});
		it('should return all fees type', async () => {
			const req = (mockRequest().query = {
				query: {
					schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
					accountType: 'income',
					page: 0,
					limit: 10,
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'find').mockImplementationOnce(() => ({
				skip: jest.fn().mockReturnThis(),
				limit: jest.fn().mockResolvedValueOnce([
					{
						_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
						feeType: 'Tuition',
						description: 'Tuition fee',
						accountType: 'income',
						schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
					},
				]),
			}));
			await getTypes(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				SuccessResponse(
					[
						{
							_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
							feeType: 'Tuition',
							description: 'Tuition fee',
							accountType: 'income',
							schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
						},
					],
					1,
					'Fetched Successfully'
				)
			);
		});
	});
	describe('GET - /:id', () => {
		it('should return no fee type found', async () => {
			const req = (mockRequest().params = {
				params: {
					id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'findById').mockResolvedValueOnce(null);
			await read(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
		});
		it('should return a fee type', async () => {
			const req = (mockRequest().params = {
				params: {
					id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'findById').mockResolvedValueOnce({
				_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				feeType: 'Tuition',
				description: 'Tuition fee',
				accountType: 'income',
				schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
			});
			await read(req, res, mockNext);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.json).toHaveBeenCalledWith(
				SuccessResponse(
					{
						_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
						feeType: 'Tuition',
						description: 'Tuition fee',
						accountType: 'income',
						schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
					},
					1,
					'Fetched Successfully'
				)
			);
		});
	});
	describe('POST - /', () => {
		it('should return all required fields', async () => {
			const req = (mockRequest().body = {
				body: {
					description: '',
					accountType: '',
					schoolId: '',
				},
				params: {
					id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Please enter all fields',
				204
			);
		});
		it('should return fee type already exists', async () => {
			const req = (mockRequest().body = {
				body: {
					feeType: 'Tuition',
					description: 'Tuition fee',
					accountType: 'income',
					schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'findOne').mockResolvedValueOnce({
				_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				feeType: 'Tuition',
				description: 'Tuition fee',
				accountType: 'income',
				schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
			});
			await create(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
			expect(ErrorResponse).toHaveBeenCalledWith(
				'Fee type already exists',
				400
			);
		});

		// it('should return a fee type created', async () => {
		// 	const req = (mockRequest().body = {
		// 		body: {
		// 			feeType: 'Tuition',
		// 			description: 'Tuition fee',
		// 			accountType: 'income',
		// 			schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		},
		// 	});
		// 	const res = mockResponse();
		// 	jest.spyOn(FeeType, 'findOne').mockResolvedValueOnce(null);
		// 	jest.spyOn(FeeType, 'create').mockResolvedValueOnce({
		// 		_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		feeType: 'Tuition',
		// 		description: 'Tuition fee',
		// 		accountType: 'income',
		// 		schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 	});
		// 	await create(req, res, mockNext);
		// 	expect(res.status).toHaveBeenCalledWith(201);
		// 	expect(res.json).toHaveBeenCalledWith(
		// 		SuccessResponse(
		// 			{
		// 				_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 				feeType: 'Tuition',
		// 				description: 'Tuition fee',
		// 				accountType: 'income',
		// 				schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 			},
		// 			1,
		// 			'Created Successfully'
		// 		)
		// 	);
		// });
	});
	describe('PUT - /:id', () => {
		it('should return no fee type found', async () => {
			const req = (mockRequest().body = {
				body: {
					feeType: 'Tuition',
					description: 'Tuition fee',
					account: 'income',
					schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'findByIdAndUpdate').mockResolvedValueOnce(null);
			await update(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
		});
		// it('should return a fee type updated', async () => {
		// 	const req = (mockRequest().body = {
		// 		body: {
		// 			feeType: 'Tuition',
		// 			description: 'Tuition fee',
		// 			account: 'income',
		// 			schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		},
		// 	});
		// 	const res = mockResponse();
		// 	jest.spyOn(FeeType, 'findByIdAndUpdate').mockResolvedValueOnce({
		// 		_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		feeType: 'Tuition',
		// 		description: 'Tuition fee',
		// 		account: 'income',
		// 		schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 	});

		// 	await update(req, res, mockNext);
		// 	expect(res.status).toHaveBeenCalledWith(200);
		// 	expect(res.json).toHaveBeenCalledWith(
		// 		SuccessResponse(
		// 			{
		// 				_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 				feeType: 'Tuition',
		// 				description: 'Tuition fee',
		// 				account: 'income',
		// 				schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 			},
		// 			1,
		// 			'Updated Successfully'
		// 		)
		// 	);
		// });
	});
	describe('DELETE - /:id', () => {
		it('should return no fee type found', async () => {
			const req = (mockRequest().params = {
				params: {
					id: '5f8c6c5e0e0a8c0a1c8f1b2a',
				},
			});
			const res = mockResponse();
			jest.spyOn(FeeType, 'findByIdAndDelete').mockResolvedValueOnce(null);
			await feeDelete(req, res, mockNext);
			expect(mockNext).toHaveBeenCalled();
		});
		// it('should return a fee type deleted', async () => {
		// 	const req = (mockRequest().body = {
		// 		body: {
		// 			feeType: 'Tuition',
		// 			description: 'Tuition fee',
		// 			account: 'income',
		// 			schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		},
		// 	});
		// 	const res = mockResponse();
		// 	jest.spyOn(FeeType, 'findByIdAndDelete').mockResolvedValueOnce({
		// 		_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 		feeType: 'Tuition',
		// 		description: 'Tuition fee',
		// 		account: 'income',
		// 		schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 	});

		// 	await feeDelete(req, res, mockNext);
		// 	expect(res.status).toHaveBeenCalledWith(200);
		// 	expect(res.json).toHaveBeenCalledWith(
		// 		SuccessResponse(
		// 			{
		// 				_id: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 				feeType: 'Tuition',
		// 				description: 'Tuition fee',
		// 				account: 'income',
		// 				schoolId: '5f8c6c5e0e0a8c0a1c8f1b2a',
		// 			},
		// 			1,
		// 			'Deleted Successfully'
		// 		)
		// 	);
		// });
	});
});
